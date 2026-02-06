import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useAuth } from './useAuth';
import {
  registerForPushNotifications,
  savePushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '../services/notifications';

export interface NotificationData {
  bookingId?: string;
  type?: string;
  [key: string]: any;
}

export function useNotifications() {
  const { user } = useAuth();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    // Register for push notifications when user is logged in
    if (user?.id) {
      registerForPushNotifications().then((pushToken) => {
        if (pushToken) {
          setExpoPushToken(pushToken.token);
          // Save token to database
          savePushToken(user.id, pushToken);
        }
      });
    }

    // Listen for incoming notifications while app is in foreground
    notificationListener.current = addNotificationReceivedListener((notification) => {
      setNotification(notification);
    });

    // Listen for notification taps
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as NotificationData;
      handleNotificationTap(data);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [user?.id]);

  const handleNotificationTap = (data: NotificationData) => {
    // Handle navigation based on notification type
    if (__DEV__) console.log('Notification tapped:', data);

    // Navigation logic can be added here
    // For example: navigate to booking detail if bookingId is present
    if (data.bookingId) {
      // Navigation will be handled by the component using this hook
    }
  };

  return {
    expoPushToken,
    notification,
  };
}
