import { Router } from "express";
import { ReviewController } from "./review.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { createReviewSchema } from "./review.service";

const router = Router();

router.post("/:eventId", checkAuth("USER", "ADMIN"), validateRequest(createReviewSchema), ReviewController.createReview);
router.get("/:eventId", ReviewController.getEventReviews);
router.put("/:id", checkAuth("USER", "ADMIN"), validateRequest(createReviewSchema), ReviewController.updateReview);
router.delete("/:id", checkAuth("USER", "ADMIN"), ReviewController.deleteReview);

export const ReviewRoutes = router;

