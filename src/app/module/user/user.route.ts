import { Router } from "express";
import { UserController } from "./user.controller";
import { checkAuth } from "../../middleware/checkAuth";
import { upload } from "../../config/cloudinary.config";

const router = Router();

router.get("/", checkAuth("ADMIN"), UserController.getAllUsers);
router.patch("/:id/status", checkAuth("ADMIN"), UserController.toggleUserStatus);
router.delete("/:id", checkAuth("ADMIN"), UserController.deleteUser);
router.patch("/profile-pic", checkAuth("USER", "ADMIN"), upload.single("image"), UserController.updateProfilePic);
router.post("/report-violation", checkAuth("USER", "ADMIN"), UserController.reportViolation);

export const UserRoutes = router;
