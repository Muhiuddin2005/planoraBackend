import prisma from "../../utils/prisma";
import { UserStatus } from "@prisma/client";

const getAllUsers = async () => {
    return await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
    });
};

const toggleUserStatus = async (userId: string, status: UserStatus) => {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.role === "ADMIN") throw new Error("Cannot ban an Admin");

    return await prisma.user.update({
        where: { id: userId },
        data: { status }
    });
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

    const newCount = user.violationCount + 1;
    const newStatus = newCount >= 2 ? UserStatus.BANNED : user.status;

    return await prisma.user.update({
        where: { id: userId },
        data: {
            violationCount: newCount,
            status: newStatus
        }
    });
};

export const UserService = { getAllUsers, toggleUserStatus, deleteUser, reportViolation };
