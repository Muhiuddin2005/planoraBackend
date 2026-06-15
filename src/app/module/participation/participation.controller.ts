import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { ParticipationService } from "./participation.service";

const joinEvent = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;
    const userId = req.user.userId;

    const result = await ParticipationService.requestToJoinEvent(userId, eventId);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Participation request completed successfully",
        data: result,
    });
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
    const participationId = req.params.participationId as string;
    const { status: newStatus } = req.body;
    const ownerId = req.user.userId;

    const result = await ParticipationService.updateParticipationStatus(ownerId, participationId, newStatus);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Participation status updated successfully",
        data: result,
    });
});

const getMyRequests = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await ParticipationService.getMyRequests(userId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Your participations fetched successfully",
        data: result,
    });
});

const getMyTickets = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await ParticipationService.getMyTickets(userId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Your tickets fetched successfully",
        data: result,
    });
});

export const ParticipationController = { joinEvent, updateStatus, getMyRequests, getMyTickets };
