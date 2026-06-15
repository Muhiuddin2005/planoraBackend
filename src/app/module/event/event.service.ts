import { Event } from "@prisma/client";
import prisma from "../../utils/prisma";

const createEvent = async (payload: any): Promise<Event> => {
    const result = await prisma.$transaction(async (tx) => {
        return await tx.event.create({
            data: payload
        });
    });
    return result;
};

const getAllEvents = async (userRole?: string) => {
    // If Admin, fetch everything. Otherwise, only fetch public events.
    const whereClause = userRole === "ADMIN" ? {} : { isPublic: true };

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

    // Prisma requires deleting related records first if cascading isn't set up
    await prisma.participation.deleteMany({ where: { eventId: id } });
    await prisma.review.deleteMany({ where: { eventId: id } });
    
    return await prisma.event.delete({ where: { id } });
};

export const EventService = { createEvent, getAllEvents, getHostedEvents, getSingleEvent, updateEvent, deleteEvent };

