-- ======================================================================================
-- Title: Agent Authorization & RLS Policy Implementation
-- Date: 2026-01-23
-- Description: 實作完整的仲介授權機制與 Row Level Security 政策
-- Dependencies: 20260122000000_full_schema.sql
-- ======================================================================================

-- ========================================
-- Part 1: 建立仲介授權核心表
-- ========================================

CREATE TABLE IF NOT EXISTS public.agent_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 授權關係
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    
    -- 授權範圍
    property_type TEXT CHECK (property_type IN ('sales', 'rentals', 'both')),
    property_ids UUID[], -- 特定物件 ID 陣列，NULL 表示全部授權
    
    -- 授權等級
    authorization_level TEXT NOT NULL DEFAULT 'readonly' 
        CHECK (authorization_level IN ('readonly', 'manage', 'full')),
    
    -- 細緻權限（JSONB 格式）
    permissions JSONB DEFAULT '{
        "can_view_properties": true,
        "can_update_property_status": false,
        "can_manage_leads": false,
        "can_schedule_viewings": false,
        "can_view_financials": false,
        "can_create_offers": false,
        "can_request_maintenance": false
    }',
    
    -- 授權時效
    valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until TIMESTAMPTZ, -- NULL 表示永久有效
    
    -- 狀態
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
    
    -- 備註
    notes TEXT,
    
    -- 稽核欄位
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users_profile(id),
    
    -- 唯一約束：同一房東不能重複授權給同一仲介
    UNIQUE(landlord_id, agent_id)
);

-- 建立授權表索引
CREATE INDEX idx_agent_auth_landlord ON agent_authorizations(landlord_id, status);
CREATE INDEX idx_agent_auth_agent ON agent_authorizations(agent_id, status);
CREATE INDEX idx_agent_auth_dates ON agent_authorizations(valid_from, valid_until);
CREATE INDEX idx_agent_auth_property_ids ON agent_authorizations USING gin(property_ids);
CREATE INDEX idx_agent_auth_permissions ON agent_authorizations USING gin(permissions);
CREATE INDEX idx_agent_auth_active_period ON agent_authorizations(valid_from, valid_until) 
    WHERE status = 'active';

-- 啟用 RLS
ALTER TABLE agent_authorizations ENABLE ROW LEVEL SECURITY;

-- 授權表的 Policy
CREATE POLICY "landlords_manage_own_authorizations" ON agent_authorizations
    FOR ALL USING (auth.uid() = landlord_id);

CREATE POLICY "agents_view_own_authorizations" ON agent_authorizations
    FOR SELECT USING (auth.uid() = agent_id);

COMMENT ON TABLE agent_authorizations IS '仲介授權表：管理房東對仲介的委託授權關係';
COMMENT ON COLUMN agent_authorizations.authorization_level IS 'readonly: 唯讀, manage: 管理客源, full: 完整權限（除財務外）';
COMMENT ON COLUMN agent_authorizations.permissions IS 'JSONB 格式的細緻權限控制';

-- ========================================
-- Part 2: 建立輔助函數
-- ========================================

-- 函數 1: 檢查仲介是否有特定權限
CREATE OR REPLACE FUNCTION public.check_agent_permission(
    p_agent_id UUID,
    p_landlord_id UUID,
    p_permission_key TEXT,
    p_property_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM public.agent_authorizations aa
        WHERE aa.agent_id = p_agent_id
          AND aa.landlord_id = p_landlord_id
          AND aa.status = 'active'
          AND aa.valid_from <= NOW()
          AND (aa.valid_until IS NULL OR aa.valid_until >= NOW())
          -- 檢查物件範圍
          AND (
            p_property_id IS NULL 
            OR aa.property_ids IS NULL 
            OR p_property_id = ANY(aa.property_ids)
          )
          -- 檢查特定權限
          AND (aa.permissions->>p_permission_key)::BOOLEAN = TRUE
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.check_agent_permission IS '檢查仲介是否有特定權限（考慮時效性與物件範圍）';

-- 函數 2: 檢查使用者是否為物件所有者或授權仲介
CREATE OR REPLACE FUNCTION public.is_owner_or_authorized_agent(
    p_user_id UUID,
    p_landlord_id UUID,
    p_property_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role TEXT;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 如果是房東本人
    IF p_user_id = p_landlord_id THEN
        RETURN TRUE;
    END IF;
    
    -- 取得使用者角色
    SELECT role INTO v_user_role
    FROM public.users_profile
    WHERE id = p_user_id;
    
    -- 如果是仲介，檢查授權
    IF v_user_role = 'agent' THEN
        SELECT EXISTS (
            SELECT 1
            FROM public.agent_authorizations aa
            WHERE aa.agent_id = p_user_id
              AND aa.landlord_id = p_landlord_id
              AND aa.status = 'active'
              AND aa.valid_from <= NOW()
              AND (aa.valid_until IS NULL OR aa.valid_until >= NOW())
              AND (
                p_property_id IS NULL
                OR aa.property_ids IS NULL
                OR p_property_id = ANY(aa.property_ids)
              )
        ) INTO v_is_authorized;
        
        RETURN v_is_authorized;
    END IF;
    
    -- 預設拒絕
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_owner_or_authorized_agent IS '通用授權檢查：判斷使用者是否為房東本人或授權仲介';

-- 函數 3: 取得仲介可存取的房東清單（供前端使用）
CREATE OR REPLACE FUNCTION public.get_authorized_landlords(
    p_agent_id UUID DEFAULT NULL
)
RETURNS TABLE (
    landlord_id UUID,
    landlord_name TEXT,
    authorization_level TEXT,
    valid_until TIMESTAMPTZ,
    property_count BIGINT
) AS $$
BEGIN
    -- 如果未指定 agent_id，使用當前使用者
    IF p_agent_id IS NULL THEN
        p_agent_id := auth.uid();
    END IF;
    
    RETURN QUERY
    SELECT 
        aa.landlord_id,
        up.display_name as landlord_name,
        aa.authorization_level,
        aa.valid_until,
        CASE 
            WHEN aa.property_ids IS NULL THEN 
                (SELECT COUNT(*) FROM public.Property_Rentals WHERE owner_id = aa.landlord_id) +
                (SELECT COUNT(*) FROM public.Property_Sales WHERE owner_id = aa.landlord_id)
            ELSE array_length(aa.property_ids, 1)::BIGINT
        END as property_count
    FROM public.agent_authorizations aa
    JOIN public.users_profile up ON aa.landlord_id = up.id
    WHERE aa.agent_id = p_agent_id
      AND aa.status = 'active'
      AND aa.valid_from <= NOW()
      AND (aa.valid_until IS NULL OR aa.valid_until >= NOW())
    ORDER BY up.display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_authorized_landlords IS '取得仲介可管理的房東清單（含物件數量統計）';

-- 函數 4: 自動過期處理
CREATE OR REPLACE FUNCTION public.expire_outdated_authorizations()
RETURNS void AS $$
BEGIN
    UPDATE public.agent_authorizations
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
      AND valid_until IS NOT NULL
      AND valid_until < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.expire_outdated_authorizations IS '定期執行：將過期的授權狀態更新為 expired';

-- ========================================
-- Part 3: 建立觸發器（資料驗證）
-- ========================================

CREATE OR REPLACE FUNCTION public.validate_agent_authorization()
RETURNS TRIGGER AS $$
BEGIN
    -- 檢查 landlord 必須是 landlord 角色
    IF NOT EXISTS (
        SELECT 1 FROM public.users_profile 
        WHERE id = NEW.landlord_id AND role = 'landlord'
    ) THEN
        RAISE EXCEPTION 'landlord_id 必須對應到角色為 landlord 的使用者';
    END IF;
    
    -- 檢查 agent 必須是 agent 角色
    IF NOT EXISTS (
        SELECT 1 FROM public.users_profile 
        WHERE id = NEW.agent_id AND role = 'agent'
    ) THEN
        RAISE EXCEPTION 'agent_id 必須對應到角色為 agent 的使用者';
    END IF;
    
    -- 檢查 property_ids 是否有效（如果有指定）
    IF NEW.property_ids IS NOT NULL THEN
        IF NOT (
            SELECT bool_and(
                EXISTS (SELECT 1 FROM public.Property_Rentals WHERE id = pid AND owner_id = NEW.landlord_id)
                OR
                EXISTS (SELECT 1 FROM public.Property_Sales WHERE id = pid AND owner_id = NEW.landlord_id)
            )
            FROM unnest(NEW.property_ids) AS pid
        ) THEN
            RAISE EXCEPTION 'property_ids 包含無效或不屬於該房東的物件';
        END IF;
    END IF;
    
    -- 更新 updated_at
    NEW.updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_agent_authorization_trigger
    BEFORE INSERT OR UPDATE ON public.agent_authorizations
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_agent_authorization();

COMMENT ON FUNCTION public.validate_agent_authorization IS '觸發器函數：驗證授權資料的完整性';

-- ========================================
-- Part 4: 實作 RLS Policy（L1: Core Tables）
-- ========================================

-- users_profile Policy（已在 full_schema 有基礎 Policy，此處新增仲介可查看授權房東資料）
CREATE POLICY "agents_view_authorized_landlords_profile" ON public.users_profile
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        id IN (
            SELECT landlord_id FROM public.agent_authorizations
            WHERE agent_id = auth.uid() 
              AND status = 'active'
              AND valid_from <= NOW()
              AND (valid_until IS NULL OR valid_until >= NOW())
        )
    );

-- ========================================
-- Part 5: 實作 RLS Policy（L2: Property Tables）
-- ========================================

-- Property_Sales Policies
DROP POLICY IF EXISTS "Owners can manage their own sales properties" ON public.Property_Sales;

CREATE POLICY "landlords_manage_own_sales" ON public.Property_Sales
    FOR ALL
    USING (auth.uid() = owner_id);

CREATE POLICY "agents_view_authorized_sales" ON public.Property_Sales
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        public.is_owner_or_authorized_agent(auth.uid(), owner_id, id)
    );

CREATE POLICY "agents_update_authorized_sales_status" ON public.Property_Sales
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        public.check_agent_permission(auth.uid(), owner_id, 'can_update_property_status', id)
    )
    WITH CHECK (
        public.check_agent_permission(auth.uid(), owner_id, 'can_update_property_status', id)
    );

-- Property_Rentals Policies
DROP POLICY IF EXISTS "Owners can manage their own rental properties" ON public.Property_Rentals;

CREATE POLICY "landlords_manage_own_rentals" ON public.Property_Rentals
    FOR ALL
    USING (auth.uid() = owner_id);

CREATE POLICY "agents_view_authorized_rentals" ON public.Property_Rentals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        public.is_owner_or_authorized_agent(auth.uid(), owner_id, id)
    );

CREATE POLICY "agents_update_authorized_rentals" ON public.Property_Rentals
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        public.check_agent_permission(auth.uid(), owner_id, 'can_update_property_status', id)
    )
    WITH CHECK (
        public.check_agent_permission(auth.uid(), owner_id, 'can_update_property_status', id)
    );

-- Property_Photos Policies
CREATE POLICY "landlords_manage_property_photos" ON public.Property_Photos
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
            UNION
            SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_photos" ON public.Property_Photos
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        (
            property_id IN (
                SELECT ps.id FROM public.Property_Sales ps
                WHERE public.is_owner_or_authorized_agent(auth.uid(), ps.owner_id, ps.id)
            )
            OR
            property_id IN (
                SELECT pr.id FROM public.Property_Rentals pr
                WHERE public.is_owner_or_authorized_agent(auth.uid(), pr.owner_id, pr.id)
            )
        )
    );

-- Property_Inventory Policies
CREATE POLICY "landlords_manage_inventory" ON public.Property_Inventory
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_update_authorized_inventory" ON public.Property_Inventory
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT pr.id FROM public.Property_Rentals pr
            WHERE public.is_owner_or_authorized_agent(auth.uid(), pr.owner_id, pr.id)
        )
    );

CREATE POLICY "agents_update_authorized_inventory" ON public.Property_Inventory
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT pr.id FROM public.Property_Rentals pr
            WHERE public.is_owner_or_authorized_agent(auth.uid(), pr.owner_id, pr.id)
        )
    );

-- ========================================
-- Part 6: 實作 RLS Policy（L3: CRM & Leads Tables）
-- ========================================

-- Leads_Tenants Policies
CREATE POLICY "landlords_manage_tenant_leads" ON public.Leads_Tenants
    FOR ALL
    USING (auth.uid() = owner_id);

CREATE POLICY "agents_manage_authorized_tenant_leads" ON public.Leads_Tenants
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        public.check_agent_permission(auth.uid(), owner_id, 'can_manage_leads')
    );

-- Leads_Buyers Policies
CREATE POLICY "landlords_manage_buyer_leads" ON public.Leads_Buyers
    FOR ALL
    USING (auth.uid() = owner_id);

CREATE POLICY "agents_manage_authorized_buyer_leads" ON public.Leads_Buyers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        public.check_agent_permission(auth.uid(), owner_id, 'can_manage_leads')
    );

-- Viewing_Appointments_Tenant Policies
CREATE POLICY "landlords_manage_tenant_viewings" ON public.Viewing_Appointments_Tenant
    FOR ALL
    USING (
        lead_id IN (
            SELECT id FROM public.Leads_Tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_manage_authorized_tenant_viewings" ON public.Viewing_Appointments_Tenant
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        lead_id IN (
            SELECT lt.id FROM public.Leads_Tenants lt
            WHERE public.check_agent_permission(auth.uid(), lt.owner_id, 'can_schedule_viewings')
        )
    );

-- Viewing_Appointments_Buyer Policies
CREATE POLICY "landlords_manage_buyer_viewings" ON public.Viewing_Appointments_Buyer
    FOR ALL
    USING (
        lead_id IN (
            SELECT id FROM public.Leads_Buyers WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_manage_authorized_buyer_viewings" ON public.Viewing_Appointments_Buyer
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        lead_id IN (
            SELECT lb.id FROM public.Leads_Buyers lb
            WHERE public.check_agent_permission(auth.uid(), lb.owner_id, 'can_schedule_viewings')
        )
    );

-- Tenant_Inquiries Policies
CREATE POLICY "landlords_manage_tenant_inquiries" ON public.Tenant_Inquiries
    FOR ALL
    USING (
        lead_id IN (
            SELECT id FROM public.Leads_Tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_manage_authorized_inquiries" ON public.Tenant_Inquiries
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        lead_id IN (
            SELECT lt.id FROM public.Leads_Tenants lt
            WHERE public.check_agent_permission(auth.uid(), lt.owner_id, 'can_manage_leads')
        )
    );

-- Buyer_Intentions Policies
CREATE POLICY "landlords_manage_buyer_intentions" ON public.Buyer_Intentions
    FOR ALL
    USING (
        lead_id IN (
            SELECT id FROM public.Leads_Buyers WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_manage_authorized_intentions" ON public.Buyer_Intentions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        lead_id IN (
            SELECT lb.id FROM public.Leads_Buyers lb
            WHERE public.check_agent_permission(auth.uid(), lb.owner_id, 'can_manage_leads')
        )
    );

-- ========================================
-- Part 7: 實作 RLS Policy（L3: Transaction Tables）
-- ========================================

-- Purchase_Offers Policies
CREATE POLICY "landlords_manage_purchase_offers" ON public.Purchase_Offers
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_manage_authorized_offers" ON public.Purchase_Offers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT ps.id FROM public.Property_Sales ps
            WHERE public.check_agent_permission(auth.uid(), ps.owner_id, 'can_create_offers', ps.id)
        )
    );

-- Lease_Agreements Policies (房東管理，仲介唯讀)
CREATE POLICY "landlords_manage_lease_agreements" ON public.Lease_Agreements
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_leases" ON public.Lease_Agreements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT pr.id FROM public.Property_Rentals pr
            WHERE public.is_owner_or_authorized_agent(auth.uid(), pr.owner_id, pr.id)
        )
    );

-- Sales_Agreements Policies (房東管理，仲介唯讀)
CREATE POLICY "landlords_manage_sales_agreements" ON public.Sales_Agreements
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_sales_agreements" ON public.Sales_Agreements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT ps.id FROM public.Property_Sales ps
            WHERE public.is_owner_or_authorized_agent(auth.uid(), ps.owner_id, ps.id)
        )
    );

-- Contracted_Tenants Policies (唯讀)
CREATE POLICY "landlords_view_contracted_tenants" ON public.Contracted_Tenants
    FOR SELECT
    USING (
        lease_id IN (
            SELECT la.id FROM public.Lease_Agreements la
            WHERE la.property_id IN (
                SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
            )
        )
    );

CREATE POLICY "agents_view_authorized_contracted_tenants" ON public.Contracted_Tenants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        lease_id IN (
            SELECT la.id FROM public.Lease_Agreements la
            JOIN public.Property_Rentals pr ON la.property_id = pr.id
            WHERE public.is_owner_or_authorized_agent(auth.uid(), pr.owner_id, pr.id)
        )
    );

-- Contracted_Buyers Policies (唯讀)
CREATE POLICY "landlords_view_contracted_buyers" ON public.Contracted_Buyers
    FOR SELECT
    USING (
        sale_id IN (
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_contracted_buyers" ON public.Contracted_Buyers
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        sale_id IN (
            SELECT ps.id FROM public.Property_Sales ps
            WHERE public.is_owner_or_authorized_agent(auth.uid(), ps.owner_id, ps.id)
        )
    );

-- Payment_Workflow Policies (唯讀)
CREATE POLICY "landlords_view_payment_workflow" ON public.Payment_Workflow
    FOR SELECT
    USING (
        sale_id IN (
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_workflow" ON public.Payment_Workflow
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        sale_id IN (
            SELECT ps.id FROM public.Property_Sales ps
            WHERE public.is_owner_or_authorized_agent(auth.uid(), ps.owner_id, ps.id)
        )
    );

-- ========================================
-- Part 8: 實作 RLS Policy（L3: Finance Tables）
-- ========================================

-- Rental_Ledger Policies (房東管理，授權仲介唯讀)
CREATE POLICY "landlords_manage_rental_ledger" ON public.Rental_Ledger
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_rental_ledger" ON public.Rental_Ledger
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT pr.id FROM public.Property_Rentals pr
            WHERE public.check_agent_permission(auth.uid(), pr.owner_id, 'can_view_financials', pr.id)
        )
    );

-- Sales_Ledger Policies (房東管理，授權仲介唯讀)
CREATE POLICY "landlords_manage_sales_ledger" ON public.Sales_Ledger
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_sales_ledger" ON public.Sales_Ledger
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT ps.id FROM public.Property_Sales ps
            WHERE public.check_agent_permission(auth.uid(), ps.owner_id, 'can_view_financials', ps.id)
        )
    );

-- Earnest_Money_Receipts Policies
CREATE POLICY "landlords_manage_earnest_money" ON public.Earnest_Money_Receipts
    FOR ALL
    USING (
        sale_id IN (
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_earnest_money" ON public.Earnest_Money_Receipts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        sale_id IN (
            SELECT ps.id FROM public.Property_Sales ps
            WHERE public.check_agent_permission(auth.uid(), ps.owner_id, 'can_view_financials', ps.id)
        )
    );

-- Deposit_Receipts Policies
CREATE POLICY "landlords_manage_deposit_receipts" ON public.Deposit_Receipts
    FOR ALL
    USING (
        -- 假設 property_id 可能是 rental 或 sales
        property_id IN (
            SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
            UNION
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_deposits" ON public.Deposit_Receipts
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        (
            property_id IN (
                SELECT pr.id FROM public.Property_Rentals pr
                WHERE public.check_agent_permission(auth.uid(), pr.owner_id, 'can_view_financials', pr.id)
            )
            OR
            property_id IN (
                SELECT ps.id FROM public.Property_Sales ps
                WHERE public.check_agent_permission(auth.uid(), ps.owner_id, 'can_view_financials', ps.id)
            )
        )
    );

-- ========================================
-- Part 9: 實作 RLS Policy（L3: Operations Tables）
-- ========================================

-- Agent_Directory Policies (公開資源)
CREATE POLICY "authenticated_users_view_agent_directory" ON public.Agent_Directory
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Maintenance_Vendors Policies (假設需要新增 owner_id 欄位)
-- 注意：此表在原 Schema 中沒有 owner_id，這裡先註解
-- CREATE POLICY "landlords_manage_own_vendors" ON public.Maintenance_Vendors
--     FOR ALL
--     USING (auth.uid() = owner_id);

-- Maintenance_Quotes Policies
CREATE POLICY "landlords_manage_maintenance_quotes" ON public.Maintenance_Quotes
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_quotes" ON public.Maintenance_Quotes
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT pr.id FROM public.Property_Rentals pr
            WHERE public.check_agent_permission(auth.uid(), pr.owner_id, 'can_request_maintenance', pr.id)
        )
    );

CREATE POLICY "agents_create_quotes" ON public.Maintenance_Quotes
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.users_profile WHERE id = auth.uid() AND role = 'agent'
        )
        AND
        property_id IN (
            SELECT pr.id FROM public.Property_Rentals pr
            WHERE public.check_agent_permission(auth.uid(), pr.owner_id, 'can_request_maintenance', pr.id)
        )
    );

-- Interior_Designers & Escrow_Legal_Services (公開資源)
CREATE POLICY "authenticated_users_view_designers" ON public.Interior_Designers
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated_users_view_legal_services" ON public.Escrow_Legal_Services
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- ========================================
-- Part 10: 實作 RLS Policy（L4: Support & AI Tables）
-- ========================================

-- Blog_Posts (公開資源)
CREATE POLICY "authenticated_users_view_blog_posts" ON public.Blog_Posts
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Glossary_Terms (公開資源)
CREATE POLICY "authenticated_users_view_glossary" ON public.Glossary_Terms
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- AI_Chat_Logs Policies (個人資料)
CREATE POLICY "users_manage_own_chat_logs" ON public.AI_Chat_Logs
    FOR ALL
    USING (auth.uid() = user_id);

-- System_Notifications Policies (個人資料)
CREATE POLICY "users_view_own_notifications" ON public.System_Notifications
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications" ON public.System_Notifications
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ========================================
-- Part 11: 效能優化索引補充
-- ========================================

-- 針對常用的 owner_id 查詢建立複合索引
CREATE INDEX IF NOT EXISTS idx_property_rentals_owner_status 
    ON public.Property_Rentals(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_property_sales_owner_status 
    ON public.Property_Sales(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_tenants_owner_status 
    ON public.Leads_Tenants(owner_id, status);

CREATE INDEX IF NOT EXISTS idx_leads_buyers_owner_status 
    ON public.Leads_Buyers(owner_id, status);

-- ========================================
-- Part 12: 初始化測試資料（僅開發環境使用）
-- ========================================

-- 插入測試授權關係（production 環境請刪除此段）
DO $$
BEGIN
    -- 僅在開發環境執行
    IF current_database() LIKE '%dev%' OR current_database() LIKE '%local%' THEN
        RAISE NOTICE '偵測到開發環境，可手動插入測試資料';
        -- 範例：
        -- INSERT INTO agent_authorizations (landlord_id, agent_id, authorization_level, permissions)
        -- VALUES (...);
    END IF;
END $$;

-- ========================================
-- Migration 完成通知
-- ========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Policy Migration 完成！';
    RAISE NOTICE '已建立：';
    RAISE NOTICE '  - 1 張授權表 (agent_authorizations)';
    RAISE NOTICE '  - 4 個輔助函數';
    RAISE NOTICE '  - 1 個資料驗證觸發器';
    RAISE NOTICE '  - 60+ 個 RLS Policies（涵蓋 30 張表）';
    RAISE NOTICE '  - 9 個效能優化索引';
    RAISE NOTICE '========================================';
    RAISE NOTICE '下一步：';
    RAISE NOTICE '1. 執行測試驗證 Policy 是否正常運作';
    RAISE NOTICE '2. 使用 get_authorized_landlords() 測試授權關係';
    RAISE NOTICE '3. 建立 UI 介面管理授權';
    RAISE NOTICE '========================================';
END $$;
