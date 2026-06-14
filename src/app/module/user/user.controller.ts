import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { UserService } from "./user.service";
import prisma from "../../utils/prisma";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllUsers();
    sendResponse(res, { httpStatusCode: status.OK, success: true, message: "Users fetched", data: result });
});

const toggleUserStatus = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.toggleUserStatus(req.params.id as string, req.body.status);
    sendResponse(res, { httpStatusCode: status.OK, success: true, message: "User status updated", data: result });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
    await UserService.deleteUser(req.params.id as string);
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

export const UserController = { getAllUsers, toggleUserStatus, deleteUser, updateProfilePic, reportViolation };
