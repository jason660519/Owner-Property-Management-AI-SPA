-- ============================================================================
-- Phase C: IAM-controlled RLS policies for core business tables
-- These are ADDITIVE — existing landlord/agent policies are untouched.
--
-- check_user_permission(user_id, resource, action) returns:
--   'all'      → full table access
--   'own'      → own rows only  (owner/tenant/created_by = auth.uid())
--   'assigned' → handled by existing agent policies; treated as false here
--   NULL       → no access
--
-- Resource → table mapping:
--   rental_properties → property_rentals   (owner_id)
--   sales_properties  → property_sales     (owner_id)
--   lease_contracts   → lease_agreements   (landlord_id, tenant_id)
--   rental_ledger     → rental_ledger      (tenant_id, created_by)
--   sales_ledger      → sales_ledger       (created_by)
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- property_rentals  (IAM resource: rental_properties)
-- Gaps filled: super_admin manage, tenant/register/unregister/auditor/
--              system_engineer/contract_tenant read
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "iam_controlled_read"       ON public.property_rentals;
DROP POLICY IF EXISTS "iam_managed_full_access"   ON public.property_rentals;

CREATE POLICY "iam_controlled_read"
  ON public.property_rentals FOR SELECT
  USING (
    CASE check_user_permission(auth.uid(), 'rental_properties', 'read')
      WHEN 'all' THEN true
      WHEN 'own' THEN owner_id = auth.uid()
      ELSE false
    END
  );

CREATE POLICY "iam_managed_full_access"
  ON public.property_rentals FOR ALL
  USING (check_user_permission(auth.uid(), 'rental_properties', 'manage') = 'all');


-- ─────────────────────────────────────────────────────────────────────────────
-- property_sales  (IAM resource: sales_properties)
-- Gaps filled: super_admin manage, buyer/contract_buyer/register/unregister/
--              auditor/system_engineer read
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "iam_controlled_read"       ON public.property_sales;
DROP POLICY IF EXISTS "iam_managed_full_access"   ON public.property_sales;

CREATE POLICY "iam_controlled_read"
  ON public.property_sales FOR SELECT
  USING (
    CASE check_user_permission(auth.uid(), 'sales_properties', 'read')
      WHEN 'all' THEN true
      WHEN 'own' THEN owner_id = auth.uid()
      ELSE false
    END
  );

CREATE POLICY "iam_managed_full_access"
  ON public.property_sales FOR ALL
  USING (check_user_permission(auth.uid(), 'sales_properties', 'manage') = 'all');


-- ─────────────────────────────────────────────────────────────────────────────
-- lease_agreements  (IAM resource: lease_contracts)
-- Gaps filled: super_admin/auditor read all, tenant/contract_tenant read own
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "iam_controlled_read"       ON public.lease_agreements;
DROP POLICY IF EXISTS "iam_managed_full_access"   ON public.lease_agreements;

CREATE POLICY "iam_controlled_read"
  ON public.lease_agreements FOR SELECT
  USING (
    CASE check_user_permission(auth.uid(), 'lease_contracts', 'read')
      WHEN 'all' THEN true
      WHEN 'own' THEN landlord_id = auth.uid() OR tenant_id = auth.uid()
      ELSE false
    END
  );

CREATE POLICY "iam_managed_full_access"
  ON public.lease_agreements FOR ALL
  USING (check_user_permission(auth.uid(), 'lease_contracts', 'manage') = 'all');


-- ─────────────────────────────────────────────────────────────────────────────
-- rental_ledger  (IAM resource: rental_ledger)
-- Gaps filled: super_admin/auditor read all, tenant/contract_tenant read own
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "iam_controlled_read"       ON public.rental_ledger;
DROP POLICY IF EXISTS "iam_managed_full_access"   ON public.rental_ledger;

CREATE POLICY "iam_controlled_read"
  ON public.rental_ledger FOR SELECT
  USING (
    CASE check_user_permission(auth.uid(), 'rental_ledger', 'read')
      WHEN 'all' THEN true
      WHEN 'own' THEN tenant_id = auth.uid() OR created_by = auth.uid()
      ELSE false
    END
  );

CREATE POLICY "iam_managed_full_access"
  ON public.rental_ledger FOR ALL
  USING (check_user_permission(auth.uid(), 'rental_ledger', 'manage') = 'all');


-- ─────────────────────────────────────────────────────────────────────────────
-- sales_ledger  (IAM resource: sales_ledger)
-- Gaps filled: super_admin/auditor read all, buyer/contract_buyer read own
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "iam_controlled_read"       ON public.sales_ledger;
DROP POLICY IF EXISTS "iam_managed_full_access"   ON public.sales_ledger;

CREATE POLICY "iam_controlled_read"
  ON public.sales_ledger FOR SELECT
  USING (
    CASE check_user_permission(auth.uid(), 'sales_ledger', 'read')
      WHEN 'all' THEN true
      WHEN 'own' THEN created_by = auth.uid()
      ELSE false
    END
  );

CREATE POLICY "iam_managed_full_access"
  ON public.sales_ledger FOR ALL
  USING (check_user_permission(auth.uid(), 'sales_ledger', 'manage') = 'all');
