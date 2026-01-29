-- Migration: Add profile fields to users table
-- Date: 2026-01-29
-- Description: Add birthday, gender, preferences columns for profile editing feature

-- Add birthday column
ALTER TABLE users ADD COLUMN IF NOT EXISTS birthday DATE;

-- Add gender column with check constraint
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender TEXT
  CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Add preferences column (JSONB for flexible preferences storage)
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create index on gender for potential filtering
CREATE INDEX IF NOT EXISTS idx_users_gender ON users(gender);

-- Add comment for documentation
COMMENT ON COLUMN users.birthday IS 'User birthday in YYYY-MM-DD format';
COMMENT ON COLUMN users.gender IS 'User gender: male, female, other, prefer_not_to_say';
COMMENT ON COLUMN users.preferences IS 'User preferences as JSON: {booking_reminder: boolean, promo_notifications: boolean}';
