import prisma from "../../utils/prisma";

const getUserNotifications = async (userId: string) => {
  return await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
};

const markAsRead = async (userId: string, notificationId: string) => {
  return await prisma.notification.update({
    where: { id: notificationId, userId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId: string) => {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const deleteNotification = async (userId: string, notificationId: string) => {
  return await prisma.notification.delete({
    where: { id: notificationId, userId },
  });
};

export const NotificationService = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
