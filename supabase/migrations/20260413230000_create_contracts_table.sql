
-- Create contracts table
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    party_a_id UUID NOT NULL REFERENCES auth.users(id),
    party_b_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT DEFAULT 'draft' NOT NULL, -- e.g., 'draft', 'sent', 'signed', 'completed', 'cancelled'
    amount NUMERIC(15, 2),
    currency TEXT DEFAULT 'USD',
    document_url TEXT, -- URL to the initial contract document
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_contracts_party_a_id ON contracts(party_a_id);
CREATE INDEX idx_contracts_party_b_id ON contracts(party_b_id);
CREATE INDEX idx_contracts_status ON contracts(status);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Policies (to be refined based on actual access control)
-- Allow authenticated users to view contracts they are a party to
CREATE POLICY "Allow parties to view their contracts" ON contracts
FOR SELECT USING (auth.uid() = party_a_id OR auth.uid() = party_b_id);

-- Allow authenticated users to create contracts where they are a party
CREATE POLICY "Allow authenticated users to create contracts" ON contracts
FOR INSERT WITH CHECK (auth.uid() = party_a_id OR auth.uid() = party_b_id);

-- Allow parties to update their own contracts (e.g., status updates)
CREATE POLICY "Allow parties to update their contracts" ON contracts
FOR UPDATE USING (auth.uid() = party_a_id OR auth.uid() = party_b_id);

-- Update contract_signatures to reference new contracts table
ALTER TABLE contract_signatures
DROP CONSTRAINT contract_signatures_contract_id_fkey; -- Drop old constraint if it existed (it didn't, but good practice)

ALTER TABLE contract_signatures
ADD CONSTRAINT contract_signatures_contract_id_fkey
FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE;

