-- ==============================================================================
-- IAM Group-Based System Migration
-- Created: 2026-02-02
-- Description: Establishes the tables for Groups, Roles, and their Many-to-Many relationships.
-- ==============================================================================

-- 1. Create Roles Table (Definitions of what can be done)
create table if not exists public.iam_roles (
    id uuid primary key default gen_random_uuid(),
    name text not null unique check (char_length(name) > 2),
    description text,
    created_at timestamptz default now()
);

-- 2. Create Groups Table (Collections of users)
create table if not exists public.iam_groups (
    id uuid primary key default gen_random_uuid(),
    name text not null unique check (char_length(name) > 2),
    description text,
    is_system_managed boolean default false, -- If true, UI should block deletion
    created_at timestamptz default now()
);

-- 3. Group Members (User <-> Group)
create table if not exists public.iam_group_members (
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references public.iam_groups(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    joined_at timestamptz default now(),
    unique(group_id, user_id)
);

-- 4. Group Roles Policy Attachment (Group <-> Role)
create table if not exists public.iam_group_roles (
    id uuid primary key default gen_random_uuid(),
    group_id uuid not null references public.iam_groups(id) on delete cascade,
    role_id uuid not null references public.iam_roles(id) on delete cascade,
    assigned_at timestamptz default now(),
    assigned_by uuid references auth.users(id),
    unique(group_id, role_id)
);

-- 5. Direct User Roles (User <-> Role) - For exceptions/overrides
create table if not exists public.iam_user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    role_id uuid not null references public.iam_roles(id) on delete cascade,
    assigned_at timestamptz default now(),
    assigned_by uuid references auth.users(id),
    unique(user_id, role_id)
);

-- ==============================================================================
-- Row Level Security (RLS)
-- ==============================================================================

-- Enable RLS
alter table public.iam_roles enable row level security;
alter table public.iam_groups enable row level security;
alter table public.iam_group_members enable row level security;
alter table public.iam_group_roles enable row level security;
alter table public.iam_user_roles enable row level security;

-- Policy: Readers (Authenticated Users) can view metadata
-- Note: In a real prod environment, you might want to restrict viewing IAM structure to admins only.
-- For now, we allow read to authenticated users so the Frontend can load its own permissions.
create policy "Allow read access to authenticated users"
    on public.iam_roles for select
    to authenticated
    using (true);

create policy "Allow read access to authenticated users"
    on public.iam_groups for select
    to authenticated
    using (true);

-- Policy: Only Super Admins can Modify (Insert/Update/Delete)
-- NOTE: You strictly need a way to identify Super Admin first. 
-- This is a chicken-and-egg problem. Usually, we seed the first admin or use a service_role key.
-- For this script, we will omit the specific "Admin Only" boolean check logic placeholder
-- and assume for now that modifications are done via Service Role (Backend/Console) or restricted later.

-- ==============================================================================
-- Initial Data Seeding (Bootstrap)
-- ==============================================================================

-- Seed Basic Roles (Based on your Access Matrix)
insert into public.iam_roles (name, description) values
    ('super_admin', 'Full system access with no restrictions'),
    ('landlord', 'Property owner access: Manage own properties and contracts'),
    ('tenant', 'Tenant access: View own contracts and pay rent'),
    ('vendor', 'Service provider access: View assigned work orders'),
    ('auditor', 'Read-only access to financial records'),
    ('potential_tenant', 'Limited access: View public listings and make appointments');

-- Seed Basic Groups
insert into public.iam_groups (name, description, is_system_managed) values
    ('Administrators', 'System Super Admins', true),
    ('Standard Landlords', 'Default group for new registered landlords', false),
    ('Active Tenants', 'Tenants with at least one active contract', false);

-- Link Roles to Groups (Example)
-- Note: We use subqueries to get IDs since they are UUIDs
insert into public.iam_group_roles (group_id, role_id)
select g.id, r.id
from public.iam_groups g, public.iam_roles r
where g.name = 'Administrators' and r.name = 'super_admin';

insert into public.iam_group_roles (group_id, role_id)
select g.id, r.id
from public.iam_groups g, public.iam_roles r
where g.name = 'Standard Landlords' and r.name = 'landlord';

insert into public.iam_group_roles (group_id, role_id)
select g.id, r.id
from public.iam_groups g, public.iam_roles r
where g.name = 'Active Tenants' and r.name = 'tenant';

-- ==============================================================================
-- Helper Function: Get User Roles (Flattened)
-- ==============================================================================
-- This function is crucial for the Frontend/RLS to easily query "What roles do I have?"
-- without doing 3 joins every time.

create or replace function public.get_user_roles(lookup_user_id uuid)
returns table (role_name text)
language plpgsql
security definer
as $$
begin
    return query
    -- 1. Direct Roles
    select r.name
    from public.iam_roles r
    join public.iam_user_roles ur on r.id = ur.role_id
    where ur.user_id = lookup_user_id
    
    union
    
    -- 2. Group Roles
    select r.name
    from public.iam_roles r
    join public.iam_group_roles gr on r.id = gr.role_id
    join public.iam_groups g on gr.group_id = g.id
    join public.iam_group_members gm on g.id = gm.group_id
    where gm.user_id = lookup_user_id;
end;
$$;
