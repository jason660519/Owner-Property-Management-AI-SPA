-- ======================================================================================
-- Migration: Remaining Special Tables (AI Voice, Customer, Vendors, Photos)
-- Date: 2026-01-30
-- Description: Completes remaining tables including AI Voice, customer interactions,
--              vendor management, and photo/document storage references
-- ======================================================================================

-- ======================================================================================
-- PART 1: AI Voice & Communication
-- ======================================================================================

-- 1. Virtual Phone Numbers (虛擬號碼配置表)
CREATE TABLE IF NOT EXISTS public.virtual_phone_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    phone_number TEXT NOT NULL UNIQUE,
    country_code TEXT NOT NULL DEFAULT '+886',
    provider TEXT NOT NULL, -- 'twilio', 'nexmo', 'custom'
    number_type TEXT DEFAULT 'local', -- 'local', 'toll_free', 'mobile'
    purpose TEXT, -- 'property_inquiries', 'customer_support'
    is_active BOOLEAN DEFAULT TRUE,
    monthly_cost NUMERIC(10, 2),
    features JSONB DEFAULT '{}', -- {'sms': true, 'voice': true, 'mms': false}
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Call Logs (通話記錄表)
CREATE TABLE IF NOT EXISTS public.call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    virtual_number_id UUID REFERENCES public.virtual_phone_numbers(id),
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    direction TEXT NOT NULL, -- 'inbound', 'outbound'
    call_status TEXT NOT NULL, -- 'completed', 'no_answer', 'busy', 'failed'
    duration_seconds INTEGER,
    recording_url TEXT,
    transcription_text TEXT,
    caller_id_name TEXT,
    user_id UUID REFERENCES public.users_profile(id),
    related_entity_type TEXT, -- 'property', 'maintenance_request'
    related_entity_id UUID,
    cost NUMERIC(10, 4),
    metadata JSONB DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_logs_user ON public.call_logs(user_id);
CREATE INDEX idx_call_logs_started_at ON public.call_logs(started_at DESC);
CREATE INDEX idx_call_logs_virtual_number ON public.call_logs(virtual_number_id);

-- 3. AI Conversations (AI 對話歷史表)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profile(id),
    session_id UUID NOT NULL,
    conversation_type TEXT NOT NULL, -- 'voice', 'text', 'chat'
    ai_model TEXT NOT NULL, -- 'gpt-4', 'claude-3-opus'
    messages JSONB NOT NULL DEFAULT '[]', -- Array of {role, content, timestamp}
    context JSONB DEFAULT '{}',
    sentiment_analysis JSONB,
    intent_detected TEXT,
    entities_extracted JSONB DEFAULT '[]',
    total_tokens INTEGER,
    total_cost NUMERIC(10, 4),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conversations_user ON public.ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_session ON public.ai_conversations(session_id);
CREATE INDEX idx_ai_conversations_started_at ON public.ai_conversations(started_at DESC);

-- ======================================================================================
-- PART 2: Customer Management (Tenants & Buyers)
-- ======================================================================================

-- 4. Contracted Tenants (房東的成交租客資料表)
CREATE TABLE IF NOT EXISTS public.contracted_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    tenant_id UUID NOT NULL REFERENCES public.users_profile(id),
    property_id UUID NOT NULL,
    lease_agreement_id UUID,
    move_in_date DATE NOT NULL,
    lease_end_date DATE NOT NULL,
    monthly_rent NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2),
    status TEXT DEFAULT 'active', -- 'active', 'ending_soon', 'ended'
    payment_status TEXT DEFAULT 'current', -- 'current', 'late', 'defaulted'
    emergency_contact JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracted_tenants_landlord ON public.contracted_tenants(landlord_id);
CREATE INDEX idx_contracted_tenants_tenant ON public.contracted_tenants(tenant_id);
CREATE INDEX idx_contracted_tenants_property ON public.contracted_tenants(property_id);

-- 5. Leads Tenants (房東的潛在租客資料表)
CREATE TABLE IF NOT EXISTS public.leads_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    interested_property_id UUID,
    move_in_date_preference DATE,
    budget_min NUMERIC(10, 2),
    budget_max NUMERIC(10, 2),
    occupants_count INTEGER,
    has_pets BOOLEAN,
    employment_status TEXT,
    lead_source TEXT, -- 'website', 'referral', 'agent'
    lead_status TEXT DEFAULT 'new', -- 'new', 'contacted', 'viewing_scheduled', 'converted', 'lost'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenants_landlord ON public.leads_tenants(landlord_id);
CREATE INDEX idx_leads_tenants_status ON public.leads_tenants(lead_status);

-- 6. Contracted Buyers (房東的成交買方資料表)
CREATE TABLE IF NOT EXISTS public.contracted_buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    buyer_id UUID REFERENCES public.users_profile(id),
    buyer_name TEXT NOT NULL,
    buyer_email TEXT,
    buyer_phone TEXT,
    property_id UUID NOT NULL,
    sales_agreement_id UUID,
    purchase_price NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2),
    closing_date DATE,
    financing_type TEXT, -- 'cash', 'mortgage', 'installment'
    status TEXT DEFAULT 'in_process', -- 'in_process', 'completed', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contracted_buyers_landlord ON public.contracted_buyers(landlord_id);
CREATE INDEX idx_contracted_buyers_property ON public.contracted_buyers(property_id);

-- 7. Leads Buyers (房東的潛在買方資料表)
CREATE TABLE IF NOT EXISTS public.leads_buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    interested_property_id UUID,
    budget_min NUMERIC(12, 2),
    budget_max NUMERIC(12, 2),
    financing_preapproved BOOLEAN DEFAULT FALSE,
    preferred_areas TEXT[],
    property_requirements JSONB DEFAULT '{}',
    lead_source TEXT,
    lead_status TEXT DEFAULT 'new',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_buyers_landlord ON public.leads_buyers(landlord_id);
CREATE INDEX idx_leads_buyers_status ON public.leads_buyers(lead_status);

-- 8. Tenant Inquiries (租客留言紀錄表)
CREATE TABLE IF NOT EXISTS public.tenant_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    landlord_id UUID REFERENCES public.users_profile(id),
    inquirer_name TEXT NOT NULL,
    inquirer_email TEXT,
    inquirer_phone TEXT,
    message TEXT NOT NULL,
    inquiry_type TEXT DEFAULT 'general', -- 'general', 'viewing', 'pricing', 'availability'
    status TEXT DEFAULT 'new', -- 'new', 'replied', 'closed'
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES public.users_profile(id),
    reply_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_inquiries_property ON public.tenant_inquiries(property_id);
CREATE INDEX idx_tenant_inquiries_landlord ON public.tenant_inquiries(landlord_id);
CREATE INDEX idx_tenant_inquiries_status ON public.tenant_inquiries(status);

-- 9. Buyer Inquiries (買方留言紀錄表)
CREATE TABLE IF NOT EXISTS public.buyer_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    landlord_id UUID REFERENCES public.users_profile(id),
    inquirer_name TEXT NOT NULL,
    inquirer_email TEXT,
    inquirer_phone TEXT,
    message TEXT NOT NULL,
    inquiry_type TEXT DEFAULT 'general',
    status TEXT DEFAULT 'new',
    replied_at TIMESTAMPTZ,
    replied_by UUID REFERENCES public.users_profile(id),
    reply_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_buyer_inquiries_property ON public.buyer_inquiries(property_id);
CREATE INDEX idx_buyer_inquiries_landlord ON public.buyer_inquiries(landlord_id);

-- 10. Viewing Appointments Tenant (潛在租客預約看房表)
CREATE TABLE IF NOT EXISTS public.viewing_appointments_tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    landlord_id UUID REFERENCES public.users_profile(id),
    tenant_lead_id UUID REFERENCES public.leads_tenants(id),
    visitor_name TEXT NOT NULL,
    visitor_email TEXT,
    visitor_phone TEXT NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_viewing_appointments_tenant_property ON public.viewing_appointments_tenant(property_id);
CREATE INDEX idx_viewing_appointments_tenant_date ON public.viewing_appointments_tenant(preferred_date);

-- 11. Viewing Appointments Buyer (潛在買家預約看房表)
CREATE TABLE IF NOT EXISTS public.viewing_appointments_buyer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    landlord_id UUID REFERENCES public.users_profile(id),
    buyer_lead_id UUID REFERENCES public.leads_buyers(id),
    visitor_name TEXT NOT NULL,
    visitor_email TEXT,
    visitor_phone TEXT NOT NULL,
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    status TEXT DEFAULT 'pending',
    confirmed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    feedback TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_viewing_appointments_buyer_property ON public.viewing_appointments_buyer(property_id);
CREATE INDEX idx_viewing_appointments_buyer_date ON public.viewing_appointments_buyer(preferred_date);

-- ======================================================================================
-- PART 3: Contracts & Legal Documents
-- ======================================================================================

-- 12. Lease Agreements (租賣合約書資料表)
CREATE TABLE IF NOT EXISTS public.lease_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    tenant_id UUID NOT NULL REFERENCES public.users_profile(id),
    property_id UUID NOT NULL,
    contract_number TEXT NOT NULL UNIQUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    monthly_rent NUMERIC(10, 2) NOT NULL,
    deposit_amount NUMERIC(10, 2) NOT NULL,
    payment_due_day INTEGER NOT NULL, -- Day of month
    terms_and_conditions TEXT NOT NULL,
    special_clauses TEXT,
    contract_file_path TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'expired', 'terminated'
    signed_by_landlord BOOLEAN DEFAULT FALSE,
    signed_by_tenant BOOLEAN DEFAULT FALSE,
    landlord_signature_path TEXT,
    tenant_signature_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lease_agreements_landlord ON public.lease_agreements(landlord_id);
CREATE INDEX idx_lease_agreements_tenant ON public.lease_agreements(tenant_id);
CREATE INDEX idx_lease_agreements_property ON public.lease_agreements(property_id);

-- 13. Sales Agreements (買賣合約書資料表)
CREATE TABLE IF NOT EXISTS public.sales_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.users_profile(id),
    buyer_id UUID REFERENCES public.users_profile(id),
    buyer_name TEXT NOT NULL,
    property_id UUID NOT NULL,
    contract_number TEXT NOT NULL UNIQUE,
    purchase_price NUMERIC(12, 2) NOT NULL,
    down_payment NUMERIC(12, 2) NOT NULL,
    closing_date DATE,
    terms_and_conditions TEXT NOT NULL,
    contingencies TEXT,
    contract_file_path TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'active', 'completed', 'cancelled'
    signed_by_seller BOOLEAN DEFAULT FALSE,
    signed_by_buyer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_agreements_seller ON public.sales_agreements(seller_id);
CREATE INDEX idx_sales_agreements_property ON public.sales_agreements(property_id);

-- 14. Deposit Receipts (簽約定金簽收資料表)
CREATE TABLE IF NOT EXISTS public.deposit_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_agreement_id UUID REFERENCES public.lease_agreements(id),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    tenant_id UUID NOT NULL REFERENCES public.users_profile(id),
    receipt_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    receipt_file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15. Earnest Money Receipts (斡旋金簽收資料表)
CREATE TABLE IF NOT EXISTS public.earnest_money_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    buyer_name TEXT NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method TEXT,
    status TEXT DEFAULT 'held', -- 'held', 'applied', 'refunded'
    receipt_file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 16. Digital Signatures (電子簽名記錄表)
CREATE TABLE IF NOT EXISTS public.digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL, -- 'lease_agreement', 'sales_agreement'
    document_id UUID NOT NULL,
    signer_id UUID NOT NULL REFERENCES public.users_profile(id),
    signature_data TEXT NOT NULL, -- Base64 encoded signature image
    ip_address INET,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verification_method TEXT, -- 'email', 'sms', 'biometric'
    is_verified BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_digital_signatures_document ON public.digital_signatures(document_type, document_id);
CREATE INDEX idx_digital_signatures_signer ON public.digital_signatures(signer_id);

-- ======================================================================================
-- PART 4: Vendor & Service Provider Management
-- ======================================================================================

-- 17. Service Providers (服務商目錄表)
CREATE TABLE IF NOT EXISTS public.service_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_type TEXT NOT NULL, -- 'maintenance', 'legal', 'insurance', 'inspection'
    company_name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    license_number TEXT,
    specializations TEXT[],
    service_areas TEXT[], -- Cities or districts served
    rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5),
    hourly_rate NUMERIC(10, 2),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_providers_type ON public.service_providers(provider_type);
CREATE INDEX idx_service_providers_active ON public.service_providers(is_active) WHERE is_active = TRUE;

-- 18. Maintenance Vendors (維修廠商表)
CREATE TABLE IF NOT EXISTS public.maintenance_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    specialties TEXT[], -- ['plumbing', 'electrical', 'hvac']
    service_areas TEXT[],
    rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5),
    response_time_hours INTEGER, -- Average response time
    is_preferred BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Maintenance Quotes (維修請求報價單)
CREATE TABLE IF NOT EXISTS public.maintenance_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    maintenance_request_id UUID NOT NULL,
    vendor_id UUID REFERENCES public.maintenance_vendors(id),
    quote_amount NUMERIC(10, 2) NOT NULL,
    estimated_duration_hours INTEGER,
    quote_details TEXT NOT NULL,
    valid_until DATE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Escrow Legal Services (律師代書表)
CREATE TABLE IF NOT EXISTS public.escrow_legal_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_type TEXT NOT NULL, -- 'escrow', 'legal_review', 'title_search'
    provider_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    license_number TEXT NOT NULL,
    fee_structure JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 21. Insurance Plans (保險方案表)
CREATE TABLE IF NOT EXISTS public.insurance_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name TEXT NOT NULL,
    insurance_company TEXT NOT NULL,
    coverage_type TEXT NOT NULL, -- 'property', 'liability', 'contents'
    coverage_amount NUMERIC(12, 2) NOT NULL,
    premium_monthly NUMERIC(10, 2) NOT NULL,
    deductible NUMERIC(10, 2),
    terms_and_conditions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. Interior Designers (室內裝潢設計師表)
CREATE TABLE IF NOT EXISTS public.interior_designers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    designer_name TEXT NOT NULL,
    company_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    portfolio_url TEXT,
    specialization TEXT[], -- ['modern', 'minimalist', 'traditional']
    rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5),
    average_project_cost NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================================
-- PART 5: Additional Features
-- ======================================================================================

-- 23. User Favorites (使用者收藏表)
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'property', 'blog_post'
    entity_id UUID NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_user_favorites_user ON public.user_favorites(user_id);

-- 24. Property Comparisons (物件比較記錄表)
CREATE TABLE IF NOT EXISTS public.property_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id),
    property_ids UUID[] NOT NULL,
    comparison_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_comparisons_user ON public.property_comparisons(user_id);

-- 25. User Reviews (使用者評論表)
CREATE TABLE IF NOT EXISTS public.user_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_id UUID NOT NULL REFERENCES public.users_profile(id),
    entity_type TEXT NOT NULL, -- 'property', 'landlord', 'service_provider'
    entity_id UUID NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    pros TEXT,
    cons TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_reviews_entity ON public.user_reviews(entity_type, entity_id);
CREATE INDEX idx_user_reviews_reviewer ON public.user_reviews(reviewer_id);

-- 26. VLM Parsing Logs (VLM 解析記錄表)
CREATE TABLE IF NOT EXISTS public.vlm_parsing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    vlm_model TEXT NOT NULL, -- 'gpt-4-vision', 'claude-3-opus'
    prompt_text TEXT NOT NULL,
    extracted_data JSONB,
    confidence_score NUMERIC(5, 2),
    processing_time_ms INTEGER,
    cost NUMERIC(10, 4),
    status TEXT DEFAULT 'completed',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================================
-- Enable RLS
-- ======================================================================================

ALTER TABLE public.virtual_phone_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracted_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracted_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_appointments_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_appointments_buyer ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reviews ENABLE ROW LEVEL SECURITY;

-- ======================================================================================
-- Create updated_at triggers
-- ======================================================================================

CREATE TRIGGER update_virtual_phone_numbers_updated_at BEFORE UPDATE ON public.virtual_phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracted_tenants_updated_at BEFORE UPDATE ON public.contracted_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_tenants_updated_at BEFORE UPDATE ON public.leads_tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracted_buyers_updated_at BEFORE UPDATE ON public.contracted_buyers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_buyers_updated_at BEFORE UPDATE ON public.leads_buyers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_viewing_appointments_tenant_updated_at BEFORE UPDATE ON public.viewing_appointments_tenant
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_viewing_appointments_buyer_updated_at BEFORE UPDATE ON public.viewing_appointments_buyer
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lease_agreements_updated_at BEFORE UPDATE ON public.lease_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_agreements_updated_at BEFORE UPDATE ON public.sales_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_providers_updated_at BEFORE UPDATE ON public.service_providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_vendors_updated_at BEFORE UPDATE ON public.maintenance_vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_reviews_updated_at BEFORE UPDATE ON public.user_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
