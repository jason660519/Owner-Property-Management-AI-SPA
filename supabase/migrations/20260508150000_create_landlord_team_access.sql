-- Landlord team access matrix: members + permissions (row 026)

CREATE TABLE IF NOT EXISTS public.landlord_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    member_email TEXT NOT NULL,
    member_role TEXT NOT NULL DEFAULT 'assistant'
        CHECK (member_role IN ('assistant', 'accountant', 'custom')),
    role_label TEXT,
    invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'revoked')),
    UNIQUE (landlord_id, member_email)
);

CREATE TABLE IF NOT EXISTS public.landlord_member_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.landlord_team_members(id) ON DELETE CASCADE,
    resource TEXT NOT NULL,
    can_read BOOLEAN NOT NULL DEFAULT true,
    can_write BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (member_id, resource)
);

CREATE TABLE IF NOT EXISTS public.landlord_permission_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.landlord_team_members(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource TEXT,
    changes JSONB,
    actor_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_landlord_team_landlord ON public.landlord_team_members(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_perm_member ON public.landlord_member_permissions(member_id);

ALTER TABLE public.landlord_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landlord_permission_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlord manages own team members"
ON public.landlord_team_members FOR ALL
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlord manages own member permissions"
ON public.landlord_member_permissions FOR ALL
USING (landlord_id = auth.uid())
WITH CHECK (landlord_id = auth.uid());

CREATE POLICY "Landlord reads own audit log"
ON public.landlord_permission_audit FOR SELECT
USING (landlord_id = auth.uid());

CREATE POLICY "Landlord inserts own audit log"
ON public.landlord_permission_audit FOR INSERT
WITH CHECK (landlord_id = auth.uid());
