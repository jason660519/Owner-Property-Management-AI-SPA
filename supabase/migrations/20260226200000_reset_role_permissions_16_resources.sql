-- Reset role permissions to use 16 new resource IDs
-- Removes the 7 old resource names and inserts role-appropriate defaults

-- Step 1: Remove old resource names
DELETE FROM public.iam_role_permissions
WHERE resource IN ('Properties','Users','Contracts','Reports','Finance','Logs','Config');

-- Step 2: Insert new permissions per role
-- ON CONFLICT: upsert so running twice is safe
-- Resources: rental_properties | sales_properties | buildings
--            lease_contracts   | sales_contracts  | agent_authorizations
--            rental_ledger     | sales_ledger      | bank_accounts
--            iam_users         | iam_roles_groups
--            system_logs | audit_trails | system_config | storage | ai_services

-- ─────────────────────────────────────────────────────────────────────────────
-- super_admin : Full access to everything
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','rental_properties',    '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','sales_properties',     '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','buildings',            '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','lease_contracts',      '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','sales_contracts',      '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','agent_authorizations', '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','rental_ledger',        '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','sales_ledger',         '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','bank_accounts',        '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','iam_users',            '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','iam_roles_groups',     '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','system_logs',          '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','audit_trails',         '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','system_config',        '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','storage',              '{create,read,update,delete,manage}','all'),
  ('6da6777c-a3d6-450a-bbf3-89c7bcb555c0','ai_services',          '{create,read,update,delete,manage}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- system_engineer : System maintenance & DevOps
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','system_logs',      '{create,read,update,delete,manage}','all'),
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','system_config',    '{create,read,update,delete,manage}','all'),
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','storage',          '{create,read,update,delete,manage}','all'),
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','ai_services',      '{create,read,update,delete,manage}','all'),
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','audit_trails',     '{read}','all'),
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','iam_users',        '{read}','all'),
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','rental_properties','{read}','all'),
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','sales_properties', '{read}','all'),
  ('0a6c55e8-578c-4987-9d2f-d5795de94892','buildings',        '{read}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- cybersecurity_engineer : Security audits & threat monitoring
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('3e6bc9f3-3c00-4d72-8a0f-7d8bb9b1e304','audit_trails',     '{create,read,update,delete,manage}','all'),
  ('3e6bc9f3-3c00-4d72-8a0f-7d8bb9b1e304','system_logs',      '{read}','all'),
  ('3e6bc9f3-3c00-4d72-8a0f-7d8bb9b1e304','system_config',    '{read}','all'),
  ('3e6bc9f3-3c00-4d72-8a0f-7d8bb9b1e304','iam_users',        '{read}','all'),
  ('3e6bc9f3-3c00-4d72-8a0f-7d8bb9b1e304','iam_roles_groups', '{read}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- auditor : Read-only financial records
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','rental_ledger',   '{read}','all'),
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','sales_ledger',    '{read}','all'),
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','bank_accounts',   '{read}','all'),
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','lease_contracts', '{read}','all'),
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','sales_contracts', '{read}','all'),
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','audit_trails',    '{read}','all'),
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','rental_properties','{read}','all'),
  ('bbdd558e-04e4-4500-857d-3bc68e3eef38','sales_properties', '{read}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- landlord : Manage own properties & contracts
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('c1a46754-c534-430f-a05a-707b7a5540f2','rental_properties',    '{create,read,update,delete}','own'),
  ('c1a46754-c534-430f-a05a-707b7a5540f2','buildings',            '{create,read,update,delete}','own'),
  ('c1a46754-c534-430f-a05a-707b7a5540f2','lease_contracts',      '{create,read,update,delete}','own'),
  ('c1a46754-c534-430f-a05a-707b7a5540f2','rental_ledger',        '{create,read,update,delete}','own'),
  ('c1a46754-c534-430f-a05a-707b7a5540f2','agent_authorizations', '{create,read,update,delete}','own'),
  ('c1a46754-c534-430f-a05a-707b7a5540f2','storage',              '{create,read}','own')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- agent : Manage authorized landlord properties
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('bc07f303-2f38-473b-a864-b350876ac47e','rental_properties',    '{create,read,update}','assigned'),
  ('bc07f303-2f38-473b-a864-b350876ac47e','sales_properties',     '{create,read,update}','assigned'),
  ('bc07f303-2f38-473b-a864-b350876ac47e','buildings',            '{read}','assigned'),
  ('bc07f303-2f38-473b-a864-b350876ac47e','lease_contracts',      '{create,read,update}','assigned'),
  ('bc07f303-2f38-473b-a864-b350876ac47e','sales_contracts',      '{create,read,update}','assigned'),
  ('bc07f303-2f38-473b-a864-b350876ac47e','agent_authorizations', '{create,read,update,delete}','own'),
  ('bc07f303-2f38-473b-a864-b350876ac47e','rental_ledger',        '{read}','assigned'),
  ('bc07f303-2f38-473b-a864-b350876ac47e','sales_ledger',         '{read}','assigned'),
  ('bc07f303-2f38-473b-a864-b350876ac47e','storage',              '{create,read}','assigned')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- tenant : View own lease & pay rent
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('55610802-7358-43da-be2b-2140be7a76df','rental_properties','{read}','all'),
  ('55610802-7358-43da-be2b-2140be7a76df','lease_contracts',  '{read}','own'),
  ('55610802-7358-43da-be2b-2140be7a76df','rental_ledger',    '{read}','own'),
  ('55610802-7358-43da-be2b-2140be7a76df','storage',          '{read}','own')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- contract_tenant : Active lease tenant (can update own ledger entries)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('50fff421-4ccc-4972-aad9-1e3a88903fa3','rental_properties','{read}','all'),
  ('50fff421-4ccc-4972-aad9-1e3a88903fa3','buildings',        '{read}','assigned'),
  ('50fff421-4ccc-4972-aad9-1e3a88903fa3','lease_contracts',  '{read}','own'),
  ('50fff421-4ccc-4972-aad9-1e3a88903fa3','rental_ledger',    '{create,read,update,delete}','own'),
  ('50fff421-4ccc-4972-aad9-1e3a88903fa3','storage',          '{create,read}','own')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- buyer : View own purchase data
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('918e5c59-f2b1-4a8c-947a-2edc40e3e0b2','sales_properties','{read}','all'),
  ('918e5c59-f2b1-4a8c-947a-2edc40e3e0b2','sales_contracts', '{read}','own'),
  ('918e5c59-f2b1-4a8c-947a-2edc40e3e0b2','sales_ledger',    '{read}','own')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- contract_buyer : Active purchase contract buyer
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('de62a79c-31dc-44c9-98d9-8dba14e59cd9','sales_properties','{read}','all'),
  ('de62a79c-31dc-44c9-98d9-8dba14e59cd9','sales_contracts', '{read}','own'),
  ('de62a79c-31dc-44c9-98d9-8dba14e59cd9','sales_ledger',    '{create,read,update,delete}','own'),
  ('de62a79c-31dc-44c9-98d9-8dba14e59cd9','storage',         '{create,read}','own')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- potential_buyer : Browsing sales listings
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('cd627b07-b52d-44c2-aa2b-fd5f05b1d8a5','sales_properties',  '{read}','all'),
  ('cd627b07-b52d-44c2-aa2b-fd5f05b1d8a5','rental_properties', '{read}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- potential_tenant : View public listings & make appointments
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('0d8e8095-3880-4cde-a14d-ccc889769d29','rental_properties','{read}','all'),
  ('0d8e8095-3880-4cde-a14d-ccc889769d29','sales_properties', '{read}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- vendor : View assigned work orders
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('1be1bb35-8f78-497b-9f8c-c103f01aafeb','buildings',         '{read}','assigned'),
  ('1be1bb35-8f78-497b-9f8c-c103f01aafeb','rental_properties', '{read}','assigned'),
  ('1be1bb35-8f78-497b-9f8c-c103f01aafeb','storage',           '{create,read}','assigned')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- service_provider : Service providers and contractors
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('3ea06193-ee81-41e5-ad15-b05fad3119b7','buildings',         '{read,update}','assigned'),
  ('3ea06193-ee81-41e5-ad15-b05fad3119b7','rental_properties', '{read}','assigned'),
  ('3ea06193-ee81-41e5-ad15-b05fad3119b7','storage',           '{create,read}','assigned')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- register : Default registered user (no role assigned yet)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('92bec9ef-8f30-413f-adb5-588dd1d4aced','rental_properties','{read}','all'),
  ('92bec9ef-8f30-413f-adb5-588dd1d4aced','sales_properties', '{read}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;

-- ─────────────────────────────────────────────────────────────────────────────
-- unregister : Anonymous visitors (public listings only)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.iam_role_permissions (role_id, resource, actions, scope) VALUES
  ('1b3a8f7d-e492-40c0-9428-0502334dd3e0','rental_properties','{read}','all'),
  ('1b3a8f7d-e492-40c0-9428-0502334dd3e0','sales_properties', '{read}','all')
ON CONFLICT (role_id, resource) DO UPDATE
  SET actions = EXCLUDED.actions, scope = EXCLUDED.scope;
