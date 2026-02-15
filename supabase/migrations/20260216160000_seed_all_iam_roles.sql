-- ==============================================================================
-- Seed all IAM roles (full list for Superadmin role dropdown)
-- Date: 2026-02-16
-- Description: Ensures iam_roles contains every role used in the system so
--              Superadmin "Invite User" and "Edit Group" can select any role.
-- ==============================================================================

INSERT INTO public.iam_roles (name, description) VALUES
    ('super_admin', 'Full system access with no restrictions'),
    ('landlord', 'Property owner access: Manage own properties and contracts'),
    ('tenant', 'Tenant access: View own contracts and pay rent'),
    ('contract_tenant', '合約承租人 - Tenants with active lease contracts'),
    ('potential_tenant', 'Limited access: View public listings and make appointments'),
    ('buyer', 'Buyer access: View own purchase-related data'),
    ('contract_buyer', '合約買方 - Buyers with active purchase contracts'),
    ('potential_buyer', '潛在買方 - Users interested in buying properties'),
    ('agent', 'Agent access: Manage authorized landlord properties and contracts'),
    ('vendor', 'Service provider access: View assigned work orders'),
    ('service_provider', '服務提供者 - Service providers and contractors'),
    ('auditor', 'Read-only access to financial records'),
    ('register', 'Registered user with no IAM group/role yet (default for sync)'),
    ('unregister', '未註冊使用者 - Anonymous visitors or unverified accounts'),
    ('system_engineer', 'Technical staff: system maintenance and DevOps'),
    ('cybersecurity_engineer', 'Security staff: audits and threat monitoring')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
