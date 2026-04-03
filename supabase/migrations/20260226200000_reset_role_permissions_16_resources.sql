-- Reset role permissions to use 16 new resource IDs
-- Removes the 7 old resource names and inserts role-appropriate defaults

DO $$
DECLARE
  role_super_admin UUID;
  role_system_engineer UUID;
  role_cybersecurity_engineer UUID;
  role_auditor UUID;
  role_landlord UUID;
  role_agent UUID;
  role_tenant UUID;
  role_contract_tenant UUID;
  role_buyer UUID;
  role_contract_buyer UUID;
  role_potential_buyer UUID;
  role_potential_tenant UUID;
  role_vendor UUID;
  role_service_provider UUID;
  role_register UUID;
BEGIN
  -- Get Role IDs
  SELECT id INTO role_super_admin FROM public.iam_roles WHERE name = 'super_admin';
  SELECT id INTO role_system_engineer FROM public.iam_roles WHERE name = 'system_engineer';
  SELECT id INTO role_cybersecurity_engineer FROM public.iam_roles WHERE name = 'cybersecurity_engineer';
  SELECT id INTO role_auditor FROM public.iam_roles WHERE name = 'auditor';
  SELECT id INTO role_landlord FROM public.iam_roles WHERE name = 'landlord';
  SELECT id INTO role_agent FROM public.iam_roles WHERE name = 'agent';
  SELECT id INTO role_tenant FROM public.iam_roles WHERE name = 'tenant';
  SELECT id INTO role_contract_tenant FROM public.iam_roles WHERE name = 'contract_tenant';
  SELECT id INTO role_buyer FROM public.iam_roles WHERE name = 'buyer';
  SELECT id INTO role_contract_buyer FROM public.iam_roles WHERE name = 'contract_buyer';
  SELECT id INTO role_potential_buyer FROM public.iam_roles WHERE name = 'potential_buyer';
  SELECT id INTO role_potential_tenant FROM public.iam_roles WHERE name = 'potential_tenant';
  SELECT id INTO role_vendor FROM public.iam_roles WHERE name = 'vendor';
  SELECT id INTO role_service_provider FROM public.iam_roles WHERE name = 'service_provider';
  SELECT id INTO role_register FROM public.iam_roles WHERE name = 'register';

  -- Step 1: Remove old resource names
  DELETE FROM public.iam_role_permissions
  WHERE resource IN ('Properties','Users','Contracts','Reports','Finance','Logs','Config');

  -- Step 2: Insert new permissions per role

  -- super_admin
  IF role_super_admin IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_super_admin,'rental_properties',    '{create,read,update,delete,manage}','all'),
      (role_super_admin,'sales_properties',     '{create,read,update,delete,manage}','all'),
      (role_super_admin,'buildings',            '{create,read,update,delete,manage}','all'),
      (role_super_admin,'lease_contracts',      '{create,read,update,delete,manage}','all'),
      (role_super_admin,'sales_contracts',      '{create,read,update,delete,manage}','all'),
      (role_super_admin,'agent_authorizations', '{create,read,update,delete,manage}','all'),
      (role_super_admin,'rental_ledger',        '{create,read,update,delete,manage}','all'),
      (role_super_admin,'sales_ledger',         '{create,read,update,delete,manage}','all'),
      (role_super_admin,'bank_accounts',        '{create,read,update,delete,manage}','all'),
      (role_super_admin,'iam_users',            '{create,read,update,delete,manage}','all'),
      (role_super_admin,'iam_roles_groups',     '{create,read,update,delete,manage}','all'),
      (role_super_admin,'system_logs',          '{create,read,update,delete,manage}','all'),
      (role_super_admin,'audit_trails',         '{create,read,update,delete,manage}','all'),
      (role_super_admin,'system_config',        '{create,read,update,delete,manage}','all'),
      (role_super_admin,'storage',              '{create,read,update,delete,manage}','all'),
      (role_super_admin,'ai_services',          '{create,read,update,delete,manage}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- system_engineer
  IF role_system_engineer IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_system_engineer,'system_logs',      '{create,read,update,delete,manage}','all'),
      (role_system_engineer,'system_config',    '{create,read,update,delete,manage}','all'),
      (role_system_engineer,'storage',          '{create,read,update,delete,manage}','all'),
      (role_system_engineer,'ai_services',      '{create,read,update,delete,manage}','all'),
      (role_system_engineer,'audit_trails',     '{read}','all'),
      (role_system_engineer,'iam_users',        '{read}','all'),
      (role_system_engineer,'rental_properties','{read}','all'),
      (role_system_engineer,'sales_properties', '{read}','all'),
      (role_system_engineer,'buildings',        '{read}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- cybersecurity_engineer
  IF role_cybersecurity_engineer IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_cybersecurity_engineer,'audit_trails',     '{create,read,update,delete,manage}','all'),
      (role_cybersecurity_engineer,'system_logs',      '{read}','all'),
      (role_cybersecurity_engineer,'system_config',    '{read}','all'),
      (role_cybersecurity_engineer,'iam_users',        '{read}','all'),
      (role_cybersecurity_engineer,'iam_roles_groups', '{read}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- auditor
  IF role_auditor IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_auditor,'rental_ledger',   '{read}','all'),
      (role_auditor,'sales_ledger',    '{read}','all'),
      (role_auditor,'bank_accounts',   '{read}','all'),
      (role_auditor,'lease_contracts', '{read}','all'),
      (role_auditor,'sales_contracts', '{read}','all'),
      (role_auditor,'audit_trails',    '{read}','all'),
      (role_auditor,'rental_properties','{read}','all'),
      (role_auditor,'sales_properties', '{read}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- landlord
  IF role_landlord IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_landlord,'rental_properties',    '{create,read,update,delete}','own'),
      (role_landlord,'buildings',            '{create,read,update,delete}','own'),
      (role_landlord,'lease_contracts',      '{create,read,update,delete}','own'),
      (role_landlord,'rental_ledger',        '{create,read,update,delete}','own'),
      (role_landlord,'agent_authorizations', '{create,read,update,delete}','own'),
      (role_landlord,'storage',              '{create,read}','own')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- agent
  IF role_agent IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_agent,'rental_properties',    '{create,read,update}','assigned'),
      (role_agent,'sales_properties',     '{create,read,update}','assigned'),
      (role_agent,'buildings',            '{read}','assigned'),
      (role_agent,'lease_contracts',      '{create,read,update}','assigned'),
      (role_agent,'sales_contracts',      '{create,read,update}','assigned'),
      (role_agent,'agent_authorizations', '{create,read,update,delete}','own'),
      (role_agent,'rental_ledger',        '{read}','assigned'),
      (role_agent,'sales_ledger',         '{read}','assigned'),
      (role_agent,'storage',              '{create,read}','assigned')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- tenant
  IF role_tenant IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_tenant,'rental_properties','{read}','all'),
      (role_tenant,'lease_contracts',  '{read}','own'),
      (role_tenant,'rental_ledger',    '{read}','own'),
      (role_tenant,'storage',          '{read}','own')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- contract_tenant
  IF role_contract_tenant IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_contract_tenant,'rental_properties','{read}','all'),
      (role_contract_tenant,'buildings',        '{read}','assigned'),
      (role_contract_tenant,'lease_contracts',  '{read}','own'),
      (role_contract_tenant,'rental_ledger',    '{create,read,update,delete}','own'),
      (role_contract_tenant,'storage',          '{create,read}','own')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- buyer
  IF role_buyer IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_buyer,'sales_properties','{read}','all'),
      (role_buyer,'sales_contracts', '{read}','own'),
      (role_buyer,'sales_ledger',    '{read}','own')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- contract_buyer
  IF role_contract_buyer IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_contract_buyer,'sales_properties','{read}','all'),
      (role_contract_buyer,'sales_contracts', '{read}','own'),
      (role_contract_buyer,'sales_ledger',    '{create,read,update,delete}','own'),
      (role_contract_buyer,'storage',         '{create,read}','own')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- potential_buyer
  IF role_potential_buyer IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_potential_buyer,'sales_properties',  '{read}','all'),
      (role_potential_buyer,'rental_properties', '{read}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- potential_tenant
  IF role_potential_tenant IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_potential_tenant,'rental_properties','{read}','all'),
      (role_potential_tenant,'sales_properties', '{read}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- vendor
  IF role_vendor IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_vendor,'buildings',         '{read}','assigned'),
      (role_vendor,'rental_properties', '{read}','assigned'),
      (role_vendor,'storage',           '{create,read}','assigned')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- service_provider
  IF role_service_provider IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_service_provider,'buildings',         '{read,update}','assigned'),
      (role_service_provider,'rental_properties', '{read}','assigned'),
      (role_service_provider,'storage',           '{create,read}','assigned')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

  -- register
  IF role_register IS NOT NULL THEN
    INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
      (role_register,'rental_properties','{read}','all'),
      (role_register,'sales_properties', '{read}','all')
    ON CONFLICT (role_id, resource) DO UPDATE
      SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
  END IF;

END $$;
