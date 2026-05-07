-- RPC for Supabase admin dashboard: returns RLS policies for all public tables.
-- Called by superadmin/dashboard/supabase/page.tsx via service_role client.

CREATE OR REPLACE FUNCTION public.get_rls_policies()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'tablename',   p.tablename,
        'policyname',  p.policyname,
        'cmd',         p.cmd,
        'permissive',  p.permissive,
        'roles',       p.roles,
        'qual',        p.qual,
        'with_check',  p.with_check
      )
      ORDER BY p.tablename, p.policyname
    ),
    '[]'::jsonb
  )
  FROM pg_policies p
  WHERE p.schemaname = 'public';
$$;

REVOKE ALL ON FUNCTION public.get_rls_policies() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_rls_policies() TO service_role;

COMMENT ON FUNCTION public.get_rls_policies() IS
  'Returns all RLS policies in the public schema as JSONB. Used by the superadmin Supabase dashboard.';
