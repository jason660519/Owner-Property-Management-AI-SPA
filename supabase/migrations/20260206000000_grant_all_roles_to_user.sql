-- ======================================================================================
-- Grant All Roles to User
-- Date: 2026-02-06
-- Description: Grants all available roles (landlord, tenant, buyer, agent, service_provider, super_admin) 
--              to a specific user and ensures both auth.users and users_profile are updated correctly
-- ======================================================================================

DO $$
DECLARE
    target_user_id UUID := '18359312-1473-4acb-b223-187da0de52ce';
    user_exists BOOLEAN;
    profile_exists BOOLEAN;
    user_email TEXT;
BEGIN
    -- 1. 檢查用戶是否存在於 auth.users
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = target_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User with ID % does not exist in auth.users', target_user_id;
    END IF;
    
    -- 2. 取得用戶 email（用於顯示）
    SELECT email INTO user_email FROM auth.users WHERE id = target_user_id;
    
    -- 3. 檢查 users_profile 是否存在
    SELECT EXISTS(SELECT 1 FROM public.users_profile WHERE id = target_user_id) INTO profile_exists;
    
    -- 4. 如果 users_profile 不存在，先創建它
    IF NOT profile_exists THEN
        INSERT INTO public.users_profile (
            id,
            roles,
            primary_role,
            display_name,
            created_at,
            updated_at
        ) VALUES (
            target_user_id,
            ARRAY['landlord', 'tenant', 'buyer', 'agent', 'service_provider', 'super_admin']::text[],
            'super_admin',
            COALESCE((SELECT raw_user_meta_data->>'display_name' FROM auth.users WHERE id = target_user_id), '管理員'),
            NOW(),
            NOW()
        );
        RAISE NOTICE '✅ Created users_profile for user: % (ID: %)', user_email, target_user_id;
    ELSE
        -- 5. 如果已存在，更新所有角色
        UPDATE public.users_profile
        SET roles = ARRAY[
                'landlord',
                'tenant',
                'buyer',
                'agent',
                'service_provider',
                'super_admin'
            ]::text[],
            primary_role = 'super_admin',
            updated_at = NOW()
        WHERE id = target_user_id;
        RAISE NOTICE '✅ Updated users_profile roles for user: % (ID: %)', user_email, target_user_id;
    END IF;
    
    -- 6. 更新 auth.users 的 raw_user_meta_data，確保 role = 'super_admin'
    UPDATE auth.users
    SET raw_user_meta_data = 
        COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object(
            'role', 'super_admin',
            'display_name', COALESCE(raw_user_meta_data->>'display_name', '管理員')
        ),
        updated_at = NOW()
    WHERE id = target_user_id;
    
    RAISE NOTICE '✅ Updated auth.users.raw_user_meta_data.role to super_admin for user: % (ID: %)', user_email, target_user_id;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 Successfully granted all roles to user: %', user_email;
    RAISE NOTICE '   Roles: landlord, tenant, buyer, agent, service_provider, super_admin';
    RAISE NOTICE '   Primary role: super_admin';
    
END $$;

-- ======================================================================================
-- 驗證更新結果
-- ======================================================================================
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
