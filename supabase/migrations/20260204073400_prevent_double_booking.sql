-- Migration: Prevent Double Booking
-- This migration adds constraints to prevent the same barber from having overlapping bookings

-- Step 1: Enable btree_gist extension (needed for EXCLUDE constraint with multiple columns)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Step 2: Add a time range column to bookings for easier overlap checking
-- We'll use a generated column that combines booking_date, start_time, and end_time into a tsrange

-- First, let's add a composite unique index to prevent exact same time slot bookings
-- This catches the simple case where two bookings have the exact same start time
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_no_duplicate_start
ON bookings (barber_id, booking_date, start_time)
WHERE status != 'cancelled';

-- Step 3: Create a function to check for overlapping bookings
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
DECLARE
  overlap_count INTEGER;
BEGIN
  -- Skip check for cancelled bookings
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Check for overlapping bookings
  SELECT COUNT(*) INTO overlap_count
  FROM bookings
  WHERE barber_id = NEW.barber_id
    AND booking_date = NEW.booking_date
    AND status != 'cancelled'
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND (
      -- New booking starts during existing booking
      (NEW.start_time >= start_time AND NEW.start_time < end_time)
      OR
      -- New booking ends during existing booking
      (NEW.end_time > start_time AND NEW.end_time <= end_time)
      OR
      -- New booking completely contains existing booking
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    );

  IF overlap_count > 0 THEN
    RAISE EXCEPTION 'Booking time slot overlaps with existing booking'
      USING ERRCODE = 'unique_violation',
            HINT = 'The selected time slot is no longer available';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to run the overlap check before insert or update
DROP TRIGGER IF EXISTS prevent_booking_overlap ON bookings;
CREATE TRIGGER prevent_booking_overlap
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_overlap();

-- Step 5: Clean up any existing duplicate bookings (keep the earliest one)
-- First, identify duplicates
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT id, barber_id, booking_date, start_time,
           ROW_NUMBER() OVER (PARTITION BY barber_id, booking_date, start_time ORDER BY created_at ASC) as rn
    FROM bookings
    WHERE status != 'cancelled'
  LOOP
    IF dup.rn > 1 THEN
      -- Cancel duplicate bookings (keep the first one)
      UPDATE bookings SET status = 'cancelled' WHERE id = dup.id;
      RAISE NOTICE 'Cancelled duplicate booking: %', dup.id;
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION check_booking_overlap() IS 'Prevents double booking by checking for time slot overlaps';
