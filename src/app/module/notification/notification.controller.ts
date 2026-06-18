import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { NotificationService } from "./notification.service";

const getUserNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await NotificationService.getUserNotifications(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notifications fetched successfully",
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const id = req.params.id as string;
  const result = await NotificationService.markAsRead(userId, id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification marked as read successfully",
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const result = await NotificationService.markAllAsRead(userId);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "All notifications marked as read successfully",
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.userId;
  const id = req.params.id as string;
  const result = await NotificationService.deleteNotification(userId, id);
  sendResponse(res, {
    httpStatusCode: status.OK,
    success: true,
    message: "Notification deleted successfully",
    data: result,
  });
});

export const NotificationController = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
