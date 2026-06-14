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

            if (requiredRoles.length && !requiredRoles.includes(user.role)) {
                return res.status(status.FORBIDDEN).json({ success: false, message: "Forbidden access!" });
            }

            req.user = decoded as Express.Request["user"];
            next();
        } catch (error) {
            next(error);
        }
    };
};
