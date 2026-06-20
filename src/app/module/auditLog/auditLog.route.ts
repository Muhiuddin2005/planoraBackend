import { Router } from "express";
import { checkAuth } from "../../middleware/checkAuth";
import { AuditLogController } from "./auditLog.controller";

const router = Router();

router.get("/", checkAuth("ADMIN"), AuditLogController.getAllAuditLogs);

export const AuditLogRoutes = router;
