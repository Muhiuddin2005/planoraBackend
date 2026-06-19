import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { EventService } from "./event.service";
import { jwtUtils } from "../../utils/jwt";
import prisma from "../../utils/prisma";
import { logActivity } from "../../utils/auditLogger";

const createEvent = catchAsync(async (req: Request, res: Response) => {
    if (req.file) {
        const imageUrl = req.file.path;
        let descriptionObj: any = {};
        try {
            descriptionObj = JSON.parse(req.body.description || "{}");
        } catch (e) {
            descriptionObj = { fullDescription: req.body.description };
        }
        descriptionObj.imageUrl = imageUrl;
        req.body.description = JSON.stringify(descriptionObj);
    }

    const result = await EventService.createEvent(req.body);
    sendResponse(res, {
        httpStatusCode: status.CREATED,
        success: true,
        message: "Event created successfully",
        data: result,
    });
});

const getAllEvents = catchAsync(async (req: Request, res: Response) => {
    let role: string | undefined;
    const token = req.headers.authorization?.split(" ")[1];
    
    // Safely attempt to decode the token if it exists
    if (token) {
        try {
            const secret = process.env.JWT_SECRET || "super_access_secret_123!";
            const decoded = jwtUtils.verifyToken(token, secret);
            role = decoded.role;
        } catch (error) {
            // Silently fail for expired/invalid tokens so public guests can still view events
        }
    }

    // Pass the extracted role to the service
    const result = await EventService.getAllEvents(role);
    
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: role === "ADMIN" ? "All events fetched for Admin" : "Public events fetched successfully",
        data: result,
    });
});

const getHostedEvents = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user?.userId as string;
    const result = await EventService.getHostedEvents(userId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Hosted events fetched successfully",
        data: result,
    });
});

const getSingleEvent = catchAsync(async (req: Request, res: Response) => {
    const result = await EventService.getSingleEvent(req.params.id as string);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event fetched successfully",
        data: result,
    });
});

const updateEvent = catchAsync(async (req: Request, res: Response) => {
    const userId = req.user.userId;
    const result = await EventService.updateEvent(req.params.id as string, userId, req.body);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event updated successfully",
        data: result,
    });
});

const deleteEvent = catchAsync(async (req: Request, res: Response) => {
    const { userId, role } = req.user;
    const id = req.params.id as string;
    
    // Get target event first to log title
    const targetEvent = await prisma.event.findUnique({ where: { id } });

    await EventService.deleteEvent(id, userId, role);

    if (targetEvent && (role === "ADMIN" || role === "MODERATOR")) {
        await logActivity({
            userId,
            action: "DELETE_EVENT",
            targetId: id,
            targetName: targetEvent.title,
            details: `Deleted event "${targetEvent.title}" (ID: ${id})`
        });
    }

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event deleted successfully",
        data: null,
    });
});

const updateEventStatus = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { status: eventStatus, rejectionReason } = req.body;
    const result = await EventService.updateEventStatus(id, eventStatus, rejectionReason);
    
    await logActivity({
        userId: req.user.userId,
        action: eventStatus === "APPROVED" ? "APPROVE_EVENT" : "REJECT_EVENT",
        targetId: id,
        targetName: result.title,
        details: `${eventStatus === "APPROVED" ? "Approved" : "Rejected"} event "${result.title}"${rejectionReason ? ` (Reason: ${rejectionReason})` : ""}`
    });

    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Event status updated successfully",
        data: result,
    });
});

const getAdminStats = catchAsync(async (_req: Request, res: Response) => {
    const result = await EventService.getAdminStats();
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Admin stats fetched successfully",
        data: result,
    });
});

export const EventController = { createEvent, getAllEvents, getHostedEvents, getSingleEvent, updateEvent, deleteEvent, updateEventStatus, getAdminStats };


