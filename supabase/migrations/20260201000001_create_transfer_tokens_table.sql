-- Migration: Create transfer_tokens table for secure session transfer
-- Created: 2026-02-01
-- Description: Stores one-time use transfer tokens for authentication flow between Next.js and Expo

-- Create transfer_tokens table
CREATE TABLE IF NOT EXISTS transfer_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_transfer_tokens_token ON transfer_tokens(token);
CREATE INDEX idx_transfer_tokens_user_id ON transfer_tokens(user_id);
CREATE INDEX idx_transfer_tokens_expires_at ON transfer_tokens(expires_at);

-- Enable RLS
ALTER TABLE transfer_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own tokens
CREATE POLICY "Users can view own transfer tokens"
ON transfer_tokens
FOR SELECT
USING (auth.uid() = user_id);

-- RLS Policy: System can insert tokens (via service role)
CREATE POLICY "Service role can insert transfer tokens"
ON transfer_tokens
FOR INSERT
WITH CHECK (true);

-- RLS Policy: System can update tokens (via service role)
CREATE POLICY "Service role can update transfer tokens"
ON transfer_tokens
FOR UPDATE
USING (true);

-- RLS Policy: System can delete expired tokens (via service role)
CREATE POLICY "Service role can delete transfer tokens"
ON transfer_tokens
FOR DELETE
USING (true);

-- Add comment
COMMENT ON TABLE transfer_tokens IS 'Stores one-time use transfer tokens for secure session transfer between Next.js and Expo apps';
