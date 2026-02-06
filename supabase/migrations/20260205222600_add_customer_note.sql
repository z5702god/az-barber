-- 加入顧客備註欄位
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS customer_note TEXT,
ADD COLUMN IF NOT EXISTS note_updated_at TIMESTAMPTZ;

-- 加入註解
COMMENT ON COLUMN bookings.customer_note IS '顧客給理髮師的備註（例如：會晚到、髮型需求等）';
COMMENT ON COLUMN bookings.note_updated_at IS '備註最後更新時間';
