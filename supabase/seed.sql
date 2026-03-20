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
INSERT INTO services (name, duration_minutes, price, is_active, sort_order, description, aliases) VALUES
  ('洗剪', 60, 1000, TRUE, 1, NULL, '洗加剪,洗頭加剪,洗髮加剪,洗頭剪髮,洗頭,剪頭髮'),
  ('洗剪+護髮（基礎）', 60, 1300, TRUE, 2, NULL, '洗剪護髮,洗剪加護髮,洗加護,洗剪基礎護髮'),
  ('洗剪+護髮（標準）', 60, 1600, TRUE, 3, NULL, '洗剪標準護髮,洗加標準護'),
  ('洗剪+護髮（深層）', 60, 1800, TRUE, 4, NULL, '洗剪深層護髮,洗加深層護'),
  ('單燙髮（肩上）', 120, 2000, TRUE, 5, NULL, '燙髮,燙頭髮,燙短髮,肩上燙,短髮燙'),
  ('單燙髮（耳下）', 180, 2500, TRUE, 6, NULL, '燙長髮,耳下燙,長髮燙'),
  ('單染髮', 120, 1800, TRUE, 7, '漂髮或特殊色請直接和設計師討論再預約', '染髮,染頭髮,染色,染頭,短髮染'),
  ('染髮（長髮）', 120, 1800, TRUE, 8, '請直接跟理髮師討論再預約', '長髮染,長髮染色,長髮染髮'),
  ('頭皮精油保養', 60, 1000, TRUE, 9, NULL, '精油,精油保養,頭皮精油,頭皮保養'),
  ('頭皮養髮保養', 60, 1200, TRUE, 10, NULL, '養髮,養髮保養,頭皮養髮');

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
