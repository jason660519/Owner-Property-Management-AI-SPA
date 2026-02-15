-- ==============================================================================
-- Assign test user to multiple IAM groups (landlord + super_admin)
-- Date: 2026-02-16
-- Description: Portal 角色來源為 IAM (get_user_roles)，測試帳號需加入群組才會顯示多角色。
--              將 a0405142777@gmail.com 加入 Standard Landlords 與 Administrators，
--              使 portal 顯示「房東」與「超級管理員」。
-- ==============================================================================

DO $$
DECLARE
    test_user_id UUID;
    grp_landlords_id UUID;
    grp_admins_id UUID;
BEGIN
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'a0405142777@gmail.com' LIMIT 1;
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'assign_test_user_multi_role_iam: 未找到 a0405142777@gmail.com，略過';
        RETURN;
    END IF;

    SELECT id INTO grp_landlords_id FROM public.iam_groups WHERE name = 'Standard Landlords' LIMIT 1;
    SELECT id INTO grp_admins_id   FROM public.iam_groups WHERE name = 'Administrators' LIMIT 1;

    IF grp_landlords_id IS NOT NULL THEN
        INSERT INTO public.iam_group_members (group_id, user_id)
        VALUES (grp_landlords_id, test_user_id)
        ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;
    IF grp_admins_id IS NOT NULL THEN
        INSERT INTO public.iam_group_members (group_id, user_id)
        VALUES (grp_admins_id, test_user_id)
        ON CONFLICT (group_id, user_id) DO NOTHING;
    END IF;

    -- Trigger sync_profile_on_iam_group_members_change 會把 users_profile.roles 更新為 IAM 結果
    PERFORM public.sync_profile_roles_from_iam(test_user_id);

    RAISE NOTICE 'assign_test_user_multi_role_iam: 已將測試用戶加入 Standard Landlords + Administrators';
END $$;
