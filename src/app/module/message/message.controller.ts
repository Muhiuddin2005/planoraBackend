import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { MessageService } from "./message.service";

import { logActivity } from "../../utils/auditLogger";

const createMessage = catchAsync(async (req: Request, res: Response) => {
    const result = await MessageService.createMessage(req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Message sent successfully",
        data: result,
    });
});

const getAllMessages = catchAsync(async (req: Request, res: Response) => {
    const result = await MessageService.getAllMessages();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Messages fetched successfully",
        data: result,
    });
});

const deleteMessage = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const result = await MessageService.deleteMessage(id);
    
    await logActivity({
        userId: req.user.userId,
        action: "DELETE_MESSAGE",
        targetId: id,
        targetName: result.email,
        details: `Deleted contact message from ${result.name} (${result.email})`
    });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Message deleted successfully",
        data: result,
    });
});

export const MessageController = {
    createMessage,
    getAllMessages,
    deleteMessage,
};
