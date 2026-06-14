import express, { Application, Request, Response } from "express";
import cors from "cors";
import { IndexRoutes } from "./app/routes";
import { globalErrorHandler } from "./app/middleware/globalErrorHandler";
import { notFound } from "./app/middleware/notFound";

const app: Application = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", IndexRoutes);

app.get('/', (req: Request, res: Response) => {
    res.status(200).json({ success: true, message: 'Planora API is running perfectly' });
});

// Plug in our globalErrorHandler and notFound interceptors
app.use(globalErrorHandler);
app.use(notFound);

export default app;
