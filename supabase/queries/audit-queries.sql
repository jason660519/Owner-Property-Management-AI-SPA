-- -----------------------------------------------------------------------------
-- @file audit-queries.sql
-- @description Supabase Auth & Permission Audit Script
-- @description Supabase 權限與認證稽核腳本
-- @created 2026-02-10
-- @creator Trae AI
-- @lastModified 2026-02-11
-- @modifiedBy Trae AI
-- @version 1.1
-- -----------------------------------------------------------------------------

-- 1. User Statistics
SELECT '--- User Statistics ---' as section;
SELECT 
    count(*) as total_users,
    count(CASE WHEN confirmed_at IS NOT NULL THEN 1 END) as verified_users,
    count(CASE WHEN confirmed_at IS NULL THEN 1 END) as unverified_users,
    round((count(CASE WHEN confirmed_at IS NOT NULL THEN 1 END)::numeric / count(*)) * 100, 2) as verified_percentage
FROM auth.users;

SELECT id, email, created_at, last_sign_in_at, 
       CASE WHEN confirmed_at IS NOT NULL THEN 'Verified' ELSE 'Unverified' END as status
FROM auth.users
ORDER BY created_at DESC;

-- 2. Role Analysis
SELECT '--- Role Analysis (From users_profile) ---' as section;
-- Unnest the roles array to count users per role
SELECT 
    r.role_name,
    count(u.id) as user_count
FROM public.users_profile u,
     unnest(u.roles) as r(role_name)
GROUP BY r.role_name
ORDER BY user_count DESC;

SELECT '--- Role Analysis (From IAM Roles) ---' as section;
SELECT name, description FROM public.iam_roles;

-- 3. Group Analysis
SELECT '--- IAM Groups ---' as section;
SELECT 
    g.name as group_name,
    g.description,
    count(m.user_id) as member_count
FROM public.iam_groups g
LEFT JOIN public.iam_group_members m ON g.id = m.group_id
GROUP BY g.id, g.name, g.description
ORDER BY member_count DESC;

SELECT '--- Group Role Mappings ---' as section;
SELECT 
    g.name as group_name,
    r.name as role_name
FROM public.iam_group_roles gr
JOIN public.iam_groups g ON gr.group_id = g.id
JOIN public.iam_roles r ON gr.role_id = r.id;

-- 4. Detailed Permission Matrix (RLS Policies)
SELECT '--- RLS Policies (Table Permissions) ---' as section;
SELECT 
    tablename,
    policyname,
    roles,
    cmd as operation,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- 5. Function Access List
SELECT '--- Custom Functions ---' as section;
SELECT 
    r.routine_name,
    r.data_type as return_type,
    p.prosecdef as is_security_definer,
    pg_get_function_arguments(p.oid) as arguments
FROM information_schema.routines r
JOIN pg_proc p ON r.routine_name = p.proname
WHERE r.routine_schema = 'public'
ORDER BY r.routine_name;

-- 6. Function Permissions (if any explicit grants)
SELECT '--- Function Grants ---' as section;
SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
ORDER BY routine_name, grantee;
