-- ======================================================================================
-- Migration: Multi-Role Support for Users
-- Date: 2026-02-02
-- Description: Add support for multiple roles per user and role switching functionality
-- ======================================================================================

-- 1. 修改 users_profile 表以支持多角色
ALTER TABLE public.users_profile 
DROP COLUMN IF EXISTS role,
ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT ARRAY['landlord']::TEXT[],
ADD COLUMN IF NOT EXISTS primary_role TEXT NOT NULL DEFAULT 'landlord',
ADD COLUMN IF NOT EXISTS role_preferences JSONB DEFAULT '{}';

-- 2. 更新現有資料
UPDATE public.users_profile 
SET roles = ARRAY[role]::TEXT[], 
    primary_role = role
WHERE roles IS NULL OR primary_role IS NULL;

-- 3. 創建角色切換函數
CREATE OR REPLACE FUNCTION public.switch_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- 檢查角色是否存在於用戶的角色列表中
    IF EXISTS (
        SELECT 1 
        FROM public.users_profile 
        WHERE id = user_id AND new_role = ANY(roles)
    ) THEN
        -- 更新主要角色
        UPDATE public.users_profile 
        SET primary_role = new_role,
            updated_at = NOW()
        WHERE id = user_id;
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 創建角色管理函數
CREATE OR REPLACE FUNCTION public.add_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- 添加新角色到角色數組（避免重複）
    UPDATE public.users_profile 
    SET roles = ARRAY(SELECT DISTINCT UNNEST(roles || ARRAY[new_role])),
        updated_at = NOW()
    WHERE id = user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 更新 RLS 策略以支持多角色
COMMENT ON TABLE public.users_profile IS '用戶資料表，支持多角色功能';

-- 6. 創建索引以優化角色查詢
CREATE INDEX IF NOT EXISTS idx_users_profile_roles ON public.users_profile USING GIN (roles);
CREATE INDEX IF NOT EXISTS idx_users_profile_primary_role ON public.users_profile (primary_role);

-- 7. 插入測試資料（可選）
-- INSERT INTO public.users_profile (id, roles, primary_role) 
-- VALUES ('00000000-0000-0000-0000-000000000001', ARRAY['landlord', 'tenant', 'buyer'], 'landlord');

-- ======================================================================================
-- 遷移完成確認
-- ======================================================================================
DO $$
BEGIN
    RAISE NOTICE '多角色支持遷移已完成：';
    RAISE NOTICE '  - 更新 users_profile 表結構';
    RAISE NOTICE '  - 創建角色切換函數 switch_user_role()';
    RAISE NOTICE '  - 創建角色添加函數 add_user_role()';
    RAISE NOTICE '  - 建立角色查詢索引';
END $$;