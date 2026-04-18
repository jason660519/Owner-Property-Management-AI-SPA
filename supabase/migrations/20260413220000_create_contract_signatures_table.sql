
-- Create contract_signatures table
CREATE TABLE contract_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID NOT NULL, -- Assuming a 'contracts' table exists or will be created
    signer_id UUID NOT NULL REFERENCES auth.users(id), -- Assuming signers are auth.users
    signature_type TEXT NOT NULL, -- e.g., 'handwritten', 'typed'
    signature_data TEXT, -- Or JSONB if more complex data
    ip_address INET,
    user_agent TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_contract_signatures_contract_id ON contract_signatures(contract_id);
CREATE INDEX idx_contract_signatures_signer_id ON contract_signatures(signer_id);

-- Enable RLS
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;

-- Policies (to be refined based on actual contract ownership logic)
-- Allow authenticated users to view their own signatures
CREATE POLICY "Allow authenticated users to view their own signatures" ON contract_signatures
FOR SELECT USING (auth.uid() = signer_id);

-- Allow authenticated users to insert their own signatures
CREATE POLICY "Allow authenticated users to insert their own signatures" ON contract_signatures
FOR INSERT WITH CHECK (auth.uid() = signer_id);

-- No update/delete policies for now, assuming signatures are immutable once created.
-- Further policies will be needed based on contract ownership and permissions.
