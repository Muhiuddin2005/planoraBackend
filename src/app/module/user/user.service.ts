import prisma from "../../utils/prisma";
import { UserStatus } from "@prisma/client";
import { sendNotification } from "../../utils/socket";
import { sendEmail } from "../../utils/email";

const getAllUsers = async () => {
    return await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
    });
};

const toggleUserStatus = async (userId: string, status: UserStatus, requesterRole?: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.role === "ADMIN") throw new Error("Cannot ban an Admin");
    // Only ADMIN can ban/unban a MODERATOR
    if (user.role === "MODERATOR" && requesterRole !== "ADMIN") {
        throw new Error("Only an Admin can ban or unban a Moderator");
    }

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status }
    });

    // Send real-time notification
    (async () => {
        try {
            await sendNotification(userId, {
                title: "Account Status Update",
                message: `Your account status has been updated to ${status.toLowerCase()} by an administrator.`
            });
        } catch (err) {
            console.error("Failed to send user toggle status notification", err);
        }
    })();

    return updatedUser;
};

const deleteUser = async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    
    // We delete related records first to prevent FK violation cascades
    await prisma.participation.deleteMany({ where: { userId } });
    await prisma.review.deleteMany({ where: { userId } });
    
    // Delete events hosted by this user and their participations/reviews
    const hostedEvents = await prisma.event.findMany({ where: { ownerId: userId } });
    for (const event of hostedEvents) {
        await prisma.participation.deleteMany({ where: { eventId: event.id } });
        await prisma.review.deleteMany({ where: { eventId: event.id } });
        await prisma.event.delete({ where: { id: event.id } });
    }

    return await prisma.user.delete({ where: { id: userId } });
};

const reportViolation = async (userId: string) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) throw new Error("User not found");
    if (user.role === "ADMIN") return user; // Admins don't get penalized

    const lastUpdated = new Date(user.updatedAt).getTime();
    const now = Date.now();
    const isRecentViolation = (now - lastUpdated) < 3000;

    if (isRecentViolation) {
        return user;
    }

    const newCount = user.violationCount + 1;
    const newStatus = newCount >= 2 ? UserStatus.BANNED : user.status;

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            violationCount: newCount,
            status: newStatus
        }
    });

    // Send warning notification
    (async () => {
        try {
            await sendNotification(userId, {
                title: "Policy Violation Warning",
                message: `Your action has violated community guidelines. Violation penalty count: ${newCount}/2. ${newStatus === UserStatus.BANNED ? "Your account has been banned." : ""}`
            });
        } catch (err) {
            console.error("Failed to send violation warning notification", err);
        }
    })();

    return updatedUser;
};

const promoteUserRole = async (userId: string, role: "USER" | "MODERATOR") => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.role === "ADMIN") throw new Error("Cannot change an Admin's role");

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role }
    });

    (async () => {
        try {
            await sendNotification(userId, {
                title: role === "MODERATOR" ? "You've been promoted to Moderator!" : "Role Updated",
                message: role === "MODERATOR"
                    ? "You now have Moderator privileges on Planora. Help keep the community safe!"
                    : "Your role has been updated back to a regular member."
            });

            if (role === "MODERATOR") {
                const dashboardUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`;
                await sendEmail(
                    user.email,
                    "Congratulations! You've been promoted to Moderator - Planora",
                    "role-promotion",
                    {
                        userName: user.name,
                        dashboardUrl
                    }
                );
            }
        } catch (err) {
            console.error("Failed to send role promotion notification or email", err);
        }
    })();

    return updatedUser;
};

export const UserService = { getAllUsers, toggleUserStatus, deleteUser, reportViolation, promoteUserRole };
