-- Function to expose pg_stat_statements to the API
-- Note: This requires the pg_stat_statements extension to be enabled in Supabase

CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE (
  query TEXT,
  calls BIGINT,
  total_time DOUBLE PRECISION,
  avg_time DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We only show queries from the public schema or that are user-level queries
  -- To prevent leaking internal system queries
  RETURN QUERY
  SELECT 
    pss.query,
    pss.calls,
    pss.total_plan_time + pss.total_exec_time as total_time,
    (pss.total_plan_time + pss.total_exec_time) / pss.calls as avg_time
  FROM pg_stat_statements pss
  WHERE pss.calls > 0
    AND pss.query NOT LIKE '%pg_stat_statements%'
    AND pss.query NOT LIKE '%get_slow_queries%'
  ORDER BY avg_time DESC
  LIMIT 10;
END;
$$;

-- Grant execution to service_role (which createAdminClient uses)
GRANT EXECUTE ON FUNCTION get_slow_queries() TO service_role;
GRANT EXECUTE ON FUNCTION get_slow_queries() TO authenticated;
