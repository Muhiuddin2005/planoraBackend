import { Router } from "express";
import { UserController } from "./user.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { upload } from "../../config/cloudinary.config";

const router = Router();

router.get("/", checkAuth("ADMIN", "MODERATOR"), UserController.getAllUsers);
router.patch("/:id/status", checkAuth("ADMIN", "MODERATOR"), UserController.toggleUserStatus);
router.patch("/:id/role", checkAuth("ADMIN"), UserController.promoteUserRole);
router.delete("/:id", checkAuth("ADMIN"), UserController.deleteUser);
router.patch("/profile-pic", checkAuth("USER", "ADMIN", "MODERATOR"), upload.single("image"), UserController.updateProfilePic);
router.post("/report-violation", checkAuth("USER", "ADMIN", "MODERATOR"), UserController.reportViolation);

export const UserRoutes = router;
