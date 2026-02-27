-- Seed role permissions for new escrow_accounts resource
-- This migration assumes iam_roles IDs from 20260226200000_reset_role_permissions_16_resources.sql
-- and only adds/updates the new resource; existing 16 resources remain unchanged.

-- super_admin: full access to escrow accounts
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','escrow_accounts','{create,read,update,delete,manage}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions,
      scope   = EXCLUDED.scope;

-- auditor: read-only access to escrow accounts
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','escrow_accounts','{read}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions,
      scope   = EXCLUDED.scope;

