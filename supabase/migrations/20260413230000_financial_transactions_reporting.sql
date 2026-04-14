-- Migration: Financial Transactions Reporting Views & Functions
-- Date: 2026-04-13
-- Description: Row 051 - Add reporting views/functions for 房東財務 收支明細儀表板
--   - Add bank_account_id FK column to financial_transactions (references Row 050)
--   - Monthly income/expense summary view
--   - Per-property monthly income/expense view
--   - Semi-annual (6-month) aggregated view
--   - RPC function for custom date-range reports with outlier detection

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add bank_account_id to financial_transactions (link to Row 050)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS bank_account_id UUID
    REFERENCES public.bank_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_financial_transactions_bank_account_id
  ON public.financial_transactions(bank_account_id)
  WHERE bank_account_id IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Monthly income/expense summary view (per user, per month)
-- ─────────────────────────────────────────────────────────────────────────────
-- RLS is enforced via security_invoker so the view inherits the caller's policies.
CREATE OR REPLACE VIEW public.v_monthly_income_expense
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  DATE_TRUNC('month', transaction_date)::DATE AS month,
  SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END) AS net_amount,
  COUNT(*) AS transaction_count
FROM public.financial_transactions
GROUP BY user_id, DATE_TRUNC('month', transaction_date);

COMMENT ON VIEW public.v_monthly_income_expense IS
  'Monthly income and expense totals per landlord. Inherits RLS from financial_transactions.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Monthly income/expense per property view
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_monthly_property_income_expense
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  property_id,
  DATE_TRUNC('month', transaction_date)::DATE AS month,
  SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END) AS net_amount,
  COUNT(*) AS transaction_count
FROM public.financial_transactions
GROUP BY user_id, property_id, DATE_TRUNC('month', transaction_date);

COMMENT ON VIEW public.v_monthly_property_income_expense IS
  'Monthly income and expense totals per landlord per property. Inherits RLS from financial_transactions.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Semi-annual (last 6 months) summary view
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_semiannual_income_expense
  WITH (security_invoker = true)
AS
SELECT
  user_id,
  property_id,
  DATE_TRUNC('month', transaction_date)::DATE AS month,
  SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS total_income,
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS total_expense,
  SUM(CASE WHEN type = 'income'  THEN amount ELSE -amount END) AS net_amount,
  COUNT(*) AS transaction_count
FROM public.financial_transactions
WHERE transaction_date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
GROUP BY user_id, property_id, DATE_TRUNC('month', transaction_date);

COMMENT ON VIEW public.v_semiannual_income_expense IS
  'Income and expense totals for the current and prior 5 months (6-month window) per property. Inherits RLS.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RPC: date-range income/expense report with outlier detection
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns all transactions in a date range for the calling user, annotated with
-- an is_outlier flag (amount > mean + 2·stddev for that transaction type).
CREATE OR REPLACE FUNCTION public.get_financial_report(
  p_start_date DATE DEFAULT DATE_TRUNC('month', NOW())::DATE,
  p_end_date   DATE DEFAULT NOW()::DATE,
  p_property_id UUID DEFAULT NULL,
  p_type        TEXT DEFAULT NULL   -- 'income' | 'expense' | NULL = both
)
RETURNS TABLE (
  id                UUID,
  property_id       UUID,
  bank_account_id   UUID,
  type              TEXT,
  amount            NUMERIC(12, 2),
  description       TEXT,
  transaction_date  DATE,
  created_at        TIMESTAMPTZ,
  is_outlier        BOOLEAN
)
LANGUAGE plpgsql
SECURITY INVOKER   -- RLS on financial_transactions applies automatically
STABLE
AS $$
DECLARE
  v_income_mean  NUMERIC;
  v_income_sd    NUMERIC;
  v_expense_mean NUMERIC;
  v_expense_sd   NUMERIC;
BEGIN
  -- Compute stats for the calling user within the requested window (for outlier detection)
  SELECT
    AVG(amount) FILTER (WHERE ft.type = 'income'),
    STDDEV_POP(amount) FILTER (WHERE ft.type = 'income'),
    AVG(amount) FILTER (WHERE ft.type = 'expense'),
    STDDEV_POP(amount) FILTER (WHERE ft.type = 'expense')
  INTO v_income_mean, v_income_sd, v_expense_mean, v_expense_sd
  FROM public.financial_transactions ft
  WHERE ft.user_id = auth.uid()
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND (p_property_id IS NULL OR ft.property_id = p_property_id)
    AND (p_type IS NULL OR ft.type = p_type);

  -- Default stddev to 0 when there are no rows (avoids NULL comparisons)
  v_income_sd  := COALESCE(v_income_sd,  0);
  v_expense_sd := COALESCE(v_expense_sd, 0);

  RETURN QUERY
  SELECT
    ft.id,
    ft.property_id,
    ft.bank_account_id,
    ft.type,
    ft.amount,
    ft.description,
    ft.transaction_date,
    ft.created_at,
    CASE
      WHEN ft.type = 'income'  AND v_income_sd  > 0
           THEN ft.amount > (v_income_mean  + 2 * v_income_sd)
      WHEN ft.type = 'expense' AND v_expense_sd > 0
           THEN ft.amount > (v_expense_mean + 2 * v_expense_sd)
      ELSE FALSE
    END AS is_outlier
  FROM public.financial_transactions ft
  WHERE ft.user_id = auth.uid()
    AND ft.transaction_date BETWEEN p_start_date AND p_end_date
    AND (p_property_id IS NULL OR ft.property_id = p_property_id)
    AND (p_type IS NULL OR ft.type = p_type)
  ORDER BY ft.transaction_date DESC;
END;
$$;

COMMENT ON FUNCTION public.get_financial_report IS
  'Returns filtered financial transactions for the authenticated user with outlier (異常金額) annotation. '
  'Outlier = amount > mean + 2·stddev for the same transaction type within the requested window.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Grant execute on the RPC to authenticated role
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.get_financial_report(DATE, DATE, UUID, TEXT) TO authenticated;

-- Revoke from anon
REVOKE EXECUTE ON FUNCTION public.get_financial_report(DATE, DATE, UUID, TEXT) FROM anon;

-- Grant SELECT on reporting views to authenticated role (RLS enforced via security_invoker)
GRANT SELECT ON public.v_monthly_income_expense TO authenticated;
GRANT SELECT ON public.v_monthly_property_income_expense TO authenticated;
GRANT SELECT ON public.v_semiannual_income_expense TO authenticated;

REVOKE ALL ON public.v_monthly_income_expense FROM anon;
REVOKE ALL ON public.v_monthly_property_income_expense FROM anon;
REVOKE ALL ON public.v_semiannual_income_expense FROM anon;
