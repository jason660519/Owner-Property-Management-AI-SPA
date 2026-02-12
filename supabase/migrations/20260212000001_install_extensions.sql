-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Enable pg_net for network requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Enable pg_jieba for Chinese full-text search
-- NOTE: pg_jieba is currently not available in the local Supabase PostgreSQL 17 image.
-- We are commenting it out to prevent migration failures.
-- If you need Chinese search, consider using pg_trgm (standard) or pgroonga (if available).
-- CREATE EXTENSION IF NOT EXISTS pg_jieba WITH SCHEMA extensions;
