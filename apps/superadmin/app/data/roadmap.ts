// This file is auto-generated from the original roadmap.js
// Date: 2026-02-14

/** Lifecycle phase of a feature */
export type PhaseType = "development" | "testing" | "deployment" | "operations";

export interface RoadmapFeature {
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
  lastUpdated: string;
  features: RoadmapFeature[];
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
    name: "超級管理員-儀表板",
    locatedPage: "superadmin/dashboard",
    percentage: 98,
    acceptanceCriteria:
      "1. 登入後首頁需顯示系統關鍵指標(KPI)，包含總用戶數、總物件數、成交金額。\n2. 需提供圖表視覺化呈現最近30天的平台流量趨勢。\n3. 儀表板需顯示待處理的審核事項通知。\n4. 需支援數據篩選功能，可依日期區間查看統計數據。\n5. 頁面載入速度需在2秒內完成，確保良好的使用者體驗。",
    docPath: "/project-process/features/admin-dashboard-20260206.md",
    featureSpecDocPath: "/project-process/features/admin-dashboard-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-admin-dashboard-20260221.md",
    category: "超級管理員 (Super Admin)",
    points: 8,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/04/11",
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
    name: "超級管理員的RBAC CRUD平台",
    locatedPage: "superadmin/dashboard/rbac_access_control",
    percentage: 95,
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
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/26",
    phase: "development",
    developmentProgress:
      "Permission Matrix 完整 DB 持久化：新增 iam_role_permissions 表（migration 20260226100000）、getRolePermissions / saveRolePermissions server actions；RolesTab 改為從 DB 載入/儲存角色權限，儲存前有 dirty 提示，儲存中 spinner；修復 iam_user_group_memberships view + parent_role_id 欄位未套用問題。",
  },
  {
    name: "超級管理員-雲端空間管理平台",
    locatedPage: "superadmin/dashboard/storage",
    percentage: 70,
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
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/02/21",
    phase: "development",
    developmentProgress:
      "storage_quotas migration (RLS + updated_at trigger)；actions.ts 補強 getStorageQuotas/setUserQuota/batchDeleteFiles（分塊批次刪除）；StorageDashboardClient 已有 quota tab + 孤兒檔案清理。",
  },
  {
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
    name: "超級管理員-資料庫Elastic Search管理功能",
    locatedPage: "superadmin/dashboard/elasticsearch",
    percentage: 80,
    phase: "testing",
    acceptanceCriteria:
      "1. 顯示 Elasticsearch 叢集狀態（健康度、索引數量、文件總數）。\n2. 可執行搜尋查詢並預覽結果（最多100筆）。\n3. 支援手動重建索引（Reindex）操作。\n4. 顯示各索引的磁碟使用量。\n5. 異常狀態（Yellow/Red）需自動警報管理員。",
    docPath: "",
    featureSpecDocPath: "/project-process/features/elasticsearch-management.md",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    testLogDocPath:
      "/project-process/test-logs/test-elasticsearch-management-2026-04-12.md",
    category: "超級管理員 (Super Admin)",
    points: 5,
    testStatus: "in_progress",
    testCoverage: 75,
    unitTestCoverage: 80,
    e2eTestCoverage: 70,
    defectCount: 0,
    lastModifiedBy: "Claude",
    lastModifiedDate: "2026/04/12",
    developmentProgress:
      "2026-04-12: 建立 /api/elasticsearch Next.js API 代理路由（health / stats / search / reindex）；修正 dashboard page 的 TypeScript 型別問題（移除 any）及 XSS 安全問題（stripHtml 防護）；改用內部 API proxy；新增 Elasticsearch 側邊欄導覽；完成單元測試 20 個案例 + E2E 測試 8 個案例。",
  },
  {
    name: "超級管理員AI LLM API效能監控－AI語音回應可靠度監控功能",
    locatedPage: "superadmin/dashboard/llm-monitor",
    percentage: 70,
    acceptanceCriteria:
      "1. 即時顯示各 LLM API 的請求數量、平均回應時間、錯誤率。\n2. 可設定 API 使用量預算上限與警示閾值。\n3. 提供每日/每週 Token 消耗統計與費用估算。\n4. 語音回應品質分數（延遲、斷句率）需以圖表呈現。\n5. API 密鑰輪換提醒功能（距離過期 30 天前通知）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    devLogDocPath:
      "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md",
    category: "超級管理員 (Super Admin)",
    points: 8,
    lastModifiedBy: "GPT-5.2",
    lastModifiedDate: "2026/04/04",
    phase: "development",
    developmentProgress:
      "連接真實 ai_performance_metrics 資料表，page.tsx + LLMMonitorClient + actions (getLLMMetrics/getLLMAggregateStats/getLLMOverallStats)；每模型效能比較表、最近請求記錄。\n\n### 2026-04-04 監控可追到 Prompt / 模組 / 成功失敗\n- 新增 ai_usage_logs 監控欄位（prompt source/version/hash、request_path、response_status 等）。\n- 物件介紹文案 AI（/api/property-description/stream）每次嘗試會寫入 ai_usage_logs（含成功/失敗、tokens、延遲、provider/model）。\n- llm-monitor 頁面新增「AI 使用紀錄（含 Prompt / 模組 / 狀態）」表格（最新 100 筆）。",
  },
  {
    name: "超級管理員-網路安全－隱私審計管理功能",
    locatedPage: "superadmin/dashboard/security",
    percentage: 60,
    acceptanceCriteria:
      "1. 提供資料存取稽核日誌，記錄誰在何時存取了哪些敏感資料。\n2. 自動偵測異常登入行為（不常用設備、異地登入）並警示。\n3. 支援設定 IP 白名單與黑名單。\n4. 個資保護合規報告（GDPR/PDPA）一鍵生成。\n5. SSL 憑證到期前 30 天自動提醒。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-superadmin-platform-20260221.md",
    category: "超級管理員 (Super Admin)",
    points: 5,
    lastModifiedBy: "OpenAI Codex (DevOps Agent)",
    lastModifiedDate: "2026/04/14",
    phase: "development",
    developmentProgress:
      "2026/04/14 (VIS-68, DevOps Agent)\n" +
      "- ✅ DB migration: security_audit_enhancements（audit_logs 增強、IP 白黑名單表）\n" +
      "- ✅ Security Dashboard 頁面 /superadmin/dashboard/security（SecurityDashboardClient 626 行）\n" +
      "- ✅ Server actions: getAuditLogs, getIPRules, addIPRule, removeIPRule\n" +
      "- ✅ Sidebar nav-items 新增 Security 入口\n" +
      "- ✅ Middleware 整合 IP 白黑名單檢查\n" +
      "- ✅ SSL 憑證監控腳本 scripts/ssl-cert-monitor.js\n" +
      "- 待完成：合規報告生成、異常登入自動偵測邏輯優化",
  },
  {
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
    name: "買家的溝通中心",
    locatedPage: "web/buyer/contracted/communication",
    percentage: 65,
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
      "2026/04/12：完成買家溝通中心頁面 `/buyer/contracted/communication`，整合既有 messageService 輪詢，提供訊息列表、已讀回條、關鍵字與日期區間搜尋、PDF/圖片附件驗證（10MB）與系統通知區塊；並於已簽約買家儀表板新增導流入口。",
    testProgress:
      "2026/04/12：新增 `apps/web/lib/buyer-communication/__tests__/utils.test.ts`，覆蓋附件驗證、訊息過濾與已讀回條文案，`npm run test --workspace web -- buyer-communication` 通過；E2E 待在登入測試環境補齊。",
    lastModifiedBy: "GPT-5 Codex (CTO)",
    lastModifiedDate: "2026/04/12",
  },
  {
    name: "買家的繳費記錄",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 顯示所有付款紀錄（日期、金額、類型、付款方式、狀態）。\n2. 支援下載單筆收據（PDF格式）。\n3. 可依日期範圍、金額、付款狀態篩選。\n4. 顯示未付款項目提醒與到期日。\n5. 年度付款總額統計與圖表。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "買家 (Buyer)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },

  // 公司首頁與產品
  {
    name: "公司首頁",
    locatedPage: "web/",
    percentage: 98,
    acceptanceCriteria:
      "1. 首頁需在 3 秒內完成首屏渲染（LCP < 2.5s）。\n2. 清楚展示產品核心功能（房東管理、租客管理、AI功能）。\n3. 包含客戶見證/評價區塊（至少3則）。\n4. CTA 按鈕（立即試用、聯絡我們）可正常觸發對應頁面。\n5. RWD 支援：手機/平板/桌機版面正確顯示。",
    docPath: "/project-process/features/company-homepage.md",
    featureSpecDocPath: "/project-process/features/company-homepage.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 5,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/22",
    phase: "development",
    developmentProgress:
      "首頁 Hero 與 metadata 已從單一房東工具重新定位為多角色不動產 AI 協作平台；Header banner、FeaturedProperties、Footer CTA、services 頁、Testimonials 與 FAQ 文案已同步對齊，並補上 HeroSection、FeaturedProperties、Testimonials、FAQ、Footer、services 導流測試。另新增 public marketing funnel Playwright 測試，覆蓋首頁進 pricing/services，以及 pricing、services、about、properties 導向 contact 的公開漏斗。下一步可接上真實 lead funnel tracking。",
  },
  {
    name: "公司產品費用說明頁",
    locatedPage: "web/pricing",
    percentage: 90,
    acceptanceCriteria:
      "1. 清楚列出各方案（免費版、基本版、進階版）的功能對比表格。\n2. 月付/年付切換，年付顯示折扣比例。\n3. FAQ 區塊涵蓋常見費用問題（至少5項）。\n4. 「立即購買」按鈕連結至付款流程。\n5. 費用說明需包含幣別（AUD/TWD）切換功能。",
    docPath: "/project-process/features/multi-role-business-plan-20260322.md",
    featureSpecDocPath:
      "/project-process/features/multi-role-business-plan-20260322.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 2,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/22",
    phase: "development",
    developmentProgress:
      "已將 web/pricing 重構為多角色商業模式版本：新增免費流量入口、仲介個人版、分店管理版、企業合作版、按案件專業角色價格表、方案比較矩陣、FAQ 與 CTA 導流；CTA 已接到 contact 詢問表單，並補上 TWD/AUD、月付/年付與 CTA 連結測試。下一步是接上真正的付款流程或 CRM lead tracking。",
  },
  {
    name: "公開案件市場頁",
    locatedPage: "web/properties",
    percentage: 78,
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
    name: "公開案件詳情頁",
    locatedPage: "web/properties/[id]",
    percentage: 94,
    acceptanceCriteria:
      "1. 詳情頁需清楚呈現案件屬於買賣或租賃協作鏈。\n2. 顯示推薦接手角色與案件協作節點。\n3. 保留物件基本資訊、價格、地點與聯絡卡。\n4. 找不到案件時正確走 notFound 流程。\n5. 有對應回歸測試覆蓋主要協作內容與 notFound 行為。",
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
      "web/properties/[id] 已從單純物件詳情頁調整為案件協作視角：新增買賣 / 租賃協作鏈 badge、推薦接手角色、案件協作節點與案件說明，並保留原有價格、地圖與聯絡卡。PropertyContactCard 已把看房、法律諮詢、合作提案三種入口改為帶有 property context 的真實導流連結；另補上 detail page、contact card、notFound 測試，以及從公開案件列表進入 detail、再驗證登入後三種 CTA 都能把 inquiryType、entryPoint、property context 正確帶入 contact 的 Playwright E2E。這次也一併修正了 property detail SSR 使用舊版 Supabase helper 導致 header 已登入但 contact card 仍顯示 guest 狀態的 session 不一致問題。",
  },
  {
    name: "公司平台介紹與支援導流頁",
    locatedPage: "web/about",
    percentage: 88,
    acceptanceCriteria:
      "1. 關於頁需清楚說明產品已轉型為多角色不動產 AI 協作平台。\n2. 需呈現免費角色、付費角色與專業協作角色的分層定位。\n3. 需說明台灣 / 澳洲市場策略與按案件 / 物件收費模型。\n4. 頁面需提供導向 pricing、services、properties 與 contact 的 CTA。\n5. 需有對應回歸測試覆蓋主要平台敘事與 CTA 連結。",
    docPath: "/project-process/features/multi-role-business-plan-20260322.md",
    featureSpecDocPath:
      "/project-process/features/multi-role-business-plan-20260322.md",
    tddSpecDocPath:
      "/project-process/features/tdd-company-pages-thirdparty-20260221.md",
    category: "公司頁面 (Company Pages)",
    points: 2,
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/22",
    phase: "development",
    developmentProgress:
      "web/about 已從舊的物業管理品牌頁重構為多角色平台介紹頁：補上平台使命、角色分層、台灣 / 澳洲市場策略、案件協作流程與 Need Help 導流區塊，CTA 已連到 pricing、services、properties 與 contact；已新增 about page 回歸測試，並納入 public marketing funnel Playwright 流程，驗證公開導流可回到 pricing 與 contact。",
  },
  {
    name: "公司產品教學",
    locatedPage: "web/tutorial",
    percentage: 60,
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
    lastModifiedBy: "Architect Agent",
    lastModifiedDate: "2026/04/12",
    developmentProgress:
      "架構實作完成：tutorial 角色選擇頁（SSG Server Component）、[role] 教學步驟頁（Client Component + useTutorialProgress hook）、靜態 TypeScript 教學資料模組（lib/tutorial-data.ts）。進度以 localStorage 儲存，支援完成徽章。單元測試（web app + superadmin row tests）與 E2E 規格已建立。待完成：截圖資產製作、Supabase 進度同步（Phase 2）。ADR：/docs/technical-selection/adr-019-company-product-tutorial.md",
  },
  {
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
    name: "房東-儀表板",
    locatedPage: "web/landlord/dashboard",
    percentage: 90,
    acceptanceCriteria:
      "1. 顯示名下所有物件概況（總數、出租中、空置、待售）。\n2. 顯示本月租金收入總額與趨勢圖表（與上月對比）。\n3. 即時顯示待處理事項（待審核租客申請、維修請求、合約即將到期）。\n4. 快速連結至各主要功能（新增物件、收款記錄、聯絡租客）。\n5. 儀表板載入時間 < 2 秒，數據不超過24小時快取。",
    docPath: "/project-process/features/landlord-dashboard-status-20260206.md",
    featureSpecDocPath:
      "/project-process/features/landlord-dashboard-status-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 8,
    lastModifiedBy: "Gemini-3-Pro-Preview",
    lastModifiedDate: "2026/02/06",
  },
  {
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
    name: "房東新增物件方式1－手動輸入",
    locatedPage: "web/landlord/properties/add",
    percentage: 85,
    acceptanceCriteria:
      "1. 表單欄位涵蓋：物件名稱、地址、坪數、樓層、房型、月租金/售價、設備清單。\n2. 必填欄位驗證，地址需連結 Google Maps 確認。\n3. 支援一次上傳最多20張物件照片。\n4. 草稿自動儲存，可返回繼續填寫。\n5. 發布後物件立即顯示於可見清單中。",
    docPath: "/project-process/features/landlord-features.md",
    featureSpecDocPath: "/project-process/features/landlord-features.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
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
    name: "房東的預約看房管理功能",
    locatedPage: "web/landlord/appointments",
    percentage: 75,
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
    lastModifiedBy: "Paperclip CTO",
    lastModifiedDate: "2026/04/14",
    devLog:
      "[2026/04/12] (Paperclip CTO)\n• 補齊房東預約 API 狀態變更通知：confirmed/cancelled/completed 會寄送訪客 Email（含取消原因）。\n• 新增房東預約月曆視圖，顯示每日時段與筆數。\n• 新增 Row 029 對應單元測試與 TDD Progress Report。\n[2026/04/14] (Paperclip CTO, VIS-92)\n• 於共用 workspace 重跑 `appointment-notifications` / `appointment-calendar` 單元測試：2 suites、4 tests 全通過。\n• 新增彙總文件 `project-process/test-logs/tdd-progress-029.md`。",
  },
  {
    name: "房東的客戶－Details模式",
    locatedPage: "web/landlord/customers",
    percentage: 80,
    acceptanceCriteria:
      "1. 顯示單一客戶的完整資料（個人基本資料、聯絡方式、租賃/購屋意向、看房紀錄）。\n2. 客戶狀態標籤（潛在/洽談中/已成交/已失效）可快速切換。\n3. 可記錄跟進備註，備註需有時間戳與操作者。\n4. 顯示與該客戶的溝通紀錄摘要（最新5條）。\n5. 提供「發送訊息」快捷按鈕直接進入溝通頁面。",
    docPath: "/project-process/test-logs/test-landlord-customers-details-2026-04-12.md",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    testScriptPath: "apps/superadmin/unit_test/030",
    e2eTestCoverage: 0,
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "GPT-5 Codex",
    lastModifiedDate: "2026/04/12",
    devLog:
      "2026/04/12\n- `apps/web/app/(dashboard)/landlord/customers/page.tsx` 新增 Details 側欄模式（完整資料、狀態快速切換、意向、看房紀錄區塊、跟進備註、最新 5 筆溝通摘要、發送訊息快捷按鈕）\n- `apps/web/app/(dashboard)/landlord/customers/customer-details.ts` 抽離 Details 資料解析與序列化工具，兼容舊 notes 純文字\n- `apps/web/app/(dashboard)/landlord/customers/__tests__/customer-details.test.ts` 新增 6 個單元測試；覆蓋 status 正規化、follow-up/communication append、payload parse/serialize",
  },
  {
    name: "房東的客戶－Grid模式",
    locatedPage: "web/landlord/customers",
    percentage: 80,
    acceptanceCriteria:
      "1. 以卡片網格形式顯示客戶列表，每卡顯示頭像、姓名、狀態、最後聯絡時間。\n2. 支援欄數切換（2欄/3欄/4欄）。\n3. 卡片點擊進入 Details 模式。\n4. 支援拖曳重新排序（依優先級）。\n5. 懸停卡片顯示快速操作（發訊息、修改狀態）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "OpenAI Codex (Fullstack Agent)",
    lastModifiedDate: "2026/04/14",
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
    name: "房東的客戶－List模式",
    locatedPage: "web/landlord/customers",
    percentage: 0,
    acceptanceCriteria:
      "1. 以表格列表形式顯示客戶，欄位可自訂顯示/隱藏。\n2. 支援依姓名、狀態、最後聯絡時間排序。\n3. 支援多選批次操作（批次發訊息、批次修改狀態）。\n4. 搜尋欄可即時過濾姓名/電話/Email。\n5. 支援 CSV 匯出客戶列表。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    name: "房東的客戶－新增客戶",
    locatedPage: "web/landlord/customers",
    percentage: 0,
    acceptanceCriteria:
      "1. 表單含：姓名、電話、Email、意向（租/買）、預算、備註。\n2. Email 格式驗證，電話號碼格式驗證。\n3. 同一 Email 已存在時提示重複並詢問是否合併。\n4. 新增成功後自動跳轉至客戶 Details 頁。\n5. 支援從名片圖片 OCR 自動填入（可選）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    name: "房東的客戶－成交客戶",
    locatedPage: "web/landlord/customers",
    percentage: 0,
    acceptanceCriteria:
      "1. 已成交客戶可選擇標記為「買家」或「已簽約租客」。\n2. 標記後自動建立對應角色的基本資料與儀表板。\n3. 成交資訊記錄：成交日期、成交物件、成交金額。\n4. 成交客戶不可刪除，只能封存（以保留歷史紀錄）。\n5. 成交數量統計顯示於儀表板指標卡。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
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
    name: "一鍵生成物件銷售部落格",
    locatedPage: "superadmin/properties/[id]/edit?tab=blog",
    percentage: 80,
    acceptanceCriteria:
      "1. 輸入物件 ID，AI 自動生成包含物件亮點的銷售文案（500-800字）。\n2. 生成文案可人工編輯後發布。\n3. 自動插入物件照片（最多5張）至文章內容。\n4. 生成時間 < 15 秒。\n5. 支援多語版本生成（繁體中文、英文）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "GPT-5.3-Codex",
    lastModifiedDate: "2026/03/22",
    devLog:
      "### 2026-03-19 全面優化部落格生成功能\n- 抽出 HTML 模板邏輯至 lib/utils/blogTemplate.ts（pure functions，保持 blog.ts 在 500 行以內）\n- 串接 Claude claude-sonnet-4-6 API（generateDescriptionWithAI）：依物件資料生成 150-250 字專業中文銷售文案\n- 修復 CTA 空 href：新增 getOwnerContact() 從 users_profile + auth.users 取得電話/email，寫入 tel:/mailto:\n- 新增重新生成確認機制：已發佈狀態點「重新生成」先顯示警告，5 秒自動取消\n- 新增 updatePropertyBlog() server action：支援手動修改 title / excerpt，同步更新 contentHtml hero title\n- 草稿狀態也顯示預覽連結（附「草稿，需登入」標註）\n- 新增 SEO 預覽面板：模擬 Google SERP 呈現 seoTitle / seoDescription / slug\n\n### 2026-03-22 模板可維護性強化\n- 完成 8 個獨立模板檔（local 4 + google_blogger 4）註解區塊細化，統一為 STYLE IDENTITY / LAYOUT RULES / COMPONENT RULES / EDITABLE GUIDANCE 結構\n- 補齊模板維護註記，降低後續人工調整 Prompt 時的修改風險與理解成本",
  },
  {
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
    name: "房東財務－收支明細儀表板",
    locatedPage: "web/landlord/finance",
    percentage: 0,
    acceptanceCriteria:
      "1. 顯示選定月份的收入/支出圓餅圖與明細。\n2. 支援日/月/季/年時間範圍切換。\n3. 收支類別可自訂（如「維修費」「管理費」）。\n4. 顯示淨利潤趨勢折線圖（最近12個月）。\n5. 一鍵匯出財務報表（PDF/Excel）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
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
    name: "房東的溝通頁面",
    locatedPage: "web/landlord/messages",
    percentage: 0,
    acceptanceCriteria:
      "1. 集中顯示與所有租客/買家/仲介的訊息對話。\n2. 左側為對話列表（含未讀數徽章），右側為對話內容。\n3. 支援訊息搜尋（依關鍵字）。\n4. 可傳送文字、圖片、附件（最大10MB）。\n5. 可設定自動回覆訊息（不在線時啟用）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    name: "房東的物件展示功能－Details模式",
    locatedPage: "web/landlord/properties/[id]",
    percentage: 0,
    acceptanceCriteria:
      "1. 顯示物件完整資訊（照片輪播、地址、格局、設備、租金/售價）。\n2. 顯示物件當前狀態（空置/出租中/待售/已售）。\n3. 顯示看房預約列表（最近10筆）。\n4. 提供物件 QR Code 分享功能。\n5. 可直接從物件詳情頁面觸發生成銷售部落格。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    name: "房東的物件展示功能－Grid模式",
    locatedPage: "web/landlord/properties",
    percentage: 0,
    acceptanceCriteria:
      "1. 以卡片網格形式展示物件（每行3-4筆），卡片含縮圖、物件名、租金/售價、狀態。\n2. 支援依租金/售價、狀態、地區排序篩選。\n3. 卡片點擊進入物件 Details 頁。\n4. 支援快速切換物件狀態（不需進入詳情頁）。\n5. 空置物件卡片以視覺標示突出（如淡灰底色）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
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
    name: "房東的物件展示功能－List模式",
    locatedPage: "web/landlord/properties",
    percentage: 0,
    acceptanceCriteria:
      "1. 以緊湊表格形式列出所有物件，欄位含：物件名、地址、類型、月租/售價、狀態、最後修改。\n2. 點擊欄標題可排序。\n3. 多選後可批次修改狀態。\n4. 搜尋欄即時過濾（依物件名/地址）。\n5. 每頁顯示筆數可設定（20/50/100）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 2,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    name: "房東的維修派工管理",
    locatedPage: "web/landlord (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 顯示所有維修請求列表（物件、申請人、描述、狀態、申請日期）。\n2. 可指派維修人員，並設定預約維修日期。\n3. 維修人員接單後租客收到通知（含到訪時間）。\n4. 維修完成後附上費用單與工作說明，租客確認後結案。\n5. 維修費用自動計入物件支出記錄。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
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
    name: "房東的客戶-租客篩選功能",
    locatedPage: "web/landlord/customers",
    percentage: 0,
    acceptanceCriteria:
      "1. 依信用分數、月收入、職業類型對申請租客進行排序篩選。\n2. 提供自動化評分機制（根據填寫資料評估租客適合度）。\n3. 可設定篩選條件範本（如「月收入需為月租3倍以上」）。\n4. 篩選結果可一鍵發送面談邀請。\n5. 不合格申請者可禮貌性自動回絕（附原因說明範本）。",
    docPath: "",
    tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
    category: "房東 (Landlord)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
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
    name: "租客(已簽約)-儀表板",
    locatedPage: "web/tenant/contracted/dashboard",
    percentage: 90,
    acceptanceCriteria:
      "1. 顯示租約基本資訊（物件地址、月租金、合約期限、剩餘天數）。\n2. 顯示下次繳費截止日與金額。\n3. 快速入口：維修申請、溝通中心、合約下載。\n4. 顯示最新通知（房東公告、維修進度更新）。\n5. 頁面載入時間 < 2 秒。",
    docPath: "/project-process/features/tenant-dashboards-20260206.md",
    featureSpecDocPath:
      "/project-process/features/tenant-dashboards-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "租客 (Tenant)",
    points: 5,
    lastModifiedBy: "Gemini-3-Pro-Preview",
    lastModifiedDate: "2026/02/06",
  },
  {
    name: "租客(潛在)-儀表板",
    locatedPage: "web/tenant/potential/dashboard",
    percentage: 90,
    acceptanceCriteria:
      "1. 顯示正在洽詢的物件列表（物件基本資訊、看房預約狀態）。\n2. 可在此發起看房預約或取消預約。\n3. 顯示已查詢物件歷史（最近10筆）。\n4. 推薦相似物件功能（依瀏覽偏好）。\n5. 提供申請入住按鈕（需上傳基本資料）。",
    docPath: "/project-process/features/tenant-dashboards-20260206.md",
    featureSpecDocPath:
      "/project-process/features/tenant-dashboards-20260206.md",
    tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md",
    category: "租客 (Tenant)",
    points: 5,
    lastModifiedBy: "Gemini-3-Pro-Preview",
    lastModifiedDate: "2026/02/06",
  },
  {
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
    name: "電子簽約功能",
    locatedPage: "web (待建)",
    percentage: 0,
    acceptanceCriteria:
      "1. 生成合約後可發送電子簽署邀請至買賣/租賃雙方 Email。\n2. 每一方在安全連結中完成電子簽名（手寫簽名或文字簽名）。\n3. 所有方完成簽署後，生成合法效力的電子合約（含簽署時間戳）。\n4. 已簽署合約以 PDF 格式自動發送至所有簽署方。\n5. 合約簽署狀態可即時追蹤（待某方簽署/全部完成）。",
    docPath: "",
    tddSpecDocPath:
      "/project-process/features/tdd-contracts-payments-20260221.md",
    category: "合約與法務 (Contracts & Legal)",
    points: 8,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },

  // 通用/系統
  {
    name: "一鍵切換UI風格：暗/亮模式",
    locatedPage: "全站",
    percentage: 98,
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
    lastModifiedBy: "Google Gemini 2.5 Flash (UI/UX Agent)",
    lastModifiedDate: "2026/04/14",
  },
  {
    name: "RWD網頁響應式設計",
    locatedPage: "全站",
    percentage: 80,
    acceptanceCriteria:
      "1. 手機（320px+）、平板（768px+）、桌機（1024px+）三種斷點下版面正確顯示。\n2. 導航選單在手機版切換為漢堡選單（Hamburger Menu）。\n3. 所有表單元素在手機版觸控操作友善（最小觸控區域44x44px）。\n4. 圖片採用響應式圖片（srcset），依裝置解析度載入適當尺寸。\n5. 手機版首屏渲染 < 3 秒（4G網路環境）。",
    docPath: "/project-process/features/company-homepage.md",
    featureSpecDocPath: "/project-process/features/company-homepage.md",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 5,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
    name: "使用者身份驗證系統",
    locatedPage: "web/login, web/register, superadmin/middleware",
    percentage: 95,
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
    lastModifiedBy: "Claude Opus 4.6",
    lastModifiedDate: "2026/04/13",
  },
  {
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
    name: "使用者密碼重設頁面",
    locatedPage: "web/forgot-password, web/update-password",
    percentage: 95,
    acceptanceCriteria:
      "1. 輸入 Email 後發送密碼重設連結，連結有效期1小時。\n2. 點擊連結後進入重設頁面，輸入新密碼（需輸入兩次確認）。\n3. 重設成功後前一個 Session 自動登出。\n4. 重設連結只能使用一次，使用後失效。\n5. 24小時內申請重設次數上限5次（防止暴力攻擊）。",
    docPath: "/project-process/features/auth-system.md",
    featureSpecDocPath: "/project-process/features/auth-system.md",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },
  {
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
    name: "謄本權狀掃描功能",
    locatedPage: "web/landlord/properties/add",
    percentage: 95,
    acceptanceCriteria:
      "1. 上傳謄本/權狀文件（JPG、PNG、PDF），系統自動辨識並擷取關鍵資訊。\n2. 擷取資訊包含：地段、地號、面積、所有權人、抵押設定。\n3. OCR 準確率在清晰文件下達 90% 以上。\n4. 擷取結果可人工校正，並儲存至物件資料。\n5. 文件儲存至雲端，可隨時下載原始掃描檔。",
    docPath: "/project-process/features/vlm-ocr-system.md",
    featureSpecDocPath: "/project-process/features/vlm-ocr-system.md",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 5,
    lastModifiedBy: "Trae AI",
    lastModifiedDate: "2026/03/15",
    devLog:
      "[2026/03/15] (Trae AI)\n• 支援地端 (Local) 與雲端 (Cloud) 雙機制切換\n• 實作 CJK 相容字元正規化與控制字元清理\n• 完善建物與土地謄本的欄位對應邏輯",
    devLogDocPath: "/docs/operational-guides/transcript-parsing-guide.md",
  },
  {
    name: "上傳物件照片功能",
    locatedPage: "web/landlord/properties/add",
    percentage: 95,
    acceptanceCriteria:
      "1. 支援一次選擇並上傳最多20張照片。\n2. 上傳格式支援 JPG、PNG、WebP，單檔最大 10MB。\n3. 上傳時顯示進度條，支援斷點續傳。\n4. 上傳後可拖曳排序，設定封面照。\n5. 系統自動生成壓縮縮圖（Thumbnail），用於列表預覽。",
    docPath: "/project-process/features/photo-upload.md",
    featureSpecDocPath: "/project-process/features/photo-upload.md",
    tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
    category: "通用/系統 (General/System)",
    points: 3,
    lastModifiedBy: "",
    lastModifiedDate: "",
  },

  // 金流支付
  {
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
    category: "通用/系統 (General/System)",
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
    category: "通用/系統 (General/System)",
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
    name: "超級管理員-AI 服務設定（API 金鑰與模型費用）",
    locatedPage: "superadmin/settings/api_key_and_model_setting",
    percentage: 86,
    acceptanceCriteria:
      "1. API 金鑰管理：從 .env 導入、單筆/全部刪除、金鑰驗證。\n2. 未登入時以 resolveUserId fallback 寫入/讀取 Supabase（keys/models/modules/prompts）。\n3. 側欄組態概況：已選總 models 數量即時反映各 provider 勾選加總。\n4. 儲存設定按鈕：將畫面上已選模型寫入 ai_model_selections。\n5. 分頁命名：模型費用說明；說明文案導向「模型費用說明」分頁。",
    docPath: "/docs/update-project-progress-guide.md",
    featureSpecDocPath: "/project-process/features/tdd-ai-settings-20260221.md",
    tddSpecDocPath: "/project-process/features/tdd-ai-settings-20260221.md",
    category: "超級管理員 (Super Admin)",
    points: 5,
    devLog:
      "### 2026-03-04 更新\n- 修復 AI 模型全域評測 Prompt 測試功能無限重渲染 bug（Maximum update depth exceeded）。\n- 根本原因：page.tsx 每次渲染時 currentKeys 產生新陣列引用，導致 allRows→handleBatchTest→headerActionsRef useEffect 形成無限迴圈。\n- 修復方案（雙重防護）：(1) ModelEvaluator.tsx 使用 stable ref 模式（handleBatchTestRef + stableRunBatchTest），移除 handleBatchTest 作為 useEffect dep；(2) page.tsx 以 useMemo 穩定 currentKeys 引用。\n- TDD：新增 5 個批次測試執行行為測試案例，共 28 個測試全部通過。\n\n### 2026-03-06 更新\n- 在「已選/可選模型評估」分頁列右側新增「AI 模型全域評測」按鈕。\n- 按鈕重用既有 isEvalToolbarOpen 狀態，僅切換本頁全域評測面板顯示，不影響其他頁面功能。\n- 補上 aria-controls 對應面板 id（global-test-settings-panel），強化可及性。\n\n### 2026-03-06 更新（調整）\n- 移除 ModelEvaluator 表頭「AI 模型全域評測」按鈕與 onOpenGlobalTestPanel 相關程式碼。\n- 移除 settings/api_key_and_model_setting 的 `*-global-test` hash 入口，`#blog-global-test` 不再觸發對應頁面行為。\n- 同步刪除已不適用的按鈕行為測試案例，避免測試與現況不一致。\n\n### 2026-03-06 更新（獨立頁）\n- 「AI 模型全域評測」按鈕改為固定顯示在分頁列右側，不再只在 evaluations 分頁顯示。\n- 按鈕改為導向獨立頁 `/superadmin/settings/evaluations-global-test`，不再綁定 `#evaluations` 或本頁內嵌面板開關。\n- 移除 api_key_and_model_setting 內嵌的 AI 模型全域評測面板，避免與獨立頁重複。\n\n### 2026-03-06 更新（批次報告）\n- 批次測試完成後，自動將結果快照寫入 localStorage（最近一次報告）。\n- 新增「檢視最近報告」動作，透過 headerActionsRef 暴露給頁首按鈕呼叫。\n- 在「開始全域評測」旁新增「檢視最近報告」按鈕，使用者可隨時重新開啟最近一次批次結果視窗。\n\n### 2026-03-06 更新（UX 精簡）\n- 將右側設定區主流程收斂為「雲端 Prompt 選擇/載入 + 儲存雲端新版本 + 開始全域評測」。\n- 補上「載入雲端 Prompt」明確動作，避免僅選取下拉選單卻未真正載入內容的混淆。\n- 將本機 Prompt、下載、刪除雲端等操作收進「進階設定」摺疊區，降低主畫面複雜度。\n\n### 2026-03-06 更新（提示與確認流程）\n- 將 evaluations-global-test 頁面的 window.alert / window.confirm 全數移除，改為頁內 inline 提示訊息。\n- 刪除本機 Prompt 與刪除雲端 Prompt 改為「二次點擊確認」流程，避免誤刪且不中斷操作。\n- 提示訊息統一在右側設定區顯示，成功/錯誤/資訊狀態一致化。\n\n### 2026-03-06 更新（最近報告一鍵修正）\n- 新增「套用最近報告修正狀態」按鈕，將最近批次報告一次套用到模型分類與狀態。\n- 依報告內容自動推斷 `display_status_override`（VLM/LLM/不可用）並同步更新 `is_working`、`notes`、`last_tested_at`。\n- 套用後即回寫 ai_model_evaluations，避免逐筆手動調整模型狀態。\n\n### 2026-03-06 更新（移除混亂控件）\n- 依使用者回饋移除右側設定區的雲端 Prompt 管理與進階設定區塊（含載入、版本命名、儲存版本、本機 Prompt、刪除與下載）。\n- 僅保留核心流程：上傳測試檔案、編輯全域評測 Prompt、開始全域評測、檢視最近報告、套用最近報告修正狀態。\n\n### 2026-04-09 更新\n- 將 `/superadmin/settings` 首頁入口與 `api_key_and_model_setting` 頁面的跳轉按鈕命名統一為「AI 模型全域評測」。\n- 將 `/superadmin/settings/evaluations-global-test` 頁內主標題與麵包屑同步調整為「AI 模型全域評測」。\n- 將 settings 相關使用者可見文案、元件註解與規劃文件同步收斂為「AI 模型全域評測」與「全域評測 Prompt」等一致說法。\n- 保持既有路由不變，只修正跨頁入口、頁內標題與說明文案命名一致性。\n\n### 2026-04-11 更新\n- BottomSheetTabs 在「OCR解析設定」左側新增「LLM Leader Board」分頁（`#llm-leaderboard`）。\n- 新增 `GET /api/artificial-analysis/llm-leaderboard`：伺服器端抓取 artificialanalysis.ai leaderboard SSR HTML 並解析表格列；前端 `LlmLeaderboardPanel` 以 EnhancedTable 呈現並每日自動同步、可手動刷新。\n\n### 2026-04-11 更新（Qwen 整合）\n- 新增 Qwen（Alibaba DashScope / 通義千問）為第 11 家 AI 供應商，API 金鑰導入、驗證、連線測試、OCR 謄本解析全流程打通。\n- `AIProvider` 型別擴充 `'qwen'`；`AI_PROVIDERS` 新增 Qwen 卡片，內含 qwen-max / qwen-plus / qwen-turbo / qwen-vl-max / qwen-vl-plus / qwq-32b-preview 六個模型與定價。\n- `/api/ai-settings/keys/validate`：新增 `validateQwen`，主打 DashScope 國際區 OpenAI-compatible `/models` 端點，404/403 時回退 `/chat/completions` 1-token 探針。\n- `/api/ai-settings/models/test`：新增 `testQwen`，支援 qwen-vl-* 模型以 image_url 內嵌圖片進行多模態測試。\n- `lib/utils/ai-api-callers.ts`：新增 `callQwen`，供 OCR 謄本解析（TRANSCRIPT_PARSE_PROMPT）與多模型共識使用，強制 JSON 輸出格式。\n- Migration `20260411120000_add_qwen_provider.sql`：將 `'qwen'` 加入 `ai_api_keys` / `ai_model_selections` / `ai_chat_logs` / `ai_model_evaluations` / `ai_key_validation_cache` 五張表的 provider CHECK constraint。\n- UI 細節：`ApiKeyManager` 自動從 `AI_PROVIDERS.map` 渲染出 Qwen 卡片，新增 Qwen 品牌紫色 `#615CED`；`ModelSettingsModal` 的 `PROVIDER_DOCS` 補上 Qwen API 參數連結。",
    testProgress:
      "TDD: 28/28 tests passing（含 統一/單一 prompt 測試功能完整測試）",
    testCoverage: 15,
    testScriptCount: 28,
    testScriptPassedCount: 28,
    lastModifiedBy: "Claude Opus 4.6",
    lastModifiedDate: "2026/04/11",
  },

  // === 2026-02-21 新增任務 ===
  {
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
    name: "超級管理員-物件管理（新增物件含媒體上傳）",
    locatedPage: "superadmin/properties",
    category: "超級管理員 (Super Admin)",
    percentage: 96,
    phase: "development",
    lastModifiedBy: "Gemini-3-Flash-Preview",
    lastModifiedDate: "2026/04/04",
    devLog:
      "### 完成項目\n- getOwnersList() / createProperty() server actions（lib/actions/properties.ts）\n- CreatePropertyInput / OwnerOption 型別（lib/types/properties.ts）\n- PropertyCreateModal.tsx：含完整 6 頁籤（物件基本資訊 / 物件照片 / 謄本 / 權狀 / 合約 / 部落格）；兩段式建立流程：第一次儲存建立物件取得 ID，後續 tabs 接入 PropertyMediaSection；物件類型與所有權人建立後鎖定\n- PropertiesList.tsx：新增物件按鈕接入 PropertyCreateModal，onCreated 觸發 router.refresh()\n- properties/page.tsx：並行 fetch getAllProperties() + getOwnersList() 後傳入 PropertiesList\n### 2026-04-02 新增\n- PropertyMediaSection：floor_plan 頁籤新增已上傳格局圖 inline 預覽卡片，圖片直接顯示、PDF 以內嵌預覽呈現，避免使用者只能看檔名與外部連結\n- floor_plan 上傳區新增待上傳預覽，選檔後即可先確認檔案內容，再決定是否送出\n- 新增 PropertyMediaSection.test.tsx，覆蓋既有格局圖預覽與上傳後刷新預覽兩個情境，並以 Jest `--runTestsByPath` 驗證通過\n### 2026-04-03 新增\n- PropertyEditForm：在「使用分區」右側新增「地理資訊」分頁（PropertyGeographicInfoTab），顯示結構化地址、WGS84 座標與 Google Maps / OpenStreetMap 外部連結；雙圖資來源（歷史圖資展示系統 / 地理資訊e點通）各支援地籍圖、建物套繪圖、合併擷取，結果 signed URL 預覽並寫入 property_documents\n### 2026-04-03 補強（TDD / 穩定性）\n- 有 WGS84 時僅傳座標至 fetchCadastralMap（不再併傳門牌，避免混淆）；擷取結果列表 key 改為 storagePath；刪除改以 documentId + storagePath 辨識；ArcGIS job 輪詢第一次立即查狀態；物件編輯頁 export maxDuration=120s；新增 buildOperationalLayers / fetchCadastralMap 來源矩陣與 PropertyGeographicInfoTab 互動測試（Jest 22 例）\n### 2026-04-03 實價成交三報表（近一年）\n- lib/utils/real-price-comparables.ts：六都方圓 1km／其他縣市 2km、同街段（路街或謄本地段）、同里；Haversine 與近一年篩選\n- LVR_COMPARABLES_JSON_PATH：伺服器讀取正規化 JSON 陣列作為成交來源（未設定則表格為空仍產出 PDF）\n- lib/actions/transaction-comparables.ts：generateTransactionComparableDocuments 產出三份 PDF 寫入 property_documents（tags comparable:auto + comparable:kind:*），重產時取代同類舊檔\n- PropertyMediaSection 成交行情表：一鍵產出三份；新增 document_type transaction_comparables_nearby / _street_section / _village\n- PropertyGeographicInfoTab：村里欄位寫入 details.addressVillage；updateProperty / getPropertyById / getAllProperties 串接\n- real-price-comparable-pdf.ts（pdf-lib + Noto Sans TC woff2）、單元測試 real-price-comparables.test.ts\n### 2026-04-04 實價行情優化 (TDD)\n- **PDF 內容空白修復**: loadComparableSalesFromDb 實作分頁抓取（最高支援 10,000 筆），解決行政區成交量大於 1,000 筆時資料池不完整導致的空白問題。\n- **字體渲染修復**: PDF 優先載入 macOS 系統 `Arial Unicode.ttf`，徹底解決 Noto Sans 子集缺少中文字元導致的報表空白問題。\n- **自動定位強化**: 整合 `geocodeAddress` 多重定位策略，成功後自動同步座標回 DB；附近成交價新增「自定義半徑選擇器」(0.5km - 5.0km)，提升查詢靈活性。\n- **驗證**: 建立 `comparables.test.ts` 驗證過濾邏輯，並透過 `diagnosis.test.ts` 完成生產資料連通性檢查。",
    developmentProgress:
      "物件列表與編輯功能（含 PropertyEditModal + PropertyMediaSection）已完成；實價行情功能已達成 TDD 綠燈狀態，支援分頁大數據、自定義半徑與精確字體渲染。下一步：表單欄位前端 validation、建立後自動跳至媒體頁籤。",
  },
  {
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
    name: "雲端 OCR 多模型共識謄本解析",
    locatedPage: "superadmin/properties",
    category: "超級管理員 (Super Admin)",
    percentage: 99,
    phase: "testing",
    testCoverage: 60,
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/14",
    testStatus: "in_progress",
    docPath: "/docs/implementation-plans/consensus-transcript-parsing-plan.md",
    devLog:
      "### 完成項目\n- DB Migration：ocr_parse_results 表 + property_documents 新增 consensus_metadata / parse_strategy 欄位\n- TypeScript 型別：ModelParseResult / ConsensusMetadata / ConflictDetail / JudgeResolution\n- Feature Module：拆分 online_ocr → online_ocr_parse（解析組）+ online_ocr_judge（裁判組）\n- 共識演算法：transcript-consensus.ts — 多模型 majority vote、台灣特規正規化、信心分數\n- AI API 共用呼叫器：ai-api-callers.ts — 支援 OpenAI/Anthropic/Gemini/DeepSeek/Grok\n- 共識引擎 Server Action：consensus-parse.ts — 平行呼叫 → 共識投票 → 裁判仲裁 三階段流程\n- 向下相容：parse-transcript.ts 改為 wrapper 委派至共識引擎\n- UI 更新：PropertyMediaSection 新增信心徽章、衝突明細面板、共識 metadata 顯示\n- FeatureModuleSelector 提示文字：解析組建議 2~3 模型、裁判組為可選配置\n### 2026-03-04 新增\n- SSE 串流 API：/api/transcript-parse/stream — POST 端點，以 ReadableStream 逐模型即時回傳解析進度事件\n- TranscriptParseSection 元件：從 PropertyMediaSection 拆出（原 610 行降至 387 行），新增：(1) 可收折「解析設定」面板（顯示已設定之解析/裁判模型、一次性 Prompt 覆寫欄位、跳轉 AI 設定連結）；(2) 解析中以逐模型進度列表取代單一轉圈，即時顯示各模型狀態（等待/解析中/完成/失敗）及耗時\n### 2026-03-07 新增/調整\n- 解析模型單一事實來源：TranscriptParseSection 僅使用 online_ocr_parse 模組綁定的 assigned_models，移除與 AI 模型全域評測 441 個候選模型的耦合，避免使用者在兩處重覆設定\n- 每次謄本解析最多呼叫 5 個成功解析模型：依 OCP 排序逐一呼叫模型，成功數達 5 即停止；若前幾個失敗則依序啟用後續模型，避免一次對數十/數百模型發送 API 呼叫\n- 裁判模型排序備援：後端依 online_ocr_judge 的 assigned_models 順序（含本次 overrideJudgeModel）輪流嘗試裁判模型，任一成功即套用其判決；全部失敗時回退至多模型共識結果\n- JSON 安全性強化：transcript-parse/stream 與 consensus-parse 在儲存裁判 raw_output 時採用 try/catch 保護，裁判回傳畸形 JSON 時僅記錄 error_message，不再中斷整體解析流程\n- 物件編輯頁解析設定 UX：AI 解析謄本設定面板顯示本次實際使用的解析/裁判模型，支援 per-run 勾選啟用與一次性 Prompt 覆寫，並確保畫面與後端實際呼叫模型一致",
    developmentProgress:
      "核心架構與 UI 已完成。2026-03-14 地端 Python 解析器全面升級：(P0.1) schema_converter.py 直接輸出 TranscriptParseOutput 統一格式，消除 buildFromLocalPython 橋接函式；(P1.2) 每個欄位附帶 field_confidences（regex 命中=1.0，空值=0.0）；(P2) local/route.ts 優先呼叫 HTTP 服務（port 8819），HTTP 不可用時自動降級至 CLI subprocess；(P0.2) PDF 無文字層（422）時前端自動觸發雲端解析；(P1.1) 地端解析結果可作為 local/local-regex-parser 虛擬模型注入共識 Pipeline；(P3) CJK 正規化擴充：全形小寫字母、括號變體、全形冒號/標點、日文漢字（証→證、様→樣等）。\n### 2026-03-18 新增\n- 解析 Prompt 加入「他項權利部特別說明」：全款購屋無貸款的謄本無他項權利部時，AI 必須輸出 encumbrances: []，不得填入含空字串的物件。\n- 建物/土地謄本表單：謄寫後若 encumbrances 為空陣列，顯示「（空白）－本物件目前無他項權利部」提示訊息，取代舊有的空白表單；使用者點擊「新增他項權利」即可繼續手動填寫。\n- 裁判模型更新為 3 組循序備援：Claude 3.5 Sonnet → Gemini 2.5 Flash → GPT-4o。\n- 謄本種類感知地端解析來源提取：kind = land 時優先使用 landTranscript，kind = building 時優先使用 buildingTranscript。\n- 謄寫前清除所有欄位（clear-first）：所有欄位（header / description / ownership / encumbrances）在謄寫前以 empty* 工廠函式清空，避免不同謄本的資料混入。\n- OCR 未設定模型警告：按下解析按鈕且無可用模型時，顯示 amber 警告並附設定頁連結，取代「所有模型失敗」的錯誤列表。",
  },
  {
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
    name: "FinePrint .fp 謄本轉檔工具",
    locatedPage: "tools/fp-converter",
    category: "通用/系統 (General/System)",
    percentage: 100,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/18",
    devLog:
      "### 完成項目\n- 逆向工程 FinePrint .fp 二進位格式：發現文字以 UTF-16LE 儲存於固定結構 record（magic: 0x1E ?? 0x40 YY，其中 ??=8+YY×4），無需 Windows 或 FinePrint 即可解析\n- tools/fp-converter/convert_fp.py — CLI 工具，支援三種輸出格式：HTML（推薦）/ Markdown / PDF（fpdf2）\n- 批次測試 109 份「新謄本」資料夾中的 .fp 檔案，全部 109/109 成功轉換，0 失敗\n- HTML 輸出包含完整謄本結構（建物標示部、所有權部、他項權利部、抵押權等），PingFang TC 字型，支援瀏覽器列印為 PDF\n- tools/fp-converter/README.md 完整使用說明\n### 2026/03/18 排版大幅改善\n- 移除全域去重邏輯：改用 content-based 頁碼偵測（第N頁共N頁 pattern），正確保留所有重複結構詞（民國/年/月/日/：）\n- 新增 X-座標感知提取，辨別右對齊 content token vs 頁尾 token\n- 日期片段自動合併：民國 NNN 年 NN 月 NN 日 → 單一字串\n- 單字拆分修正：連續單字元 CJK token 在「：」前自動合併為複合標籤（層數/總面積/住址）\n- 全新表格式 HTML 排版：官方謄本樣式（深藍標題列、欄位表格、位置列）\n- 建物標示部/所有權部欄位正確 label:value 對應（登記日期、登記原因、建物門牌等）",
    developmentProgress:
      "完整實作：可在 macOS 批次將 10 年前 Windows FinePrint .fp 格式謄本轉換為 HTML/MD/PDF，無需任何 Windows 環境。",
  },
  // === 2026-03-20 小型 UX 更新 ===
  {
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
    name: "超級管理員-合約套版多範本選擇器",
    locatedPage: "superadmin/properties/[id]/edit?tab=contract",
    category: "超級管理員 (Super Admin)",
    percentage: 85,
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
    name: "物件部落格多平台發布",
    locatedPage: "superadmin/properties/[id]/edit?tab=advertisement_creators",
    category: "超級管理員 (Super Admin)",
    percentage: 99,
    phase: "development",
    docPath: "/project-process/features/property-advertisement-workflow-redesign-20260330.md",
    featureSpecDocPath:
      "/project-process/features/property-advertisement-workflow-redesign-20260330.md",
    featureDescription:
      "Blog tab 重構為三平台架構：地端 Supabase（現有）、Google Blogger（OAuth2 + Blogger API v3）、Facebook 粉絲頁（Page Access Token + Graph API）。新增「參考網頁風格 URL」功能（用戶貼上任何物件廣告網址，AI 分析設計語言後生成風格相似銷售頁面）與「風格預設選擇器」（4 個預設：豪宅暗色調/清爽明亮/商務簡潔/溫馨日系），不需參考 URL 即可快速生成高品質頁面。設定頁 /superadmin/settings/integrations 管理第三方平台整合。",
    acceptanceCriteria:
      "1. Blog tab 有平台選擇器（Supabase / Google Blogger / Facebook）。\n2. 風格預設選擇器（4 個預設）或參考 URL 擇一使用，AI 生成對應風格 HTML。\n3. Google Blogger OAuth 流程完整（授權 → callback → 儲存 token → 發布）。\n4. 帳號已連但無部落格時顯示引導建立 Blogger 的友善提示。\n5. Facebook Page Access Token 驗證成功後可發布至粉絲頁。",
    lastModifiedBy: "GPT-5.4",
    lastModifiedDate: "2026/03/30",
    developmentProgress:
      "已完成：DB migration、Google OAuth2 routes、Blogger API v3 CRUD、Facebook Graph API、integrations server actions、BlogSupabasePanel/BlogGooglePanel/BlogFacebookPanel 拆分、平台選擇器、風格預設選擇器（4 個預設 + Claude 生成）、參考 URL 輸入、StylePreset 型別與 blog.ts 整合、BlogGooglePanel 帳號連結但無部落格友善提示修復、Google Blogger 在有參考 URL/風格預設時改為先重新生成再發布（含同步更新流程）並新增單元測試覆蓋。新增：地端 4 份 + Google Blogger 4 份，共 8 份獨立模板檔，並以 targetPlatform 明確切分生成來源，便於後續維護與版本管理。2026/03/22 補強：`blog_posts` 改為真正以 stylePreset + targetPlatform 讀寫與回查、PropertyBlogGenerator/BlogSupabasePanel/BlogGooglePanel/PropertyBlogStyleRowActionCells 全面改為 variant-aware 資料流，避免不同樣式/平台互相讀錯文章；Google OAuth callback 不再自動選第一個 Blogger blog；新增 BlogGooglePanel 與 Google callback 單元測試。2026/03/22 第二波補強：將 reference URL 正式納入 `blog_posts` variant identity 與查詢條件，避免同樣式但不同參考網址互相覆蓋，並把 `blogReferenceUrl` 同步到 URL query 以支援重新整理後仍能定位到正確 variant。2026/03/23 驗證：已在 local Supabase 套用 `20260322223000_add_blog_post_variant_identity.sql`，新增 `lib/actions/blog.test.ts` 驗證 reference URL normalization 與 null-variant lookup，新增 `PropertyBlogGenerator.test.tsx` 驗證 blogPlatform / blogStylePreset / blogReferenceUrl 的 query restore 與 sync/clear 行為，並新增 Playwright `property-blog-query-sync.spec.ts` 實測 superadmin 物件編輯頁在切換 Google Blogger / 商務簡潔樣式 / 參考網址後，重新整理仍能保留 query 與 UI 狀態。2026/03/30 補充：已完成新版「物件廣告生成流程重規劃 Spec」、Wireframe/元件結構稿、Implementation Tasks，以及更細的開發順序文件 `/project-process/features/property-advertisement-dev-order-20260330.md`。同日已開始落地第一張工單：PropertyBlogGenerator 先接上新的 content-first builder 骨架，將內容區塊、風格選擇、草稿概念與輸出流程改成 step-based 版面，同時保留既有 query restore 與平台發布能力。本次再完成第二張工單：新增 readiness summary、可勾選的內容區塊卡片，以及「系統模板 / 參考網址模式」互斥切換，並同步更新 Jest 與 Playwright query-sync 規格。接著完成第三張小工單：readiness summary 不再使用靜態 mapping，先改由 property 真實欄位動態判斷基本資料、照片、介紹與定位可用性，並新增 property-advertisement-readiness utility 與對應單元測試。最新進度再擴充為 8 個內容區塊：除了基本資料、照片、介紹、定位外，已納入謄本連結、建物與土地面積明細表、權狀連結、物件格局圖；單筆物件載入流程也會同步帶入 hasTranscript / hasTitleDoc / hasFloorPlan 等文件旗標，讓 builder 在編輯頁可依真實資料來源動態顯示可用性。Step 3 也已從 placeholder 改為可操作的「生成廣告草稿」主 CTA，會依目前選定的平台、模板或參考網址直接呼叫既有 variant-aware generate flow，讓使用者不必再依賴下方樣式列按鈕才能開始。最新補齊：selected sections 已正式帶入 generatePropertyBlog action 與 AI prompt context，並持久化到 `blog_posts.generation_context`；前端在生成完成後與重新整理後都會顯示「本次草稿帶入內容」摘要，讓 builder 的內容選擇不再只是暫時 UI 狀態。最新再補上 canonical builder draft persistence：PropertyBlogGenerator 已重用既有 `form_drafts` + localStorage helper，自動保存平台、風格模式、preset/reference URL 與 selected sections，重新整理或回到同一物件時會先還原最近 builder 狀態，同時保留 URL query override 能力。另已擴充 Playwright `property-blog-query-sync.spec.ts`，加入 builder draft restore / query override 流程，並把登入改為讀取 `PLAYWRIGHT_SUPERADMIN_EMAIL` / `PLAYWRIGHT_SUPERADMIN_PASSWORD`，同時改成 serial 以避免共享 draft 狀態互相干擾；目前在本地因未提供有效測試帳密而安全 skip。待完善：在有效 superadmin 測試帳號可用後，補跑完整端到端驗證。",
  },
  {
    name: "租客維修申請系統",
    category: "租客 (Tenant)",
    percentage: 80,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/22",
    developmentProgress:
      "已完成：maintenance.ts server actions（getMyMaintenanceRequests、createMaintenanceRequest、cancelMaintenanceRequest、getLandlordMaintenanceRequests、updateMaintenanceRequest）、租客維修頁面（/tenant/maintenance）含提交表單與狀態追蹤、房東維修管理頁面（/landlord/maintenance）含列表/篩選/狀態推進/備註輸入、房東 Sidebar 加入維修管理導覽。待完善：照片上傳、廠商指派、費用結算。",
  },
  {
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
    name: "Contact Leads 指派負責人與備註系統",
    category: "超級管理員 (Super Admin)",
    percentage: 90,
    phase: "development",
    lastModifiedBy: "Claude Sonnet 4.6",
    lastModifiedDate: "2026/03/22",
    developmentProgress:
      "已完成：DB migration 20260322190000（contact_messages 新增 assignee_id/assignee_name、新增 contact_lead_notes 表含 RLS）、actions.ts 新增 getSuperadminUsers、assignContactLead、getContactLeadNotes、addContactLeadNote、deleteContactLeadNote server actions、ContactLeadAssigneeForm 元件（下拉選擇負責人/儲存指派）、ContactLeadNotesSection 元件（新增/刪除備註、note_type: note/reply/internal）、ContactLeadsTable 新增負責人欄位、[id]/page.tsx 整合三個新區塊（訊息+指派/備註）。批次狀態更新前端 UI 已完整（既有功能）。所有現有 Jest 測試（17 tests）均通過。",
  },
  {
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
    name: "AI Prompt 安全強化（SSoT + Injection 防護 + 審計 + Rate Limit + Auto-seed）",
    locatedPage: "docs/ai-prompt-safety-guide.md",
    percentage: 100,
    acceptanceCriteria:
      "1. 建立 docs/ai-prompt-safety-guide.md 工程指導手冊（6 條核心原則 + 標準流程 + Checklist）。\n2. 建立 lib/ai/prompt-safety.ts 共用模組（resolveSystemPrompt / wrapUserInput / detectInjectionAttempt / validateUserSuppliedPrompt）。\n3. 修復 3 個 Injection 漏洞：test endpoint user prompt、transcript-parse customPrompt、property-description buildFacts。\n4. 遷移 4 組 hard-code prompt 到 saved_prompts.module_key（transcript.parse / transcript.judge / transcript.detect_building_count / transcript.detect_land_count / property.description.default）。\n5. 所有 LLM 呼叫點 fallback 到 hard-code 時必須 console.warn（消除靜默 fallback）。",
    docPath: "/docs/ai-prompt-safety-guide.md",
    category: "超級管理員 (Super Admin)",
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
    name: "AI 設定 - 模型選擇與設定 Sheet（Agent 指派）",
    locatedPage: "superadmin/settings/api_key_and_model_setting#agent-config",
    percentage: 99,
    acceptanceCriteria:
      "1. 在 LLM Leader Board 與 OCR 之間新增「模型選擇與設定」sheet tab，沿用 BottomSheetTabs（Bot icon、emerald 主色）。\n2. 左側為 Agent 清單（分 5 群：內容生成 / 謄本解析 / 媒體生成 / 開發與工具 / 客服 通用），寫死於 lib/ai/agent-registry.ts 共 14 個 agent；全 14 個 agent 皆有 suggestedTagKeys（新增 legal_contract / code_generation / general_assistant 三個 role_tag 以覆蓋先前 4 個空 agent）。\n3. 右側 Strategy Form：Primary (provider + model) / temperature / max_tokens / top_p / Fallbacks（依序嘗試，trigger: rate_limit / error / cost_over）/ guardrails (max_monthly_usd) / notes。\n4. 右下 Recommendations：依 agent.suggestedTagKeys 篩選 ai_model_role_tags catalog，顯示 provider / model / 狀態 / 最近測試 / 角色標籤；每列可點 pencil icon 開 TagEditorSheet 手動編輯標籤；toolbar 有「網路分類」「API 回應分類」「重新整理」按鈕連接既有的 ClassifyConfigSheet（解決 model-role-catalog 孤兒問題）。\n5. 全平台共用：寫入新建表 ai_agent_model_assignments（無 user_id、authenticated 可讀、service_role 寫）。\n6. 每個 agent 都有 factory default（lib/ai/agent-defaults.ts）：Primary + 3 Fallbacks（rate_limit / error / cost_over 各一）+ $5 USD 月上限。初始 DB 由 PUT 14 筆 seed，「還原為預設」按鈕呼叫 hook.reset() 會 upsert 該 agent 的 defaults（不再用 DELETE）。\n7. 匯出報告：AgentModelAssignmentPanel header 的「匯出報告」按鈕會生成全 14 個 agent 的 Markdown 快照（含 Primary / Fallbacks / Guardrails / 推薦模型表 / 最近測試欄 / 統計）；預設 top 10 per agent 上限避免報告過大（可用 maxRecommendationsPerAgent 選項覆寫），可直接下載為 `agent-config-YYYY-MM-DD.md` 供 dev-logs 存檔。\n8. Phase 2 Dispatcher 已上線：lib/ai/resolve-agent-model.ts 實作 resolveAgentModel() / resolveFirstAgentModel() helper，支援 InvalidAgentKeyError / AgentDisabledError / DB 錯誤自動 fallback 到 AGENT_DEFAULTS / 舊 module_key 別名（transcript.parse / online_ocr_parse / online_ocr_judge 等 8 筆 legacy key 一併映射到 canonical agent_key）。property-description/stream + lib/transcript-parse/run-transcript-parse-core.ts（parser + judge 兩個 callsite）皆已切換為先讀 ai_agent_model_assignments，per-user 舊表 ai_modules_assigned_function 降為第二 fallback。models/test 是使用者挑模型的診斷端點，不適用 dispatcher。\n9. UX 軟 fallback：當 agent 的 suggestedTagKeys 新增但對應 role_tag 還沒有 classification assignment 時，推薦面板會顯示「暫時顯示全部可用模型」按鈕，使用者可繞過 tag 篩選臨時瀏覽全部候選，不影響匯出報告的 strict filter 結果。\n10. Guardrails 真正生效：lib/ai/agent-cost-guard.ts 實作 computeCostUsd / getAgentMonthlySpendUsd / checkAgentBudget，讀 ai_prompt_audit_logs (input/output tokens × AI_PROVIDERS 靜態價格) 計算當月累計花費，超過 max_monthly_usd 時直接攔截 LLM 呼叫。property-description/stream 攔截後透過 SSE 送 monthly_cap_exceeded；transcript-parse parser 攔截後直接 fail 整個 job；judge 攔截後只跳過審核階段（parser 仍繼續，consensus layer 會使用未審核結果）。所有 3 個 Phase 2 callsite 都接入了 budget check。\n11. Audit log canonical agent_key：migration 20260412120000 為 ai_prompt_audit_logs 新增 agent_key 欄位；lib/ai/audit.ts 的 startPromptAudit() 接受 agentKey option；property-description/stream + transcript-parse (parser + judge) 3 個 Phase 2 callsite 都寫入 canonical agent_key。agent-cost-guard 查詢改用 PostgREST .or() 單次查 `agent_key=canonical OR module_key IN (legacy aliases)`，新舊 row 一次打包，無須 migration 既有資料。\n12. 靜態 guardrails filter：lib/ai/agent-guardrail-filters.ts 實作 applyForbidProviders / applyRequireTags / sanitizeChain（組合 filter，原始 chain index tracking）。forbid_providers 已接入 property-description/stream + transcript-parse resolver wrapper，dropped link 在 console.info 記錄；require_tags 為 pure helper，等未來 server-side 載入 role catalog 後再整合。\n13. Cost-aware chain walking：lib/ai/agent-cost-guard.ts 新增 selectAffordableLink / estimateChainCosts helpers，可在 runtime 走 chain 時跳過估算成本會超過剩餘預算的 link，選第一個 fits 的 fallback；純函式 + 7 個單元測試覆蓋邊界情境，helper 已可用，callsite 整合留給 Phase 3。\n14. 3 個新 role_tag 的 seed data：migration 20260412130000 為 legal_contract / code_generation / general_assistant 三個 tag 各 insert 4-5 筆 manual assignment，涵蓋 Anthropic / OpenAI / Gemini / DeepSeek 的常識性選擇。Agent Config 推薦面板對 contract_assistant / software_dev_engineer / ttd_engineer / web_assistant 不再需要 bypass button。",
    docPath: "",
    category: "超級管理員 (Super Admin)",
    points: 13,
    lastModifiedBy: "Claude Opus 4.6",
    lastModifiedDate: "2026/04/12",
    phase: "testing",
    testStatus: "passed",
    unitTestCoverage: 96,
    testCoverage: 92,
    developmentProgress:
      "Phase 1 + Phase 2 同步完成：\n• Data layer: migration 20260412100000 (ai_agent_model_assignments 表) + migration 20260412110000 (新增 legal_contract / code_generation / general_assistant 三個 role tag)\n• Agent registry: lib/ai/agent-registry.ts (14 agents × 5 groups，全員都有 suggestedTagKeys) + lib/ai/agent-defaults.ts (Primary + 3 Fallbacks + $5 cap)\n• API: app/api/ai-settings/agent-assignments/route.ts (GET/PUT/DELETE)\n• Hook: lib/hooks/useAgentAssignments.ts (reset → upsert defaults)\n• UI 主面板: components/ai-settings/AgentModelAssignmentPanel.tsx (hoisted useModelRoleCatalog + 匯出報告 button) + agent-model/{AgentList, AgentStrategyForm, AgentRecommendationPanel}.tsx（bypass tag filter 軟 fallback）\n• ClassifyConfigSheet + TagEditorSheet 從 model-role-catalog 孤兒狀態收編進 AgentRecommendationPanel\n• 匯出器: lib/ai/agent-report.ts 生成全 14 agent Markdown 快照 + 可設定 maxRecommendationsPerAgent 上限 (default 10)\n• Phase 2 Dispatcher: lib/ai/resolve-agent-model.ts (resolveAgentModel + resolveFirstAgentModel + 8 筆 legacy module_key alias + factory default fallback) → 11 unit tests\n• Callsite migrations: (1) app/api/property-description/stream/route.ts + (2) lib/transcript-parse/run-transcript-parse-core.ts parser + judge 兩處，皆主路徑 resolver / 第二 fallback 保留 per-user 舊表\n• Page 整合: page.tsx 新增 'agent-config' 頁籤\n• Tests: 90 suites / 649 tests 全綠（agent-defaults 46 + agent-report 17 + resolve-agent-model 11 + useAgentAssignments 6 + AgentModelAssignmentPanel 7 含 bypass test + property-description/stream route 2 + transcript-parse 既有套件無迴歸 + 其他既有）\n• DB 已 seed 14 筆初始預設 + 3 筆新 role tag",
  },
  {
    name: "開發環境 Docker 整合 - Paperclip 自動啟停",
    locatedPage: "start.sh / stop.sh",
    percentage: 100,
    category: "通用/系統 (General/System)",
    points: 2,
    phase: "development",
    lastModifiedBy: "Jason + GPT-5.3-Codex",
    lastModifiedDate: "2026/04/13",
    featureDescription:
      "以 Docker 方式整合 Paperclip，並納入專案統一啟停流程，讓開發者執行 ./start.sh all 時可一併啟動，執行 ./stop.sh 時可一併停止。",
    acceptanceCriteria:
      "1. 新增專案內 Paperclip compose 設定，採官方 quickstart 單容器模式。\n2. start.sh 具備 paperclip 啟動命令與 all 模式自動啟動。\n3. stop.sh 可透過 compose down 停止 Paperclip。\n4. 預設使用較少衝突的 host port（3187），並可透過 .env.paperclip 覆寫。\n5. 首次執行可自動建立 .env.paperclip 與 BETTER_AUTH_SECRET。",
    developmentProgress:
      "已新增 docker/paperclip/docker-compose.paperclip.yml 與 .env.paperclip.example；start.sh 新增 ensure_paperclip_env/start_paperclip，menu 與 CLI 入口支援 paperclip；start_all 會一併啟動 Paperclip；stop.sh 新增 Paperclip compose down。2026/04/11 再優化啟動效能：start_paperclip 先檢查容器是否已 running，已執行時直接返回；預設改為使用本機快取映像檔（PAPERCLIP_AUTO_PULL=0），僅首次或手動啟用 auto-pull 才拉取最新映像，避免每次 start.sh 都卡在 docker pull。新增 update_paperclip_image 與 CLI 指令 paperclip-update，並在啟動選單提供「更新 Paperclip 映像檔」，讓使用者在需要時手動更新並重啟容器套用新版本。另將預設資料目錄從 /tmp 改為 $HOME/.paperclip-data-owner-property-management，避免系統清理暫存目錄後遺失 instance 設定。新增 Paperclip 自動開瀏覽器機制：啟動後等候 health 再開啟指定 Dashboard URL，預設導向 /VIS/agents/ceo/dashboard，可用 PAPERCLIP_AUTO_OPEN_BROWSER 與 PAPERCLIP_DASHBOARD_URL 控制。2026/04/12 補強容器執行模式：改用 CLAUDE_CODE_OAUTH_TOKEN（停用 ANTHROPIC_API_KEY credit 路徑）驗證 claude_local adapter subscription 流程；workspace 掛載策略從 read-only PoC 進展到 read-write + worktree isolation，並透過 docker exec 統一 git worktree 路徑語義（/workspace）避免 host/container 路徑漂移。2026/04/13 針對 codex_local adapter 追加穩定化：重新建立 paperclip 容器以套用最新 host OPENAI_API_KEY、確認容器內 key hash 與 host 一致；容器內執行 codex login --with-api-key 後，codex exec smoke 測試轉為可穩定成功，排除先前 Missing bearer/invalid_api_key 混合故障。",
    docPath: "/docs/scripts-directory-guide.md",
  },
  {
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
    name: "VIS 同步基礎設施 — Engineer Profile V2 + Webhook 框架",
    category: "超級管理員 (Super Admin)",
    percentage: 70,
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
    lastModifiedBy: "OpenAI Codex (Architect Agent)",
    lastModifiedDate: "2026/04/14",
    developmentProgress:
      "2026/04/14 (VIS-66, Architect Agent)\n" +
      "- ✅ DB migration: create_vis_sync_tables（115 行，paperclip_webhook_logs + sync_conflicts + RLS）\n" +
      "- ✅ POST /api/webhooks/paperclip route（89 行，HMAC 驗證 + 事件分派）\n" +
      "- ✅ Engineer 管理頁面 /superadmin/engineers（page.tsx 362 行 + actions.ts 105 行）\n" +
      "- ✅ ADR 文件：adr-137-vis-sync-infrastructure.md\n" +
      "- ✅ 環境驗證腳本：scripts/validate-vis-sync-env.sh\n" +
      "- ✅ vis-roadmap-sync-dev-spec 更新\n" +
      "- 待完成：HMAC 驗證整合測試、背景 worker 實作",
  },
  {
    name: "VIS 批量遷移工具 — 135 任務導出到 Paperclip VIS",
    category: "超級管理員 (Super Admin)",
    percentage: 60,
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
    lastModifiedBy: "OpenAI Codex (Fullstack Agent)",
    lastModifiedDate: "2026/04/14",
    developmentProgress:
      "2026/04/14 (VIS-70, Fullstack Agent)\n" +
      "- ✅ sync-roadmap-to-vis.ts 批量遷移腳本\n" +
      "- ✅ Superadmin 導出 UI（ExportToVISButton + ExportProgressDialog）\n" +
      "- 待完成：增量模式、vis_issue_id 回寫驗證",
  },
  {
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
];

export const ROADMAP_DATA: RoadmapData = {
  lastUpdated: "2026/04/14",
  features: RAW_FEATURES.map((f) => ({ ...f, phase: inferPhase(f) })),
};
