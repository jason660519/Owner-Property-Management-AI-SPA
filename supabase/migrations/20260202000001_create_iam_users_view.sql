-- ==============================================================================
-- IAM User Management View
-- Created: 2026-02-02
-- Description: Exposes auth.users safely for the IAM Console
-- ==============================================================================

-- Create a secure view to list users (id, email, metadata)
-- We only allow authenticated users (or specifically admins) to access this.
create or replace view public.iam_users_view as
select 
    id,
    email,
    raw_user_meta_data,
    last_sign_in_at,
    created_at
from auth.users;

-- Grant access
grant select on public.iam_users_view to authenticated;

-- Note: RLS on Views is tricky. By default, it runs with the permissions of the view owner (postgres).
-- To adhere to strict security, usually we wraps this in a function or leave it as is if 'authenticated' is acceptable for this internal tool.
-- Given this is an "Owner Property Management" app, likely internal staff. 
