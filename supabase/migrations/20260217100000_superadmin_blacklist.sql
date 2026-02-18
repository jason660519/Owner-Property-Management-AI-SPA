-- filepath: supabase/migrations/20260217100000_superadmin_blacklist.sql
-- description: Blacklist table and RPC for blocking IPs / User-Agents (hackers, crawlers)
-- created: 2026-02-17

-- ==============================================================================
-- superadmin_blacklist: IP 或 User-Agent 黑名單，僅 service_role 可存取
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.superadmin_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('ip', 'user_agent')),
    value TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_superadmin_blacklist_type ON public.superadmin_blacklist(type);
CREATE UNIQUE INDEX IF NOT EXISTS unique_blacklist_type_value ON public.superadmin_blacklist(type, value);

ALTER TABLE public.superadmin_blacklist ENABLE ROW LEVEL SECURITY;

-- 僅 service_role 可讀寫（middleware 與後台 API 使用 service role）
DROP POLICY IF EXISTS "Service role only for superadmin_blacklist" ON public.superadmin_blacklist;
CREATE POLICY "Service role only for superadmin_blacklist"
    ON public.superadmin_blacklist
    FOR ALL
    USING ((auth.jwt() ->> 'role') = 'service_role')
    WITH CHECK ((auth.jwt() ->> 'role') = 'service_role');

COMMENT ON TABLE public.superadmin_blacklist IS 'IP or User-Agent blacklist for superadmin; blocks hackers and crawlers. Service role only.';

-- ==============================================================================
-- RPC: 供 middleware 呼叫，傳入 IP 與 User-Agent 回傳是否被封鎖
-- 支援：IP 完全比對、CIDR（如 192.168.0.0/24）、User-Agent 子字串
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_superadmin_blacklist(
    p_ip TEXT,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    ip_inet INET;
BEGIN
    -- IP 黑名單：完全比對或 CIDR
    FOR r IN
        SELECT value FROM public.superadmin_blacklist WHERE type = 'ip'
    LOOP
        BEGIN
            IF r.value LIKE '%/%' THEN
                -- CIDR
                IF p_ip::INET << r.value::INET THEN
                    RETURN TRUE;
                END IF;
            ELSE
                -- 完全比對
                IF r.value = p_ip THEN
                    RETURN TRUE;
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- 無效 IP 或 CIDR 格式則略過該筆
            NULL;
        END;
    END LOOP;

    -- User-Agent 黑名單：子字串包含
    IF p_user_agent IS NOT NULL AND p_user_agent <> '' THEN
        FOR r IN
            SELECT value FROM public.superadmin_blacklist WHERE type = 'user_agent'
        LOOP
            IF p_user_agent ILIKE '%' || r.value || '%' THEN
                RETURN TRUE;
            END IF;
        END LOOP;
    END IF;

    RETURN FALSE;
END;
$$;

-- RPC 僅允許 service_role 執行（middleware 使用 service role 呼叫）
REVOKE EXECUTE ON FUNCTION public.check_superadmin_blacklist(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_superadmin_blacklist(TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.check_superadmin_blacklist IS 'Returns true if IP or User-Agent is blacklisted. Used by superadmin middleware.';
