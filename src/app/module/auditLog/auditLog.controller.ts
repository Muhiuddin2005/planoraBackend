import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AuditLogService } from "./auditLog.service";

const getAllAuditLogs = catchAsync(async (req: Request, res: Response) => {
    const result = await AuditLogService.getAllAuditLogs();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Audit logs fetched successfully",
        data: result,
    });
});

export const AuditLogController = {
    getAllAuditLogs
};
