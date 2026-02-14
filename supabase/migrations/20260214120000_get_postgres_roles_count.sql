-- ==============================================================================
-- RPC: get_postgres_roles_count
-- Description: Returns the number of roles in PostgreSQL (pg_roles) for IAM audit.
-- Used by Superadmin IAM Audit dashboard to show "Postgres 預定義角色數".
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_postgres_roles_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog
STABLE
AS $$
  SELECT count(*)::bigint FROM pg_roles;
$$;

COMMENT ON FUNCTION public.get_postgres_roles_count() IS 'Returns count of all PostgreSQL roles (pg_roles) for IAM audit display.';

-- Only service_role (backend/API) can call this
REVOKE EXECUTE ON FUNCTION public.get_postgres_roles_count() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_postgres_roles_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_postgres_roles_count() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_postgres_roles_count() TO service_role;
