import z from "zod";
import prisma from "../../utils/prisma";

export const createMessageSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    message: z.string().min(10, "Message must be at least 10 characters"),
});

const createMessage = async (payload: { name: string; email: string; message: string }) => {
    const validated = createMessageSchema.parse(payload);
    return await prisma.message.create({
        data: validated,
    });
};

const getAllMessages = async () => {
    return await prisma.message.findMany({
        orderBy: { createdAt: "desc" },
    });
};

const deleteMessage = async (id: string) => {
    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) {
        throw new Error("Message not found");
    }
    return await prisma.message.delete({ where: { id } });
};

export const MessageService = {
    createMessage,
    getAllMessages,
    deleteMessage,
};
