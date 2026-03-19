-- LINE Bot conversation state storage
CREATE TABLE IF NOT EXISTS line_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_user_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES users(id),
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by line_user_id
CREATE INDEX IF NOT EXISTS idx_line_conversations_line_user_id
  ON line_conversations(line_user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_line_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER line_conversation_updated
  BEFORE UPDATE ON line_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_line_conversation_timestamp();
