-- Fix: Time slot availability visible to customers & service data updates
-- Root cause: RLS policy only lets customers read their OWN bookings,
-- so other customers' booked slots appear available.

-- 1. RPC function to get booked time slots (bypasses RLS via SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_booked_slots(p_barber_id UUID, p_date DATE)
RETURNS TABLE(start_time TIME, end_time TIME)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.start_time, b.end_time
  FROM bookings b
  WHERE b.barber_id = p_barber_id
    AND b.booking_date = p_date
    AND b.status != 'cancelled';
$$;

-- 2. Add description and aliases columns to services
ALTER TABLE services ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS aliases TEXT;

-- 3. Relax duration_minutes constraint to allow 0 (護髮 done with washing)
ALTER TABLE services DROP CONSTRAINT IF EXISTS services_duration_minutes_check;
ALTER TABLE services ADD CONSTRAINT services_duration_minutes_check CHECK (duration_minutes >= 0);

-- 4. Update service data
-- 頭皮精油保養: price $800→$1000, duration 30→60min
UPDATE services SET price = 1000, duration_minutes = 60 WHERE name = '頭皮精油保養';

-- 單燙髮（耳下）: duration 240→180min (3 hours)
UPDATE services SET duration_minutes = 180 WHERE name = '單燙髮（耳下）';

-- 單染髮: add description
UPDATE services SET description = '漂髮或特殊色請直接和設計師討論再預約' WHERE name = '單染髮';

-- 護髮: duration→0 (done concurrently with washing, no extra time)
UPDATE services SET duration_minutes = 0 WHERE name IN ('護髮（基礎）', '護髮（標準）', '護髮（深層）');

-- Bump sort_order for services after 染髮 to make room for new 染髮（長髮）
UPDATE services SET sort_order = 7 WHERE name = '護髮（基礎）';
UPDATE services SET sort_order = 8 WHERE name = '護髮（標準）';
UPDATE services SET sort_order = 9 WHERE name = '護髮（深層）';
UPDATE services SET sort_order = 10 WHERE name = '頭皮精油保養';
UPDATE services SET sort_order = 11 WHERE name = '頭皮養髮保養';

-- New: 染髮（長髮）
INSERT INTO services (name, duration_minutes, price, is_active, sort_order, description)
VALUES ('染髮（長髮）', 120, 1800, TRUE, 6, '請直接跟理髮師討論再預約');

-- 4. Add aliases for AI recognition
UPDATE services SET aliases = '洗加剪,洗頭加剪,洗髮加剪,洗頭剪髮,洗頭,剪頭髮' WHERE name = '洗剪';
UPDATE services SET aliases = '剪髮,只要剪,只剪,剪頭,理髮,純剪' WHERE name = '單剪';
UPDATE services SET aliases = '燙髮,燙頭髮,燙短髮,肩上燙,短髮燙' WHERE name = '單燙髮（肩上）';
UPDATE services SET aliases = '燙長髮,耳下燙,長髮燙' WHERE name = '單燙髮（耳下）';
UPDATE services SET aliases = '染髮,染頭髮,染色,染頭,短髮染' WHERE name = '單染髮';
UPDATE services SET aliases = '長髮染,長髮染色,長髮染髮' WHERE name = '染髮（長髮）';
UPDATE services SET aliases = '基礎護髮,護髮,護' WHERE name = '護髮（基礎）';
UPDATE services SET aliases = '標準護髮' WHERE name = '護髮（標準）';
UPDATE services SET aliases = '深層護髮' WHERE name = '護髮（深層）';
UPDATE services SET aliases = '精油,精油保養,頭皮精油,頭皮保養' WHERE name = '頭皮精油保養';
UPDATE services SET aliases = '養髮,養髮保養,頭皮養髮' WHERE name = '頭皮養髮保養';
