import prisma from "../../utils/prisma";

const getAllAuditLogs = async () => {
    return await prisma.auditLog.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                }
            }
        },
        orderBy: {
            createdAt: "desc"
        }
    });
};

export const AuditLogService = {
    getAllAuditLogs
};
