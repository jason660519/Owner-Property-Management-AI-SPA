-- Anthropic credit guard: low-balance alert + circuit breaker.
--
-- Tracks configured Anthropic credit budget vs. spend recorded in the app.
-- When remaining balance drops below alert_threshold_usd an alert can be fired.
-- When it drops below circuit_breaker_threshold_usd, new automated task
-- dispatch can be paused until credits are replenished.
--
-- Background: the 2026-04-13 outage (VIS-48) showed that Anthropic credit
-- exhaustion fails silently for hours. This table stores the guard state so
-- the check survives process restarts and rate-limits alert noise.
--
-- Singleton pattern: the unique index on (1=1) limits the table to one row.

CREATE TABLE IF NOT EXISTS anthropic_credit_guard (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Operator-configured total Anthropic credits purchased since tracking_start_at.
  -- Update this value after each credit top-up via POST /api/ai-billing/anthropic.
  total_credits_usd               NUMERIC(10,4) NOT NULL DEFAULT 50,

-- Track spend from this timestamp onwards.
  -- Reset alongside total_credits_usd when topping up.
  tracking_start_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Alert when remaining balance drops below this value (default $10).
  alert_threshold_usd             NUMERIC(10,4) NOT NULL DEFAULT 10,

  -- Trip circuit breaker (pause new dispatch) when remaining drops below
  -- this value (default $5).
  circuit_breaker_threshold_usd   NUMERIC(10,4) NOT NULL DEFAULT 5,

  -- Circuit breaker state.
  circuit_breaker_active          BOOLEAN NOT NULL DEFAULT FALSE,
  circuit_breaker_tripped_at      TIMESTAMPTZ,
  circuit_breaker_restored_at     TIMESTAMPTZ,

  -- Dedup: last time an alert was fired (prevents alert storms).
  last_alert_fired_at             TIMESTAMPTZ,

  -- Last time the guard cycle ran (used to rate-limit checks to every 5 min).
  last_balance_check_at           TIMESTAMPTZ,

  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Singleton: only one config row allowed.
CREATE UNIQUE INDEX IF NOT EXISTS anthropic_credit_guard_singleton_idx
  ON anthropic_credit_guard ((1=1));

-- Enable RLS.
ALTER TABLE anthropic_credit_guard ENABLE ROW LEVEL SECURITY;

-- Service role: full access for server-side operations.
CREATE POLICY "Service role full access on anthropic_credit_guard"
  ON anthropic_credit_guard FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users: read-only (for the dashboard).
CREATE POLICY "Authenticated users can read anthropic_credit_guard"
  ON anthropic_credit_guard FOR SELECT
  TO authenticated
  USING (true);

-- updated_at auto-maintenance (reuses the existing trigger function from dev_tasks).
CREATE TRIGGER trg_anthropic_credit_guard_updated_at
  BEFORE UPDATE ON anthropic_credit_guard
  FOR EACH ROW
  EXECUTE FUNCTION update_dev_tasks_updated_at();

-- Seed the default config row.
INSERT INTO anthropic_credit_guard (
  total_credits_usd,
  alert_threshold_usd,
  circuit_breaker_threshold_usd
) VALUES (50, 10, 5)
ON CONFLICT DO NOTHING;
