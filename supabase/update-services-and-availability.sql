-- =====================================================
-- AZ Barber - Update Services & Set Up Availability
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: Check Current Barbers
-- =====================================================
-- First, let's see what barbers exist
SELECT b.id as barber_id, b.display_name, b.user_id, u.email
FROM barbers b
LEFT JOIN users u ON b.user_id = u.id;

-- =====================================================
-- STEP 2: Update Services
-- =====================================================

-- Delete existing services
DELETE FROM services;

-- Insert new services
INSERT INTO services (name, duration_minutes, price, is_active, sort_order) VALUES
  ('洗剪', 60, 1000, TRUE, 1),
  ('單剪', 60, 900, TRUE, 2),
  ('單燙髮（肩上）', 120, 2000, TRUE, 3),
  ('單燙髮（耳下）', 240, 2500, TRUE, 4),
  ('單染髮', 120, 1800, TRUE, 5),
  ('護髮（基礎）', 60, 300, TRUE, 6),
  ('護髮（標準）', 60, 600, TRUE, 7),
  ('護髮（深層）', 60, 800, TRUE, 8),
  ('頭皮精油保養', 30, 800, TRUE, 9),
  ('頭皮養髮保養', 60, 1200, TRUE, 10);

-- Verify services
SELECT * FROM services ORDER BY sort_order;

-- =====================================================
-- STEP 3: Set Up Barbers (AZ and Wendy only)
-- =====================================================
-- NOTE: You need two user accounts first!
-- If AZ and Wendy don't have accounts yet, create them in Supabase Auth first.

-- Option A: If barbers table is empty, add them manually:
-- (Replace USER_ID_AZ and USER_ID_WENDY with actual user IDs from auth.users)

-- DELETE FROM barbers;  -- Clear existing barbers if needed
-- INSERT INTO barbers (user_id, display_name, status) VALUES
--   ('USER_ID_AZ', 'AZ', 'active'),
--   ('USER_ID_WENDY', 'Wendy', 'active');

-- Option B: Update existing users to be barbers:
-- UPDATE users SET role = 'barber' WHERE email IN ('az@example.com', 'wendy@example.com');

-- =====================================================
-- STEP 4: Set Up Availability for ALL Barbers
-- =====================================================

-- Delete existing availability
DELETE FROM availability;

-- Add availability for ALL barbers (Monday to Saturday, 10:00-19:00)
INSERT INTO availability (barber_id, day_of_week, start_time, end_time, is_exception)
SELECT
  b.id as barber_id,
  day_num as day_of_week,
  '10:00' as start_time,
  '19:00' as end_time,
  FALSE as is_exception
FROM barbers b
CROSS JOIN (
  SELECT 1 as day_num UNION ALL  -- Monday
  SELECT 2 UNION ALL             -- Tuesday
  SELECT 3 UNION ALL             -- Wednesday
  SELECT 4 UNION ALL             -- Thursday
  SELECT 5 UNION ALL             -- Friday
  SELECT 6                       -- Saturday
) days
WHERE b.status = 'active';  -- Only active barbers

-- =====================================================
-- STEP 5: Verify Everything
-- =====================================================

-- Check barbers
SELECT * FROM barbers;

-- Check availability
SELECT
  b.display_name,
  CASE a.day_of_week
    WHEN 1 THEN 'Mon'
    WHEN 2 THEN 'Tue'
    WHEN 3 THEN 'Wed'
    WHEN 4 THEN 'Thu'
    WHEN 5 THEN 'Fri'
    WHEN 6 THEN 'Sat'
  END as day,
  a.start_time || ' - ' || a.end_time as hours
FROM availability a
JOIN barbers b ON a.barber_id = b.id
ORDER BY b.display_name, a.day_of_week;
