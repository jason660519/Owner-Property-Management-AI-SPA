-- Phase 2: Core Business Tables
-- Created: 2026-01-16
-- Purpose: Add essential tables for landlords, tenants, leases, and payments

-- ============================================
-- 1. 使用者資料擴充表 (Users Profile Extension)
-- ============================================

CREATE TABLE IF NOT EXISTS users_profile (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 基本資訊
  full_name TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  date_of_birth DATE,
  
  -- 身份類型
  user_type TEXT NOT NULL DEFAULT 'landlord', -- 'landlord', 'agent', 'tenant', 'admin'
  
  -- 地址資訊
  country TEXT,
  state TEXT,
  city TEXT,
  postal_code TEXT,
  street_address TEXT,
  
  -- 銀行資訊（用於租金收款）
  bank_account_number TEXT,
  bank_code TEXT,
  account_holder_name TEXT,
  
  -- 驗證狀態
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  id_verified BOOLEAN DEFAULT FALSE,
  
  -- 偏好設定
  preferred_currency TEXT DEFAULT 'TWD',
  preferred_language TEXT DEFAULT 'zh-TW',
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}',
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_profile_user_type ON users_profile(user_type);
CREATE INDEX IF NOT EXISTS idx_users_profile_city ON users_profile(city);

-- ============================================
-- 2. 租客資料表 (Tenants)
-- ============================================

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 基本資訊
  full_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT NOT NULL,
  date_of_birth DATE,
  id_number TEXT UNIQUE,  -- 身份證號碼
  
  -- 聯絡方式
  preferred_contact_method TEXT DEFAULT 'phone', -- 'phone', 'email', 'whatsapp'
  alternative_phone TEXT,
  
  -- 職業與財務
  occupation TEXT,
  company_name TEXT,
  monthly_income NUMERIC,
  
  -- 家庭資訊
  family_size INTEGER,
  number_of_dependents INTEGER,
  
  -- 寵物資訊
  has_pets BOOLEAN DEFAULT FALSE,
  pet_details JSONB, -- {"type": "dog", "breed": "...", "count": 1}
  
  -- 租賃偏好
  move_in_date DATE,
  lease_duration INTEGER, -- 月數
  preferred_location TEXT,
  budget_min NUMERIC,
  budget_max NUMERIC,
  
  -- 背景檢查
  background_check_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  background_check_date TIMESTAMPTZ,
  background_check_notes TEXT,
  
  -- 參考人 (References)
  references JSONB, -- [{"name": "...", "phone": "...", "relationship": "..."}]
  
  -- 文件與驗證
  documents JSONB, -- {"id_copy": "path", "income_proof": "path", "reference_letter": "path"}
  documents_verified BOOLEAN DEFAULT FALSE,
  verified_by UUID REFERENCES auth.users(id),
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone_number);
CREATE INDEX IF NOT EXISTS idx_tenants_id_number ON tenants(id_number);
CREATE INDEX IF NOT EXISTS idx_tenants_background_check ON tenants(background_check_status);

-- ============================================
-- 3. 租賃合約表 (Leases)
-- ============================================

CREATE TABLE IF NOT EXISTS leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關係連結
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- 合約資訊
  lease_number TEXT UNIQUE NOT NULL, -- 合約編號
  contract_start_date DATE NOT NULL,
  contract_end_date DATE NOT NULL,
  lease_duration_months INTEGER NOT NULL,
  
  -- 租金資訊
  monthly_rent NUMERIC NOT NULL,
  security_deposit NUMERIC, -- 押金
  deposit_refundable BOOLEAN DEFAULT TRUE,
  rent_payment_day INTEGER DEFAULT 1, -- 月份中的支付日期
  rent_payment_method TEXT DEFAULT 'bank_transfer', -- 'bank_transfer', 'check', 'cash'
  
  -- 額外費用
  utilities_included BOOLEAN DEFAULT FALSE, -- 公用事業是否包含在租金中
  other_charges JSONB, -- {"parking": 1000, "maintenance": 500}
  
  -- 合約狀態
  status TEXT DEFAULT 'draft', -- 'draft', 'pending_signature', 'active', 'completed', 'terminated'
  signed_by_tenant_at TIMESTAMPTZ,
  signed_by_landlord_at TIMESTAMPTZ,
  
  -- 特殊條款
  special_terms JSONB, -- 特殊合約條款
  house_rules JSONB, -- 房屋規則
  
  -- 檔案與文件
  contract_document_path TEXT, -- Storage 路徑
  signed_contract_path TEXT,
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leases_property ON leases(property_id);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leases_landlord ON leases(landlord_id);
CREATE INDEX IF NOT EXISTS idx_leases_status ON leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_date_range ON leases(contract_start_date, contract_end_date);

-- ============================================
-- 4. 租金收款表 (Lease Payments)
-- ============================================

CREATE TABLE IF NOT EXISTS lease_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關係連結
  lease_id UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES auth.users(id),
  
  -- 支付週期
  payment_month DATE NOT NULL, -- 本次支付的月份（如 2026-01-01）
  due_date DATE NOT NULL, -- 到期日期
  paid_date DATE, -- 實際支付日期
  
  -- 金額
  amount_due NUMERIC NOT NULL, -- 應付金額
  amount_paid NUMERIC, -- 實際支付金額
  
  -- 支付方式與詳情
  payment_method TEXT, -- 'bank_transfer', 'check', 'cash', 'other'
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue', 'cancelled'
  reference_number TEXT, -- 銀行轉帳參考號
  notes TEXT,
  
  -- 罰金與調整
  late_fee NUMERIC DEFAULT 0,
  discount_applied NUMERIC DEFAULT 0,
  final_amount NUMERIC, -- 最終金額（包括罰金、折扣）
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lease_payments_lease ON lease_payments(lease_id);
CREATE INDEX IF NOT EXISTS idx_lease_payments_property ON lease_payments(property_id);
CREATE INDEX IF NOT EXISTS idx_lease_payments_tenant ON lease_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lease_payments_landlord ON lease_payments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_lease_payments_status ON lease_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_lease_payments_month ON lease_payments(payment_month);

-- ============================================
-- 5. 物件設備表 (Property Amenities)
-- ============================================

CREATE TABLE IF NOT EXISTS property_amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  
  -- 基本設備類別
  category TEXT NOT NULL, -- 'appliances', 'furniture', 'utilities', 'safety', 'outdoor'
  name TEXT NOT NULL, -- 設備名稱，如 'Washing Machine', 'Air Conditioner'
  quantity INTEGER DEFAULT 1,
  
  -- 設備狀態
  condition TEXT DEFAULT 'good', -- 'excellent', 'good', 'fair', 'needs_repair'
  purchase_date DATE,
  last_maintenance_date DATE,
  
  -- 詳細資訊
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  value NUMERIC, -- 估計價值
  notes TEXT,
  
  -- 圖片與文件
  photo_urls TEXT[], -- 設備照片
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_amenities_property ON property_amenities(property_id);
CREATE INDEX IF NOT EXISTS idx_property_amenities_category ON property_amenities(category);

-- ============================================
-- 6. 財務交易表 (Financial Transactions)
-- ============================================

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 關係連結
  landlord_id UUID NOT NULL REFERENCES auth.users(id),
  property_id UUID REFERENCES properties(id),
  lease_id UUID REFERENCES leases(id),
  
  -- 交易類型
  transaction_type TEXT NOT NULL, -- 'rent_income', 'expense', 'deposit', 'refund', 'adjustment'
  description TEXT NOT NULL,
  
  -- 金額
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'TWD',
  
  -- 日期
  transaction_date TIMESTAMPTZ NOT NULL,
  
  -- 狀態
  status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
  
  -- 支付方式
  payment_method TEXT, -- 'bank_transfer', 'check', 'cash', 'credit_card', 'other'
  reference_number TEXT,
  
  -- 分類與標籤
  category TEXT, -- 'income', 'maintenance', 'tax', 'insurance', 'management', 'utilities'
  tags TEXT[],
  
  -- 附件
  attachment_paths TEXT[], -- 發票、收據等
  
  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_landlord ON financial_transactions(landlord_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_property ON financial_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_category ON financial_transactions(category);

-- ============================================
-- 啟用 Row Level Security
-- ============================================

ALTER TABLE users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE lease_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS 政策設定
-- ============================================

-- Users Profile: 使用者只能看到自己的資料
CREATE POLICY "使用者可以查看自己的資料"
  ON users_profile FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "使用者可以更新自己的資料"
  ON users_profile FOR UPDATE
  USING (auth.uid() = id);

-- Tenants: 房東只能看到自己租客的資料
CREATE POLICY "房東可以查看自己租客的資料"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT DISTINCT tenant_id FROM leases WHERE landlord_id = auth.uid()
    )
  );

-- Leases: 房東只能看到自己的租約
CREATE POLICY "房東可以查看自己的租約"
  ON leases FOR SELECT
  USING (landlord_id = auth.uid());

CREATE POLICY "房東可以新增自己的租約"
  ON leases FOR INSERT
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "房東可以更新自己的租約"
  ON leases FOR UPDATE
  USING (landlord_id = auth.uid());

-- Lease Payments: 房東只能看到自己的租金記錄
CREATE POLICY "房東可以查看自己的租金記錄"
  ON lease_payments FOR SELECT
  USING (landlord_id = auth.uid());

-- Property Amenities: 房東可以看到自己物件的設備
CREATE POLICY "房東可以查看自己物件的設備"
  ON property_amenities FOR SELECT
  USING (
    property_id IN (
      SELECT id FROM properties WHERE agent_id = auth.uid()
    )
  );

-- Financial Transactions: 房東只能看到自己的交易
CREATE POLICY "房東可以查看自己的財務交易"
  ON financial_transactions FOR SELECT
  USING (landlord_id = auth.uid());

-- ============================================
-- 自動更新 updated_at 的觸發函數
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 為所有需要的表建立觸發器
CREATE TRIGGER update_users_profile_updated_at
  BEFORE UPDATE ON users_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leases_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_payments_updated_at
  BEFORE UPDATE ON lease_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_amenities_updated_at
  BEFORE UPDATE ON property_amenities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at
  BEFORE UPDATE ON financial_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 表格備註與文檔
-- ============================================

COMMENT ON TABLE users_profile IS '使用者資訊擴充表，存儲房東、仲介、租客的詳細資料';
COMMENT ON TABLE tenants IS '租客資料主檔，包含租客基本資訊、背景檢查、偏好設定';
COMMENT ON TABLE leases IS '租賃合約主檔，記錄房東與租客之間的租賃協議';
COMMENT ON TABLE lease_payments IS '租金收款記錄，追蹤每月的租金收付狀況';
COMMENT ON TABLE property_amenities IS '物件設備清單，列舉房屋內的傢俱與設備';
COMMENT ON TABLE financial_transactions IS '財務交易紀錄，用於財務報表與稽核';

COMMENT ON COLUMN tenants.background_check_status IS '背景檢查狀態：pending-待檢查, approved-已通過, rejected-已駁回';
COMMENT ON COLUMN leases.status IS '租約狀態：draft-草稿, pending_signature-待簽署, active-進行中, completed-已完成, terminated-已終止';
COMMENT ON COLUMN lease_payments.payment_status IS '支付狀態：pending-待支付, partial-部分支付, paid-已支付, overdue-逾期, cancelled-已取消';
COMMENT ON COLUMN property_amenities.condition IS '設備狀況：excellent-非常好, good-良好, fair-尚可, needs_repair-需要維修';
