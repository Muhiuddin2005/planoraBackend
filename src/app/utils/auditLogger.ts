import prisma from "./prisma";

export const logActivity = async ({
  userId,
  action,
  targetId,
  targetName,
  details
}: {
  userId: string;
  action: string;
  targetId?: string;
  targetName?: string;
  details?: string;
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        targetId,
        targetName,
        details
      }
    });
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};
