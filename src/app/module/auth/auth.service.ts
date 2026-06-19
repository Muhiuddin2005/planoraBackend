import bcrypt from "bcrypt";
import status from "http-status";
import { jwtUtils } from "../../utils/jwt";
import prisma from "../../utils/prisma";
import { sendEmail } from "../../utils/email";
import AppError from "../../errorHelpers/AppError";

const registerUser = async (payload: any) => {
    const hashedPassword = await bcrypt.hash(payload.password, 12);
    
    // We can use a transaction, but simple create is fine here
    const user = await prisma.user.create({
        data: {
            name: payload.name,
            email: payload.email,
            passwordHash: hashedPassword,
        }
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.verification.create({
        data: {
            email: payload.email,
            otp,
            expiresAt
        }
    });

    // Send email asynchronously
    sendEmail(payload.email, "Verify Your Email - Planora", "otp", {
        name: payload.name,
        otp,
    }).catch((err: any) => console.error("Failed to send OTP email:", err));

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

const loginUser = async (payload: any) => {
    const user = await prisma.user.findUnique({ where: { email: payload.email } });
    if (!user) throw new AppError(status.NOT_FOUND, "User not found");

    if (user.status === "BANNED") {
        throw new AppError(status.FORBIDDEN, "This account has been permanently banned due to security violations.");
    }
    
    if (!user.emailVerified) {
        throw new AppError(status.FORBIDDEN, "EMAIL_NOT_VERIFIED");
    }

    const isPasswordMatched = await bcrypt.compare(payload.password, user.passwordHash);
    if (!isPasswordMatched) throw new AppError(status.UNAUTHORIZED, "Incorrect password");

    const secret = process.env.JWT_SECRET || "super_access_secret_123!";
    const token = jwtUtils.createToken(
        { userId: user.id, role: user.role, email: user.email },
        secret,
        "10d"
    );

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
};

const getProfile = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    if (!user) throw new AppError(status.NOT_FOUND, "User not found");

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
};

const verifyEmail = async (payload: { email: string, otp: string }) => {
    const verification = await prisma.verification.findFirst({
        where: { email: payload.email, otp: payload.otp },
        orderBy: { createdAt: 'desc' }
    });

    if (!verification) throw new AppError(status.BAD_REQUEST, "Invalid OTP");
    if (verification.expiresAt < new Date()) throw new AppError(status.BAD_REQUEST, "OTP has expired");

    const user = await prisma.user.update({
        where: { email: payload.email },
        data: { emailVerified: true }
    });

    await prisma.verification.deleteMany({
        where: { email: payload.email }
    });

    const secret = process.env.JWT_SECRET || "super_access_secret_123!";
    const token = jwtUtils.createToken(
        { userId: user.id, role: user.role, email: user.email },
        secret,
        "10d"
    );

    const { passwordHash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
};

const resendOtp = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }
    
    if (user.emailVerified) {
        throw new AppError(status.BAD_REQUEST, "Email is already verified. Please log in.");
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Replace any existing expired OTPs
    await prisma.verification.deleteMany({ where: { email } });
    
    await prisma.verification.create({
        data: { email, otp, expiresAt },
    });

    await sendEmail(user.email, "Verify Your Email - Planora", "otp", { name: user.name, otp });

    return { message: "A new OTP has been sent to your email." };
};

const forgotPassword = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        throw new AppError(status.NOT_FOUND, "User not found");
    }

    const secret = (process.env.JWT_SECRET || "super_access_secret_123!") + user.passwordHash;
    const token = jwtUtils.createToken(
        { userId: user.id, email: user.email },
        secret,
        "15m"
    );

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;

    await sendEmail(user.email, "Reset Your Planora Password", "password-reset", {
        name: user.name,
        resetUrl,
    });

    return { message: "Reset password instructions sent to your email." };
};

const resetPassword = async (payload: any) => {
    const { email, token, newPassword } = payload;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new AppError(status.NOT_FOUND, "User not found");

    const secret = (process.env.JWT_SECRET || "super_access_secret_123!") + user.passwordHash;

    try {
        jwtUtils.verifyToken(token, secret);
    } catch (err) {
        throw new AppError(status.BAD_REQUEST, "Invalid or expired reset token");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newPasswordHash }
    });

    return { message: "Password reset successful." };
};

const changePassword = async (userId: string, payload: any) => {
    const { currentPassword, newPassword } = payload;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(status.NOT_FOUND, "User not found");

    const isPasswordMatched = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordMatched) throw new AppError(status.UNAUTHORIZED, "Current password incorrect");

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
    });

    return { message: "Password updated successfully." };
};

export const AuthService = { 
    registerUser, 
    loginUser, 
    getProfile, 
    verifyEmail, 
    resendOtp,
    forgotPassword,
    resetPassword,
    changePassword
};

