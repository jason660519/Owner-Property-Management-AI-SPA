-- Migration: Add invite_code column to user_invitations
-- Created: 2026-02-13 | Creator: Claude Opus 4.6
-- Purpose: Support 8-digit numeric invite codes for the invite-by-code login flow

-- Add invite_code column (8-digit numeric string, unique)
alter table user_invitations
  add column if not exists invite_code varchar(8);

-- Create unique index on invite_code (only for non-null values)
create unique index if not exists idx_user_invitations_invite_code
  on user_invitations(invite_code)
  where invite_code is not null;

-- Add UPDATE policy so service_role can mark invitations as accepted
create policy "Service role can update invitations"
  on user_invitations for update
  using (
    (auth.jwt() ->> 'role') = 'service_role'
  )
  with check (
    (auth.jwt() ->> 'role') = 'service_role'
  );

-- Add UPDATE policy so super admins can update invitations
create policy "Admins can update invitations"
  on user_invitations for update
  using (
    exists (
      select 1 from users_profile
      where id = auth.uid() and role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1 from users_profile
      where id = auth.uid() and role = 'super_admin'
    )
  );
