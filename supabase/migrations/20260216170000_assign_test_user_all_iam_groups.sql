-- ==============================================================================
-- Assign test user to ALL IAM groups (so Portal shows all role cards)
-- Date: 2026-02-16
-- Description: 測試帳號 a0405142777@gmail.com 加入所有群組，Portal 會顯示所有對應角色卡。
-- ==============================================================================

DO $$
DECLARE
    test_user_id UUID;
    grp RECORD;
BEGIN
    SELECT id INTO test_user_id FROM auth.users WHERE email = 'a0405142777@gmail.com' LIMIT 1;
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'assign_test_user_all_iam_groups: 未找到 a0405142777@gmail.com，略過';
        RETURN;
    END IF;

    FOR grp IN SELECT id FROM public.iam_groups
    LOOP
        INSERT INTO public.iam_group_members (group_id, user_id)
        VALUES (grp.id, test_user_id)
        ON CONFLICT (group_id, user_id) DO NOTHING;
    END LOOP;

    PERFORM public.sync_profile_roles_from_iam(test_user_id);
    RAISE NOTICE 'assign_test_user_all_iam_groups: 已將測試用戶加入所有 IAM 群組';
END $$;
