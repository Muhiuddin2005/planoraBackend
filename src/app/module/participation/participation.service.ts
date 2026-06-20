import { ParticipationStatus, PaymentStatus } from "@prisma/client";
import prisma from "../../utils/prisma";
import AppError from "../../errorHelpers/AppError";
import status from "http-status";
import { sendNotification } from "../../utils/socket";
import { sendEmail } from "../../utils/email";

// Helper function to generate an 8-character alphanumeric string (mixed capital letters and numbers)
const generateTicketCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const sendTicketEmail = async (participationId: string) => {
    try {
        const participation = await prisma.participation.findUnique({
            where: { id: participationId },
            include: {
                user: true,
                event: true
            }
        });

        if (!participation) {
            console.error(`Participation ${participationId} not found for sending ticket email.`);
            return;
        }

        const userName = participation.user.name;
        const userEmail = participation.user.email;
        const eventTitle = participation.event.title;
        const eventDate = participation.event.date.toDateString();
        const eventTime = participation.event.time;
        const eventVenue = participation.event.venue;
        const ticketCode = participation.ticketCode;
        const eventIsPaid = participation.event.isPaid;
        const eventFee = participation.event.fee;

        await sendEmail(
            userEmail,
            `Your Ticket for ${eventTitle} - Planora`,
            "ticket",
            {
                userName,
                eventTitle,
                eventDate,
                eventTime,
                eventVenue,
                ticketCode,
                eventIsPaid,
                eventFee
            }
        );
        console.log(`Ticket email sent successfully to ${userEmail} for participation ${participationId}`);
    } catch (err) {
        console.error("Failed to send ticket email:", err);
    }
};

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

    // Send notifications async (do not block the response)
    (async () => {
        try {
            const requester = await prisma.user.findUnique({ where: { id: userId } });
            if (requester) {
                if (initialStatus === ParticipationStatus.APPROVED) {
                    await sendNotification(event.ownerId, {
                        title: "New Participant Joined",
                        message: `${requester.name} has joined your event "${event.title}".`
                    });
                    await sendNotification(userId, {
                        title: "Registration Approved",
                        message: `Your registration for "${event.title}" is confirmed!`
                    });
                    // Trigger ticket email for free public event instant join
                    await sendTicketEmail(participation.id);
                } else {
                    await sendNotification(event.ownerId, {
                        title: "New Join Request",
                        message: `${requester.name} requested to join your event "${event.title}".`
                    });
                }
            }
        } catch (err) {
            console.error("Error triggering notifications in requestToJoinEvent", err);
        }
    })();

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

    // Notify the participant
    (async () => {
        try {
            let statusText = newStatus.toLowerCase();
            await sendNotification(participation.userId, {
                title: `Registration ${newStatus}`,
                message: `Your registration status for "${participation.event.title}" has been updated to ${statusText}.`
            });
            // Trigger ticket email if approved and is a free event (paid events get ticket email on payment success)
            if (newStatus === ParticipationStatus.APPROVED && !participation.event.isPaid) {
                await sendTicketEmail(participation.id);
            }
        } catch (err) {
            console.error("Error sending notification on status update", err);
        }
    })();

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
