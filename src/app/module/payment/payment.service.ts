import { PaymentStatus, ParticipationStatus } from "@prisma/client";
import { stripe } from "../../config/stripe.config";
import prisma from "../../utils/prisma";

const initiatePayment = async (userId: string, eventId: string) => {
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || !event.isPaid) throw new Error("Event not found or is not a paid event");

    // Ensure participation exists and is pending payment
    const participation = await prisma.participation.findUnique({
        where: { userId_eventId: { userId, eventId } }
    });
    if (!participation) throw new Error("You must request to join the event first");

    // --- NEW ADDITION: Block payment if private and not approved ---
    if (!event.isPublic && participation.status !== "APPROVED") {
        throw new Error("You cannot pay for this private event until the host approves your request.");
    }

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: { name: `Ticket for ${event.title}` },
                    unit_amount: Math.round(event.fee * 100), // Stripe expects cents
                },
                quantity: 1,
            }
        ],
        metadata: {
            userId,
            eventId,
            participationId: participation.id,
        },
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventId}`,
    });

    return { paymentUrl: session.url };
};

const handleStripeWebhook = async (event: any) => {
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { participationId } = session.metadata;

        // Update database: Mark as paid. Auto-approve if it's a Public event.
        const participation = await prisma.participation.findUnique({
            where: { id: participationId },
            include: { event: true }
        });

        if (participation && participation.paymentStatus !== PaymentStatus.PAID) {
            await prisma.participation.update({
                where: { id: participationId },
                data: {
                    paymentStatus: PaymentStatus.PAID,
                    status: participation.event.isPublic ? ParticipationStatus.APPROVED : ParticipationStatus.PENDING
                }
            });
            // Trigger ticket email for paid events (after payment success)
            const { sendTicketEmail } = require("../participation/participation.service");
            await sendTicketEmail(participationId);
        }
    }
    return { received: true };
};

const verifyPaymentSession = async (sessionId: string) => {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (session.payment_status === 'paid') {
        const { participationId } = session.metadata as { participationId: string };
        
        const participation = await prisma.participation.findUnique({
            where: { id: participationId },
            include: { event: true }
        });
        
        if (participation && participation.paymentStatus !== PaymentStatus.PAID) {
            await prisma.participation.update({
                where: { id: participationId },
                data: {
                    paymentStatus: PaymentStatus.PAID,
                    status: participation.event.isPublic ? ParticipationStatus.APPROVED : ParticipationStatus.PENDING
                }
            });
            // Trigger ticket email for paid events (after payment success)
            const { sendTicketEmail } = require("../participation/participation.service");
            await sendTicketEmail(participationId);
        }
        return { success: true, message: "Payment verified successfully" };
    }
    
    return { success: false, message: "Payment not completed yet" };
};

export const PaymentService = { initiatePayment, handleStripeWebhook, verifyPaymentSession };
