-- Migration: Create People Database RLS Policies
-- Date: 2026-04-12
-- Description: Create RLS policies for people database - superadmin only access

-- === PEOPLE_RECORDS RLS POLICIES ===

-- Deny all by default
CREATE POLICY "Deny all" ON public.people_records
    AS RESTRICTIVE FOR ALL
    USING (false);

-- Allow superadmin to SELECT
CREATE POLICY "Superadmin select" ON public.people_records
    FOR SELECT
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to INSERT
CREATE POLICY "Superadmin insert" ON public.people_records
    FOR INSERT
    WITH CHECK (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to UPDATE
CREATE POLICY "Superadmin update" ON public.people_records
    FOR UPDATE
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    )
    WITH CHECK (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to DELETE
CREATE POLICY "Superadmin delete" ON public.people_records
    FOR DELETE
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Service role bypass for backend operations
CREATE POLICY "Service role all" ON public.people_records
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- === IMPORT_BATCHES RLS POLICIES ===

-- Deny all by default
CREATE POLICY "Deny all" ON public.import_batches
    AS RESTRICTIVE FOR ALL
    USING (false);

-- Allow superadmin to SELECT
CREATE POLICY "Superadmin select" ON public.import_batches
    FOR SELECT
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to INSERT
CREATE POLICY "Superadmin insert" ON public.import_batches
    FOR INSERT
    WITH CHECK (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to UPDATE
CREATE POLICY "Superadmin update" ON public.import_batches
    FOR UPDATE
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    )
    WITH CHECK (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to DELETE
CREATE POLICY "Superadmin delete" ON public.import_batches
    FOR DELETE
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Service role bypass for backend operations
CREATE POLICY "Service role all" ON public.import_batches
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- === PEOPLE_DUPLICATES RLS POLICIES ===

-- Deny all by default
CREATE POLICY "Deny all" ON public.people_duplicates
    AS RESTRICTIVE FOR ALL
    USING (false);

-- Allow superadmin to SELECT
CREATE POLICY "Superadmin select" ON public.people_duplicates
    FOR SELECT
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to INSERT
CREATE POLICY "Superadmin insert" ON public.people_duplicates
    FOR INSERT
    WITH CHECK (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to UPDATE
CREATE POLICY "Superadmin update" ON public.people_duplicates
    FOR UPDATE
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    )
    WITH CHECK (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Allow superadmin to DELETE
CREATE POLICY "Superadmin delete" ON public.people_duplicates
    FOR DELETE
    USING (
        (SELECT auth.uid() IS NOT NULL AND 
         EXISTS (
             SELECT 1 FROM public.iam_user_roles iur
             JOIN public.iam_roles ir ON ir.id = iur.role_id
             WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
         ))
    );

-- Service role bypass for backend operations
CREATE POLICY "Service role all" ON public.people_duplicates
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
