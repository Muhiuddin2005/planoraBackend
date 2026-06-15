import { ParticipationStatus, PaymentStatus } from "@prisma/client";
import prisma from "../../utils/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";

// Helper function to generate a 6-digit string
const generateTicketCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const requestToJoinEvent = async (userId: string, eventId: string) => {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new AppError(status.NOT_FOUND, "Event not found");

    // Check if user already requested
    const existingParticipation = await prisma.participation.findUnique({
        where: { userId_eventId: { userId, eventId } }
    });
    if (existingParticipation) {
        throw new AppError(status.CONFLICT, "You have already joined or requested to join this event.");
    }

    let initialStatus: ParticipationStatus = ParticipationStatus.PENDING;
    const paymentStatus = PaymentStatus.UNPAID;

    // Core Logic Matrix
    if (event.isPublic && !event.isPaid) {
        // Free Public: "Join" -> Status instantly Approved
        initialStatus = ParticipationStatus.APPROVED;
    } else if (event.isPublic && event.isPaid) {
        // Paid Public: Gateway -> Pending Host Approval or Auto
        initialStatus = ParticipationStatus.PENDING; 
    } else if (!event.isPublic && !event.isPaid) {
        // Free Private: Request to Join -> Pending
        initialStatus = ParticipationStatus.PENDING;
    } else if (!event.isPublic && event.isPaid) {
        // Paid Private: Pay & Request -> Pending
        initialStatus = ParticipationStatus.PENDING;
    }

    // Generate the unique code
    let ticketCode = generateTicketCode();
    let isUnique = false;
    while (!isUnique) {
        const codeExists = await prisma.participation.findUnique({ where: { ticketCode } });
        if (!codeExists) {
            isUnique = true;
        } else {
            ticketCode = generateTicketCode();
        }
    }

    const participation = await prisma.participation.create({
        data: {
            userId,
            eventId,
            status: initialStatus,
            paymentStatus,
            ticketCode,
        }
    });

    return participation;
};

// Event Owner Moderation: Approve, Reject, or Ban
const updateParticipationStatus = async (ownerId: string, participationId: string, newStatus: ParticipationStatus) => {
    const participation = await prisma.participation.findUnique({
        where: { id: participationId },
        include: { event: true }
    });

    if (!participation) throw new AppError(status.NOT_FOUND, "Participation record not found");
    if (participation.event.ownerId !== ownerId) {
        throw new AppError(status.FORBIDDEN, "Only the event owner can modify this");
    }

    // --- ENFORCING THE NEW RULES API-SIDE ---
    
    // Rule 1: No actions allowed for Public Paid events
    if (participation.event.isPublic && participation.event.isPaid) {
        throw new AppError(status.BAD_REQUEST, "Hosts cannot approve, reject, or ban users in public paid events.");
    }

    // Rule 2: Only banning is allowed for Public Free events
    if (participation.event.isPublic && !participation.event.isPaid && newStatus !== ParticipationStatus.BANNED) {
        throw new AppError(status.BAD_REQUEST, "For public free events, hosts are only permitted to ban participants.");
    }

    const updated = await prisma.participation.update({
        where: { id: participationId },
        data: { status: newStatus }
    });

    return updated;
};

const getMyRequests = async (userId: string) => {
    return await prisma.participation.findMany({
        where: { userId },
        include: { event: true },
        orderBy: { createdAt: 'desc' }
    });
};

const getMyTickets = async (userId: string) => {
    return await prisma.participation.findMany({
        where: { userId },
        include: { event: true },
        orderBy: { createdAt: 'desc' }
    });
};

export const ParticipationService = { requestToJoinEvent, updateParticipationStatus, getMyRequests, getMyTickets };
