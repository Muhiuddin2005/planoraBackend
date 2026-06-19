import { Event, EventStatus } from "@prisma/client";
import prisma from "../../utils/prisma";
import { sendNotification } from "../../utils/socket";

const createEvent = async (payload: any): Promise<Event> => {
    const result = await prisma.$transaction(async (tx) => {
        return await tx.event.create({
            data: payload
        });
    });
    return result;
};

const getAllEvents = async (userRole?: string) => {
    // If Admin, fetch everything. Otherwise, only fetch public APPROVED events.
    const whereClause = userRole === "ADMIN" ? {} : { isPublic: true, status: EventStatus.APPROVED };

    const result = await prisma.event.findMany({
        where: whereClause,
        include: {
            owner: { 
                select: { 
                    name: true, 
                    profilePic: true 
                } 
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    return result;
};


const getHostedEvents = async (ownerId: string): Promise<Event[]> => {
    return await prisma.event.findMany({
        where: { ownerId },
        include: {
            participations: {
                include: { user: { select: { name: true, profilePic: true } } }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
};

const getSingleEvent = async (id: string): Promise<Event | null> => {
    return await prisma.event.findUnique({
        where: { id },
        include: {
            owner: { select: { name: true, profilePic: true } },
            reviews: { include: { user: { select: { name: true, profilePic: true } } } }
        }
    });
};

const updateEvent = async (id: string, ownerId: string, payload: Partial<Event>) => {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error("Event not found");
    if (event.ownerId !== ownerId) throw new Error("Only the owner can update this event");

    // --- NEW ADDITION: Prevent unchecking the paid status ---
    if (event.isPaid && payload.isPaid === false) {
        throw new Error("You cannot change a paid event back to a free event.");
    }

    return await prisma.event.update({
        where: { id },
        data: payload
    });
};

const deleteEvent = async (id: string, userId: string, userRole: string) => {
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new Error("Event not found");
    
    if (event.ownerId !== userId && userRole !== "ADMIN") {
        throw new Error("You do not have permission to delete this event");
    }

    // --- NEW ADDITION: 48-hour deletion lock for paid events (Admins bypass this) ---
    if (event.isPaid && userRole !== "ADMIN") {
        const eventTime = new Date(event.date).getTime();
        const timeToUnlock = eventTime + (48 * 60 * 60 * 1000); // 48 hours in milliseconds
        
        if (Date.now() < timeToUnlock) {
            throw new Error("Paid events cannot be deleted until 48 hours after the event date.");
        }
    }

    // Fetch all participants to notify them
    const participations = await prisma.participation.findMany({ where: { eventId: id } });

    // Prisma requires deleting related records first if cascading isn't set up
    await prisma.participation.deleteMany({ where: { eventId: id } });
    await prisma.review.deleteMany({ where: { eventId: id } });
    
    const deletedEvent = await prisma.event.delete({ where: { id } });

    // Send notifications asynchronously
    (async () => {
        try {
            // Notify participants
            for (const p of participations) {
                await sendNotification(p.userId, {
                    title: "Event Canceled",
                    message: `The event "${event.title}" has been canceled.`
                });
            }

            // Notify the owner if admin overrode it
            if (userRole === "ADMIN" && event.ownerId !== userId) {
                await sendNotification(event.ownerId, {
                    title: "Event Deleted by Admin",
                    message: `Your event "${event.title}" has been deleted by an administrator.`
                });
            }
        } catch (err) {
            console.error("Failed to send event deletion notifications", err);
        }
    })();

    return deletedEvent;
};

const updateEventStatus = async (id: string, status: EventStatus, rejectionReason?: string) => {
    const event = await prisma.event.findUnique({
        where: { id },
        include: { owner: true }
    });
    if (!event) throw new Error("Event not found");

    const updatedEvent = await prisma.event.update({
        where: { id },
        data: { status, rejectionReason: status === EventStatus.REJECTED ? rejectionReason : null }
    });

    // Send real-time notification & Email to the creator
    (async () => {
        try {
            const creatorName = event.owner.name;
            const creatorEmail = event.owner.email;
            const statusText = status === EventStatus.APPROVED ? "approved" : "rejected";

            // 1. Send real-time notification
            await sendNotification(event.ownerId, {
                title: `Event ${status === EventStatus.APPROVED ? "Approved" : "Rejected"}`,
                message: `Your event "${event.title}" has been ${statusText} by the moderation team.${status === EventStatus.REJECTED && rejectionReason ? ` Reason: ${rejectionReason}` : ""}`
            });

            // 2. Send email notification
            const { sendEmail } = require("../../utils/email");
            await sendEmail(creatorEmail, `Your event "${event.title}" status update`, "event-moderation", {
                creatorName,
                eventTitle: event.title,
                status,
                reason: rejectionReason
            });
        } catch (err) {
            console.error("Failed to send moderation email or notification:", err);
        }
    })();

    return updatedEvent;
};

const getAdminStats = async () => {
    // Run all aggregation queries in parallel
    const [totalMembers, events, totalRevenue] = await Promise.all([
        // 1. Count all non-admin users
        prisma.user.count({ where: { role: "USER" } }),

        // 2. Fetch all events with participations for aggregation
        prisma.event.findMany({
            include: {
                participations: {
                    where: { paymentStatus: "PAID" },
                    select: { id: true }
                }
            }
        }),

        // 3. Total revenue from all paid participations (sum of event fees)
        prisma.$queryRaw<{ total: bigint }[]>`
            SELECT COALESCE(SUM(e.fee), 0) as total
            FROM "participations" p
            JOIN "events" e ON p."eventId" = e.id
            WHERE p."paymentStatus" = 'PAID'
        `,
    ]);

    // Event status counts
    const approvedCount = events.filter(e => e.status === EventStatus.APPROVED).length;
    const rejectedCount = events.filter(e => e.status === EventStatus.REJECTED).length;
    const pendingCount  = events.filter(e => e.status === EventStatus.PENDING).length;

    // Events per month (last 12 months)
    const now = new Date();
    const monthlyData: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString("default", { month: "short", year: "2-digit" });
        const count = events.filter(e => {
            const c = new Date(e.createdAt);
            return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
        }).length;
        monthlyData.push({ month: label, count });
    }

    // Events by category (parse from JSON description)
    const categoryMap: Record<string, number> = {};
    for (const event of events) {
        let cat = "General";
        try {
            const parsed = JSON.parse(event.description);
            cat = parsed.category || "General";
        } catch {}
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
    }
    const categoryData = Object.entries(categoryMap).map(([name, count]) => ({ name, count }));

    return {
        totalMembers,
        totalEvents: events.length,
        approvedCount,
        rejectedCount,
        pendingCount,
        totalRevenue: Number(totalRevenue[0]?.total || 0),
        monthlyData,
        categoryData,
    };
};

export const EventService = { createEvent, getAllEvents, getHostedEvents, getSingleEvent, updateEvent, deleteEvent, updateEventStatus, getAdminStats };

