# IAM Standard Operating Procedure (SOP)

**Version:** 1.0  
**Date:** 2026-02-10  

## 1. Overview
This document outlines the procedures for managing user identities, groups, and permissions within the Real Estate Management System.

## 2. User Onboarding & Group Assignment

### 2.1 New Customer (Tenant/Buyer)
1.  **Registration**: User signs up via `/register`. Default role: `authenticated`.
2.  **Profile creation**: When `users_profile` is first created, the user is **auto-added to the Registered Users group** (trigger), so they are no longer group-orphans.
3.  **Verification**: User verifies email.
4.  **Assignment**:
    *   **Potential**: Auto-assigned to `Potential Tenants` or `Potential Buyers` based on onboarding survey (can be in addition to or instead of Registered Users, per policy).
    *   **Contracted**: System automatically adds user to `Active Tenants` or `Active Buyers` upon contract signature validation.

### 2.2 New Staff / Partner
1.  **Invitation**: Admin sends an invitation email via Super Admin Dashboard.
2.  **Assignment**: Admin selects the specific group (e.g., "Vendors", "Security Operations Center") during invitation.
3.  **Review**: Requires approval from a second admin (Four-Eyes Principle) for `Administrators` group assignment.

## 3. Permission Changes

### 3.1 Routine Changes
*   **Request**: Submit a ticket to IT Support.
*   **Approval**: Line manager approval required.
*   **Execution**: Admin updates group membership via Dashboard.

### 3.2 Emergency Access (Break-glass)
In case of system outage or critical incident where elevated privileges are needed:
1.  **Request**: Contact CTO or CISO directly.
2.  **Execution**: `super_admin` grants temporary access.
3.  **Audit**: This action triggers a `CRITICAL_IAM_CHANGE` alert to the Security Team.
4.  **Revocation**: Access must be revoked immediately after the incident is resolved (max 24 hours).

## 4. Periodic Access Review (Recertification)

**Frequency:** Quarterly (Every 3 months)

**Procedure:**
1.  **Export**: Security Team exports the "User-Group-Role" matrix.
2.  **Review**: Department heads review their staff's access.
3.  **Action**:
    *   **Keep**: No action needed.
    *   **Revoke**: Admin removes user from group.
    *   **Change**: Admin moves user to correct group.
4.  **Sign-off**: Audit report signed by CISO.

## 5. Emergency Revocation (Kill Switch)

If a user account is compromised or an employee leaves hostilely:

### 5.1 Immediate Action (SLA: < 15 mins)
1.  **Admin Dashboard**: Go to `Users` -> Find User -> Click **"Suspend User"** (Bans login).
2.  **Session Kill**: This action invalidates all active JWT tokens and Refresh tokens immediately.

### 5.2 Database Action (Fallback)
If Dashboard is unavailable, run SQL:
```sql
UPDATE auth.users SET banned_until = '2099-12-31' WHERE email = 'compromised@example.com';
DELETE FROM auth.sessions WHERE user_id = (SELECT id FROM auth.users WHERE email = 'compromised@example.com');
```

## 6. Compliance Checklist
- [ ] Are all new accounts assigned to a group? (No orphans)
- [ ] Is `super_admin` access limited to < 3 people?
- [ ] Are all `vendor` accounts set to expire automatically?
- [ ] Is Multi-Factor Authentication (MFA) enforced for Staff?
