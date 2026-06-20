import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UserService } from "./user.service";
import prisma from "../../utils/prisma";

import { logActivity } from "../../utils/auditLogger";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllUsers();
    sendResponse(res, { httpStatusCode: status.OK, success: true, message: "Users fetched", data: result });
});

const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.toggleUserStatus(req.params.id as string, req.body.status, req.user.role);
    
    // Log the audit activity
    await logActivity({
        userId: req.user.userId,
        action: req.body.status === "BANNED" ? "BAN_USER" : "UNBAN_USER",
        targetId: result.id,
        targetName: result.email,
        details: `${req.body.status === "BANNED" ? "Banned" : "Unbanned"} user ${result.name} (${result.email})`
    });

    sendResponse(res, { httpStatusCode: status.OK, success: true, message: "User status updated", data: result });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const targetUser = await prisma.user.findUnique({ where: { id } });
    await UserService.deleteUser(id);

    if (targetUser) {
        await logActivity({
            userId: req.user.userId,
            action: "DELETE_USER",
            targetId: id,
            targetName: targetUser.email,
            details: `Deleted user account ${targetUser.name} (${targetUser.email})`
        });
    }

    sendResponse(res, { httpStatusCode: status.OK, success: true, message: "User deleted", data: null });
});

const updateProfilePic = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    
    if (!req.file) {
        throw new Error("No image file provided");
    }

    const imageUrl = req.file.path; // Cloudinary returns the URL here

    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { profilePic: imageUrl },
        select: { id: true, name: true, profilePic: true }
    });

    sendResponse(res, { httpStatusCode: status.OK, success: true, message: "Profile picture updated", data: updatedUser });
});

const reportViolation = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await UserService.reportViolation(userId);
    
    sendResponse(res, { 
        httpStatusCode: status.OK, 
        success: true, 
        message: result.status === "BANNED" ? "Account Banned" : "Warning Issued", 
        data: { status: result.status, violationCount: result.violationCount } 
    });
});

const promoteUserRole = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.promoteUserRole(req.params.id as string, req.body.role);
    
    await logActivity({
        userId: req.user.userId,
        action: req.body.role === "MODERATOR" ? "PROMOTE_MODERATOR" : "DEMOTE_MODERATOR",
        targetId: result.id,
        targetName: result.email,
        details: `Updated role of user ${result.name} (${result.email}) to ${req.body.role}`
    });

    sendResponse(res, { httpStatusCode: status.OK, success: true, message: "User role updated successfully", data: result });
});

export const UserController = { getAllUsers, toggleUserStatus, deleteUser, updateProfilePic, reportViolation, promoteUserRole };
