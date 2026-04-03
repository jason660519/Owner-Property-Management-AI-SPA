-- Seed role permissions for new escrow_accounts resource
-- This migration assumes iam_roles IDs by name instead of hardcoded UUIDs.

DO $$
DECLARE
  role_super_admin UUID;
  role_auditor UUID;
BEGIN
  SELECT id INTO role_super_admin FROM public.iam_roles WHERE name = 'super_admin';
  SELECT id INTO role_auditor FROM public.iam_roles WHERE name = 'auditor';

  -- super_admin: full access to escrow accounts
  IF role_super_admin IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_super_admin,'escrow_accounts','{create,read,update,delete,manage}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions,
          scope   = EXCLUDED.scope;
  END IF;

  -- auditor: read-only access to escrow accounts
  IF role_auditor IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_auditor,'escrow_accounts','{read}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions,
          scope   = EXCLUDED.scope;
  END IF;

END $$;
