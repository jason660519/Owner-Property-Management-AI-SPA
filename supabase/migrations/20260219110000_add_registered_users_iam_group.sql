-- ==============================================================================
-- Add Registered Users IAM Group
-- Date: 2026-02-19
-- Description: New group for users who have registered but are not yet in any
--              business group. Attached role: register.
--              See docs/operational-guides/iam/PERMISSION_ARCHITECTURE.md
-- ==============================================================================

-- 1. Ensure register role exists (from phase2 / seed_all_iam_roles)
INSERT INTO public.iam_roles (name, description)
VALUES ('register', 'Registered user with no IAM group/role yet (default for sync)')
ON CONFLICT (name) DO NOTHING;

-- 2. Create Registered Users group
INSERT INTO public.iam_groups (name, description, is_system_managed)
VALUES (
    'Registered Users',
    'Users who have signed up but are not yet assigned to any business group',
    false
)
ON CONFLICT (name) DO NOTHING;

-- 3. Attach register role to Registered Users group
INSERT INTO public.iam_group_roles (group_id, role_id)
SELECT g.id, r.id
FROM public.iam_groups g
CROSS JOIN public.iam_roles r
WHERE g.name = 'Registered Users' AND r.name = 'register'
ON CONFLICT (group_id, role_id) DO NOTHING;
