-- 加入取消原因欄位
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_by TEXT CHECK (cancelled_by IN ('customer', 'barber'));

-- 加入註解
COMMENT ON COLUMN bookings.cancellation_reason IS '取消預約的原因';
COMMENT ON COLUMN bookings.cancelled_by IS '取消者：customer 或 barber';
