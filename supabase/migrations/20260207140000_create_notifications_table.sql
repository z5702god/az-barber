-- Notifications table for in-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'booking_confirmed', 'booking_reminder', 'booking_cancelled',
    'booking_modified', 'promotion', 'announcement'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow system (triggers) to insert via SECURITY DEFINER functions
-- No direct INSERT policy needed since trigger uses SECURITY DEFINER

-- Trigger: automatically create notification for barber when a booking is created
CREATE OR REPLACE FUNCTION notify_barber_on_booking()
RETURNS TRIGGER AS $$
DECLARE
  barber_user_id UUID;
  customer_name TEXT;
  formatted_date TEXT;
  formatted_time TEXT;
BEGIN
  -- Get barber's user_id
  SELECT user_id INTO barber_user_id FROM barbers WHERE id = NEW.barber_id;
  IF barber_user_id IS NULL THEN RETURN NEW; END IF;

  -- Get customer name
  SELECT name INTO customer_name FROM users WHERE id = NEW.customer_id;

  -- Format date and time
  formatted_date := to_char(NEW.booking_date, 'MM/DD');
  formatted_time := to_char(NEW.start_time, 'HH24:MI');

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, booking_id)
  VALUES (
    barber_user_id,
    'booking_confirmed',
    '新預約通知',
    COALESCE(customer_name, '顧客') || ' 預約了 ' || formatted_date || ' ' || formatted_time,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_created
  AFTER INSERT ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed')
  EXECUTE FUNCTION notify_barber_on_booking();

-- Trigger: notify customer when barber cancels a booking
CREATE OR REPLACE FUNCTION notify_customer_on_cancel()
RETURNS TRIGGER AS $$
DECLARE
  barber_name TEXT;
  formatted_date TEXT;
  formatted_time TEXT;
BEGIN
  -- Only fire when status changes to cancelled by barber
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled'
     AND NEW.cancelled_by = 'barber' THEN

    -- Get barber name
    SELECT display_name INTO barber_name FROM barbers WHERE id = NEW.barber_id;

    formatted_date := to_char(NEW.booking_date, 'MM/DD');
    formatted_time := to_char(NEW.start_time, 'HH24:MI');

    INSERT INTO notifications (user_id, type, title, message, booking_id)
    VALUES (
      NEW.customer_id,
      'booking_cancelled',
      '預約已取消',
      COALESCE(barber_name, '設計師') || ' 取消了您 ' || formatted_date || ' ' || formatted_time || ' 的預約',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_cancelled
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_on_cancel();
