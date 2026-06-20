import { InvitationStatus } from "@prisma/client";
import prisma from "../../utils/prisma";
import { sendEmail } from "../../utils/email";
import { envVars as config } from "../../config/env";
import { sendNotification } from "../../utils/socket";

const sendInvitation = async (inviterId: string, payload: { eventId: string, email: string }) => {
    const event = await prisma.event.findUnique({ where: { id: payload.eventId } });
    if (!event) throw new Error("Event not found");

    // 1. Look up the user by their email
    const invitee = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!invitee) throw new Error("User with this email does not exist on Planora");

    // 2. Prevent the host from inviting themselves
    if (invitee.id === inviterId) throw new Error("You cannot invite yourself to your own event");

    // 3. Prevent duplicate invitations
    const existingInvite = await prisma.invitation.findFirst({
        where: { eventId: payload.eventId, inviteeId: invitee.id }
    });
    if (existingInvite) throw new Error("This user has already been invited to this event");

    // 4. Create the invitation using the resolved ID
    const invitation = await prisma.invitation.create({
        data: {
            eventId: payload.eventId,
            inviterId,
            inviteeId: invitee.id,
            status: InvitationStatus.PENDING
        }
    });

    const inviter = await prisma.user.findUnique({ where: { id: inviterId } });
    
    // 5. Send email notification asynchronously
    if (inviter) {
        sendEmail(invitee.email, `You have been invited to ${event.title}`, "invitation", {
            inviteeName: invitee.name,
            inviterName: inviter.name,
            eventName: event.title,
            eventDate: new Date(event.date).toLocaleDateString(),
            eventTime: event.time,
            eventVenue: event.venue,
            loginLink: `${config.FRONTEND_URL}/login?email=${encodeURIComponent(invitee.email)}` // Pass invited email as query param
        }).catch((err: any) => console.error("Failed to send invitation email:", err));

        // Send real-time notification
        (async () => {
            try {
                await sendNotification(invitee.id, {
                    title: "New Event Invitation",
                    message: `${inviter.name} has invited you to the event "${event.title}".`
                });
            } catch (err) {
                console.error("Failed to send real-time notification in sendInvitation", err);
            }
        })();
    }

    return invitation;
};

const respondToInvitation = async (invitationId: string, inviteeId: string, newStatus: InvitationStatus) => {
    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new Error("Invitation not found");
    if (invitation.inviteeId !== inviteeId) throw new Error("You cannot respond to this invitation");

    const updated = await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: newStatus },
        include: { invitee: true, event: true }
    });

    if (newStatus === "ACCEPTED") {
        try {
            const existingParticipation = await prisma.participation.findUnique({
                where: {
                    userId_eventId: {
                        userId: inviteeId,
                        eventId: invitation.eventId
                    }
                }
            });

            if (!existingParticipation) {
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                let ticketCode = "";
                let isUnique = false;
                while (!isUnique) {
                    ticketCode = "";
                    for (let i = 0; i < 8; i++) {
                        ticketCode += chars.charAt(Math.floor(Math.random() * chars.length));
                    }
                    const codeExists = await prisma.participation.findUnique({ where: { ticketCode } });
                    if (!codeExists) {
                        isUnique = true;
                    }
                }

                const participation = await prisma.participation.create({
                    data: {
                        userId: inviteeId,
                        eventId: invitation.eventId,
                        status: "APPROVED",
                        paymentStatus: "UNPAID",
                        ticketCode,
                    }
                });

                // Send confirmation email
                const { sendTicketEmail } = require("../participation/participation.service");
                await sendTicketEmail(participation.id);
            }
        } catch (err) {
            console.error("Failed to auto-join participant on invitation accept:", err);
        }
    }

    // Send real-time notification to the inviter
    (async () => {
        try {
            await sendNotification(updated.inviterId, {
                title: `Invitation ${newStatus}`,
                message: `${updated.invitee.name} has ${newStatus.toLowerCase()} your invitation to "${updated.event.title}".`
            });
        } catch (err) {
            console.error("Failed to send real-time notification in respondToInvitation", err);
        }
    })();

    return updated;
};

const getMyInvitations = async (inviteeId: string) => {
    return await prisma.invitation.findMany({
        where: { inviteeId },
        include: {
            event: true,
            inviter: { select: { name: true, profilePic: true } }
        },
        orderBy: { createdAt: 'desc' }
    });
};

export const InvitationService = { sendInvitation, respondToInvitation, getMyInvitations };
