-- ==============================================================================
-- Security Hardening Script: Fix RPC Permissions
-- Description: Revoke public access to sensitive functions (Least Privilege)
-- ==============================================================================

-- 1. Revoke access from PUBLIC (Anonymous + Authenticated) for sensitive functions
REVOKE EXECUTE ON FUNCTION public.add_user_role(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.add_user_role(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_user_role(uuid, text) FROM authenticated;

-- 2. Grant access ONLY to service_role (Backend/Admin API)
-- This ensures only your server-side code (using service key) can call this.
GRANT EXECUTE ON FUNCTION public.add_user_role(uuid, text) TO service_role;
