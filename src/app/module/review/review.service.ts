import z from "zod";
import prisma from "../../utils/prisma";
import { sendNotification } from "../../utils/socket";

export const createReviewSchema = z.object({
    rating: z.number().min(1).max(5),
    comment: z.string().optional(),
});

const createReview = async (userId: string, eventId: string, payload: any) => {
    // Optional: Verify if the user actually attended (APPROVED status)
    const participation = await prisma.participation.findUnique({
        where: { userId_eventId: { userId, eventId } }
    });
    
    if (!participation || participation.status !== 'APPROVED') {
        throw new Error("You can only review events you have attended.");
    }

    const review = await prisma.review.create({
        data: {
            rating: payload.rating,
            comment: payload.comment,
            userId,
            eventId,
        }
    });

    // Send real-time notification to the event host
    (async () => {
        try {
            const event = await prisma.event.findUnique({ where: { id: eventId } });
            const reviewer = await prisma.user.findUnique({ where: { id: userId } });
            if (event && reviewer) {
                await sendNotification(event.ownerId, {
                    title: "New Event Review",
                    message: `${reviewer.name} rated your event "${event.title}" ${payload.rating}/5 stars.`
                });
            }
        } catch (err) {
            console.error("Failed to send review notification", err);
        }
    })();

    return review;
};

const getEventReviews = async (eventId: string) => {
    return await prisma.review.findMany({
        where: { eventId },
        include: { user: { select: { name: true, profilePic: true } } },
        orderBy: { createdAt: 'desc' }
    });
};

const updateReview = async (reviewId: string, userId: string, payload: any) => {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new Error("Review not found");
    if (review.userId !== userId) throw new Error("You can only edit your own reviews");

    return await prisma.review.update({
        where: { id: reviewId },
        data: {
            rating: payload.rating,
            comment: payload.comment
        }
    });
};

const deleteReview = async (reviewId: string, userId: string, userRole: string) => {
    const review = await prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new Error("Review not found");
    if (review.userId !== userId && userRole !== "ADMIN") {
        throw new Error("You do not have permission to delete this review");
    }

    return await prisma.review.delete({ where: { id: reviewId } });
};

export const ReviewService = { createReview, getEventReviews, updateReview, deleteReview };

