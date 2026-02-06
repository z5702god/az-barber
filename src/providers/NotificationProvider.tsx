import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import * as Notifications from 'expo-notifications';
import { Notification } from '../types/notification';

interface NotificationContextType {
  // Push notification state
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  // In-app notification state
  inAppNotifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  notification: null,
  inAppNotifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
});

export const useNotificationContext = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { expoPushToken, notification } = useNotifications();

  // In-app notification state
  const [inAppNotifications, setInAppNotifications] = useState<Notification[]>([]);

  const unreadCount = inAppNotifications.filter((n) => !n.isRead).length;

  const markAsRead = useCallback((id: string) => {
    setInAppNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setInAppNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        inAppNotifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
