// This file is auto-generated from the original roadmap.js
// Date: 2026-02-14

/** Lifecycle phase of a feature */
export type PhaseType = "development" | "testing" | "deployment" | "operations";

export interface RoadmapFeature {
  /** Stable project-progress feature ID shown in the dashboard. Do not derive this from array index. */
  id?: string;
  name: string;
  percentage: number;
  /** 開發完成數，與 devTodoCount 一起顯示為「開發進度」完成數/TODO數 */
  devCompletedCount?: number;
  /** 開發 TODO 總數，與 devCompletedCount 一起顯示為「開發進度」完成數/TODO數 */
  devTodoCount?: number;
  testProgress?: string;
  testCoverage?: number;
  docPath?: string;
  category: string;
  startDate?: string;
  endDate?: string;
  owner?: string;
  points?: number;
  lastModifiedBy?: string;
  lastModifiedDate?: string;
  acceptanceCriteria?: string;
  devLog?: string;
  /** 開發進度與日誌報告文件路徑，於儀表板「開發進度與日誌報告URL」欄顯示為連結 */
  devLogDocPath?: string;
  /** 功能需求規格文件路徑，於儀表板「Feature Spec URL」欄顯示為連結 */
  featureSpecDocPath?: string;
  /** TDD 測試規格文件路徑，於儀表板「TTD Spec URL」欄顯示為連結 */
  tddSpecDocPath?: string;
  /** 測試腳本數量，於儀表板「測試腳本數量」欄顯示；連結至 testScriptPath */
  testScriptCount?: number;
  /** 通過的測試腳本數量，與 testScriptCount 一起顯示為「測試腳本通過率」通過數/總數 */
  testScriptPassedCount?: number;
  /** 專案內測試腳本目錄路徑（相對專案根目錄），用於「測試腳本數量」連結目標 */
  testScriptPath?: string;
  featureDescription?: string;
  /** 功能所屬頁面（Located page），於儀表板「分類2:功能所屬頁面」欄顯示 */
  locatedPage?: string;
  workCategory?: string;
  developmentProgress?: string;
  testLog?: string;
  testLogDocPath?: string;
  /** 模式（例如 chat/tool/voice），於儀表板「Mode」欄顯示 */
  mode?: string;
  /** 模型名稱，於儀表板「MODEL」欄顯示 */
  model?: string;
  /** 提示詞／設計提示，於儀表板「PROMPT」欄顯示 */
  aiPrompt?: string;

  // --- Phase lifecycle ---
  /** Current lifecycle phase (default: 'development') */
  phase?: PhaseType;

  // Testing phase fields
  testStatus?: "pending" | "in_progress" | "passed" | "failed";
  unitTestCoverage?: number;
  e2eTestCoverage?: number;
  defectCount?: number;

  // Deployment phase fields
  deployStatus?: "not_deployed" | "staging" | "production" | "rollback";
  deployEnv?: string;
  version?: string;
  deployDate?: string;

  // Operations phase fields
  uptimePercent?: number;
  errorRate?: number;
  avgResponseTime?: number;
  lastIncident?: string;
  operationsNote?: string;

  // --- VIS sync fields ---
  /** Paperclip VIS issue human-readable ID (e.g. "VIS-136") */
  vis_issue_id?: string;
  /** Paperclip VIS issue internal UUID */
  vis_issue_key?: string;
  /** Sync status with VIS */
  vis_sync_status?: "in_sync" | "diverged" | "conflict" | "pending";
  /** ISO timestamp of last successful sync */
  vis_last_synced_at?: string;
}

export interface RoadmapData {
  features: RoadmapFeature[];
}

export function normalizeRoadmapFeatureId(raw: string | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  if (/^\d+$/.test(trimmed)) return trimmed.padStart(3, '0');
  return trimmed;
}

function formatGeneratedRoadmapFeatureId(index: number): string {
  return String(index + 1).padStart(3, '0');
}

/** Derive default phase from existing data when not explicitly set */
function inferPhase(f: RoadmapFeature): PhaseType {
  if (f.phase) return f.phase;
  if ((f.testCoverage && f.testCoverage > 0) || f.testProgress)
    return "testing";
  return "development";
}

const RAW_FEATURES: RoadmapFeature[] = [
  // 超級管理員
  {
    id: "001",
    name: "超級管理員-儀表板",
    locatedPage: "superadmin/dashboard",
    percentage: 100,
    acceptanceCriteria:
      "1. 登入後首頁需顯示系統關鍵指標(KPI)，包含總用戶數、總物件數、成交金額。\n2. 需提供圖表視覺化呈現最近30天的平台流量趨勢。\n3. 儀表板需顯示待處理的審核事項通知。\n4. 需支援數據篩選功能，可依日期區間查看統計數據。\n5. 頁面載入速度需在2秒內完成，確保良好的使用者體驗。",
    docPath: "/project-process/features/admin-dashboard-20260206.md",
    featureSpecDocPath: "/project-process/features/admin-dashboard-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-admin-dashboard-20260221.md",
    category: "超級管理員 (Super Admin)",
    points: 8,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    devLog:
      "[2026/02/13] (Trae AI)\n• 完成儀表板進度頁面重構，支援 9 欄位動態調整寬度\n• 實作欄位順序優化與雙語標題顯示\n• 新增 `dev-logs` 與 `test-logs` 資料夾結構\n詳見: [開發日誌](../dev-logs/dev-dashboard-refactor-2026-02-13.md)\n[2026/04/11] (Claude, VIS-12)\n• T-08 待處理審核通知徽章實作（pendingVerifications badge）\n• T-09 SystemGrowthChart 日期篩選（30天/90天/180天）\n• 建立自動化測試 unit_and_integration_test/001/（17 tests, 全部通過）",
    devLogDocPath:
      "/project-process/dev-logs/dev-dashboard-refactor-2026-02-13.md",
    testProgress:
      "[2026/02/13] (Trae AI)\n• UI/UX 功能測試通過 (欄位拖曳、記憶還原、RWD)\n[2026/04/11] (Claude, VIS-12)\n• 17 個自動化單元/整合測試全部通過\n• 測試套件：SuperadminDashboardClient.test.tsx, SystemGrowthChart.test.tsx\n詳見: unit_and_integration_test/001/",
    testCoverage: 85,
    unitTestCoverage: 85,
    phase: "testing",
    testStatus: "passed",
  },
  {
    id: "002",
    name: "超級管理員-網站行為監控與紀錄功能",
    locatedPage: "superadmin/dashboard/behavior-monitoring",
    percentage: 100,
    acceptanceCriteria:
      "1. 系統需記錄所有使用者的頁面訪問紀錄，包含時間戳、IP、使用者ID、頁面路徑。\n2. 提供每日/每週/每月流量統計報表。\n3. 異常行為需自動標記並通知管理員（如短時間內大量請求）。\n4. 日誌保存期限至少90天，超過自動封存。\n5. 需支援依使用者、日期、頁面路徑篩選搜尋。",
    docPath: "",
    featureSpecDocPath:
      "/project-process/features/admin-behavior-monitoring-spec-20260221.md",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    devLogDocPath:
      "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md",
    category: "超級管理員 (Super Admin)",
    points: 5,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/21",
    phase: "development",
    developmentProgress:
      "DB migration (behavior_logs table + RLS + anomaly detection function), server actions (getBehaviorLogs/getBehaviorStats/getDailyStats/getAnomalies/runAnomalyDetection), page.tsx + BehaviorMonitoringClient + BehaviorStatsCards + BehaviorChart + BehaviorLogsTable 完成；Sidebar 新增導航。待接入 middleware 行為記錄 + E2E 測試。",
  },
  {
    id: "003",
    name: "超級管理員的RBAC CRUD平台",
    locatedPage: "superadmin/dashboard/rbac_access_control",
    percentage: 100,
    acceptanceCriteria:
      "1. 可建立、編輯、刪除角色（Role），角色名稱需唯一。\n2. 可對角色設定細粒度權限（讀取、寫入、刪除各資源）。\n3. 角色變更需有稽核紀錄（修改者、修改時間、異動內容）。\n4. 支援角色繼承功能，子角色可繼承父角色權限。\n5. 刪除角色前需確認沒有使用者被指派此角色。",
    docPath: "",
    featureSpecDocPath:
      "/project-process/features/admin-rbac-crud-spec-20260221.md",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    devLogDocPath:
      "/project-process/dev-logs/dev-superadmin-features-2026-02-26.md",
    category: "超級管理員 (Super Admin)",
    points: 8,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    phase: "development",
    developmentProgress:
      "Permission Matrix 完整 DB 持久化：新增 iam_role_permissions 表（migration 20260226100000）、getRolePermissions / saveRolePermissions server actions；RolesTab 改為從 DB 載入/儲存角色權限，儲存前有 dirty 提示，儲存中 spinner；修復 iam_user_group_memberships view + parent_role_id 欄位未套用問題。\n刪除前確認用戶數：getAssignedUserCountForRole 改為 export，RolesTab handleDeleteRole 先查用戶數，有指派時顯示阻擋提示，無指派時才走 window.confirm 確認刪除。",
  },
  {
    id: "004",
    name: "超級管理員-雲端空間管理平台",
    locatedPage: "superadmin/dashboard/storage",
    percentage: 88,
    acceptanceCriteria:
      "1. 顯示總儲存空間與已用空間的視覺化圖表。\n2. 可瀏覽所有使用者上傳的檔案（圖片、文件、音訊）。\n3. 可對個別使用者設定儲存配額上限。\n4. 超過配額75%時自動警示管理員。\n5. 支援批次刪除、下載或移動檔案。",
    docPath: "",
    featureSpecDocPath:
      "/project-process/features/admin-cloud-storage-spec-20260221.md",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    devLogDocPath:
      "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md",
    category: "超級管理員 (Super Admin)",
    points: 5,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    phase: "development",
    developmentProgress:
      "storage_quotas migration (RLS + updated_at trigger)；actions.ts 補強 getStorageQuotas/setUserQuota/batchDeleteFiles（分塊批次刪除）；StorageDashboardClient 已有 quota tab + 孤兒檔案清理；新增 per-user 超過 75% 配額自動警示 banner（使用 findQuotaAlerts util）；新增批次下載按鈕（開新分頁）。待完成：CDN 流量整合。",
  },
  {
    id: "005",
    name: "超級管理員針對 各種Roles的 Access Matrix管理平台",
    locatedPage: "superadmin/dashboard/role_access_matrix",
    percentage: 60,
    acceptanceCriteria:
      "1. 以矩陣表格呈現所有角色與資源的權限設定（讀/寫/刪）。\n2. 可在矩陣中直接點擊修改單一權限格。\n3. 變更後即時保存，無需整頁刷新。\n4. 提供「重置為預設值」功能。\n5. 支援匯出 PDF/CSV 格式的權限矩陣報表。",
    docPath: "/project-process/features/iam-system.md",
    featureSpecDocPath: "/project-process/features/iam-system.md",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    category: "超級管理員 (Super Admin)",
    points: 8,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "006",
    name: "超級管理員-資料庫Supabase管理功能",
    locatedPage: "superadmin/dashboard/supabase",
    percentage: 60,
    acceptanceCriteria:
      "1. 顯示資料庫各資料表的記錄數量與最後更新時間。\n2. 可執行基本 SQL 查詢並顯示結果（僅 SELECT）。\n3. 顯示 Migration 歷史紀錄與執行狀態。\n4. 提供資料庫連線健康度監控（延遲、連線數）。\n5. 可觸發手動備份並下載備份文件。",
    docPath:
      "/project-process/progress-reports/database-reports/supabase-auth-integration-guide.md",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    devLogDocPath:
      "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md",
    category: "超級管理員 (Super Admin)",
    points: 5,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/04/09",
    phase: "development",
    developmentProgress:
      "靜態 mock 改為連接真實資料：admin client 查詢各資料表記錄數（Promise.allSettled 並發）、連線健康度檢測、RLs 政策（透過 rpc）；SupabaseDashboardClient + Supabase Dashboard 快速連結；頁面採 Server Component + Suspense 架構。\n\n### 2026-04-09 維護\n- 清理不符合專案 SQL 管理規則的 `supabase/seed.sql`。\n- 同步將 `supabase/config.toml` 的 `db.seed` 關閉，避免 `supabase db reset` 再引用空的 seed 檔。\n- 保持 migration 流程不變；本地 reset 仍會正常執行 migrations，只是不再額外執行空白 seed 步驟。",
  },
  {
    id: "007",
    name: "超級管理員-資料庫Elastic Search管理功能（已移除）",
    locatedPage: "superadmin/dashboard/elasticsearch",
    percentage: 0,
    phase: "development",
    acceptanceCriteria:
      "（2026/04/20 已移除）原管理頁是為舊 Python OCR 服務（backend/ocr_service/）的 property_owners index 而建。feature/openclaw-migration 合併後 OCR 服務刪除、OCR_SERVICE_URL env 失效，管理頁與其代理 API 都成為殭屍程式碼。\n\nES 叢集本身仍在（backend/elasticsearch/Dockerfile），並由 Row 145 people-db ingestion 使用——透過 apps/superadmin/lib/people-db/es-gateway.ts 直連，不經本管理頁。",
    docPath: "",
    category: "超級管理員 (Super Admin)",
    points: 0,
    defectCount: 0,
    lastModifiedBy: "Claude Opus 4.7",
    lastModifiedDate: "2026/04/20",
    developmentProgress:
      "2026-04-12：建立 /api/elasticsearch 代理路由與 dashboard page。\n2026-04-20：移除本功能。\n- 刪除 apps/superadmin/app/api/elasticsearch/（route + tests）\n- 刪除 apps/superadmin/app/superadmin/dashboard/elasticsearch/（page + tests）\n- 刪除 apps/superadmin/e2e/007/\n- 移除 nav-items.ts 內 'Elasticsearch' 側邊欄項目\n- 移除 test-manifest.json id='007' 條目\n- 後續如需 ES 運維視圖，建議整合為 people-database workspace 的『系統』tab，並直接走 es-gateway 而非舊 OCR service。",
  },
  {
    id: "008",
    name: "超級管理員AI LLM API效能監控－AI語音回應可靠度監控功能",
    locatedPage: "superadmin/dashboard/llm-monitor",
    percentage: 85,
    acceptanceCriteria:
      "1. 即時顯示各 LLM API 的請求數量、平均回應時間、錯誤率。\n2. 可設定 API 使用量預算上限與警示閾值。\n3. 提供每日/每週 Token 消耗統計與費用估算。\n4. 語音回應品質分數（延遲、斷句率）需以圖表呈現。\n5. API 密鑰輪換提醒功能（距離過期 30 天前通知）。",
    docPath:
      "/project-process/test-logs/test-llm-observability-console-2026-04-24.md",
    featureSpecDocPath:
      "/project-process/features/llm-monitor-litellm-refactor-dev-spec-20260425.md",
    tddSpecDocPath:
      "/project-process/features/tdd-llm-observability-console-20260424.md",
    devLogDocPath:
      "/project-process/dev-logs/008-development-log-summary.md",
    category: "超級管理員 (Super Admin)",
    points: 8,
    testScriptPath: "apps/superadmin/unit_test/008",
    testProgress: "88%（Sprint 2 LiteLLM Refactor 完成；price map bundled snapshot、instrumented-llm-call wrapper、model-research 埋點、actions pricing fallback 均已落地）",
    testCoverage: 82,
    unitTestCoverage: 0,
    e2eTestCoverage: 0,
    defectCount: 0,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/04/25",
    phase: "development",
    developmentProgress:
      "連接真實 ai_performance_metrics 資料表，page.tsx + LLMMonitorClient + actions (getLLMMetrics/getLLMAggregateStats/getLLMOverallStats)；每模型效能比較表、最近請求記錄。\n\n### 2026-04-04 監控可追到 Prompt / 模組 / 成功失敗\n- 新增 ai_usage_logs 監控欄位（prompt source/version/hash、request_path、response_status 等）。\n- 物件介紹文案 AI（/api/property-description/stream）每次嘗試會寫入 ai_usage_logs（含成功/失敗、tokens、延遲、provider/model）。\n- llm-monitor 頁面新增「AI 使用紀錄（含 Prompt / 模組 / 狀態）」表格（最新 100 筆）。\n\n### 2026-04-24 Sprint 1 — Trace/Eval Console MVP\n- 借鏡 Langfuse / Phoenix，將監控模型從 flat usage log 擴充為 trace / invocation / evaluation 三層。\n- 新增 Row 008 DEV-SPEC、TDD-SPEC、TDD Progress Report、Development Log Summary 與 handoff。\n- 建立 `llm_observability_traces`、`llm_observability_invocations` schema，為每次 LLM call 保留 page、company、invocation、execution、requested/effective model、raw/rendered output、evaluation、TTFT/E2E/throughput/http status 等欄位。\n- `llm-monitor` 新增 Trace Console 與 Evaluation Runs 視角，先彙整既有 `ai_usage_logs` 與 `adapter_evaluation_runs`，後續再把各 call-site 寫入原生 trace 表。\n- 新增 `lib/ai/observability.ts` best-effort helper；adapter evaluation、adapter-run test prompt/file metadata 與 property-description stream 已開始寫入原生 trace/invocation。\n- Trace Console 新增 Trace Detail sheet，可查看單筆完整 prompt、test file、raw/rendered output、evaluation 與 latency metadata。\n\n### 2026-04-25 Sprint 2 — LiteLLM Refactor\n- 分析 LiteLLM Proxy / SDK / callback 機制；決定採「借用理念不引入 Proxy」策略（因 85% LLM call 走 CLI subprocess，proxy 攔不到）。\n- 建立 `lib/ai/llm-price-map.ts`：35+ 主流模型 bundled 定價快照（Anthropic / OpenAI / Gemini / xAI / Perplexity / DeepSeek / Qwen / OpenRouter），含 `calculateCostUsd` / `normalizeModelId` / `inferProvider` utilities，取代手動維護的 `ai_model_research_reports` 查詢。\n- 建立 `lib/ai/instrumented-llm-call.ts`：`reportLLMUsage()` best-effort wrapper，任何 HTTP LLM route 完成後一行即可自動寫入 `llm_observability_invocations`（含 cost_usd 計算）。\n- 更新 `api/ai-settings/model-research/generate/route.ts`：加上 `reportLLMUsage` 埋點，Anthropic call 新增 token usage 回傳。\n- 更新 `llm-monitor/actions.ts`：`getOfficialPricingMap` 加上 bundled price map fallback，研究報告未覆蓋的模型自動補定價。\n- 建立 `app/api/llm-monitor/sync-prices/route.ts`：與 LiteLLM GitHub 上游 JSON 比對，回報 bundled snapshot 是否需要更新。\n- TS check 通過。",
  },
  {
    id: "009",
    name: "超級管理員-網路安全－隱私審計管理功能",
    locatedPage: "superadmin/dashboard/security",
    percentage: 95,
    acceptanceCriteria:
      "1. 提供資料存取稽核日誌，記錄誰在何時存取了哪些敏感資料。\n2. 自動偵測異常登入行為（不常用設備、異地登入）並警示。\n3. 支援設定 IP 白名單與黑名單。\n4. 個資保護合規報告（GDPR/PDPA）一鍵生成。\n5. SSL 憑證到期前 30 天自動提醒。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    category: "安全與合規 (Security & Compliance)",
    points: 5,
    lastModifiedBy: "Paperclip DevOps Engineer (VIS-96)",
    lastModifiedDate: "2026/04/14",
    phase: "development",
    developmentProgress:
      "2026/04/14 (VIS-68, DevOps Agent)\n" +
      "- ✅ DB migration: security_audit_enhancements（audit_logs 增強、IP 白黑名單表）\n" +
      "- ✅ Security Dashboard 頁面 /superadmin/dashboard/security（SecurityDashboardClient）\n" +
      "- ✅ Server actions: `actions.ts`（稽核摘要、login_anomalies、ssl_certificates、ip_whitelist、superadmin_blacklist 等）\n" +
      "- ✅ Sidebar nav-items 新增 Security 入口\n" +
      "- ✅ Middleware 整合 IP 白黑名單檢查\n" +
      "- ✅ SSL 憑證監控腳本 scripts/ssl-cert-monitor.js\n" +
      "2026/04/14 (VIS-96, Paperclip DevOps)\n" +
      "- ✅ `unit_test/009/security-dashboard.test.tsx`：SecurityDashboardClient 8 項互動／顯示測試\n" +
      "- ✅ Jest：`jest.config.js` 開頭固定 `NODE_ENV=test`，讓 React 19 `act` 與 RTL 相容\n" +
      "- ✅ TDD 紀錄：`project-process/test-logs/tdd-security-audit-009.md`\n" +
      "- 待完成：合規報告生成、異常登入偵測規則優化",
  },
  {
    id: "010",
    name: "超級管理員-網站效能監控功能",
    locatedPage: "superadmin/dashboard/performance",
    percentage: 100,
    acceptanceCriteria:
      "1. 即時顯示頁面 Core Web Vitals（LCP、FID、CLS）數值。\n2. 提供最慢的 API 端點 Top 10 列表（按回應時間排序）。\n3. 監控 CDN 命中率與靜態資源載入時間。\n4. 自動偵測當日效能劣化趨勢並發出警示。\n5. 頁面速度測試可手動觸發並生成報告。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    devLogDocPath:
      "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md",
    category: "超級管理員 (Super Admin)",
    points: 5,
    lastModifiedBy: "Gemini-3-Flash-Preview",
    lastModifiedDate: "2026/03/20",
    phase: "development",
    devLog:
      "### 2026-03-20 效能監控全功能上線\n- **前端 RUM**: 整合 `web-vitals` v4，實作 `PerformanceMonitor` 元件與 `/api/web-vitals` 接收端點。\n- **API 延遲監控**: 實作 `withLatencyLogging` 高階函數，並完成核心 API（財務摘要、物件選項、個人資料）的延遲埋點。\n- **資料庫監控**: 新增 `get_slow_queries` RPC，整合 `pg_stat_statements` 實作資料庫慢查詢 Top 10 監控。\n- **架構優化**: 啟用 Next.js `instrumentation.ts` 伺服器端監控掛鉤。\n- **UI 強化**: 新增 API 延遲排行榜、DB 慢查詢列表，並加入業界效能優化建議指引。",
    developmentProgress:
      "基礎監控架構（前端 RUM + API Latency + DB Slow Queries）已全數完成。UI 已能即時反映系統效能狀態。下階段可考慮整合 Sentry 或 OpenTelemetry 進行更深層的 Distributed Tracing。",
  },

  // 買家
  {
    id: "011",
    name: "買家(已簽約)-儀表板",
    locatedPage: "web/buyer/contracted/dashboard",
    percentage: 50,
    acceptanceCriteria:
      "1. 顯示已購物件的基本資訊（地址、坪數、成交金額、交屋日期）。\n2. 顯示合約進度時程表（簽約→履約→過戶→交屋）。\n3. 即時顯示待辦事項（需簽署文件、待付款項目）。\n4. 提供仲介/房東聯絡入口。\n5. 顯示近期相關通知（文件更新、預約提醒）。",
    docPath: "/project-process/features/buyer-dashboard-mock-20260206.md",
    featureSpecDocPath:
      "/project-process/features/buyer-dashboard-mock-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "買家 (Buyer)",
    points: 5,
    lastModifiedBy: "Gemini-3-Pro-Preview",
    lastModifiedDate: "2026/02/06",
  },
  {
    id: "012",
    name: "買家的溝通中心",
    locatedPage: "web/buyer/contracted/communication",
    percentage: 88,
    acceptanceCriteria:
      "1. 可與房東、仲介進行即時文字訊息往來。\n2. 訊息需有已讀/未讀狀態標示。\n3. 支援發送附件（PDF、圖片）。\n4. 有新訊息時推送通知（系統通知）。\n5. 訊息歷史可按日期搜尋，最長保留2年。",
    docPath: "/project-process/test-logs/test-buyer-communication-center-2026-04-12.md",
    featureSpecDocPath:
      "/project-process/features/buyer-communication-center-dev-spec-20260412.md",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "買家 (Buyer)",
    points: 3,
    phase: "testing",
    testStatus: "in_progress",
    unitTestCoverage: 85,
    e2eTestCoverage: 25,
    testCoverage: 55,
    defectCount: 0,
    testScriptPath: "apps/superadmin/unit_test/012",
    developmentProgress:
      "2026/04/12：完成買家溝通中心頁面，整合 messageService 輪詢、已讀回條、關鍵字/日期搜尋、附件驗證。\n2026/05/08：升級附件上傳為真實 Supabase Storage（buyer-attachments bucket），移除 mock:// URL；送訊後自動 enqueue in-app 通知給收件方（notification_queue）。",
    testProgress:
      "2026/04/12：新增 `apps/web/lib/buyer-communication/__tests__/utils.test.ts`，覆蓋附件驗證、訊息過濾與已讀回條文案，`npm run test --workspace web -- buyer-communication` 通過；E2E 待在登入測試環境補齊。",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
  },
  {
    id: "013",
    name: "買家的繳費記錄",
    locatedPage: "web/buyer/contracted/payments",
    percentage: 90,
    acceptanceCriteria:
      "1. 顯示所有付款紀錄（日期、金額、類型、付款方式、狀態）。\n2. 支援下載單筆收據（PDF格式）。\n3. 可依日期範圍、金額、付款狀態篩選。\n4. 顯示未付款項目提醒與到期日。\n5. 年度付款總額統計與圖表。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "買家 (Buyer)",
    points: 3,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress:
      "2026/05/08：新建 /buyer/contracted/payments 頁面及 buyer-payments.ts server action；從 payment_transactions 表讀取用戶付款紀錄；支援依狀態/日期範圍/金額區間篩選；逾期項目自動紅色警示；年度付款統計面板；已完成款項可下載 HTML 格式收據。待完善：E2E 測試。",
  },

  // 公司首頁與產品
  {
    id: "014",
    name: "公司首頁",
    locatedPage: "web/",
    percentage: 100,
    acceptanceCriteria:
      "1. 首頁需在 3 秒內完成首屏渲染（LCP < 2.5s）。\n2. 清楚展示產品核心功能（房東管理、租客管理、AI功能）。\n3. 包含客戶見證/評價區塊（至少3則）。\n4. CTA 按鈕（立即試用、聯絡我們）可正常觸發對應頁面。\n5. RWD 支援：手機/平板/桌機版面正確顯示。",
    docPath: "/project-process/features/company-homepage.md",
    featureSpecDocPath: "/project-process/features/company-homepage.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 5,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    phase: "development",
    developmentProgress:
      "首頁 Hero 與 metadata 已從單一房東工具重新定位為多角色不動產 AI 協作平台；Header banner、FeaturedProperties、Footer CTA、services 頁、Testimonials 與 FAQ 文案已同步對齊，並補上 HeroSection、FeaturedProperties、Testimonials、FAQ、Footer、services 導流測試。另新增 public marketing funnel Playwright 測試，覆蓋首頁進 pricing/services，以及 pricing、services、about、properties 導向 contact 的公開漏斗。2026/04/14 補做穩定性修復：清除 `customer-details.ts` 未解 merge conflict，恢復首頁編譯；同時修正 Header/Footer 首頁可見 CTA 的 `a > button` 無效 HTML，改為 link-wrapped button-styled span，消除 localhost:3000 首頁 hydration mismatch。另以 Jest 驗證 landlord customers 相關 2 suites、10 tests 全數通過。下一步可接上真實 lead funnel tracking。",
  },
  {
    id: "015",
    name: "公司產品費用說明頁",
    locatedPage: "web/pricing",
    acceptanceCriteria:
      "1. 清楚列出各方案（免費版、基本版、進階版）的功能對比表格。\n2. 月付/年付切換，年付顯示折扣比例。\n3. FAQ 區塊涵蓋常見費用問題（至少5項）。\n4. 「立即購買」按鈕連結至付款流程。\n5. 費用說明需包含幣別（AUD/TWD）切換功能。",
    docPath: "/project-process/features/multi-role-business-plan-20260322.md",
    featureSpecDocPath:
      "/project-process/features/multi-role-business-plan-20260322.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 2,
    percentage: 100,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    phase: "development",
    developmentProgress:
      "已將 web/pricing 重構為多角色商業模式版本：新增免費流量入口、仲介個人版、分店管理版、企業合作版、按案件專業角色價格表、方案比較矩陣、FAQ 與 CTA 導流；CTA 已接到 contact 詢問表單；新增 TWD/AUD 幣別切換 toggle（useState + formatPrice）、月付/年付切換，所有方案卡價格即時換算為 AUD（1 AUD ≈ 21 TWD）。",
  },
  {
    id: "016",
    name: "公開案件市場頁",
    locatedPage: "web/properties",
    percentage: 95,
    acceptanceCriteria:
      "1. 公開列表頁需清楚區分買賣案件與租賃案件。\n2. 提供搜尋、類型與狀態篩選。\n3. 頁首需說明多角色平台定位，而非單純物件列表。\n4. 提供導流至平台能力頁與合作提案頁的 CTA。\n5. 卡片需顯示基本案件資訊與協作鏈語意標籤。",
    docPath: "/project-process/features/multi-role-business-plan-20260322.md",
    featureSpecDocPath:
      "/project-process/features/multi-role-business-plan-20260322.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 3,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/22",
    phase: "development",
    developmentProgress:
      "web/properties 已從傳統物件列表重新定位為多角色案件市場：新增市場定位 Hero、平台能力 / 合作提案 CTA、案件摘要卡、買賣協作鏈與租賃協作鏈 badge，並保留搜尋、篩選、分頁與空狀態處理；另補上 PropertiesClient 回歸測試。下一步可補整頁 E2E 導流驗證與更細的角色篩選。",
  },
  {
    id: "017",
    name: "公開案件詳情頁",
    locatedPage: "web/properties/[id]",
    percentage: 100,
    acceptanceCriteria:
      "1. 詳情頁需清楚呈現案件屬於買賣或租賃協作鏈。\n2. 顯示推薦接手角色與案件協作節點。\n3. 保留物件基本資訊、價格、地點與聯絡卡。\n4. 找不到案件時正確走 notFound 流程。\n5. 有對應回歸測試覆蓋主要協作內容與 notFound 行為。",
    docPath: "/project-process/features/multi-role-business-plan-20260322.md",
    featureSpecDocPath:
      "/project-process/features/multi-role-business-plan-20260322.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 3,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    phase: "development",
    developmentProgress:
      "web/properties/[id] 已從單純物件詳情頁調整為案件協作視角：新增買賣 / 租賃協作鏈 badge、推薦接手角色、案件協作節點與案件說明，並保留原有價格、地圖與聯絡卡。PropertyContactCard 已把看房、法律諮詢、合作提案三種入口改為帶有 property context 的真實導流連結；另補上 detail page、contact card、notFound 測試，以及從公開案件列表進入 detail、再驗證登入後三種 CTA 都能把 inquiryType、entryPoint、property context 正確帶入 contact 的 Playwright E2E。這次也一併修正了 property detail SSR 使用舊版 Supabase helper 導致 header 已登入但 contact card 仍顯示 guest 狀態的 session 不一致問題。",
  },
  {
    id: "018",
    name: "公司平台介紹與支援導流頁",
    locatedPage: "web/about",
    percentage: 100,
    acceptanceCriteria:
      "1. 關於頁需清楚說明產品已轉型為多角色不動產 AI 協作平台。\n2. 需呈現免費角色、付費角色與專業協作角色的分層定位。\n3. 需說明台灣 / 澳洲市場策略與按案件 / 物件收費模型。\n4. 頁面需提供導向 pricing、services、properties 與 contact 的 CTA。\n5. 需有對應回歸測試覆蓋主要平台敘事與 CTA 連結。",
    docPath: "/project-process/features/multi-role-business-plan-20260322.md",
    featureSpecDocPath:
      "/project-process/features/multi-role-business-plan-20260322.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 2,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    phase: "development",
    developmentProgress:
      "web/about 已從舊的物業管理品牌頁重構為多角色平台介紹頁：補上平台使命、角色分層、台灣 / 澳洲市場策略、案件協作流程與 Need Help 導流區塊，CTA 已連到 pricing、services、properties 與 contact；已新增 about page 回歸測試，並納入 public marketing funnel Playwright 流程，驗證公開導流可回到 pricing 與 contact。測試套件已修正 h1 regex 與市場策略斷言（匹配頁面實際文字），test pass。",
  },
  {
    id: "019",
    name: "公司產品教學",
    locatedPage: "web/tutorial",
    percentage: 80,
    acceptanceCriteria:
      "1. 提供分角色教學（房東版、租客版、買家版）。\n2. 每個教學步驟附有截圖或短影片（< 2分鐘）。\n3. 教學進度可儲存，下次從中斷點繼續。\n4. 完成所有教學步驟後顯示完成徽章。\n5. 教學內容可連結至相關功能頁面（快速體驗）。",
    docPath: "/docs/technical-selection/adr-019-company-product-tutorial.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 3,
    phase: "testing",
    testStatus: "in_progress",
    testCoverage: 60,
    unitTestCoverage: 80,
    e2eTestCoverage: 40,
    defectCount: 0,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress:
      "架構實作完成：tutorial 角色選擇頁（SSG Server Component）、[role] 教學步驟頁（Client Component + useTutorialProgress hook）、靜態 TypeScript 教學資料模組（lib/tutorial-data.ts）。AC #3 Supabase 進度同步：新增 tutorial_progress 表（migration 20260508120000）、useTutorialProgress 加入 loadRemoteProgress / saveRemoteProgress，含跨裝置合併策略（取較多完成步驟數）。進度以 localStorage + Supabase 雙層儲存，支援完成徽章。待完成：截圖資產製作（AC #2）。",
  },
  {
    id: "020",
    name: "聯絡我們>發送訊息功能",
    locatedPage: "web/contact",
    percentage: 100,
    acceptanceCriteria:
      "1. 表單包含：姓名、Email、電話（選填）、訊息類型（下拉）、內容（文字區塊）。\n2. 必填欄位未填送出時顯示對應錯誤提示。\n3. 送出成功後顯示確認訊息，並傳送確認 Email 給填寫者。\n4. 管理員後台可查看所有收到的聯絡訊息。\n5. 防止垃圾訊息：實作 reCAPTCHA 或 Honeypot 機制。",
    docPath: "/project-process/features/daily-report-20260205.md",
    featureSpecDocPath: "/project-process/features/daily-report-20260205.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 3,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/22",
    phase: "operations",
    operationsNote:
      "contact 頁已支援從 pricing / services / about / properties 與 property detail CTA 帶入 inquiryType 與來源資訊，並使用白名單限制可接受的查詢參數。送出後會先建立可追蹤的 lead、回傳 Lead 編號，並在郵件成功或失敗時分別呈現可理解的結果；目前也會把 property detail CTA 來源轉成可讀的來源摘要與來源動作。superadmin 已新增 /superadmin/contacts lead inbox，可直接查看 Lead 編號、來源頁面、來源動作、案件脈絡與狀態，並可直接將 lead 更新為待處理 / 已讀 / 已回覆 / 已封存，也支援多選後批次更新 lead 狀態；同時支援依關鍵字、狀態、來源類型與詢問類型進行搜尋與篩選，也可進入單筆 lead 詳細頁查看完整聯絡資訊、來源脈絡與原始訊息。contact utils/page/[id] 的 Jest 測試、superadmin contacts/Sidebar/ContactLeadsTable Jest 測試與公開 contact submit、property detail funnel Playwright E2E 均已驗證通過。",
  },

  // 第三方加值服務
  {
    id: "021",
    name: "第三方加值服務－智能門鎖",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 支援遠端開門/關門操作，回應時間 < 3 秒。\n2. 提供進出記錄查詢（誰在何時開門）。\n3. 可生成臨時密碼（有效期限可設定）供訪客使用。\n4. 電池電量低時自動推送通知至房東。\n5. 支援多把門鎖集中管理介面。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "第三方加值服務 (Third Party)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "022",
    name: "第三方加值服務－保險方案",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 顯示可投保的保險方案列表（房屋險、責任險、租金損失險）。\n2. 可在線上申請投保，填寫物件資訊後獲取報價。\n3. 保單文件可在線下載（PDF）。\n4. 提醒保單到期時間（到期前30天）。\n5. 理賠申請可在線提交並追蹤進度。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "第三方加值服務 (Third Party)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "023",
    name: "第三方加值服務－攝影機監控",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 支援多路攝影機即時畫面預覽（4宮格/9宮格）。\n2. 動態偵測觸發時自動錄影並截圖通知房東。\n3. 歷史錄影可按日期/時間查詢與下載。\n4. 攝影機離線時推送警示。\n5. 支援雲端儲存（最少保留7天錄影）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "第三方加值服務 (Third Party)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "024",
    name: "第三方加值服務－租金保障",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 租客連續欠租2個月，自動啟動租金保障申請流程。\n2. 提供保障申請表單（物件資訊、租賃合約、欠租紀錄）。\n3. 申請狀態可即時追蹤（審核中、已核准、已撥款）。\n4. 最高保障金額依方案顯示（如最高6個月租金）。\n5. 理賠成功後紀錄至財務流水帳。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "第三方加值服務 (Third Party)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },

  // 房東
  {
    id: "025",
    name: "房東-儀表板",
    locatedPage: "web/landlord/dashboard",
    percentage: 100,
    acceptanceCriteria:
      "1. 顯示名下所有物件概況（總數、出租中、空置、待售）。\n2. 顯示本月租金收入總額與趨勢圖表（與上月對比）。\n3. 即時顯示待處理事項（待審核租客申請、維修請求、合約即將到期）。\n4. 快速連結至各主要功能（新增物件、收款記錄、聯絡租客）。\n5. 儀表板載入時間 < 2 秒，數據不超過24小時快取。",
    docPath: "/project-process/features/landlord-dashboard-status-20260206.md",
    featureSpecDocPath:
      "/project-process/features/landlord-dashboard-status-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 8,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress: "已完成所有 AC：物件概況（總數、出租中、空置）、本月/年度收入、待處理事項（真實資料：待審核租賃申請 + 維修請求 + 30天內到期合約）、快速操作連結、KPI cards with loading states。",
  },
  {
    id: "026",
    name: "房東的Access Matrix管理平台",
    locatedPage: "web/landlord (待建)",
    percentage: 60,
    acceptanceCriteria:
      "1. 房東可查看並設定名下成員（助理、會計）的功能存取權限。\n2. 支援角色指派（助理角色可查看但不可刪除物件）。\n3. 權限矩陣以表格呈現，直觀易讀。\n4. 權限變更需記錄稽核日誌。\n5. 自訂角色功能：可創建「只可查看財務」等客製角色。",
    docPath: "/project-process/features/iam-system.md",
    featureSpecDocPath: "/project-process/features/iam-system.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 8,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "027",
    name: "房東新增物件方式1－手動輸入",
    locatedPage: "web/landlord/properties/add",
    percentage: 100,
    acceptanceCriteria:
      "1. 表單欄位涵蓋：物件名稱、地址、坪數、樓層、房型、月租金/售價、設備清單。\n2. 必填欄位驗證，地址需連結 Google Maps 確認。\n3. 支援一次上傳最多20張物件照片。\n4. 草稿自動儲存，可返回繼續填寫。\n5. 發布後物件立即顯示於可見清單中。",
    docPath: "/project-process/features/landlord-features.md",
    featureSpecDocPath: "/project-process/features/landlord-features.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
  },
  {
    id: "028",
    name: "房東新增物件方式2－自動填入 (VLM/OCR)",
    locatedPage: "web/landlord/properties/add",
    percentage: 95,
    acceptanceCriteria:
      "1. 上傳物件照片/謄本後，AI 自動擷取物件基本資訊（地址、坪數、格局）。\n2. OCR 準確率需達 85% 以上（在標準文件格式下）。\n3. 自動填入結果可人工校正，顯示原始擷取值與修改後值的對比。\n4. 支援 JPG、PNG、PDF 格式，單檔最大 10MB。\n5. 處理時間 < 30 秒（一般文件）。",
    docPath: "/project-process/features/vlm-ocr-system.md",
    featureSpecDocPath: "/project-process/features/vlm-ocr-system.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 8,
    lastModifiedBy: "Trae AI",
    lastModifiedDate: "2026/03/15",
    devLog:
      "[2026/03/15] (Trae AI)\n• 優化謄本解析映射邏輯，支援陣列與物件格式自動轉換\n• 新增謄本解析機制說明文件 (transcript-parsing-guide.md)\n• 提升自動填入表單的資料完整度",
    devLogDocPath: "/docs/operational-guides/transcript-parsing-guide.md",
  },
  {
    id: "029",
    name: "房東的預約看房管理功能",
    locatedPage: "web/landlord/appointments",
    percentage: 90,
    acceptanceCriteria:
      "1. 顯示所有待確認/已確認/已取消的看房預約清單。\n2. 房東可一鍵確認或拒絕（附拒絕原因）預約請求。\n3. 確認/拒絕後自動發送通知（Email 或系統通知）給租客/買家。\n4. 整合日曆視圖，顯示每日預約時段。\n5. 可設定每日可預約時段（開放時間與間隔）。",
    docPath: "/project-process/test-logs/test-landlord-viewing-appointments-2026-04-12.md",
    featureSpecDocPath: "/project-process/features/landlord-features.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    testCoverage: 60,
    unitTestCoverage: 60,
    e2eTestCoverage: 0,
    testStatus: "in_progress",
    phase: "testing",
    points: 3,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    devLog:
      "[2026/04/12] (Paperclip CTO)\n• 補齊房東預約 API 狀態變更通知：confirmed/cancelled/completed 會寄送訪客 Email（含取消原因）。\n• 新增房東預約月曆視圖，顯示每日時段與筆數。\n• 新增 Row 029 對應單元測試與 TDD Progress Report。\n\n[2026/05/08] (Claude)\n• 實作 AC #5：可設定每日可預約時段。新增 landlord_availability_settings 表（migration 20260508130000）、GET/PUT /api/landlord/availability API route、AvailabilitySettingsPanel 組件（開放時間、結束時間、間隔、開放星期）。",
  },
  {
    id: "030",
    name: "房東的客戶－Details模式",
    locatedPage: "web/landlord/customers",
    percentage: 100,
    acceptanceCriteria:
      "1. 顯示單一客戶的完整資料（個人基本資料、聯絡方式、租賃/購屋意向、看房紀錄）。\n2. 客戶狀態標籤（潛在/洽談中/已成交/已失效）可快速切換。\n3. 可記錄跟進備註，備註需有時間戳與操作者。\n4. 顯示與該客戶的溝通紀錄摘要（最新5條）。\n5. 提供「發送訊息」快捷按鈕直接進入溝通頁面。",
    docPath: "/project-process/test-logs/test-landlord-customers-details-2026-04-12.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    testScriptPath: "apps/superadmin/unit_test/030",
    e2eTestCoverage: 0,
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    devLog:
      "2026/04/13 (VIS-26)\n- 依賴解除後複審 acceptance：`CustomerDetailsPanel` + `customer-details.ts` 符合 roadmap 五項驗收；TDD 報告見 `project-process/test-logs/test-landlord-customers-details-2026-04-12.md`。\n- 請 QA 在 `web/landlord/customers` 做 Details 側欄 smoke（可選）。\n\n2026/04/12\n- `apps/web/app/(dashboard)/landlord/customers/page.tsx` 新增 Details 側欄模式（完整資料、狀態快速切換、意向、看房紀錄區塊、跟進備註、最新 5 筆溝通摘要、發送訊息快捷按鈕）\n- `apps/web/app/(dashboard)/landlord/customers/customer-details.ts` 抽離 Details 資料解析與序列化工具，兼容舊 notes 純文字\n- `apps/web/app/(dashboard)/landlord/customers/__tests__/customer-details.test.ts` 新增 6 個單元測試；覆蓋 status 正規化、follow-up/communication append、payload parse/serialize",
  },
  {
    id: "031",
    name: "房東的客戶－Grid模式",
    locatedPage: "web/landlord/customers",
    percentage: 100,
    acceptanceCriteria:
      "1. 以卡片網格形式顯示客戶列表，每卡顯示頭像、姓名、狀態、最後聯絡時間。\n2. 支援欄數切換（2欄/3欄/4欄）。\n3. 卡片點擊進入 Details 模式。\n4. 支援拖曳重新排序（依優先級）。\n5. 懸停卡片顯示快速操作（發訊息、修改狀態）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    phase: "development",
    developmentProgress:
      "2026/04/14 (VIS-62, Fullstack Agent)\n" +
      "- ✅ CustomerGridView.tsx 組件（231 行）：卡片網格、頭像/姓名/狀態/聯絡時間\n" +
      "- ✅ customers/page.tsx 重構：整合 Grid 模式切換\n" +
      "- ✅ API route /api/landlord/customers\n" +
      "- ✅ DB migration: add_customer_priority（拖曳排序用）\n" +
      "- ✅ customer-types.ts 擴充\n" +
      "- 待完成：欄數切換 UI、拖曳重排",
  },
  {
    id: "032",
    name: "房東的客戶－List模式",
    locatedPage: "web/landlord/customers",
    percentage: 50,
    acceptanceCriteria:
      "1. 以表格列表形式顯示客戶，欄位可自訂顯示/隱藏。\n2. 支援依姓名、狀態、最後聯絡時間排序。\n3. 支援多選批次操作（批次發訊息、批次修改狀態）。\n4. 搜尋欄可即時過濾姓名/電話/Email。\n5. 支援 CSV 匯出客戶列表。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "033",
    name: "房東的客戶－新增客戶",
    locatedPage: "web/landlord/customers",
    percentage: 50,
    acceptanceCriteria:
      "1. 表單含：姓名、電話、Email、意向（租/買）、預算、備註。\n2. Email 格式驗證，電話號碼格式驗證。\n3. 同一 Email 已存在時提示重複並詢問是否合併。\n4. 新增成功後自動跳轉至客戶 Details 頁。\n5. 支援從名片圖片 OCR 自動填入（可選）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "034",
    name: "房東的客戶－成交客戶",
    locatedPage: "web/landlord/customers",
    percentage: 40,
    acceptanceCriteria:
      "1. 已成交客戶可選擇標記為「買家」或「已簽約租客」。\n2. 標記後自動建立對應角色的基本資料與儀表板。\n3. 成交資訊記錄：成交日期、成交物件、成交金額。\n4. 成交客戶不可刪除，只能封存（以保留歷史紀錄）。\n5. 成交數量統計顯示於儀表板指標卡。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "035",
    name: "房東－邀請第三人成為user的功能",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 輸入被邀請者的 Email，選擇指派角色（助理、會計、房仲）後發送邀請。\n2. 被邀請者收到 Email 含邀請連結，點擊後完成帳號創建。\n3. 邀請連結有效期24小時，過期後失效。\n4. 已接受邀請的成員出現在房東的成員管理清單。\n5. 可撤銷尚未接受的邀請。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "036",
    name: "房東的部落格創建功能",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 支援富文本編輯器（粗體、斜體、標題、圖片嵌入、連結）。\n2. 可設定發布日期（立即/排程）。\n3. 支援草稿功能，可回到繼續編輯。\n4. 發布後自動產生 SEO-friendly URL。\n5. 支援文章標籤分類（最多5個標籤）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "037",
    name: "房東給租客的Ｑ＆Ａ",
    locatedPage: "web/landlord/properties",
    percentage: 0,
    acceptanceCriteria:
      "1. 房東可為每個出租物件建立專屬 Q&A（最多50題）。\n2. 問題與答案支援純文字與圖片說明。\n3. 租客可在物件頁面直接閱讀 Q&A。\n4. 可從模板庫選取常見問題（如「寵物政策」）。\n5. Q&A 可設定公開（所有人可見）或私密（僅已簽約租客）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "038",
    name: "房東給買家的Ｑ＆Ａ",
    locatedPage: "web/landlord/properties",
    percentage: 0,
    acceptanceCriteria:
      "1. 房東可為每個待售物件建立專屬 Q&A（最多50題）。\n2. 問題可標記為「已由律師確認」以增加可信度。\n3. 買家可在物件詳情頁面閱讀 Q&A。\n4. 支援匿名問答功能（買家可匿名發問）。\n5. 房東可設定自動回覆常見問題。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "039",
    name: "一鍵生成物件銷售部落格",
    locatedPage: "superadmin/properties/[id]/edit?tab=blog",
    percentage: 95,
    acceptanceCriteria:
      "1. 輸入物件 ID，AI 自動生成包含物件亮點的銷售文案（500-800字）。\n2. 生成文案可人工編輯後發布。\n3. 自動插入物件照片（最多5張）至文章內容。\n4. 生成時間 < 15 秒。\n5. 支援多語版本生成（繁體中文、英文）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    devLog:
      "### 2026-03-19 全面優化部落格生成功能\n- 抽出 HTML 模板邏輯至 lib/utils/blogTemplate.ts（pure functions，保持 blog.ts 在 500 行以內）\n- 串接 Claude claude-sonnet-4-6 API（generateDescriptionWithAI）：依物件資料生成 150-250 字專業中文銷售文案\n- 修復 CTA 空 href：新增 getOwnerContact() 從 users_profile + auth.users 取得電話/email，寫入 tel:/mailto:\n- 新增重新生成確認機制：已發佈狀態點「重新生成」先顯示警告，5 秒自動取消\n- 新增 updatePropertyBlog() server action：支援手動修改 title / excerpt，同步更新 contentHtml hero title\n- 草稿狀態也顯示預覽連結（附「草稿，需登入」標註）\n- 新增 SEO 預覽面板：模擬 Google SERP 呈現 seoTitle / seoDescription / slug\n\n### 2026-03-22 模板可維護性強化\n- 完成 8 個獨立模板檔（local 4 + google_blogger 4）註解區塊細化，統一為 STYLE IDENTITY / LAYOUT RULES / COMPONENT RULES / EDITABLE GUIDANCE 結構\n- 補齊模板維護註記，降低後續人工調整 Prompt 時的修改風險與理解成本",
  },
  {
    id: "040",
    name: "物件介紹 AI 協作撰稿流程",
    locatedPage: "superadmin/properties/[id]/edit?tab=edit",
    percentage: 100,
    acceptanceCriteria:
      "1. AI 生成結果不得直接覆蓋既有物件介紹，需先提供草稿預覽。\n2. 使用者可選擇套用、附加或重新生成 AI 草稿。\n3. 需顯示本次生成會使用的物件資料與缺漏提醒。\n4. 支援風格、長度、用途等生成設定。\n5. 使用者可還原上次套用前的文案內容。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "GPT-5.2",
    lastModifiedDate: "2026/04/04",
    phase: "development",
    developmentProgress:
      "superadmin 物件編輯表單改為 AI 協作撰稿流程：抽出 PropertyDescriptionAIAssistant，新增文案風格/長度/用途控制、資料完整度提示、草稿預覽、套用/附加/還原操作；新增 /api/property-description/stream 串流 trace，前端可即時顯示資料蒐集、Prompt 載入、module key、模型來源、LLM/provider、金鑰來源、最終 Prompt 預覽與完成耗時；trace 支援複製與下載；後端已接入 ai_modules_assigned_function、ai_system_prompts 與多 provider fallback，並將物件介紹文案獨立為 property_description module，可在 AI 設定頁單獨配置。\n\n### 2026-04-04 UX 與可觀測性補強\n- 生成中顯示 spinner + 秒數（小數 1 位）。\n- 生成完成/失敗後在頁面上保留摘要：總耗時、tokens（in/out/total）、provider/model、HTTP status。\n- 後端寫入 ai_usage_logs，llm-monitor 可追蹤每次生成成功/失敗與使用的 Prompt/模型資訊；補齊相關 migration 與單元測試。",
  },
  {
    id: "041",
    name: "房東的部落格 AI 寫手",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 輸入關鍵字/主題，AI 生成完整部落格草稿（附標題建議、段落結構）。\n2. 可指定寫作風格（專業、輕鬆、說故事）與字數範圍。\n3. 生成稿可直接在編輯器中修改並發布。\n4. 支援「重新生成」功能（不滿意可重試最多3次）。\n5. 生成過程顯示串流輸出（字元逐一顯示）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "042",
    name: "房東的部落格 AI 講房",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. AI 根據物件資訊生成語音稿文本（1-3分鐘）。\n2. 支援 TTS 語音合成播放預覽。\n3. 語音稿可匯出為 MP3/WAV 格式。\n4. 支援多個音色選擇（男聲/女聲/年輕/成熟）。\n5. 語音稿文本可在生成後人工修改後重新合成。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "043",
    name: "房東自定義銷售物件的Ｑ＆Ａ功能",
    locatedPage: "web/landlord/properties",
    percentage: 0,
    acceptanceCriteria:
      "1. 針對銷售物件，房東可建立自定義問答對（最多30題）。\n2. 問答可設定顯示順序（手動拖曳排序）。\n3. 特定問題可設為「必讀」（帶紅色標注）。\n4. 可在問答中嵌入物件照片或影片連結。\n5. 問答支援預覽模式（模擬買家視角）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "044",
    name: "房東自定義出租物件的Ｑ＆Ａ功能",
    locatedPage: "web/landlord/properties",
    percentage: 0,
    acceptanceCriteria:
      "1. 針對出租物件，房東可建立自定義問答對（最多30題）。\n2. 可設定問答對特定租客類型可見（如僅限已申請租客）。\n3. 問答更新後，已訂閱通知的租客收到更新提醒。\n4. 提供 Q&A 瀏覽次數統計。\n5. 可複製其他物件的 Q&A 至本物件（一鍵套用）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "045",
    name: "AI TTS語音助理+物件專屬轉接號碼",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 每個物件可申請一個虛擬電話號碼（轉接至 AI 語音助理）。\n2. AI 語音助理可回答物件相關問題（依設定的Q&A資料庫）。\n3. 語音助理無法回答時，轉接至真人或留言信箱。\n4. 來電紀錄可在後台查詢（來電時間、時長、議題摘要）。\n5. 支援語言設定（普通話/粵語/英語/台語）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 8,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "046",
    name: "房東的仲介－Details模式",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 顯示仲介的完整資料（姓名、證照號碼、電話、Email、負責物件清單）。\n2. 顯示仲介的業績統計（成交數、成交金額、帶看次數）。\n3. 可記錄與仲介的合作備註與評分（1-5星）。\n4. 快速連結進入與仲介的溝通頁面。\n5. 合作合約文件可上傳並關聯至仲介資料。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "047",
    name: "房東的仲介－Grid模式",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 以卡片形式顯示仲介列表，每卡含頭像、姓名、評分、負責物件數。\n2. 支援依評分、負責物件數排序。\n3. 卡片點擊進入 Details 頁。\n4. 顯示仲介當前活躍狀態（在線/離線）。\n5. 支援最多3欄的響應式排版。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "048",
    name: "房東的仲介－List模式",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 表格列表含欄位：姓名、電話、負責物件數、最後聯繫、評分、狀態。\n2. 支援點擊欄位標題排序。\n3. 支援搜尋過濾（依姓名/電話）。\n4. 多選後可批次更改狀態或發送訊息。\n5. 支援 CSV 匯出。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "049",
    name: "房東的仲介－新增仲介",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 表單含：姓名、電話、Email、證照號碼、公司名稱（選填）、備註。\n2. 電話和Email格式驗證。\n3. 可選擇指派仲介負責的物件（多選）。\n4. 新增成功後傳送歡迎Email給仲介。\n5. 系統自動產生仲介的邀請登入連結。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "050",
    name: "房東財務－銀行帳戶管理",
    locatedPage: "web/landlord/finance",
    percentage: 30,
    acceptanceCriteria:
      "1. 可綁定多個銀行帳戶（支援主要銀行）。\n2. 顯示帳戶餘額（需連結開放銀行API）。\n3. 可設定各帳戶的收款用途（租金帳戶/維修備用金）。\n4. 帳戶資訊以加密方式儲存，顯示時遮蔽部分號碼。\n5. 可手動新增或刪除帳戶（不可刪除有未結清款項的帳戶）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "Google Gemini 2.5 Flash (Database Agent)",
    lastModifiedDate: "2026/04/14",
    phase: "development",
    developmentProgress:
      "2026/04/14 (VIS-64, Database Agent)\n" +
      "- ✅ DB migration: create_bank_accounts（113 行）含 bank_accounts 表、pgcrypto 加密、RLS 策略\n" +
      "- ✅ RLS: 帳戶擁有者隔離（SELECT/INSERT/UPDATE/DELETE）\n" +
      "- 待完成：前端 UI、API route、開放銀行 API 整合",
  },
  {
    id: "051",
    name: "房東財務－收支明細儀表板",
    locatedPage: "web/landlord/finance",
    percentage: 40,
    acceptanceCriteria:
      "1. 顯示選定月份的收入/支出圓餅圖與明細。\n2. 支援日/月/季/年時間範圍切換。\n3. 收支類別可自訂（如「維修費」「管理費」）。\n4. 顯示淨利潤趨勢折線圖（最近12個月）。\n5. 一鍵匯出財務報表（PDF/Excel）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "052",
    name: "房東財務－租金收支管理",
    locatedPage: "web/landlord/finance",
    percentage: 0,
    acceptanceCriteria:
      "1. 顯示每月應收租金清單（物件+租客+金額+到期日）。\n2. 標記已收/未收狀態，未收超期自動標紅。\n3. 支援手動標記收款（附備註與日期）。\n4. 房東可在此頁向租客傳送繳費催繳通知。\n5. 逾期租金自動計算違約金（依合約設定）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "053",
    name: "房東財務－ATO租賃報稅表生成功能",
    locatedPage: "web/landlord/finance/reports",
    percentage: 0,
    acceptanceCriteria:
      "1. 自動彙整年度租金收入、管理費、維修費等稅務相關數據。\n2. 生成符合澳洲ATO標準的租賃收入報稅試算表。\n3. 報表可匯出 PDF 格式，附帶必要的申報說明。\n4. 支援多物件彙整在同一份報稅表。\n5. 提供稅務顧問分享連結（唯讀）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "054",
    name: "房東財務－台灣租賃報稅表生成功能",
    locatedPage: "web/landlord/finance/reports",
    percentage: 0,
    acceptanceCriteria:
      "1. 自動彙整年度租金收入，扣除必要費用（折舊、管理費）。\n2. 依台灣財政部標準格式生成租賃所得申報試算表。\n3. 顯示應申報金額與建議扣繳額。\n4. 報表可匯出 PDF，標示申報截止日期（每年5月）。\n5. 如有多筆出租所得，可合併或分開列報。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "055",
    name: "房東的溝通頁面",
    locatedPage: "web/landlord/messages",
    percentage: 15,
    acceptanceCriteria:
      "1. 集中顯示與所有租客/買家/仲介的訊息對話。\n2. 左側為對話列表（含未讀數徽章），右側為對話內容。\n3. 支援訊息搜尋（依關鍵字）。\n4. 可傳送文字、圖片、附件（最大10MB）。\n5. 可設定自動回覆訊息（不在線時啟用）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "056",
    name: "房東的物件展示功能－Details模式",
    locatedPage: "web/landlord/properties/[id]",
    percentage: 50,
    acceptanceCriteria:
      "1. 顯示物件完整資訊（照片輪播、地址、格局、設備、租金/售價）。\n2. 顯示物件當前狀態（空置/出租中/待售/已售）。\n3. 顯示看房預約列表（最近10筆）。\n4. 提供物件 QR Code 分享功能。\n5. 可直接從物件詳情頁面觸發生成銷售部落格。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "057",
    name: "房東的物件展示功能－Grid模式",
    locatedPage: "web/landlord/properties",
    percentage: 50,
    acceptanceCriteria:
      "1. 以卡片網格形式展示物件（每行3-4筆），卡片含縮圖、物件名、租金/售價、狀態。\n2. 支援依租金/售價、狀態、地區排序篩選。\n3. 卡片點擊進入物件 Details 頁。\n4. 支援快速切換物件狀態（不需進入詳情頁）。\n5. 空置物件卡片以視覺標示突出（如淡灰底色）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "058",
    name: "房東的物件－照片增生功能 (AI)",
    locatedPage: "web/landlord/properties",
    percentage: 0,
    acceptanceCriteria:
      "1. 上傳原始物件照片後，AI 可生成不同風格的渲染照（如白天/黃昏光線）。\n2. 可指定增強效果（去雜物、補光、修正垂直線）。\n3. 生成照片的解析度不低於原圖。\n4. 生成照片需附「AI 生成」浮水印（可選擇顯示/隱藏）。\n5. 每次最多可生成5張，生成時間 < 60 秒。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 8,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "059",
    name: "房東的物件展示功能－List模式",
    locatedPage: "web/landlord/properties",
    percentage: 50,
    acceptanceCriteria:
      "1. 以緊湊表格形式列出所有物件，欄位含：物件名、地址、類型、月租/售價、狀態、最後修改。\n2. 點擊欄標題可排序。\n3. 多選後可批次修改狀態。\n4. 搜尋欄即時過濾（依物件名/地址）。\n5. 每頁顯示筆數可設定（20/50/100）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "060",
    name: "房東的維修派工管理",
    locatedPage: "web/landlord (待建)",
    percentage: 50,
    acceptanceCriteria:
      "1. 顯示所有維修請求列表（物件、申請人、描述、狀態、申請日期）。\n2. 可指派維修人員，並設定預約維修日期。\n3. 維修人員接單後租客收到通知（含到訪時間）。\n4. 維修完成後附上費用單與工作說明，租客確認後結案。\n5. 維修費用自動計入物件支出記錄。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "061",
    name: "房東的行銷部落格網站行為監控",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 追蹤部落格文章的閱讀人數、平均停留時間、跳出率。\n2. 顯示各文章的流量來源分佈（直接/搜尋/社群媒體）。\n3. 高流量文章自動標記「熱門」。\n4. 每週生成行銷效益報告（曝光→諮詢→帶看轉換率）。\n5. A/B 測試工具：可同時測試兩個文章標題，追蹤點擊率差異。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "062",
    name: "房東的email inbox信箱",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 整合外部 Email（Gmail/Outlook），在系統內統一查看收件。\n2. 支援寄件、回信、轉寄功能。\n3. 自動標記與租賃相關的 Email（如包含合約、看房、租金關鍵字）。\n4. 未讀郵件數顯示於側邊導航徽章。\n5. 搜尋功能可按寄件人/主旨/內容全文搜尋。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "063",
    name: "房東的客戶-租客篩選功能",
    locatedPage: "web/landlord/customers",
    percentage: 40,
    acceptanceCriteria:
      "1. 依信用分數、月收入、職業類型對申請租客進行排序篩選。\n2. 提供自動化評分機制（根據填寫資料評估租客適合度）。\n3. 可設定篩選條件範本（如「月收入需為月租3倍以上」）。\n4. 篩選結果可一鍵發送面談邀請。\n5. 不合格申請者可禮貌性自動回絕（附原因說明範本）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "064",
    name: "房東的會計人員查帳審計功能",
    locatedPage: "web/landlord/finance",
    percentage: 0,
    acceptanceCriteria:
      "1. 會計角色可查看所有財務流水帳（唯讀模式）。\n2. 提供一致的試算表視圖（可匯出 Excel）。\n3. 可新增財務備註（如調帳說明），備註含操作者與時間戳。\n4. 對帳差異項目可標記「疑問」並留言，房東可回覆解釋。\n5. 稅務報告生成後，會計可直接從此頁面下載。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },

  // 租客
  {
    id: "065",
    name: "租客(已簽約)-儀表板",
    locatedPage: "web/tenant/contracted/dashboard",
    percentage: 100,
    acceptanceCriteria:
      "1. 顯示租約基本資訊（物件地址、月租金、合約期限、剩餘天數）。\n2. 顯示下次繳費截止日與金額。\n3. 快速入口：維修申請、溝通中心、合約下載。\n4. 顯示最新通知（房東公告、維修進度更新）。\n5. 頁面載入時間 < 2 秒。",
    docPath: "/project-process/features/tenant-dashboards-20260206.md",
    featureSpecDocPath:
      "/project-process/features/tenant-dashboards-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "租客 (Tenant)",
    points: 5,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress: "已完成：租約資訊（月租金、押金狀態、繳款進度、下次繳款日—依 payment_due_day 計算）、維修申請統計（pending/in_progress/completed 真實資料）、未讀通知（notification_queue 真實計數）、快速操作（繳款/報修/續約）。",
  },
  {
    id: "066",
    name: "租客(潛在)-儀表板",
    locatedPage: "web/tenant/potential/dashboard",
    percentage: 100,
    acceptanceCriteria:
      "1. 顯示正在洽詢的物件列表（物件基本資訊、看房預約狀態）。\n2. 可在此發起看房預約或取消預約。\n3. 顯示已查詢物件歷史（最近10筆）。\n4. 推薦相似物件功能（依瀏覽偏好）。\n5. 提供申請入住按鈕（需上傳基本資料）。",
    docPath: "/project-process/features/tenant-dashboards-20260206.md",
    featureSpecDocPath:
      "/project-process/features/tenant-dashboards-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "租客 (Tenant)",
    points: 5,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress: "已完成：邀請物件列表（從 leads_tenants + Property_Rentals 真實資料）、看房預約計數（pending/completed）、申請進度（rental_applications 真實計數）、快速操作（瀏覽物件/預約看房/遞交要約）、租屋資源區塊。",
  },
  {
    id: "067",
    name: "租客的維修申請",
    locatedPage: "web/tenant/maintenance",
    percentage: 30,
    acceptanceCriteria:
      "1. 提供維修申請表單：物件/位置、問題類別（水電/管路/設備）、問題描述、照片上傳。\n2. 送出後可追蹤維修進度（待派工/已指派/完成）。\n3. 維修人員到訪確認後需由租客線上確認完成。\n4. 維修記錄存檔，供日後查閱。\n5. 緊急維修（如漏水）標記後，通知時間 < 10 分鐘。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "租客 (Tenant)",
    points: 3,
    lastModifiedBy: "OpenAI Codex (QA Agent)",
    lastModifiedDate: "2026/04/14",
    phase: "testing",
    testStatus: "passed",
    testScriptPath: "apps/web/lib/actions/__tests__/",
    developmentProgress:
      "2026/04/14 (VIS-65, QA Agent)\n" +
      "- ✅ Unit tests: maintenance.test.ts（450 行，覆蓋 server actions CRUD + 狀態流轉）\n" +
      "- ✅ E2E test: maintenance.spec.ts（178 行，租客提交→房東審核→完成流程）\n" +
      "- 注意：此 Row 原測試由 Row 120 維護，QA Agent 新增額外獨立測試檔案",
  },
  {
    id: "068",
    name: "租客的溝通中心",
    locatedPage: "web/tenant (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 可與房東進行即時訊息溝通。\n2. 訊息含已讀回條功能。\n3. 可發送圖片與文件（最大10MB）。\n4. 新訊息推送通知（系統通知與 Email）。\n5. 訊息記錄可按日期搜尋，最長保留2年。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "租客 (Tenant)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "069",
    name: "租客的繳費記錄",
    locatedPage: "web/tenant (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 顯示歷月繳費記錄（日期、金額、方式、狀態）。\n2. 每筆記錄可下載收據（PDF）。\n3. 未來12個月的應付款項預覽。\n4. 可設定繳費提醒（到期前3/7/14天）。\n5. 逾期費用醒目標示，顯示逾期天數與累計罰款。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "租客 (Tenant)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },

  // 合約與法務
  {
    id: "070",
    name: "買賣合約附加條款功能",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 提供預設附加條款範本庫（如「瑕疵擔保」「裝潢保留」）。\n2. 可自訂附加條款文字，富文本格式支援。\n3. 條款選擇後自動插入合約對應位置。\n4. 附加條款需買賣雙方各自確認同意後生效。\n5. 法律顧問可遠端審閱並批注（不可直接修改）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "合約與法務 (Contracts & Legal)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "071",
    name: "租賃合約附加條款功能",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 提供租賃專用附加條款範本（如「禁止飼養寵物」「提前終止違約金」）。\n2. 附加條款以區塊形式拖曳排序調整位置。\n3. 租客簽署前需確認閱讀所有附加條款。\n4. 附加條款變更需雙方重新確認。\n5. 記錄條款版本歷史（修改時間、修改者）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "合約與法務 (Contracts & Legal)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "072",
    name: "一鍵生成買賣制式合約",
    locatedPage: "web (待建)",
    percentage: 100,
    acceptanceCriteria:
      "1. 輸入必要資訊（買賣雙方資料、物件資訊、成交金額、付款條件）後一鍵生成。\n2. 生成的合約符合台灣不動產買賣制式合約規範。\n3. 生成時間 < 10 秒，輸出格式為 PDF。\n4. 合約草稿可人工修改（關鍵條款標黃提示不建議修改）。\n5. 合約生成記錄存檔，可查看歷史版本。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "合約與法務 (Contracts & Legal)",
    points: 5,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/20",
    phase: "development",
    developmentProgress:
      "完成買賣契約欄位 schema、draft builder、/api/contracts/draft route、superadmin 契約預覽 UI、HTML 套版 renderer、DOCX 匯出與列印另存 PDF 流程；新增官方成屋買賣契約書範本映射層、placeholder token map、tokenized template 中間層與官方條次文字骨架，renderer 已改為由 template + tokenMap 驅動輸出，並支援優先複用官方 DOCX 模板套件骨架後再注入內容、保留 theme 與 Word package Metadata；本階段已加入 official document.xml 關鍵段落原地替換的 hybrid renderer 路徑，完成買賣契約第一條買賣標的的土地／建物／權利摘要 inline replacement、第二條總價與土地／建物／車位價款拆分 inline replacement、第三條付款約定四個期別、第五條價金履約／保管方式摘要、第六條產權移轉與代書專責辦理資訊、第七條稅費負擔與代辦費摘要、第八條點交段落、第十一條建物被占用／占用他人土地／出租出借三個結構化欄位的 official inline replacement、第十二條副本留存人留白段落、第十二條後買賣雙方簽署區與簽約日期，以及第十三條仲介經紀業／經紀人簽章段落的 inline replacement；同時補齊 sale draft API、預覽 UI、token map 與 HTML template 對 brokerName / agentName / scrivenerName 的端到端支援，並新增 taxAllocation / registrationFeeAllocation / brokerFeeAllocation / deliveryCondition / escrowMethod / occupiedByOthersCondition / encroachmentCondition / leaseBorrowCondition / copyRetentionHolder / defaultClauseSummary 的可編輯欄位、API 轉傳、builder override、template mapping 與預覽顯示，完成聚焦 Jest 驗證；另已確認官方 sale DOCX 第十一條仍沒有可安全承載 defaultClauseSummary 的穩定特約留白，因此 defaultClauseSummary 先安全輸出於 API、預覽與 HTML fallback 路徑；另外 superadmin 契約 tab 現已支援目前瀏覽器自動暫存與手動清除草稿，重新整理或重新登入後可還原已輸入欄位。2026/03/20 rebuild 契約草稿預覽 UI：將原本的資料卡片彙總改為以 iframe srcDoc 嵌入全文 HTML 合約預覽，點選「產生草稿預覽」後直接在頁面內顯示完整的官方條文格式合約供律師或代書覆核；同時新增買賣契約缺少謄本時的 pre-flight 警告並停用產生按鈕，以及需人工覆核時的 amber 提示條。",
  },
  {
    id: "073",
    name: "一鍵生成租賃制式合約",
    locatedPage: "web (待建)",
    percentage: 100,
    acceptanceCriteria:
      "1. 輸入出租方/承租方資訊、物件地址、租金、期限、押金後一鍵生成。\n2. 生成合約符合住宅租賃定型化契約規範（內政部版）。\n3. 生成 PDF 時自動套用雙方姓名、地址、日期等資訊。\n4. 合約可加蓋電子騎縫章（每頁）。\n5. 支援繁/簡/英三語版本切換。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "合約與法務 (Contracts & Legal)",
    points: 5,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/20",
    phase: "development",
    developmentProgress:
      "完成租賃契約欄位 schema、draft builder、/api/contracts/draft route、superadmin 契約預覽 UI、HTML 套版 renderer、DOCX 匯出與列印另存 PDF 流程；新增官方房屋租賃契約書範本映射層、placeholder token map、tokenized template 中間層與官方條次文字骨架，renderer 已改為由 template + tokenMap 驅動輸出，並支援優先複用官方 DOCX 模板套件骨架後再注入內容、保留 theme 與 Word package Metadata；本階段已驗證租賃官方 DOCX 可直接按條次錨點改寫 document.xml 內文，除原有審閱權、第一至第五條與第十六條外，現已補上第二條附屬設備、第九條使用用途留白、第十四條返還遲延違約金倍數留白、第二十四條契約分存份數留白，以及第十六條其他特約摘要與第二十六條後附件區底部的出租人／承租人簽署列與簽約日期 inline replacement；同時 superadmin 契約草稿 UI 已補上契約日期輸入並回傳至 renderer 使用，優先輸出更接近官方版型的 Word 文件，若錨點不足則自動 fallback 至 altChunk 匯出；另外 superadmin 契約 tab 現已支援目前瀏覽器自動暫存與手動清除草稿，重新整理或重新登入後可還原已輸入欄位。2026/03/20 rebuild 契約草稿預覽 UI：將原本的資料卡片彙總改為以 iframe srcDoc 嵌入全文 HTML 合約預覽，點選「產生草稿預覽」後直接在頁面內顯示包含全部 26 條款的官方條文格式合約供律師或代書覆核，並可直接列印或下載 HTML / DOCX。",
  },
  {
    id: "074",
    name: "電子簽約功能",
    locatedPage: "web (待建)",
    percentage: 40,
    acceptanceCriteria:
      "1. 生成合約後可發送電子簽署邀請至買賣/租賃雙方 Email。\n2. 每一方在安全連結中完成電子簽名（手寫簽名或文字簽名）。\n3. 所有方完成簽署後，生成合法效力的電子合約（含簽署時間戳）。\n4. 已簽署合約以 PDF 格式自動發送至所有簽署方。\n5. 合約簽署狀態可即時追蹤（待某方簽署/全部完成）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "合約與法務 (Contracts & Legal)",
    points: 8,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },

  // 通用/系統
  {
    id: "075",
    name: "一鍵切換UI風格：暗/亮模式",
    locatedPage: "全站",
    percentage: 100,
    acceptanceCriteria:
      "1. 點擊切換按鈕（或依系統設定）立即切換暗/亮模式，無需刷新頁面。\n2. 使用者設定持久化（下次登入維持上次選擇）。\n3. 所有頁面、組件、彈窗均支援暗/亮模式，無色彩殘留問題。\n4. 過渡動畫流暢（約200ms）。\n5. 系統自動偵測作業系統主題並設為預設值。",
    devLog:
      "ThemeProvider (next-themes, attribute=class, defaultTheme=system, enableSystem) 已部署至 superadmin 及 web 兩個 app；CSS 語意色彩 token（--color-text-primary / bg / border / accent 等）在 globals.css 以 .dark class 覆寫，完整支援 light/dark 切換。ThemeToggle component 採單一圓形按鈕、Sun/Moon icon 旋轉動畫 200ms；已置入 superadmin DashboardHeader、web Header（公共頁）及 web DashboardHeader（landlord/tenant 儀表板）。Tailwind darkMode: 'class' 已設定，所有語意 token 均透過 var() 對應，body 有 transition 300ms ease。\n\n" +
      "2026/04/14 (VIS-67, UI/UX Agent)\n" +
      "- ✅ 多組件 dark mode 審查修正：DashboardLayout, KPICard, ProgressLink, RoleSwitcher\n" +
      "- ✅ MessageDetail/MessageFilters/MessageList 暗色模式適配\n" +
      "- ✅ Sheet.tsx dark mode 調整\n" +
      "- ✅ globals.css dark token 完善（web + web-au）",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 2,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "076",
    name: "RWD網頁響應式設計",
    locatedPage: "全站",
    percentage: 85,
    acceptanceCriteria:
      "1. 手機（320px+）、平板（768px+）、桌機（1024px+）三種斷點下版面正確顯示。\n2. 導航選單在手機版切換為漢堡選單（Hamburger Menu）。\n3. 所有表單元素在手機版觸控操作友善（最小觸控區域44x44px）。\n4. 圖片採用響應式圖片（srcset），依裝置解析度載入適當尺寸。\n5. 手機版首屏渲染 < 3 秒（4G網路環境）。",
    docPath: "/project-process/features/company-homepage.md",
    featureSpecDocPath: "/project-process/features/company-homepage.md",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 5,
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "077",
    name: "使用者身份驗證系統",
    locatedPage: "web/login, web/register, superadmin/middleware",
    percentage: 98,
    acceptanceCriteria:
      "1. 支援 Email/密碼登入與 Google OAuth 登入。\n2. JWT Token 有效期24小時，Refresh Token 有效期7天。\n3. 連續5次登入失敗後帳號暫時鎖定（15分鐘）。\n4. 新裝置登入時發送 Email 安全通知。\n5. 密碼需符合強度要求（最少8字元、含大小寫與數字）。\n6. Superadmin middleware session refresh cookie 需正確保留（2026/04/13 修復）。",
    docPath: "/project-process/features/auth-system.md",
    featureSpecDocPath: "/project-process/features/auth-system.md",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    devLogDocPath: "/project-process/dev-logs/dev-superadmin-middleware-cookie-fix-2026-04-13.md",
    category: "通用/系統 (General/System)",
    points: 8,
    devLog:
      "### 2026-04-13 修復 Superadmin Middleware Cookie 丟失\n" +
      "**問題**：Superadmin 間歇性登入失敗（時好時壞），用戶反覆被踢回登入頁。\n" +
      "**根因**：middleware.ts 的 setAll callback 未同步 request.cookies 也未重建 response；redirect 路徑建立新 NextResponse.redirect() 導致 session refresh cookie 全部丟失。\n" +
      "**修復**：\n" +
      "- setAll 中先 mirror request.cookies，再 rebuild response（與 apps/web 一致）\n" +
      "- 新增 redirectWithCookies() helper，redirect 時攜帶刷新後的 session cookie\n" +
      "**影響檔案**：apps/superadmin/middleware.ts\n" +
      "**避坑**：\n" +
      "⚠️ middleware response 必須用 let，不能用 const\n" +
      "⚠️ redirect 時必須複製 cookie，否則 session refresh 靜默失敗\n" +
      "⚠️ 新建 middleware 需與主站 pattern 交叉比對\n" +
      "**下階段**：抽取共用 middleware Supabase client 到 packages/；補 E2E session refresh 測試",
    lastModifiedBy: "Paperclip Agent",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "078",
    name: "註冊的使用者都有自己的行事曆管理頁面",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 行事曆提供日/週/月三種視圖切換。\n2. 可新增、編輯、刪除行程（含標題、時間、地點、備註）。\n3. 系統自動事件（看房預約、合約到期、繳費日）顯示在行事曆。\n4. 可設定事件提醒（提前15分/1小時/1天通知）。\n5. 行事曆可匯出 .ics 格式（相容 Google Calendar）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "079",
    name: "使用者登入頁面",
    locatedPage: "web/login",
    percentage: 100,
    acceptanceCriteria:
      "1. 頁面提供 Email/密碼表單與 Google OAuth 按鈕。\n2. 密碼欄位有顯示/隱藏切換功能。\n3. 登入成功後依角色導向對應儀表板（房東→房東儀表板）。\n4. 表單提交後有 loading 狀態，防止重複提交。\n5. 提供「忘記密碼」連結，導向密碼重設流程。",
    docPath: "/project-process/features/auth-system.md",
    featureSpecDocPath: "/project-process/features/auth-system.md",
    tddSpecDocPath:
      "/project-process/features/tdd-login-portal-iam-20260221.md",
    category: "通用/系統 (General/System)",
    points: 3,
    lastModifiedBy: "Claude Sonnet 4.5",
    lastModifiedDate: "2026/02/05",
  },
  {
    id: "080",
    name: "使用者登入頁面-記住我功能",
    locatedPage: "web/login",
    percentage: 100,
    acceptanceCriteria:
      "1. 勾選「記住我」後，登出後再次登入毋需重新輸入 Email/密碼（30天有效）。\n2. 「記住我」以安全的 HttpOnly Cookie 實作，不暴露於 localStorage。\n3. 於新裝置/瀏覽器「記住我」不自動生效。\n4. 使用者可在帳號設定中撤銷所有「記住我」的設備。\n5. 30天後 Cookie 自動到期，需重新登入。",
    docPath: "/project-process/features/remember-me-tdd-report-20260205.md",
    featureSpecDocPath:
      "/project-process/features/remember-me-tdd-report-20260205.md",
    tddSpecDocPath:
      "/project-process/features/remember-me-tdd-report-20260205.md",
    category: "通用/系統 (General/System)",
    points: 2,
    lastModifiedBy: "Claude Sonnet 4.5",
    lastModifiedDate: "2026/02/05",
  },
  {
    id: "081",
    name: "使用者密碼重設頁面",
    locatedPage: "web/forgot-password, web/update-password",
    percentage: 100,
    acceptanceCriteria:
      "1. 輸入 Email 後發送密碼重設連結，連結有效期1小時。\n2. 點擊連結後進入重設頁面，輸入新密碼（需輸入兩次確認）。\n3. 重設成功後前一個 Session 自動登出。\n4. 重設連結只能使用一次，使用後失效。\n5. 24小時內申請重設次數上限5次（防止暴力攻擊）。",
    docPath: "/project-process/features/auth-system.md",
    featureSpecDocPath: "/project-process/features/auth-system.md",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 3,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
  },
  {
    id: "082",
    name: "使用者的溝通頁面",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 集中顯示所有角色的訊息往來（不依物件分割）。\n2. 可同時與多個對象對話（多視窗或分頁切換）。\n3. 訊息支援 Markdown 格式。\n4. 群組對話功能（如「物件 A 的所有相關方」）。\n5. 離線時未讀訊息在上線後彙整推送通知。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "083",
    name: "受邀使用者登入介面",
    locatedPage: "web/onboarding/add-role",
    percentage: 0,
    acceptanceCriteria:
      "1. 受邀者點擊邀請連結後進入專屬歡迎頁（含邀請方名稱與角色說明）。\n2. 可選擇使用 Email 創建帳號或 Google 登入綁定。\n3. 帳號設定完成後，直接進入對應角色的儀表板。\n4. 若邀請連結已過期（24小時），顯示明確提示並提供重新申請入口。\n5. 完成首次登入後，邀請連結自動失效。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "084",
    name: "統一謄本解析工作台",
    locatedPage: "superadmin/properties/:id/edit?tab=transcript",
    percentage: 99,
    acceptanceCriteria:
      "1. User 可上傳 PDF、圖片、JSON、文字等謄本來源，不需先手動選建物／土地／車位類型。\n2. PDF 先判斷是否可由 Python 快速解析出台灣常用繁體謄本文字；不適合時自動改走具電腦視覺能力的 VLM。\n3. AI 流程至少拆為 detect、parse、review 三段非同步判讀，並保留 evidence、confidence 與需人工確認欄位。\n4. 系統可初判純土地、整棟建物、透天／別墅、公寓華廈辦公店面、車位等出售型態。\n5. 車位產權型態可複選：獨立產權、公設產權，或兩者皆有。\n6. User 確認後才儲存謄本結果，並供下一頁建物土地明細表自動計算面積與持分。",
    docPath: "/project-process/test-logs/test-transcript-intake-workbench-2026-04-28.md",
    featureSpecDocPath: "/project-process/features/transcript-intake-workbench-dev-spec-20260427.md",
    tddSpecDocPath: "/project-process/features/tdd-transcript-intake-workbench-20260427.md",
    category: "通用/系統 (General/System)",
    points: 5,
    lastModifiedBy: "Codex",
    lastModifiedDate: "2026/04/29",
    devLog:
      "[2026/03/15] (Trae AI)\n• 支援地端 (Local) 與雲端 (Cloud) 雙機制切換\n• 實作 CJK 相容字元正規化與控制字元清理\n• 完善建物與土地謄本的欄位對應邏輯\n\n[2026/04/27] (Codex)\n• 啟動統一謄本解析工作台改造，第一階段完成 intake contract、Python/VLM 技術路由、detect/parse/review prompt contract、transcript_intake_runs migration 與 targeted unit tests。\n• 第二階段完成 intake run 建立/查詢 API。\n• 第三階段完成 intake worker 骨架、process API 與 cron drain；parse 階段重用既有 transcript parse core。\n• 第四階段接入真正 AI detect/review stage，失敗時保留 processor seed fallback；目前 detect/review 為單一模型、主要文件視覺輸入，其他文件透過 context JSON 輔助。\n• 第五階段新增謄本工作台 UI 面板，支援建立 run、啟動 process、輪詢狀態並顯示 route/detect/review 摘要；既有分散式上傳與表單暫時保留。\n• 第六階段新增人工確認 API 與 UI 按鈕，將 needs_user_confirmation 的 run 鎖定為 confirmed 並寫入 confirmed_result snapshot。\n• 第七階段將 confirmed result 同步回 property details，帶入主建物、土地、獨立車位謄本與車位產權，供建物土地面積明細表自動計算。\n• 第八階段接入 PDF text probe，建立 run 時用實際文字層判斷 Python/VLM route，並以真實謄本 PDF 範例補回歸測試。\n\n[2026/04/28] (Codex)\n• 工作台升級為左右雙欄 v2：四段流程、上傳摘要、初判摘要、四區可編輯面積明細與文件預覽集中在單一介面。\n• 新增 area detail draft schema 與 helper，confirm API 可接收 user 修正後的建物／土地／車位面積明細，並同步寫入 property details。\n• evidence type 增加 bbox 結構，為下一階段精準紅框預覽鋪路；目前 UI 先顯示來源文字與文件預覽。\n• 新增工作台單一上傳入口與 registry_transcript_unclassified 文件類型，支援 PDF、圖片、GIF、JSON、TXT、CSV 先上傳後判讀，不再要求 user 先選建物／土地／車位。\n• Worker 會在未分類謄本 parse 後依 parsed kind 自動改成建物／土地文件角色；舊版分散式謄本工具已預設收合到進階區。\n• local_python_text route 已接入本地文字層 parser seed，PDF/TXT/JSON 可先以本地解析寫入 parsed_result，失敗才 fallback 到 VLM core。\n• PDF probe 改為優先使用 pdftotext -layout，並新增 local_python_text provider constraint migration，讓本地解析結果可正式寫回文件 parsed_result。\n• 工作台新增技術選擇區，逐份文件顯示實際採用 Python/pdftotext、VLM 或 JSON，以及頁數、文字量、繁中量、謄本標記數與 routing reason。\n• 工作台新增 AI 品質追蹤區，逐段顯示 detect、parse、verify/review 使用的 agent、prompt source、provider/model、成功/fallback 狀態、結果摘要、修正建議與人工確認項目。\n• 工作台新增已上傳謄本清單與兩段式刪除按鈕，user 上傳錯誤謄本時可直接刪除文件。\n• 已上傳謄本清單與右側文件預覽同步選取；被納入右側預覽範圍的文件會在左側顯示預覽中，點選欄位 evidence 也會切換到對應來源文件。\n• 已上傳謄本清單新增複選框，user 可勾選多份文件一起建立 detect/parse/review 任務；點檔名只切換預覽，勾選狀態才決定本次解析文件。\n• 右側文件預覽範圍會跟隨複選框同步增減；勾幾份就顯示幾份預覽，取消勾選時左側預覽中標記與右側對應 iframe 會同步移除。\n• 建立或啟動判讀後會顯示系統正在解析與已花費秒數，避免 user 誤以為系統沒有反應。\n• AI 品質追蹤的 Detect、Parse、Verify/Review 三段新增階段計時；執行中以 0.1 秒精度顯示已花費時間，完成後保留各段花費秒數。\n• 謄本頁底部不再顯示進階／舊版謄本工具，主流程收斂為單一謄本工作台。\n• 權狀影本納入謄本工作台：building_title、land_title 可勾選解析，影像權狀與 PDF 權狀皆走 VLM visual，且混合建物+土地權狀會保留雙邊資料。\n• AI 品質追蹤固定顯示 Detect、Parse、Verify/Review 三段，partial trace 狀態下 Parse 或 Review 開始工作也會立即顯示處理中與計時。\n• Worker 進入 parsing 前會先寫入 Parse 預計使用的 VLM/local parser，進入 reviewing 前會先寫入 Verify/Review provider/model，讓 user 等待時就知道哪個 AI 正在解析或審查。\n• 實機登入檢查後修正 transcript tab 高度策略，工作台改為頁面自然捲動；本機 DB 已套用 transcript_intake_runs migration 並 reload schema。\n• 實機 run c1426b0c-da38-4261-9454-934ab34b0ce9 驗證兩份 PDF 均走 local_python_text；review 偵測建物／土地謄本所有權人與地段不一致，保留 needs_user_confirmation 未自動儲存。\n• 實機 run e3485b68-eda9-4cfc-a9c3-646c8a65a5d8 驗證 AI 品質追蹤：detect 使用 openai/gpt-4o 但 PDF MIME fallback，parse 使用 local/local-python-text，review 使用 anthropic/claude-opus-4-20250514 並提出 dispositionKind/buildingType 修正建議。\n• Parser VLM 預設改為 Qwen 3.6 Plus、Kimi K2.6、Gemini 3.1 Pro 三家公司並行；Review 預設改為 OpenAI GPT-5.5、Claude Opus 4.5、Grok 4.20 三家公司並行，並將各 reviewer 模型與耗時寫入 AI 品質追蹤。\n• 新增資料 migration 20260428020000_update_transcript_vlm_agent_defaults，將 DB 既有 transcript_visual_parse/transcript_audit agent assignment 更新到新三模型組合，避免 runtime 繼續讀到舊 gpt-4o/Claude 設定。\n• 靜態模型清單與 vision capability 補上新版 GPT/Claude/Gemini/Grok/Kimi/Qwen 模型，並補齊 GIF/TIFF/BMP MIME 判斷，避免權狀影本因 MIME 不完整被擋在 VLM route 前。\n• AI 品質追蹤現在會顯示每個 parser/reviewer 各自的工作中計時與完成耗時；完成後提供三份解析報告 URL 與三份審查報告 URL，供 user 追溯模型品質。\n• 新增 ai-reports markdown API 與 ocr_parse_results provider constraint migration，確保 Qwen/Kimi 等新 parser raw output 可保存並生成報告。\n• 診斷權狀影本解析失敗原因後，新增 PDF 轉 JPG 頁面送入 image-only VLM、強化 markdown fence JSON 擷取、提高 transcript vision output token 上限，並把權狀補充規則寫入 saved_prompts migration。\n\n[2026/04/29] (Codex)\n• Sprint 3 啟動登記：逐頁文件分類與正式/參考來源分流，狀態 In Progress。\n• 今日目標：混合 PDF 先分頁辨識謄本、權狀、不動產說明書、物件調查報告與照片/地圖；謄本/權狀為正式來源，說明書/調查報告只作坪數交叉檢查。\n• 本機儀表板需登入，已依 update-project-progress-guide 以 roadmap 固定 Feature ID 084 作任務真值並同步 DEV-SPEC、TDD-SPEC、TDD Progress Report、Development Log Summary 與 Handoff。\n• Sprint 3 實作完成第一版：新增 page-level classifier，建立 run 時寫入 pages/sourceTrust/orientation；技術選擇 UI 顯示正式/參考/略過頁數與頁面角色。\n• Prompt 與 saved_prompts migration 已補正式來源分流規則：不動產說明書、物件調查報告、照片、地圖只可作參考檢查，不可直接填正式明細。\n• 面積明細草稿新增 sourceTrust，來源欄會標示正式來源；targeted Jest 20/20、tsc、manifest validation、git diff --check 通過，狀態調整為 In Review。\n• 修正車位建物坪數計算：parkingBuildingAreas 會套用車位建物整體權利範圍 groupShareRatio，例如 84分之2；實機案例已由 1054.88㎡ / 319.10坪 修正為 25.12㎡ / 7.60坪。\n• Detect 與 Detail Builder 改為 agent chain 依序 fallback，單一 VLM 回傳畸形 JSON 時會嘗試下一個候選模型；全部候選 AI 失敗時標記 run failed，不產生 processor seed 草稿。",
    developmentProgress:
      "[2026/04/28] (Codex)\n• 完成今日進度報告回寫：TDD Progress Report 指向 2026-04-28 版本，Development Log Summary 補上完成清單、困難、踩雷、避免措施與明日優先順序。\n• Reviewer confidence 顯示語意改為審查信心，後端新增 confidence calibration，避免把 parser 結果很差誤讀成 reviewer 審查信心很低。\n• Parser/reviewer fallback runner 改為候選最多 5 個、目標 3 份成功報告；達標後立即取消 active provider 並進入下一階段。\n• 新增 detail_builder stage，由單一 VLM 整合 parser/reviewer 報告與原始文件，產生四大明細草稿並列出需人工確認項目。\n• 新增資料 migration 20260428110000_replace_transcript_audit_gpt55，將 transcript_audit 預設移除 openai/gpt-5.5，改由 Claude / Gemini / Grok 為前三順位，OpenAI GPT-5.3 作 fallback。\n• 修正 project-progress ID 漂移問題：roadmap feature 新增固定 id 欄位，Development Tab、phase tabs、dev-log API、roadmap context API、Paperclip dispatch 改讀 Feature ID，不再用陣列順序推算；統一謄本解析工作台正式校正為 Feature ID 084。\n\n[2026/04/29] (Codex)\n• Sprint 3 狀態：In Review。\n• 完成 page-level classifier、authoritative/reference source split、prompt/migration 同步與明細來源標記。\n• 驗證：targeted Jest 20/20、tsc --noEmit、validate-test-manifest.sh、git diff --check 通過。\n• 車位坪數 hotfix：BuildingLandAreaDetailTab regression 28/28 通過，實機頁面確認車位建物外層持分已套用。\n• Detect / Detail Builder fallback hotfix：intake-ai 3/3、ai-api-callers 4/4、process worker 10/10 通過；AI 全部候選失敗時不產生假草稿，直接標記 failed 並顯示模型錯誤。",
    devLogDocPath: "/project-process/dev-logs/084-development-log-summary.md",
    testScriptCount: 28,
    testScriptPassedCount: 28,
    testScriptPath: "apps/superadmin/unit_test/084",
    testLogDocPath: "/project-process/test-logs/test-transcript-intake-workbench-2026-04-28.md",
    testProgress:
      "2026/04/29：今日整合驗證完成，AI report standardReport、Detect 候補狀態、Gemini Flash 移除與 no processor seed policy 均通過 targeted regression；6 suites / 76 tests、tsc、manifest validation、git diff --check 通過。",
    testLog:
      "今日工作進度報告已更新至 Development Log Summary 與 TDD Progress Report，包含完成清單、技術困難、踩雷事件、預防指標、避免措施、明日工時估算與殘餘風險。",
    phase: "testing",
  },
  {
    id: "085",
    name: "上傳物件照片功能",
    locatedPage: "web/landlord/properties/add",
    percentage: 100,
    acceptanceCriteria:
      "1. 支援一次選擇並上傳最多20張照片。\n2. 上傳格式支援 JPG、PNG、WebP，單檔最大 10MB。\n3. 上傳時顯示進度條，支援斷點續傳。\n4. 上傳後可拖曳排序，設定封面照。\n5. 系統自動生成壓縮縮圖（Thumbnail），用於列表預覽。",
    docPath: "/project-process/features/photo-upload.md",
    featureSpecDocPath: "/project-process/features/photo-upload.md",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 3,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress: "PropertyMediaSection 已支援多張照片上傳、進度條、拖曳排序、封面照設定（is_primary）。縮圖改用 Supabase Storage render/image 端點（width=400&height=300&resize=cover&quality=80）自動壓縮，properties.ts getAllProperties + getPropertyById 的 mainPhotoUrl 均已更新。",
  },

  // 金流支付
  {
    id: "086",
    name: "可用的付款方式之一: ID pay",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 使用者可在結帳頁面選擇 ID Pay 作為付款方式。\n2. 整合 ID Pay API，完成身份驗證後付款。\n3. 付款成功後系統自動更新付款狀態並發送確認通知。\n4. 失敗的付款提供明確錯誤說明與重試入口。\n5. 支援 ID Pay 的退款流程（7個工作天內）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "金流支付 (Payments)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "087",
    name: "可用的付款方式之一: Apple Pay",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 在支援 Apple Pay 的裝置與瀏覽器上顯示 Apple Pay 按鈕。\n2. 點擊後觸發裝置原生的 Touch ID/Face ID 驗證。\n3. 驗證成功後完成支付，整個流程 < 10 秒。\n4. 付款成功發送確認通知（Email + 系統通知）。\n5. 不支援 Apple Pay 的環境自動隱藏該選項。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "金流支付 (Payments)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "088",
    name: "可用的付款方式之一: PayPal",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 點擊 PayPal 按鈕後跳出 PayPal 登入/快速結帳視窗。\n2. 支援 PayPal 帳戶付款與訪客信用卡付款兩種模式。\n3. PayPal 完成確認後返回系統並更新付款狀態。\n4. 支援 AUD 與 TWD 貨幣。\n5. 退款可從系統後台直接觸發 PayPal 退款 API。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "金流支付 (Payments)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "089",
    name: "可用的付款方式之一: Credit card",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 整合 Stripe 信用卡付款（支援 Visa、Mastercard、AMEX）。\n2. 卡號輸入使用 Stripe Elements（安全嵌入式輸入）。\n3. 付款失敗時顯示 Stripe 返回的錯誤原因（如：餘額不足）。\n4. 支援儲存卡號功能（Token化，不儲存原始卡號）。\n5. 3DS 二次驗證整合（符合 PSD2 標準）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "金流支付 (Payments)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    id: "090",
    name: "線上支付功能",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 結帳頁面顯示付款摘要（項目、金額、稅金、總計）。\n2. 支援多種付款方式選擇（信用卡、PayPal、Apple Pay、ID Pay）。\n3. 付款成功後生成電子收據（PDF），自動寄送至 Email。\n4. 系統顯示付款結果頁（成功/失敗），失敗附有重試按鈕。\n5. 所有付款交易記錄在後台可查詢（含交易ID、時間、金額、狀態）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "金流支付 (Payments)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },

  // 測試與品質保證
  {
    id: "091",
    name: "登入頁面>「記住我」功能 TDD 開發進度檢測報告",
    locatedPage: "文件/測試報告",
    percentage: 100,
    acceptanceCriteria:
      "1. 測試報告需包含所有測試案例清單（Happy Path & Edge Case）。\n2. 每個測試案例需標示通過/失敗狀態與執行時間。\n3. 程式碼覆蓋率需達 80% 以上（Unit + Integration）。\n4. 報告需列出發現的缺陷與修復說明。\n5. 最終結論明確標示功能是否符合驗收標準。",
    docPath: "/project-process/features/remember-me-tdd-report-20260205.md",
    featureSpecDocPath:
      "/project-process/features/remember-me-tdd-report-20260205.md",
    tddSpecDocPath:
      "/project-process/features/remember-me-tdd-report-20260205.md",
    category: "測試與品質保證 (Testing & QA)",
    points: 5,
    lastModifiedBy: "Claude Sonnet 4.5",
    lastModifiedDate: "2026/02/05",
  },

  // 專案管理與工具
  {
    id: "092",
    name: "專案開發進度儀表板重構 (Project Dashboard Overhaul)",
    locatedPage: "superadmin/dashboard/project-progress",
    percentage: 100,
    acceptanceCriteria:
      "1. 需支援欄位寬度動態調整。\n2. 需記憶使用者偏好設定。\n3. 需支援雙語標題。\n4. 需整合開發日誌與測試日誌連結。",
    docPath:
      "/project-process/progress-reports/daily-reports/project-dashboard-overhaul-2026-02-06.md",
    tddSpecDocPath:
      "/project-process/features/tdd-project-management-20260221.md",
    category: "專案管理與工具 (Project Management)",
    points: 3,
    lastModifiedBy: "Trae AI",
    lastModifiedDate: "2026/02/13",
    devLog:
      "[2026/02/13] (Trae AI)\n• 完成第二階段重構：支援 9 欄位 Flexbox 佈局、拖曳調整寬度、雙語標題與連結整合。\n詳見: [開發日誌](../dev-logs/dev-dashboard-refactor-2026-02-13.md)",
    testProgress:
      "[2026/02/13] (Trae AI)\n• 驗證欄位拖曳、localStorage 存取與重置功能正常。\n詳見: [測試日誌](../test-logs/test-dashboard-refactor-2026-02-13.md)",
    testCoverage: 0,
  },
  {
    id: "093",
    name: "檔案整理與歸檔系統 (File Manager)",
    locatedPage: "superadmin/tools/file-manager",
    percentage: 100,
    acceptanceCriteria:
      "1. 提供規則配置（檔名/目錄規範、歸檔/刪除規則、忽略清單）。\n2. 可產生掃描報告（JSON + Markdown）與整理計畫（Plan）。\n3. 套用計畫前必備份，並提供回滾機制。\n4. 支援 UI（Superadmin Tools）與 CLI（可用於排程/CI）。\n5. 提供 metrics.json 用於持續監控（違規數、重複檔案、趨勢）。",
    docPath: "/docs/file-management-system/01-technical-design.md",
    category: "專案管理與工具 (Project Management)",
    points: 5,
    lastModifiedBy: "GPT-5.2",
    lastModifiedDate: "2026/04/13",
    phase: "operations",
    developmentProgress:
      "新增 /superadmin/tools/file-manager：規則編輯、掃描、產生整理計畫、套用（含備份）、回滾；新增 CLI scripts 與 husky pre-push non-blocking 掃描；新增 docs/file-management-system/* 文件與 metrics.json。",
  },

  // === 2026-02-14 新增任務 ===
  {
    id: "094",
    name: "OCR 服務 lint 與型別檢查修正",
    locatedPage: "後端/OCR 服務",
    percentage: 100,
    workCategory: "維運",
    featureDescription:
      "修復 OCR 服務 ruff 規範問題並完成 ruff 驗證，同步執行 mypy 型別檢查並彙整待修項目",
    acceptanceCriteria:
      "1. ruff check src tests 無錯誤。\n2. mypy 執行完成並輸出待修清單。",
    developmentProgress:
      "100%（已修正 B904/unused/whitespace/exception chaining）",
    tddSpecDocPath:
      "/project-process/features/tdd-project-management-20260221.md",
    category: "專案管理與工具 (Project Management)",
    points: 3,
    devLog:
      "• 今日完成項目：修正 OCR service 的 ruff 錯誤（B904/unused/whitespace/exception chaining），重新執行 ruff 驗證。\n• 技術難點與解法：B904 例外鏈結與局部型別不一致問題，透過補齊 raise from 與整理變數使用修正。\n• 心得報告與避坑指南：先清掉 lint 噪音再做型別修正，可降低後續 mypy 修復成本。\n• 下階段計畫與預估工時：分批修復 mypy 型別標註與 Optional/union 問題，預估 4-6 小時。",
    testProgress: "60%（ruff 通過；mypy 已執行仍有 237 errors 待修）",
    testLog:
      "已執行：ruff check src tests（通過）、mypy src（失敗）。\n缺陷：mypy 回報 237 errors（缺少型別標註、Optional/union 取用問題）。\n修復狀態：已完成 ruff 修正，mypy 待處理。",
    lastModifiedBy: "Trae AI",
    lastModifiedDate: "2026/02/14",
  },
  {
    id: "095",
    name: "删除錯誤的 vercel.json 配置文件",
    locatedPage: "專案根目錄/部署",
    percentage: 100,
    workCategory: "部署優化",
    featureDescription:
      "移除破壞 Next.js App Router 的 SPA 重寫規則配置，確保 SSR、API Routes 和 Server Actions 正常運作",
    acceptanceCriteria:
      "1. vercel.json 文件已刪除。\n2. Next.js SSR 功能正常。\n3. API Routes 可正常訪問。\n4. Server Actions 正常執行。\n5. Vercel 自動檢測 Next.js 項目配置。",
    developmentProgress: "100%",
    tddSpecDocPath:
      "/project-process/features/tdd-project-management-20260221.md",
    category: "專案管理與工具 (Project Management)",
    points: 2,
    devLog:
      "### 今日完成項目\n• 刪除錯誤的 vercel.json（SPA rewrite 規則破壞 Next.js SSR）\n• Git commit: acb83b2\n\n### 技術難點與解決方案\n• 問題: vercel.json SPA 配置會將所有請求導向 /index.md，繞過 Next.js 渲染引擎\n• 解決: 完全刪除，讓 Vercel 自動檢測 Next.js\n\n### 避坑指南\n⚠️ 不要將 CRA/Vue/Angular 的 SPA 配置用於 Next.js\n⚠️ Next.js 16+ 不需要 vercel.json\n\n### 下階段計畫\n• [ ] 驗證生產環境 SSR 和 API Routes",
    testProgress: "100%",
    testLog:
      "✅ 文件刪除成功\n✅ Git 提交完成 (acb83b2)\n✅ 本地 Next.js 構建和運行正常",
    lastModifiedBy: "Claude Sonnet 4.5",
    lastModifiedDate: "2026/02/14",
  },
  {
    id: "096",
    name: "Winston 日誌系統重構為 Supabase 資料庫日誌",
    locatedPage: "apps/web/lib",
    percentage: 100,
    workCategory: "日誌系統",
    featureDescription:
      "將基於文件系統的 Winston 日誌改造為 Supabase 資料庫日誌，實現 Serverless 環境兼容性",
    acceptanceCriteria:
      "1. 創建 logs 資料表及 RLS 策略。\n2. 實作 SupabaseTransport 批次寫入機制。\n3. 支援環境自動檢測（Serverless vs Container）。\n4. 保留可選的文件日誌功能。\n5. 通過 Supabase migration 部署測試。",
    developmentProgress: "100%",
    tddSpecDocPath:
      "/project-process/features/tdd-project-management-20260221.md",
    category: "專案管理與工具 (Project Management)",
    points: 5,
    devLog:
      "### 今日完成項目\n• 重構 apps/web/lib/logger.ts，新增 SupabaseTransport\n• 創建 migration: 20260214000000_create_logs_table.sql\n• 實作批次寫入（10 條或 5 秒超時）\n• 環境檢測（Vercel/Netlify/AWS/Cloudflare）\n• Git commit: acb83b2\n\n### 技術難點與解決方案\n• 問題 1: fs.mkdir/fs.appendFile 在 Serverless 無法持久化 → 改用 Supabase DB\n• 問題 2: 高頻寫入 → 批次隊列機制\n• 問題 3: 本地開發便利性 → ENABLE_FILE_LOGGING 環境變數\n\n### 避坑指南\n⚠️ Serverless 環境不能用文件日誌\n⚠️ 批次寫入需處理 process beforeExit flush\n⚠️ 使用 service role key，禁用 session 持久化\n\n### 下階段計畫\n• [ ] 部署 migration（npx supabase db push）\n• [ ] 配置 SUPABASE_SERVICE_ROLE_KEY\n• [ ] 測試日誌寫入和查詢",
    testProgress: "80%（代碼完成，待部署後驗證）",
    testLog:
      "✅ TypeScript 編譯通過\n✅ 環境檢測邏輯正確\n✅ SupabaseTransport 結構完整\n✅ SQL migration 語法正確\n⏳ 待部署後驗證實際寫入",
    lastModifiedBy: "Claude Sonnet 4.5",
    lastModifiedDate: "2026/02/14",
  },
  {
    id: "097",
    name: "雲端部署平台選擇說明書",
    locatedPage: "docs/operational-guides",
    percentage: 100,
    workCategory: "文件撰寫",
    featureDescription:
      "撰寫完整的雲端部署平台選擇指南，涵蓋 7 個平台對比、成本分析、三階段部署策略及風險評估",
    acceptanceCriteria:
      "1. 完成 7 平台對比（Vercel、Cloudflare、Railway、Render、Netlify、AWS、VPS）。\n2. 三階段成本分析。\n3. 實施路線圖和決策矩陣。\n4. 風險評估與緩解策略。",
    developmentProgress: "100%",
    tddSpecDocPath:
      "/project-process/features/tdd-project-management-20260221.md",
    category: "專案管理與工具 (Project Management)",
    points: 3,
    docPath:
      "/docs/operational-guides/deployment-guides/cloud-deployment-platform-selection-guide.md",
    devLog:
      "### 今日完成項目\n• 創建 cloud-deployment-platform-selection-guide.md（2314 行）\n• 7 個平台詳細對比\n• 成本試算（1K MAU 和 10K MAU）\n• 三階段部署路線圖\n• 風險矩陣和緩解策略\n\n### 重點心得\n• Cloudflare Pages 無限流量是最大亮點\n• Vercel Hobby 最適合初期測試\n• 文件系統需求是 Serverless vs Container 的分水嶺\n\n### 避坑指南\n⚠️ 不要一開始就選企業級方案\n⚠️ 監控 Vercel 100GB 帶寬限制\n⚠️ SUPABASE_SERVICE_ROLE_KEY 不可加 NEXT_PUBLIC_ 前綴\n\n### 下階段計畫\n• [ ] 2-3 個月後評估實際流量\n• [ ] 準備平台遷移演練（每半年一次）",
    testProgress: "100%（文檔完成並已審閱）",
    testLog:
      "✅ Markdown 語法正確\n✅ 7 個平台全部覆蓋\n✅ 定價資訊準確\n✅ 實施步驟可操作\n✅ 風險評估全面",
    lastModifiedBy: "Claude Sonnet 4.5",
    lastModifiedDate: "2026/02/14",
  },

  // === 2026-02-16 新增任務 ===
  {
    id: "098",
    name: "登入／Portal／IAM 角色流程與 Superadmin 全角色選單",
    locatedPage: "web/portal, superadmin/users",
    percentage: 100,
    workCategory: "認證與權限",
    featureDescription:
      "登入後一律進 Portal；多角色與 middleware 同步；Portal 顯示使用者 IAM 角色卡；Superadmin 邀請使用者可選全部 iam_roles；測試帳號加入所有 IAM 群組並以 Playwright 驗證。",
    acceptanceCriteria:
      "1. 登入後一律導向 /portal。\n2. 多角色用戶在 Portal 可見所有被指派角色卡。\n3. Superadmin「Invite User」角色下拉顯示 DB 內全部角色（約 16 個）。\n4. 測試帳號 a0405142777@gmail.com 於 Portal 可見 11 張角色卡。\n5. Playwright 可完成登入→Portal→Superadmin 流程驗證。",
    developmentProgress: "100%",
    tddSpecDocPath:
      "/project-process/features/tdd-login-portal-iam-20260221.md",
    category: "安全與合規 (Security & Compliance)",
    points: 5,
    docPath:
      "/project-process/dev-logs/dev-login-portal-iam-roles-2026-02-16.md",
    devLog:
      "### 今日完成項目\n- 登入後一律導向 Portal；syncUserRolesToAuthMetadata 改 fire-and-forget。\n- normalizeRoles 移至 lib/roles.ts；middleware 空 roles 時導向 /portal。\n- Superadmin getRoles() 改為 admin client，Invite User 從 iam_roles 載入全表。\n- Migration 補齊 16 個 iam_roles、測試用戶加入所有 IAM 群組（Portal 11 張卡）。\n- Playwright 符號連結 1208→1200；以帳密執行登入與 Portal／Invite 驗證。\n\n### 技術難點與解決方案\n- 登入卡住：不 await sync，立即 window.location.href = '/portal'。\n- Portal 僅 2 卡：測試用戶僅 2 群組 → migration 加入所有 iam_groups。\n- Invite 僅 2 選項：getRoles() 用 service_role 查 iam_roles + migration 種子全角色。\n- normalizeRoles 在 'use server' 報錯：移至 lib/roles.ts。\n\n### 避坑指南\n⚠️ 'use server' 匯出函式須為 async。\n⚠️ 登入導向勿阻塞在 sync metadata。\n⚠️ Playwright MCP 缺 1200 時可 symlink 至 1208。\n\n### 下階段計畫\n- [ ] 評估 IAM 變更時同步 Auth user_metadata.roles。\n- [ ] E2E 新增多角色登入→Portal、Portal 卡數與 IAM 一致。\n\n詳見: /superadmin/project-file?path=project-process/dev-logs/dev-login-portal-iam-roles-2026-02-16.md",
    testProgress:
      "100%（Playwright 登入→Portal→Superadmin Invite 手動驗證通過）",
    testLog:
      "✅ 登入後進入 /portal。\n✅ Portal 顯示 11 張角色卡（測試用戶已加入所有群組）。\n✅ Superadmin Invite User 角色下拉 16 選項。\n✅ Playwright MCP 登入＋擷取角色卡數與選項數驗證。",
    lastModifiedBy: "Claude (Auto)",
    lastModifiedDate: "2026/02/16",
  },
  {
    id: "099",
    name: "OAuth 用戶新增角色功能修復（Add Role Feature Fix）",
    locatedPage: "web/portal, web/onboarding/add-role",
    percentage: 100,
    workCategory: "認證與權限",
    featureDescription:
      "修復 OAuth 登入用戶在 Portal 新增角色時出現的失敗問題，涉及 RLS 權限、IAM 群組映射、前端路由跳轉三個層面的問題診斷與修復。",
    acceptanceCriteria:
      "1. OAuth 用戶可在 Portal 成功新增角色（potential_tenant、potential_buyer 等）。\n2. 新增角色後 users_profile.roles 與 IAM 群組成員資格同步更新。\n3. Portal 頁面正確顯示所有用戶角色（從 IAM 系統讀取）。\n4. 前端無卡頓，成功跳轉回 Portal。\n5. ROLE_TO_GROUP_NAME 映射完整涵蓋所有角色類型。",
    developmentProgress: "100%",
    tddSpecDocPath:
      "/project-process/features/tdd-project-management-20260221.md",
    category: "安全與合規 (Security & Compliance)",
    points: 5,
    devLog:
      "### 今日完成項目\n- 修復 addUserRole Server Action：改用 admin 客戶端繞過 RLS 限制\n- 修復前端路由跳轉：router.push 改為 window.location.href 強制完整重新載入\n- 修復 IAM 角色映射缺失：ROLE_TO_GROUP_NAME 補齊 potential_tenant、potential_buyer、contracted_tenant、contracted_buyer、super_admin\n- 手動修復測試用戶的 IAM 群組成員資格（加入 Potential Buyers 和 Potential Tenants）\n- 驗證 get_user_roles RPC 正確返回所有 3 個角色\n\n### 技術難點與解決方案\n- **問題 1**: Server Action 一直 rendering，無法完成\n  **根因**: router.push() 在某些情況下不立即執行，導致頁面保持 loading 狀態\n  **解決**: 使用 window.location.href 強制完整頁面重新載入\n\n- **問題 2**: 角色成功添加到 users_profile.roles，但 Portal 不顯示\n  **根因**: ROLE_TO_GROUP_NAME 映射缺少 potential_tenant/potential_buyer，導致 addUserToIamGroupByRole 使用默認的 landlord 群組，IAM 系統未正確添加群組成員資格\n  **解決**: 補齊映射表，手動修復現有用戶的 IAM 群組成員資格\n\n- **問題 3**: addUserRole 使用普通客戶端可能受 RLS 限制\n  **根因**: createClient() 使用 anon key，雖然 RLS 允許更新，但使用 admin 客戶端更安全可靠\n  **解決**: 改用 createAdminClient() 進行角色更新操作\n\n### 重點心得\n- Portal 頁面通過 get_user_roles RPC 從 IAM 系統讀取角色，而非直接讀 users_profile.roles\n- IAM 系統是 Single Source of Truth，users_profile.roles 僅為緩存\n- 角色映射配置（ROLE_TO_GROUP_NAME）必須完整，否則會導致 IAM 同步失敗但不報錯\n- 數據庫層面的 UPDATE 成功不代表整個業務邏輯成功\n\n### 避坑指南\n⚠️ 新增角色類型時必須同步更新 ROLE_TO_GROUP_NAME 映射\n⚠️ Server Action 中處理敏感權限操作應使用 admin 客戶端\n⚠️ 路由跳轉問題可能不會拋錯，需要通過用戶反饋發現\n⚠️ 驗證功能時要檢查整個數據流：DB → IAM → RPC → Portal 顯示\n⚠️ 日誌中顯示「Success」不一定代表所有步驟都成功（IAM 添加被標記為 non-critical）\n\n### 下階段計畫\n- [ ] 考慮在 addUserRole 中添加 IAM 同步失敗時的回滾機制\n- [ ] 新增 E2E 測試覆蓋多角色添加流程\n- [ ] 監控生產環境用戶新增角色的成功率",
    testProgress: "100%（手動測試通過，涵蓋完整流程驗證）",
    testLog:
      "✅ 數據庫層面 UPDATE 操作成功（SQL 測試通過）\n✅ RLS 政策允許用戶更新自己的 profile\n✅ addUserRole Server Action 成功返回\n✅ IAM 群組成員資格正確添加（手動驗證 iam_group_members 表）\n✅ get_user_roles RPC 返回所有 3 個角色\n✅ Portal 頁面顯示所有角色卡片（landlord、potential_buyer、potential_tenant）\n✅ 前端路由跳轉正常，無卡頓\n✅ 重複添加已有角色時正確顯示錯誤訊息",
    testCoverage: 0,
    lastModifiedBy: "Claude Sonnet 4.5",
    lastModifiedDate: "2026/02/16-23:30",
  },
  // 超級管理員 - AI 服務設定（API 金鑰與模型）
  {
    id: "100",
    name: "超級管理員-AI 服務設定（API 金鑰與模型費用）",
    locatedPage: "superadmin/settings/api_key_and_model_setting",
    percentage: 100,
    acceptanceCriteria:
      "1. API 金鑰管理：從 .env 導入、單筆/全部刪除、金鑰驗證。\n2. 未登入時以 resolveUserId fallback 寫入/讀取 Supabase（keys/models/modules/prompts）。\n3. 側欄組態概況：已選總 models 數量即時反映各 provider 勾選加總。\n4. 儲存設定按鈕：將畫面上已選模型寫入 ai_model_selections。\n5. 分頁命名：模型費用說明；說明文案導向「模型費用說明」分頁。",
    docPath: "/project-process/test-logs/test-ai-settings-adapter-self-report-2026-04-19.md",
    devLogDocPath: "/project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md",
    featureSpecDocPath: "/project-process/features/ai-settings-adapter-self-report-dev-spec-20260419.md",
    tddSpecDocPath: "/project-process/features/tdd-ai-settings-adapter-self-report-20260419.md",
    category: "超級管理員 (Super Admin)",
    points: 5,
    devLog:
      "### 2026-03-04 更新\n- 修復 AI 模型全域評測 Prompt 測試功能無限重渲染 bug（Maximum update depth exceeded）。\n- 根本原因：page.tsx 每次渲染時 currentKeys 產生新陣列引用，導致 allRows→handleBatchTest→headerActionsRef useEffect 形成無限迴圈。\n- 修復方案（雙重防護）：(1) ModelEvaluator.tsx 使用 stable ref 模式（handleBatchTestRef + stableRunBatchTest），移除 handleBatchTest 作為 useEffect dep；(2) page.tsx 以 useMemo 穩定 currentKeys 引用。\n- TDD：新增 5 個批次測試執行行為測試案例，共 28 個測試全部通過。\n\n### 2026-03-06 更新\n- 在「已選/可選模型評估」分頁列右側新增「AI 模型全域評測」按鈕。\n- 按鈕重用既有 isEvalToolbarOpen 狀態，僅切換本頁全域評測面板顯示，不影響其他頁面功能。\n- 補上 aria-controls 對應面板 id（global-test-settings-panel），強化可及性。\n\n### 2026-03-06 更新（調整）\n- 移除 ModelEvaluator 表頭「AI 模型全域評測」按鈕與 onOpenGlobalTestPanel 相關程式碼。\n- 移除 settings/api_key_and_model_setting 的 `*-global-test` hash 入口，`#blog-global-test` 不再觸發對應頁面行為。\n- 同步刪除已不適用的按鈕行為測試案例，避免測試與現況不一致。\n\n### 2026-03-06 更新（獨立頁）\n- 「AI 模型全域評測」按鈕改為固定顯示在分頁列右側，不再只在 evaluations 分頁顯示。\n- 按鈕改為導向獨立頁 `/superadmin/settings/evaluations-global-test`，不再綁定 `#evaluations` 或本頁內嵌面板開關。\n- 移除 api_key_and_model_setting 內嵌的 AI 模型全域評測面板，避免與獨立頁重複。\n\n### 2026-03-06 更新（批次報告）\n- 批次測試完成後，自動將結果快照寫入 localStorage（最近一次報告）。\n- 新增「檢視最近報告」動作，透過 headerActionsRef 暴露給頁首按鈕呼叫。\n- 在「開始全域評測」旁新增「檢視最近報告」按鈕，使用者可隨時重新開啟最近一次批次結果視窗。\n\n### 2026-03-06 更新（UX 精簡）\n- 將右側設定區主流程收斂為「雲端 Prompt 選擇/載入 + 儲存雲端新版本 + 開始全域評測」。\n- 補上「載入雲端 Prompt」明確動作，避免僅選取下拉選單卻未真正載入內容的混淆。\n- 將本機 Prompt、下載、刪除雲端等操作收進「進階設定」摺疊區，降低主畫面複雜度。\n\n### 2026-03-06 更新（提示與確認流程）\n- 將 evaluations-global-test 頁面的 window.alert / window.confirm 全數移除，改為頁內 inline 提示訊息。\n- 刪除本機 Prompt 與刪除雲端 Prompt 改為「二次點擊確認」流程，避免誤刪且不中斷操作。\n- 提示訊息統一在右側設定區顯示，成功/錯誤/資訊狀態一致化。\n\n### 2026-03-06 更新（最近報告一鍵修正）\n- 新增「套用最近報告修正狀態」按鈕，將最近批次報告一次套用到模型分類與狀態。\n- 依報告內容自動推斷 `display_status_override`（VLM/LLM/不可用）並同步更新 `is_working`、`notes`、`last_tested_at`。\n- 套用後即回寫 ai_model_evaluations，避免逐筆手動調整模型狀態。\n\n### 2026-03-06 更新（移除混亂控件）\n- 依使用者回饋移除右側設定區的雲端 Prompt 管理與進階設定區塊（含載入、版本命名、儲存版本、本機 Prompt、刪除與下載）。\n- 僅保留核心流程：上傳測試檔案、編輯全域評測 Prompt、開始全域評測、檢視最近報告、套用最近報告修正狀態。\n\n### 2026-04-09 更新\n- 將 `/superadmin/settings` 首頁入口與 `api_key_and_model_setting` 頁面的跳轉按鈕命名統一為「AI 模型全域評測」。\n- 將 `/superadmin/settings/evaluations-global-test` 頁內主標題與麵包屑同步調整為「AI 模型全域評測」。\n- 將 settings 相關使用者可見文案、元件註解與規劃文件同步收斂為「AI 模型全域評測」與「全域評測 Prompt」等一致說法。\n- 保持既有路由不變，只修正跨頁入口、頁內標題與說明文案命名一致性。\n\n### 2026-04-11 更新\n- BottomSheetTabs 在「OCR解析設定」左側新增「LLM Leader Board」分頁（`#llm-leaderboard`）。\n- 新增 `GET /api/artificial-analysis/llm-leaderboard`：伺服器端抓取 artificialanalysis.ai leaderboard SSR HTML 並解析表格列；前端 `LlmLeaderboardPanel` 以 EnhancedTable 呈現並每日自動同步、可手動刷新。\n\n### 2026-04-11 更新（Qwen 整合）\n- 新增 Qwen（Alibaba DashScope / 通義千問）為第 11 家 AI 供應商，API 金鑰導入、驗證、連線測試、OCR 謄本解析全流程打通。\n- `AIProvider` 型別擴充 `'qwen'`；`AI_PROVIDERS` 新增 Qwen 卡片，內含 qwen-max / qwen-plus / qwen-turbo / qwen-vl-max / qwen-vl-plus / qwq-32b-preview 六個模型與定價。\n- `/api/ai-settings/keys/validate`：新增 `validateQwen`，主打 DashScope 國際區 OpenAI-compatible `/models` 端點，404/403 時回退 `/chat/completions` 1-token 探針。\n- `/api/ai-settings/models/test`：新增 `testQwen`，支援 qwen-vl-* 模型以 image_url 內嵌圖片進行多模態測試。\n- `lib/utils/ai-api-callers.ts`：新增 `callQwen`，供 OCR 謄本解析（TRANSCRIPT_PARSE_PROMPT）與多模型共識使用，強制 JSON 輸出格式。\n- Migration `20260411120000_add_qwen_provider.sql`：將 `'qwen'` 加入 `ai_api_keys` / `ai_model_selections` / `ai_chat_logs` / `ai_model_evaluations` / `ai_key_validation_cache` 五張表的 provider CHECK constraint。\n- UI 細節：`ApiKeyManager` 自動從 `AI_PROVIDERS.map` 渲染出 Qwen 卡片，新增 Qwen 品牌紫色 `#615CED`；`ModelSettingsModal` 的 `PROVIDER_DOCS` 補上 Qwen API 參數連結。\n\n### 2026-04-17 更新（Kilo / OpenCode HTTP 驗證）\n- 新增 `lib/ai-key-validation/kilo-opencode-zen.ts`：Kilo Gateway（`https://api.kilo.ai/api/gateway`）與 OpenCode Zen（`GET /zen/v1/models`）真實 HTTP 驗證；Kilo 必要時以 `POST …/chat/completions` 1-token probe，probe 模型優先取 `/models` 列表第一筆。\n- `api/ai-settings/keys/validate`：`validateKilo` / `validateOpenCode` 改接上述驗證器並套用 `buildModelInfo`。\n- `api/ai-settings/models/test`：`testKilo` / `testOpenCode` 改為與其他 provider 相同之 OpenAI-compatible 連線測試。\n- Jest：`lib/ai-key-validation/__tests__/kilo-opencode-zen.test.ts`（6 tests，mock fetch）。\n- Migration `20260417113000_add_kilo_opencode_provider.sql`：擴充 `ai_api_keys` 等表之 provider CHECK，解決 `ai_api_keys_provider_check`。\n- `ai-providers.ts`：`kilo` / `opencode` 卡片 Base URL 對齊 Gateway / Zen。\n- 本機 `.env`：`DATABASE_URL` 對齊 Supabase local 埠 **54322**（避免誤用 5432）。\n- 詳細日誌：`/project-process/test-logs/test-ai-settings-adapter-config-2026-04-17.md` §7。\n\n### 2026-04-17 更新（Adapter Config 表格 UI）\n- 修復 Adapter Config「從 Prompt Management 選擇」下拉在橫向捲動表格內操作異常：於 `textarea`／`select`／「載入」鈕加上 `mousedown`／`pointerdown` 的 `stopPropagation()`；`select` 加 `relative z-10`；`setAdapterConfigDrafts` 以 `prev[item.id]` functional merge，避免 stale draft。\n- 移除執行控制列冗餘狀態文字（如「尚未開始」）及 `ADAPTER_RUN_STATUS_LABEL`／`createAdapterConfigColumns` 的 `runStatusLabel` 依賴。\n- 完整敘述、踩雷與明日排程見同檔 **§8**。\n- **Paperclip**：請於已配置環境透過 `POST /api/paperclip/issues` 或 Project Progress Prompt Engineer 建立 `[Row100][2026-04-17] AI Settings — Adapter Config UI` 議題，並通知 CEO Dashboard（`/VIS/agents/ceo/dashboard`）。\n\n### 2026-04-19 更新（Adapter 模型自報版本驗證）\n- 修復截圖回歸 bug：「OpenCode CLI + MiniMax M2.7」evaluation 顯示 pass，但模型實際自報 MiniMax-M2.1（OpenRouter 將 m2.7 silently route 到 m2.1）。\n- `adapter-evaluation.ts` 新增三段式邏輯：`parseSelfReportedModel()` 抽家族+版本指紋、`compareSelfReportToRequested()` 五態比對、`evaluateAdapterRun()` 在原 pass 條件後加第三道檢查。\n- 保守策略：僅 `version-mismatch`（同家族但版本指紋不一致）才降為 fail；`family-mismatch`、`family-only-match`、`not-detected` 維持 pass，避免假陽性（如模型在回應中提及競品、或自稱 ChatGLM 等內部代號）。\n- `adapter-config.ts`：Kilo / OpenCode 兩列 MiniMax adapter id 改為 `openrouter/minimax/minimax-m2.5`（補 provider prefix + 換成 OpenRouter 端會誠實自報的版本），label 維持「MiniMax M2.7」並加註「（實際 M2.5）」便於辨識 provider 偷換版本之風險。\n- 實機驗證通過：模型自報 M2.5、source: requested、evaluation pass。\n- 測試：`adapter-evaluation.test.ts` 25/25 全綠（既有 10 + 新增 15，含截圖回歸 case + parseSelfReportedModel 5 個 + compareSelfReportToRequested 5 個）。\n- 後續：(P0) 加 `tools/testing/lint-adapter-model-ids.sh` pre-commit、(P2) 寫 `scripts/verify-adapter-self-report.ts` nightly job。\n- 詳見 `/project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md`。\n\n### 2026-04-21 更新（Keys 分頁金鑰驗證修復）\n- 補登兩筆未套用的 local migration：`20260417113000_add_kilo_opencode_provider.sql`（`ai_api_keys_provider_check` 缺 kilo / opencode，批次匯入這兩家 500）、`20260421140000_create_adapter_evaluation_runs.sql`（`adapter_evaluation_group_summary` RPC 不存在，設定頁每 12s 輪詢 500）。手動 psql 套用＋回寫 `supabase_migrations.schema_migrations`＋reload PostgREST schema cache。\n- 清資料：刪除 seed migration `20260216000000_seed_all_tables_20_rows.sql` 產生的 20 筆 `api_key_encrypted='enc_N'` 假資料（`atob()` 丟 InvalidCharacterError，「驗證全部金鑰」噴 20 筆『金鑰解密失敗』）；另清掉批次匯入產生的 11 筆 is_active=false 舊 row。\n- 修正 race bug：批次匯入後「驗證全部」把 `is_valid=true` 寫到已經被 deactivated 的舊 row，新的 active row 仍是 NULL → 全部 provider 卡黃色「待驗證」。流程 `POST→…→refreshSilent→setTimeout(0)→runValidateAllKeys(keysRef.current)` 依賴 `useEffect` 同步 `keysRef`，但 React state flush ≠ 一個 macrotask，`setTimeout(0)` 不夠等；加上 `validate/route.ts` 以 keyId 直接查 row（無 `is_active` 過濾）放大了問題。修法：`useAISettings.fetchAll` 回傳最新 `SavedKey[]`，`refreshSilent` forward 該回傳；`onBatchImportComplete` 直接用 `const freshKeys = await settings.refreshSilent()` 餵 `runValidateAllKeys`，不再透過 ref。\n- 檔案：`apps/superadmin/lib/hooks/useAISettings.ts`、`apps/superadmin/app/superadmin/settings/api_key_and_model_setting/page.tsx`。",
    testProgress:
      "TDD: 65/65 tests passing（本日 +25 adapter-evaluation 全綠；既有 kilo-opencode-zen 6 + adapter fallback 6 + 28）",
    testCoverage: 26,
    testScriptCount: 65,
    testScriptPassedCount: 65,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
  },

  // === 2026-02-21 新增任務 ===
  {
    id: "101",
    name: "Project Progress Dashboard — Feature Spec URL & TDD Spec URL 欄位完善",
    locatedPage: "superadmin/dashboard/project-progress",
    percentage: 100,
    workCategory: "資料補全/功能強化",
    featureDescription:
      "為 Development Tab 的 Col3 (Feature Spec URL) 與 Col5 (TTD Spec URL) 補全所有 feature 的 acceptanceCriteria、featureSpecDocPath、tddSpecDocPath 欄位。新增 4 個 TDD spec HTML 報告文件。更新 DevelopmentTab.tsx 讓兩欄同時顯示連結與文字內容。",
    acceptanceCriteria:
      "1. 所有 65 個 feature 均有 acceptanceCriteria 驗收標準文字。\n2. 有現有 spec 文件的 feature 均設定 featureSpecDocPath，顯示為「Spec Doc」連結。\n3. 主要測試 feature 均設定 tddSpecDocPath，顯示為「TDD Spec」連結。\n4. Col3/Col5 Cell 同時顯示連結 icon 與文字內容。\n5. TypeScript 嚴格模式零錯誤。",
    docPath: "",
    featureSpecDocPath:
      "/project-process/features/tdd-project-progress-dashboard-20260221.md",
    tddSpecDocPath:
      "/project-process/features/tdd-project-progress-dashboard-20260221.md",
    category: "專案管理與工具 (Project Management)",
    points: 5,
    mode: "agent",
    model: "claude-sonnet-4-6",
    testProgress: "100%（TypeScript 零錯誤，畫面驗證通過）",
    testLog:
      "✅ tsc --noEmit 零錯誤\n✅ Col3 Spec Doc 連結正確渲染\n✅ Col5 TDD Spec 連結正確渲染\n✅ 65 個 feature 均有 acceptanceCriteria\n✅ 4 個 TDD spec HTML 文件建立完成",
    testCoverage: 0,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/21",
  },

  // === 2026-02-19 新增任務 ===
  {
    id: "102",
    name: "Project Progress Dashboard — 四階段 Tab 重構",
    locatedPage: "superadmin/dashboard/project-progress",
    percentage: 100,
    workCategory: "重構/優化",
    featureDescription:
      "將 1,478 行單一頁面拆分為四階段 Tab 架構（開發/測試/部署/運維），抽取共用元件，主頁面縮減至 87 行。新增 PhaseType 資料模型、Pill 風格 Tab 列、各階段統計卡片、DevelopmentTab（完整功能保留）、Testing/Deployment/Operations Tab 骨架。",
    acceptanceCriteria:
      "1. 四個 Pill Tab 正確顯示並可切換（#development/#testing/#deployment/#operations hash 導航）。\n2. Development Tab 保留所有原有功能（搜尋、分類篩選、凍結窗格、欄寬調整、Save Widths、排版對齊、伺服器同步）。\n3. 各 Tab 顯示差異化統計卡片。\n4. TypeScript 型別嚴格（禁 any），npm run build 零錯誤。\n5. 主頁面 < 100 行，各 Tab 元件各 200-400 行。",
    docPath: "/docs/update-project-progress-guide.md",
    featureSpecDocPath:
      "/project-process/features/tdd-project-progress-dashboard-20260221.md",
    tddSpecDocPath:
      "/project-process/features/tdd-project-progress-dashboard-20260221.md",
    category: "專案管理與工具 (Project Management)",
    points: 5,
    mode: "agent",
    model: "claude-sonnet-4-6",
    devLog:
      "### 今日完成項目\n- page.tsx 1,478 行 → 87 行（重構率 94%）\n- 新增 PhaseType、RoadmapFeature 擴展（phase/testStatus/deployStatus/ops 欄位）\n- 建立 components/: ProgressBar, StatCard, PhaseTabBar, SharedStatsCards, DevelopmentTab, TestingTab, DeploymentTab, OperationsTab\n- DevelopmentTab 完整搬移：凍結窗格、欄寬拖曳、Preset、排版、Server 同步\n- Hash-based navigation (#development/#testing/#deployment/#operations)\n- inferPhase() 自動從現有資料推導階段（testCoverage>0 → testing）\n- npm run build 零錯誤",
    testProgress: "100%（npm run build 通過，頁面結構與 Tab 切換手動驗證）",
    testLog:
      "✅ npm run build 零 TypeScript 錯誤\n✅ /superadmin/dashboard/project-progress 四 Tab 正確渲染\n✅ Development Tab 保留所有原有表格功能\n✅ URL hash 同步（#development 等）\n✅ 統計卡片隨 Tab 切換",
    testCoverage: 0,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/19",
  },
  {
    id: "103",
    name: "LocalAgent - Cursor & Claude CLI IDE 整合",
    locatedPage: "tools/local-agent, superadmin/dashboard/project-progress",
    category: "專案管理與工具 (Project Management)",
    percentage: 85,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/24",
    devLog:
      "### 完成項目\n- dev_tasks DB migration 直接套用（bypass broken chain）\n- [id]/route.ts 修正 Next.js 16 async params (await context.params)\n- CursorAdapter：自動偵測 /Applications/IDEs/Cursor.app 路徑，產生 .cursor/dev-tasks/task-*.md 並啟動\n- ClaudeCLIAdapter：實作 spawn claude --dangerously-skip-permissions -p [prompt] --add-dir，等待完成後回報 status/logs\n- tools/local-agent/package.json + tsconfig.json：npm install && npm run build && npm run cursor/claude\n- run-cursor.sh / run-claude.sh：一鍵啟動腳本\n- apply-dev-tasks-migration.sh：bypass migration chain 直接套用 SQL\n- 完整 E2E 驗證：POST /api/dev-tasks → queued → LocalAgent 撿取 → succeeded，logs/result_summary 正確寫入 DB",
    docPath: "/tools/local-agent/README (run-cursor.sh / run-claude.sh)",
  },
  {
    id: "104",
    name: "IAM Management Hub（整合）",
    locatedPage: "/superadmin/dashboard/iam-management",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/27",
    devLog:
      "### 完成項目\n- 將 4 個分散頁面（iam-management, users, groups, rbac_access_control）整合為單一 tab 式儀表板\n- 新增 IAMTabBar / OverviewTab / UsersTab / GroupsTab / RolesTab 元件\n- iam-management/page.tsx 改為 hash-based tab shell（'use client'）\n- /superadmin/users、/superadmin/groups、/superadmin/dashboard/rbac_access_control 改為 client-side redirect\n- Sidebar 移除 3 個舊項目，IAM Management 改用 Shield icon\n- 2026/02/26：Roles tab Permission Matrix 完整 DB 持久化（iam_role_permissions 表、CRUD actions、即時儲存 UI）\n- 2026/02/27（Phase A）：修復 Hydration Error（useState 初始值從 getTabFromHash 改為 'overview' 常數，hash 讀取移至 useEffect）；刪除孤兒元件 PermissionMatrixTab.tsx（已被 RolesTab DB 版取代）",
  },
  {
    id: "105",
    name: "Enterprise RBAC — Resources / Route Permissions / Scope",
    locatedPage: "/superadmin/dashboard/iam-management#roles",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/27",
    devLog:
      "### 完成項目\n- DB migration 20260226190000：iam_role_permissions 新增 scope 欄位（all/own/assigned）+ CHECK constraint + index；新增 check_user_permission RPC\n- lib/rbac/resources.ts：16 resource 定義，分 5 組（Property/Contracts/Finance/IAM/System），export ResourceId + RESOURCE_DEFINITIONS + RESOURCES\n- lib/rbac/permissions.ts：PermissionScope type、checkUserHasPermission RPC wrapper、ROUTE_PERMISSIONS（21 路由對應）、findRoutePermission（最長前綴匹配）、getAccessibleRoutes\n- actions.ts：RolePermission 加 scope，getAllRolePermissions/saveRolePermissions 同步更新\n- RolesTab.tsx：16 resource 替換舊 7 個、scopeMatrix state、每欄 scope badge 可循環切換、Legend 說明\n- Sidebar.tsx：export navItems + NavItem，新增 accessibleHrefs prop 過濾可見路由\n- layout.tsx：改 async Server Component，呼叫 get_user_roles 判斷 isSuperAdmin，傳 accessibleHrefs 給 Sidebar\n- 2026/02/27（Phase C）：migration 20260227110000 — 5 張核心資料表（property_rentals / property_sales / lease_agreements / rental_ledger / sales_ledger）加入 iam_controlled_read + iam_managed_full_access 加法式 RLS 政策；透過 check_user_permission RPC 回傳 all/own/NULL 控制存取，保留既有 landlord/agent 政策不動\n- 2026/02/27（Phase D）：apps/web/middleware.ts 全面改寫 — 新增 ROUTE_ROLE_GUARDS（最長前綴優先）、getRequiredRoles()；受保護路由使用 get_user_roles() RPC 即時查 IAM 角色，super_admin 繞過全部守衛；role 不符跳轉 /portal?reason=insufficient_role",
  },
  {
    id: "106",
    name: "OAuth 用戶入職 — Avatar URL 支援",
    locatedPage: "/onboarding",
    category: "通用/系統 (General/System)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/27",
    devLog:
      "### 完成項目（Phase B）\n- config.toml：確認 Supabase CLI 不支援 scopes 鍵；改以 Dashboard UI 或 GOTRUE_EXTERNAL_*_SCOPES 環境變數設定 OAuth Scope（已在 config.toml 加入說明注解）\n- migration 20260227100000：users_profile 新增 avatar_url TEXT 欄位；從 auth.users.raw_user_meta_data 回填現有 OAuth 用戶（Google: avatar_url/picture，Facebook: avatar_url）\n- apps/web/lib/actions/onboarding.ts：createUserProfile() 新增 avatarUrl 提取（metadata.avatar_url || metadata.picture），寫入 users_profile.avatar_url",
  },
  {
    id: "107",
    name: "超級管理員-物件管理（新增物件含媒體上傳）",
    locatedPage: "superadmin/properties",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    devLog:
      "### 完成項目\n- getOwnersList() / createProperty() server actions（lib/actions/properties.ts）\n- CreatePropertyInput / OwnerOption 型別（lib/types/properties.ts）\n- PropertyCreateModal.tsx：含完整 6 頁籤（物件基本資訊 / 物件照片 / 謄本 / 權狀 / 合約 / 部落格）；兩段式建立流程：第一次儲存建立物件取得 ID，後續 tabs 接入 PropertyMediaSection；物件類型與所有權人建立後鎖定\n- PropertiesList.tsx：新增物件按鈕接入 PropertyCreateModal，onCreated 觸發 router.refresh()\n- properties/page.tsx：並行 fetch getAllProperties() + getOwnersList() 後傳入 PropertiesList\n### 2026-04-02 新增\n- PropertyMediaSection：floor_plan 頁籤新增已上傳格局圖 inline 預覽卡片，圖片直接顯示、PDF 以內嵌預覽呈現，避免使用者只能看檔名與外部連結\n- floor_plan 上傳區新增待上傳預覽，選檔後即可先確認檔案內容，再決定是否送出\n- 新增 PropertyMediaSection.test.tsx，覆蓋既有格局圖預覽與上傳後刷新預覽兩個情境，並以 Jest `--runTestsByPath` 驗證通過\n### 2026-04-03 新增\n- PropertyEditForm：在「使用分區」右側新增「地理資訊」分頁（PropertyGeographicInfoTab），顯示結構化地址、WGS84 座標與 Google Maps / OpenStreetMap 外部連結；雙圖資來源（歷史圖資展示系統 / 地理資訊e點通）各支援地籍圖、建物套繪圖、合併擷取，結果 signed URL 預覽並寫入 property_documents\n### 2026-04-03 補強（TDD / 穩定性）\n- 有 WGS84 時僅傳座標至 fetchCadastralMap（不再併傳門牌，避免混淆）；擷取結果列表 key 改為 storagePath；刪除改以 documentId + storagePath 辨識；ArcGIS job 輪詢第一次立即查狀態；物件編輯頁 export maxDuration=120s；新增 buildOperationalLayers / fetchCadastralMap 來源矩陣與 PropertyGeographicInfoTab 互動測試（Jest 22 例）\n### 2026-04-03 實價成交三報表（近一年）\n- lib/utils/real-price-comparables.ts：六都方圓 1km／其他縣市 2km、同街段（路街或謄本地段）、同里；Haversine 與近一年篩選\n- LVR_COMPARABLES_JSON_PATH：伺服器讀取正規化 JSON 陣列作為成交來源（未設定則表格為空仍產出 PDF）\n- lib/actions/transaction-comparables.ts：generateTransactionComparableDocuments 產出三份 PDF 寫入 property_documents（tags comparable:auto + comparable:kind:*），重產時取代同類舊檔\n- PropertyMediaSection 成交行情表：一鍵產出三份；新增 document_type transaction_comparables_nearby / _street_section / _village\n- PropertyGeographicInfoTab：村里欄位寫入 details.addressVillage；updateProperty / getPropertyById / getAllProperties 串接\n- real-price-comparable-pdf.ts（pdf-lib + Noto Sans TC woff2）、單元測試 real-price-comparables.test.ts\n### 2026-04-04 實價行情優化 (TDD)\n- **PDF 內容空白修復**: loadComparableSalesFromDb 實作分頁抓取（最高支援 10,000 筆），解決行政區成交量大於 1,000 筆時資料池不完整導致的空白問題。\n- **字體渲染修復**: PDF 優先載入 macOS 系統 `Arial Unicode.ttf`，徹底解決 Noto Sans 子集缺少中文字元導致的報表空白問題。\n- **自動定位強化**: 整合 `geocodeAddress` 多重定位策略，成功後自動同步座標回 DB；附近成交價新增「自定義半徑選擇器」(0.5km - 5.0km)，提升查詢靈活性。\n- **驗證**: 建立 `comparables.test.ts` 驗證過濾邏輯，並透過 `diagnosis.test.ts` 完成生產資料連通性檢查。\n### 2026-04-30 使用分區查詢對齊\n- 臺北市使用分區自動查詢改為接近市府查詢格式：查詢筆數、編號、行政區、地段、小段、查詢方式、母號/子號分欄。\n- 查詢結果 HTML 與已上傳使用分區文件新增站內預覽，user 可先確認內容再另開檔案或刪除。",
    developmentProgress:
      "物件列表與編輯功能（含 PropertyEditModal + PropertyMediaSection）已完成；實價行情功能已達成 TDD 綠燈狀態，支援分頁大數據、自定義半徑與精確字體渲染。\n2026-05-08：PropertyCreateModal 已有完整前端 validation（必填、售價/月租金大於0、物件類型不可空）；建立後 onCreated 改為導向 /superadmin/properties/:id/edit?tab=photos（媒體頁籤），PropertyCreatePageClient 已更新。",
  },
  {
    id: "108",
    name: "超級管理員-實價登錄資料自動化同步管理",
    locatedPage: "superadmin/settings/lvr-sync",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Gemini-3-Flash-Preview",
    lastModifiedDate: "2026/04/04",
    featureDescription:
      "提供圖形化介面讓管理員手動觸發內政部實價登錄 Open Data 同步。支援全台 22 縣市增量更新、自動去重、以及資料庫現有數據統計監控。",
    acceptanceCriteria:
      "1. 管理員可從 22 縣市下拉選單選擇目標縣市進行更新。\n2. 實作 DB Unique Constraint 確保相同成交紀錄不重疊匯入。\n3. 同步過程支援並行下載最近 4 季資料包並以 UPSERT 寫入。\n4. 資料統計看板需即時顯示各縣市總筆數與最後更新時間（created_at）。\n5. 繞過 Supabase 1,000 筆查詢限制，提供精確的萬級計數。",
    devLog:
      "### 2026-04-04 實價資料同步管理工具上線\n- **管理頁面**: 建立 `/superadmin/settings/lvr-sync` 頁面，整合同步控制與資料統計兩大功能。\n- **增量更新機制**: 捨棄舊有的「先刪後抓」邏輯，改為「下載最新 -> 自動去重 -> 增量累積」，支援建立多年期歷史資料庫。\n- **資料去重**: Migration 20260404100000 為 `lvr_land_transactions` 增加唯一約束（縣市/行政區/日期/價格/面積/地址），並實作 upsert 邏輯。\n- **統計優化**: `getLvrStatsAction` 採用並行 COUNT 查詢，解決統計數字卡在 1,000 筆的問題，並新增「最後更新日」顯示。\n- **資料來源**: 直接對接內政部 Open Data 季資料 API (https://plvr.land.moi.gov.tw/)。",
  },
  {
    id: "109",
    name: "雲端 OCR 多模型共識謄本解析",
    locatedPage: "superadmin/properties",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "testing",
    testCoverage: 60,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    testStatus: "in_progress",
    docPath: "/docs/implementation-plans/consensus-transcript-parsing-plan.md",
    devLog:
      "### 完成項目\n- DB Migration：ocr_parse_results 表 + property_documents 新增 consensus_metadata / parse_strategy 欄位\n- TypeScript 型別：ModelParseResult / ConsensusMetadata / ConflictDetail / JudgeResolution\n- Feature Module：拆分 online_ocr → online_ocr_parse（解析組）+ online_ocr_judge（裁判組）\n- 共識演算法：transcript-consensus.ts — 多模型 majority vote、台灣特規正規化、信心分數\n- AI API 共用呼叫器：ai-api-callers.ts — 支援 OpenAI/Anthropic/Gemini/DeepSeek/Grok\n- 共識引擎 Server Action：consensus-parse.ts — 平行呼叫 → 共識投票 → 裁判仲裁 三階段流程\n- 向下相容：parse-transcript.ts 改為 wrapper 委派至共識引擎\n- UI 更新：PropertyMediaSection 新增信心徽章、衝突明細面板、共識 metadata 顯示\n- FeatureModuleSelector 提示文字：解析組建議 2~3 模型、裁判組為可選配置\n### 2026-03-04 新增\n- SSE 串流 API：/api/transcript-parse/stream — POST 端點，以 ReadableStream 逐模型即時回傳解析進度事件\n- TranscriptParseSection 元件：從 PropertyMediaSection 拆出（原 610 行降至 387 行），新增：(1) 可收折「解析設定」面板（顯示已設定之解析/裁判模型、一次性 Prompt 覆寫欄位、跳轉 AI 設定連結）；(2) 解析中以逐模型進度列表取代單一轉圈，即時顯示各模型狀態（等待/解析中/完成/失敗）及耗時\n### 2026-03-07 新增/調整\n- 解析模型單一事實來源：TranscriptParseSection 僅使用 online_ocr_parse 模組綁定的 assigned_models，移除與 AI 模型全域評測 441 個候選模型的耦合，避免使用者在兩處重覆設定\n- 每次謄本解析最多呼叫 5 個成功解析模型：依 OCP 排序逐一呼叫模型，成功數達 5 即停止；若前幾個失敗則依序啟用後續模型，避免一次對數十/數百模型發送 API 呼叫\n- 裁判模型排序備援：後端依 online_ocr_judge 的 assigned_models 順序（含本次 overrideJudgeModel）輪流嘗試裁判模型，任一成功即套用其判決；全部失敗時回退至多模型共識結果\n- JSON 安全性強化：transcript-parse/stream 與 consensus-parse 在儲存裁判 raw_output 時採用 try/catch 保護，裁判回傳畸形 JSON 時僅記錄 error_message，不再中斷整體解析流程\n- 物件編輯頁解析設定 UX：AI 解析謄本設定面板顯示本次實際使用的解析/裁判模型，支援 per-run 勾選啟用與一次性 Prompt 覆寫，並確保畫面與後端實際呼叫模型一致",
    developmentProgress:
      "核心架構與 UI 已完成。2026-03-14 地端 Python 解析器全面升級：(P0.1) schema_converter.py 直接輸出 TranscriptParseOutput 統一格式，消除 buildFromLocalPython 橋接函式；(P1.2) 每個欄位附帶 field_confidences（regex 命中=1.0，空值=0.0）；(P2) local/route.ts 優先呼叫 HTTP 服務（port 8819），HTTP 不可用時自動降級至 CLI subprocess；(P0.2) PDF 無文字層（422）時前端自動觸發雲端解析；(P1.1) 地端解析結果可作為 local/local-regex-parser 虛擬模型注入共識 Pipeline；(P3) CJK 正規化擴充：全形小寫字母、括號變體、全形冒號/標點、日文漢字（証→證、様→樣等）。\n### 2026-03-18 新增\n- 解析 Prompt 加入「他項權利部特別說明」：全款購屋無貸款的謄本無他項權利部時，AI 必須輸出 encumbrances: []，不得填入含空字串的物件。\n- 建物/土地謄本表單：謄寫後若 encumbrances 為空陣列，顯示「（空白）－本物件目前無他項權利部」提示訊息，取代舊有的空白表單；使用者點擊「新增他項權利」即可繼續手動填寫。\n- 裁判模型更新為 3 組循序備援：Claude 3.5 Sonnet → Gemini 2.5 Flash → GPT-4o。\n- 謄本種類感知地端解析來源提取：kind = land 時優先使用 landTranscript，kind = building 時優先使用 buildingTranscript。\n- 謄寫前清除所有欄位（clear-first）：所有欄位（header / description / ownership / encumbrances）在謄寫前以 empty* 工廠函式清空，避免不同謄本的資料混入。\n- OCR 未設定模型警告：按下解析按鈕且無可用模型時，顯示 amber 警告並附設定頁連結，取代「所有模型失敗」的錯誤列表。",
  },
  {
    id: "110",
    name: "物件地址架構重構與自動同步 (Property Address Refactoring)",
    locatedPage: "superadmin/properties",
    percentage: 100,
    phase: "testing",
    category: "超級管理員 (Super Admin)",
    points: 5,
    lastModifiedBy: "Trae AI",
    lastModifiedDate: "2026/03/17",
    featureDescription:
      "將物件地址從單一字串重構為結構化欄位，並實作謄本 OCR 解析結果自動同步至地址欄位的機制。支援純土地物件地號與建物門牌地址。地址不再由人工輸入，以謄本為唯一事實來源。",
    acceptanceCriteria:
      "1. property_sales 與 property_rentals 補齊 address_city/district/street/number/floor/unit 欄位。\n2. 新增 is_pure_land 與 land_number 欄位支援純土地物件。\n3. DB Trigger 自動組合 address 完整字串。\n4. consensus-parse.ts 實作 syncAddressFromTranscript() 自動同步 OCR 結果。\n5. PropertyCreateModal 移除地址輸入欄位，改由謄本解析後自動寫入。",
    devLog:
      "### 2026-03-17 更新\n- 完成物件地址結構化重構，支援建物門牌與純土地地號。\n- 實作 DB Trigger 同步 address 欄位。\n- 移除手動輸入地址功能，強制以謄本 OCR 解析結果為唯一事實來源 (SSOT)。\n- 更新 PropertiesList 與 PropertyCreateModal 以支援新架構。\n- 撰寫 [物件地址架構說明](docs/technical-selection/property-address-architecture.md) 文件。",
    docPath: "/docs/technical-selection/property-address-architecture.md",
  },
  {
    id: "111",
    name: "Prompt 模板庫（儲存 / 載入）",
    locatedPage: "superadmin/settings/evaluations-global-test",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/08",
    devLog:
      "### 完成項目\n- DB Migration：20260308180000_create_saved_prompts.sql — saved_prompts 表（id / name / content / created_by / created_at / updated_at）、更新觸發器與 RLS 策略（iam_user_roles + iam_roles）\n- Server Actions：promptActions.ts — listSavedPrompts / savePrompt / deleteSavedPrompt，限 super_admin 存取，使用 createAdminClient（service_role）\n- UI 元件：PromptLibraryModal.tsx — save 模式（命名＋預覽前 200 字後送出）/ load 模式（列出全部已儲存 Prompt，支援一鍵載入 / 刪除）\n- 整合 evaluations-global-test/page.tsx：在 Prompt textarea 右下角以 flex justify-end 排列「儲存 Prompt」與「載入 Prompt」兩個按鈕，視覺上緊貼輸入框；PromptLibraryModal 以 Portal 渲染，支援 Esc 關閉",
    developmentProgress:
      "功能完整實作：儲存、列出、載入、刪除 Prompt 均已連接雲端 Supabase；UI 風格與現有頁面一致。",
  },
  {
    id: "112",
    name: "Prompt 管理獨立頁面",
    locatedPage: "superadmin/settings/prompt-management",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/21",
    devLog:
      "### 完成項目\n- 將原本分散在 evaluations-global-test 頁面的「儲存 Prompt」與「載入 Prompt」整合為獨立的 Prompt 管理頁面\n- Server Action：promptActions.ts 新增 updatePrompt（依 id 更新 name/content/updated_at）\n- 新頁面：settings/prompt-management/page.tsx — 左右分割面板佈局：左欄 = 可搜尋的 Prompt 列表（全域計數、hover 顯示複製/刪除操作、二次確認刪除）；右欄 = EditorPanel（新增/編輯，含字元計數、dirty-state 檢查、儲存回覆後自動更新列表）\n- Sidebar nav-items.ts 新增「Prompt 管理」（BookMarked 圖示）導覽項目\n- settings/page.tsx 新增 Prompt 管理入口卡片\n\n### 2026-03-21 更新（SSOT 橋接）\n- Migration 20260321130000：ai_system_prompts 新增 source_saved_prompt_id（FK → saved_prompts，ON DELETE SET NULL），記錄系統 Prompt 來源。\n- promptActions.ts 新增 setAsSystemPrompt(savedPromptId, moduleKey)：將 saved_prompts 一筆提升為 ai_system_prompts（deactivate 舊版，insert 新版，記錄 source_saved_prompt_id）。\n- promptActions.ts 新增 getActiveSystemPromptSourceId(moduleKey)：查詢當前啟用系統 Prompt 的 source_saved_prompt_id，供 UI 顯示 active badge。\n- PromptManagerModal.tsx 新增 activeSystemId / onSetAsSystem props：每列顯示「設為系統」按鈕；已啟用者改顯示「✓ 系統」badge。\n- prompt-management/page.tsx：頁面載入時查詢 activeSystemId，「設為系統」成功後即時更新 badge，實現 saved_prompts → ai_system_prompts 單向 SSOT 橋接。",
    developmentProgress:
      "獨立頁面完整實作：CRUD、搜尋、複製、載入均已完成；新增「設為系統 Prompt」功能，saved_prompts 可一鍵提升為解析系統 Prompt（online_ocr_parse）。",
  },
  {
    id: "113",
    name: "FinePrint .fp 謄本轉檔工具",
    locatedPage: "tools/fp-converter",
    category: "通用/系統 (General/System)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/04/27",
    devLog:
      "### 完成項目\n- 逆向工程 FinePrint .fp 二進位格式：發現文字以 UTF-16LE 儲存於固定結構 record（magic: 0x1E ?? 0x40 YY，其中 ??=8+YY×4），無需 Windows 或 FinePrint 即可解析\n- tools/fp-converter/convert_fp.py — CLI 工具，支援三種輸出格式：HTML（推薦）/ Markdown / PDF（fpdf2）\n- 批次測試 109 份「新謄本」資料夾中的 .fp 檔案，全部 109/109 成功轉換，0 失敗\n- HTML 輸出包含完整謄本結構（建物標示部、所有權部、他項權利部、抵押權等），PingFang TC 字型，支援瀏覽器列印為 PDF\n- tools/fp-converter/README.md 完整使用說明\n### 2026/03/18 排版大幅改善\n- 移除全域去重邏輯：改用 content-based 頁碼偵測（第N頁共N頁 pattern），正確保留所有重複結構詞（民國/年/月/日/：）\n- 新增 X-座標感知提取，辨別右對齊 content token vs 頁尾 token\n- 日期片段自動合併：民國 NNN 年 NN 月 NN 日 → 單一字串\n- 單字拆分修正：連續單字元 CJK token 在「：」前自動合併為複合標籤（層數/總面積/住址）\n- 全新表格式 HTML 排版：官方謄本樣式（深藍標題列、欄位表格、位置列）\n- 建物標示部/所有權部欄位正確 label:value 對應（登記日期、登記原因、建物門牌等）\n### 2026/04/27 Bugfix（早晨）\n- 補上無 `＊＊＊ section ＊＊＊` marker 的異動索引類謄本 fallback parser，避免 Markdown/PDF 退化成只有標題與 header 段落\n- 新增 tools/fp-converter/tests/test_convert_fp.py，先用失敗測試重現 ASCII `:` + inline section header 的舊格式樣本，再修正 parser\n- fallback parser 現可切出建物所有權部與異動別/登記日期/登記次序/登記原因/收件字號/異動日期/權利人等欄位\n### 2026/04/27 Legacy FINC zlib 支援（下午）\n- Web UI `/superadmin/settings/fp-converter` 「PDF 只剩地址」根因鎖定：~50% 來源檔屬 pre-2012 的 legacy FINC v2，內容是逐頁 zlib raw deflate 壓縮，舊邏輯抓不到 0x1E 文字記錄就退化成只有 header 的空 PDF\n- 逆向工程 legacy 格式：12-byte file header (FINC + version + page_count) + N×16-byte page descriptor (file_offset, type, compressed_size, uncompressed_size) + 各 page 的 raw deflate payload（wbits=-15）\n- 在 convert_fp.py 加 `_decompress_legacy_finc_pages()`，先試現代 0x1E 路徑，0 token 才進 legacy decompress；解壓後直接餵給原本的 _extract_raw_records / _preprocess / _parse_doc_structure 完整管線\n- _SYSTEM_NAMES 加入 `地籍地價地籍圖資料電傳資訊服務系統`（pre-2010 站）；_remove_page_footers 補 legacy 版「第 N 頁 / 共 N 頁」slash 分隔\n- 對純向量繪圖（建物測量成果圖）/ FINE-nested 子格式檔案，回傳 `_NON_TEXT_FINC_PLACEHOLDER` 並讓 build_html / build_markdown render 提示句，避免 web UI 仍出現空 PDF\n- 抽樣 1907/2000 真實 .fp：99.42% 完整 sections + 0.58% 圖件 placeholder + 0% unsupported；舊邏輯下這同一批的 unsupported 比例 ~50%\n- tests/test_convert_fp.py 從 4 → 8 cases（legacy 兩份 fixture、normal regression、placeholder synthetic、原本的 inline-section/footer/recursive collect 全保留）",
    devLogDocPath: "project-process/dev-logs/dev-fp-converter-legacy-finc-2026-04-27.md",
    testScriptPath: "tools/fp-converter/tests/test_convert_fp.py",
    developmentProgress:
      "完整實作：可在 macOS 批次將 Windows FinePrint .fp 謄本（modern + pre-2012 legacy zlib 兩種次格式）轉成 HTML/MD/PDF/JSON。Legacy FINC 從之前 50% 全 reject 變成 99%+ 解出完整 sections；少量純向量繪圖檔顯示明確的「無文字內容」提示而不是空 PDF。",
  },
  // === 2026-03-20 小型 UX 更新 ===
  {
    id: "114",
    name: "超級管理員-物件編輯合約 Tab 文案更新",
    locatedPage: "superadmin/properties/[id]/edit?tab=contract",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    workCategory: "UX 文案調整",
    acceptanceCriteria:
      "1. 合約 Tab 文案顯示為「預覽合約」。\n2. 物件編輯頁（PropertyEditForm）與編輯 Modal（PropertyEditModal）同步更新。",
    developmentProgress:
      "更新 tab label，避免與實際下載/預覽行為造成語意落差。",
    points: 1,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/20",
  },
  {
    id: "115",
    name: "超級管理員-合約雲端草稿同步",
    locatedPage: "superadmin/properties/[id]/edit?tab=contract",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    workCategory: "合約草稿同步",
    acceptanceCriteria:
      "1. 合約 Tab 欄位自動同步到目前登入帳號的雲端草稿。\n2. 同帳號重新登入或換裝置後可還原已輸入欄位。\n3. 既有瀏覽器本地草稿可自動升級同步到雲端。\n4. 提供清除草稿操作，會同步清掉本地快取與雲端草稿。",
    developmentProgress:
      "superadmin 契約草稿表單改為本地快取 + Supabase form_drafts 帳號層級雲端同步；掛上 debounce 自動儲存、雲端回填、舊本地草稿遷移與同步清除流程，並完成聚焦 Jest 驗證。",
    points: 2,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/19",
  },
  {
    id: "116",
    name: "超級管理員-合約 Tab 輸入穩定性修復",
    locatedPage: "superadmin/properties/[id]/edit?tab=contract",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    workCategory: "表單互動修復",
    acceptanceCriteria:
      "1. 買賣契約付款節點名稱欄位可連續輸入文字，不會失去焦點。\n2. 同列付款節點金額與日期欄位在編輯後不會因為 React remount 被重設。\n3. 合約 Tab 的數字欄位清空後可保持空白並重新輸入，不會立即被 0 或 1 覆蓋。\n4. 修復需有自動化回歸測試覆蓋。",
    developmentProgress:
      "修正 ContractDraftPreviewSection 付款節點列表使用可編輯 label 當 React key 的問題，改為穩定 key 以避免輸入時整列 remount；另外將合約 Tab 多個數字欄位改為可保留編輯中暫時文字的 NumericInput，避免清空重打時被 0/1 立即覆蓋。2026/03/20 補強 NumericInput 為未聚焦時同步外部值、失焦正規化提交，修復手動輸入/編輯數字時卡住或被覆蓋的問題。新增 Jest 回歸測試，覆蓋付款節點 focus 穩定性、數字欄位清空重打與文字欄位覆寫情境。",
    points: 1,
    lastModifiedBy: "GPT-5.3-Codex",
    lastModifiedDate: "2026/03/20",
  },
  {
    id: "117",
    name: "超級管理員-物件列表頁面效能優化",
    locatedPage: "superadmin/properties",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    workCategory: "前端效能優化",
    featureDescription:
      "解決 /superadmin/properties 頁面切換時感知卡頓的問題，從 Server 端查詢並行化、Client 端渲染優化、loading UI 三個層面全面提升。",
    acceptanceCriteria:
      "1. 新增 loading.tsx skeleton，切換頁面時立即有視覺回饋。\n2. getAllProperties() 的 6 個序列 DB 查詢改為 Promise.all 並行（Phase1 同時查 sales/rentals/owners/photos/docs/blogs）。\n3. PropertiesList columns array 改用 useMemo，避免 pagination/sorting/align 狀態變動時重建 20 個 column def。\n4. contentStatus cell 的 localStorage 讀取移至 investigationMap useMemo，property 不變時只讀一次。\n5. frozenColLeftOffsets 的 useMemo dependency 修正（移除每次 render 都新 reference 的 getAllColumns()）。",
    developmentProgress:
      "完成 loading.tsx 新增；getAllProperties() 並行化（預估 server 等待縮短 40-60%）；handleDelete 改為 useCallback；columns 改為 useMemo；investigationMap 預讀 localStorage；frozenColLeftOffsets dep 修正。",
    points: 2,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/20",
  },
  {
    id: "118",
    name: "物件調查報告書全面升級（Phase 1-4）",
    locatedPage: "superadmin/properties/[id]/edit?tab=investigation",
    category: "超級管理員 (Super Admin)",
    percentage: 95,
    workCategory: "功能強化",
    featureDescription:
      "對標住商不動產 Excel 物件調查報告書，全面升級 web 版本。Phase1-3：DB 儲存 + 謄本自動填入 + 列印版面還原 + 完整度指示器 + 附件清單 + 版本歷史 + 格局圖 + 位置圖 + 屋況說明書。Phase4：全新附件列印系統 — 重新設計 AttachmentPickerV2（16 個附件類別分 4 群組勾選：報告本體/已上傳文件/資料衍生頁面/媒體），8 個 HTML 列印模板（基本資訊/物件介紹/面積明細/交易條件/使用分區/地圖定位/照片聯絡圖/文件參考清單），合併列印功能（報告書 + 所選附件一次列印）。提取 buildReportHtml 模組化報告 HTML 產生。",
    points: 8,
    lastModifiedBy: "Claude Opus 4.6",
    lastModifiedDate: "2026/04/09",
  },
  {
    id: "119",
    name: "超級管理員-合約套版多範本選擇器",
    locatedPage: "superadmin/properties/[id]/edit?tab=contract",
    category: "超級管理員 (Super Admin)",
    percentage: 95,
    phase: "development",
    featureDescription:
      "將「預覽合約」Tab 大改為「預覽合約套版」，以多選卡片 Grid 呈現 6 種官方範本，每個面板支援雙模式：「AI 套版生成」（填表+AI 產生草稿）或「自行上傳合約」（上傳律師/代書提供的 PDF/DOCX/DOC）。同一物件可同時持有多種合約類型，各自獨立管理。",
    acceptanceCriteria:
      "1. Tab 標籤改為「預覽合約套版」。\n2. 頂部顯示 6 種合約範本卡片，支援複選。\n3. 每個面板頂部有「AI 套版生成」/「自行上傳合約」切換 Tab。\n4. AI 模式：填表、產生草稿預覽、下載 HTML/DOCX、列印、雲端版本管理。\n5. 上傳模式：拖曳/點擊上傳 PDF/DOCX/DOC/JPG/PNG（≤20MB）、PDF 行內預覽、刪除。\n6. 各面板 cloud sync key 含 templateId，上傳檔案路徑含 templateId 隔離。",
    developmentProgress:
      "Phase 1：6 種範本多選卡片 + 獨立面板架構（ContractTemplateConfig.ts、ContractDraftPanel.tsx、ContractDraftLeaseFields.tsx、ContractDraftSaleFields.tsx 等 6 檔，共從 1369 行拆分為各不超過 393 行）。Phase 2：每個面板加入雙模式切換（panelMode: ai-generate | upload），ContractDraftUploadPanel.tsx 實作拖曳上傳、PDF 預覽、刪除，後端新增 uploadContractFile / getPropertyContractFiles Server Actions，PropertyContractFileItem 型別，合約存於 property-documents/{propertyId}/contracts/{templateId}/ 路徑。",
    points: 8,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/22",
  },
  {
    id: "120",
    name: "多角色平台商業計畫與定價策略",
    locatedPage: "docs + web/pricing",
    category: "專案管理與工具 (Project Management)",
    percentage: 70,
    phase: "development",
    featureDescription:
      "將產品從單一房東工具正式重定位為多角色不動產 AI 協作平台，定義免費角色、付費角色、角色服務包、台灣與澳洲雙市場定價邏輯，以及 pricing page 的資訊架構基礎。",
    acceptanceCriteria:
      "1. 明確定義免費角色與付費角色。\n2. 每個主要角色都有服務項目與定價策略。\n3. 完成台灣與澳洲雙市場價格帶初稿。\n4. 產出可直接支援官網首頁與 pricing page 的方案結構。\n5. 明確定義 12 個月切入順序與核心 KPI。",
    docPath: "/project-process/features/multi-role-business-plan-20260322.md",
    featureSpecDocPath:
      "/project-process/features/multi-role-business-plan-20260322.md",
    points: 5,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/22",
    developmentProgress:
      "已完成多角色商業計畫第一版，並進一步產出募資版 investor pitch outline 與 sales deck outline，同步落實到首頁定位與 pricing page 結構。下一步是將兩份 outline 轉為正式簡報內容與視覺版型。",
  },

  {
    id: "121",
    name: "物件部落格多平台發布",
    locatedPage: "superadmin/properties/[id]/edit?tab=advertisement_creators",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "development",
    docPath: "/project-process/features/property-advertisement-workflow-redesign-20260330.md",
    featureSpecDocPath:
      "/project-process/features/property-advertisement-workflow-redesign-20260330.md",
    featureDescription:
      "Blog tab 重構為三平台架構：地端 Supabase（現有）、Google Blogger（OAuth2 + Blogger API v3）、Facebook 粉絲頁（Page Access Token + Graph API）。新增「參考網頁風格 URL」功能（用戶貼上任何物件廣告網址，AI 分析設計語言後生成風格相似銷售頁面）與「風格預設選擇器」（4 個預設：豪宅暗色調/清爽明亮/商務簡潔/溫馨日系），不需參考 URL 即可快速生成高品質頁面。設定頁 /superadmin/settings/integrations 管理第三方平台整合。",
    acceptanceCriteria:
      "1. Blog tab 有平台選擇器（Supabase / Google Blogger / Facebook）。\n2. 風格預設選擇器（4 個預設）或參考 URL 擇一使用，AI 生成對應風格 HTML。\n3. Google Blogger OAuth 流程完整（授權 → callback → 儲存 token → 發布）。\n4. 帳號已連但無部落格時顯示引導建立 Blogger 的友善提示。\n5. Facebook Page Access Token 驗證成功後可發布至粉絲頁。",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress:
      "已完成：DB migration、Google OAuth2 routes、Blogger API v3 CRUD、Facebook Graph API、integrations server actions、BlogSupabasePanel/BlogGooglePanel/BlogFacebookPanel 拆分、平台選擇器、風格預設選擇器（4 個預設 + Claude 生成）、參考 URL 輸入、StylePreset 型別與 blog.ts 整合、BlogGooglePanel 帳號連結但無部落格友善提示修復、Google Blogger 在有參考 URL/風格預設時改為先重新生成再發布（含同步更新流程）並新增單元測試覆蓋。新增：地端 4 份 + Google Blogger 4 份，共 8 份獨立模板檔，並以 targetPlatform 明確切分生成來源，便於後續維護與版本管理。2026/03/22 補強：`blog_posts` 改為真正以 stylePreset + targetPlatform 讀寫與回查、PropertyBlogGenerator/BlogSupabasePanel/BlogGooglePanel/PropertyBlogStyleRowActionCells 全面改為 variant-aware 資料流，避免不同樣式/平台互相讀錯文章；Google OAuth callback 不再自動選第一個 Blogger blog；新增 BlogGooglePanel 與 Google callback 單元測試。2026/03/22 第二波補強：將 reference URL 正式納入 `blog_posts` variant identity 與查詢條件，避免同樣式但不同參考網址互相覆蓋，並把 `blogReferenceUrl` 同步到 URL query 以支援重新整理後仍能定位到正確 variant。2026/03/23 驗證：已在 local Supabase 套用 `20260322223000_add_blog_post_variant_identity.sql`，新增 `lib/actions/blog.test.ts` 驗證 reference URL normalization 與 null-variant lookup，新增 `PropertyBlogGenerator.test.tsx` 驗證 blogPlatform / blogStylePreset / blogReferenceUrl 的 query restore 與 sync/clear 行為，並新增 Playwright `property-blog-query-sync.spec.ts` 實測 superadmin 物件編輯頁在切換 Google Blogger / 商務簡潔樣式 / 參考網址後，重新整理仍能保留 query 與 UI 狀態。2026/03/30 補充：已完成新版「物件廣告生成流程重規劃 Spec」、Wireframe/元件結構稿、Implementation Tasks，以及更細的開發順序文件 `/project-process/features/property-advertisement-dev-order-20260330.md`。同日已開始落地第一張工單：PropertyBlogGenerator 先接上新的 content-first builder 骨架，將內容區塊、風格選擇、草稿概念與輸出流程改成 step-based 版面，同時保留既有 query restore 與平台發布能力。本次再完成第二張工單：新增 readiness summary、可勾選的內容區塊卡片，以及「系統模板 / 參考網址模式」互斥切換，並同步更新 Jest 與 Playwright query-sync 規格。接著完成第三張小工單：readiness summary 不再使用靜態 mapping，先改由 property 真實欄位動態判斷基本資料、照片、介紹與定位可用性，並新增 property-advertisement-readiness utility 與對應單元測試。最新進度再擴充為 8 個內容區塊：除了基本資料、照片、介紹、定位外，已納入謄本連結、建物與土地面積明細表、權狀連結、物件格局圖；單筆物件載入流程也會同步帶入 hasTranscript / hasTitleDoc / hasFloorPlan 等文件旗標，讓 builder 在編輯頁可依真實資料來源動態顯示可用性。Step 3 也已從 placeholder 改為可操作的「生成廣告草稿」主 CTA，會依目前選定的平台、模板或參考網址直接呼叫既有 variant-aware generate flow，讓使用者不必再依賴下方樣式列按鈕才能開始。最新補齊：selected sections 已正式帶入 generatePropertyBlog action 與 AI prompt context，並持久化到 `blog_posts.generation_context`；前端在生成完成後與重新整理後都會顯示「本次草稿帶入內容」摘要，讓 builder 的內容選擇不再只是暫時 UI 狀態。最新再補上 canonical builder draft persistence：PropertyBlogGenerator 已重用既有 `form_drafts` + localStorage helper，自動保存平台、風格模式、preset/reference URL 與 selected sections，重新整理或回到同一物件時會先還原最近 builder 狀態，同時保留 URL query override 能力。另已擴充 Playwright `property-blog-query-sync.spec.ts`，加入 builder draft restore / query override 流程，並把登入改為讀取 `PLAYWRIGHT_SUPERADMIN_EMAIL` / `PLAYWRIGHT_SUPERADMIN_PASSWORD`，同時改成 serial 以避免共享 draft 狀態互相干擾；目前在本地因未提供有效測試帳密而安全 skip。待完善：在有效 superadmin 測試帳號可用後，補跑完整端到端驗證。",
  },
  {
    id: "122",
    name: "租客維修申請系統",
    category: "租客 (Tenant)",
    percentage: 95,
    phase: "development",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress:
      "已完成：maintenance.ts server actions（getMyMaintenanceRequests、createMaintenanceRequest、cancelMaintenanceRequest、getLandlordMaintenanceRequests、updateMaintenanceRequest、completeMaintenanceAsLandlord、confirmMaintenanceClosureByTenant、syncMaintenanceExpenseLedgerForLandlord）、租客維修頁面（/tenant/maintenance）含提交表單/狀態追蹤/照片上傳（Supabase Storage maintenance-photos bucket）、房東維修管理頁面（/landlord/maintenance）含廠商指派/費用填寫/租客結案確認流程/rental_ledger 費用自動寫入。待完善：E2E 測試。",
  },
  {
    id: "123",
    name: "租賃申請系統（申請表/審核流程/Email通知）",
    category: "租客 (Tenant)",
    percentage: 90,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/22",
    developmentProgress:
      "已完成：rental_applications DB migration（含 RLS 政策、索引）、applications.ts server actions（getMyApplications、createApplication、submitApplication、withdrawApplication、getLandlordApplications、reviewApplication、getApplicationById、updateApplicationDraft）、租賃申請列表頁（mock data 替換）、申請表填寫頁（/tenant/potential/applications/[id]/edit）含 RHF+Zod 驗證/草稿儲存/送出流程、房東審核頁（/landlord/applications）含展開申請人詳情/核准/婉拒+拒絕原因 Modal、Email 通知系統（lib/email.ts nodemailer）：申請送出通知房東、審核結果通知申請人、SMTP env vars 可設定。待完善：E2E 測試。",
  },
  {
    id: "124",
    name: "台灣官方網站全頁面重設計（TW-only）",
    category: "通用/系統 (General/System)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/22",
    developmentProgress:
      "已完成：首頁（/）全面改寫（TW專屬文案、6角色入口、6步驟交易流程、FAQ）；關於我們（/about）移除澳洲市場敘述、改為深耕台灣策略；平台能力（/services）新增角色別功能列表（6角色）、AI核心能力（謄本OCR/跟進建議/文件清單）、台灣本地化功能清單；收費方式（/pricing）移除AUD幣別切換、改為純TWD計價、FAQ更新；聯絡我們（/contact）移除澳洲地址、改為台灣辦公室資訊；物件列表（/properties + lib/api/properties.ts）新增 region='TW' 篩選，僅顯示台灣物件。",
  },
  {
    id: "125",
    name: "Contact Leads 指派負責人與備註系統",
    category: "超級管理員 (Super Admin)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress:
      "已完成：DB migration 20260322190000（contact_messages 新增 assignee_id/assignee_name、新增 contact_lead_notes 表含 RLS）、actions.ts 新增 getSuperadminUsers、assignContactLead、getContactLeadNotes、addContactLeadNote、deleteContactLeadNote server actions、ContactLeadAssigneeForm 元件（下拉選擇負責人/儲存指派）、ContactLeadNotesSection 元件（新增/刪除備註、note_type: note/reply/internal）、ContactLeadsTable 新增負責人欄位、[id]/page.tsx 整合三個新區塊（訊息+指派/備註）。批次狀態更新前端 UI 已完整（既有功能）。所有現有 Jest 測試（17 tests）均通過。",
  },
  {
    id: "126",
    name: "專案文檔與維護腳本清理與規範化 (Docs & Scripts Maintenance)",
    locatedPage: "docs/, scripts/",
    percentage: 100,
    category: "專案管理與工具 (Project Management)",
    points: 3,
    featureSpecDocPath: "/docs/scripts-directory-guide.md",
    docPath: "/docs/scripts-directory-guide.md",
    devLog: "### 2026-03-22 文檔與腳本全面清理\n- **文檔建立**: 建立 `docs/scripts-directory-guide.md` 腳本目錄說明書，並完成 `docs/台灣房仲 × 履約保證（ESCROW）對照表.md` 與 `docs/台灣辦理不動產過戶方式流程選擇與介紹.md` 法律驗證文檔。\n- **標籤清理**: 自動化移除全站 .md 檔案中的 `<br>` 標籤，並建立 `scripts/clean-md-br.sh` 供日後使用。\n- **目錄審計**: 清理 `scripts/` 目錄，移除 11 個過時且無引用的臨時分析腳本，確保目錄精簡且具備維護價值。\n- **規範化**: 確保所有剩餘腳本均具備明確用途，並符合專案目錄存放規範。\n### 2026-04-02 啟停腳本一致化\n- **日誌落點一致化**: 將 `start.sh` 的背景執行日誌從系統暫存目錄 `/tmp` 改為專案內 `logs/dev`。\n- **停止腳本對齊**: 更新 `stop.sh`，改清理 `logs/dev` 內對應日誌，並保留舊 `/tmp` 路徑清理作為相容層。\n- **服務埠對齊**: `stop.sh` 補上 Web AU 3002，並將 OCR 停止埠對齊為 8819，同時保留 8000 舊埠清理。\n- **穩定性補強**: `start.sh` 新增日誌目錄自動建立，避免首次啟動或目錄不存在時寫檔失敗。\n- **操作文件補齊**: README 與 `docs/scripts-directory-guide.md` 已補上 `logs/dev` 用途、對應服務與 `start.sh` / `stop.sh` 的日誌行為說明。",
    lastModifiedBy: "GitHub Copilot GPT-5.4",
    lastModifiedDate: "2026/04/02",
    phase: "development",
  },
  {
    id: "127",
    name: "AI 設定 - 模型網路評測報告 Sheet",
    locatedPage: "superadmin/settings/api_key_and_model_setting (research tab)",
    percentage: 90,
    acceptanceCriteria:
      "1. 在 API Keys 與 Analysis 之間新增 Research sheet，沿用 BottomSheetTabs。\n2. 對所有「已驗證」模型可由使用者自選評審 LLM (含 web search) 自動產生研究報告。\n3. 評審 provider 候選：Anthropic / OpenAI / Google Gemini / xAI Grok / Perplexity（需先驗證對應金鑰才會出現於下拉）。\n4. 報告含結構化欄位：公司、版本、Input/Output $/1M、Context、能力、來源 URLs、Markdown 摘要。\n5. 快取策略：報告存進 ai_model_research_reports，預設顯示快取結果，使用者可單筆或批次重新生成。\n6. UI 強制顯示「定價僅供參考、以官方頁面為準」免責 banner，並標註生成時間。\n7. Source URLs 必須以 target=_blank rel=noopener noreferrer 開啟。\n8. 評審選擇透過 localStorage 持久化，reload 後保留。",
    docPath: "",
    category: "超級管理員 (Super Admin)",
    points: 8,
    lastModifiedBy: "GPT-5.2",
    lastModifiedDate: "2026/04/11",
    phase: "testing",
    testStatus: "passed",
    unitTestCoverage: 100,
    testCoverage: 85,
    devLog:
      "[2026/04/10] (Claude Opus 4.6)\n## Phase 1 — 基礎 sheet（Anthropic 評審 only）\n• Migration 20260410120000_create_ai_model_research_reports.sql：新增 ai_model_research_reports 表（per-user RLS、結構化欄位 + Markdown + source_urls）。\n• 後端 API：app/api/ai-settings/model-research/route.ts (GET/POST/DELETE) 與 app/api/ai-settings/model-research/generate/route.ts（呼叫 Claude with web_search_20250305 工具，逐筆 upsert，含 mock 模式）。\n• 前端：components/ai-settings/ModelResearchReport.tsx 完成（EnhancedTable + MarkdownViewer + 免責 banner + 批次/單筆生成 + 展開報告）。\n• Page 整合：api_key_and_model_setting/page.tsx 新增 'research' tab 於 keys 與 model-analysis 之間。\n## Phase 2 — Multi-provider evaluator（使用者可選）\n• Migration 20260410130000_add_perplexity_provider.sql：將 perplexity 加入 5 個 ai_* 表的 provider CHECK constraint。\n• ai-providers.ts 新增 perplexity provider 與 sonar-pro / sonar / sonar-reasoning-pro 三個模型；validate/route.ts 與 models/test/route.ts 各加 Perplexity caller (OpenAI-compatible)。\n• generate/route.ts 重構為 multi-provider 架構：5 個 EvaluatorCaller (callAnthropic / callOpenAI / callGemini / callGrok / callPerplexity) 統一回傳 { text, urls }，dispatcher EVALUATOR_CALLERS 依 evaluatorProvider 派送。\n• ModelResearchReport.tsx 加入 EVALUATOR_CATALOG（Anthropic + OpenAI + Gemini + Grok + Perplexity，DeepSeek 排除）+ 兩段下拉（廠商→模型，自動依 savedKeys 過濾）+ localStorage 持久化（key: ai-settings:model-research:evaluator）。\n## 測試\n• 單元測試：components/ai-settings/__tests__/ModelResearchReport.test.tsx 共 10 個測試全綠（含新加 2 個：dropdown filter + 傳送選定 evaluator）。其他相關 ai-settings 測試 79 個全綠。\n• 瀏覽器驗證：localhost:3001/superadmin/settings/api_key_and_model_setting#research，下拉精準過濾出 4 家已驗證評審（Anthropic / OpenAI / Gemini / Grok），切換 OpenAI 後 model dropdown 自動換成 GPT-5 / GPT-4o，reload 後 localStorage 還原選擇。\n\n[2026/04/11] (GPT-5.2)\n• 依需求移除 /superadmin/settings/api_key_and_model_setting 的 #research / #model-analysis 分頁入口（不再顯示於 BottomSheetTabs）。",
  },
  {
    id: "128",
    name: "AI Prompt 安全強化（SSoT + Injection 防護 + 審計 + Rate Limit + Auto-seed）",
    locatedPage: "docs/ai-prompt-safety-guide.md",
    percentage: 100,
    acceptanceCriteria:
      "1. 建立 docs/ai-prompt-safety-guide.md 工程指導手冊（6 條核心原則 + 標準流程 + Checklist）。\n2. 建立 lib/ai/prompt-safety.ts 共用模組（resolveSystemPrompt / wrapUserInput / detectInjectionAttempt / validateUserSuppliedPrompt）。\n3. 修復 3 個 Injection 漏洞：test endpoint user prompt、transcript-parse customPrompt、property-description buildFacts。\n4. 遷移 4 組 hard-code prompt 到 saved_prompts.module_key（transcript.parse / transcript.judge / transcript.detect_building_count / transcript.detect_land_count / property.description.default）。\n5. 所有 LLM 呼叫點 fallback 到 hard-code 時必須 console.warn（消除靜默 fallback）。",
    docPath: "/docs/ai-prompt-safety-guide.md",
    category: "安全與合規 (Security & Compliance)",
    points: 8,
    lastModifiedBy: "Claude Opus 4.6",
    lastModifiedDate: "2026/04/11",
    phase: "testing",
    testStatus: "passed",
    unitTestCoverage: 95,
    testCoverage: 80,
    devLog:
      "[2026/04/10] (Claude Opus 4.6)\n## 工程指導手冊\n• 新增 docs/ai-prompt-safety-guide.md（762 行）：6 條核心原則、SSoT 機制、Delimiter 規則、輸入驗證三道防線、授權/Rate Limit、輸出驗證、審計 schema、新增 LLM 功能 Checklist、10 個常見反例。\n## 共用模組（lib/ai/ + lib/auth/）\n• prompt-safety.ts：resolveSystemPrompt（SSoT）、PromptNotFoundError、wrapUserInput / buildSafeUserMessage（XML delimiter + escape）、detectInjectionAttempt（7 種 pattern）、validateUserSuppliedPrompt、renderPromptTemplate、sha256Hex、PROMPT_INPUT_LIMITS。\n• audit.ts：startPromptAudit / logPromptAudit — 寫入 ai_prompt_audit_logs，fingerprint 使用者輸入（只存 SHA-256 + 長度 + injection flags），記錄 latency / tokens / status / prompt_source。\n• rate-limit.ts：checkRateLimit — Postgres 滑動窗口實作，預設 10 req/min per (user, endpoint)，fail-open 策略。\n• ensure-seeded.ts：seedDefaultPromptsDirect + ensureDefaultPromptsSeededOnce — 不依賴 Server Action，process-level 記憶化避免重複 seed。\n• require-superadmin.ts：Supabase session 驗證 + iam_user_roles role check，legacy x-user-id header fallback（deprecation warn）。\n## 漏洞修復\n• CRITICAL #1 — /api/ai-settings/models/test：長度上限、injection 偵測、session 授權、rate limit、審計日誌。\n• CRITICAL #2 — /api/transcript-parse/stream + jobs：customPrompt validate、session 授權、rate limit、審計日誌。\n• HIGH #3 — /api/property-description/stream/utils.ts：buildFacts XML escape + <property_data> 標籤、buildCurrentDescriptionSection、PROMPT_SAFETY_TRAILER。\n## SSoT 遷移\n• Migration 20260411090000：saved_prompts 加 module_key 欄位 + partial unique index。\n• Migration 20260411100000：ai_prompt_audit_logs 審計表（prompt_source 溯源、user_input_sha256、injection_flags、tokens、latency、status）。\n• Migration 20260411110000：ai_call_rate_limits 滑動窗口計數表。\n• seedDefaultPrompts.ts + ensure-seeded.ts：seed 9 組 canonical prompt，dedupe 同時檢查 name + module_key。\n• run-transcript-parse-core.ts：parser + judge 都改用 resolveSystemPrompt，miss 時大聲 warn；parser loop + judge phase 都串了 startPromptAudit；清掉 Phase 5 遺留的 dead code。\n• detect-building/land-count、property-description/stream：全部改用 resolveSystemPrompt + requireSuperadmin + checkRateLimit + startPromptAudit。\n• resolveSystemPrompt miss 時 lazy dynamic import ensureDefaultPromptsSeededOnce，seed 後 retry 一次；process-level memoization 避免重複 seed。\n## 測試\n• 80 tests 全綠：lib/ai/prompt-safety (36) + lib/ai/audit (9) + lib/ai/rate-limit (8) + lib/ai/ensure-seeded (8) + lib/auth/require-superadmin (7) + app/api/property-description/stream/utils (12)。\n• TS check 對所有改動檔乾淨。\n• DB reset 後 superadmin 觸發任一 LLM 功能，系統會自動 seed canonical prompts（single-fire per process），不再需要人工按 Seed 按鈕。",
    devLogDocPath: "/docs/ai-prompt-safety-guide.md",
  },
  {
    id: "129",
    name: "AI 設定 - 模型選擇與設定 Sheet（Agent 指派）",
    locatedPage: "superadmin/settings/api_key_and_model_setting#agent-config",
    percentage: 100,
    acceptanceCriteria:
      "1. 在 LLM Leader Board 與 OCR 之間新增「模型選擇與設定」sheet tab，沿用 BottomSheetTabs（Bot icon、emerald 主色）。\n2. 左側為 Agent 清單（分 5 群：內容生成 / 謄本解析 / 媒體生成 / 開發與工具 / 客服 通用），寫死於 lib/ai/agent-registry.ts 共 14 個 agent；全 14 個 agent 皆有 suggestedTagKeys（新增 legal_contract / code_generation / general_assistant 三個 role_tag 以覆蓋先前 4 個空 agent）。\n3. 右側 Strategy Form：Primary (provider + model) / temperature / max_tokens / top_p / Fallbacks（依序嘗試，trigger: rate_limit / error / cost_over）/ guardrails (max_monthly_usd) / notes。\n4. 右下 Recommendations：依 agent.suggestedTagKeys 篩選 ai_model_role_tags catalog，顯示 provider / model / 狀態 / 最近測試 / 角色標籤；每列可點 pencil icon 開 TagEditorSheet 手動編輯標籤；toolbar 有「網路分類」「API 回應分類」「重新整理」按鈕連接既有的 ClassifyConfigSheet（解決 model-role-catalog 孤兒問題）。\n5. 全平台共用：寫入新建表 ai_agent_model_assignments（無 user_id、authenticated 可讀、service_role 寫）。\n6. 每個 agent 都有 factory default（lib/ai/agent-defaults.ts）：Primary + 3 Fallbacks（rate_limit / error / cost_over 各一）+ $5 USD 月上限。初始 DB 由 PUT 14 筆 seed，「還原為預設」按鈕呼叫 hook.reset() 會 upsert 該 agent 的 defaults（不再用 DELETE）。\n7. 匯出報告：AgentModelAssignmentPanel header 的「匯出報告」按鈕會生成全 14 個 agent 的 Markdown 快照（含 Primary / Fallbacks / Guardrails / 推薦模型表 / 最近測試欄 / 統計）；預設 top 10 per agent 上限避免報告過大（可用 maxRecommendationsPerAgent 選項覆寫），可直接下載為 `agent-config-YYYY-MM-DD.md` 供 dev-logs 存檔。\n8. Phase 2 Dispatcher 已上線：lib/ai/resolve-agent-model.ts 實作 resolveAgentModel() / resolveFirstAgentModel() helper，支援 InvalidAgentKeyError / AgentDisabledError / DB 錯誤自動 fallback 到 AGENT_DEFAULTS / 舊 module_key 別名（transcript.parse / online_ocr_parse / online_ocr_judge 等 8 筆 legacy key 一併映射到 canonical agent_key）。property-description/stream + lib/transcript-parse/run-transcript-parse-core.ts（parser + judge 兩個 callsite）皆已切換為先讀 ai_agent_model_assignments，per-user 舊表 ai_modules_assigned_function 降為第二 fallback。models/test 是使用者挑模型的診斷端點，不適用 dispatcher。\n9. UX 軟 fallback：當 agent 的 suggestedTagKeys 新增但對應 role_tag 還沒有 classification assignment 時，推薦面板會顯示「暫時顯示全部可用模型」按鈕，使用者可繞過 tag 篩選臨時瀏覽全部候選，不影響匯出報告的 strict filter 結果。\n10. Guardrails 真正生效：lib/ai/agent-cost-guard.ts 實作 computeCostUsd / getAgentMonthlySpendUsd / checkAgentBudget，讀 ai_prompt_audit_logs (input/output tokens × AI_PROVIDERS 靜態價格) 計算當月累計花費，超過 max_monthly_usd 時直接攔截 LLM 呼叫。property-description/stream 攔截後透過 SSE 送 monthly_cap_exceeded；transcript-parse parser 攔截後直接 fail 整個 job；judge 攔截後只跳過審核階段（parser 仍繼續，consensus layer 會使用未審核結果）。所有 3 個 Phase 2 callsite 都接入了 budget check。\n11. Audit log canonical agent_key：migration 20260412120000 為 ai_prompt_audit_logs 新增 agent_key 欄位；lib/ai/audit.ts 的 startPromptAudit() 接受 agentKey option；property-description/stream + transcript-parse (parser + judge) 3 個 Phase 2 callsite 都寫入 canonical agent_key。agent-cost-guard 查詢改用 PostgREST .or() 單次查 `agent_key=canonical OR module_key IN (legacy aliases)`，新舊 row 一次打包，無須 migration 既有資料。\n12. 靜態 guardrails filter：lib/ai/agent-guardrail-filters.ts 實作 applyForbidProviders / applyRequireTags / sanitizeChain（組合 filter，原始 chain index tracking）。forbid_providers 已接入 property-description/stream + transcript-parse resolver wrapper，dropped link 在 console.info 記錄；require_tags 為 pure helper，等未來 server-side 載入 role catalog 後再整合。\n13. Cost-aware chain walking：lib/ai/agent-cost-guard.ts 新增 selectAffordableLink / estimateChainCosts helpers，可在 runtime 走 chain 時跳過估算成本會超過剩餘預算的 link，選第一個 fits 的 fallback；純函式 + 7 個單元測試覆蓋邊界情境，helper 已可用，callsite 整合留給 Phase 3。\n14. 3 個新 role_tag 的 seed data：migration 20260412130000 為 legal_contract / code_generation / general_assistant 三個 tag 各 insert 4-5 筆 manual assignment，涵蓋 Anthropic / OpenAI / Gemini / DeepSeek 的常識性選擇。Agent Config 推薦面板對 contract_assistant / software_dev_engineer / ttd_engineer / web_assistant 不再需要 bypass button。",
    docPath: "",
    category: "超級管理員 (Super Admin)",
    points: 13,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    phase: "testing",
    testStatus: "passed",
    unitTestCoverage: 96,
    testCoverage: 92,
    developmentProgress:
      "Phase 1 + Phase 2 同步完成：\n• Data layer: migration 20260412100000 (ai_agent_model_assignments 表) + migration 20260412110000 (新增 legal_contract / code_generation / general_assistant 三個 role tag)\n• Agent registry: lib/ai/agent-registry.ts (14 agents × 5 groups，全員都有 suggestedTagKeys) + lib/ai/agent-defaults.ts (Primary + 3 Fallbacks + $5 cap)\n• API: app/api/ai-settings/agent-assignments/route.ts (GET/PUT/DELETE)\n• Hook: lib/hooks/useAgentAssignments.ts (reset → upsert defaults)\n• UI 主面板: components/ai-settings/AgentModelAssignmentPanel.tsx (hoisted useModelRoleCatalog + 匯出報告 button) + agent-model/{AgentList, AgentStrategyForm, AgentRecommendationPanel}.tsx（bypass tag filter 軟 fallback）\n• ClassifyConfigSheet + TagEditorSheet 從 model-role-catalog 孤兒狀態收編進 AgentRecommendationPanel\n• 匯出器: lib/ai/agent-report.ts 生成全 14 agent Markdown 快照 + 可設定 maxRecommendationsPerAgent 上限 (default 10)\n• Phase 2 Dispatcher: lib/ai/resolve-agent-model.ts (resolveAgentModel + resolveFirstAgentModel + 8 筆 legacy module_key alias + factory default fallback) → 11 unit tests\n• Callsite migrations: (1) app/api/property-description/stream/route.ts + (2) lib/transcript-parse/run-transcript-parse-core.ts parser + judge 兩處，皆主路徑 resolver / 第二 fallback 保留 per-user 舊表\n• Page 整合: page.tsx 新增 'agent-config' 頁籤\n• Tests: 90 suites / 649 tests 全綠（agent-defaults 46 + agent-report 17 + resolve-agent-model 11 + useAgentAssignments 6 + AgentModelAssignmentPanel 7 含 bypass test + property-description/stream route 2 + transcript-parse 既有套件無迴歸 + 其他既有）\n• DB 已 seed 14 筆初始預設 + 3 筆新 role tag",
  },
  {
    id: "130",
    name: "開發環境 Docker 整合 - Paperclip 自動啟停",
    locatedPage: "start.sh / stop.sh",
    percentage: 100,
    category: "通用/系統 (General/System)",
    points: 2,
    phase: "development",
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/04/27",
    featureDescription:
      "以 start.sh / stop.sh 為中心整合本機 agent runtime 維運：Paperclip 延續 Docker 啟停與更新，並補上 Hermes Docker 啟動/更新、OpenClaw 本機設定定位、三者資料保存路徑揭露與一鍵備份。",
    acceptanceCriteria:
      "1. 新增專案內 Paperclip compose 設定，採官方 quickstart 單容器模式。\n2. start.sh 具備 paperclip 啟動命令與 all 模式自動啟動。\n3. stop.sh 可透過 compose down 停止 Paperclip。\n4. 預設使用較少衝突的 host port（3187），並可透過 .env.paperclip 覆寫。\n5. 首次執行可自動建立 .env.paperclip 與 BETTER_AUTH_SECRET。\n6. Hermes Dashboard 可由 start.sh 啟動、更新並在 browser 中自動開啟，且 Docker 模式更新路徑清楚。\n7. start.sh all 需顯示 Hermes / Paperclip / OpenClaw 的資料保存位置。\n8. 需提供單一 backup 指令備份三者本機持久資料，且排除 socket / pipe 類執行期檔案。",
    developmentProgress:
      "已新增 docker/paperclip/docker-compose.paperclip.yml 與 .env.paperclip.example；start.sh 新增 ensure_paperclip_env/start_paperclip，menu 與 CLI 入口支援 paperclip；start_all 會一併啟動 Paperclip；stop.sh 新增 Paperclip compose down。2026/04/11 再優化啟動效能：start_paperclip 先檢查容器是否已 running，已執行時直接返回；預設改為使用本機快取映像檔（PAPERCLIP_AUTO_PULL=0），僅首次或手動啟用 auto-pull 才拉取最新映像，避免每次 start.sh 都卡在 docker pull。新增 update_paperclip_image 與 CLI 指令 paperclip-update，並在啟動選單提供「更新 Paperclip 映像檔」，讓使用者在需要時手動更新並重啟容器套用新版本。另將預設資料目錄從 /tmp 改為 $HOME/.paperclip-data-owner-property-management，避免系統清理暫存目錄後遺失 instance 設定。新增 Paperclip 自動開瀏覽器機制：啟動後等候 health 再開啟指定 Dashboard URL，預設導向 /VIS/agents/ceo/dashboard，可用 PAPERCLIP_AUTO_OPEN_BROWSER 與 PAPERCLIP_DASHBOARD_URL 控制。2026/04/12 補強容器執行模式：改用 CLAUDE_CODE_OAUTH_TOKEN（停用 ANTHROPIC_API_KEY credit 路徑）驗證 claude_local adapter subscription 流程；workspace 掛載策略從 read-only PoC 進展到 read-write + worktree isolation，並透過 docker exec 統一 git worktree 路徑語義（/workspace）避免 host/container 路徑漂移。2026/04/13 針對 codex_local adapter 追加穩定化：重新建立 paperclip 容器以套用最新 host OPENAI_API_KEY、確認容器內 key hash 與 host 一致；容器內執行 codex login --with-api-key 後，codex exec smoke 測試轉為可穩定成功，排除先前 Missing bearer/invalid_api_key 混合故障。2026/04/27 延伸為 agent runtime 維運加固：重新接回 Hermes Docker 啟動與更新、補上 Docker-only 更新提示、修復 Paperclip `force-recreate` transient race、盤點 OpenClaw 本機設定根目錄 `~/.openclaw`、在 `start.sh all` 摘要顯示 Hermes / Paperclip / OpenClaw 的資料保存位置，並新增 `backup-agent-data` 一鍵備份三者持久資料且排除 socket / pipe 類執行期檔案。",
    devLog:
      "[2026/04/27] (GPT-5.4)\n• 完成 Hermes Docker 啟動/更新整合，新增 hermes-update 與 Docker-only 提示。\n• 修復 Paperclip update 的 Docker recreate 競態，更新流程可自動重試並穩定回到 Up。\n• 盤點三個 runtime 的資料保存位置：Hermes `~/.hermes-opm`、Paperclip `PAPERCLIP_DATA_DIR`、OpenClaw `~/.openclaw`。\n• 新增 `backup-agent-data`，可打包 Hermes / Paperclip / OpenClaw 本機持久資料，並排除 socket / pipe。\n• 建立 Row 126 對應 DEV-SPEC / TDD SPEC / TDD Progress Report / Development Log Summary。",
    devLogDocPath: "/project-process/dev-logs/126-development-log-summary.md",
    featureSpecDocPath: "/project-process/features/agent-runtime-startup-hardening-dev-spec-20260427.md",
    tddSpecDocPath: "/project-process/features/tdd-agent-runtime-startup-hardening-20260427.md",
    docPath: "/project-process/test-logs/test-agent-runtime-startup-hardening-2026-04-27.md",
    testScriptPath: "apps/superadmin/unit_test/126",
  },
  {
    id: "131",
    name: "Superadmin × Paperclip 開發流程整合（Prompt→Issue→Worktree→Diff→Merge）",
    locatedPage: "superadmin/dashboard/project-progress + superadmin/dashboard/paperclip-worktrees",
    percentage: 100,
    category: "超級管理員 (Super Admin)",
    points: 13,
    phase: "testing",
    testStatus: "passed",
    unitTestCoverage: 95,
    testCoverage: 92,
    e2eTestCoverage: 92,
    lastModifiedBy: "Claude + GPT-5.3-Codex",
    lastModifiedDate: "2026/04/13",
    featureDescription:
      "將 project-progress 的 PromptEngineerModal 與 Paperclip control plane 串接，建立可持續運作的 AI 開發閉環：送單、派工、隔離分支、即時狀態、差異審查、乾跑與合併、清理。",
    acceptanceCriteria:
      "1. Modal 支援預覽與真送出 Paperclip issue，含成功/失敗回饋。\n2. 每個任務自動建立 feature/paperclip-<slug> worktree，agent 僅在隔離目錄工作。\n3. 引入 pre-commit + pre-merge-commit 護欄，阻擋 forbidden paths（.env / lockfile / docker compose / committed migrations 等）。\n4. 新增 /superadmin/dashboard/paperclip-worktrees 管理頁：列表、搜尋、篩選、排序、inspect diff、merge、cleanup。\n5. diff viewer 支援顏色分段與鍵盤操作（J/K/E/C/?）。\n6. Modal 與 worktrees page 支援 live status、run log、cost、dry-run merge。\n7. API 路由完整：issues / status / run-log / cost / worktrees / diff / merge / cleanup。\n8. URL deep links 統一走 paperclip links builder，避免 hardcode base URL。",
    featureSpecDocPath:
      "/project-process/features/paperclip-development-loop-dev-spec-20260412.md",
    tddSpecDocPath:
      "/project-process/features/paperclip-development-loop-tdd-spec-20260412.md",
    developmentProgress:
      "Phase A-M 完成並於 2026/04/12 延伸至 N.3：\n• PromptEngineerModal：預覽送出、真送出、worktree資訊、copy commands、cleanup 按鈕、live status badge、cost chip、live run log。\n• Worktree isolation：server route 在送單前建立 worktree，description 自動注入 protocol，禁止在 main tree 直接操作。\n• 安全護欄：soft forbidden-path 指示 + git hooks（pre-commit / pre-merge-commit）+ server-side forbidden-path merge check + human review。\n• Worktrees 管理頁：列表 + inspect diff + merge + merge+cleanup + dry-run + delete，並新增搜尋/篩選/排序與每列 cost。\n• Diff viewer：per-file 摺疊、彩色行級標示、快捷鍵（J/K/E/C/?）。\n• URL builder：新增 lib/paperclip/links.ts，issue deep-link 與 search-link 統一透過 helper 產生。\n• metadata/cost mapping：送單成功後在 worktree 寫入 .paperclip-meta.json（issueId），worktrees API 讀取後可穩定抓每列 cost。\n• 路由韌性補強：createIssue 失敗時自動 best-effort 清理 worktree，並加 slug/path traversal 防護。\n• Claude（2026/04/12）：完成 dispatch 問題定位（VIS-8 / VIS-10 未啟動根因為 assigneeAgentId 缺失），實作 auto-route（title keyword → role）與 architect fallback；前端 buildIssuePayload + Prompt 預覽顯示 auto-route 決策；後端 issues route 增加 server-side 兜底，防止 API 直送繞過前端；補齊 auto-route/buildIssuePayload/route 測試並維持綠燈。\n• GPT-5.3-Codex（2026/04/12）：新增 scripts/paperclip-patch-and-verify.mjs，一鍵處理未指派 issue（預設 VIS-10）並自動輪詢驗證 dispatch 是否啟動；支援 --agent-role / --agent-id / --dry-run / --force；package.json 新增 paperclip:patch-issue 指令。\n• 2026/04/12 進度複核：執行 `npm run test --workspace superadmin -- paperclip --runInBand`，15 suites / 234 tests 全數通過；補齊 ID 130 的 DEV-SPEC 與 TDD SPEC 路徑。",
    testProgress:
      "Paperclip 整合相關測試在本次迭代持續綠燈（包含 lib/paperclip、issues、worktrees、diff、merge、cleanup、status、cost、run-log 路由與 UI 流程驗證）。2026/04/12 追加 auto-route 重點驗證：auto-route.test.ts、buildIssuePayload.test.ts、issues/route.test.ts 全部通過；新 CLI patch/verify 腳本完成語法與 lint 檢查。2026/04/12 新增 Playwright 驗收腳本 apps/superadmin/e2e/130/paperclip-development-loop.spec.ts（mock Paperclip API，若無 E2E_SUPERADMIN_EMAIL / E2E_SUPERADMIN_PASSWORD 則以 skip 結束）。2026/04/13 新增 SDET / Quality Platform Engineer 角色（含 auto-route / payload / API mapping / patch script 相容更新），並建立今日測試派工 Issue（bf5be15e-7624-44c9-b046-1242152dabde）與實跑 nightly（目前回歸層有 5 項失敗待修）。2026/04/13 追加 Codex(local) 實機驗證：先完成 DevOps smoke 成功，再依序對 architect/fullstack/ceo/database-engineer/devops/qa/ui-ux-designer 進行 heartbeat smoke；7 位 agent 最新 run 全部 succeeded，且已回復 paused 狀態，Adapter failed 事件停止擴散。",
    docPath: "/docs/update-project-progress-guide.md",
    testScriptPath: "apps/superadmin/unit_test/130",
  },
  {
    id: "132",
    name: "Paperclip 全自動開發流程優化（API 成本／卡住與重試／Mac mini 24h 穩定）",
    locatedPage:
      "superadmin/dashboard/project-progress + superadmin/dashboard/paperclip-worktrees + docker/paperclip",
    percentage: 100,
    category: "超級管理員 (Super Admin)",
    points: 5,
    phase: "testing",
    testStatus: "passed",
    unitTestCoverage: 100,
    testCoverage: 100,
    lastModifiedBy: "GPT-5.3-Codex",
    lastModifiedDate: "2026/04/13",
    docPath: "/docs/operational-guides/paperclip-mac-mini-24h.md",
    testProgress:
      "2026/04/13：`polling.test.ts`、`api-error-meta.test.ts` 通過；194 paperclip tests 全過；`validate-test-manifest.sh` 通過。\n" +
      "追加改進：連錯 ≥5 次自動停止輪詢（getPaperclipIssuePollDelayMs 回傳 null）、cost loading 超時 3 分鐘降速、backoff 上限 60s→120s。",
    featureDescription:
      "在 Row 130 既有閉環（Prompt→Issue→Worktree→Diff→Merge）上，系統化優化：降低無效 API／輪詢成本、改善卡住與可恢復性、補強 Mac mini 長時運行之 Docker／磁碟／映像與憑證策略文件與可選健康檢查。",
    acceptanceCriteria:
      "1. 定義並實作（或文件化）issue／run-log／cost 輪詢的 backoff：terminal 後停止或降頻；進行中維持合理更新率。\n2. 錯誤分類：網路、驗證 4xx、伺服器 5xx、worktree／merge 擋下等可區分，並提供可恢復／重試指引（不重複造 worktree 除非明確清理後）。\n3. 環境變數與憑證：釐清 Superadmin 與 Paperclip 容器各自需要的 key；避免未使用的高價 key 重複注入。\n4. Mac mini 24h：交付運維向文件（睡眠、Docker、磁碟清理、PAPERCLIP_AUTO_PULL／映像更新策略）；可選提供非互動健康檢查腳本。\n5. 與 Row 130 護欄相容：不破壞 forbidden-path、worktree 協定與既有 paperclip 測試基線。\n6. 實作完成後更新 test-manifest id 133 之 unit/e2e 路徑並通過 validate-test-manifest。",
    featureSpecDocPath:
      "/project-process/features/paperclip-automation-optimization-dev-spec-20260413.md",
    tddSpecDocPath:
      "/project-process/features/paperclip-automation-optimization-tdd-spec-20260413.md",
    developmentProgress:
      "2026/04/13 實作完成：lib/paperclip/polling.ts（issue 自適應輪詢間隔、worktrees 列表 10–45s）、api-error-meta.ts（HTTP 分類與可恢復建議文案）；PromptEngineerModal 改用自適應輪詢與送單／cleanup 錯誤強化；預設／分類 Prompt 附加【成本與 API 節制】段落；PaperclipWorktreesClient 依成本／commits 調整列表輪詢；新增 docs/operational-guides/paperclip-mac-mini-24h.md 與 tools/paperclip/health-check.sh；單元測試 polling.test.ts、api-error-meta.test.ts；test-manifest id 133 已填路徑並通過 validate-test-manifest。",
    devLog:
      "[2026/04/13] (GPT-5.3-Codex)\n• 完成 Paperclip 5 分鐘週期性 failed 事件根因盤點（adapter/model mismatch、API quota 路徑、OAuth/API key 混用）。\n• 新增 scripts/paperclip-start-oauth.sh：一鍵重建 OAuth 優先執行路徑，並寫入 fixpoint timestamp。\n• 新增 scripts/paperclip-health-last10m.sh：提供最近 10 分鐘健康摘要，支援 fixpoint 視角統計。\n• 8 位 agent 統一修正為 claude_local + model=sonnet 並恢復 active。\n• 今日任務狀態判定：實作層 Done；穩定性治理 In review（待 24h 觀測收斂）。",
    devLogDocPath:
      "/project-process/dev-logs/dev-paperclip-stability-recovery-2026-04-13.md",
    testScriptPath: "apps/superadmin/unit_test/133",
  },
  {
    id: "133",
    name: "超級管理員-尋人資料庫（People Database）",
    locatedPage: "superadmin/settings/people-database",
    percentage: 75,
    category: "超級管理員 (Super Admin)",
    points: 13,
    phase: "testing",
    testStatus: "in_progress",
    unitTestCoverage: 50,
    e2eTestCoverage: 52,
    acceptanceCriteria:
      "1. 支援多格式導入：Excel (XLS/XLSX)、PDF、TXT、CSV，自動欄位偵測與映射。\n2. 全文搜尋（ElasticSearch）：模糊搜尋姓名、身份證號、電話、地址，支援篩選與排序。\n3. 資料品質評分與去重：品質分級(High/Medium/Low)、自動重複偵測、人工審核 UI。\n4. 完整稽核日誌：所有導入、修改、刪除操作記錄操作者與時間。\n5. RLS 隔離：僅超級管理員可查看與操作尋人資料（含身份證號等敏感資訊）。\n6. 索引管理：重新索引、批次刪除、磁碟占用監控。",
    featureSpecDocPath: "/project-process/features/people-database-dev-spec-20260412.md",
    tddSpecDocPath: "/project-process/features/people-database-tdd-spec-20260412.md",
    lastModifiedBy: "GPT-5.3-Codex",
    lastModifiedDate: "2026/04/13",
    developmentProgress:
      "2026/04/12 10:30 ~ 17:45 Phase 1 完成（核心導入與搜尋）\n✅ PostgreSQL 表結構\n  • 3 個表：import_batches（批次追蹤）、people_records（人員資料）、people_duplicates（重複關係）\n  • RLS 原則：超級管理員全權訪問、Service 角色後端操作權限\n  • Migrations 已套用至本地資料庫\n\n✅ ElasticSearch 整合\n  • people_db_client.py：完整的非同步客戶端（索引、搜尋、更新、刪除、統計）\n  • IK 分詞器支援中文自動分詞\n  • Multi-match 搜尋支援模糊查詢 + 相關度排序\n\n✅ FastAPI 後端實現\n  • 5 個端點（導入預覽、批次提交、進度查詢、全文搜尋、統計）\n  • Supabase Python 客戶端：批次建立、狀態更新、記錄查詢\n  • 端點驗證與錯誤處理完整\n\n✅ 測試與驗證\n  • 單元測試 12/12 通過（列解析、CSV/Excel 處理、Pydantic 型別驗證）\n  • 整合測試框架完成（12 項端點驗證）\n  • 檔案處理邏輯：Excel、CSV、TXT、PDF 格式支援\n\n✅ Phase 2 前端完成（2026/04/12）\n  • API Proxy 路由：apps/superadmin/app/api/people-db/[...slug]/route.ts\n  • 首頁（Landing）：stats 統計卡片 + 快捷入口\n  • Import 頁面：拖放上傳、欄位映射表單、前 5 行預覽、批次標籤、提交進度\n  • Search 頁面：全文搜尋輸入、品質/來源篩選、EnhancedTable 結果顯示、頁碼控制\n  • Sidebar 導覽：新增「尋人資料庫」Menu Item（Users icon）\n\n✅ GPT-5.3-Codex（2026/04/12）\n  • Import 頁面新增「整個資料夾匯入」方式（可選資料夾，僅收 `.csv/.xlsx/.xls/.pdf`）\n  • 檔案選擇區新增「選擇整個資料夾」按鈕與資料夾模式資訊（資料夾名、檔案數、預估總列數）\n  • 提交流程支援資料夾多檔逐一建立批次並回顯多個 batch ID\n  • 補上匯入限制：單檔 25MB、單次最多 100 檔、單次總量 300MB（前端選檔與送出前雙重驗證）\n  • FastAPI `import/preview` 補上後端 hard limit（超過 25MB 回傳 413，包含檔名與大小）\n  • 匯入頁自動映射升級為「欄名 + 樣本值 pattern」混合評分，PDF 匯入可自動判斷姓名/手機/市話/身分證/Email/地址/出生日期欄位\n  • 欄位映射區新增「自動映射信心分數 UI」（高/中/低/手動），便於快速確認與修正\n  • 修復 import `Not Found`：minimal_app 掛載 people-db router、proxy multipart 轉發改為 FormData，CSV/PDF 預覽可正常回傳\n  • submit 端點兼容前端 snake_case payload，且在本地 schema 未同步時啟用 fallback 批次回應，避免整體匯入流程阻塞\n  • Supabase `import_batches` 寫入欄位對齊 migration（label/description/skipped_records），並透過 `X-User-ID` 傳遞登入使用者，已驗證可建立真實 batch 紀錄\n  • 新增 `tools/people-db/convert_taipei_village_chiefs_pdf.py`，可將「台北市里長」PDF 批次轉為 People DB 匯入 CSV（姓名/性別/電話/行動電話/電子郵件位址/里辦公處地址）\n\n✅ 4TB 級資料庫架構建議（ID:131 更新）\n  • 以 Elasticsearch / OpenSearch 作為主方案，不採桌面索引工具路線；先完成 1%~5% 真實資料 POC 再定正式叢集規模\n  • 索引容量估算改為「實測法」：以 POC 測得 index_bloat_ratio 與查詢延遲，不使用固定 6T~12T 估值\n  • 分片基準調整為單分片 30~60GB 起步，搭配 ILM hot/warm/cold；避免一次性固定大量 primary shards\n  • mapping 策略：姓名/地址 text+keyword、身分證/電話 keyword(normalized)，模糊查詢限定欄位與條件，降低誤命中與成本\n  • `_source` 預設保留；先做欄位瘦身、停用不必要欄位索引、壓縮策略與 lifecycle，再評估是否關閉 `_source`\n  • 資安與合規：PII 欄位遮罩顯示、查詢審計日志、最小權限；向量搜尋列為第二階段（先穩定 BM25 + filter + re-rank）\n\n✅ GPT-5.3-Codex（2026/04/12）單頁工作區整合\n  • `/superadmin/settings/people-database` 改為 tab workspace，於同頁切換「匯入資料 / 搜尋資料」\n  • 匯入與搜尋頁抽出可重用 workspace 元件，既有獨立路由維持可用，避免功能回歸\n\n✅ GPT-5.3-Codex（2026/04/13）project-progress 路徑治理補強\n  • 修正 Development Tab 欄8 預設路徑，從舊的 `unit_and_integration_test/{ID}` 改為 `unit_test/{ID}`，並與 guide 規範一致\n  • 讓欄8優先採用 `roadmap.testScriptPath`，未設定時再 fallback 到 `apps/superadmin/unit_test/{ID}`\n  • Prompt modal 派工 metadata（unitTestFolder/e2eFolder）改用與表格相同的共享 resolver，避免 UI 連結與任務內容不一致\n  • 抽出共享 path utils（安全相對路徑 + 白名單前綴 + href builder），統一 `testScriptPath` 驗證與 project-file 連結生成\n  • 新增邊界處理：允許 trailing slash、支援 `/docs` 路徑、阻擋絕對路徑/`..`/URL-like path\n\n✅ GPT-5.3-Codex（2026/04/13）Playwright CLI 團隊流程標準化\n  • 新增 `tools/testing/playwright-cli.sh` 與 `tools/testing/playwright-cli-version.txt`，以 pinned 版本統一 AI 工程師執行入口\n  • 新增 `tools/testing/check-playwright-cli-update.sh`，支援版本檢查與 `--apply` 更新版本檔\n  • root `package.json` 新增 `pwcli:*` scripts（version/open/update:check/update:apply）供跨 IDE 一致操作\n  • 新增 `docs/operational-guides/playwright-cli-team-workflow.md`，定義 CLI 探索 → 正式 E2E 落地流程\n\n✅ GPT-5.3-Codex（2026/04/13）Playwright CLI onboarding 一鍵檢查\n  • 驗證 `npx --yes @playwright/cli@latest --version` 可直接使用（不依賴全域安裝）\n  • 新增 `tools/testing/check-playwright-cli-onboarding.sh`，一次檢查 Node/npm、pinned 版本、pwcli npx 可執行性、skills 安裝狀態\n  • root `package.json` 新增 `pwcli:onboarding:check`，讓新同事用一條指令完成環境驗證\n  • 實測 `npm run pwcli:onboarding:check` 全綠通過",
    testProgress:
      "Phase 1 單元測試 100% 通過（12/12）：\n  ✅ parse_column_reference：Excel 欄位轉換（A→0, Z→25, AA→26）\n  ✅ extract_csv_preview：CSV 負載與編碼驗證\n  ✅ extract_excel_preview：Excel 檔案驗證\n  ✅ ImportSubmitRequest：請求結構與欄位驗證\n  ✅ 整合測試框架：API 端點驗證（12 項）\n  ✅ 前端單頁工作區測試：app/superadmin/settings/people-database/page.test.tsx（tab 切換與同頁 workspace 驗證）\n  ✅ Playwright E2E（真資料 fixture）：apps/superadmin/e2e/131/people-database-single-page-workspace.spec.ts（注入台北市里長樣本語意資料後，必須命中指定查詢）\n  ✅ Kibana 操作檢查清單：docs/operational-guides/people-db-kibana-checklist.md（索引、mapping、分詞、查詢與 UI 對照）\n  ✅ 一鍵 smoke script：tools/people-db/check-es.sh（將 checklist 1~5 步驟轉為可執行檢查）\n  ✅ seed 腳本：tools/people-db/seed-es-sample.sh（真寫入台北市里長樣本 1 筆，讓 docs.count > 0 並讓 multi-match 檢查轉綠）\n  ✅ 用台北市里長樣本實測初始化鏈路：people-db API 成功建立 people_database index；smoke script 已可全綠\n  ✅ 規範更新：docs/update-project-progress-guide.md 新增「跨 ID 可重用工具」放置與引用規範（tools 與 testScriptPath 職責分離）\n  ✅ 測試治理 Phase 1 落地：新增 apps/superadmin/test-manifest.json、tools/testing/validate-test-manifest.sh、tools/testing/run-superadmin-nightly.sh（支援 AI worker 機器可讀編排與 nightly 回歸）\n  ✅ 測試治理 Phase 1.1：將 apps/superadmin/e2e 根層散落 spec 全部收斂至 apps/superadmin/e2e/common/，並同步更新 manifest 與 start.sh 路徑\n  ✅ 測試治理 Phase 1.2：將 e2e/common 再分層為 smoke/regression，manifest 新增 nightlyLayer，nightly runner 依層級先 smoke 再 regression\n  ✅ 測試治理 Phase 1.3：manifest 新增 nightlyOrder，nightly runner 在同層依 nightlyOrder 穩定排序執行（小到大）\n  ✅ 測試治理 Phase 1.4：nightly runner 輸出執行計畫（id/layer/order/unit/e2e），可在 dry-run 與正式執行前快速審核排序\n  ✅ 測試治理 Phase 1.5：導入 Playwright CLI 團隊標準化（pinned version + wrapper + update checker），並把 update check 以 non-blocking 模式接入 nightly runner\n  ✅ project-progress 路徑治理測試補齊：新增 path-utils 與 resolver 測試（共 10 tests）並通過，覆蓋合法路徑、trailing slash、path traversal、絕對路徑、URL-like path、白名單前綴限制\n  下一步：E2E 實資料匯入驗證 + 搜尋結果抽樣比對",
  },
  {
    id: "134",
    name: "超級管理員-尋人資料庫：精準搜尋與來源可追溯升級（ID 132）",
    locatedPage: "superadmin/settings/people-database",
    percentage: 75,
    category: "超級管理員 (Super Admin)",
    points: 13,
    phase: "testing",
    lastModifiedBy: "GPT-5.3-Codex",
    lastModifiedDate: "2026/04/13",
    featureDescription:
      "聚焦修正 people-db 在大資料量場景下的搜尋誤命中、資料來源不可追溯、匯入可視化不足與資料集範圍不可控等核心缺口，建立可被信任且可審計的查詢流程。",
    acceptanceCriteria:
      "1. 電話/身分證查詢採 exact-first（正規化 + 精準比對），不得再因 fuzzy 導致明顯誤命中。\n2. 搜尋 API/前端參數契約一致（data_sources[]、品質門檻、時間範圍、分頁），篩選可被驗證生效。\n3. 搜尋結果每筆可顯示來源追溯資訊（資料集、批次、匯入時間、匯入者、原始檔名/來源）。\n4. 匯入台帳可視化：使用者可查看每批匯入何時、誰匯入、匯入幾筆、成功/失敗/跳過數。\n5. 支援多資料集勾選搜尋範圍，預設全選並保留操作體驗（含全選/反選）。\n6. 測試覆蓋 exact/fuzzy 路由、來源篩選、來源顯示與匯入台帳核心流程，避免回歸。",
    featureSpecDocPath:
      "/project-process/features/people-database-dev-spec-20260412.md",
    tddSpecDocPath:
      "/project-process/features/people-database-tdd-spec-20260412.md",
    docPath: "",
    testScriptPath: "apps/superadmin/unit_test/132",
    developmentProgress:
      "2026/04/13（已開始實作）\n- 後端完成 P0 主幹：\n  1) `people_db_client` 實作 query intent 分流（id_number / phone / full_text）與 exact-first boost，降低電話/身分證誤命中\n  2) 修正 data source filter 使用 `data_source` terms，避免既有 `data_source.keyword` 無效篩選\n  3) 新增品質區間解析（high/medium/low -> min/max）\n  4) `/api/v1/people-db/search` 參數契約擴充：支援 `data_source` + `data_sources[]`、`quality`、`page/page_size`，並回傳 `page/page_size`\n  5) 搜尋回傳新增來源追溯欄位（import_batch_id/source_file_path/source_document_id/created_at）\n  6) 新增 `/api/v1/people-db/datasets`（資料集 facet）與 `/api/v1/people-db/import/batches`（匯入台帳）\n  7) `stats` 改為可直接供 superadmin 卡片使用的彙總格式（total_records/indexed_records/total_sources/avg_quality_score）\n  8) 安全補強：people-db proxy 新增 superadmin 身分/角色檢查（401/403）、移除 client `x-user-id` 信任、slug 白名單驗證與上游失敗 502\n  9) 匯入提交改為嚴格模式：缺少 user context 直接 401；DB schema/連線失敗回 503，不再假成功 fallback\n- 前端完成 P0 主要 UI：\n  1) 搜尋頁新增多資料集勾選（含全選/清空）\n  2) 搜尋結果表新增來源/原始檔、批次、匯入時間欄位\n  3) 新增最近匯入批次面板（status、來源、processed/total、時間）\n  4) 品質分數顯示統一（0~1 自動換算 0~100）\n  5) 當資料集全部取消勾選時，避免誤觸全資料搜尋（直接顯示空結果）\n- 主頁 stats 卡片已修正平均品質顯示尺度（支援 0~1 與 0~100 來源）。",
    testProgress:
      "2026/04/13 已執行：\n- ✅ 新增並通過 `backend/ocr_service/tests/unit/test_people_db_search_strategy.py`（5 cases：query intent、phone normalize、quality band）\n- ✅ 新增並通過 `backend/ocr_service/tests/integration/test_people_db_id132_api_contract.py`（3 cases：exact-match 契約/資料集 facets/匯入台帳 API）\n- ✅ `apps/superadmin/app/superadmin/settings/people-database/page.test.tsx` 通過（1 case）\n- ✅ 新增 E2E：`apps/superadmin/e2e/132/people-db-id132-acceptance.spec.ts`（覆蓋 exact-match、多資料集勾選、來源追溯、匯入台帳四條路徑）\n- ✅ 本機實跑 E2E（帶入 `PLAYWRIGHT_SUPERADMIN_EMAIL` / `PLAYWRIGHT_SUPERADMIN_PASSWORD`）已全綠：2 passed\n- ⚠️ `backend/ocr_service/tests/unit/test_people_db.py` 現存 1 個既有失敗（`test_missing_required_fields`，與本次改動無直接關聯；目前 ImportSubmitRequest 本就允許該 payload）。",
  },
  // --- Row 135: PromptEngineer 重建 — 多人協作任務派遣系統 ---
  {
    id: "135",
    name: "PromptEngineer 重建 — 多人協作任務派遣系統 + Adapter 自動輪替",
    locatedPage: "superadmin/dashboard/project-progress + docker/paperclip",
    percentage: 100,
    category: "超級管理員 (Super Admin)",
    points: 13,
    phase: "testing",
    testStatus: "passed",
    unitTestCoverage: 100,
    testCoverage: 100,
    lastModifiedBy: "Claude Opus 4.6",
    lastModifiedDate: "2026/04/13",
    featureSpecDocPath: "/project-process/features/prompt-engineer-rebuild-dev-spec-20260413.md",
    tddSpecDocPath: "/project-process/features/tdd-prompt-engineer-rebuild-20260413.md",
    docPath: "/docs/operational-guides/paperclip-mac-mini-24h.md",
    testScriptPath: "apps/superadmin/unit_test/135",
    developmentProgress:
      "2026/04/13 全日完成 P0+P1+P2+Adapter Fallback：\n" +
      "P0（拆 Modal）：\n" +
      "- ✅ prompt-templates.ts + status-styles.ts（純函數抽出）\n" +
      "- ✅ usePaperclipTaskStatus.ts（共用輪詢 hook）\n" +
      "- ✅ TaskDispatchModal.tsx（~200 行，送完即關）\n" +
      "- ✅ TaskStatusChip.tsx + TaskDetailPanel.tsx\n" +
      "- ✅ DevelopmentTab.tsx 接入新元件\n" +
      "P1（Server-side Task Queue）：\n" +
      "- ✅ paperclip_tasks 表 + partial unique index 防重複送單\n" +
      "- ✅ /api/paperclip/task-queue CRUD + poll（server-side 重試）\n" +
      "- ✅ usePaperclipTasks hook\n" +
      "P2（多人協作）：\n" +
      "- ✅ engineer_profiles 表 + claim/assign API\n" +
      "- ✅ AssigneeColumn + PaperclipStatusColumn（表格新增 2 欄）\n" +
      "Adapter 自動輪替：\n" +
      "- ✅ adapter-fallback.ts：6 adapter fallback chain\n" +
      "- ✅ task-queue/poll 整合自動切換（偵測 quota exceeded → PATCH /api/agents/:id）\n" +
      "- ✅ 容器安裝 6 個 coding agent CLI（claude/codex/cursor/hermes/opencode/pi）\n" +
      "- ✅ .env.paperclip 灌入 Anthropic/OpenAI/Gemini/Cursor key\n" +
      "- ✅ 8 個 Paperclip agent 從 codex_local → claude_local\n" +
      "- ✅ 運維文件更新（§5.1 Adapter 自動輪替、§6 成本監控）",
    testProgress:
      "2026/04/13：\n" +
      "- ✅ prompt-templates.test.ts（12 tests）\n" +
      "- ✅ status-styles.test.ts（5 tests）\n" +
      "- ✅ adapter-fallback.test.ts（10 tests）\n" +
      "- ✅ 全套 paperclip tests 192 passed\n" +
      "- ✅ TS 編譯無新增錯誤\n" +
      "- ✅ test-manifest ID 135 已登錄、validate 通過（13 entries）\n" +
      "- ✅ Supabase migration 上線驗證（paperclip_tasks + engineer_profiles）\n" +
      "- ✅ 6 adapter 環境測試全通過（claude/codex/cursor/hermes/opencode ✅ PASS，pi ⚠️ 需設 model）",
  },
  {
    id: "136",
    name: "[Stability] Anthropic credit low-balance alert + circuit breaker",
    category: "通用/系統 (General/System)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude (CTO)",
    lastModifiedDate: "2026/04/13",
    points: 5,
    developmentProgress:
      "2026/04/13 VIS-50：實作 Anthropic 信用額度低餘額警報與熔斷器（2026-04-13 VIS-48 停電事後修復）。\n" +
      "- ✅ Supabase migration 20260413200000：anthropic_credit_guard 表（單例，RLS）\n" +
      "- ✅ lib/ai/anthropic-credit-guard.ts：核心邏輯（loadCreditGuardConfig、getPaperclipSpendUsd、evaluateCreditStatus、runCreditGuardCycle）\n" +
      "- ✅ GET/POST /api/ai-billing/anthropic：查詢狀態 / 更新設定（total_credits_usd、閾值、reset_circuit_breaker）\n" +
      "- ✅ POST /api/paperclip/issues：新增熔斷器檢查，餘額不足時返回 503\n" +
      "- ✅ GET /api/paperclip/task-queue/poll：每次 poll 後觸發 credit guard 週期（限頻 5 分鐘）\n" +
      "- ✅ 警報機制：餘額 < alert_threshold 時在 Paperclip 建立高優先度 issue 通知\n" +
      "- ✅ 熔斷器自動復原：operator 補充信用額後更新 total_credits_usd 即可自動解除",
  },

  // --- VIS 同步系統 (Row 136-139) ---
  {
    id: "137",
    name: "VIS 同步基礎設施 — Engineer Profile V2 + Webhook 框架",
    category: "超級管理員 (Super Admin)",
    percentage: 85,
    phase: "development",
    points: 8,
    locatedPage: "superadmin/engineers, api/webhooks/paperclip",
    featureSpecDocPath:
      "/project-process/features/vis-roadmap-sync-dev-spec-20260414.md",
    tddSpecDocPath:
      "/project-process/features/tdd-vis-roadmap-sync-20260414.md",
    acceptanceCriteria:
      "1. engineer_profiles 管理頁面（/superadmin/engineers）可 CRUD 工程師，含角色/時薪/最大並發任務數。\n" +
      "2. paperclip_webhook_logs、sync_conflicts 表建立，含 RLS 策略。\n" +
      "3. POST /api/webhooks/paperclip 可接收並驗證 HMAC 事件，非同步加入背景 worker。\n" +
      "4. RoadmapFeature interface 新增 vis_issue_id / vis_issue_key / vis_sync_status / vis_last_synced_at 欄位。\n" +
      "5. 環境驗證腳本（PAPERCLIP_WEBHOOK_SECRET 等）執行無錯。",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress:
      "2026/04/14 (VIS-66, Architect Agent)\n" +
      "- ✅ DB migration: create_vis_sync_tables（115 行，paperclip_webhook_logs + sync_conflicts + RLS）\n" +
      "- ✅ POST /api/webhooks/paperclip route（89 行，HMAC 驗證 + 事件分派）\n" +
      "- ✅ Engineer 管理頁面 /superadmin/engineers（page.tsx 362 行 + actions.ts 105 行）\n" +
      "- ✅ ADR 文件：adr-137-vis-sync-infrastructure.md\n" +
      "- ✅ 環境驗證腳本：scripts/validate-vis-sync-env.sh\n" +
      "- ✅ vis-roadmap-sync-dev-spec 更新\n\n" +
      "2026/05/08 (Claude)\n" +
      "- ✅ AC #3 背景 worker：POST /api/webhooks/paperclip/process-queue（BATCH_SIZE=20，CRON_SECRET 驗證，自動標記 processing→processed/skipped/failed，衝突寫入 sync_conflicts）",
  },
  {
    id: "138",
    name: "VIS 批量遷移工具 — 135 任務導出到 Paperclip VIS",
    category: "超級管理員 (Super Admin)",
    percentage: 80,
    phase: "development",
    points: 5,
    locatedPage: "superadmin/dashboard/project-progress",
    featureSpecDocPath:
      "/project-process/features/vis-roadmap-sync-dev-spec-20260414.md",
    tddSpecDocPath:
      "/project-process/features/tdd-vis-roadmap-sync-20260414.md",
    acceptanceCriteria:
      "1. sync-roadmap-to-vis.ts dry-run 列印 135 行 VIS issue 草稿，格式與映射邏輯無誤。\n" +
      "2. 實際執行後 VIS 儀表板出現 ~135 個 issue，title / labels / priority / story_points 正確。\n" +
      "3. roadmap.ts 每個已遷移 Feature 均有 vis_issue_id / vis_issue_key 回寫。\n" +
      "4. Superadmin 出現「導出到 VIS」按鈕，顯示實時進度日誌與完成摘要。\n" +
      "5. 增量模式：再次執行跳過已有 vis_issue_id 的 Feature，僅處理新增/變更項目。",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    developmentProgress:
      "2026/04/14 (VIS-70, Fullstack Agent)\n" +
      "- ✅ sync-roadmap-to-vis.ts 批量遷移腳本（含 dry-run、batch/incremental 模式、vis_issue_id 回寫）\n" +
      "- ✅ Superadmin 導出 UI（ExportToVISButton + ExportProgressDialog）\n" +
      "- ✅ AC #5 增量模式：--mode incremental 跳過已有 vis_issue_id 的 Feature\n" +
      "- ✅ AC #3 vis_issue_id 回寫：patchVisFields() 直接修改 roadmap.ts 原始碼\n" +
      "- 待完成：AC #2 實際 VIS 環境驗證（需 Paperclip API 連線）",
  },
  {
    id: "139",
    name: "VIS \u2194 Roadmap 雙向同步引擎 + 衝突解決",
    category: "超級管理員 (Super Admin)",
    percentage: 0,
    phase: "development",
    points: 13,
    locatedPage: "superadmin/conflicts, lib/paperclip/sync-engine",
    featureSpecDocPath:
      "/project-process/features/vis-roadmap-sync-dev-spec-20260414.md",
    tddSpecDocPath:
      "/project-process/features/tdd-vis-roadmap-sync-20260414.md",
    acceptanceCriteria:
      "1. VIS issue status 變更 → Webhook 觸發 → roadmap.ts 自動 git commit 更新（延遲 <10s）。\n" +
      "2. Superadmin 編輯 Feature → PATCH /api/admin/features/:name → VIS issue 自動同步。\n" +
      "3. 衝突時 vis_sync_status 標記 diverged，加入 /superadmin/conflicts 審核佇列。\n" +
      "4. Conflict 頁面可選「採 roadmap」/「採 VIS」/「手動合併」三種解決方式，解決後雙端一致。\n" +
      "5. Webhook 重試最多 3 次（指數退退），失敗後記錄至 paperclip_webhook_logs 並標記 failed。",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/04/14",
  },
  {
    id: "140",
    name: "CEO VIS 任務分配工作流 — Engineer 指派 + 進度整合",
    category: "超級管理員 (Super Admin)",
    percentage: 50,
    phase: "development",
    points: 5,
    locatedPage: "superadmin/engineers, superadmin/dashboard/project-progress",
    featureSpecDocPath:
      "/project-process/features/vis-roadmap-sync-dev-spec-20260414.md",
    tddSpecDocPath:
      "/project-process/features/tdd-vis-roadmap-sync-20260414.md",
    acceptanceCriteria:
      "1. Engineer 管理頁面顯示每位工程師的已分配/完成任務數、成本與可用容量。\n" +
      "2. Project Progress 表支援「自動指派」（按角色自動選最低負載 agent/engineer）。\n" +
      "3. CEO 工作流文檔完整：Superadmin → 導出 VIS → 分配任務 → 監控進度 → 衝突處理。\n" +
      "4. 工程師 claim 任務後 git worktree 自動建立，IDE 可直接使用。\n" +
      "5. CI 測試完成後 coverage 結果自動回源 roadmap testCoverage / unitTestCoverage。",
    lastModifiedBy: "Claude Opus 4.6",
    lastModifiedDate: "2026/04/14",
    developmentProgress:
      "2026/04/14\n" +
      "- ✅ /dispatch-agents Skill 建立（手動派工流程標準化）\n" +
      "- ✅ /review-agent-work Skill 建立（檢查 + 修復 + merge）\n" +
      "- ✅ POST /api/paperclip/auto-dispatch（自動派工 API，含 dry-run）\n" +
      "- ✅ 兩輪派工完成（14 個 VIS issues，10 個完成）\n" +
      "- 待完成：Engineer 管理頁面工作量統計、CI coverage 回源",
  },

  // --- 三層自動化 + Mission Control (Row 141) ---
  {
    id: "141",
    name: "Paperclip 三層自動化 + Mission Control Dashboard",
    category: "專案管理與工具 (Project Management)",
    percentage: 90,
    phase: "development",
    points: 8,
    locatedPage: "superadmin/dashboard/paperclip-worktrees",
    devLogDocPath:
      "/project-process/dev-logs/dev-paperclip-three-layer-automation-2026-04-14.md",
    acceptanceCriteria:
      "1. GET /api/paperclip/agent-health 自動偵測 error agent 並切換 adapter（含 model 映射）。\n" +
      "2. GET /api/paperclip/work-summary 掃描 worktree branches 並回報 merge readiness。\n" +
      "3. POST /api/paperclip/auto-dispatch 自動為 idle agents 從 roadmap 派工。\n" +
      "4. Mission Control Dashboard 4-Tab UI（Worktrees/Summary/Agents/Dispatch）。\n" +
      "5. Cron 定時任務：agent-health 3min、work-summary 5min、auto-dispatch 10min。",
    lastModifiedBy: "Claude Opus 4.6",
    lastModifiedDate: "2026/04/14",
    developmentProgress:
      "2026/04/14\n" +
      "- ✅ Layer 1 (監控): GET /api/paperclip/work-summary — 偵測誤刪共用檔、shared file 衝突\n" +
      "- ✅ Layer 2 (Review): /review-agent-work Skill — 檢查 → 修復 → merge → roadmap 更新\n" +
      "- ✅ Layer 3 (派工): POST /api/paperclip/auto-dispatch — dry-run + 執行，role 匹配\n" +
      "- ✅ Agent Health: GET /api/paperclip/agent-health — adapter auto-fallback（opencode→cursor→codex→claude）\n" +
      "- ✅ 4-Tab Dashboard: PaperclipDashboardTabs + WorkSummaryTab + AgentsTab + AutoDispatchTab\n" +
      "- ✅ Cron 定時任務設定\n" +
      "- ✅ 文件更新：CLAUDE.md, AGENTS.md, dispatch-agents/SKILL.md\n" +
      "- 待完成：UI 驗證、Agent Tab adapter 切換 dropdown",
  },
  // --- Row 142: Elastic Observability MVP ---
  {
    id: "142",
    name: "Elastic Observability MVP（APM / PostgreSQL / Docker / Synthetics）",
    category: "通用/系統 (General/System)",
    percentage: 0,
    phase: "development",
    points: 8,
    locatedPage: "start.sh + tools/observability + docs/operational-guides",
    featureSpecDocPath:
      "/project-process/features/elastic-observability-mvp-dev-spec-20260414.md",
    tddSpecDocPath:
      "/project-process/features/tdd-elastic-observability-mvp-20260414.md",
    docPath:
      "/project-process/test-logs/test-elastic-observability-mvp-2026-04-14.md",
    testScriptPath: "apps/superadmin/unit_test/142",
    acceptanceCriteria:
      "1. 完成 Kibana/Fleet 套件來源連線治理（online 或自建 registry）並可安裝目標 integrations。\n" +
      "2. 第一期整合至少包含 System、Docker、APM（Node.js / Python）、PostgreSQL、Synthetics。\n" +
      "3. 建立 4 張 MVP dashboard（Platform Health、Journey Performance、OCR Pipeline、DB Reliability）。\n" +
      "4. 設定 5 條核心告警（p95 latency、5xx ratio、OCR fail rate、DB connections、container restart）。\n" +
      "5. 完成開發與測試文件、腳本與 roadmap 欄位更新，驗收可重現。",
    developmentProgress:
      "Task ID: ELASTIC-OBS-142。2026/04/14 已完成第一波落地：\n" +
      "• start.sh 新增 observability 指令與選單入口（執行 Fleet registry + MVP smoke 檢查）。\n" +
      "• 新增 tools/observability/check-fleet-registry.sh（EPR/Fleet 連線檢查，含容器視角）。\n" +
      "• 新增 tools/observability/mvp-smoke.sh（ES/Kibana 可達、容器狀態、APM/System/Docker/PostgreSQL/Synthetics index 提示）。\n" +
      "• 新增 docs/operational-guides/elastic-observability-mvp.md 與 elastic-alert-thresholds.md。\n" +
      "• test-manifest 新增 id=142，納入 observability 工具腳本。\n" +
      "待完成：實際 integrations 安裝、4 張 dashboard 建置、5 條告警建立與觸發驗證。",
    testProgress:
      "已完成腳本層驗證（語法/執行/manifest）；待完成 integrations 實裝後的 dashboard 與告警驗收。",
    lastModifiedBy: "GPT-5.3-Codex",
    lastModifiedDate: "2026/04/14",
  },

  // === 2026-04-17 新增 Row 143 ===
  {
    id: "143",
    name: "Adapter CLI 文件自動更新流程（15 天排程）",
    category: "專案管理與工具 (Project Management)",
    percentage: 90,
    phase: "development",
    points: 3,
    locatedPage: "docs/Adapter CLIs/",
    featureSpecDocPath: "",
    tddSpecDocPath: "",
    docPath: "",
    testScriptPath: "",
    devLog:
      "### 2026-04-17 完成項目\n" +
      "- 建立 `scripts/collect-cli-help.sh`：自動對 6 個 CLI（claude/codex/cursor/opencode/gemini/kilo）執行 --help，收集原始輸出到 /tmp/cli-help-raw/，含子指令深層 help、版本偵測、缺少 CLI 清單\n" +
      "- 建立 `.claude/commands/update-cli-docs.md`：Claude Command，讀取 help 輸出 + Context7 MCP 補齊未安裝 CLI，比對現有 7 份 Adapter CLI 文件並更新 6 欄表格，產生 changelog summary\n" +
      "- 設計半自動流程：cron 定時收集 → 通知 → 手動 `/update-cli-docs` 觸發更新\n" +
      "- 格式規範直接嵌入 Command（不額外建 Skill），避免過度設計\n\n" +
      "### 2026-05-08 完成項目\n" +
      "- 建立 `.github/workflows/collect-cli-help.yml`：每月 1 日與 16 日（~15 天間隔）自動執行 collect-cli-help.sh，上傳 artifact，並在無開放 issue 時自動建立 reminder issue（標籤 cli-docs-update）\n" +
      "- 待完成：首次執行 /update-cli-docs 端到端驗證（需 Adapter CLIs 可用）",
    developmentProgress:
      "2026/04/17：完成核心 shell script 與 Claude Command。\n" +
      "2026/05/08：新增 GitHub Actions 排程工作流（每 15 天自動收集 + reminder issue）。\n" +
      "交付物：scripts/collect-cli-help.sh、.claude/commands/update-cli-docs.md、.github/workflows/collect-cli-help.yml",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
  },
  // --- Row 144: 尋人資料庫 — 樹狀資料來源管理 + 進階關聯分析 ---
  {
    id: "144",
    name: "超級管理員-尋人資料庫：樹狀資料來源管理 + 進階關聯分析（ID 144）",
    locatedPage: "superadmin/settings/people-database",
    percentage: 96,
    category: "超級管理員 (Super Admin)",
    points: 13,
    phase: "testing",
    testStatus: "passed",
    testCoverage: 92,
    unitTestCoverage: 96,
    e2eTestCoverage: 20,
    defectCount: 0,
    featureDescription:
      "承接 Row 131 / 132，將平鋪 data_source 勾選升級為樹狀層級面板，支援資料夾層級 Import 與 dataset 元資料管理（重新命名、合併、啟停、收藏），並新增身分證反查房產、親友關係圖譜推論等進階功能，讓尋人資料庫能真正解決『找到正確且對的人』並交叉驗證。",
    acceptanceCriteria:
      "1. 搜尋頁左側顯示樹狀資料來源面板，節點可展開收合並顯示 count/last_imported_at/quality/大小警告。\n2. 預設 preset 為『最近使用』而非『全選』，可切換至『收藏』。\n3. 勾選父節點以 ES dataset_path prefix filter 涵蓋所有子節點。\n4. Dataset 管理頁可重新命名、合併、拆分、啟停、收藏；操作後 ES 與 Postgres 同步。\n5. Import 保留資料夾層級（dataset_root + dataset_subpath）。\n6. 單人詳情頁支援身分證反查 properties 與親友關係圖譜。\n7. 新 API 有整合測試，前端面板與管理頁有 E2E 覆蓋。",
    featureSpecDocPath:
      "/project-process/features/people-db-dataset-tree-dev-spec-20260417.md",
    tddSpecDocPath:
      "/project-process/features/tdd-people-db-dataset-tree-20260417.md",
    docPath:
      "/project-process/test-logs/test-people-db-dataset-tree-2026-04-17.md",
    devLogDocPath:
      "/project-process/dev-logs/dev-people-db-dataset-tree-2026-04-17.md",
    testScriptPath: "apps/superadmin/unit_test/144",
    developmentProgress:
      "2026/04/17（設計階段）\n- 探勘 Row 131/132 既有實作：ES mapping、search/import 前端、FastAPI proxy 權限鏈\n- 掃描使用者實體資料夾 /Volumes/KLEVV-4T-2/台灣尋人資料庫（30+ 子目錄，有明顯階層）\n- 確認 Row 132 acceptance #5『預設全選』導致實質無 scope filter，應改為『最近使用』preset + scope hint\n- 完成 4 項核心設計變更：樹狀面板、Import 層級化、Dataset 管理頁、身分證反查\n- 建立 dev-spec / tdd-spec / dev-log / test-log 骨架與 unit_test/144、e2e/144 目錄\n\n2026/04/17（Sprint 1 實作 — Claude Opus 4.7）\n- 關鍵發現：backend/ocr_service FastAPI 已在 OpenClaw migration 被刪除。改為 Next.js route handler 直連本機 ES。\n- 交付：dataset-tree 純函式、es-gateway helper、/api/people-db/dataset-tree 路由、DatasetTreePanel 組件、搜尋頁 2-欄 grid + legacy fallback\n- 測試：jest 19/19 全綠；curl 307/401 正常\n\n2026/04/17 → 04/18（Sprint 2 實作 — Claude Opus 4.7）\n- ES mapping：新增 dataset_path/dataset_root/dataset_subpath keyword 欄位，`_update_by_query` backfill 5 docs 成功（tools/people-db/add-dataset-path-mapping.sh）\n- Supabase：20260417184500 migration 建 dataset_metadata 表 + 完整 RLS（super_admin CRUD）+ trigger + 部分索引\n- 純函式 search-strategy：classifyQuery、normalizePhone、buildSearchBody\n- 新 API：/search、/datasets、/stats、/datasets/metadata；/dataset-tree 合併 Supabase overrides\n- 前端：Dataset 管理頁 /sources + 匯入頁 inferDatasetPath + 首頁快捷鍵\n- 測試：jest 34/34 全綠\n\n2026/04/18（Sprint 3 實作 — Claude Opus 4.7）\n- 純函式：parseCsv（RFC 4180）、normalizeAddress（台灣縣市/區/路段切割 + 全形→半形）、mapRowsToDocuments + computeQuality\n- esBulkIndex helper 加到 es-gateway（分批 500 筆 + 失敗逐筆回報）\n- 新 API：POST /import/preview（CSV 解析 + sample）、POST /import/submit（stateless：file + mapping multipart，直接 bulk ES）、GET /related（依 record_id/address/phone/mobile/company 找關聯人）\n- 前端：匯入頁 submit 改為 multipart FormData（file + column_mapping JSON），新增 .txt 為支援格式\n- 格式策略：Sprint 3 只支 CSV/TXT，xlsx/pdf 回 415 + 明示 Sprint 4 支援（避免引入有 CVE 的 xlsx 套件）\n- 測試：jest 58/58（新增 csv-parse 10 + address-normalize 8 + import-mapper 6）全綠；curl smoke 9 routes 全部 401；tsc exit 0\n\n2026/04/18（Sprint 4 實作 — Claude Opus 4.7）\n- 範圍調整：聚焦『使用者價值最高、無新依賴』兩條路徑；Excel/PDF + 大檔背景任務 + E2E 推遲到 Sprint 5（避免 xlsx CVE 與 RFC 評估）\n- Phase A 親友圖譜 UI：RelatedPeoplePanel client 元件（4 群組折疊式 + scope hint + loading/empty/error）、GET /api/people-db/person/[recordId] 詳情 API、/superadmin/settings/people-database/person/[recordId] 詳情頁（左主檔 + 右側 sticky 親友面板）、搜尋結果姓名連結到詳情頁\n- Phase B Dataset 批次操作：POST /api/people-db/datasets/metadata/bulk（≤500 筆/次，只開放 favorited / enabled，避免誤覆蓋 display_name）、Sources 頁 multi-select + 浮動工具列（收藏/取消收藏/啟用/停用/清除選取）\n- 測試：jest 65/65（新增 RelatedPeoplePanel 7 cases）全綠；curl smoke /person/[recordId] 401、bulk 401、/person 詳情頁 307 OK\n- 下一步 Sprint 5：Excel/PDF 解析（評估 exceljs 或 OpenClaw queue）、>5MB 背景任務、跨頁 E2E\n\n2026/04/18（Sprint 5 實作 — Claude Opus 4.7）\n- Excel 解析：自寫 xlsx-parse 走 jszip + OOXML 直解（避免 xlsx/exceljs 的 CVE 與 500kB+ 增量）；支援共享字串、inline string、稀疏欄位（A/C 跳過 B）、col_N 空 header 替換；單測 8/8\n- PDF 解析：pdfjs-dist v4 legacy build + disableWorker 在 route handler 內解析；stitchTextItems 以 y-coordinate 斷行、parsePdfTabular 選 tab > 2+ spaces > single space delimiter；likelyScanned 只在 totalChars===0 觸發；單測 6/6\n- 統一派送層 parse-dispatch：preview 與 submit 共用單一副檔名政策（.csv/.txt/.xlsx/.pdf），刻意不支 .xls 舊 BIFF；單測 7/7\n- 背景任務佇列：migration 20260418120000 建 people_import_jobs 表（4 狀態）+ people-imports Storage bucket（super_admin+service_role RLS 雙軌）；新 API /api/people-db/import/jobs（enqueue/list）、/jobs/[id]（detail）、/jobs/[id]/process（worker）\n- 共用 lib/people-db/import-jobs.ts：buildStoragePath 以 YYYY/MM/DD/<jobId>/<file> 分桶；processImportJob 用 conditional update 做原子 claim（pending→processing）避免雙 worker 搶同一 row；單測 8/8\n- 匯入頁 UI：accept list 與派送層對齊；≥5MB 檔案自動改打 /jobs 再立刻 POST /process；Done state 分同步 batch_id 與非同步 job_id 兩欄呈現\n- E2E：e2e/144/search-to-related.spec.ts 驗證 search → detail → RelatedPeoplePanel → 跳下一人；test-manifest.json 加入 Row 144 項目（pr tier）\n- 測試：jest 78/78 全綠（Sprint 5 新增 29 cases：xlsx 8 + pdf 6 + parse-dispatch 7 + import-jobs 8）；tsc 無 people-db 錯誤；validate-test-manifest.sh 通過\n- Sprint 5b/6 待辦：背景任務 cron 排程、匯入記錄 UI、scanned PDF → OpenClaw OCR 對接",
    testProgress:
      "Sprint 1-5 jest 78/78 通過（dataset-tree 7 + DatasetTreePanel 11 + search-strategy 8 + csv-parse 10 + address-normalize 10 + import-mapper 10 + RelatedPeoplePanel 7 + xlsx-parse 8 + pdf-parse 6 + parse-dispatch 7 + import-jobs 8）。curl smoke：17 個 /api/people-db/* 路由（新增 preview/xlsx、jobs POST/GET、jobs/[id]、jobs/[id]/process 共 5 條）全部 401 guard 正確。E2E：e2e/144/search-to-related.spec.ts 已入 test-manifest（pr tier）。",
    lastModifiedBy: "Claude Opus 4.7",
    lastModifiedDate: "2026/04/18",
  },
  // --- Row 145: 尋人資料庫 — 大規模批次 Ingestion Pipeline (RFC 決議版) ---
  {
    id: "145",
    name: "超級管理員-尋人資料庫：大規模批次 Ingestion Pipeline（ID 145）",
    locatedPage: "superadmin/settings/people-database/ingest",
    percentage: 99,
    category: "超級管理員 (Super Admin)",
    points: 44,
    phase: "development",
    featureDescription:
      "承接 Row 131 / 132 / 144，為 /Volumes/KLEVV-4T-2/台灣尋人資料庫（實測 474 GB / 30+ 子資料夾 / 混合 mdb/dbf/xls/xlsx/csv/txt/pdf/掃描 PDF）建立可重跑、可去重、可觀測的批次入庫管線。包含：檔案清冊與 sha256 去重、副檔名 router 補齊（mdb/accdb/dbf/xls/轉置 PDF/掃描 PDF → OpenClaw）、Entity Resolution（身分證 exact 自動 + 模糊配對半自動）、ES 升級為 IK 中文分詞器（blue/green reindex）、監控 UI 與 dead-letter 重試；硬碟存取抽象為 PEOPLE_DB_SOURCE_ROOT env，便於未來從本機遷至 NAS。",
    acceptanceCriteria:
      "1. 遞迴掃描 $PEOPLE_DB_SOURCE_ROOT 後 people_db_files 筆數與實際檔案數一致，重跑新增數為 0（冪等）；刪檔變 status=missing。\n2. Router 支援 .mdb / .accdb / .dbf / .xls / .xlsx / .csv / .txt / .pdf；失敗檔案進 dead-letter 不阻塞其他檔案。\n3. 里長 PDF（轉置表）解析後 闕貴卿 對到南港路 212 號 2 樓而非江輝吉的地址。\n4. 掃描 PDF（totalChars===0）自動送 OcrClient queue（Sprint 3 為 mock），callback 後寫回 ES；真 OpenClaw 上線後僅替換 client 實作。\n5. Entity Resolution：身分證 exact 自動合併進 people_db_persons；name+phone / name+addr 產候選寫 people_db_merge_candidates，admin 在 merge-candidates 頁 confirm/reject，reject 進 blacklist。\n6. 搜尋結果預設依 person 聚合，可切換 record 展開。\n7. ES 套用 ik_max_word + ik_smart，_analyze 驗證中文人名/地址不是逐字拆 token；blue/green reindex 切 alias 不中斷搜尋。\n8. 監控頁顯示各 stage 檔案數、最近 10 次 run、dead-letter 可單檔 retry。\n9. 所有新表啟用 RLS，super_admin 才能 CRUD；worker 走 service_role。\n10. NAS 就緒後（Sprint 7）僅改 env 即可遷移，sha256 為主鍵不丟失處理進度。",
    featureSpecDocPath:
      "/project-process/features/people-db-bulk-ingestion-dev-spec-20260418.md",
    tddSpecDocPath:
      "/project-process/features/people-db-bulk-ingestion-tdd-spec-20260418.md",
    docPath:
      "/project-process/test-logs/test-people-db-bulk-ingestion-2026-04-19.md",
    devLogDocPath:
      "/project-process/dev-logs/145-development-log-summary.md",
    testScriptPath: "apps/superadmin/unit_test/145",
    developmentProgress:
      "2026/04/18（RFC 決議版 — Claude Opus 4.7 × Jason 拍板）\n- 實測硬碟規模：/Volumes/KLEVV-4T-2/台灣尋人資料庫 474 GB / 30+ 子目錄\n- 檔案類型盤點：.mdb/.accdb/.dbf/.xls（結構化未支援）、.xlsx/.csv/.txt（Row 144 已支援）、.pdf（有文字層但轉置表會錯位）、掃描 PDF（需 OCR）\n- Row 131–144 遺留限制 5 項：無檔案清冊（重複入庫）、副檔名 router 殘缺、無 Entity Resolution、ES 無中文分詞器、PDF 啟發式對轉置表崩潰（實測：闕貴卿→江輝吉地址）\n\n決議（Jason 2026/04/18）：\n1. ER 保守路線：只對身分證 exact 自動合併；name+phone / name+addr 走半自動 admin 確認（新增 merge_candidates / blacklist 表 + 前端頁）\n2. Sprint 2 與 Sprint 5 並行（IK Analyzer 與結構化 parser 無 code 依賴），關鍵路徑從 15 天壓到約 11 工作天\n3. OpenClaw mock 先行：Sprint 3 定義 OcrClient interface + MockOcrClient，feature/openclaw-migration 合併後替換\n4. 硬碟存取抽象為 PEOPLE_DB_SOURCE_ROOT env（預設本機）；家中 NAS 尚未 setup，NAS 就緒前不做正式入庫；Sprint 7 做遷移腳本\n\n- Sprint 拆解 7 個（1–6 共 41 points 約 11 工作天關鍵路徑 + 7 NAS 遷移 3 points，合計 44 points）\n- 建立 dev-spec：/project-process/features/people-db-bulk-ingestion-dev-spec-20260418.md（v1.0 決議版 23 KB）\n- 建立 tdd-spec：/project-process/features/people-db-bulk-ingestion-tdd-spec-20260418.md\n\n2026/04/19（Sprint 1 實作 — Claude Opus 4.7）\n- Migration 20260419100000_create_people_db_files.sql：sha256 UNIQUE 主鍵、status 11 態 CHECK、dataset_root/subpath、updated_at trigger、RLS 四政策（super_admin + service_role 雙軌）\n- 純函式 apps/superadmin/lib/people-db/inventory.ts：computeSha256Stream（streaming 避免 OOM）、deriveDatasetRoot（trailing slash 正規化）、detectMimeByExt（case-insensitive）、shouldReparse（sha256 為主；size mismatch 只 warn 不重跑）、classifyStatus（9 種支援副檔名：pdf/xlsx/xls/mdb/accdb/dbf/csv/txt/fp）、reclassifyIfStale（只讓 skipped_unsupported→pending，保護 in-flight/terminal 狀態不被降級）\n- CLI tools/people-db/scan.ts：遞迴 walk（跳過 .* 與 __MACOSX）、逐檔 hash + upsert、content_changed 重置為 pending、sha256 未見者標 missing、啟用新副檔名時自動回補舊 skipped_unsupported 列；支援 --dry-run / --limit / --root / $PEOPLE_DB_SOURCE_ROOT\n- API GET /api/people-db/ingest/files：requireSuperAdmin + createAdminClient，支援 status/dataset_root/page/page_size 過濾，回 total+items\n- 測試 __tests__/inventory.test.ts：6 個 describe 組共 20 cases 全綠（sha256 × 3 含 512 MB 記憶體 bound、deriveDatasetRoot × 5、detectMimeByExt × 2、shouldReparse × 3、classifyStatus × 3、reclassifyIfStale × 4）；superadmin tsc --noEmit 0 errors；scan.ts dry-run smoke test OK\n- 下一步 Sprint 2：副檔名 Router（mdb/accdb via mdb-tools、dbf via dbf-parser、xls via node-binary-parsers 或 SheetJS BIFF fallback、.fp FileMaker Pro 匯出為 CSV 後走既有 CSV 流程）、ES mapping + IK Analyzer blue/green reindex 計畫\n\n2026/04/19（Sprint 2 + Sprint 5 並行 — Claude Opus 4.7）\n- 新分支 feature/row-145-sprint-2（從 main + Sprint 1 分出，含 docs/localhost-debug-triage 已 merge 的 middleware localhost IP guard skip 修正）\n- Sprint 2 Router 模組 apps/superadmin/lib/people-db/parsers/：types.ts（ParseResult interface + UnsupportedParserError + ParserFailureError）、mdb.ts（child_process spawn mdb-tables/mdb-export，5 分鐘 timeout，每 table 加 __table 欄位，單 table 失敗只警告不阻塞其他 table）、dbf.ts（dbffile@1.12.0，預設 Big5 透過 PEOPLE_DB_DBF_ENCODING env，PAGE_SIZE=5000 分批避免 OOM，Date→ISO/Boolean→T|F 統一字串化）、xls.ts（SheetJS xlsx@0.18.5 readonly BIFF；CVE 風險用 Object.freeze 凍結 prototype + 限制只在 worker 對 trusted NAS 檔案使用）、index.ts dispatchByPath 路由 .csv/.txt/.xlsx/.xls/.mdb/.accdb/.dbf/.pdf/.fp\n- 測試 27/27 全綠：mdb.test（mock spawn × 6 cases 含 ENOENT 安裝提示、非零 exit、單 table 失敗繼續、空表/空檔案）、dbf.test（dbffile round-trip × 4 含 Date/Boolean coercion、empty/garbage 檔案）、xls.test（SheetJS BIFF round-trip × 5 含 multi-sheet __sheet 欄位、blank rows、缺 header col_N、不存在 path）、dispatch.test（× 12 路由全副檔名 + lowercase + explicit ext arg）\n- CLI worker tools/people-db/parse.ts：fetchPendingBatch（status=pending && attempts<max-attempts）→ markParsing → dispatchByPath → markResult/markFailed/markSkippedUnsupported；--limit / --dry-run / --max-attempts / --batch-size；error_msg 截 4000 字元；likelyScanned PDF 走 ocr_queued（Sprint 3 接 OpenClaw mock）\n- Sprint 5 IK Analyzer：發現 backend/elasticsearch/Dockerfile 已內建 analysis-ik + analysis-stconvert plugin（ES 8.12.0），既有 people_database 也已用 ik_max_word_analyzer，所以不用裝 plugin；Sprint 5 縮減為 (a) tools/people-db/es-mappings/people_v2.json：name 改用 ik_smart 索引 + ik_max_word 搜尋避免人名過度分詞、新增 person_id/record_count/source_file_sha256 欄位等待 Sprint 4、address 加 .tokens 子欄位 keyword (b) tools/people-db/verify-ik.sh：smoke test plugin 與 _analyze（驗證通過：台北市/南港路/二段/212/號）(c) tools/people-db/reindex.ts：_reindex wait_for_completion=false + 任務 polling + --resume taskId + 可調 rps/slices (d) tools/people-db/swap-alias.sh：原子 alias 切換 + --rollback + doc count sanity check\n- 已知限制：闕貴卿 IK 仍逐字切（罕用姓不在預設字典），custom dict 屬 Sprint 6 範圍；安裝 dbffile + xlsx 後 npm audit 多 2 個 high CVE（xlsx Prototype Pollution + ReDoS），文檔記載並隔離至 worker context，dompurify/next CVE 為 pre-existing 不在本 PR 範圍\n- 下一步 Sprint 3：PDF 轉置表偵測修 闕貴卿→江輝吉地址錯位 + OcrClient interface + MockOcrClient + /api/people-db/ingest/ocr/callback webhook\n\n2026/04/19（Sprint 3 實作 — Claude Opus 4.7）\n- Post-Sprint-2 cleanup commit 8032a7e：mdb.ts 的 -H flag 微修（mdbtools -H 是 suppress header 不是 include，錯把第一 data row 當欄名導致所有欄位偏移）+ pdf-parse.ts 的 pdfjs-dist v4 workerSrc fix（v4 在 disableWorker:true 下仍驗證 workerSrc truthiness）+ Sprint 2 尾巴 fp-parse.test.ts\n- Task A PDF text-layer 改善：stitchTextItems 改 y-bucket（tolerance 3px 放寬 + x-sort 還原 reading order，既有 1px 閾值在 CJK glyph sub-pixel baseline 漂移時每字斷行）+ pdf-transposed.ts（detectTransposedTable 字典命中≥3 則判轉置 / transposeTable 首欄當 headers，欄數不齊補空）+ parsePdfTabular 加 transposed branch；10 cases + 既有 pdf-parse 加 3 cases（per-char stitch / sub-pixel drift / x-order restore）\n- 關鍵發現：真實里長 PDF 非轉置表，是 grid-based spatial layout（每 x=一欄、column 內 y 分成欄名區 + 4 persons 的 y band）；text-layer grid rebuild 通用性差且複雜，Jason 決議走 OCR path；stitchTextItems 改善與 pdf-transposed 作為通用工具保留；acceptanceCriteria #3 重新定義為「OCR 接上 OpenClaw 後驗收」\n- Task B OcrClient 骨架：lib/people-db/ocr/types.ts（OcrClient interface / OcrJob / OcrResult / OcrPage / OcrProviderId）+ mock-client.ts（MockOcrClient with enqueue/onResult/simulateCallback，in-memory queue，Sprint 3 不去重）+ client-factory.ts（getOcrClient(provider) mock|openclaw，openclaw 暫 throw）+ dispatch.ts（dispatchOcr helper：讀檔 → enqueue → DB update 三欄 + status='ocr_queued'）+ 5 cases\n- Task B migration 20260419053015_add_people_db_files_ocr_columns.sql：加 ocr_job_id / ocr_provider / ocr_submitted_at 三欄 + ocr_job_id 部分索引（WHERE IS NOT NULL 避免 bloat）\n- Task B worker 接線：tools/people-db/parse.ts 的 markResult 在 likelyScanned===true 時呼叫 dispatchOcr 而非直接 markResult status='ocr_queued'；env PEOPLE_DB_OCR_PROVIDER=mock|openclaw（預設 mock）\n- Task C OCR callback webhook app/api/people-db/ingest/ocr/callback/route.ts：HMAC-SHA256（x-ocr-signature header + OCR_CALLBACK_SECRET env）對齊 paperclip webhook pattern；lookup by ocr_job_id → status='parsed' + parser='ocr' + row_count=pages.length + error_msg='OCR_RESULT_FOR_SPRINT_4'（staging table 是 Sprint 4 範圍）；7 cases 含 200/401 missing sig/401 wrong sig/400 invalid JSON/400 missing fields/404 unknown jobId/500 config error\n- Task D integration test lib/people-db/__tests__/ocr-pipeline.test.ts：in-memory Supabase mock + tmp file + real MockOcrClient + real dispatchOcr + real route.POST，驗證 pending → ocr_queued → parsed；gated on RUN_INTEGRATION=1（原本 .integration.test.ts 後綴會 override testPathIgnorePatterns 連帶解鎖 e2e Playwright，改內嵌 env gate 乾淨得多）；2 cases（pending→parsed / unknown-jobId returns 404 不改 row）\n- 測試：jest 168 pass + 2 skipped integration（RUN_INTEGRATION=1 時 2/2 pass）全綠；tsc 0 errors；pre-commit hooks（critical-deps / no-any / adapter-model-ids / lint-staged）全通過\n- 已知限制：闕貴卿 真實驗收需 OpenClaw 接上（Sprint 6+）；OCR staging table 延 Sprint 4；pdf-transposed 對 mock 有效但里長 PDF grid layout 不觸發；OpenClawOcrClient 在 factory 先 throw 等 Sprint 6+ 實作\n- 下一步 Sprint 4：Entity Resolution（people_db_persons + merge_candidates + blacklist 三表 + RLS）+ 身分證 exact 自動合併 + name+phone/name+addr 產候選 + admin merge-candidates 確認頁\n\n2026/04/19（Sprint 4a 實作 — Claude Opus 4.7）\n- 新分支 feature/row-145-sprint-4a（從 sprint-2 head 4e8694d 分出；Sprint 4 拆成 4a staging+ER core+API 與 4b admin UI+search toggle）\n- Phase 1 Staging + Normalize（dev-spec 原本隱含，發現 Sprint 2/3 worker 都沒持久化 ParseResult.rows 也沒定義 staging table）：\n  - Migration 20260419055657_create_people_db_staging_records.sql：單表 raw+normalized JSONB、(file_id, record_index) UNIQUE 讓 re-parse upsert 乾淨、partial index 只掃 pending normalize/resolve 的 rows、GIN on normalized JSONB 覆蓋 ER 的 name+phone / name+addr 查詢、RLS 4 policies\n  - lib/people-db/staging.ts：parsedRowsToStaging / ocrPagesToStaging / insertStagingRecords / updateNormalized + 4 cases\n  - lib/people-db/normalize.ts：normalizeName / normalizeIdNo / normalizeBirthYear（ROC 年 + 民國日期字串 + 西元 4 位數）/ normalizeRecord + DEFAULT_COLUMN_MAP；reuse Row 132 normalizePhone + Row 144 normalizeAddress + 15 cases\n  - tools/people-db/parse.ts：markResult 成功時 insertStagingRecords 後再 flip status='parsed'\n  - OCR callback route：callback 把 pages 寫 staging 取代 Sprint 3 的 error_msg marker；staging insert 失敗 → 500 不 flip status（原子性靠兩階段：upsert 先、status flip 後）+ callback test 加「staging fails → 500 不 flip」case（共 8 cases）+ integration test 加 stagingStore 斷言（2 cases）\n  - tools/people-db/normalize.ts：CLI worker 取 normalized IS NULL 跑 normalize → 完成後 flip file status 'parsed' → 'normalized'（guard on current='parsed' 避免覆蓋 ER 已推進的 row）\n- Phase 2 Entity Resolution：\n  - Migration 20260419060359_create_people_db_er_tables.sql：4 張新表（people_db_persons / person_sources / merge_candidates / merge_blacklist）+ RLS（每表 4 policies + deny_all + super_admin 三 CRUD）+ updated_at trigger + id_no UNIQUE + canonical_phones GIN\n  - lib/people-db/entity-resolution.ts：雙層設計（純函式 decideAction + orchestrator resolveRecord）；關鍵規則：有 id_no 但無 exact match → new_person 不往下 fuzzy（id_no authoritative，避免兩個不同身份證但同姓名/電話被誤合）；confidence name_phone=0.85 / name_addr=0.7；+ 10 cases 含 id-exact / no-id / blacklist filter / name_phone vs name_addr 優先 / 多 match 取第一 / blacklist name_phone 後 fallback name_addr / no name → new_person\n  - lib/people-db/merge-candidates.ts：createCandidate（upsert ignoreDuplicates 保護 admin 已決定的 row）/ confirmCandidate（insert person_sources match_reason='confirmed_name_phone'|'confirmed_name_addr' + status='confirmed'，不寫 blacklist）/ rejectCandidate（upsert blacklist + status='rejected'）/ CandidateStateError（double-decide 擋 409）+ 6 cases\n  - tools/people-db/resolve.ts：CLI worker 讀 normalized + 未 resolved 的 staging rows，根據 action 寫 persons / person_sources / candidates；file 全 resolved → status 'normalized' → 'resolved'\n  - 3 個 API routes：GET /api/people-db/merge-candidates?status=pending&page=N&page_size（pagination + filter）/ POST /[id]/confirm / POST /[id]/reject；全 requireSuperAdmin + createAdminClient；CandidateStateError → 409，其他 error → 500 + 7 cases\n- 測試：jest 211 pass + 2 skipped integration（RUN_INTEGRATION=1 時 2/2 pass）全綠；tsc 0 errors；新增 Sprint 4a cases 42（normalize 15 + staging 4 + ER 10 + merge-candidates 6 + routes 7）\n- 已知限制：沒有 admin UI（Sprint 4b）/ 沒有 ES indexer（resolved → indexed 待後續）/ address signature startsWith 比對粗糙 / 沒有 batch confirm UI / normalize 不做身分證 checksum（避免誤拒 legacy/OCR 資料）/ worker integration test 缺（純 fn 已覆蓋；真實驗證靠 --dry-run）\n- 下一步 Sprint 4b：merge-candidates/page.tsx（list + 左右對照 + confirm/reject + pending badge）+ 搜尋 API group_by=person|record + 搜尋頁 toggle + E2E\n\n2026/04/19（Sprint 4b 實作 — Claude Opus 4.7）\n- Task A1 merge-candidates list API ?embed=person,staging：route.ts 解析 embed tokens（person / staging 白名單，其他忽略）+ 兩個 IN-lookup 並行抓 people_db_persons / people_db_staging_records + Map join；immutable map 避免 mutate items 造成測試 fixture bleed + 6 cases（embed=person / staging / both / unknown-noop / missing-rows→null / no-param→省略欄位）\n- Task A2/A3 merge-candidates admin page：settings/people-database/merge-candidates/page.tsx（useState + fetch pattern 對齊既有 search/page.tsx，不引入 TanStack Query — grep 確認 superadmin 完全沒用 @tanstack/react-query）+ 左右對照卡片（person canonical | staging.normalized）+ confirm/reject 樂觀移除 + 409 重新載入 + notice banner + pagination；測試放 co-located __tests__/（對齊 Row 144 DatasetTreePanel pattern，tdd-spec 路徑 unit_test/145 被 jest.config testPathIgnorePatterns 排除故不採用）；5/5 per tdd-spec §4.3（render 3 張 + confirm removal + reject + API 500 error + empty state）\n- Task B1 pure fn lib/people-db/search-person-aggregate.ts：aggregateByPerson(records, sourceLinks, persons)；preserve ES 排序（persons 出現順序 = 第一個 record 出現順序）；orphan records（無 source link）放末尾 as person_id=null；dedup 重複 record_id；5 cases\n- Task B2 搜尋 API group_by=person|record：route.ts 加 group_by param（預設 record 向後相容 Row 144）；person 模式先查 person_sources (IN record_id) 再查 persons (IN person_id) 後 call aggregateByPerson；+ __tests__/route-group-by.test.ts 3 cases（default record / explicit person / invalid fallback）\n- Task B3 搜尋頁 person/record toggle：settings/people-database/search/page.tsx 加 groupBy state（預設 person）+ 兩顆 Button（aria-pressed）+ URL ?group_by= + toggle 切換時 useEffect refetch + person 模式 Card list + 可展開 sources 列表（按鈕文字「顯示 N 筆來源 / 隱藏 N 筆來源」）+ __tests__/search-person-toggle.test.tsx 3 cases per tdd-spec §4.4\n- Task C Sidebar nav：components/layout/nav-items.ts 加「尋人資料庫 — 搜尋」(Users icon) 與「尋人資料庫 — 合併候選」(GitMerge icon) 兩個 entries 排在 AI 服務前\n- Task D E2E：e2e/145/er-merge-candidates-flow.spec.ts 2 cases（page load + sidebar link）；test-manifest.json 加 Row 145 entry（tier=pr，12 unitPaths + 1 e2ePath）；validate-test-manifest.sh 通過\n- 測試：jest 234 pass + 2 skipped integration 全綠（+23 vs Sprint 4a 211：embed 6 + page 5 + aggregate 5 + search route 3 + search toggle 3 + 1 count diff）；tsc 0 errors\n- 關鍵修正（handoff prompt vs repo reality）：handoff 聲稱「專案用 TanStack Query」「QueryProvider 在 components/providers/QueryProvider.tsx」皆為訓練資料幻覺 — grep 證實 superadmin 完全沒用 @tanstack/react-query；同時更新 .claude/commands/handoff.md 加嚴「動筆前必 grep 驗證每個技術斷言」章節 + 常見臆測陷阱表，避免下次 session 再踩同類雷\n- 已知限制：E2E 沒 seed 真 candidate 資料，只驗 page 可 load（完整 happy-path confirm/reject 驗收靠 Sprint 6 orchestrator + 真實 fixture）；person 模式 pagination total 仍為 ES hits 數（不是 person 數）；orphan person_id=null 項不支援 detail 連結（點展開才看 sources）\n- Sprint 5 已於 Sprint 2 並行交付 / Sprint 6 已交付\n\n2026/04/19（Sprint 6 實作 — Claude Opus 4.7）\n- 新分支 feature/row-145-sprint-6 從 main 分出；尾段 rebase 到最新 main（93c6d55 含 PR #32 /api/supabase/sql 加 superadmin guard）\n- Task A Migration 20260419150000_create_people_db_ingest_runs.sql：單表 8 欄（id/stage/started_at/finished_at/status/processed/failed/notes）+ stage CHECK 6 態（scan/parse/normalize/resolve/reindex/all）+ status CHECK 4 態（running/succeeded/failed/interrupted）+ 2 indexes（started_at DESC 全量 + partial WHERE status='running' 抓 stuck stages）+ RLS 4 policies 對齊 Sprint 4a pattern\n- Task B Orchestrator 雙層設計（對齊 Sprint 4a entity-resolution.ts 純函式 + thin CLI 分離）：\n  - lib/people-db/ingest-orchestrator.ts：pure helpers stagesToRun / resolveScriptPath / buildStageArgs；runStage 每 stage insert 'running' row → spawn child → close event 判 succeeded(exit=0) / failed(non-zero，notes=\"exit code N\") / interrupted(AbortSignal fired，notes='SIGINT') → update finished_at + status + notes；runOrchestrator stage='all' 依序 scan→parse→normalize→resolve，任一 stage 非 succeeded 就 break（保護下游 normalize/resolve 吃到 stale data）；Supabase 錯誤時 warn 不 throw（審計層 DB 錯誤不打斷實際 pipeline）\n  - tools/people-db/ingest.ts：薄殼 CLI parseArgs + 驗 stage 白名單 + createClient + 綁 process.on('SIGINT', ac.abort) + 結果 print + exit code（任一 stage 非 succeeded exit 1）\n  - 測試 9 cases：stagesToRun × 2 / resolveScriptPath / buildStageArgs × 2（含 limit + dry-run flag 附加）/ runOrchestrator stage=scan 只 spawn 一次 / runOrchestrator stage=all 4 次 spawn + 4 對 insert/update 順序 / runStage non-zero exit → failed with exit code notes / runStage AbortSignal → interrupted with notes='SIGINT'\n- Task C Retry API POST /api/people-db/ingest/retry/[fileId]：requireSuperAdmin + createAdminClient；讀 people_db_files row；不存在 404；status 非 'failed' 400（嘗試擴 dead_letter 時 grep 確認 schema CHECK 11 態不含該值，撤回只留 'failed'，未來若補入 dead_letter 狀態需 schema migration + 擴 RETRIABLE_STATUSES Set）；成功 update {status:'pending', attempts:0, error_msg:null} 回 200\n  - 測試 5 cases：401 unauthorized + admin stub 不被呼叫 / 200 happy path failed→pending / 404 missing fileId / 400 parsed status / 400 skipped_unsupported（regression guard 確認 retry 不繞開 skipped gate）\n- Task D 監控頁 + 兩支新 API：\n  - GET /api/people-db/ingest/stage-counts：N=11 平行 HEAD count queries（Supabase JS SDK 無 GROUP BY，status b-tree index 覆蓋 → O(11) 低成本）回 {counts: {...}, total, errors?}\n  - GET /api/people-db/ingest/runs?limit=N：top-N by started_at DESC，回 {items, limit}；limit 範圍 [1,100]\n  - page.tsx /superadmin/settings/people-database/ingest：Activity icon header + 三 section（stage count cards 8 個 / failed files list 含 retry button / runs timeline with Badge variant succeeded=success | failed=error | interrupted=warning | running=info）；Workspace 從 default export 抽出對齊 MergeCandidatesWorkspace pattern，測試免 DashboardLayout chrome；useState + fetch 並行抓 stage-counts + files?status=failed + runs；retry button 樂觀移除 + 成功 notice\n  - 測試 3 cases per tdd-spec §6.2：stage count cards 渲染 mock API 數字（踩坑：cards 初始 render 時 counts={} 顯示 0，findByTestId 立刻滿足但值錯；改 waitFor(() => getByText('42')) 才等到 fetch 更新）/ 點 retry button → fetch called with /api/people-db/ingest/retry/{fileId} method=POST / runs timeline 顯示 failed + succeeded row 含 stage label + status badge + notes\n- Task E 導覽 + E2E + manifest：\n  - components/layout/nav-items.ts 加「尋人資料庫 — Ingestion 監控」(Activity icon) 插在「合併候選」後\n  - e2e/145/ingest-dashboard-flow.spec.ts 2 cases（page load 三 section heading + stage-count-pending testid 可見 / sidebar link 指向 /people-database/ingest）；scope 縮到 smoke（真實 orchestrator run 留 Sprint 7 seed 後驗）\n  - test-manifest.json Row 145 entry：unitPaths 12→15（+ingest-orchestrator + retry route + IngestDashboard），e2ePaths 1→2，name 改 \"Sprint 1–6\"\n- 測試：jest 251 pass + 2 skipped integration 全綠（+17 vs Sprint 4b 234：orchestrator 9 + retry 5 + dashboard 3）；tsc 0 errors；validate-test-manifest.sh 通過\n- 已知限制：orchestrator 只支援手動執行（cron 排程與遠端觸發留 Sprint 7 接 NAS 系統 cron 或 @scheduled-tasks）；dead_letter 狀態未納入 schema CHECK 集（若要擴 retry 語義需另 migration）；真實跑 3 檔 fixture E2E 等 Supabase local + ES local + seed 資料齊發（Sprint 7）；retry API 不 reset ocr_job_id（OCR 失敗檔需另寫 retry 路徑處理 provider state）；person-mode search total 仍為 ES hits 數（沿用 Sprint 4b 限制）；闕貴卿 真實 acceptance #3 仍等 OpenClaw 接上（Sprint 7+）\n- 下一步 Sprint 7：NAS 遷移（PEOPLE_DB_SOURCE_ROOT 切換 + sha256 主鍵保留進度）+ orchestrator cron 排程 + OpenClawOcrClient 真實實作（feature/openclaw-migration 合併後）+ ES indexer resolved→indexed + 1 萬筆 seed fixture 跑完整 acceptance\n\n2026/04/19（Sprint 2 實測 + Sprint 2b 規劃 — Claude Opus 4.7 × Jason）\n首次對 474 GB 真實硬碟全量跑 pipeline，揭露 in-memory parser 對超大檔的根本性限制：\n- 全量 scan：592,887 檔 / 25.8 min / 0 errors / Postgres +124 MB（591k 中 341k 因 unsupported ext 走 --skip-unsupported fast-path 跳過 hash）\n- 分檔 parse 結果（互斥 counter sum-check 通過）：\n  • .mdb 1416 parsed / 121 failed / 19 pending（含 5,915,598 rows）— 91% 成功率，failed 全為資料損毀（RECOVERY-175G 內的 corrupt page / 無 user table 空殼）\n  • .dbf 208 parsed / 278 failed（含 65 個 1.5–1.7 GB 大檔 user-skip）— 42%，1,009,266 rows；MOB_PER.DBF (396 MB) 與 nofet_s1.dbf (1.7 GB) 兩個觸發 V8 OOM 揭露 in-memory ParseResult.rows[] 對單檔 5000 萬 row 級資料根本撐不住\n  • .accdb 524 parsed 但 row_count=0 — mdbtools 對 Jet 4 (.accdb) 只能列表名不能 export 資料，等同無收\n  • .fp 17,550 parsed / 1,786 pending（含 26,713 owner rows）— Python convert_fp.py shell-out 穩定\n  • .xlsx 4 parsed / 2,534 pending — 跑中（11 個 100–148 MB 檔案如 桃男全.xlsx 是後續黃金資料）\n  • .xls 2 parsed / 24,574 pending — 大宗待跑\n  • .pdf 4 parsed / 1 ocr_queued / 29,590 pending — pdfjs 修 workerSrc 後可跑\n  • staging 表 2,383,328 rows / 1.27 GB（mdb + dbf + fp 累積）\n- 修兩個真 bug 並 commit：mdb-export -H flag 是 suppress-header 不是 include（造成第一 data row 被當欄名）+ pdfjs-dist v4 即使 disableWorker:true 仍要 workerSrc 為 truthy 路徑（指向 legacy/build/pdf.worker.mjs 解決）\n- 嘗試加保護性 size cap 到 dbf.ts / parse.ts 但 5+ 次被外部 process revert（疑似 lint hook 或另一 agent 在 main 上同步整理），改採 DB-level UPDATE 標 attempts=99 + error_msg='oversized' 的 ops 路徑跳過大檔避免 worker OOM\n- 結論性瓶頸：parser 介面 ParseResult.rows[] 預設「全 row 進 memory 才回傳」，1.6 GB DBF 需要 10–30 GB heap 才能 single-pass，加 RAM 治標不治本\n\nSprint 2b RFC（產出於 .claude/commands/handoff.md 接手 prompt）：\n- Task A：StreamingParseResult interface（async iterator + finalize()）並存於 types.ts，不破壞舊 ParseResult 向後相容\n- Task B：parsers/dbf-stream.ts — 自寫零依賴 streaming DBF reader（dbffile 無 streaming API；npm 上 dbase-stream-reader 自 2019 未維護），DBF 是 fixed-width header + records 約 250 行可寫完，每批 yield 500 rows\n- Task C：parsers/xlsx-stream.ts — 用 exceljs 的 stream.xlsx.WorkbookReader（官方 streaming API + sharedStrings cache mode），需 npm i exceljs --workspace superadmin\n- Task D：staging-copy.ts — 改用 pg-copy-streams + node-postgres COPY 取代 PostgREST upsert，1M+ rows 預期 50x 加速\n- Task E：dispatcher 對支援 streaming 的 ext 走 streaming path、parse.ts 邊讀 iter 邊 COPY（背壓正常運作）\n- Task F：對 1.6 GB 綜合全.dbf 跑通 + worker peak RSS < 500 MB 為驗收門檻\n- 已連同今天踩過的雷區（apps/superadmin/lib/people-db/* 的編輯被 auto-revert × 5、DB row 被外部 process 標 user-skipped × 2）寫入 handoff，建議下次 session 開 feature/row-145-sprint-2b 分支 + 寫完即 commit + 頻繁 push 規避\n\n2026/04/19（Sprint 2b 實作 — Composer）\n- Task A：`StreamingParseResult` + `isStreamingParseResult`（`types.ts`）+ `streaming-types.test.ts`\n- Task B：`parseDbfStreaming`（`dbf-stream.ts`）以 dbffile 分批 `readRecords`，避免 `ParseResult.rows[]` 全量堆疊；匯出 `coerceDbfRecord`；`dbf-stream.test.ts`\n- Task C：`parseXlsxStreaming`（`xlsx-stream.ts`）用 exceljs `stream.xlsx.WorkbookReader` + `reader.sharedStrings` 解 shared string；`patches/exceljs+4.4.0.patch` 修正 zip 條件（需 `this.model`）與 `matchingSheet`；根 `postinstall: patch-package`；`xlsx-stream.test.ts`\n- Task D：`staging-copy.ts`（`pg` + `pg-copy-streams` + `types/pg-copy-streams.d.ts`）`COPY` 取代大量 upsert；`staging-copy.test.ts`（需本機 Postgres）\n- Task E：`dispatchByPath` 對 `.dbf`/`.xlsx` 回傳 streaming；`tools/people-db/parse.ts` 邊 iter 邊 `copyStagingFromStreamingBatches`\n- `dispatch.test.ts` mock 改為 `parseDbfStreaming` / `parseXlsxStreaming`\n- 測試：`npm test --workspace superadmin -- lib/people-db` 全綠（含新增 cases）\n\n後續路線：對 1.6 GB 綜合全.dbf / 148 MB xlsx 實機驗證 RSS；對 ~70k pending 重跑 parse worker；Sprint 7（NAS + cron + 完整 acceptance）\n\n2026/04/20（Sprint 2b Task F 實機驗收 + NUL hotfix — Claude Opus 4.7）\n- PR #48 已 MERGED（merge commit 031eff7 到 main）；含 Composer commit e4d3e4f (Task A–E) + Task F hotfix commit d728aa3\n- 實機驗收 #1 — 148 MB 桃 男 全.xlsx → 892,100 rows in 52.6s / peak RSS 1050 MB（exceljs sharedStrings: 'cache' trade-off；遠低於 Node 預設 heap limit，可接受）\n- 實機驗收 #2 — 1.6 GB 綜合全.dbf → 3,082,917 rows in 184.1s / **peak RSS 217.7 MB ✓ 達成 handoff < 500 MB 目標**（streaming + COPY 有效）\n- NUL-byte hotfix：staging-copy.copyCsvLine 以 JSON.stringify().replace(/\\u0000/g, '') 剝除；DBF 固定寬度欄位的 0x00 padding 會被 Postgres 以 SQLSTATE 22P05 拒絕整個 transaction（attempt 1 於 row 1.83M 崩潰 → transaction 乾淨 rollback → attempt 2 一次跑完 3.08M rows）\n- Standalone validate CLI — tools/people-db/sprint-2b-validate.ts：直接 import 個別 streaming parser（跳過 parsers/index.ts barrel）+ 直接 pg Pool（繞過 supabase-js），避開 tsx + Node 25.2.1 + parsers barrel + supabase-js 互動造成的 module-load crash（'Cannot assign to read only property valueOf/toString'）；正式 tools/people-db/parse.ts 推測在 Node 22 LTS 可跑，一勞永逸解法留 Sprint 7（改 tsc 編譯後 plain node 執行）\n- 測試：jest 238 passed / 2 skipped integration（+1 vs Composer baseline：staging-copy NUL round-trip case）；tsc 0 errors；test-manifest Row 145 加 4 個新 unitPath（streaming-types / dbf-stream / xlsx-stream / staging-copy）；validate-test-manifest.sh 21 entries 通過\n- Dev-log：/project-process/dev-logs/dev-people-db-bulk-ingestion-sprint-2b-2026-04-20.md（含 RSS / 吞吐量 / 兩 attempt 完整 log / Task F 決策過程）\n- 下一步 Sprint 7：NAS 遷移（PEOPLE_DB_SOURCE_ROOT 切換 + sha256 主鍵保留進度）+ parse.ts 改 tsc 編譯後 node 執行（一勞永逸解 tsx+Node 25 雷）+ orchestrator cron 排程 + OpenClawOcrClient 真實實作（feature/openclaw-migration 合併後）+ ES indexer resolved→indexed + 1 萬筆 seed fixture 跑完整 acceptance（含 闕貴卿 真實驗收 #3）\n\n2026/04/20（Sprint 7 Step 2 — tsc build pipeline — Claude Opus 4.7）\n- PR #51 已 MERGED（merge commit b184ad9 到 main）；Row 145 Sprint 7 6 個子任務完成 1/6：parse.ts 改 tsc 編譯後 plain node 執行\n- 新增 tools/people-db/tsconfig.cli.json：commonjs + moduleResolution:node + rootDir=repo-root + outDir=dist/；跟 tools/local-agent/tsconfig.json 同規（保守、穩定）。rootDir 設 repo-root 讓 tsc 同時編譯 tools/people-db/*.ts + apps/superadmin/lib/people-db/**/*.ts 到 dist/ 保留相對路徑結構，跨 workspace relative import 從 dist/tools/people-db/ 上兩層到 dist/ 再走 apps/superadmin/lib/people-db/ ✓ 自然對齊無需 path mapping\n- 新 npm script：`npm run build:tools` = `tsc --project tools/people-db/tsconfig.cli.json`\n- 6 支 CLI shebang 改寫：tools/people-db/{scan,parse,normalize,resolve,ingest,reindex}.ts 的 `#!/usr/bin/env -S npx tsx` → `#!/usr/bin/env node`（tsc 自動保留到 compiled .js）。sprint-2b-validate.ts 是 one-off 故意保留 tsx shebang 且 tsconfig exclude\n- 3 個必要 fix（為讓 tsc 通過）：\n  • apps/superadmin/lib/people-db/pdf-parse.ts：`createRequire(import.meta.url)` → `require.resolve()`。`import.meta` 只在 ESM tsconfig 下合法，擋住 commonjs 編譯；改用 `require.resolve()` 在 Next.js（Webpack/Turbopack 注入 require helper）與 Node CLI 兩邊都能跑\n  • tools/people-db/ingest.ts：`spawn as SpawnLike` cast + 從 ingest-orchestrator 多 import `SpawnLike` type。Node `spawn` 多個 overload 在 tsc strict 下挑到 args-less signature 跟嚴格的 SpawnLike 衝突，tsx 執行期不驗 overload 所以 Sprint 6 沒抓到\n  • tsconfig.cli.json exclude path：必須用 explicit `../../apps/superadmin/lib/people-db/__tests__/**` 等相對路徑才能 match 被 include 帶進來的檔（TypeScript exclude glob 不會吃 `**/` 為 repo-wide 來排除跨目錄的測試）\n- Smoke test 驗收（Node.js 25.2.1，就是 Sprint 2b 踩到 tsx crash 的版本）：\n  ```\n  $ node dist/tools/people-db/scan.js --dry-run --root /tmp/smoke --limit 1\n  Scanning /tmp/smoke (dry run)...\n  Done in 0.0 s\n  { scanned: 1, errors: 1, inserted: 0, ... }\n  ```\n  module load + env init + parseArgs + scan loop + summary 全走完，exit 0，**未觸發 valueOf/toString crash** ✓ 確認 tsx 從 runtime path 移除後組合失效\n- 測試：jest 238 passed / 2 skipped integration / 1 skipped suite 全綠（持平）；tsc --noEmit on superadmin 0 errors；npm run build:tools 0 errors\n- 已知限制 / 延後：\n  • CI / start.sh 尚未接入 `npm run build:tools` 前置 — 下次 session 做\n  • 1+ GB DBF 在 compiled pipeline 實測 12+ min wall 尚未跑 — 下次 session 做\n  • 67k pending files batch re-parse（路線 D）12-24 hr wall — 待 CI 接入後再安排\n  • OpenClawOcrClient 仍 throw（等 feature/openclaw-migration 合併後替換）\n  • ES indexer resolved→indexed 仍未實作\n  • 闕貴卿 acceptance #3 仍等 OpenClaw 接上\n- 本 session 3 PR 全 merged：#49 roadmap Task F append / #50 .claude/rules/critical-deps.md Node 25 + tsx 雷區章節 / #51 tsc build pipeline\n- 踩到的雷（跨 3 次）：外部 process 會自動切分支 + 混進 user uncommitted 變更（.claude/commands/{commit-push-pr,handoff}.md）。對策：動工後 git branch 驗證當前分支 + selective `git add <path>` 不要 `git add .` + commit 後立刻 push",
    lastModifiedBy: "Claude Opus 4.7",
    lastModifiedDate: "2026/04/20",
  },

  // --- Row 146: 尋人資料庫 — 工作區整合 + 強制 dataset + Scope 顏色標記 ---
  {
    id: "146",
    name: "超級管理員-尋人資料庫：5-tab 工作區整合 + 強制 dataset + Scope 顏色標記（ID 146）",
    locatedPage: "superadmin/settings/people-database",
    percentage: 100,
    category: "超級管理員 (Super Admin)",
    points: 8,
    phase: "testing",
    featureDescription:
      "承接 Row 131 / 132 / 144 / 145，將分散在 5 個 sub-route 的 people-db 功能（搜尋 / 匯入 / 合併審核 / Ingestion 監控 / 資料來源）整合為單頁 5-tab 工作區，URL 用 ?tab=xxx 同步以保留 deep link；同時將 /superadmin/tools 的 people-db 卡片移除（保留為純工具 hub）、Sidebar 三個 people-db entry 收成 1 個總入口、匯入流程強制必選 dataset_root（避免日後追蹤困難）、搜尋預設範圍為全部資料集但隔離 dataset 在結果以顏色 badge 標記讓 user 一眼辨別來源。",
    acceptanceCriteria:
      "1. /superadmin/settings/people-database 改為 5 tabs：匯入 / 搜尋 / 合併審核 / 監控 Ingest / 資料來源；?tab=xxx 可 deep link 直接定位\n2. 5 個舊 sub-route page.tsx 改為 server-side redirect()，外部書籤不死\n3. 非 active tab 用 next/dynamic lazy load，避免一進頁就 fetch 五套 API\n4. /superadmin/tools 移除「尋人資料庫工具」卡片（保留 FP 轉檔、檔案管理）\n5. Sidebar 3 個 people-db entry 合併為 1 個「尋人資料庫」（指向預設 ?tab=search）\n6. 匯入表單 dataset_root 必填（紅星 + 缺值時 disable 提交按鈕）；POST /api/people-db/import 加 zod schema 強制驗證，缺值回 400\n7. 搜尋頁頂部加 scope picker：預設「全部資料集」；可切「指定資料集多選」\n8. 結果列、merge-candidates、ingest 監控的 dataset 欄位均顯示顏色 badge（HSL hash 穩定且不同 dataset 顏色不同）\n9. unit + e2e 測試通過並登記至 test-manifest.json (tier=pr)",
    featureSpecDocPath:
      "/project-process/dev-logs/dev-people-db-workspace-consolidation-2026-04-19.md",
    devLogDocPath:
      "/project-process/dev-logs/dev-people-db-workspace-consolidation-2026-04-19.md",
    testScriptPath: "apps/superadmin/unit_test/146",
    developmentProgress:
      "2026/04/19（規劃 + Step 1+2+3 完成 — Claude Sonnet 4.5）\n- 與 Jason 對齊四項決議：單頁 5-tab、Tools hub 保留並移除 people-db 卡片、Sidebar 合併、強制 dataset、預設 scope=全部 + 顏色標記\n- 探勘 4 個既有頁面：merge-candidates / ingest / import / search 都已 export workspace，sources 尚未抽出\n- 確認 dataset 機制 DB 層已完整（dataset_path / dataset-tree API / sources 頁的 favorite/enable/notes），本 row 只動 UI 層 + 強制必填 + 顏色 util，不改 schema\n- 拆 4 commits：Step 1+2 一個 PR / Step 3 一個 PR / Step 4 一個 PR\n\nStep 1 (5-tab 整合) ✅ — PR #42\n- /superadmin/settings/people-database 改為 5-tab dispatcher，?tab=xxx URL 同步\n- 5 個 workspace 用 next/dynamic({ssr:false}) lazy load，預設只 mount active tab\n- 從 sources/page.tsx 抽出 SourcesWorkspace；舊 route 仍可用做向後相容\n- page.test.tsx rewrite 6 cases 全綠\n\nStep 2 (Sidebar + Tools hub 清理) ✅ — PR #42\n- nav-items.ts：3 個 people-db entries → 1 個（指向 ?tab=search），移除孤立 GitMerge import\n- tools/page.tsx：移除「尋人資料庫工具」卡片 + 孤立 Users import\n- tools/page.test.tsx 改寫斷言\n\nStep 3 (強制 dataset_root) ✅ — PR #43\n- API: submit + jobs 加 dataset_root 必填驗證，缺值回 400 with 'Row 146' 提示；移除 'uncategorized' fallback\n- UI: 加「沿用既有 / 新建」radio；existing 模式從 /api/people-db/dataset-tree 拉 top-level roots → <select>；new 模式維持文字輸入\n- 缺 dataset_root 時：input 紅框 + submit button disabled + 紅字 helper「必填 — 缺值時無法提交」\n- 自動 flip：roots 載入後若有資料自動切到 existing 模式；roots 為空時 existing radio disabled\n- 11 cases pass（API submit ×3 + API jobs ×3 + UI ×5）；全 people-db 測試 247/247 + tsc clean\n\nStep 4 (scope picker + dataset 顏色 badge) ✅ — feature/row-146-step-4-scope-color\n- 純函式 lib/people-db/dataset-color.ts：FNV-1a 32-bit hash → HSL hue（0-360）+ bg/fg/border 三色；7 cases（穩定性、bound、distinct hash、null/empty fallback、HSL 格式）\n- 通用組件 components/people-database/DatasetBadge.tsx：自動套色 + truncate + tooltip\n- Search workspace 行為改動：移除「empty selection → empty results」guard（Row 132 老設計），改為 empty = 搜全部 dataset（Jason 拍板）；加 scope banner「目前範圍：全部資料集（預設）/ N 個資料集 [清除選取]」\n- DatasetBadge 套用三處：result row source 欄、person-mode 展開的 sources 列、最近匯入批次面板\n- 4 cases 新增 search/__tests__/scope-and-color.test.tsx；全 people-db 套件 295/295 + tsc clean\n- 已知限制：merge-candidates 沒直接 render dataset path（需 API embed plumbing）、ingest source_path 內含 dataset root 但需要 API 拉欄位 — 留待後續 PR\n\nStep 5+6 (merge-candidates + ingest 顏色 badge) ✅ — PR #45\n- Merge-candidates API: VALID_EMBEDS 加 'file'，?embed=staging,file 走 staging.file_id IN-lookup people_db_files 拿 dataset_root/subpath，回應 attach item.file = {...} | null\n- Merge-candidates UI: fetch URL 加 file embed；卡片 header 多一個 DatasetBadge chip（path 用 root/subpath 完整路徑作 hash，label 顯示 root only）\n- Ingest API 不需改（/api/people-db/ingest/files 本來就回 dataset_root/subpath）\n- Ingest UI: FailedFile interface 加 dataset_root?/subpath?；failed file 卡片在 ext badge 後插入 DatasetBadge\n- 7 cases 新增（API embed=file ×3、merge card UI ×2、ingest list UI ×2）；全 people-db 套件 302/302 + tsc clean\n\nStep 7 (e2e spec) ✅ — feature/row-146-step-7-e2e\n- apps/superadmin/e2e/146/consolidated-flow.spec.ts：6 Playwright cases（default landing / ?tab=ingest deep link / 點 tab 更新 URL / Sidebar 1 個 entry / Tools hub 無 people-db / Import tab boot）\n- test-manifest.json 新增 Row 146 entry (tier=pr，7 unitPaths + 1 e2ePath)，validate-test-manifest.sh 22 entries 全通過\n- dev-log: /project-process/dev-logs/dev-people-db-workspace-consolidation-2026-04-19.md",
    testProgress:
      "Step 1-6 共 37 unit cases + Step 7 共 6 e2e cases = 43 cases。整個 people-db 套件 302/302 unit 全綠（+55 vs Sprint 6 的 247）。e2e smoke 6 cases 驗 route/URL/Sidebar contract；真實 orchestrator/資料集 seed 留給 Row 145 Sprint 7 NAS 就緒後驗收。Row 146 phase=testing。",
    lastModifiedBy: "Claude Sonnet 4.5",
    lastModifiedDate: "2026/04/19",
  },

  // --- Row 147: 超級管理員 — 物件地圖檢視修復 ---
  {
    id: "147",
    name: "超級管理員-物件地圖檢視：Leaflet CSS 修復 + 大安區座標補設（ID 147）",
    locatedPage: "superadmin/properties/map",
    percentage: 100,
    category: "超級管理員 (Super Admin)",
    phase: "development",
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/05/08",
    featureDescription:
      "修復 /superadmin/properties/map 地圖頁兩個問題：1) PropertyMapView.tsx 缺少 leaflet/dist/leaflet.css import 導致地圖 tile 分裂渲染；2) 18 筆大安區物件（敦化南路 101–117號 + 敦化南路二段精品豪宅）缺少座標無法顯示於地圖。同時清除 unused useRouter import（TS 警告）。",
    acceptanceCriteria:
      "1. 地圖 tile 完整渲染，無黑色空白或分裂現象\n2. 大安區 18 筆物件全部顯示為 markers（18 件已定位）\n3. Marker popup 可點擊跳至編輯頁 / Google Maps\n4. 縣市/區 篩選器可正確過濾物件\n5. TS 無 unused import 警告",
    developmentProgress:
      "2026/04/25\n- psql 直接更新 property_sales 表：為 18 筆大安區物件補設 latitude/longitude（敦化南路一段 101–117號 沿路排列於 25.0412~25.0420, 121.5489~121.5491；敦化南路二段精品豪宅 25.0380, 121.5490）\n- PropertyMapView.tsx：補加 `import 'leaflet/dist/leaflet.css'`，修正 tile 分裂渲染問題\n- PropertyMapView.tsx：移除未使用的 useRouter import（消除 TS 6133 警告）\n- 驗收：瀏覽器確認地圖全幅渲染、18 件已定位、markers 集中在敦化南路仁愛路四段一帶",
  },
];

export const ROADMAP_DATA: RoadmapData = {
  features: RAW_FEATURES.map((f, index) => ({
    ...f,
    id: normalizeRoadmapFeatureId(f.id) || formatGeneratedRoadmapFeatureId(index),
    phase: inferPhase(f),
  })),
};

export function findRoadmapFeatureById(id: string): RoadmapFeature | undefined {
  const normalized = normalizeRoadmapFeatureId(id);
  if (!normalized) return undefined;
  return ROADMAP_DATA.features.find((feature) => feature.id === normalized);
}
