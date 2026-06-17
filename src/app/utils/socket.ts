import { Server } from "socket.io";
import prisma from "./prisma";

let io: Server | null = null;

export const initSocket = (server: any) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    },
  });

  io.on("connection", (socket) => {
    console.log("Client connected to socket:", socket.id);

    socket.on("join", (userId: string) => {
      if (userId) {
        socket.join(userId);
        console.log(`Socket ${socket.id} joined user room: ${userId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected from socket:", socket.id);
    });
  });

  return io;
};

export const sendNotification = async (userId: string, payload: { title: string; message: string }) => {
  try {
    // 1. Persist the notification in the database
    const notification = await prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        message: payload.message,
      },
    });

    // 2. Push real-time event to user's room
    if (io) {
      io.to(userId).emit("new_notification", notification);
      console.log(`Real-time notification emitted to user ${userId}:`, payload.title);
    }
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
};
