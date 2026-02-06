-- Add LINE user ID column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id TEXT UNIQUE;

-- Create index for faster lookup
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
