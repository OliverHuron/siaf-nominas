-- ============================================================
-- MIGRATION: Per-user Gmail OAuth tokens
-- Run this in psql or pgAdmin against your siaf_db
-- ============================================================

CREATE TABLE IF NOT EXISTS user_gmail_tokens (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  access_token  TEXT NOT NULL,
  refresh_token TEXT,
  token_type    TEXT DEFAULT 'Bearer',
  expiry_date   BIGINT,
  gmail_email   TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- Optional: migrate the existing global token to the current admin if you want
-- (Skip this if you prefer everyone to re-authorize)
-- INSERT INTO user_gmail_tokens (user_id, access_token, refresh_token, token_type, expiry_date, gmail_email)
-- SELECT 1, ...  -- fill in manually from gmail_tokens.json
-- ON CONFLICT DO NOTHING;
