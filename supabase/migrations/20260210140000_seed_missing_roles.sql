-- ==============================================================================
-- Seed Missing Roles for RBAC
-- Date: 2026-02-10
-- Description: Ensures all 10 standard roles requested by the user are present in the database.
--              Includes Chinese descriptions for better UI experience.
-- ==============================================================================

-- 1. Insert or Update Roles
-- We use ON CONFLICT to ensure idempotency. If the role exists, we update the description to include Chinese.

INSERT INTO public.iam_roles (name, description) VALUES
    ('contract_tenant', '合約承租人 - Tenants with active lease contracts'),
    ('contract_buyer', '合約買方 - Buyers with active purchase contracts'),
    ('potential_tenant', '潛在承租人 - Users interested in renting properties'),
    ('potential_buyer', '潛在買方 - Users interested in buying properties'),
    ('unregister', '未註冊使用者 - Anonymous visitors or unverified accounts'),
    ('register', '已註冊使用者 - Basic authenticated users'),
    ('vendor', '供應商 - Service providers and contractors'),
    ('auditor', '稽核人員 - Financial and compliance auditors'),
    ('system_engineer', '系統工程師 - Technical infrastructure maintenance'),
    ('cybersecurity_engineer', '資安工程師 - Security operations and monitoring')
ON CONFLICT (name) 
DO UPDATE SET description = EXCLUDED.description;
