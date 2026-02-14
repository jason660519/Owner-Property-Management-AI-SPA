-- ==============================================================================
-- Phase 2: IAM Roles & Groups for Option A (Single Source of Truth)
-- Date: 2026-02-14
-- Description: Add missing roles (agent, buyer), Agents group, relax profile.role CHECK.
--              See docs/operational-guides/iam/iam_single_source_option_a.md
-- ==============================================================================

-- 1. Add missing iam_roles (agent, buyer; register for sync default) for PERMISSION_ARCHITECTURE
INSERT INTO public.iam_roles (name, description) VALUES
    ('agent', 'Agent access: Manage authorized landlord properties and contracts'),
    ('buyer', 'Buyer access: View own purchase-related data (contract_buyer = with active contract)'),
    ('register', 'Registered user with no IAM group/role yet (default for sync)')
ON CONFLICT (name) DO NOTHING;

-- 2. Add Agents group and link to agent role
INSERT INTO public.iam_groups (name, description, is_system_managed) VALUES
    ('Agents', 'Real estate agents managing authorized landlord properties', false)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.iam_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM public.iam_groups g, public.iam_roles r
WHERE g.name = 'Agents' AND r.name = 'agent'
ON CONFLICT (group_id, role_id) DO NOTHING;

-- 3. Allow profile.role to hold any IAM role (for trigger-written cache in Phase 3)
--    Current CHECK (role IN ('landlord','agent')) would block trigger from writing tenant, auditor, etc.
ALTER TABLE public.users_profile
    DROP CONSTRAINT IF EXISTS users_profile_role_check;

-- No new CHECK: role/primary_role are filled by trigger from get_user_roles(); any role name is valid.
