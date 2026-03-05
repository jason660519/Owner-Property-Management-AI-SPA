-- ==============================================================================
-- Allow public (anon) read access to published blog_posts
-- This enables the public blog pages to fetch published posts without auth.
-- ==============================================================================

CREATE POLICY "anon_read_published_blog_posts" ON public.blog_posts
    FOR SELECT
    TO anon
    USING (status = 'published');

CREATE POLICY "service_role_full_blog_posts" ON public.blog_posts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
