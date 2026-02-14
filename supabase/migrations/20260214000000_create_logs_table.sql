-- Create logs table for Serverless-compatible logging
-- Replaces file-based Winston logging with database logging

-- Create logs table
CREATE TABLE IF NOT EXISTS public.logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL DEFAULT 'anonymous',
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    service TEXT DEFAULT 'web-app',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_logs_user_id ON public.logs(user_id);
CREATE INDEX idx_logs_level ON public.logs(level);
CREATE INDEX idx_logs_created_at ON public.logs(created_at DESC);
CREATE INDEX idx_logs_service ON public.logs(service);

-- GIN index for JSONB metadata queries
CREATE INDEX idx_logs_metadata ON public.logs USING GIN(metadata);

-- Enable Row Level Security (RLS)
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated admins can view all logs
CREATE POLICY "Admins can view all logs"
    ON public.logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Policy: Users can view their own logs
CREATE POLICY "Users can view their own logs"
    ON public.logs
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()::text
    );

-- Policy: Service role can insert logs (for server-side logging)
CREATE POLICY "Service role can insert logs"
    ON public.logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Policy: Admins can delete old logs (for maintenance)
CREATE POLICY "Admins can delete logs"
    ON public.logs
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

-- Grant necessary permissions
GRANT SELECT ON public.logs TO authenticated;
GRANT INSERT ON public.logs TO service_role;
GRANT DELETE ON public.logs TO authenticated;

-- Create function to automatically clean up old logs (optional retention policy)
CREATE OR REPLACE FUNCTION public.cleanup_old_logs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.logs
    WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Comment on table and columns for documentation
COMMENT ON TABLE public.logs IS 'Application logs stored in database for Serverless compatibility';
COMMENT ON COLUMN public.logs.user_id IS 'User ID or "anonymous" for system logs';
COMMENT ON COLUMN public.logs.level IS 'Log level: info, warn, error, debug';
COMMENT ON COLUMN public.logs.message IS 'Log message';
COMMENT ON COLUMN public.logs.metadata IS 'Additional context as JSON';
COMMENT ON COLUMN public.logs.service IS 'Service name (e.g., web-app, api)';
COMMENT ON FUNCTION public.cleanup_old_logs IS 'Delete logs older than specified days (default: 90 days)';

-- Create scheduled job to cleanup old logs (using pg_cron if available)
-- Note: This requires pg_cron extension, which may not be available in all Supabase plans
-- Uncomment if pg_cron is available:
/*
SELECT cron.schedule(
    'cleanup-old-logs',
    '0 2 * * 0', -- Run every Sunday at 2 AM
    $$SELECT public.cleanup_old_logs(90);$$
);
*/
