import z from "zod";

export const createEventZodSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    date: z.string(), // Consider refining to check actual date format
    time: z.string(),
    venue: z.string(),
    description: z.string(),
    isPublic: z.boolean().optional(),
    isPaid: z.boolean().optional(),
    fee: z.number().nonnegative().optional(),
    ownerId: z.string().uuid("Invalid owner ID")
});
