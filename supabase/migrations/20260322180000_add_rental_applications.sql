-- Rental applications submitted by prospective tenants
CREATE TABLE IF NOT EXISTS rental_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  landlord_id UUID NOT NULL REFERENCES users_profile(id),
  applicant_id UUID NOT NULL REFERENCES users_profile(id),

  -- Offer details
  offer_amount NUMERIC(10, 2) NOT NULL,
  lease_term_months INTEGER NOT NULL DEFAULT 12,
  desired_move_in DATE,

  -- Applicant snapshot (in case profile changes later)
  applicant_name TEXT NOT NULL,
  applicant_phone TEXT,
  applicant_email TEXT,
  employment_status TEXT,            -- 'employed' | 'self_employed' | 'student' | 'other'
  monthly_income NUMERIC(10, 2),
  occupants_count INTEGER DEFAULT 1,
  has_pets BOOLEAN DEFAULT FALSE,
  additional_notes TEXT,

  -- Workflow status
  status TEXT NOT NULL DEFAULT 'draft',
  -- 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'withdrawn'
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users_profile(id),
  submitted_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE rental_applications ENABLE ROW LEVEL SECURITY;

-- Applicant: view their own applications
CREATE POLICY "applicant_select_own" ON rental_applications
  FOR SELECT USING (auth.uid() = applicant_id);

-- Applicant: create new application
CREATE POLICY "applicant_insert_own" ON rental_applications
  FOR INSERT WITH CHECK (auth.uid() = applicant_id);

-- Applicant: update only their own draft applications
CREATE POLICY "applicant_update_draft" ON rental_applications
  FOR UPDATE USING (auth.uid() = applicant_id AND status IN ('draft'));

-- Landlord: view applications for their properties
CREATE POLICY "landlord_select_property_applications" ON rental_applications
  FOR SELECT USING (auth.uid() = landlord_id);

-- Landlord: update status (review / approve / reject)
CREATE POLICY "landlord_update_status" ON rental_applications
  FOR UPDATE USING (auth.uid() = landlord_id);

-- Auto-update updated_at
CREATE TRIGGER rental_applications_updated_at
  BEFORE UPDATE ON rental_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_rental_applications_applicant ON rental_applications (applicant_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_landlord ON rental_applications (landlord_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_property ON rental_applications (property_id);
CREATE INDEX IF NOT EXISTS idx_rental_applications_status ON rental_applications (status);
