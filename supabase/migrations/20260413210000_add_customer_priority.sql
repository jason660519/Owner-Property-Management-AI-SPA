-- Add priority column to landlord_customers for grid drag-and-drop ordering
ALTER TABLE public.landlord_customers
  ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;

-- Index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_landlord_customers_priority
  ON public.landlord_customers(landlord_id, priority);
