# Professional profiles & field surfaces — Feature specification

> **Created**: 2026-04-08  
> **Status**: Design / planning (not implemented)  
> **Scope**: Cross-role professional identity, per-surface field visibility & requirement rules, future contract-template alignment.

---

## 1. Summary

**English**: Introduce a **professional profile** (one user may own several) that holds branding and compliance-facing data. A **field registry** defines stable keys, types, and which **profile kinds** may use each field. **Surfaces** are render contexts (public page, email signature, contract block, etc.). **Effective rules** per `(profile, surface, field)` combine platform defaults with user overrides where allowed—never letting users hide legally locked fields.

**繁體中文**：以「專業檔案」承載個人／事務所／代書／律師等對外與法遵相關資料（一使用者可有多筆）。**欄位目錄**定義穩定 `field_key`、型別與適用的 **profile kind**。**表面（surface）** 代表輸出場景（公開頁、Email 簽名、合約區塊等）。每個 `(檔案, 表面, 欄位)` 的**有效規則**由平台預設與使用者可調整項目合併，且**法遵鎖定**欄位不可被關閉。

---

## 2. Goals and non-goals

### Goals

- Support **multiple professional personas** per login (e.g. individual + firm) with a **current profile** selector in the shell (e.g. sidebar footer).
- **Single source of truth** for field semantics (`field_key`); sparse role-specific data without N separate tables per occupation (use JSONB values validated against registry).
- **Per-surface** configuration UI: one **scoped table** at a time (rows = applicable fields, columns = visibility / required / read-only indicators)—not one giant matrix for end users.
- **Deterministic merge order** for defaults vs overrides vs template-specific rules (see §6).
- **Audit-friendly**: optional later column `updated_by`, `source` on overrides.

### Non-goals (initial phases)

- Full visual contract builder (phase later); this spec only defines **field keys** placeholders can bind to.
- Replacing `auth.users` or all of `users_profile` in one migration; **phase 1** may add new tables and **bridge** existing columns.

---

## 3. Concepts

| Concept | Definition |
|--------|------------|
| **Login user** | `auth.users` + existing `users_profile` row (account, security, legacy fields). |
| **Professional profile** | Business-facing entity: display name, org info, logos, license slots, social URLs, etc. Owned by a login user (and later possibly org membership). |
| **Profile kind** | Enum-like tag: `individual`, `firm`, `company`, `notary`, `law`, `agent`, `other` — drives which fields appear in UI and default rules. |
| **Field definition** | Registry row: `field_key`, data type, i18n label, `applicable_profile_kinds[]`, `group` (e.g. branding, contact, credentials), validation hints. |
| **Surface** | Named render target: `public_profile`, `listing_agent_card`, `email_signature`, `contract_party_block`, … |
| **Platform rule** | Default `visibility` + `requirement` + locks for `(profile_kind, surface, field_key)`. |
| **User override** | Per `(professional_profile_id, surface, field_key)` when `user_may_hide` / `user_may_relax_required` allow. |

---

## 4. Relationship to current schema

Today `public.users_profile` holds core identity and social columns (e.g. `display_name`, `phone`, `facebook_url`, … per migrations). **Recommended approach**:

- **Short term**: Keep `users_profile` for account-level fields; add `professional_profiles` + JSONB `attributes` for extended keys; **sync or duplicate** hot fields only where existing features (blog CTA, etc.) still read `users_profile`.
- **Medium term**: Move reads through a **resolver** that merges `users_profile` + active `professional_profile` for each surface so consumers do not multiply conditionals.

---

## 5. Proposed relational model (PostgreSQL)

### 5.1 `professional_profiles`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | |
| `owner_user_id` | `uuid` FK → `users_profile(id)` | Who manages this profile. |
| `kind` | `text` | `individual` / `firm` / `notary` / `law` / … |
| `slug` | `text` nullable | Unique per owner or global—product decision. |
| `display_name` | `text` | Primary public label. |
| `attributes` | `jsonb` | Values keyed by `field_key`; validate in app or via CHECK + trigger. |
| `is_default` | `boolean` | Default profile for owner when opening app. |
| `created_at` / `updated_at` | `timestamptz` | |

### 5.2 `profile_field_definitions` (registry)

| Column | Type | Notes |
|--------|------|--------|
| `field_key` | `text` PK | Stable: `org_name`, `license_number`, `tiktok_url`, … |
| `value_type` | `text` | `string`, `url`, `phone`, `email`, `image_ref`, `json`, … |
| `applicable_kinds` | `text[]` | Empty array = all kinds. |
| `group_key` | `text` | For UI grouping. |
| `sort_order` | `int` | |
| `label_zh` / `label_en` | `text` | Or single `labels jsonb`. |
| `description_zh` / `description_en` | `text` optional | Shown in settings “where this appears”. |

Seed via migration; superadmin may extend rows later.

### 5.3 `profile_surfaces`

| Column | Type | Notes |
|--------|------|--------|
| `surface_key` | `text` PK | e.g. `public_profile` |
| `description` | `text` | |
| `sort_order` | `int` | |

### 5.4 `profile_surface_field_defaults` (platform matrix, sparse)

Composite unique `(profile_kind, surface_key, field_key)`.

| Column | Type | Notes |
|--------|------|--------|
| `default_visible` | `boolean` | |
| `default_required` | `boolean` | On that surface (for forms/render validation). |
| `lock_visible` | `boolean` | If true, user cannot hide. |
| `lock_required` | `boolean` | If true, user cannot mark optional. |
| `user_may_hide` | `boolean` | |
| `user_may_relax_required` | `boolean` | Usually false when legal text mandates. |

### 5.5 `profile_surface_field_overrides` (user choices)

Composite unique `(professional_profile_id, surface_key, field_key)`.

| Column | Type | Notes |
|--------|------|--------|
| `visible` | `boolean` nullable | `null` = inherit default. |
| `required` | `boolean` nullable | `null` = inherit; only meaningful if surface uses required semantics. |

### 5.6 Future: contract templates

`contract_template_placeholders (template_id, placeholder_key, field_key, required_override …)` — bind DOCX/HTML tokens to `field_key`; merge precedence in §6.

---

## 6. Rule merge precedence

Evaluate **effective** `(visible, required)` for `(profile, surface, field)`:

1. **Lock flags** from `profile_surface_field_defaults`: `lock_visible` / `lock_required` force visibility/required regardless of user rows.
2. **Contract template** (when rendering a specific template): template-level required overrides **contract surface only**, cannot violate `lock_required` off.
3. **User override** row: applies only if policy flags allow (`user_may_hide`, `user_may_relax_required`).
4. **Platform default** row: `default_visible`, `default_required`.
5. **Registry fallback**: if no default row, infer `visible = false`, `required = false` unless field is in a “core” list for that surface (optional code constant for bootstrap).

**Implementation note**: implement as a pure function `resolveFieldRule(profileKind, surfaceKey, fieldKey, overridesRow, templateRow?)` with unit tests.

---

## 7. Initial surface catalog (suggested)

| `surface_key` | Purpose |
|---------------|---------|
| `public_profile` | Public-facing profile / microsite. |
| `listing_agent_card` | Agent strip on property listing. |
| `email_signature` | Outbound mail footers. |
| `pdf_letterhead` | PDFs and printables. |
| `contract_party_block` | Party identification block in contracts (before per-template fine tuning). |
| `blog_cta` | Blog / content CTAs (align with existing social fields usage). |

Add new surfaces by inserting into `profile_surfaces` + defaults seed; app discovers via API.

---

## 8. Initial field groups (examples)

- **identity**: `display_name`, `title`, `avatar_image_ref`
- **org**: `org_name`, `org_logo_ref`, `tax_id`, `org_address`, `org_phone`
- **contact**: `email_public`, `phone_public`, `website_url`, `booking_url`
- **social**: `line_id`, `facebook_url`, `instagram_url`, `tiktok_url`, …
- **credentials**: `broker_license_number`, `notary_registration`, `law_firm_uniform_number`, … (keys exist in registry even if sparse in JSONB)

Map existing `users_profile` columns to `field_key` equivalents to avoid duplicate semantics.

---

## 9. UI specification

### 9.1 Sidebar (all apps)

- Show **active professional profile** name + optional kind badge; link **Account & security** vs **Professional profile**.
- If multiple profiles: **switcher** (dropdown). Persist last selection in `user_page_settings` or a small prefs table.

### 9.2 End-user settings: “Field visibility by surface”

- Left nav: **Surfaces** (from `profile_surfaces`).
- Main: **table** for current profile — columns at minimum: **Field**, **Show** (checkbox), **Required on this surface** (read-only or checkbox per policy), **Locked** (icon when platform locks).
- Copy: explain **where** this surface is used (pull from `description`).
- **Search + group by** `group_key` to scale.

### 9.3 Superadmin / platform tooling (later)

- Filterable matrix: filter `profile_kind`, `surface_key`, `group_key`; bulk edit defaults; export CSV; change log.

---

## 10. API shape (sketch)

- `GET /api/professional-profiles` — list for current user.
- `GET /api/professional-profiles/:id/surfaces/:surfaceKey/fields` — resolved rules + current values.
- `PATCH /api/professional-profiles/:id` — update `attributes` + metadata with validation against registry.
- `PATCH /api/professional-profiles/:id/surfaces/:surfaceKey/overrides` — batch update overrides (validated against locks).

Use RLS: owner can read/write own profiles; service role for superadmin defaults.

---

## 11. Security & privacy

- Public surfaces only expose fields allowed by **effective visible** for that surface (API layer must enforce, not only UI).
- Image refs point to **storage paths** with signed URLs; never store raw secrets in `attributes`.
- **PII** fields tagged in registry for export/delete flows (future GDPR).

---

## 12. Phased delivery

| Phase | Deliverable |
|-------|-------------|
| **P0** | This spec + TypeScript types (`FieldKey`, `SurfaceKey`, `ResolvedFieldRule`). |
| **P1** | Migrations: tables §5 + seeds for surfaces + registry + defaults for 1–2 kinds. |
| **P2** | Resolver + unit tests; read path for one consumer (e.g. blog CTA or listing card). |
| **P3** | Settings UI (per-surface table) in `apps/web` (and mirror in superadmin if needed). |
| **P4** | Contract template placeholder binding + merge in render pipeline. |
| **P5** | Superadmin defaults matrix + audit. |

---

## 13. Open questions

- **Multi-tenant orgs**: Should a profile belong to an `organization_id` with member roles, or stay owner-scoped until IAM catches up?
- **Slug uniqueness**: Global vs per-owner vs per-region.
- **Canonical email/phone**: Account vs public-facing split; verification badges.
- **Migration**: Gradual move from flat `users_profile` columns to `attributes` — timeline and backward compatibility for existing RPCs.

---

## 14. Change history

| Date | Author | Notes |
|------|--------|-------|
| 2026-04-08 | Cursor Agent | Initial design from sidebar / multi-role discussion. |
