-- ======================================================================================
-- Migration: Landlord Related Tables
-- Date: 2026-01-30
-- Description: Creates all landlord-specific tables including properties, finances, 
--              documents, media, and management features
-- ======================================================================================

-- ======================================================================================
-- PART 1: Core Property & Building Tables
-- ======================================================================================

-- 1. Buildings & Communities (社區大樓資料表)
CREATE TABLE IF NOT EXISTS public.buildings_communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT,
    postal_code TEXT,
    total_floors INTEGER,
    total_units INTEGER,
    year_built INTEGER,
    building_type TEXT, -- 'apartment', 'condo', 'townhouse'
    management_company TEXT,
    amenities TEXT[], -- ['gym', 'pool', 'parking', 'security']
    rules_regulations JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Building Title Records (建物權狀詳細資料表)
CREATE TABLE IF NOT EXISTS public.building_title_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID, -- Link to properties if exists
    building_community_id UUID REFERENCES public.buildings_communities(id),
    title_number TEXT NOT NULL UNIQUE,
    owner_name TEXT NOT NULL,
    owner_id_number TEXT, -- Owner's national ID
    building_address TEXT NOT NULL,
    land_lot_number TEXT,
    building_area_sqm NUMERIC(10, 2),
    floor_number TEXT,
    construction_type TEXT,
    main_building_area NUMERIC(10, 2),
    auxiliary_area NUMERIC(10, 2),
    common_area NUMERIC(10, 2),
    registration_date DATE,
    purpose_of_use TEXT,
    share_ratio TEXT, -- e.g., "10000/1" for land share
    encumbrances JSONB DEFAULT '[]', -- mortgages, liens
    ocr_extracted BOOLEAN DEFAULT FALSE,
    ocr_parsing_log_id UUID,
    document_file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================================
-- PART 2: Finance & Accounting Tables
-- ======================================================================================

-- 3. Bank Accounts (銀行帳戶表)
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    branch_name TEXT,
    account_number TEXT NOT NULL,
    account_type TEXT, -- 'checking', 'savings'
    currency_code TEXT DEFAULT 'TWD',
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(landlord_id, account_number)
);

-- 4. Rental Ledger (租金收支明細表)
DROP TABLE IF EXISTS public.rental_ledger CASCADE;
DROP TABLE IF EXISTS public.Rental_Ledger CASCADE;

CREATE TABLE IF NOT EXISTS public.rental_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    tenant_id UUID REFERENCES public.users_profile(id),
    transaction_date DATE NOT NULL,
    transaction_type TEXT NOT NULL, -- 'rent_income', 'deposit', 'utility', 'maintenance'
    amount NUMERIC(10, 2) NOT NULL,
    currency_code TEXT DEFAULT 'TWD',
    payment_method TEXT, -- 'bank_transfer', 'cash', 'check'
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    receipt_number TEXT,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.users_profile(id),
    verified_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES public.users_profile(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rental_ledger_property ON public.rental_ledger(property_id);
CREATE INDEX idx_rental_ledger_tenant ON public.rental_ledger(tenant_id);
CREATE INDEX idx_rental_ledger_date ON public.rental_ledger(transaction_date DESC);

-- Enable RLS and add policies (migrated from 20260123)
ALTER TABLE public.rental_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landlords_manage_rental_ledger" ON public.rental_ledger
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_rental_ledger" ON public.rental_ledger
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

-- 5. Sales Ledger (買賣收支明細表)
DROP TABLE IF EXISTS public.sales_ledger CASCADE;
DROP TABLE IF EXISTS public.Sales_Ledger CASCADE;

CREATE TABLE IF NOT EXISTS public.sales_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type TEXT NOT NULL, -- 'down_payment', 'installment', 'tax', 'commission'
    amount NUMERIC(12, 2) NOT NULL,
    currency_code TEXT DEFAULT 'TWD',
    buyer_name TEXT,
    buyer_id_number TEXT,
    payment_method TEXT,
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    receipt_number TEXT,
    description TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES public.users_profile(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_ledger_property ON public.sales_ledger(property_id);
CREATE INDEX idx_sales_ledger_date ON public.sales_ledger(transaction_date DESC);

-- Enable RLS and add policies (migrated from 20260123)
ALTER TABLE public.sales_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landlords_manage_sales_ledger" ON public.sales_ledger
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Sales WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_authorized_sales_ledger" ON public.sales_ledger
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

-- 6. Rent Receipts (租金收據表)
CREATE TABLE IF NOT EXISTS public.rent_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rental_ledger_id UUID NOT NULL REFERENCES public.rental_ledger(id),
    receipt_number TEXT NOT NULL UNIQUE,
    issue_date DATE NOT NULL,
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    tenant_id UUID NOT NULL REFERENCES public.users_profile(id),
    property_id UUID NOT NULL,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency_code TEXT DEFAULT 'TWD',
    receipt_file_path TEXT,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Tax Reports (稅務報表記錄表)
CREATE TABLE IF NOT EXISTS public.tax_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    report_year INTEGER NOT NULL,
    report_type TEXT NOT NULL, -- 'rental_income', 'property_tax', 'capital_gains'
    total_income NUMERIC(12, 2),
    total_expenses NUMERIC(12, 2),
    taxable_income NUMERIC(12, 2),
    tax_amount NUMERIC(12, 2),
    filing_status TEXT, -- 'draft', 'filed', 'submitted'
    filed_date DATE,
    report_file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(landlord_id, report_year, report_type)
);

-- ======================================================================================
-- PART 3: Property Management Tables
-- ======================================================================================

-- 8. Property Inventory (物件財產清單)
DROP TABLE IF EXISTS public.property_inventory CASCADE;
DROP TABLE IF EXISTS public.Property_Inventory CASCADE;

CREATE TABLE IF NOT EXISTS public.property_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    category TEXT NOT NULL, -- 'furniture', 'appliance', 'fixture', 'electronics'
    item_name TEXT NOT NULL,
    brand TEXT,
    model_number TEXT,
    purchase_date DATE,
    purchase_price NUMERIC(10, 2),
    condition TEXT, -- 'new', 'good', 'fair', 'poor'
    warranty_expiry DATE,
    serial_number TEXT,
    location_in_property TEXT, -- 'living_room', 'bedroom_1'
    quantity INTEGER DEFAULT 1,
    notes TEXT,
    photo_urls TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_inventory_property ON public.property_inventory(property_id);

-- Enable RLS and add policies (migrated from 20260123)
ALTER TABLE public.property_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "landlords_manage_inventory" ON public.property_inventory
    FOR ALL
    USING (
        property_id IN (
            SELECT id FROM public.Property_Rentals WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "agents_view_update_authorized_inventory" ON public.property_inventory
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

CREATE POLICY "agents_update_authorized_inventory" ON public.property_inventory
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

-- 9. Property Status History (物件狀態歷史表)
CREATE TABLE IF NOT EXISTS public.property_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    old_status TEXT,
    new_status TEXT NOT NULL,
    status_category TEXT NOT NULL, -- 'listing', 'occupancy', 'maintenance'
    reason TEXT,
    changed_by UUID NOT NULL REFERENCES public.users_profile(id),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_property_status_history_property ON public.property_status_history(property_id);
CREATE INDEX idx_property_status_history_changed_at ON public.property_status_history(changed_at DESC);

-- 10. Property Type Change Logs (物件轉租轉賣記錄表)
CREATE TABLE IF NOT EXISTS public.property_type_change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    old_type TEXT NOT NULL, -- 'for_rent', 'for_sale'
    new_type TEXT NOT NULL,
    old_price NUMERIC(12, 2),
    new_price NUMERIC(12, 2),
    reason TEXT,
    effective_date DATE NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.users_profile(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_type_change_logs_property ON public.property_type_change_logs(property_id);

-- 11. Maintenance Requests (維修申請表)
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    requested_by UUID NOT NULL REFERENCES public.users_profile(id),
    assigned_to UUID REFERENCES public.users_profile(id), -- vendor/technician
    category TEXT NOT NULL, -- 'plumbing', 'electrical', 'hvac', 'appliance'
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'completed', 'cancelled'
    estimated_cost NUMERIC(10, 2),
    actual_cost NUMERIC(10, 2),
    scheduled_date TIMESTAMPTZ,
    completed_date TIMESTAMPTZ,
    photo_urls TEXT[],
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_maintenance_requests_property ON public.maintenance_requests(property_id);
CREATE INDEX idx_maintenance_requests_status ON public.maintenance_requests(status);

-- ======================================================================================
-- PART 4: Media & Documentation Tables
-- ======================================================================================

-- 12. Media Gallery (藝廊與媒體庫表)
CREATE TABLE IF NOT EXISTS public.media_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users_profile(id),
    related_entity_type TEXT, -- 'property', 'blog_post', 'profile'
    related_entity_id UUID,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'image', 'video', 'document'
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    alt_text TEXT,
    caption TEXT,
    tags TEXT[],
    is_public BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_media_gallery_owner ON public.media_gallery(owner_id);
CREATE INDEX idx_media_gallery_entity ON public.media_gallery(related_entity_type, related_entity_id);

-- 13. Panorama Images (360度全景圖片表)
CREATE TABLE IF NOT EXISTS public.panorama_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    room_name TEXT NOT NULL, -- 'living_room', 'bedroom_1'
    panorama_url TEXT NOT NULL,
    thumbnail_url TEXT,
    resolution TEXT, -- '8192x4096'
    file_size_bytes BIGINT,
    hotspots JSONB DEFAULT '[]', -- interactive points in the panorama
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    uploaded_by UUID NOT NULL REFERENCES public.users_profile(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_panorama_images_property ON public.panorama_images(property_id);

-- 14. OCR Parsing Logs (OCR 解析記錄表)
CREATE TABLE IF NOT EXISTS public.ocr_parsing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_type TEXT NOT NULL, -- 'building_title', 'land_title', 'contract'
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    ocr_engine TEXT NOT NULL, -- 'tesseract', 'google_vision', 'azure_ocr'
    status TEXT NOT NULL, -- 'pending', 'processing', 'completed', 'failed'
    confidence_score NUMERIC(5, 2),
    extracted_text TEXT,
    structured_data JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    processed_by UUID REFERENCES public.users_profile(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ocr_parsing_logs_status ON public.ocr_parsing_logs(status);
CREATE INDEX idx_ocr_parsing_logs_created_at ON public.ocr_parsing_logs(created_at DESC);

-- ======================================================================================
-- PART 5: Content & Marketing Tables
-- ======================================================================================

-- 15. Blog Posts (部落格資料表)
DROP TABLE IF EXISTS public.blog_posts CASCADE;
DROP TABLE IF EXISTS public.Blog_Posts CASCADE;

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.users_profile(id),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    excerpt TEXT,
    content TEXT NOT NULL,
    content_html TEXT, -- Rendered HTML
    featured_image_url TEXT,
    category TEXT, -- 'tips', 'news', 'market_analysis'
    tags TEXT[],
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'archived'
    published_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    seo_title TEXT,
    seo_description TEXT,
    seo_keywords TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_blog_posts_author ON public.blog_posts(author_id);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at DESC);

-- Enable RLS and add policies (migrated from 20260123)
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_view_blog_posts" ON public.blog_posts
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 16. Blog Analytics (部落格分析表)
CREATE TABLE IF NOT EXISTS public.blog_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    views INTEGER DEFAULT 0,
    unique_visitors INTEGER DEFAULT 0,
    avg_time_on_page INTEGER, -- seconds
    bounce_rate NUMERIC(5, 2),
    shares JSONB DEFAULT '{}', -- {'facebook': 5, 'twitter': 3}
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(blog_post_id, metric_date)
);

CREATE INDEX idx_blog_analytics_post ON public.blog_analytics(blog_post_id);
CREATE INDEX idx_blog_analytics_date ON public.blog_analytics(metric_date DESC);

-- 17. Property FAQs (物件Q&A表)
CREATE TABLE IF NOT EXISTS public.property_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT, -- 'lease_terms', 'utilities', 'amenities'
    display_order INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID NOT NULL REFERENCES public.users_profile(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_property_faqs_property ON public.property_faqs(property_id);

-- ======================================================================================
-- PART 6: Special Features Tables
-- ======================================================================================

-- 18. ComfyUI Styles (ComfyUI 風格設定表)
CREATE TABLE IF NOT EXISTS public.comfyui_styles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    style_type TEXT NOT NULL, -- 'interior', 'exterior', 'virtual_staging'
    workflow_json JSONB NOT NULL,
    thumbnail_url TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES public.users_profile(id),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 19. Landlord Call Preferences (房東接聽偏好設定表)
CREATE TABLE IF NOT EXISTS public.landlord_call_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL UNIQUE REFERENCES public.users_profile(id) ON DELETE CASCADE,
    available_days TEXT[] NOT NULL, -- ['Monday', 'Tuesday', 'Wednesday']
    available_time_from TIME NOT NULL,
    available_time_to TIME NOT NULL,
    timezone TEXT DEFAULT 'Asia/Taipei',
    preferred_language TEXT DEFAULT 'zh-TW',
    do_not_disturb_mode BOOLEAN DEFAULT FALSE,
    auto_respond BOOLEAN DEFAULT TRUE,
    auto_response_message TEXT,
    forward_to_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. Agent Directory (房東的仲介名單資料表)
DROP TABLE IF EXISTS public.agent_directory CASCADE;
DROP TABLE IF EXISTS public.Agent_Directory CASCADE;

CREATE TABLE IF NOT EXISTS public.agent_directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL,
    company_name TEXT,
    license_number TEXT,
    phone_number TEXT NOT NULL,
    email TEXT,
    specialization TEXT[], -- ['residential', 'commercial']
    rating NUMERIC(2, 1) CHECK (rating >= 0 AND rating <= 5),
    notes TEXT,
    is_preferred BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_agent_directory_landlord ON public.agent_directory(landlord_id);

-- Enable RLS and add policies (migrated from 20260123)
ALTER TABLE public.agent_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_users_view_agent_directory" ON public.agent_directory
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- 21. Nearby Facilities (地區與鄰近設施表)
CREATE TABLE IF NOT EXISTS public.nearby_facilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID,
    building_community_id UUID REFERENCES public.buildings_communities(id),
    facility_type TEXT NOT NULL, -- 'school', 'hospital', 'shopping', 'transport'
    name TEXT NOT NULL,
    distance_meters INTEGER NOT NULL,
    walking_time_minutes INTEGER,
    address TEXT,
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    rating NUMERIC(2, 1),
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_has_property_or_building CHECK (
        (property_id IS NOT NULL) OR (building_community_id IS NOT NULL)
    )
);

CREATE INDEX idx_nearby_facilities_property ON public.nearby_facilities(property_id);
CREATE INDEX idx_nearby_facilities_building ON public.nearby_facilities(building_community_id);

-- ======================================================================================
-- Enable RLS for all new tables
-- ======================================================================================

ALTER TABLE public.buildings_communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.building_title_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_type_change_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_gallery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panorama_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ocr_parsing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comfyui_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_call_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_directory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nearby_facilities ENABLE ROW LEVEL SECURITY;

-- ======================================================================================
-- Create updated_at triggers
-- ======================================================================================

CREATE TRIGGER update_buildings_communities_updated_at BEFORE UPDATE ON public.buildings_communities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_building_title_records_updated_at BEFORE UPDATE ON public.building_title_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_ledger_updated_at BEFORE UPDATE ON public.rental_ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_ledger_updated_at BEFORE UPDATE ON public.sales_ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_reports_updated_at BEFORE UPDATE ON public.tax_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_inventory_updated_at BEFORE UPDATE ON public.property_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_requests_updated_at BEFORE UPDATE ON public.maintenance_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_gallery_updated_at BEFORE UPDATE ON public.media_gallery
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_panorama_images_updated_at BEFORE UPDATE ON public.panorama_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_faqs_updated_at BEFORE UPDATE ON public.property_faqs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comfyui_styles_updated_at BEFORE UPDATE ON public.comfyui_styles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_landlord_call_preferences_updated_at BEFORE UPDATE ON public.landlord_call_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_directory_updated_at BEFORE UPDATE ON public.agent_directory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
