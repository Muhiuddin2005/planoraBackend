import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { AuthService } from "./auth.service";

const registerUser = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.registerUser(req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "User registered successfully",
        data: result,
    });
});

const loginUser = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.loginUser(req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "User logged in successfully",
        data: result,
    });
});

const getProfile = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await AuthService.getProfile(userId);
    
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Profile fetched successfully",
        data: result,
    });
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.verifyEmail(req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Email verified successfully. You are now logged in.",
        data: result,
    });
});

const resendOtp = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await AuthService.resendOtp(email);
    
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);
    
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.resetPassword(req.body);
    
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await AuthService.changePassword(userId, req.body);
    
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: result.message,
        data: null,
    });
});

export const AuthController = { 
    registerUser, 
    loginUser, 
    getProfile, 
    verifyEmail, 
    resendOtp,
    forgotPassword,
    resetPassword,
    changePassword
};

