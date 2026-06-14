import { NextFunction, Request, Response } from "express";
import z from "zod";

export const validateRequest = (zodSchema: z.ZodTypeAny) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const parsedResult = await zodSchema.parseAsync(req.body);
            req.body = parsedResult;
            next();
        } catch (error) {
            next(error);
        }
    };
};
