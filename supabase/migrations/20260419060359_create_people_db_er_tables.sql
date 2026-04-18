-- Migration: People DB — Entity Resolution tables (Row 145 Sprint 4a Phase 2)
-- Date: 2026-04-19
-- Description:
--   Four tables backing the ER flow defined in dev-spec §5.4:
--
--     people_db_persons           canonical person (the merge target)
--     people_db_person_sources    staging_records → person mapping (1:N)
--     people_db_merge_candidates  admin-pending fuzzy matches (name+phone, name+addr)
--     people_db_merge_blacklist   rejected pairs so ER never re-suggests them
--
--   Conservative merge policy (dev-spec decision #1):
--     - id_no exact → auto-merge (no admin review)
--     - name+phone / name+addr → write to candidates; admin confirms/rejects
--     - reject → blacklist so next run skips the pair
--
--   All tables RLS-protected; super_admin reads/writes via app, worker
--   uses service_role.

-- ---------------------------------------------------------------------------
-- people_db_persons — canonical person entities
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.people_db_persons (
    person_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name    TEXT NOT NULL,
    -- canonical_id_no is UNIQUE so the id-exact match in ER is a simple
    -- point lookup. NULL allowed (many records arrive without an id).
    canonical_id_no   TEXT UNIQUE,
    canonical_phones  TEXT[] NOT NULL DEFAULT '{}',
    canonical_address TEXT,
    source_count      INTEGER NOT NULL DEFAULT 0,
    quality_score     NUMERIC(3,2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Name lookup powers name+phone / name+addr fuzzy matching. A simple
-- B-tree on canonical_name is enough at the expected 1-5M person scale;
-- ES handles the real fuzzy search, this index is for the ER worker.
CREATE INDEX IF NOT EXISTS idx_people_db_persons_canonical_name
    ON public.people_db_persons (canonical_name);

CREATE INDEX IF NOT EXISTS idx_people_db_persons_canonical_phones
    ON public.people_db_persons USING GIN (canonical_phones);

CREATE OR REPLACE FUNCTION public.tg_people_db_persons_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS people_db_persons_updated_at ON public.people_db_persons;
CREATE TRIGGER people_db_persons_updated_at
    BEFORE UPDATE ON public.people_db_persons
    FOR EACH ROW EXECUTE FUNCTION public.tg_people_db_persons_set_updated_at();

-- ---------------------------------------------------------------------------
-- people_db_person_sources — which staging records back which person
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.people_db_person_sources (
    person_id    UUID NOT NULL REFERENCES public.people_db_persons(person_id) ON DELETE CASCADE,
    -- record_id is the staging_records.id (UUID-shaped TEXT). Using TEXT
    -- rather than UUID so future non-staging sources (direct imports,
    -- manual entries) can share this table.
    record_id    TEXT NOT NULL,
    file_id      UUID REFERENCES public.people_db_files(id) ON DELETE SET NULL,
    match_reason TEXT NOT NULL
        CHECK (match_reason IN ('id_exact', 'confirmed_name_phone', 'confirmed_name_addr', 'new')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (person_id, record_id)
);

CREATE INDEX IF NOT EXISTS idx_people_db_person_sources_file_id
    ON public.people_db_person_sources (file_id);
CREATE INDEX IF NOT EXISTS idx_people_db_person_sources_record_id
    ON public.people_db_person_sources (record_id);

-- ---------------------------------------------------------------------------
-- people_db_merge_candidates — admin-pending fuzzy matches
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.people_db_merge_candidates (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_a_id   UUID NOT NULL REFERENCES public.people_db_persons(person_id) ON DELETE CASCADE,
    record_b_id   TEXT NOT NULL,
    match_reason  TEXT NOT NULL CHECK (match_reason IN ('name_phone', 'name_addr')),
    confidence    NUMERIC(3,2) NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'rejected')),
    decided_by    UUID,
    decided_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent the ER worker from writing the same pair twice. Upsert on
    -- conflict (person_a_id, record_b_id) refreshes confidence but keeps
    -- admin's prior decision intact.
    CONSTRAINT people_db_merge_candidates_pair_uniq
        UNIQUE (person_a_id, record_b_id)
);

CREATE INDEX IF NOT EXISTS idx_people_db_merge_candidates_status
    ON public.people_db_merge_candidates (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- people_db_merge_blacklist — rejected pairs (ER skips on re-run)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.people_db_merge_blacklist (
    person_a_id  UUID NOT NULL,
    record_b_id  TEXT NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (person_a_id, record_b_id)
);

-- ---------------------------------------------------------------------------
-- Row Level Security — four tables × four policies each
-- ---------------------------------------------------------------------------

-- Helper check: service_role OR super_admin
-- (inlined per-policy because Postgres doesn't let us parametrize policies)

-- people_db_persons
ALTER TABLE public.people_db_persons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_db_persons_deny_all" ON public.people_db_persons;
CREATE POLICY "people_db_persons_deny_all" ON public.people_db_persons
    AS RESTRICTIVE FOR ALL USING (FALSE);

DROP POLICY IF EXISTS "people_db_persons_superadmin_select" ON public.people_db_persons;
CREATE POLICY "people_db_persons_superadmin_select" ON public.people_db_persons
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_persons_superadmin_insert" ON public.people_db_persons;
CREATE POLICY "people_db_persons_superadmin_insert" ON public.people_db_persons
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_persons_superadmin_update" ON public.people_db_persons;
CREATE POLICY "people_db_persons_superadmin_update" ON public.people_db_persons
    FOR UPDATE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    ) WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_persons_superadmin_delete" ON public.people_db_persons;
CREATE POLICY "people_db_persons_superadmin_delete" ON public.people_db_persons
    FOR DELETE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- people_db_person_sources
ALTER TABLE public.people_db_person_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_db_person_sources_deny_all" ON public.people_db_person_sources;
CREATE POLICY "people_db_person_sources_deny_all" ON public.people_db_person_sources
    AS RESTRICTIVE FOR ALL USING (FALSE);

DROP POLICY IF EXISTS "people_db_person_sources_superadmin_select" ON public.people_db_person_sources;
CREATE POLICY "people_db_person_sources_superadmin_select" ON public.people_db_person_sources
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_person_sources_superadmin_insert" ON public.people_db_person_sources;
CREATE POLICY "people_db_person_sources_superadmin_insert" ON public.people_db_person_sources
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_person_sources_superadmin_update" ON public.people_db_person_sources;
CREATE POLICY "people_db_person_sources_superadmin_update" ON public.people_db_person_sources
    FOR UPDATE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    ) WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_person_sources_superadmin_delete" ON public.people_db_person_sources;
CREATE POLICY "people_db_person_sources_superadmin_delete" ON public.people_db_person_sources
    FOR DELETE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- people_db_merge_candidates
ALTER TABLE public.people_db_merge_candidates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_db_merge_candidates_deny_all" ON public.people_db_merge_candidates;
CREATE POLICY "people_db_merge_candidates_deny_all" ON public.people_db_merge_candidates
    AS RESTRICTIVE FOR ALL USING (FALSE);

DROP POLICY IF EXISTS "people_db_merge_candidates_superadmin_select" ON public.people_db_merge_candidates;
CREATE POLICY "people_db_merge_candidates_superadmin_select" ON public.people_db_merge_candidates
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_merge_candidates_superadmin_insert" ON public.people_db_merge_candidates;
CREATE POLICY "people_db_merge_candidates_superadmin_insert" ON public.people_db_merge_candidates
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_merge_candidates_superadmin_update" ON public.people_db_merge_candidates;
CREATE POLICY "people_db_merge_candidates_superadmin_update" ON public.people_db_merge_candidates
    FOR UPDATE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    ) WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_merge_candidates_superadmin_delete" ON public.people_db_merge_candidates;
CREATE POLICY "people_db_merge_candidates_superadmin_delete" ON public.people_db_merge_candidates
    FOR DELETE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- people_db_merge_blacklist
ALTER TABLE public.people_db_merge_blacklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_db_merge_blacklist_deny_all" ON public.people_db_merge_blacklist;
CREATE POLICY "people_db_merge_blacklist_deny_all" ON public.people_db_merge_blacklist
    AS RESTRICTIVE FOR ALL USING (FALSE);

DROP POLICY IF EXISTS "people_db_merge_blacklist_superadmin_select" ON public.people_db_merge_blacklist;
CREATE POLICY "people_db_merge_blacklist_superadmin_select" ON public.people_db_merge_blacklist
    FOR SELECT USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_merge_blacklist_superadmin_insert" ON public.people_db_merge_blacklist;
CREATE POLICY "people_db_merge_blacklist_superadmin_insert" ON public.people_db_merge_blacklist
    FOR INSERT WITH CHECK (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "people_db_merge_blacklist_superadmin_delete" ON public.people_db_merge_blacklist;
CREATE POLICY "people_db_merge_blacklist_superadmin_delete" ON public.people_db_merge_blacklist
    FOR DELETE USING (
        auth.role() = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.iam_user_roles iur
            JOIN public.iam_roles ir ON iur.role_id = ir.id
            WHERE iur.user_id = auth.uid() AND ir.name = 'super_admin'
        )
    );

-- Comments
COMMENT ON TABLE public.people_db_persons IS
    'Row 145 Sprint 4a: canonical person entities. ER worker writes; admin read; id_no UNIQUE makes id-exact matching cheap.';
COMMENT ON TABLE public.people_db_person_sources IS
    'Row 145 Sprint 4a: maps staging_records → person with match_reason audit trail.';
COMMENT ON TABLE public.people_db_merge_candidates IS
    'Row 145 Sprint 4a: admin-pending fuzzy merges (name+phone / name+addr). confirm → person_sources insert; reject → blacklist insert.';
COMMENT ON TABLE public.people_db_merge_blacklist IS
    'Row 145 Sprint 4a: pairs the admin has rejected. ER worker consults on every run so rejected pairs never re-surface.';
