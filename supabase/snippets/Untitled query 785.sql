SELECT 
    u.id,
    u.email,
    u.raw_user_meta_data->>'role' as auth_role,
    u.raw_user_meta_data->>'display_name' as display_name,
    up.roles as profile_roles,
    up.primary_role as primary_role
FROM auth.users u
LEFT JOIN public.users_profile up ON u.id = up.id
WHERE u.id = '18359312-1473-4acb-b223-187da0de52ce';