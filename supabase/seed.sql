-- AZ Barber App - 初始資料
-- 在建立 schema 後執行

-- =====================
-- 預設服務項目
-- =====================
INSERT INTO services (name, duration_minutes, price, is_active, sort_order) VALUES
  ('男士剪髮', 30, 350, TRUE, 1),
  ('女士剪髮', 45, 450, TRUE, 2),
  ('洗髮', 15, 100, TRUE, 3),
  ('洗剪', 45, 400, TRUE, 4),
  ('染髮', 90, 1500, TRUE, 5),
  ('燙髮', 120, 2000, TRUE, 6),
  ('護髮', 30, 500, TRUE, 7),
  ('頭皮護理', 45, 800, TRUE, 8),
  ('修容', 15, 150, TRUE, 9),
  ('兒童剪髮', 20, 250, TRUE, 10);

-- =====================
-- 注意事項
-- =====================
-- 1. 店長帳號需要手動在 Supabase Auth 建立後，更新 users 表的 role 為 'owner'
-- 2. 理髮師帳號需要手動在 Supabase Auth 建立後，更新 users 表的 role 為 'barber'
--    並在 barbers 表建立對應記錄
--
-- 範例：將用戶設為店長
-- UPDATE users SET role = 'owner' WHERE id = '用戶的UUID';
--
-- 範例：新增理髮師
-- UPDATE users SET role = 'barber' WHERE id = '用戶的UUID';
-- INSERT INTO barbers (user_id, display_name) VALUES ('用戶的UUID', '理髮師名稱');
