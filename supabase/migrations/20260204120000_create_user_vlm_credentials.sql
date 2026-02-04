-- filepath: supabase/migrations/20260204120000_create_user_vlm_credentials.sql
-- description: Create user_vlm_credentials table for storing encrypted VLM API keys
-- created: 2026-02-04
-- creator: Claude Sonnet 4.5

-- Create user_vlm_credentials table
CREATE TABLE IF NOT EXISTS public.user_vlm_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('anthropic_claude', 'openai_gpt4v', 'google_gemini')),
    api_key_ciphertext BYTEA NOT NULL,
    nonce BYTEA NOT NULL,
    salt BYTEA NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_user_vlm_credentials_user_id ON public.user_vlm_credentials(user_id);
CREATE INDEX idx_user_vlm_credentials_provider ON public.user_vlm_credentials(provider);
CREATE INDEX idx_user_vlm_credentials_is_active ON public.user_vlm_credentials(is_active);

-- Ensure one active key per provider per user (partial unique index)
CREATE UNIQUE INDEX unique_active_provider_per_user
    ON public.user_vlm_credentials(user_id, provider)
    WHERE (is_active = true);

-- Enable Row Level Security
ALTER TABLE public.user_vlm_credentials ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own credentials
CREATE POLICY "Users can view own VLM credentials"
    ON public.user_vlm_credentials
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own credentials
CREATE POLICY "Users can insert own VLM credentials"
    ON public.user_vlm_credentials
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own credentials
CREATE POLICY "Users can update own VLM credentials"
    ON public.user_vlm_credentials
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own credentials
CREATE POLICY "Users can delete own VLM credentials"
    ON public.user_vlm_credentials
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_vlm_credentials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER trigger_update_user_vlm_credentials_updated_at
    BEFORE UPDATE ON public.user_vlm_credentials
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_vlm_credentials_updated_at();

-- Add comment to table
COMMENT ON TABLE public.user_vlm_credentials IS 'Stores encrypted VLM API keys for BYOK (Bring Your Own Key) architecture';
COMMENT ON COLUMN public.user_vlm_credentials.api_key_ciphertext IS 'AES-GCM encrypted API key';
COMMENT ON COLUMN public.user_vlm_credentials.nonce IS 'AES-GCM nonce for decryption';
COMMENT ON COLUMN public.user_vlm_credentials.salt IS 'Random salt used during encryption';
