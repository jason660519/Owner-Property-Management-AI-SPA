
create type invitation_status as enum ('pending', 'accepted', 'expired');

create table if not exists user_invitations (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  token text not null unique,
  role text,
  group_id uuid,
  status invitation_status default 'pending',
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  metadata jsonb default '{}'::jsonb
);

create index if not exists idx_user_invitations_email on user_invitations(email);
create index if not exists idx_user_invitations_token on user_invitations(token);

alter table user_invitations enable row level security;

create policy "Admins can view all invitations"
  on user_invitations for select
  using (
    exists (
      select 1 from users_profile
      where id = auth.uid() and role = 'super_admin'
    )
    or
    (auth.jwt() ->> 'role') = 'service_role'
  );

create policy "Admins can insert invitations"
  on user_invitations for insert
  with check (
    exists (
      select 1 from users_profile
      where id = auth.uid() and role = 'super_admin'
    )
    or
    (auth.jwt() ->> 'role') = 'service_role'
  );
