import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ReviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;
    const userId = req.user.userId;

    const result = await ReviewService.createReview(userId, eventId, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Review added successfully",
        data: result,
    });
});

const getEventReviews = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;
    const result = await ReviewService.getEventReviews(eventId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Reviews fetched successfully",
        data: result,
    });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
    const result = await ReviewService.updateReview(req.params.id as string, req.user.userId, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Review updated successfully",
        data: result,
    });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
    await ReviewService.deleteReview(req.params.id as string, req.user.userId, req.user.role);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Review deleted successfully",
        data: null,
    });
});

export const ReviewController = { createReview, getEventReviews, updateReview, deleteReview };

