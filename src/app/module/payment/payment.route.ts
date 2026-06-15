import { Router } from "express";
import { PaymentController } from "./payment.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

router.post("/:eventId/initiate", checkAuth("USER", "ADMIN"), PaymentController.initiatePayment);
router.post("/webhook", PaymentController.handleWebhook);
router.post("/verify", checkAuth("USER", "ADMIN"), PaymentController.verifyPayment);

export const PaymentRoutes = router;
