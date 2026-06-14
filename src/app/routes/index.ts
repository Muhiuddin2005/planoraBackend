import { Router } from "express";
import { EventRoutes } from "../module/event/event.route";
import { AuthRoutes } from "../module/auth/auth.route";
import { ParticipationRoutes } from "../module/participation/participation.route";
import { PaymentRoutes } from "../module/payment/payment.route";
import { ReviewRoutes } from "../module/review/review.route";
import { InvitationRoutes } from "../module/invitation/invitation.route";
import { UserRoutes } from "../module/user/user.route";

const router = Router();

router.use("/events", EventRoutes);
router.use("/auth", AuthRoutes);
router.use("/participations", ParticipationRoutes);
router.use("/payments", PaymentRoutes);
router.use("/reviews", ReviewRoutes);
router.use("/invitations", InvitationRoutes);
router.use("/users", UserRoutes);

export const IndexRoutes = router;


