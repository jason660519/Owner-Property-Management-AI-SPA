ALTER TABLE public.contact_messages
ADD COLUMN IF NOT EXISTS source_path TEXT,
ADD COLUMN IF NOT EXISTS source_context JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.contact_messages.source_path IS 'Lead source path captured from public funnel entry points';
COMMENT ON COLUMN public.contact_messages.source_context IS 'Structured source metadata such as entry point, property id, and property title';