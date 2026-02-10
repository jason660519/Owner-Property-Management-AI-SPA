-- ==============================================================================
-- Comprehensive IAM Setup Migration
-- Date: 2026-02-10
-- Description: Implements the comprehensive user group and permission structure
--              requested for the Real Estate Management System.
-- ==============================================================================

-- 1. Insert New Roles (augmenting existing ones)
-- Existing: super_admin, landlord, tenant, vendor, auditor, potential_tenant
-- New mappings needed:
--   contract_tenant -> tenant (Existing)
--   contract_buyer -> contract_buyer (New)
--   potential_tenant -> potential_tenant (Existing)
--   potential_buyer -> potential_buyer (New)
--   system engineers -> system_engineer (New)
--   cybersecurity engineers -> cybersecurity_engineer (New)

INSERT INTO public.iam_roles (name, description) VALUES
    ('contract_buyer', 'Verified buyer with active contracts'),
    ('potential_buyer', 'User interested in buying properties'),
    ('system_engineer', 'Technical staff responsible for system maintenance and DevOps'),
    ('cybersecurity_engineer', 'Security staff responsible for audits and threat monitoring')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Groups (Mapping User Requested Groups to System Groups)

-- 2.1 Customer Groups
INSERT INTO public.iam_groups (name, description, is_system_managed) VALUES
    ('Active Buyers', 'Buyers with active contracts', false),
    ('Potential Tenants', 'Users interested in renting', false),
    ('Potential Buyers', 'Users interested in buying', false)
ON CONFLICT (name) DO NOTHING;

-- 2.2 Partner Groups
INSERT INTO public.iam_groups (name, description, is_system_managed) VALUES
    ('Vendors', 'External service providers and contractors', false),
    ('Financial Auditors', 'External or internal financial auditors', false)
ON CONFLICT (name) DO NOTHING;

-- 2.3 Staff Groups
INSERT INTO public.iam_groups (name, description, is_system_managed) VALUES
    ('System Engineering Team', 'Core infrastructure and backend engineers', true),
    ('Security Operations Center', 'Cybersecurity and compliance team', true)
ON CONFLICT (name) DO NOTHING;

-- 3. Assign Default Roles to Groups (Role Inheritance / Mapping)

-- Helper to insert group roles safely
DO $$
DECLARE
    g_id uuid;
    r_id uuid;
BEGIN
    -- Active Buyers -> contract_buyer
    SELECT id INTO g_id FROM public.iam_groups WHERE name = 'Active Buyers';
    SELECT id INTO r_id FROM public.iam_roles WHERE name = 'contract_buyer';
    IF g_id IS NOT NULL AND r_id IS NOT NULL THEN
        INSERT INTO public.iam_group_roles (group_id, role_id) VALUES (g_id, r_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Potential Tenants -> potential_tenant
    SELECT id INTO g_id FROM public.iam_groups WHERE name = 'Potential Tenants';
    SELECT id INTO r_id FROM public.iam_roles WHERE name = 'potential_tenant';
    IF g_id IS NOT NULL AND r_id IS NOT NULL THEN
        INSERT INTO public.iam_group_roles (group_id, role_id) VALUES (g_id, r_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Potential Buyers -> potential_buyer
    SELECT id INTO g_id FROM public.iam_groups WHERE name = 'Potential Buyers';
    SELECT id INTO r_id FROM public.iam_roles WHERE name = 'potential_buyer';
    IF g_id IS NOT NULL AND r_id IS NOT NULL THEN
        INSERT INTO public.iam_group_roles (group_id, role_id) VALUES (g_id, r_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Vendors -> vendor
    SELECT id INTO g_id FROM public.iam_groups WHERE name = 'Vendors';
    SELECT id INTO r_id FROM public.iam_roles WHERE name = 'vendor';
    IF g_id IS NOT NULL AND r_id IS NOT NULL THEN
        INSERT INTO public.iam_group_roles (group_id, role_id) VALUES (g_id, r_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Financial Auditors -> auditor
    SELECT id INTO g_id FROM public.iam_groups WHERE name = 'Financial Auditors';
    SELECT id INTO r_id FROM public.iam_roles WHERE name = 'auditor';
    IF g_id IS NOT NULL AND r_id IS NOT NULL THEN
        INSERT INTO public.iam_group_roles (group_id, role_id) VALUES (g_id, r_id) ON CONFLICT DO NOTHING;
    END IF;

    -- System Engineering Team -> system_engineer
    SELECT id INTO g_id FROM public.iam_groups WHERE name = 'System Engineering Team';
    SELECT id INTO r_id FROM public.iam_roles WHERE name = 'system_engineer';
    IF g_id IS NOT NULL AND r_id IS NOT NULL THEN
        INSERT INTO public.iam_group_roles (group_id, role_id) VALUES (g_id, r_id) ON CONFLICT DO NOTHING;
    END IF;

    -- Security Operations Center -> cybersecurity_engineer
    SELECT id INTO g_id FROM public.iam_groups WHERE name = 'Security Operations Center';
    SELECT id INTO r_id FROM public.iam_roles WHERE name = 'cybersecurity_engineer';
    IF g_id IS NOT NULL AND r_id IS NOT NULL THEN
        INSERT INTO public.iam_group_roles (group_id, role_id) VALUES (g_id, r_id) ON CONFLICT DO NOTHING;
    END IF;
    
    -- Security Operations Center -> auditor (Inheritance: Security implies Audit capability)
    SELECT id INTO g_id FROM public.iam_groups WHERE name = 'Security Operations Center';
    SELECT id INTO r_id FROM public.iam_roles WHERE name = 'auditor';
    IF g_id IS NOT NULL AND r_id IS NOT NULL THEN
        INSERT INTO public.iam_group_roles (group_id, role_id) VALUES (g_id, r_id) ON CONFLICT DO NOTHING;
    END IF;

END $$;
