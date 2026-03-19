-- Support walk-in bookings and barber-created bookings
-- 1. Make customer_id nullable (for walk-in customers)
ALTER TABLE bookings ALTER COLUMN customer_id DROP NOT NULL;

-- 2. Add walk-in fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS walk_in_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS walk_in_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 3. Ensure every booking has either a registered customer or a walk-in name
ALTER TABLE bookings ADD CONSTRAINT booking_has_customer
  CHECK (customer_id IS NOT NULL OR (walk_in_name IS NOT NULL AND walk_in_name != ''));

-- 4. RLS: Barbers can create bookings for their own schedule
CREATE POLICY "Barbers can create bookings for their schedule"
  ON bookings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM barbers
      WHERE barbers.id = bookings.barber_id
        AND barbers.user_id = auth.uid()
    )
  );

-- 5. RLS: Barbers can insert booking_services for their bookings
CREATE POLICY "Barbers can insert booking_services for their bookings"
  ON booking_services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings
      JOIN barbers ON barbers.id = bookings.barber_id
      WHERE bookings.id = booking_services.booking_id
        AND barbers.user_id = auth.uid()
    )
  );

-- 6. RLS: Barbers can read customer list (for search)
CREATE POLICY "Barbers can read customers for booking"
  ON users FOR SELECT
  USING (
    role = 'customer'
    AND public.get_my_role() IN ('barber', 'owner')
  );

-- 7. Update notify_barber_on_booking() to handle NULL customer_id
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

  -- Handle walk-in vs registered customer
  IF NEW.customer_id IS NOT NULL THEN
    SELECT name INTO customer_name FROM users WHERE id = NEW.customer_id;
  ELSE
    customer_name := NEW.walk_in_name;
  END IF;

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

-- 8. Update notify_customer_on_cancel() to skip notification for walk-in bookings
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

    -- Skip notification for walk-in bookings (no app account)
    IF NEW.customer_id IS NULL THEN
      RETURN NEW;
    END IF;

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
