import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useAuth } from '../hooks/useAuth';
import * as Notifications from 'expo-notifications';
import { supabase } from '../services/supabase';
import { Notification, NotificationType } from '../types/notification';

interface NotificationContextType {
  // Push notification state
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  // In-app notification state
  inAppNotifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  refetch: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  expoPushToken: null,
  notification: null,
  inAppNotifications: [],
  unreadCount: 0,
  markAsRead: () => {},
  markAllAsRead: () => {},
  refetch: () => {},
});

export const useNotificationContext = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const { expoPushToken, notification } = useNotifications();
  const { user } = useAuth();

  const [inAppNotifications, setInAppNotifications] = useState<Notification[]>([]);

  const unreadCount = inAppNotifications.filter((n) => !n.isRead).length;

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      setInAppNotifications(
        data.map((n: any) => ({
          id: n.id,
          type: n.type as NotificationType,
          title: n.title,
          message: n.message,
          createdAt: n.created_at,
          isRead: n.is_read,
          bookingId: n.booking_id,
        }))
      );
    }
  }, [user?.id]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as any;
          const newNotification: Notification = {
            id: n.id,
            type: n.type as NotificationType,
            title: n.title,
            message: n.message,
            createdAt: n.created_at,
            isRead: n.is_read,
            bookingId: n.booking_id,
          };
          setInAppNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const markAsRead = useCallback(async (id: string) => {
    // Optimistic update
    setInAppNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    // Persist to database
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    // Optimistic update
    setInAppNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    // Persist to database
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  }, [user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        expoPushToken,
        notification,
        inAppNotifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        refetch: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
