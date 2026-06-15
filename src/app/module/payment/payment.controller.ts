import { Request, Response } from "express";
import status from "http-status";
import { catchAsync } from "../../shared/catchAsync";
import { sendResponse } from "../../shared/sendResponse";
import { PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
    const eventId = req.params.eventId as string;
    const userId = req.user.userId; // From checkAuth middleware

    const result = await PaymentService.initiatePayment(userId, eventId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: true,
        message: "Payment session created",
        data: result,
    });
});

const handleWebhook = catchAsync(async (req: Request, res: Response) => {
    // Note: Stripe requires the raw body for signature verification in production.
    // For this boilerplate, we are simulating the payload structure.
    const result = await PaymentService.handleStripeWebhook(req.body);
    res.status(status.OK).json(result);
});

const verifyPayment = catchAsync(async (req: Request, res: Response) => {
    const { sessionId } = req.body;
    const result = await PaymentService.verifyPaymentSession(sessionId);
    sendResponse(res, {
        httpStatusCode: status.OK,
        success: result.success,
        message: result.message,
        data: result,
    });
});

export const PaymentController = { initiatePayment, handleWebhook, verifyPayment };
