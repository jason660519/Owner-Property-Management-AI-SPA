-- ======================================================================================
-- Title: Full Database Schema for Owner Property Management AI SaaS
-- Date: 2026-01-22
-- Description: Contains 30 tables, RLS policies, and essential indexes.
-- ======================================================================================

-- 0. Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Identity & Core (1 Table)
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'landlord' CHECK (role IN ('landlord', 'agent')),
    display_name TEXT NOT NULL,
    phone TEXT,
    id_number_enc TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Property Assets (4 Tables)
CREATE TABLE IF NOT EXISTS public.Property_Sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0 CHECK (price >= 0),
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'pending', 'sold', 'archived')),
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Property_Rentals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    monthly_rent NUMERIC NOT NULL DEFAULT 0 CHECK (monthly_rent >= 0),
    status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied', 'maintenance', 'archived')),
    lease_term INTEGER DEFAULT 12,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Property_Photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL, -- Logical link to Sales or Rentals
    storage_path TEXT NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    photo_type TEXT DEFAULT 'interior',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Property_Inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.Property_Rentals(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    condition TEXT DEFAULT 'good',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Leads & CRM (6 Tables)
CREATE TABLE IF NOT EXISTS public.Leads_Tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'viewing', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Leads_Buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    budget_low NUMERIC DEFAULT 0,
    budget_high NUMERIC,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'viewing', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Viewing_Appointments_Tenant (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.Leads_Tenants(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Viewing_Appointments_Buyer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.Leads_Buyers(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Tenant_Inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.Leads_Tenants(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Buyer_Intentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.Leads_Buyers(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Transactions & Contracting (6 Tables)
CREATE TABLE IF NOT EXISTS public.Lease_Agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.Property_Rentals(id) ON DELETE SET NULL,
    contract_url TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Sales_Agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.Property_Sales(id) ON DELETE SET NULL,
    contract_url TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Contracted_Tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lease_id UUID REFERENCES public.Lease_Agreements(id) ON DELETE CASCADE,
    tenant_name TEXT NOT NULL,
    move_in_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Contracted_Buyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID REFERENCES public.Property_Sales(id) ON DELETE CASCADE,
    contract_date DATE NOT NULL DEFAULT CURRENT_DATE,
    final_price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Purchase_Offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.Property_Sales(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.Leads_Buyers(id) ON DELETE CASCADE,
    offer_price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Payment_Workflow (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.Property_Sales(id) ON DELETE CASCADE,
    stage TEXT NOT NULL DEFAULT 'escrow' CHECK (stage IN ('escrow', 'tax_payment', 'transfer', 'closing')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Finance & Ledgers (4 Tables)
CREATE TABLE IF NOT EXISTS public.Rental_Ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.Property_Rentals(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Sales_Ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.Property_Sales(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Earnest_Money_Receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES public.Property_Sales(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Deposit_Receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL, -- Can be rent or sale
    amount NUMERIC NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Operations & Vendors (5 Tables)
CREATE TABLE IF NOT EXISTS public.Agent_Directory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    rating NUMERIC DEFAULT 5.0 CHECK (rating BETWEEN 0 AND 5),
    contact_info JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.Maintenance_Vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_name TEXT NOT NULL,
    specialty TEXT NOT NULL,
    contact_info JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.Maintenance_Quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.Property_Rentals(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES public.Maintenance_Vendors(id) ON DELETE CASCADE,
    quoted_amount NUMERIC NOT NULL DEFAULT 0,
    quote_file_path TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Interior_Designers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_info JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.Escrow_Legal_Services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_info JSONB DEFAULT '{}'
);

-- 7. Support & AI (4 Tables)
CREATE TABLE IF NOT EXISTS public.Blog_Posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.Glossary_Terms (
    id SERIAL PRIMARY KEY,
    term_zh TEXT NOT NULL,
    term_en TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS public.AI_Chat_Logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    content JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.System_Notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================================
-- RLS POLICIES
-- ======================================================================================

-- Enable RLS for all tables
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' ENABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- Policies for users_profile
CREATE POLICY "Users can view and edit own profile" ON users_profile
    FOR ALL USING (auth.uid() = id);

-- Policies for Property_Sales & Rentals (Owner based)
CREATE POLICY "Owners can manage their own sales properties" ON Property_Sales
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Owners can manage their own rental properties" ON Property_Rentals
    FOR ALL USING (auth.uid() = owner_id);

-- Add more RLS policies as needed based on the logic...
-- (Standard pattern: auth.uid() = owner_id or subquery check on property_id)

-- ======================================================================================
-- INDEXES
-- ======================================================================================
CREATE INDEX idx_users_role ON users_profile(role);
CREATE INDEX idx_prop_sales_owner ON Property_Sales(owner_id);
CREATE INDEX idx_prop_rentals_owner ON Property_Rentals(owner_id);
CREATE INDEX idx_leads_tenants_owner ON Leads_Tenants(owner_id);
CREATE INDEX idx_leads_buyers_owner ON Leads_Buyers(owner_id);
CREATE INDEX idx_ai_logs_user ON AI_Chat_Logs(user_id);
CREATE INDEX idx_notifications_unread ON System_Notifications(user_id) WHERE is_read = FALSE;
