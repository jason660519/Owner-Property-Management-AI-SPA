# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased] - 2026-02-10

### Added
- **IAM System Overhaul**: Implemented comprehensive Role-Based Access Control (RBAC) system.
  - Added 7 new IAM Groups (Active Buyers, Security Operations Center, etc.).
  - Added 4 new IAM Roles (system_engineer, cybersecurity_engineer, etc.).
  - Implemented automatic role inheritance logic in database migrations.
- **Role Simulation**: New feature for Super Admins to simulate other user roles.
  - Added `/superadmin/role-simulation` page.
  - Implemented secure cookie-based role switching middleware.
  - Added "Venetian Mask" icon to sidebar for easy access.
- **RBAC Management UI**: Updated `/superadmin/dashboard/rbac_access_control`.
  - Now fetches real roles from the database instead of mock data.
  - Supports Create, Read, Update, Delete (CRUD) for roles.
  - Displays comprehensive permission matrix.
- **Documentation**:
  - Added `docs/PERMISSION_ARCHITECTURE.md` detailing the new permission model.
  - Added `docs/IAM_SOP.md` for operational procedures.

### Changed
- **Security Hardening**:
  - Restricted `switch_user_role` database function to Super Admin only.
  - Enforced strict Row Level Security (RLS) on all `iam_*` tables (Only Super Admin can write).
- **Frontend Logic**:
  - Updated `apps/web/lib/permissions/ability.ts` to support new granular roles (contract_buyer, auditor, etc.).
  - Updated `apps/web/middleware.ts` to handle role simulation headers.

### Fixed
- Fixed role discrepancy where only 3 roles were initially visible; seeded missing roles via migration.
