-- Add user_integrations table for storing third-party platform credentials
-- Supports: Google Blogger (OAuth2), Facebook Pages (Page Access Token)

CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('google_blogger', 'facebook_pages')),

  -- Google Blogger OAuth2 fields
  google_access_token  text,
  google_refresh_token text,
  google_token_expires_at timestamptz,
  google_blog_id   text,
  google_blog_url  text,
  google_blog_name text,

  -- Facebook Pages fields
  facebook_page_id    text,
  facebook_page_name  text,
  facebook_page_token text,
  facebook_token_expires_at timestamptz,

  -- Common
  is_connected boolean NOT NULL DEFAULT false,
  connected_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (user_id, platform)
);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Superadmin service_role bypasses RLS; authenticated users can only see their own row
CREATE POLICY "users_own_integrations" ON user_integrations
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Track external post IDs so we know what was published where
CREATE TABLE IF NOT EXISTS blog_platform_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  platform     text NOT NULL CHECK (platform IN ('google_blogger', 'facebook_pages')),
  external_id  text NOT NULL,   -- Blogger post ID or Facebook post ID
  external_url text,
  status       text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft', 'deleted')),
  published_at timestamptz DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  UNIQUE (blog_post_id, platform)
);

ALTER TABLE blog_platform_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_platform_posts" ON blog_platform_posts
  FOR ALL USING (true) WITH CHECK (true);
