-- Migration: Create Bank Accounts Table with RLS
-- Date: 2026-04-13
-- Description: Landlord finance - bank account management (Row 050)
--   - bank_accounts table with pgcrypto encryption for account numbers
--   - RLS policies: only the account owner can read/write
--   - Supports multiple accounts per landlord with account purpose classification

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create bank_accounts table
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Bank identification
  bank_name TEXT NOT NULL,
  bsb_code TEXT, -- BSB (Bank State Branch) code used in AU banking

  -- Encrypted account number (stored via pgp_sym_encrypt)
  account_number_encrypted TEXT NOT NULL,

  -- Account metadata
  account_purpose TEXT NOT NULL DEFAULT 'rent_collection',
  -- rent_collection: for receiving rent payments
  -- maintenance_reserve: for maintenance/repair funds
  -- general: general purpose account
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,

  -- Open Banking integration (optional, populated when linked)
  open_banking_linked BOOLEAN NOT NULL DEFAULT FALSE,
  open_banking_account_id TEXT, -- external reference from Open Banking API
  cached_balance NUMERIC(12, 2), -- cached from Open Banking API; NULL if not linked
  balance_last_synced_at TIMESTAMP WITH TIME ZONE,

  -- Soft-delete / pending balance guard
  has_pending_payments BOOLEAN NOT NULL DEFAULT FALSE,
  -- set to TRUE by triggers/application logic when there are unsettled payments;
  -- deletion is blocked at the RLS / application level when this is TRUE

  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  CONSTRAINT bank_accounts_account_purpose_check CHECK (
    account_purpose IN ('rent_collection', 'maintenance_reserve', 'general')
  ),
  -- Only one primary account per user
  CONSTRAINT bank_accounts_one_primary_per_user EXCLUDE USING btree (user_id WITH =)
    WHERE (is_primary = TRUE)
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_is_primary ON public.bank_accounts(user_id, is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_purpose ON public.bank_accounts(user_id, account_purpose);

-- updated_at trigger (reuse existing function if present, else create it)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bank_accounts_updated_at
    BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: only the account owner (user_id) may access their records

-- SELECT: owner can read their own accounts
CREATE POLICY "bank_accounts_select_own"
  ON public.bank_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT: owner can create accounts for themselves only
CREATE POLICY "bank_accounts_insert_own"
  ON public.bank_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: owner can update their own accounts
CREATE POLICY "bank_accounts_update_own"
  ON public.bank_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: owner can delete their own accounts, but NOT when has_pending_payments = TRUE
CREATE POLICY "bank_accounts_delete_own"
  ON public.bank_accounts
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND has_pending_payments = FALSE
  );

-- Grant table permissions to authenticated role (RLS enforces row-level access)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;

-- Revoke from anon (no unauthenticated access)
REVOKE ALL ON public.bank_accounts FROM anon;
