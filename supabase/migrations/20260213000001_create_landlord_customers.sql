
-- Create landlord_customers table
CREATE TABLE IF NOT EXISTS public.landlord_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'potential', -- 'potential', 'active', 'inactive'
    emergency_contact TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_landlord_customers_landlord ON public.landlord_customers(landlord_id);
CREATE INDEX idx_landlord_customers_name ON public.landlord_customers(name);
CREATE INDEX idx_landlord_customers_phone ON public.landlord_customers(phone);

-- Enable RLS
ALTER TABLE public.landlord_customers ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "landlords_manage_customers" ON public.landlord_customers
    FOR ALL
    USING (landlord_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_landlord_customers_updated_at BEFORE UPDATE ON public.landlord_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
