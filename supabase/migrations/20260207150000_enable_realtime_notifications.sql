-- Enable Realtime for notifications table so the app receives
-- instant updates when new notifications are inserted
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
