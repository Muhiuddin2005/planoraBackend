import { Router } from "express";
import { ParticipationController } from "./participation.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

// User requests to join an event
router.post("/:eventId/join", checkAuth("USER", "ADMIN"), ParticipationController.joinEvent);

// Event Owner updates status (Approve/Reject/Ban)
router.patch("/:participationId/status", checkAuth("USER", "ADMIN"), ParticipationController.updateStatus);

router.get("/my-requests", checkAuth("USER", "ADMIN"), ParticipationController.getMyRequests);
router.get("/my-tickets", checkAuth("USER", "ADMIN"), ParticipationController.getMyTickets);

export const ParticipationRoutes = router;
