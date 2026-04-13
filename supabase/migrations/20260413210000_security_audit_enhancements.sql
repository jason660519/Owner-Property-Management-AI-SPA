-- Migration: security_audit_enhancements
-- Purpose: Enhance security features for 超級管理員-網路安全－隱私審計管理功能
--          1. IP whitelist table + RPC
--          2. ssl_certificates monitoring table
--          3. login_anomalies table + detection function
--          4. Enhance audit_logs with additional security fields (ALTER, safe)
-- Created: 2026-04-13

-- ==============================================================================
-- 1. IP Whitelist table (paired with existing superadmin_blacklist)
--    When the whitelist is non-empty, only whitelisted IPs are allowed.
--    When the whitelist is empty, all IPs are allowed (unless blacklisted).
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_value    TEXT NOT NULL,          -- IP address or CIDR range (e.g. 192.168.1.0/24)
    label       TEXT,                  -- Human-readable label (e.g. "Office network")
    created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unique_ip_whitelist_value ON public.ip_whitelist(ip_value);
CREATE INDEX IF NOT EXISTS idx_ip_whitelist_created ON public.ip_whitelist(created_at DESC);

ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role only for ip_whitelist" ON public.ip_whitelist;
CREATE POLICY "Service role only for ip_whitelist"
    ON public.ip_whitelist
    FOR ALL
    USING ((auth.jwt() ->> 'role') = 'service_role')
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

COMMENT ON TABLE public.ip_whitelist IS
  'IP whitelist for superadmin. When non-empty, only listed IPs/CIDRs may access superadmin routes.';

-- RPC: check if an IP is allowed (whitelist-aware)
CREATE OR REPLACE FUNCTION public.check_ip_whitelist(p_ip TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    whitelist_count INTEGER;
BEGIN
    -- If whitelist is empty, all IPs pass (blacklist is checked separately)
    SELECT COUNT(*) INTO whitelist_count FROM public.ip_whitelist;
    IF whitelist_count = 0 THEN
        RETURN TRUE;
    END IF;

    -- Check each whitelist entry
    FOR r IN SELECT ip_value FROM public.ip_whitelist LOOP
        BEGIN
            IF r.ip_value LIKE '%/%' THEN
                IF p_ip::INET << r.ip_value::INET THEN
                    RETURN TRUE;
                END IF;
            ELSE
                IF r.ip_value = p_ip THEN
                    RETURN TRUE;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Skip invalid entries
        END;
    END LOOP;

    RETURN FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_ip_whitelist(TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_ip_whitelist(TEXT) TO service_role;

COMMENT ON FUNCTION public.check_ip_whitelist IS
  'Returns true if IP is in the whitelist (or whitelist is empty). Used by superadmin middleware.';

-- ==============================================================================
-- 2. SSL Certificates monitoring table
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.ssl_certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain          TEXT NOT NULL UNIQUE,
    subject         TEXT,
    issuer          TEXT,
    valid_from      TIMESTAMPTZ,
    valid_until     TIMESTAMPTZ,
    days_remaining  INTEGER GENERATED ALWAYS AS (
                      EXTRACT(DAY FROM (valid_until - NOW()))::INTEGER
                    ) STORED,
    status          TEXT NOT NULL DEFAULT 'unknown'
                      CHECK (status IN ('valid', 'expiring_soon', 'expired', 'error', 'unknown')),
    error_message   TEXT,
    last_checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ssl_certificates_status ON public.ssl_certificates(status);
CREATE INDEX IF NOT EXISTS idx_ssl_certificates_valid_until ON public.ssl_certificates(valid_until);

ALTER TABLE public.ssl_certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin full access ssl_certificates" ON public.ssl_certificates;
CREATE POLICY "Super admin full access ssl_certificates"
    ON public.ssl_certificates
    FOR ALL
    USING ((auth.jwt() ->> 'role') = 'service_role')
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

COMMENT ON TABLE public.ssl_certificates IS
  'SSL certificate expiry monitoring. Updated by cron job. Alerts when days_remaining < 30.';

-- ==============================================================================
-- 3. Login anomalies table + detection function
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.login_anomalies (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email           TEXT,
    ip_address      TEXT,
    user_agent      TEXT,
    anomaly_type    TEXT NOT NULL CHECK (anomaly_type IN (
                      'brute_force',       -- Multiple failed attempts
                      'impossible_travel', -- Login from distant location in short time
                      'new_device',        -- First-seen user agent
                      'off_hours',         -- Login outside business hours
                      'blacklisted_ip',    -- Login from known bad IP
                      'multiple_sessions'  -- Too many concurrent sessions
                    )),
    severity        TEXT NOT NULL DEFAULT 'medium'
                      CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details         JSONB NOT NULL DEFAULT '{}',
    is_resolved     BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_anomalies_user ON public.login_anomalies(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_anomalies_severity ON public.login_anomalies(severity, is_resolved);
CREATE INDEX IF NOT EXISTS idx_login_anomalies_created ON public.login_anomalies(created_at DESC);

ALTER TABLE public.login_anomalies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access login_anomalies" ON public.login_anomalies;
CREATE POLICY "Service role full access login_anomalies"
    ON public.login_anomalies
    FOR ALL
    USING ((auth.jwt() ->> 'role') = 'service_role')
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

COMMENT ON TABLE public.login_anomalies IS
  'Detected login anomalies. Populated by detect_login_anomalies() or superadmin auth hook.';

-- Function: detect brute-force attempts (≥5 failed logins in 10 minutes for same email)
CREATE OR REPLACE FUNCTION public.detect_login_anomalies()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count INTEGER := 0;
    r RECORD;
BEGIN
    -- Brute-force: emails with 5+ failed auth.audit_log_entries in last 10 min
    FOR r IN
        SELECT
            payload->>'email' AS email,
            COUNT(*) AS attempt_count,
            MAX(created_at) AS last_attempt,
            (array_agg(ip_address ORDER BY created_at DESC))[1] AS last_ip
        FROM auth.audit_log_entries
        WHERE
            payload->>'action' IN ('login', 'token_refresh_denied')
            AND payload->>'status' IN ('error', 'failed')
            AND created_at > NOW() - INTERVAL '10 minutes'
        GROUP BY payload->>'email'
        HAVING COUNT(*) >= 5
    LOOP
        -- Avoid duplicate anomalies within same detection window
        IF NOT EXISTS (
            SELECT 1 FROM public.login_anomalies
            WHERE
                email = r.email
                AND anomaly_type = 'brute_force'
                AND created_at > NOW() - INTERVAL '10 minutes'
        ) THEN
            INSERT INTO public.login_anomalies (email, ip_address, anomaly_type, severity, details)
            VALUES (
                r.email,
                r.last_ip,
                'brute_force',
                CASE WHEN r.attempt_count >= 10 THEN 'critical' WHEN r.attempt_count >= 7 THEN 'high' ELSE 'medium' END,
                jsonb_build_object(
                    'attempt_count', r.attempt_count,
                    'last_attempt', r.last_attempt,
                    'window_minutes', 10
                )
            );
            v_count := v_count + 1;
        END IF;
    END LOOP;

    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.detect_login_anomalies() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_login_anomalies() TO service_role;

COMMENT ON FUNCTION public.detect_login_anomalies IS
  'Scans auth.audit_log_entries for brute-force patterns and inserts into login_anomalies. Returns count inserted.';

-- ==============================================================================
-- 4. Add missing columns to audit_logs (safe ALTER with IF NOT EXISTS guard)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_logs'
          AND column_name = 'severity'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN severity TEXT DEFAULT 'info'
            CHECK (severity IN ('info', 'warning', 'error', 'critical'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_logs'
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN status TEXT DEFAULT 'success'
            CHECK (status IN ('success', 'failed', 'blocked'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'audit_logs'
          AND column_name = 'session_id'
    ) THEN
        ALTER TABLE public.audit_logs ADD COLUMN session_id TEXT;
    END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created
    ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity
    ON public.audit_logs(severity) WHERE severity IN ('warning', 'error', 'critical');
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON public.audit_logs(created_at DESC);

-- Convenience view: recent security-relevant audit events
CREATE OR REPLACE VIEW public.security_audit_summary AS
SELECT
    date_trunc('hour', created_at) AS hour,
    COUNT(*)                        AS total_events,
    COUNT(*) FILTER (WHERE status = 'failed')   AS failed_events,
    COUNT(*) FILTER (WHERE status = 'blocked')  AS blocked_events,
    COUNT(*) FILTER (WHERE severity IN ('warning', 'error', 'critical')) AS high_severity
FROM public.audit_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW public.security_audit_summary IS
  'Hourly aggregation of audit_logs for the security dashboard (last 7 days).';
