import { NextFunction, Request, Response } from "express";
import status from "http-status";
import { jwtUtils } from "../utils/jwt";
import { Role } from "@prisma/client";
import prisma from "../utils/prisma";

export const checkAuth = (...requiredRoles: Role[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) {
                return res.status(status.UNAUTHORIZED).json({ success: false, message: "You are not authorized!" });
            }

            const secret = process.env.JWT_SECRET || "super_access_secret_123!";
            const decoded = jwtUtils.verifyToken(token, secret);
            
            const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
            if (!user) {
                return res.status(status.NOT_FOUND).json({ success: false, message: "User not found!" });
            }

            if (user.status === "BANNED") {
                return res.status(status.FORBIDDEN).json({ success: false, message: "Your account has been banned due to policy violations." });
            }

            if (requiredRoles.length && !requiredRoles.includes(user.role)) {
                // Prevent duplicate violation counts from concurrent requests on the same page load
                const lastUpdated = new Date(user.updatedAt).getTime();
                const now = Date.now();
                const isRecentViolation = (now - lastUpdated) < 3000; // 3 seconds window

                let newViolationCount = user.violationCount;
                if (!isRecentViolation) {
                    newViolationCount = user.violationCount + 1;
                }

                const shouldBan = newViolationCount >= 2;

                if (!isRecentViolation) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            violationCount: newViolationCount,
                            status: shouldBan ? "BANNED" : user.status
                        }
                    });
                }

                return res.status(status.FORBIDDEN).json({ 
                    success: false, 
                    message: shouldBan 
                        ? "Forbidden access! Your account has been banned due to repeated unauthorized access attempts." 
                        : `Forbidden access! Warning: Unauthorized access attempt registered (${newViolationCount}/2).`
                });
            }

            req.user = decoded as Express.Request["user"];
            next();
        } catch (error) {
            next(error);
        }
    };
};
