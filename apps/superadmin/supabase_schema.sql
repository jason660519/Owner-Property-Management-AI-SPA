-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS for geospatial queries
CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "extensions";

-- Enable pg_net for network requests
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

-- Enable pg_jieba for Chinese full-text search
-- CREATE EXTENSION IF NOT EXISTS "pg_jieba" WITH SCHEMA "extensions";

-- Clean up existing tables to ensure schema matches requirements
DROP TABLE IF EXISTS roles_permissions CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE; -- Drop the old one too if it exists
DROP TABLE IF EXISTS permissions CASCADE;
-- Note: We keep 'roles', 'functions', 'tables', 'pages' if they exist, but we might need to ensure they are correct.
-- Since functions/tables/pages were created by us previously, they are fine. 'roles' is pre-existing.

-- 1. Roles Table (Existing, but we ensure it has data)
-- We don't recreate 'roles' to avoid breaking other things, but we rely on it.
-- Structure known: id, name, display_name, description...

-- 2. Functions Resource Table
CREATE TABLE IF NOT EXISTS functions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tables Resource Table
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  table_name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Pages Resource Table
CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  path TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Permissions Table
CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('function', 'table', 'page')),
  -- Links
  function_id UUID REFERENCES functions(id) ON DELETE CASCADE,
  table_id UUID REFERENCES tables(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT one_resource_only CHECK (
    (function_id IS NOT NULL AND table_id IS NULL AND page_id IS NULL) OR
    (function_id IS NULL AND table_id IS NOT NULL AND page_id IS NULL) OR
    (function_id IS NULL AND table_id IS NULL AND page_id IS NOT NULL)
  )
);

-- 6. Roles Permissions Junction
CREATE TABLE roles_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role_id, permission_id)
);

-- Seed Data

-- Roles: Ensure we have some roles.
INSERT INTO roles (name, display_name, description) VALUES 
('super_admin', 'Super Admin', 'Full access to everything'),
('property_manager', 'Property Manager', 'Manage properties and tenants'),
('tenant', 'Tenant', 'View own data')
ON CONFLICT (name) DO UPDATE 
SET display_name = EXCLUDED.display_name;

-- Resources
INSERT INTO pages (name, path, description) VALUES 
('Dashboard', '/dashboard', 'Main Dashboard'),
('User Management', '/dashboard/users', 'Manage Users'),
('Role Matrix', '/dashboard/role_access_matrix', 'Manage Permissions')
ON CONFLICT (path) DO NOTHING;

INSERT INTO tables (name, table_name, description) VALUES 
('Users', 'public.users', 'System Users'),
('Properties', 'public.properties', 'Property Listings')
ON CONFLICT (table_name) DO NOTHING;

INSERT INTO functions (name, code, description) VALUES 
('Export Users', 'users.export', 'Export user list to CSV'),
('Approve Property', 'properties.approve', 'Approve property listing')
ON CONFLICT (code) DO NOTHING;

-- Create Permissions
DO $$
DECLARE
  p_dashboard UUID;
  p_users UUID;
  p_matrix UUID;
  t_users UUID;
  f_export UUID;
  r_super_admin UUID;
BEGIN
  SELECT id INTO p_dashboard FROM pages WHERE path = '/dashboard';
  SELECT id INTO p_users FROM pages WHERE path = '/dashboard/users';
  SELECT id INTO p_matrix FROM pages WHERE path = '/dashboard/role_access_matrix';
  SELECT id INTO t_users FROM tables WHERE table_name = 'public.users';
  SELECT id INTO f_export FROM functions WHERE code = 'users.export';
  
  SELECT id INTO r_super_admin FROM roles WHERE name = 'super_admin';

  -- Create permissions
  INSERT INTO permissions (name, resource_type, page_id) 
  SELECT 'View Dashboard', 'page', p_dashboard
  WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE page_id = p_dashboard);

  INSERT INTO permissions (name, resource_type, page_id) 
  SELECT 'View User Management', 'page', p_users
  WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE page_id = p_users);
  
  INSERT INTO permissions (name, resource_type, page_id) 
  SELECT 'View Role Matrix', 'page', p_matrix
  WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE page_id = p_matrix);

  INSERT INTO permissions (name, resource_type, table_id) 
  SELECT 'Access Users Table', 'table', t_users
  WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE table_id = t_users);

  INSERT INTO permissions (name, resource_type, function_id) 
  SELECT 'Execute Export Users', 'function', f_export
  WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE function_id = f_export);
  
  -- Grant all to super_admin
  IF r_super_admin IS NOT NULL THEN
    INSERT INTO roles_permissions (role_id, permission_id)
    SELECT r_super_admin, id FROM permissions
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
