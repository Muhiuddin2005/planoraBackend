import { Router } from "express";
import { AuthController } from "./auth.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { registerUserZodSchema, loginUserZodSchema } from "./auth.validation";
import { checkAuth } from "../../middleware/checkAuth";

const router = Router();

router.post("/register", validateRequest(registerUserZodSchema), AuthController.registerUser);
router.post("/verify-email", AuthController.verifyEmail);
router.post("/resend-otp", AuthController.resendOtp);
router.post("/login", validateRequest(loginUserZodSchema), AuthController.loginUser);
router.get("/me", checkAuth("USER", "ADMIN"), AuthController.getProfile);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/reset-password", AuthController.resetPassword);
router.patch("/change-password", checkAuth("USER", "ADMIN"), AuthController.changePassword);

export const AuthRoutes = router;

