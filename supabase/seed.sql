-- AZ Barber App - Seed Data
-- Run after creating schema

-- =====================
-- Dev Users (for development testing)
-- =====================
INSERT INTO users (id, name, email, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Dev User', 'dev@test.com', 'customer'),
  ('00000000-0000-0000-0000-000000000002', '王小明', 'customer2@test.com', 'customer')
ON CONFLICT (id) DO NOTHING;

-- =====================
-- Services
-- =====================
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

-- =====================
-- Setting Up Barber Availability
-- =====================
-- After creating a barber, set their weekly availability.
-- This SQL adds default working hours for ALL barbers (Mon-Sat, 10:00-19:00):

-- INSERT INTO availability (barber_id, day_of_week, start_time, end_time, is_exception)
-- SELECT b.id, day_num, '10:00', '19:00', FALSE
-- FROM barbers b
-- CROSS JOIN (
--   SELECT 1 as day_num UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
--   SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
-- ) days;

-- =====================
-- Notes
-- =====================
-- 1. Owner: UPDATE users SET role = 'owner' WHERE id = 'USER_UUID';
-- 2. Barber:
--    UPDATE users SET role = 'barber' WHERE id = 'USER_UUID';
--    INSERT INTO barbers (user_id, display_name) VALUES ('USER_UUID', 'Name');
