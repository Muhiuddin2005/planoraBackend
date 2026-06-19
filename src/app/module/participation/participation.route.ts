import { Router } from "express";
import { ParticipationController } from "./participation.controller";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

// User requests to join an event
router.post("/:eventId/join", checkAuth("USER", "ADMIN", "MODERATOR"), ParticipationController.joinEvent);

// Event Owner updates status (Approve/Reject/Ban)
router.patch("/:participationId/status", checkAuth("USER", "ADMIN", "MODERATOR"), ParticipationController.updateStatus);

router.get("/my-requests", checkAuth("USER", "ADMIN", "MODERATOR"), ParticipationController.getMyRequests);
router.get("/my-tickets", checkAuth("USER", "ADMIN", "MODERATOR"), ParticipationController.getMyTickets);

export const ParticipationRoutes = router;
