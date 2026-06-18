import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { InvitationController } from "./invitation.controller";

const router = Router();

router.post("/", checkAuth("USER", "ADMIN", "MODERATOR"), InvitationController.sendInvitation);
router.patch("/:id/respond", checkAuth("USER", "ADMIN", "MODERATOR"), InvitationController.respondToInvitation);
router.get("/my-invites", checkAuth("USER", "ADMIN", "MODERATOR"), InvitationController.getMyInvitations);

export const InvitationRoutes = router;
