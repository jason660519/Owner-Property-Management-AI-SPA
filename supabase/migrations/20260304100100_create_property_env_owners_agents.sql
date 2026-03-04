-- ==========================================================================
-- Migration: Create property_environment_conditions, property_owners,
--            property_agent_assignments
--            Aligns with B01委託物件資料.xlsx → Sheets 2 & 3 + agent data
-- Date: 2026-03-04
-- ==========================================================================

BEGIN;

-- ═════════════════════════════════════════════════════════════════════════
-- 1. property_environment_conditions（物件環境條件）
--    Source: Sheet 2「環境條件」（49 columns）
--    Relation: 1:1 with property (sale or rental)
-- ═════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.property_environment_conditions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL,
    property_type   TEXT NOT NULL CHECK (property_type IN ('sale', 'rental')),

    -- ▸ Transportation / Surroundings
    road_width_meters      NUMERIC(6,2),
    showing_method         TEXT,
    bus_stop               TEXT,
    nearby_market          TEXT,
    living_circle          TEXT,

    -- ▸ Marketing copy
    highlight_notes        TEXT,
    ad_copy_40char         TEXT,

    -- ▸ Building materials / structure
    building_structure     TEXT,
    building_exterior      TEXT,
    building_interior_wall TEXT,
    ceiling_material       TEXT,
    floor_material         TEXT,
    lighting_direction     TEXT,

    -- ▸ Elevator & management
    elevator_households    INTEGER DEFAULT 0,
    elevator_count         INTEGER DEFAULT 0,
    management_fee_unit    TEXT,
    resident_management_fee NUMERIC(10,2) DEFAULT 0,
    parking_management_fee  NUMERIC(10,2) DEFAULT 0,
    management_fee_includes_parking BOOLEAN DEFAULT FALSE,
    has_security_guard     BOOLEAN DEFAULT FALSE,

    -- ▸ Condition flags
    is_currently_leased    BOOLEAN DEFAULT FALSE,
    handover_condition     TEXT,
    has_natural_gas        BOOLEAN DEFAULT FALSE,

    -- ▸ Floor areas（per-floor breakdown, 坪）
    area_first_floor       NUMERIC(10,2) DEFAULT 0,
    area_second_floor      NUMERIC(10,2) DEFAULT 0,
    area_third_floor       NUMERIC(10,2) DEFAULT 0,
    area_fourth_floor      NUMERIC(10,2) DEFAULT 0,
    area_fifth_floor       NUMERIC(10,2) DEFAULT 0,
    area_other_floors      NUMERIC(10,2) DEFAULT 0,
    area_arcade            NUMERIC(10,2) DEFAULT 0,
    area_indoor            NUMERIC(10,2) DEFAULT 0,

    -- ▸ Dimensions
    frontage_meters        NUMERIC(8,2),
    depth_meters           NUMERIC(8,2),

    -- ▸ Land
    land_use_zone          TEXT,
    extension_location     TEXT,
    has_ground_vegetation  BOOLEAN DEFAULT FALSE,
    has_ground_building    BOOLEAN DEFAULT FALSE,

    -- ▸ Showing / Key
    key_access_method      TEXT,
    showing_notes          TEXT,

    -- ▸ Encumbrance
    has_mortgage_setting   BOOLEAN DEFAULT FALSE,
    mortgage_bank          TEXT,
    announced_land_value   NUMERIC(12,2),

    -- ▸ Parking details
    parking_entrance       TEXT,
    parking_status         TEXT,

    -- ▸ Safety
    is_alley_rush          BOOLEAN DEFAULT FALSE,
    is_safe_alley          BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (property_id, property_type)
);

CREATE INDEX idx_env_cond_property ON public.property_environment_conditions(property_id);

-- ═════════════════════════════════════════════════════════════════════════
-- 2. property_owners（物件屋主資料）
--    Source: Sheet 3「屋主資料」（25 columns）
--    Relation: N:1 with property（one property may have multiple owners）
-- ═════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.property_owners (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL,
    property_type   TEXT NOT NULL CHECK (property_type IN ('sale', 'rental')),

    -- ▸ Owner basics
    owner_name             TEXT NOT NULL,
    owner_gender           TEXT CHECK (owner_gender IN ('male', 'female', 'other')),
    owner_birthday         DATE,
    owner_id_number_enc    TEXT,

    -- ▸ Owner contact
    owner_phone_home       TEXT,
    owner_phone_office     TEXT,
    owner_mobile           TEXT,
    owner_email            TEXT,

    -- ▸ Owner address
    owner_contact_postal_code    TEXT,
    owner_residence_postal_code  TEXT,
    owner_contact_address        TEXT,
    owner_residence_address      TEXT,

    -- ▸ Agent / proxy
    proxy_name             TEXT,
    proxy_phone_home       TEXT,
    proxy_phone_office     TEXT,
    proxy_mobile           TEXT,
    proxy_birthday         DATE,
    proxy_id_number_enc    TEXT,

    -- ▸ Status flags
    is_target_customer     BOOLEAN DEFAULT FALSE,
    is_active_customer     BOOLEAN DEFAULT FALSE,
    can_receive_email      BOOLEAN DEFAULT FALSE,

    -- ▸ Notes
    notes                  TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prop_owners_property   ON public.property_owners(property_id);
CREATE INDEX idx_prop_owners_name       ON public.property_owners(owner_name);
CREATE INDEX idx_prop_owners_mobile     ON public.property_owners(owner_mobile)
  WHERE owner_mobile IS NOT NULL;

-- ═════════════════════════════════════════════════════════════════════════
-- 3. property_agent_assignments（物件業務員指派）
--    Source: Sheet 1 columns: 營業員代號(1~5), 業務員(1~5),
--            部門組別代號(1~5), 件數比率(1~5)
--    Relation: N:1 with property（up to 5 agents per property）
-- ═════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.property_agent_assignments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id     UUID NOT NULL,
    property_type   TEXT NOT NULL CHECK (property_type IN ('sale', 'rental')),

    slot_number          INTEGER NOT NULL CHECK (slot_number BETWEEN 1 AND 5),
    agent_code           TEXT,
    agent_name           TEXT,
    department_group_code TEXT,
    commission_ratio_pct NUMERIC(5,2) DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (property_id, property_type, slot_number)
);

CREATE INDEX idx_agent_assign_property ON public.property_agent_assignments(property_id);
CREATE INDEX idx_agent_assign_agent    ON public.property_agent_assignments(agent_code)
  WHERE agent_code IS NOT NULL;

-- ═════════════════════════════════════════════════════════════════════════
-- RLS
-- ═════════════════════════════════════════════════════════════════════════
ALTER TABLE public.property_environment_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_owners                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_agent_assignments      ENABLE ROW LEVEL SECURITY;

-- Superadmin (service_role) bypasses RLS.
-- For normal users: owner-based policies via property lookup.

CREATE POLICY "owners_manage_env_conditions" ON public.property_environment_conditions
  FOR ALL USING (
    property_id IN (
      SELECT id FROM public.property_sales WHERE owner_id = auth.uid()
      UNION ALL
      SELECT id FROM public.property_rentals WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "owners_manage_property_owners" ON public.property_owners
  FOR ALL USING (
    property_id IN (
      SELECT id FROM public.property_sales WHERE owner_id = auth.uid()
      UNION ALL
      SELECT id FROM public.property_rentals WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "owners_manage_agent_assignments" ON public.property_agent_assignments
  FOR ALL USING (
    property_id IN (
      SELECT id FROM public.property_sales WHERE owner_id = auth.uid()
      UNION ALL
      SELECT id FROM public.property_rentals WHERE owner_id = auth.uid()
    )
  );

-- ═════════════════════════════════════════════════════════════════════════
-- updated_at triggers
-- ═════════════════════════════════════════════════════════════════════════
CREATE TRIGGER trg_env_conditions_updated_at
  BEFORE UPDATE ON public.property_environment_conditions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_property_owners_updated_at
  BEFORE UPDATE ON public.property_owners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_agent_assignments_updated_at
  BEFORE UPDATE ON public.property_agent_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
