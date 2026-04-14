CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL,

  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  transaction_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_id ON public.financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_property_id ON public.financial_transactions(property_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_transaction_date ON public.financial_transactions(transaction_date);

CREATE TRIGGER update_financial_transactions_updated_at
    BEFORE UPDATE ON public.financial_transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.is_property_owner(p_property_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.Property_Sales WHERE id = p_property_id AND owner_id = p_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.Property_Rentals WHERE id = p_property_id AND owner_id = p_user_id
  );
END;
$$;

CREATE POLICY "Landlords can view their own property transactions"
  ON public.financial_transactions
  FOR SELECT
  TO authenticated
  USING (
    public.is_property_owner(property_id, auth.uid())
  );

CREATE POLICY "Landlords can insert their own property transactions"
  ON public.financial_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_property_owner(property_id, auth.uid())
  );

CREATE POLICY "Landlords can update their own property transactions"
  ON public.financial_transactions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_property_owner(property_id, auth.uid())
  )
  WITH CHECK (
    public.is_property_owner(property_id, auth.uid())
  );

CREATE POLICY "Landlords can delete their own property transactions"
  ON public.financial_transactions
  FOR DELETE
  TO authenticated
  USING (
    public.is_property_owner(property_id, auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_transactions TO authenticated;
REVOKE ALL ON public.financial_transactions FROM anon;