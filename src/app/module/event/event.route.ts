import { Router } from "express";
import { EventController } from "./event.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { createEventZodSchema } from "./event.validation";
import { checkAuth } from "../../middleware/checkAuth";
import { upload } from "../../config/cloudinary.config";

const router = Router();

const parseMultipartEvent = (req: any, res: any, next: any) => {
    if (req.body.isPublic !== undefined) {
        req.body.isPublic = req.body.isPublic === "true";
    }
    if (req.body.isPaid !== undefined) {
        req.body.isPaid = req.body.isPaid === "true";
    }
    if (req.body.fee !== undefined) {
        req.body.fee = Number(req.body.fee);
    }
    next();
};

router.post("/", checkAuth("USER", "ADMIN", "MODERATOR"), upload.single("image"), parseMultipartEvent, validateRequest(createEventZodSchema), EventController.createEvent);
router.get("/admin/stats", checkAuth("ADMIN", "MODERATOR"), EventController.getAdminStats);
router.get("/", EventController.getAllEvents);
router.get("/hosted", checkAuth("USER", "ADMIN", "MODERATOR"), EventController.getHostedEvents);
router.get("/:id", EventController.getSingleEvent);
router.put("/:id", checkAuth("USER", "ADMIN", "MODERATOR"), EventController.updateEvent);
router.delete("/:id", checkAuth("USER", "ADMIN"), EventController.deleteEvent);
router.patch("/:id/status", checkAuth("ADMIN", "MODERATOR"), EventController.updateEventStatus);

export const EventRoutes = router;



