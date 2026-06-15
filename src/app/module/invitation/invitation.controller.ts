import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { InvitationService } from "./invitation.service";

const sendInvitation = catchAsync(async (req: Request, res: Response) => {
    const inviterId = req.user.userId;
    const result = await InvitationService.sendInvitation(inviterId, req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Invitation sent successfully",
        data: result,
    });
});

const respondToInvitation = catchAsync(async (req: Request, res: Response) => {
    const inviteeId = req.user.userId;
    const { status: newStatus } = req.body; // ACCEPTED or DECLINED
    const result = await InvitationService.respondToInvitation(req.params.id as string, inviteeId, newStatus);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: `Invitation ${newStatus.toLowerCase()} successfully`,
        data: result,
    });
});

const getMyInvitations = catchAsync(async (req: Request, res: Response) => {
    const result = await InvitationService.getMyInvitations(req.user.userId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Invitations fetched successfully",
        data: result,
    });
});

export const InvitationController = { sendInvitation, respondToInvitation, getMyInvitations };
