-- Migration: Create Corrected People Database RLS Policies
-- Date: 2026-04-12
-- Description: RLS policies using correct iam_roles structure with super_admin role check

-- === DROP EXISTING BROKEN POLICIES ===

-- Drop all existing policies for people_records
DROP POLICY IF EXISTS "people_records_deny_all" ON public.people_records;
DROP POLICY IF EXISTS "people_records_allow_superadmin_select" ON public.people_records;
DROP POLICY IF EXISTS "people_records_allow_superadmin_insert" ON public.people_records;
DROP POLICY IF EXISTS "people_records_allow_superadmin_update" ON public.people_records;
DROP POLICY IF EXISTS "people_records_allow_superadmin_delete" ON public.people_records;

-- Drop all existing policies for import_batches
DROP POLICY IF EXISTS "import_batches_deny_all" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_allow_superadmin_select" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_allow_superadmin_insert" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_allow_superadmin_update" ON public.import_batches;
DROP POLICY IF EXISTS "import_batches_allow_superadmin_delete" ON public.import_batches;

-- Drop all existing policies for people_duplicates
DROP POLICY IF EXISTS "people_duplicates_deny_all" ON public.people_duplicates;
DROP POLICY IF EXISTS "people_duplicates_allow_superadmin_select" ON public.people_duplicates;
DROP POLICY IF EXISTS "people_duplicates_allow_superadmin_insert" ON public.people_duplicates;
DROP POLICY IF EXISTS "people_duplicates_allow_superadmin_update" ON public.people_duplicates;
DROP POLICY IF EXISTS "people_duplicates_allow_superadmin_delete" ON public.people_duplicates;

-- === PEOPLE_RECORDS RLS POLICIES ===

-- Deny all by default (restrictive policy)
CREATE POLICY "people_records_deny_all" ON public.people_records
    AS RESTRICTIVE FOR ALL
    USING (false);

-- Allow superadmin (SELECT)
CREATE POLICY "people_records_superadmin_select" ON public.people_records
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (INSERT)
CREATE POLICY "people_records_superadmin_insert" ON public.people_records
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (UPDATE)
CREATE POLICY "people_records_superadmin_update" ON public.people_records
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (DELETE)
CREATE POLICY "people_records_superadmin_delete" ON public.people_records
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- === IMPORT_BATCHES RLS POLICIES ===

-- Deny all by default (restrictive policy)
CREATE POLICY "import_batches_deny_all" ON public.import_batches
    AS RESTRICTIVE FOR ALL
    USING (false);

-- Allow superadmin (SELECT)
CREATE POLICY "import_batches_superadmin_select" ON public.import_batches
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (INSERT)
CREATE POLICY "import_batches_superadmin_insert" ON public.import_batches
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (UPDATE)
CREATE POLICY "import_batches_superadmin_update" ON public.import_batches
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (DELETE)
CREATE POLICY "import_batches_superadmin_delete" ON public.import_batches
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- === PEOPLE_DUPLICATES RLS POLICIES ===

-- Deny all by default (restrictive policy)
CREATE POLICY "people_duplicates_deny_all" ON public.people_duplicates
    AS RESTRICTIVE FOR ALL
    USING (false);

-- Allow superadmin (SELECT)
CREATE POLICY "people_duplicates_superadmin_select" ON public.people_duplicates
    FOR SELECT
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (INSERT)
CREATE POLICY "people_duplicates_superadmin_insert" ON public.people_duplicates
    FOR INSERT
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (UPDATE)
CREATE POLICY "people_duplicates_superadmin_update" ON public.people_duplicates
    FOR UPDATE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    )
    WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Allow superadmin (DELETE)
CREATE POLICY "people_duplicates_superadmin_delete" ON public.people_duplicates
    FOR DELETE
    USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );
