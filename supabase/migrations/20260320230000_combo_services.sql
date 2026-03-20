-- Restructure: Remove 單剪, replace standalone 護髮 with 洗剪+護髮 combos

-- 1. Deactivate 單剪 and standalone 護髮
UPDATE services SET is_active = FALSE WHERE name = '單剪';
UPDATE services SET is_active = FALSE WHERE name IN ('護髮（基礎）', '護髮（標準）', '護髮（深層）');

-- 2. Insert combo services (洗剪 $1000 + 護髮 price, duration same as 洗剪)
INSERT INTO services (name, duration_minutes, price, is_active, sort_order, description, aliases) VALUES
  ('洗剪+護髮（基礎）', 60, 1300, TRUE, 2, NULL, '洗剪護髮,洗剪加護髮,洗加護,洗剪基礎護髮'),
  ('洗剪+護髮（標準）', 60, 1600, TRUE, 3, NULL, '洗剪標準護髮,洗加標準護'),
  ('洗剪+護髮（深層）', 60, 1800, TRUE, 4, NULL, '洗剪深層護髮,洗加深層護');

-- 3. Re-order remaining active services
UPDATE services SET sort_order = 1 WHERE name = '洗剪';
UPDATE services SET sort_order = 5 WHERE name = '單燙髮（肩上）';
UPDATE services SET sort_order = 6 WHERE name = '單燙髮（耳下）';
UPDATE services SET sort_order = 7 WHERE name = '單染髮';
UPDATE services SET sort_order = 8 WHERE name = '染髮（長髮）';
UPDATE services SET sort_order = 9 WHERE name = '頭皮精油保養';
UPDATE services SET sort_order = 10 WHERE name = '頭皮養髮保養';
