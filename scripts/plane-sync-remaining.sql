-- ============================================================
-- Plane Sync: Remaining items (modules, issues, cycles, views, pages, intake)
-- Run: docker exec -e PGPASSWORD=plane plane-app-plane-db-1 psql -U plane -d plane -f /tmp/plane-sync-remaining.sql
-- ============================================================

-- Constants
\set ws_id '3d89e847-5c46-49c3-ad41-53b9f75a76e8'
\set pj_id 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'
\set user_id 'fa5eeb07-8237-4362-b34d-8291781fdee5'

-- State IDs
\set st_backlog 'fb988e1f-44a2-426e-bd42-fbbc66749562'
\set st_in_progress 'a4993c10-3e55-4112-a275-552b54e5a46e'
\set st_done 'cf74ed40-a2f3-4fa1-9914-de4014181d7e'

-- Label IDs
\set lbl_landlord 'ed688931-a960-4cdf-953e-0182e69845d0'
\set lbl_tenant 'e90312fa-8845-431a-9cbf-85329ead5a41'
\set lbl_contracts 'i846a534-de09-4043-a54a-18601c2ac6f8'
\set lbl_system '243ec77b-8edb-44fd-8714-129a9712cb90'
\set lbl_payments '8aa28d08-3216-456a-98a9-d2d2fdeb73c0'
\set lbl_testing 'dcef3e77-a68b-4116-a8d9-2fd6b9f53a86'
\set lbl_pm 'd4e06e6c-8218-47ec-8060-95156139147c'

BEGIN;

-- ============================================================
-- Step 1: Create Phase 1 Module (Development)
-- ============================================================
INSERT INTO modules (id, created_at, updated_at, name, description, status, sort_order,
    view_props, logo_props, lead_id, project_id, workspace_id, created_by_id)
VALUES (
    gen_random_uuid(), now(), now(),
    'Phase 1 — Development (開發階段)',
    '功能開發、UI 實作、API 建置',
    'planned', 10000, '{}'::jsonb, '{}'::jsonb,
    :'user_id'::uuid, :'pj_id'::uuid, :'ws_id'::uuid, :'user_id'::uuid
);

-- ============================================================
-- Step 2: Create remaining issues (those that hit rate limit)
-- Starting from sequence_id 42
-- ============================================================

-- Helper function to insert issues
CREATE OR REPLACE FUNCTION _insert_issue(
    p_name text, p_state_id uuid, p_priority text, p_desc text, p_seq int
) RETURNS uuid AS $$
DECLARE
    v_id uuid := gen_random_uuid();
BEGIN
    INSERT INTO issues (id, created_at, updated_at, name, description, description_html,
        priority, sequence_id, state_id, project_id, workspace_id, sort_order, is_draft, created_by_id)
    VALUES (v_id, now(), now(), p_name, '{}'::jsonb,
        '<p>' || p_desc || '</p>',
        p_priority, p_seq, p_state_id,
        'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
        65535 + p_seq, false, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);

    INSERT INTO issue_sequences (id, created_at, updated_at, sequence, deleted, issue_id, project_id, workspace_id)
    VALUES (gen_random_uuid(), now(), now(), p_seq, false,
        v_id, 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid);

    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Helper to add label to issue
CREATE OR REPLACE FUNCTION _add_label(p_issue_id uuid, p_label_id uuid) RETURNS void AS $$
BEGIN
    INSERT INTO issue_labels (id, created_at, updated_at, issue_id, label_id, project_id, workspace_id, created_by_id)
    VALUES (gen_random_uuid(), now(), now(), p_issue_id, p_label_id,
        'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
        'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Remaining Landlord features
DO $$
DECLARE
    v_id uuid;
    backlog uuid := 'fb988e1f-44a2-426e-bd42-fbbc66749562';
    lbl_ll uuid := 'ed688931-a960-4cdf-953e-0182e69845d0';
BEGIN
    v_id := _insert_issue('房東自定義銷售物件的Q&A功能', backlog, 'low', '房東自定義銷售物件的Q&A功能', 42);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東自定義出租物件的Q&A功能', backlog, 'low', '房東自定義出租物件的Q&A功能', 43);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('AI TTS語音助理+物件專屬轉接號碼', backlog, 'high', 'AI TTS語音助理+物件專屬轉接號碼', 44);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的仲介－Details模式', backlog, 'low', '房東的仲介－Details模式', 45);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的仲介－Grid模式', backlog, 'low', '房東的仲介－Grid模式', 46);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的仲介－List模式', backlog, 'low', '房東的仲介－List模式', 47);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的仲介－新增仲介', backlog, 'low', '房東的仲介－新增仲介', 48);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東財務－銀行帳戶管理', backlog, 'low', '房東財務－銀行帳戶管理', 49);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東財務－收支明細儀表板', backlog, 'medium', '房東財務－收支明細儀表板', 50);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東財務－租金收支管理', backlog, 'medium', '房東財務－租金收支管理', 51);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東財務－ATO租賃報稅表生成功能', backlog, 'medium', '房東財務－ATO租賃報稅表生成功能', 52);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東財務－台灣租賃報稅表生成功能', backlog, 'medium', '房東財務－台灣租賃報稅表生成功能', 53);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的溝通頁面', backlog, 'low', '房東的溝通頁面', 54);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的物件展示功能－Details模式', backlog, 'low', '房東的物件展示功能－Details模式', 55);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的物件展示功能－Grid模式', backlog, 'low', '房東的物件展示功能－Grid模式', 56);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的物件－照片增生功能 (AI)', backlog, 'high', '房東的物件－照片增生功能 (AI)', 57);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的物件展示功能－List模式', backlog, 'low', '房東的物件展示功能－List模式', 58);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的維修派工管理', backlog, 'medium', '房東的維修派工管理', 59);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的行銷部落格網站行為監控', backlog, 'medium', '房東的行銷部落格網站行為監控', 60);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的email inbox信箱', backlog, 'medium', '房東的email inbox信箱', 61);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的客戶-租客篩選功能', backlog, 'medium', '房東的客戶-租客篩選功能', 62);
    PERFORM _add_label(v_id, lbl_ll);

    v_id := _insert_issue('房東的會計人員查帳審計功能', backlog, 'medium', '房東的會計人員查帳審計功能', 63);
    PERFORM _add_label(v_id, lbl_ll);
END $$;

-- Tenant features
DO $$
DECLARE
    v_id uuid;
    backlog uuid := 'fb988e1f-44a2-426e-bd42-fbbc66749562';
    in_progress uuid := 'a4993c10-3e55-4112-a275-552b54e5a46e';
    lbl_tn uuid := 'e90312fa-8845-431a-9cbf-85329ead5a41';
BEGIN
    v_id := _insert_issue('租客(已簽約)-儀表板', in_progress, 'medium', '租客(已簽約)-儀表板 — Progress: 90%', 64);
    PERFORM _add_label(v_id, lbl_tn);

    v_id := _insert_issue('租客(潛在)-儀表板', in_progress, 'medium', '租客(潛在)-儀表板 — Progress: 90%', 65);
    PERFORM _add_label(v_id, lbl_tn);

    v_id := _insert_issue('租客的維修申請', backlog, 'low', '租客的維修申請', 66);
    PERFORM _add_label(v_id, lbl_tn);

    v_id := _insert_issue('租客的溝通中心', backlog, 'low', '租客的溝通中心', 67);
    PERFORM _add_label(v_id, lbl_tn);

    v_id := _insert_issue('租客的繳費記錄', backlog, 'low', '租客的繳費記錄', 68);
    PERFORM _add_label(v_id, lbl_tn);
END $$;

-- Contracts & Legal
DO $$
DECLARE
    v_id uuid;
    backlog uuid := 'fb988e1f-44a2-426e-bd42-fbbc66749562';
    lbl_ct uuid := '1846a534-de09-4043-a54a-18601c2ac6f8';
BEGIN
    v_id := _insert_issue('買賣合約附加條款功能', backlog, 'low', '買賣合約附加條款功能', 69);
    PERFORM _add_label(v_id, lbl_ct);

    v_id := _insert_issue('租賃合約附加條款功能', backlog, 'low', '租賃合約附加條款功能', 70);
    PERFORM _add_label(v_id, lbl_ct);

    v_id := _insert_issue('一鍵生成買賣制式合約', backlog, 'medium', '一鍵生成買賣制式合約', 71);
    PERFORM _add_label(v_id, lbl_ct);

    v_id := _insert_issue('一鍵生成租賃制式合約', backlog, 'medium', '一鍵生成租賃制式合約', 72);
    PERFORM _add_label(v_id, lbl_ct);

    v_id := _insert_issue('電子簽約功能', backlog, 'high', '電子簽約功能', 73);
    PERFORM _add_label(v_id, lbl_ct);
END $$;

-- General/System features
DO $$
DECLARE
    v_id uuid;
    backlog uuid := 'fb988e1f-44a2-426e-bd42-fbbc66749562';
    in_progress uuid := 'a4993c10-3e55-4112-a275-552b54e5a46e';
    done uuid := 'cf74ed40-a2f3-4fa1-9914-de4014181d7e';
    lbl_sys uuid := '243ec77b-8edb-44fd-8714-129a9712cb90';
BEGIN
    v_id := _insert_issue('一鍵切換UI風格：暗/亮模式', backlog, 'low', '一鍵切換UI風格：暗/亮模式', 74);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('RWD網頁響應式設計', in_progress, 'medium', 'RWD網頁響應式設計 — Progress: 80%', 75);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('使用者身份驗證系統', in_progress, 'high', '使用者身份驗證系統 — Progress: 90%', 76);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('註冊的使用者都有自己的行事曆管理頁面', backlog, 'low', '註冊的使用者都有自己的行事曆管理頁面', 77);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('使用者登入頁面', done, 'low', '使用者登入頁面 — Progress: 100%', 78);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('使用者登入頁面-記住我功能', done, 'low', '使用者登入頁面-記住我功能 — Progress: 100%', 79);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('使用者密碼重設頁面', in_progress, 'low', '使用者密碼重設頁面 — Progress: 95%', 80);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('使用者的溝通頁面', backlog, 'low', '使用者的溝通頁面', 81);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('受邀使用者登入介面', backlog, 'low', '受邀使用者登入介面', 82);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('謄本權狀掃描功能', in_progress, 'medium', '謄本權狀掃描功能 — Progress: 95%', 83);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('上傳物件照片功能', in_progress, 'low', '上傳物件照片功能 — Progress: 95%', 84);
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('登入／Portal／IAM 角色流程與 Superadmin 全角色選單', done, 'medium', '登入後一律進 Portal；多角色與 middleware 同步；Portal 顯示使用者 IAM 角色卡。Progress: 100%', 85);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_sys);

    v_id := _insert_issue('OAuth 用戶新增角色功能修復', done, 'medium', '修復 OAuth 登入用戶在 Portal 新增角色時的失敗問題。Progress: 100%', 86);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_sys);
END $$;

-- Payments
DO $$
DECLARE
    v_id uuid;
    backlog uuid := 'fb988e1f-44a2-426e-bd42-fbbc66749562';
    lbl_pay uuid := '8aa28d08-3216-456a-98a9-d2d2fdeb73c0';
BEGIN
    v_id := _insert_issue('可用的付款方式之一: ID pay', backlog, 'medium', '可用的付款方式之一: ID pay', 87);
    PERFORM _add_label(v_id, lbl_pay);

    v_id := _insert_issue('可用的付款方式之一: Apple Pay', backlog, 'medium', '可用的付款方式之一: Apple Pay', 88);
    PERFORM _add_label(v_id, lbl_pay);

    v_id := _insert_issue('可用的付款方式之一: PayPal', backlog, 'medium', '可用的付款方式之一: PayPal', 89);
    PERFORM _add_label(v_id, lbl_pay);

    v_id := _insert_issue('可用的付款方式之一: Credit card', backlog, 'medium', '可用的付款方式之一: Credit card', 90);
    PERFORM _add_label(v_id, lbl_pay);

    v_id := _insert_issue('線上支付功能', backlog, 'medium', '線上支付功能', 91);
    PERFORM _add_label(v_id, lbl_pay);
END $$;

-- Testing & QA
DO $$
DECLARE
    v_id uuid;
    done uuid := 'cf74ed40-a2f3-4fa1-9914-de4014181d7e';
    lbl_tqa uuid := 'dcef3e77-a68b-4116-a8d9-2fd6b9f53a86';
BEGIN
    v_id := _insert_issue('登入頁面>「記住我」功能 TDD 開發進度檢測報告', done, 'medium', '登入頁面>「記住我」功能 TDD 開發進度檢測報告 — Progress: 100%', 92);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_tqa);
END $$;

-- Project Management
DO $$
DECLARE
    v_id uuid;
    done uuid := 'cf74ed40-a2f3-4fa1-9914-de4014181d7e';
    lbl_pm uuid := 'd4e06e6c-8218-47ec-8060-95156139147c';
BEGIN
    v_id := _insert_issue('專案開發進度儀表板重構 (Project Dashboard Overhaul)', done, 'low', '專案開發進度儀表板重構 — Progress: 100%', 93);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_pm);

    v_id := _insert_issue('OCR 服務 lint 與型別檢查修正', done, 'low', '修復 OCR 服務 ruff 規範問題並完成 ruff 驗證。Progress: 100%', 94);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_pm);

    v_id := _insert_issue('刪除錯誤的 vercel.json 配置文件', done, 'low', '移除破壞 Next.js App Router 的 SPA 重寫規則配置。Progress: 100%', 95);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_pm);

    v_id := _insert_issue('Winston 日誌系統重構為 Supabase 資料庫日誌', done, 'medium', '將 Winston 日誌改造為 Supabase 資料庫日誌。Progress: 100%', 96);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_pm);

    v_id := _insert_issue('雲端部署平台選擇說明書', done, 'low', '撰寫雲端部署平台選擇指南，涵蓋 7 個平台對比。Progress: 100%', 97);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_pm);

    v_id := _insert_issue('Project Progress Dashboard — 四階段 Tab 重構', done, 'medium', '將 1,478 行單一頁面拆分為四階段 Tab 架構。Progress: 100%', 98);
    UPDATE issues SET completed_at = now() WHERE id = v_id;
    PERFORM _add_label(v_id, lbl_pm);
END $$;

-- ============================================================
-- Step 3: Create Cycles
-- ============================================================
INSERT INTO cycles (id, created_at, updated_at, name, description, start_date, end_date,
    owned_by_id, project_id, workspace_id, view_props, sort_order,
    progress_snapshot, logo_props, timezone, version, created_by_id)
VALUES
    (gen_random_uuid(), now(), now(), 'Sprint 1 — MVP Core (核心功能)',
     '使用者認證、房東儀表板、物件管理基礎功能',
     '2026-01-15 00:00:00+00', '2026-03-15 00:00:00+00',
     :'user_id'::uuid, :'pj_id'::uuid, :'ws_id'::uuid,
     '{}'::jsonb, 10000, '{}'::jsonb, '{}'::jsonb, 'Asia/Taipei', 1, :'user_id'::uuid),
    (gen_random_uuid(), now(), now(), 'Sprint 2 — Tenant & Buyer (租客與買家)',
     '租客/買家儀表板、溝通中心、繳費記錄、房東客戶管理',
     '2026-03-16 00:00:00+00', '2026-05-15 00:00:00+00',
     :'user_id'::uuid, :'pj_id'::uuid, :'ws_id'::uuid,
     '{}'::jsonb, 20000, '{}'::jsonb, '{}'::jsonb, 'Asia/Taipei', 1, :'user_id'::uuid),
    (gen_random_uuid(), now(), now(), 'Sprint 3 — Finance & Contracts (金融與合約)',
     '金流支付整合、合約管理、報稅功能、財務管理',
     '2026-05-16 00:00:00+00', '2026-07-15 00:00:00+00',
     :'user_id'::uuid, :'pj_id'::uuid, :'ws_id'::uuid,
     '{}'::jsonb, 30000, '{}'::jsonb, '{}'::jsonb, 'Asia/Taipei', 1, :'user_id'::uuid),
    (gen_random_uuid(), now(), now(), 'Sprint 4 — AI & Advanced (AI 與進階)',
     'AI 語音助理、部落格 AI 寫手、照片增生、進階功能',
     '2026-07-16 00:00:00+00', '2026-09-15 00:00:00+00',
     :'user_id'::uuid, :'pj_id'::uuid, :'ws_id'::uuid,
     '{}'::jsonb, 40000, '{}'::jsonb, '{}'::jsonb, 'Asia/Taipei', 1, :'user_id'::uuid),
    (gen_random_uuid(), now(), now(), 'Sprint 5 — Polish & Launch (優化與上線)',
     '第三方整合、效能監控、安全審計、正式上線',
     '2026-09-16 00:00:00+00', '2026-11-15 00:00:00+00',
     :'user_id'::uuid, :'pj_id'::uuid, :'ws_id'::uuid,
     '{}'::jsonb, 50000, '{}'::jsonb, '{}'::jsonb, 'Asia/Taipei', 1, :'user_id'::uuid);

-- ============================================================
-- Step 4: Create Views
-- ============================================================
INSERT INTO issue_views (id, created_at, updated_at, name, description, query, access,
    filters, display_filters, display_properties, sort_order, logo_props, is_locked,
    owned_by_id, workspace_id, project_id, created_by_id, rich_filters)
VALUES
    (gen_random_uuid(), now(), now(), 'All In Progress (進行中)',
     '所有進行中的工作項目', '{}'::jsonb, 1,
     ('{"state":["' || :'st_in_progress' || '"]}')::jsonb,
     '{}'::jsonb, '{}'::jsonb, 10000, '{}'::jsonb, false,
     :'user_id'::uuid, :'ws_id'::uuid, :'pj_id'::uuid, :'user_id'::uuid, '{}'::jsonb),
    (gen_random_uuid(), now(), now(), 'All Completed (已完成)',
     '所有已完成的工作項目', '{}'::jsonb, 1,
     ('{"state":["' || :'st_done' || '"]}')::jsonb,
     '{}'::jsonb, '{}'::jsonb, 20000, '{}'::jsonb, false,
     :'user_id'::uuid, :'ws_id'::uuid, :'pj_id'::uuid, :'user_id'::uuid, '{}'::jsonb),
    (gen_random_uuid(), now(), now(), 'High Priority Backlog (高優先待辦)',
     '高優先級但尚未開始的項目', '{}'::jsonb, 1,
     ('{"state":["' || :'st_backlog' || '"],"priority":["high"]}')::jsonb,
     '{}'::jsonb, '{}'::jsonb, 30000, '{}'::jsonb, false,
     :'user_id'::uuid, :'ws_id'::uuid, :'pj_id'::uuid, :'user_id'::uuid, '{}'::jsonb),
    (gen_random_uuid(), now(), now(), 'Landlord Features (房東功能)',
     '所有房東相關功能', '{}'::jsonb, 1,
     ('{"label":["' || :'lbl_landlord' || '"]}')::jsonb,
     '{}'::jsonb, '{}'::jsonb, 40000, '{}'::jsonb, false,
     :'user_id'::uuid, :'ws_id'::uuid, :'pj_id'::uuid, :'user_id'::uuid, '{}'::jsonb);

-- ============================================================
-- Step 5: Create Pages
-- ============================================================
DO $$
DECLARE
    pid uuid;
BEGIN
    -- Page 1: Project Overview
    pid := gen_random_uuid();
    INSERT INTO pages (id, created_at, updated_at, name, description, description_html,
        description_stripped, access, owned_by_id, workspace_id, color, is_locked,
        view_props, logo_props, is_global, sort_order, created_by_id)
    VALUES (pid, now(), now(), '專案概述 (Project Overview)', '{}'::jsonb,
        '<h2>Owner Real Estate Agent SaaS</h2><p>多平台房地產仲介 SaaS 解決方案，專為房東和仲介提供物件管理、客戶管理、看房預約和文件處理功能。</p><h3>技術棧</h3><ul><li>前端: Expo / React Native + TypeScript</li><li>後端: Supabase (PostgreSQL 17)</li><li>認證: Supabase Auth (GoTrue)</li></ul>',
        '', 0, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, '', false,
        '{}'::jsonb, '{}'::jsonb, false, 10000, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);
    INSERT INTO project_pages (id, created_at, updated_at, page_id, project_id, workspace_id, created_by_id)
    VALUES (gen_random_uuid(), now(), now(), pid, 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);

    -- Page 2: Phase 1 Development
    pid := gen_random_uuid();
    INSERT INTO pages (id, created_at, updated_at, name, description, description_html,
        description_stripped, access, owned_by_id, workspace_id, color, is_locked,
        view_props, logo_props, is_global, sort_order, created_by_id)
    VALUES (pid, now(), now(), 'Phase 1 — 開發階段進度', '{}'::jsonb,
        '<h2>Phase 1: Development</h2><p>目前大部分功能處於開發階段。</p><ul><li>✅ 使用者身份驗證系統 (90%)</li><li>✅ 房東儀表板 (90%)</li><li>✅ VLM/OCR 自動填入 (95%)</li><li>✅ 公司首頁 (80%)</li><li>⏳ 超級管理員 RBAC (0%)</li></ul>',
        '', 0, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, '', false,
        '{}'::jsonb, '{}'::jsonb, false, 20000, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);
    INSERT INTO project_pages (id, created_at, updated_at, page_id, project_id, workspace_id, created_by_id)
    VALUES (gen_random_uuid(), now(), now(), pid, 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);

    -- Page 3: Phase 2 Testing
    pid := gen_random_uuid();
    INSERT INTO pages (id, created_at, updated_at, name, description, description_html,
        description_stripped, access, owned_by_id, workspace_id, color, is_locked,
        view_props, logo_props, is_global, sort_order, created_by_id)
    VALUES (pid, now(), now(), 'Phase 2 — 測試階段規劃', '{}'::jsonb,
        '<h2>Phase 2: Testing</h2><p>測試階段重點：</p><ul><li>單元測試覆蓋率目標: 80%+</li><li>E2E 測試: Playwright</li><li>效能測試: Lighthouse CI</li><li>安全測試: OWASP Top 10</li></ul>',
        '', 0, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, '', false,
        '{}'::jsonb, '{}'::jsonb, false, 30000, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);
    INSERT INTO project_pages (id, created_at, updated_at, page_id, project_id, workspace_id, created_by_id)
    VALUES (gen_random_uuid(), now(), now(), pid, 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);

    -- Page 4: Phase 3 Deployment
    pid := gen_random_uuid();
    INSERT INTO pages (id, created_at, updated_at, name, description, description_html,
        description_stripped, access, owned_by_id, workspace_id, color, is_locked,
        view_props, logo_props, is_global, sort_order, created_by_id)
    VALUES (pid, now(), now(), 'Phase 3 — 部署策略', '{}'::jsonb,
        '<h2>Phase 3: Deployment</h2><p>三階段部署策略：</p><ol><li>本地開發環境 (已完成)</li><li>測試環境: Supabase Free + Vercel Hobby</li><li>正式環境: Supabase Pro + Vercel Pro</li></ol><p>CI/CD: GitHub Actions</p>',
        '', 0, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, '', false,
        '{}'::jsonb, '{}'::jsonb, false, 40000, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);
    INSERT INTO project_pages (id, created_at, updated_at, page_id, project_id, workspace_id, created_by_id)
    VALUES (gen_random_uuid(), now(), now(), pid, 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);

    -- Page 5: Phase 4 Operations
    pid := gen_random_uuid();
    INSERT INTO pages (id, created_at, updated_at, name, description, description_html,
        description_stripped, access, owned_by_id, workspace_id, color, is_locked,
        view_props, logo_props, is_global, sort_order, created_by_id)
    VALUES (pid, now(), now(), 'Phase 4 — 運維監控計畫', '{}'::jsonb,
        '<h2>Phase 4: Operations</h2><p>運維監控重點：</p><ul><li>Uptime 目標: 99.9%</li><li>Error Rate 目標: < 0.1%</li><li>Response Time 目標: < 200ms</li><li>日誌系統: Supabase DB Logs</li></ul>',
        '', 0, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, '', false,
        '{}'::jsonb, '{}'::jsonb, false, 50000, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);
    INSERT INTO project_pages (id, created_at, updated_at, page_id, project_id, workspace_id, created_by_id)
    VALUES (gen_random_uuid(), now(), now(), pid, 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);

    -- Page 6: Architecture Decision Records
    pid := gen_random_uuid();
    INSERT INTO pages (id, created_at, updated_at, name, description, description_html,
        description_stripped, access, owned_by_id, workspace_id, color, is_locked,
        view_props, logo_props, is_global, sort_order, created_by_id)
    VALUES (pid, now(), now(), '架構決策記錄 (ADR)', '{}'::jsonb,
        '<h2>Architecture Decision Records</h2><h3>ADR-001: Supabase 作為 BaaS</h3><p>選擇 Supabase 而非 Firebase，因為 PostgreSQL 更適合複雜的 RLS 和關聯式查詢。</p><h3>ADR-002: Winston → Supabase DB Logs</h3><p>Serverless 環境無法持久化文件日誌，改用 Supabase 資料庫日誌。</p><h3>ADR-003: 刪除 vercel.json</h3><p>SPA 重寫規則會破壞 Next.js App Router 的 SSR 功能。</p>',
        '', 0, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, '', false,
        '{}'::jsonb, '{}'::jsonb, false, 60000, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);
    INSERT INTO project_pages (id, created_at, updated_at, page_id, project_id, workspace_id, created_by_id)
    VALUES (gen_random_uuid(), now(), now(), pid, 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
        '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid, 'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid);
END $$;

-- ============================================================
-- Step 6: Create Intake
-- ============================================================
INSERT INTO intakes (id, created_at, updated_at, name, description, is_default,
    view_props, project_id, workspace_id, logo_props, created_by_id)
VALUES (gen_random_uuid(), now(), now(), 'Feature Requests (功能請求)',
    '接收新功能建議與需求', true, '{}'::jsonb,
    :'pj_id'::uuid, :'ws_id'::uuid, '{}'::jsonb, :'user_id'::uuid)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Step 7: Link ALL issues to modules (Phase 1 = Development)
-- ============================================================
DO $$
DECLARE
    dev_mod_id uuid;
    test_mod_id uuid;
    r record;
BEGIN
    SELECT id INTO dev_mod_id FROM modules
    WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
      AND name LIKE 'Phase 1%' LIMIT 1;

    SELECT id INTO test_mod_id FROM modules
    WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
      AND name LIKE 'Phase 2%' LIMIT 1;

    IF dev_mod_id IS NOT NULL THEN
        FOR r IN SELECT id FROM issues
            WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
              AND deleted_at IS NULL
        LOOP
            INSERT INTO module_issues (id, created_at, updated_at, issue_id, module_id, project_id, workspace_id, created_by_id)
            VALUES (gen_random_uuid(), now(), now(), r.id, dev_mod_id,
                'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
                '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
                'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
            ON CONFLICT DO NOTHING;
        END LOOP;
        RAISE NOTICE 'Linked all issues to Phase 1 (Development) module';
    END IF;
END $$;

-- ============================================================
-- Step 8: Link issues to cycles
-- ============================================================
DO $$
DECLARE
    c1_id uuid; c2_id uuid; c3_id uuid; c4_id uuid; c5_id uuid;
    r record;
BEGIN
    SELECT id INTO c1_id FROM cycles WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND name LIKE 'Sprint 1%';
    SELECT id INTO c2_id FROM cycles WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND name LIKE 'Sprint 2%';
    SELECT id INTO c3_id FROM cycles WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND name LIKE 'Sprint 3%';
    SELECT id INTO c4_id FROM cycles WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND name LIKE 'Sprint 4%';
    SELECT id INTO c5_id FROM cycles WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND name LIKE 'Sprint 5%';

    -- Sprint 1: System/Auth + Super Admin (in-progress/done items)
    FOR r IN SELECT i.id FROM issues i
        JOIN issue_labels il ON il.issue_id = i.id
        WHERE i.project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
          AND i.deleted_at IS NULL
          AND (il.label_id IN ('243ec77b-8edb-44fd-8714-129a9712cb90'::uuid, '6fe7c244-e20c-47e4-9e17-30d56a324778'::uuid)
               OR i.state_id = 'a4993c10-3e55-4112-a275-552b54e5a46e'::uuid
               OR i.state_id = 'cf74ed40-a2f3-4fa1-9914-de4014181d7e'::uuid)
    LOOP
        INSERT INTO cycle_issues (id, created_at, updated_at, issue_id, cycle_id, project_id, workspace_id, created_by_id)
        VALUES (gen_random_uuid(), now(), now(), r.id, c1_id,
            'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
            '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
            'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Sprint 2: Tenant + Buyer + Landlord client mgmt
    FOR r IN SELECT i.id FROM issues i
        JOIN issue_labels il ON il.issue_id = i.id
        WHERE i.project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
          AND i.deleted_at IS NULL
          AND il.label_id IN ('e90312fa-8845-431a-9cbf-85329ead5a41'::uuid, '1e2b2d40-1be5-4f76-a98a-68605da48bb8'::uuid)
    LOOP
        INSERT INTO cycle_issues (id, created_at, updated_at, issue_id, cycle_id, project_id, workspace_id, created_by_id)
        VALUES (gen_random_uuid(), now(), now(), r.id, c2_id,
            'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
            '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
            'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Sprint 3: Finance + Contracts + Payments
    FOR r IN SELECT i.id FROM issues i
        JOIN issue_labels il ON il.issue_id = i.id
        WHERE i.project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
          AND i.deleted_at IS NULL
          AND il.label_id IN ('8aa28d08-3216-456a-98a9-d2d2fdeb73c0'::uuid, '1846a534-de09-4043-a54a-18601c2ac6f8'::uuid)
    LOOP
        INSERT INTO cycle_issues (id, created_at, updated_at, issue_id, cycle_id, project_id, workspace_id, created_by_id)
        VALUES (gen_random_uuid(), now(), now(), r.id, c3_id,
            'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
            '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
            'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Sprint 3 also: landlord finance items
    FOR r IN SELECT id FROM issues
        WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
          AND deleted_at IS NULL AND name LIKE '房東財務%'
    LOOP
        INSERT INTO cycle_issues (id, created_at, updated_at, issue_id, cycle_id, project_id, workspace_id, created_by_id)
        VALUES (gen_random_uuid(), now(), now(), r.id, c3_id,
            'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
            '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
            'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Sprint 4: AI features + Blog
    FOR r IN SELECT id FROM issues
        WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
          AND deleted_at IS NULL
          AND (name LIKE '%AI%' OR name LIKE '%部落格%' OR name LIKE '%Blog%')
    LOOP
        INSERT INTO cycle_issues (id, created_at, updated_at, issue_id, cycle_id, project_id, workspace_id, created_by_id)
        VALUES (gen_random_uuid(), now(), now(), r.id, c4_id,
            'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
            '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
            'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Sprint 5: Third party + monitoring
    FOR r IN SELECT i.id FROM issues i
        JOIN issue_labels il ON il.issue_id = i.id
        WHERE i.project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
          AND i.deleted_at IS NULL
          AND il.label_id = '6dc71601-4c5b-457c-8782-9cc1167e2ad1'::uuid
    LOOP
        INSERT INTO cycle_issues (id, created_at, updated_at, issue_id, cycle_id, project_id, workspace_id, created_by_id)
        VALUES (gen_random_uuid(), now(), now(), r.id, c5_id,
            'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
            '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
            'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    -- Sprint 5 also: monitoring items
    FOR r IN SELECT id FROM issues
        WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid
          AND deleted_at IS NULL
          AND (name LIKE '%監控%' OR name LIKE '%審計%')
    LOOP
        INSERT INTO cycle_issues (id, created_at, updated_at, issue_id, cycle_id, project_id, workspace_id, created_by_id)
        VALUES (gen_random_uuid(), now(), now(), r.id, c5_id,
            'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid,
            '3d89e847-5c46-49c3-ad41-53b9f75a76e8'::uuid,
            'fa5eeb07-8237-4362-b34d-8291781fdee5'::uuid)
        ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Cycle linking complete';
END $$;

-- ============================================================
-- Cleanup helper functions
-- ============================================================
DROP FUNCTION IF EXISTS _insert_issue(text, uuid, text, text, int);
DROP FUNCTION IF EXISTS _add_label(uuid, uuid);

COMMIT;

-- ============================================================
-- Final summary
-- ============================================================
SELECT 'Labels' as type, count(*) as cnt FROM labels WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
UNION ALL
SELECT 'Modules', count(*) FROM modules WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
UNION ALL
SELECT 'Issues', count(*) FROM issues WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
UNION ALL
SELECT 'Cycles', count(*) FROM cycles WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
UNION ALL
SELECT 'Views', count(*) FROM issue_views WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
UNION ALL
SELECT 'Pages', count(*) FROM project_pages WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
UNION ALL
SELECT 'Intakes', count(*) FROM intakes WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
UNION ALL
SELECT 'Module Links', count(*) FROM module_issues WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
UNION ALL
SELECT 'Cycle Links', count(*) FROM cycle_issues WHERE project_id = 'f52a75a6-3bba-4193-9b02-7d5045dc93b9'::uuid AND deleted_at IS NULL
ORDER BY type;
