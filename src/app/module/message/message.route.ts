import { Router } from "express";
import { MessageController } from "./message.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { createMessageSchema } from "./message.service";

const router = Router();

// Public contact form submission
router.post("/", validateRequest(createMessageSchema), MessageController.createMessage);

// Admin + Moderator retrieval
router.get("/", checkAuth("ADMIN", "MODERATOR"), MessageController.getAllMessages);

// Admin + Moderator message deletion
router.delete("/:id", checkAuth("ADMIN", "MODERATOR"), MessageController.deleteMessage);

export const MessageRoutes = router;
