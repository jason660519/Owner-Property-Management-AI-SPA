-- Migration: Create People Database Tables
-- Date: 2026-04-12
-- Description: Create tables for people database functionality: people_records, import_batches, people_duplicates

-- Create import_batches table (dependency for people_records)
CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  description TEXT,
  data_source TEXT NOT NULL, -- "台北市里長", "企業名錄", etc
  total_records INT,
  processed_records INT DEFAULT 0,
  skipped_records INT DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending | processing | completed | failed | rolled_back
  error_message TEXT,
  
  -- Audit fields
  imported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT import_batches_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'rolled_back'))
);

-- Create people_records table
CREATE TABLE IF NOT EXISTS public.people_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id TEXT UNIQUE NOT NULL,
  import_batch_id UUID NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  
  -- Core fields
  name TEXT NOT NULL,
  id_number TEXT,
  phone TEXT,
  address TEXT,
  organization TEXT,
  title_position TEXT,
  
  -- Data source info
  data_source TEXT NOT NULL, -- "台北市里長", "企業名錄", etc
  source_file_path TEXT,
  source_document_id TEXT,
  
  -- Quality indicators
  ocr_confidence FLOAT DEFAULT 1.0,
  quality_score FLOAT DEFAULT 0.5,
  duplicate_flag TEXT, -- NULL | "pending_review" | "confirmed_duplicate"
  duplicate_of_id UUID REFERENCES public.people_records(id) ON DELETE SET NULL,
  
  -- Audit fields
  imported_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  CONSTRAINT people_records_ocr_confidence_check CHECK (ocr_confidence >= 0 AND ocr_confidence <= 1),
  CONSTRAINT people_records_quality_score_check CHECK (quality_score >= 0 AND quality_score <= 1),
  CONSTRAINT people_records_duplicate_flag_check CHECK (duplicate_flag IS NULL OR duplicate_flag IN ('pending_review', 'confirmed_duplicate'))
);

-- Create people_duplicates table for managing duplicate relationships
CREATE TABLE IF NOT EXISTS public.people_duplicates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_record_id UUID NOT NULL REFERENCES public.people_records(id) ON DELETE CASCADE,
  duplicate_record_id UUID NOT NULL REFERENCES public.people_records(id) ON DELETE CASCADE,
  
  similarity_score FLOAT,
  review_status TEXT DEFAULT 'pending', -- pending | approved | rejected
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(primary_record_id, duplicate_record_id),
  CONSTRAINT people_duplicates_similarity_check CHECK (similarity_score IS NULL OR (similarity_score >= 0 AND similarity_score <= 1)),
  CONSTRAINT people_duplicates_review_status_check CHECK (review_status IN ('pending', 'approved', 'rejected'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_people_records_import_batch_id ON public.people_records(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_people_records_record_id ON public.people_records(record_id);
CREATE INDEX IF NOT EXISTS idx_people_records_data_source ON public.people_records(data_source);
CREATE INDEX IF NOT EXISTS idx_people_records_created_at ON public.people_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_people_records_quality_score ON public.people_records(quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_people_records_duplicate_flag ON public.people_records(duplicate_flag) WHERE duplicate_flag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_duplicates_primary_record_id ON public.people_duplicates(primary_record_id);
CREATE INDEX IF NOT EXISTS idx_people_duplicates_duplicate_record_id ON public.people_duplicates(duplicate_record_id);
CREATE INDEX IF NOT EXISTS idx_people_duplicates_review_status ON public.people_duplicates(review_status) WHERE review_status = 'pending';

-- Enable RLS
ALTER TABLE public.people_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_duplicates ENABLE ROW LEVEL SECURITY;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_people_records_updated_at
    BEFORE UPDATE ON public.people_records
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_import_batches_updated_at
    BEFORE UPDATE ON public.import_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_batches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.people_duplicates TO authenticated;
