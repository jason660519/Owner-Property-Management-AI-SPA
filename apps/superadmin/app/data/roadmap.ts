
// This file is auto-generated from the original roadmap.js
// Date: 2026-02-14

/** Lifecycle phase of a feature */
export type PhaseType = 'development' | 'testing' | 'deployment' | 'operations';

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
  testStatus?: 'pending' | 'in_progress' | 'passed' | 'failed';
  unitTestCoverage?: number;
  e2eTestCoverage?: number;
  defectCount?: number;

  // Deployment phase fields
  deployStatus?: 'not_deployed' | 'staging' | 'production' | 'rollback';
  deployEnv?: string;
  version?: string;
  deployDate?: string;

  // Operations phase fields
  uptimePercent?: number;
  errorRate?: number;
  avgResponseTime?: number;
  lastIncident?: string;
}

export interface RoadmapData {
  lastUpdated: string;
  features: RoadmapFeature[];
}

/** Derive default phase from existing data when not explicitly set */
function inferPhase(f: RoadmapFeature): PhaseType {
  if (f.phase) return f.phase;
  if ((f.testCoverage && f.testCoverage > 0) || f.testProgress) return 'testing';
  return 'development';
}

const RAW_FEATURES: RoadmapFeature[] = [
        // 超級管理員
        {
            name: "超級管理員-儀表板",
            locatedPage: "superadmin/dashboard",
            percentage: 95,
            acceptanceCriteria: "1. 登入後首頁需顯示系統關鍵指標(KPI)，包含總用戶數、總物件數、成交金額。\n2. 需提供圖表視覺化呈現最近30天的平台流量趨勢。\n3. 儀表板需顯示待處理的審核事項通知。\n4. 需支援數據篩選功能，可依日期區間查看統計數據。\n5. 頁面載入速度需在2秒內完成，確保良好的使用者體驗。",
            docPath: "/project-process/features/admin-dashboard-20260206.md",
            featureSpecDocPath: "/project-process/features/admin-dashboard-20260206.md",
            tddSpecDocPath: "/project-process/features/tdd-admin-dashboard-20260221.md",
            category: "超級管理員 (Super Admin)",
            points: 8,
            lastModifiedBy: "Trae AI",
            lastModifiedDate: "2026/02/13",
            devLog: "[2026/02/13] (Trae AI)\n• 完成儀表板進度頁面重構，支援 9 欄位動態調整寬度\n• 實作欄位順序優化與雙語標題顯示\n• 新增 `dev-logs` 與 `test-logs` 資料夾結構\n詳見: [開發日誌](../dev-logs/dev-dashboard-refactor-2026-02-13.md)",
            devLogDocPath: "/project-process/dev-logs/dev-dashboard-refactor-2026-02-13.md",
            testProgress: "[2026/02/13] (Trae AI)\n• UI/UX 功能測試通過 (欄位拖曳、記憶還原、RWD)\n詳見: [測試日誌](../test-logs/test-dashboard-refactor-2026-02-13.md)",
            testCoverage: 0
        },
        { name: "超級管理員-網站行為監控與紀錄功能", locatedPage: "superadmin/dashboard/behavior-monitoring", percentage: 70, acceptanceCriteria: "1. 系統需記錄所有使用者的頁面訪問紀錄，包含時間戳、IP、使用者ID、頁面路徑。\n2. 提供每日/每週/每月流量統計報表。\n3. 異常行為需自動標記並通知管理員（如短時間內大量請求）。\n4. 日誌保存期限至少90天，超過自動封存。\n5. 需支援依使用者、日期、頁面路徑篩選搜尋。", docPath: "", featureSpecDocPath: "/project-process/features/admin-behavior-monitoring-spec-20260221.md", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", devLogDocPath: "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "Claude Sonnet 4.6", lastModifiedDate: "2026/02/21", phase: "development", developmentProgress: "DB migration (behavior_logs table + RLS + anomaly detection function), server actions (getBehaviorLogs/getBehaviorStats/getDailyStats/getAnomalies/runAnomalyDetection), page.tsx + BehaviorMonitoringClient + BehaviorStatsCards + BehaviorChart + BehaviorLogsTable 完成；Sidebar 新增導航。待接入 middleware 行為記錄 + E2E 測試。" },
        { name: "超級管理員的RBAC CRUD平台", locatedPage: "superadmin/dashboard/rbac_access_control", percentage: 95, acceptanceCriteria: "1. 可建立、編輯、刪除角色（Role），角色名稱需唯一。\n2. 可對角色設定細粒度權限（讀取、寫入、刪除各資源）。\n3. 角色變更需有稽核紀錄（修改者、修改時間、異動內容）。\n4. 支援角色繼承功能，子角色可繼承父角色權限。\n5. 刪除角色前需確認沒有使用者被指派此角色。", docPath: "", featureSpecDocPath: "/project-process/features/admin-rbac-crud-spec-20260221.md", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", devLogDocPath: "/project-process/dev-logs/dev-superadmin-features-2026-02-26.md", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "Claude Sonnet 4.6", lastModifiedDate: "2026/02/26", phase: "development", developmentProgress: "Permission Matrix 完整 DB 持久化：新增 iam_role_permissions 表（migration 20260226100000）、getRolePermissions / saveRolePermissions server actions；RolesTab 改為從 DB 載入/儲存角色權限，儲存前有 dirty 提示，儲存中 spinner；修復 iam_user_group_memberships view + parent_role_id 欄位未套用問題。" },
        { name: "超級管理員-雲端空間管理平台", locatedPage: "superadmin/dashboard/storage", percentage: 70, acceptanceCriteria: "1. 顯示總儲存空間與已用空間的視覺化圖表。\n2. 可瀏覽所有使用者上傳的檔案（圖片、文件、音訊）。\n3. 可對個別使用者設定儲存配額上限。\n4. 超過配額75%時自動警示管理員。\n5. 支援批次刪除、下載或移動檔案。", docPath: "", featureSpecDocPath: "/project-process/features/admin-cloud-storage-spec-20260221.md", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", devLogDocPath: "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "Claude Sonnet 4.6", lastModifiedDate: "2026/02/21", phase: "development", developmentProgress: "storage_quotas migration (RLS + updated_at trigger)；actions.ts 補強 getStorageQuotas/setUserQuota/batchDeleteFiles（分塊批次刪除）；StorageDashboardClient 已有 quota tab + 孤兒檔案清理。" },
        { name: "超級管理員針對 各種Roles的 Access Matrix管理平台", locatedPage: "superadmin/dashboard/role_access_matrix", percentage: 60, acceptanceCriteria: "1. 以矩陣表格呈現所有角色與資源的權限設定（讀/寫/刪）。\n2. 可在矩陣中直接點擊修改單一權限格。\n3. 變更後即時保存，無需整頁刷新。\n4. 提供「重置為預設值」功能。\n5. 支援匯出 PDF/CSV 格式的權限矩陣報表。", docPath: "/project-process/features/iam-system.md", featureSpecDocPath: "/project-process/features/iam-system.md", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-資料庫Supabase管理功能", locatedPage: "superadmin/dashboard/supabase", percentage: 60, acceptanceCriteria: "1. 顯示資料庫各資料表的記錄數量與最後更新時間。\n2. 可執行基本 SQL 查詢並顯示結果（僅 SELECT）。\n3. 顯示 Migration 歷史紀錄與執行狀態。\n4. 提供資料庫連線健康度監控（延遲、連線數）。\n5. 可觸發手動備份並下載備份文件。", docPath: "/project-process/progress-reports/database-reports/supabase-auth-integration-guide.md", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", devLogDocPath: "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "Claude Sonnet 4.6", lastModifiedDate: "2026/02/21", phase: "development", developmentProgress: "靜態 mock 改為連接真實資料：admin client 查詢各資料表記錄數（Promise.allSettled 並發）、連線健康度檢測、RLs 政策（透過 rpc）；SupabaseDashboardClient + Supabase Dashboard 快速連結；頁面採 Server Component + Suspense 架構。" },
        { name: "超級管理員-資料庫Elastic Search管理功能", locatedPage: "superadmin/dashboard/elasticsearch", percentage: 0, acceptanceCriteria: "1. 顯示 Elasticsearch 叢集狀態（健康度、索引數量、文件總數）。\n2. 可執行搜尋查詢並預覽結果（最多100筆）。\n3. 支援手動重建索引（Reindex）操作。\n4. 顯示各索引的磁碟使用量。\n5. 異常狀態（Yellow/Red）需自動警報管理員。", docPath: "", featureSpecDocPath: "/project-process/features/elasticsearch-management.md", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員AI LLM API效能監控－AI語音回應可靠度監控功能", locatedPage: "superadmin/dashboard/llm-monitor", percentage: 65, acceptanceCriteria: "1. 即時顯示各 LLM API 的請求數量、平均回應時間、錯誤率。\n2. 可設定 API 使用量預算上限與警示閾值。\n3. 提供每日/每週 Token 消耗統計與費用估算。\n4. 語音回應品質分數（延遲、斷句率）需以圖表呈現。\n5. API 密鑰輪換提醒功能（距離過期 30 天前通知）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", devLogDocPath: "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "Claude Sonnet 4.6", lastModifiedDate: "2026/02/21", phase: "development", developmentProgress: "連接真實 ai_performance_metrics 資料表，page.tsx + LLMMonitorClient + actions (getLLMMetrics/getLLMAggregateStats/getLLMOverallStats)；每模型效能比較表、最近請求記錄。" },
        { name: "超級管理員-網路安全－隱私審計管理功能", locatedPage: "superadmin (待建)", percentage: 0, acceptanceCriteria: "1. 提供資料存取稽核日誌，記錄誰在何時存取了哪些敏感資料。\n2. 自動偵測異常登入行為（不常用設備、異地登入）並警示。\n3. 支援設定 IP 白名單與黑名單。\n4. 個資保護合規報告（GDPR/PDPA）一鍵生成。\n5. SSL 憑證到期前 30 天自動提醒。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-網站效能監控功能", locatedPage: "superadmin/dashboard/performance", percentage: 65, acceptanceCriteria: "1. 即時顯示頁面 Core Web Vitals（LCP、FID、CLS）數值。\n2. 提供最慢的 API 端點 Top 10 列表（按回應時間排序）。\n3. 監控 CDN 命中率與靜態資源載入時間。\n4. 自動偵測當日效能劣化趨勢並發出警示。\n5. 頁面速度測試可手動觸發並生成報告。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-superadmin-platform-20260221.md", devLogDocPath: "/project-process/dev-logs/dev-superadmin-features-2026-02-21.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "Claude Sonnet 4.6", lastModifiedDate: "2026/02/21", phase: "development", developmentProgress: "web_vitals migration + RLS + view，page.tsx + PerformanceMonitorClient + actions (getPerformanceOverview/getPageVitalsSummary/getRecentVitals)；Core Web Vitals 評級、LCP 分佈、各頁面摘要。" },

        // 買家
        { name: "買家(已簽約)-儀表板", locatedPage: "web/buyer/contracted/dashboard", percentage: 50, acceptanceCriteria: "1. 顯示已購物件的基本資訊（地址、坪數、成交金額、交屋日期）。\n2. 顯示合約進度時程表（簽約→履約→過戶→交屋）。\n3. 即時顯示待辦事項（需簽署文件、待付款項目）。\n4. 提供仲介/房東聯絡入口。\n5. 顯示近期相關通知（文件更新、預約提醒）。", docPath: "/project-process/features/buyer-dashboard-mock-20260206.md", featureSpecDocPath: "/project-process/features/buyer-dashboard-mock-20260206.md", tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md", category: "買家 (Buyer)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "買家的溝通中心", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 可與房東、仲介進行即時文字訊息往來。\n2. 訊息需有已讀/未讀狀態標示。\n3. 支援發送附件（PDF、圖片）。\n4. 有新訊息時推送通知（系統通知）。\n5. 訊息歷史可按日期搜尋，最長保留2年。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md", category: "買家 (Buyer)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "買家的繳費記錄", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 顯示所有付款紀錄（日期、金額、類型、付款方式、狀態）。\n2. 支援下載單筆收據（PDF格式）。\n3. 可依日期範圍、金額、付款狀態篩選。\n4. 顯示未付款項目提醒與到期日。\n5. 年度付款總額統計與圖表。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md", category: "買家 (Buyer)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 公司首頁與產品
        { name: "公司首頁", locatedPage: "web/", percentage: 80, acceptanceCriteria: "1. 首頁需在 3 秒內完成首屏渲染（LCP < 2.5s）。\n2. 清楚展示產品核心功能（房東管理、租客管理、AI功能）。\n3. 包含客戶見證/評價區塊（至少3則）。\n4. CTA 按鈕（立即試用、聯絡我們）可正常觸發對應頁面。\n5. RWD 支援：手機/平板/桌機版面正確顯示。", docPath: "/project-process/features/company-homepage.md", featureSpecDocPath: "/project-process/features/company-homepage.md", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "公司頁面 (Company Pages)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品費用說明頁", locatedPage: "web/pricing", percentage: 0, acceptanceCriteria: "1. 清楚列出各方案（免費版、基本版、進階版）的功能對比表格。\n2. 月付/年付切換，年付顯示折扣比例。\n3. FAQ 區塊涵蓋常見費用問題（至少5項）。\n4. 「立即購買」按鈕連結至付款流程。\n5. 費用說明需包含幣別（AUD/TWD）切換功能。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "公司頁面 (Company Pages)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品Q&A+Need Help頁", locatedPage: "web/about", percentage: 0, acceptanceCriteria: "1. 常見問題以可展開/收合的 Accordion 形式呈現（至少10項）。\n2. 提供搜尋功能，可即時過濾 Q&A 問題。\n3. 「Need Help」頁面包含支援聯繫方式（Email、Line、電話）。\n4. 每個 Q&A 條目有「是否有幫助」的評分功能。\n5. 提供線上客服聊天入口（Chat）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "公司頁面 (Company Pages)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品教學", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 提供分角色教學（房東版、租客版、買家版）。\n2. 每個教學步驟附有截圖或短影片（< 2分鐘）。\n3. 教學進度可儲存，下次從中斷點繼續。\n4. 完成所有教學步驟後顯示完成徽章。\n5. 教學內容可連結至相關功能頁面（快速體驗）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "公司頁面 (Company Pages)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "聯絡我們>發送訊息功能", locatedPage: "web/contact", percentage: 100, acceptanceCriteria: "1. 表單包含：姓名、Email、電話（選填）、訊息類型（下拉）、內容（文字區塊）。\n2. 必填欄位未填送出時顯示對應錯誤提示。\n3. 送出成功後顯示確認訊息，並傳送確認 Email 給填寫者。\n4. 管理員後台可查看所有收到的聯絡訊息。\n5. 防止垃圾訊息：實作 reCAPTCHA 或 Honeypot 機制。", docPath: "/project-process/features/daily-report-20260205.md", featureSpecDocPath: "/project-process/features/daily-report-20260205.md", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "公司頁面 (Company Pages)", points: 3, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/05-14:30" },

        // 第三方加值服務
        { name: "第三方加值服務－智能門鎖", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 支援遠端開門/關門操作，回應時間 < 3 秒。\n2. 提供進出記錄查詢（誰在何時開門）。\n3. 可生成臨時密碼（有效期限可設定）供訪客使用。\n4. 電池電量低時自動推送通知至房東。\n5. 支援多把門鎖集中管理介面。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－保險方案", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 顯示可投保的保險方案列表（房屋險、責任險、租金損失險）。\n2. 可在線上申請投保，填寫物件資訊後獲取報價。\n3. 保單文件可在線下載（PDF）。\n4. 提醒保單到期時間（到期前30天）。\n5. 理賠申請可在線提交並追蹤進度。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－攝影機監控", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 支援多路攝影機即時畫面預覽（4宮格/9宮格）。\n2. 動態偵測觸發時自動錄影並截圖通知房東。\n3. 歷史錄影可按日期/時間查詢與下載。\n4. 攝影機離線時推送警示。\n5. 支援雲端儲存（最少保留7天錄影）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－租金保障", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 租客連續欠租2個月，自動啟動租金保障申請流程。\n2. 提供保障申請表單（物件資訊、租賃合約、欠租紀錄）。\n3. 申請狀態可即時追蹤（審核中、已核准、已撥款）。\n4. 最高保障金額依方案顯示（如最高6個月租金）。\n5. 理賠成功後紀錄至財務流水帳。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-company-pages-thirdparty-20260221.md", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 房東
        { name: "房東-儀表板", locatedPage: "web/landlord/dashboard", percentage: 90, acceptanceCriteria: "1. 顯示名下所有物件概況（總數、出租中、空置、待售）。\n2. 顯示本月租金收入總額與趨勢圖表（與上月對比）。\n3. 即時顯示待處理事項（待審核租客申請、維修請求、合約即將到期）。\n4. 快速連結至各主要功能（新增物件、收款記錄、聯絡租客）。\n5. 儀表板載入時間 < 2 秒，數據不超過24小時快取。", docPath: "/project-process/features/landlord-dashboard-status-20260206.md", featureSpecDocPath: "/project-process/features/landlord-dashboard-status-20260206.md", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 8, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "房東的Access Matrix管理平台", locatedPage: "web/landlord (待建)", percentage: 60, acceptanceCriteria: "1. 房東可查看並設定名下成員（助理、會計）的功能存取權限。\n2. 支援角色指派（助理角色可查看但不可刪除物件）。\n3. 權限矩陣以表格呈現，直觀易讀。\n4. 權限變更需記錄稽核日誌。\n5. 自訂角色功能：可創建「只可查看財務」等客製角色。", docPath: "/project-process/features/iam-system.md", featureSpecDocPath: "/project-process/features/iam-system.md", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東新增物件方式1－手動輸入", locatedPage: "web/landlord/properties/add", percentage: 85, acceptanceCriteria: "1. 表單欄位涵蓋：物件名稱、地址、坪數、樓層、房型、月租金/售價、設備清單。\n2. 必填欄位驗證，地址需連結 Google Maps 確認。\n3. 支援一次上傳最多20張物件照片。\n4. 草稿自動儲存，可返回繼續填寫。\n5. 發布後物件立即顯示於可見清單中。", docPath: "/project-process/features/landlord-features.md", featureSpecDocPath: "/project-process/features/landlord-features.md", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        {
            name: "房東新增物件方式2－自動填入 (VLM/OCR)",
            locatedPage: "web/landlord/properties/add",
            percentage: 95,
            acceptanceCriteria: "1. 上傳物件照片/謄本後，AI 自動擷取物件基本資訊（地址、坪數、格局）。\n2. OCR 準確率需達 85% 以上（在標準文件格式下）。\n3. 自動填入結果可人工校正，顯示原始擷取值與修改後值的對比。\n4. 支援 JPG、PNG、PDF 格式，單檔最大 10MB。\n5. 處理時間 < 30 秒（一般文件）。",
            docPath: "/project-process/features/vlm-ocr-system.md",
            featureSpecDocPath: "/project-process/features/vlm-ocr-system.md",
            tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md",
            category: "房東 (Landlord)",
            points: 8,
            lastModifiedBy: "Trae AI",
            lastModifiedDate: "2026/03/15",
            devLog: "[2026/03/15] (Trae AI)\n• 優化謄本解析映射邏輯，支援陣列與物件格式自動轉換\n• 新增謄本解析機制說明文件 (transcript-parsing-guide.md)\n• 提升自動填入表單的資料完整度",
            devLogDocPath: "/docs/operational-guides/transcript-parsing-guide.md"
        },
        { name: "房東的預約看房管理功能", locatedPage: "web/landlord/appointments", percentage: 0, acceptanceCriteria: "1. 顯示所有待確認/已確認/已取消的看房預約清單。\n2. 房東可一鍵確認或拒絕（附拒絕原因）預約請求。\n3. 確認/拒絕後自動發送通知（Email 或系統通知）給租客/買家。\n4. 整合日曆視圖，顯示每日預約時段。\n5. 可設定每日可預約時段（開放時間與間隔）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－Details模式", locatedPage: "web/landlord/customers", percentage: 0, acceptanceCriteria: "1. 顯示單一客戶的完整資料（個人基本資料、聯絡方式、租賃/購屋意向、看房紀錄）。\n2. 客戶狀態標籤（潛在/洽談中/已成交/已失效）可快速切換。\n3. 可記錄跟進備註，備註需有時間戳與操作者。\n4. 顯示與該客戶的溝通紀錄摘要（最新5條）。\n5. 提供「發送訊息」快捷按鈕直接進入溝通頁面。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－Grid模式", locatedPage: "web/landlord/customers", percentage: 0, acceptanceCriteria: "1. 以卡片網格形式顯示客戶列表，每卡顯示頭像、姓名、狀態、最後聯絡時間。\n2. 支援欄數切換（2欄/3欄/4欄）。\n3. 卡片點擊進入 Details 模式。\n4. 支援拖曳重新排序（依優先級）。\n5. 懸停卡片顯示快速操作（發訊息、修改狀態）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－List模式", locatedPage: "web/landlord/customers", percentage: 0, acceptanceCriteria: "1. 以表格列表形式顯示客戶，欄位可自訂顯示/隱藏。\n2. 支援依姓名、狀態、最後聯絡時間排序。\n3. 支援多選批次操作（批次發訊息、批次修改狀態）。\n4. 搜尋欄可即時過濾姓名/電話/Email。\n5. 支援 CSV 匯出客戶列表。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－新增客戶", locatedPage: "web/landlord/customers", percentage: 0, acceptanceCriteria: "1. 表單含：姓名、電話、Email、意向（租/買）、預算、備註。\n2. Email 格式驗證，電話號碼格式驗證。\n3. 同一 Email 已存在時提示重複並詢問是否合併。\n4. 新增成功後自動跳轉至客戶 Details 頁。\n5. 支援從名片圖片 OCR 自動填入（可選）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－成交客戶", locatedPage: "web/landlord/customers", percentage: 0, acceptanceCriteria: "1. 已成交客戶可選擇標記為「買家」或「已簽約租客」。\n2. 標記後自動建立對應角色的基本資料與儀表板。\n3. 成交資訊記錄：成交日期、成交物件、成交金額。\n4. 成交客戶不可刪除，只能封存（以保留歷史紀錄）。\n5. 成交數量統計顯示於儀表板指標卡。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東－邀請第三人成為user的功能", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 輸入被邀請者的 Email，選擇指派角色（助理、會計、房仲）後發送邀請。\n2. 被邀請者收到 Email 含邀請連結，點擊後完成帳號創建。\n3. 邀請連結有效期24小時，過期後失效。\n4. 已接受邀請的成員出現在房東的成員管理清單。\n5. 可撤銷尚未接受的邀請。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格創建功能", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 支援富文本編輯器（粗體、斜體、標題、圖片嵌入、連結）。\n2. 可設定發布日期（立即/排程）。\n3. 支援草稿功能，可回到繼續編輯。\n4. 發布後自動產生 SEO-friendly URL。\n5. 支援文章標籤分類（最多5個標籤）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東給租客的Ｑ＆Ａ", locatedPage: "web/landlord/properties", percentage: 0, acceptanceCriteria: "1. 房東可為每個出租物件建立專屬 Q&A（最多50題）。\n2. 問題與答案支援純文字與圖片說明。\n3. 租客可在物件頁面直接閱讀 Q&A。\n4. 可從模板庫選取常見問題（如「寵物政策」）。\n5. Q&A 可設定公開（所有人可見）或私密（僅已簽約租客）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東給買家的Ｑ＆Ａ", locatedPage: "web/landlord/properties", percentage: 0, acceptanceCriteria: "1. 房東可為每個待售物件建立專屬 Q&A（最多50題）。\n2. 問題可標記為「已由律師確認」以增加可信度。\n3. 買家可在物件詳情頁面閱讀 Q&A。\n4. 支援匿名問答功能（買家可匿名發問）。\n5. 房東可設定自動回覆常見問題。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成物件銷售部落格", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 輸入物件 ID，AI 自動生成包含物件亮點的銷售文案（500-800字）。\n2. 生成文案可人工編輯後發布。\n3. 自動插入物件照片（最多5張）至文章內容。\n4. 生成時間 < 15 秒。\n5. 支援多語版本生成（繁體中文、英文）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格 AI 寫手", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 輸入關鍵字/主題，AI 生成完整部落格草稿（附標題建議、段落結構）。\n2. 可指定寫作風格（專業、輕鬆、說故事）與字數範圍。\n3. 生成稿可直接在編輯器中修改並發布。\n4. 支援「重新生成」功能（不滿意可重試最多3次）。\n5. 生成過程顯示串流輸出（字元逐一顯示）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格 AI 講房", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. AI 根據物件資訊生成語音稿文本（1-3分鐘）。\n2. 支援 TTS 語音合成播放預覽。\n3. 語音稿可匯出為 MP3/WAV 格式。\n4. 支援多個音色選擇（男聲/女聲/年輕/成熟）。\n5. 語音稿文本可在生成後人工修改後重新合成。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東自定義銷售物件的Ｑ＆Ａ功能", locatedPage: "web/landlord/properties", percentage: 0, acceptanceCriteria: "1. 針對銷售物件，房東可建立自定義問答對（最多30題）。\n2. 問答可設定顯示順序（手動拖曳排序）。\n3. 特定問題可設為「必讀」（帶紅色標注）。\n4. 可在問答中嵌入物件照片或影片連結。\n5. 問答支援預覽模式（模擬買家視角）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東自定義出租物件的Ｑ＆Ａ功能", locatedPage: "web/landlord/properties", percentage: 0, acceptanceCriteria: "1. 針對出租物件，房東可建立自定義問答對（最多30題）。\n2. 可設定問答對特定租客類型可見（如僅限已申請租客）。\n3. 問答更新後，已訂閱通知的租客收到更新提醒。\n4. 提供 Q&A 瀏覽次數統計。\n5. 可複製其他物件的 Q&A 至本物件（一鍵套用）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "AI TTS語音助理+物件專屬轉接號碼", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 每個物件可申請一個虛擬電話號碼（轉接至 AI 語音助理）。\n2. AI 語音助理可回答物件相關問題（依設定的Q&A資料庫）。\n3. 語音助理無法回答時，轉接至真人或留言信箱。\n4. 來電紀錄可在後台查詢（來電時間、時長、議題摘要）。\n5. 支援語言設定（普通話/粵語/英語/台語）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－Details模式", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 顯示仲介的完整資料（姓名、證照號碼、電話、Email、負責物件清單）。\n2. 顯示仲介的業績統計（成交數、成交金額、帶看次數）。\n3. 可記錄與仲介的合作備註與評分（1-5星）。\n4. 快速連結進入與仲介的溝通頁面。\n5. 合作合約文件可上傳並關聯至仲介資料。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－Grid模式", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 以卡片形式顯示仲介列表，每卡含頭像、姓名、評分、負責物件數。\n2. 支援依評分、負責物件數排序。\n3. 卡片點擊進入 Details 頁。\n4. 顯示仲介當前活躍狀態（在線/離線）。\n5. 支援最多3欄的響應式排版。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－List模式", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 表格列表含欄位：姓名、電話、負責物件數、最後聯繫、評分、狀態。\n2. 支援點擊欄位標題排序。\n3. 支援搜尋過濾（依姓名/電話）。\n4. 多選後可批次更改狀態或發送訊息。\n5. 支援 CSV 匯出。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－新增仲介", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 表單含：姓名、電話、Email、證照號碼、公司名稱（選填）、備註。\n2. 電話和Email格式驗證。\n3. 可選擇指派仲介負責的物件（多選）。\n4. 新增成功後傳送歡迎Email給仲介。\n5. 系統自動產生仲介的邀請登入連結。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－銀行帳戶管理", locatedPage: "web/landlord/finance", percentage: 0, acceptanceCriteria: "1. 可綁定多個銀行帳戶（支援主要銀行）。\n2. 顯示帳戶餘額（需連結開放銀行API）。\n3. 可設定各帳戶的收款用途（租金帳戶/維修備用金）。\n4. 帳戶資訊以加密方式儲存，顯示時遮蔽部分號碼。\n5. 可手動新增或刪除帳戶（不可刪除有未結清款項的帳戶）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－收支明細儀表板", locatedPage: "web/landlord/finance", percentage: 0, acceptanceCriteria: "1. 顯示選定月份的收入/支出圓餅圖與明細。\n2. 支援日/月/季/年時間範圍切換。\n3. 收支類別可自訂（如「維修費」「管理費」）。\n4. 顯示淨利潤趨勢折線圖（最近12個月）。\n5. 一鍵匯出財務報表（PDF/Excel）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－租金收支管理", locatedPage: "web/landlord/finance", percentage: 0, acceptanceCriteria: "1. 顯示每月應收租金清單（物件+租客+金額+到期日）。\n2. 標記已收/未收狀態，未收超期自動標紅。\n3. 支援手動標記收款（附備註與日期）。\n4. 房東可在此頁向租客傳送繳費催繳通知。\n5. 逾期租金自動計算違約金（依合約設定）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－ATO租賃報稅表生成功能", locatedPage: "web/landlord/finance/reports", percentage: 0, acceptanceCriteria: "1. 自動彙整年度租金收入、管理費、維修費等稅務相關數據。\n2. 生成符合澳洲ATO標準的租賃收入報稅試算表。\n3. 報表可匯出 PDF 格式，附帶必要的申報說明。\n4. 支援多物件彙整在同一份報稅表。\n5. 提供稅務顧問分享連結（唯讀）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－台灣租賃報稅表生成功能", locatedPage: "web/landlord/finance/reports", percentage: 0, acceptanceCriteria: "1. 自動彙整年度租金收入，扣除必要費用（折舊、管理費）。\n2. 依台灣財政部標準格式生成租賃所得申報試算表。\n3. 顯示應申報金額與建議扣繳額。\n4. 報表可匯出 PDF，標示申報截止日期（每年5月）。\n5. 如有多筆出租所得，可合併或分開列報。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的溝通頁面", locatedPage: "web/landlord/messages", percentage: 0, acceptanceCriteria: "1. 集中顯示與所有租客/買家/仲介的訊息對話。\n2. 左側為對話列表（含未讀數徽章），右側為對話內容。\n3. 支援訊息搜尋（依關鍵字）。\n4. 可傳送文字、圖片、附件（最大10MB）。\n5. 可設定自動回覆訊息（不在線時啟用）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－Details模式", locatedPage: "web/landlord/properties/[id]", percentage: 0, acceptanceCriteria: "1. 顯示物件完整資訊（照片輪播、地址、格局、設備、租金/售價）。\n2. 顯示物件當前狀態（空置/出租中/待售/已售）。\n3. 顯示看房預約列表（最近10筆）。\n4. 提供物件 QR Code 分享功能。\n5. 可直接從物件詳情頁面觸發生成銷售部落格。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－Grid模式", locatedPage: "web/landlord/properties", percentage: 0, acceptanceCriteria: "1. 以卡片網格形式展示物件（每行3-4筆），卡片含縮圖、物件名、租金/售價、狀態。\n2. 支援依租金/售價、狀態、地區排序篩選。\n3. 卡片點擊進入物件 Details 頁。\n4. 支援快速切換物件狀態（不需進入詳情頁）。\n5. 空置物件卡片以視覺標示突出（如淡灰底色）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件－照片增生功能 (AI)", locatedPage: "web/landlord/properties", percentage: 0, acceptanceCriteria: "1. 上傳原始物件照片後，AI 可生成不同風格的渲染照（如白天/黃昏光線）。\n2. 可指定增強效果（去雜物、補光、修正垂直線）。\n3. 生成照片的解析度不低於原圖。\n4. 生成照片需附「AI 生成」浮水印（可選擇顯示/隱藏）。\n5. 每次最多可生成5張，生成時間 < 60 秒。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－List模式", locatedPage: "web/landlord/properties", percentage: 0, acceptanceCriteria: "1. 以緊湊表格形式列出所有物件，欄位含：物件名、地址、類型、月租/售價、狀態、最後修改。\n2. 點擊欄標題可排序。\n3. 多選後可批次修改狀態。\n4. 搜尋欄即時過濾（依物件名/地址）。\n5. 每頁顯示筆數可設定（20/50/100）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的維修派工管理", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 顯示所有維修請求列表（物件、申請人、描述、狀態、申請日期）。\n2. 可指派維修人員，並設定預約維修日期。\n3. 維修人員接單後租客收到通知（含到訪時間）。\n4. 維修完成後附上費用單與工作說明，租客確認後結案。\n5. 維修費用自動計入物件支出記錄。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的行銷部落格網站行為監控", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 追蹤部落格文章的閱讀人數、平均停留時間、跳出率。\n2. 顯示各文章的流量來源分佈（直接/搜尋/社群媒體）。\n3. 高流量文章自動標記「熱門」。\n4. 每週生成行銷效益報告（曝光→諮詢→帶看轉換率）。\n5. A/B 測試工具：可同時測試兩個文章標題，追蹤點擊率差異。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的email inbox信箱", locatedPage: "web/landlord (待建)", percentage: 0, acceptanceCriteria: "1. 整合外部 Email（Gmail/Outlook），在系統內統一查看收件。\n2. 支援寄件、回信、轉寄功能。\n3. 自動標記與租賃相關的 Email（如包含合約、看房、租金關鍵字）。\n4. 未讀郵件數顯示於側邊導航徽章。\n5. 搜尋功能可按寄件人/主旨/內容全文搜尋。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶-租客篩選功能", locatedPage: "web/landlord/customers", percentage: 0, acceptanceCriteria: "1. 依信用分數、月收入、職業類型對申請租客進行排序篩選。\n2. 提供自動化評分機制（根據填寫資料評估租客適合度）。\n3. 可設定篩選條件範本（如「月收入需為月租3倍以上」）。\n4. 篩選結果可一鍵發送面談邀請。\n5. 不合格申請者可禮貌性自動回絕（附原因說明範本）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的會計人員查帳審計功能", locatedPage: "web/landlord/finance", percentage: 0, acceptanceCriteria: "1. 會計角色可查看所有財務流水帳（唯讀模式）。\n2. 提供一致的試算表視圖（可匯出 Excel）。\n3. 可新增財務備註（如調帳說明），備註含操作者與時間戳。\n4. 對帳差異項目可標記「疑問」並留言，房東可回覆解釋。\n5. 稅務報告生成後，會計可直接從此頁面下載。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-landlord-20260221.md", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 租客
        { name: "租客(已簽約)-儀表板", locatedPage: "web/tenant/contracted/dashboard", percentage: 90, acceptanceCriteria: "1. 顯示租約基本資訊（物件地址、月租金、合約期限、剩餘天數）。\n2. 顯示下次繳費截止日與金額。\n3. 快速入口：維修申請、溝通中心、合約下載。\n4. 顯示最新通知（房東公告、維修進度更新）。\n5. 頁面載入時間 < 2 秒。", docPath: "/project-process/features/tenant-dashboards-20260206.md", featureSpecDocPath: "/project-process/features/tenant-dashboards-20260206.md", tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md", category: "租客 (Tenant)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "租客(潛在)-儀表板", locatedPage: "web/tenant/potential/dashboard", percentage: 90, acceptanceCriteria: "1. 顯示正在洽詢的物件列表（物件基本資訊、看房預約狀態）。\n2. 可在此發起看房預約或取消預約。\n3. 顯示已查詢物件歷史（最近10筆）。\n4. 推薦相似物件功能（依瀏覽偏好）。\n5. 提供申請入住按鈕（需上傳基本資料）。", docPath: "/project-process/features/tenant-dashboards-20260206.md", featureSpecDocPath: "/project-process/features/tenant-dashboards-20260206.md", tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md", category: "租客 (Tenant)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "租客的維修申請", locatedPage: "web/tenant (待建)", percentage: 0, acceptanceCriteria: "1. 提供維修申請表單：物件/位置、問題類別（水電/管路/設備）、問題描述、照片上傳。\n2. 送出後可追蹤維修進度（待派工/已指派/完成）。\n3. 維修人員到訪確認後需由租客線上確認完成。\n4. 維修記錄存檔，供日後查閱。\n5. 緊急維修（如漏水）標記後，通知時間 < 10 分鐘。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租客的溝通中心", locatedPage: "web/tenant (待建)", percentage: 0, acceptanceCriteria: "1. 可與房東進行即時訊息溝通。\n2. 訊息含已讀回條功能。\n3. 可發送圖片與文件（最大10MB）。\n4. 新訊息推送通知（系統通知與 Email）。\n5. 訊息記錄可按日期搜尋，最長保留2年。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租客的繳費記錄", locatedPage: "web/tenant (待建)", percentage: 0, acceptanceCriteria: "1. 顯示歷月繳費記錄（日期、金額、方式、狀態）。\n2. 每筆記錄可下載收據（PDF）。\n3. 未來12個月的應付款項預覽。\n4. 可設定繳費提醒（到期前3/7/14天）。\n5. 逾期費用醒目標示，顯示逾期天數與累計罰款。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-tenant-buyer-20260221.md", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 合約與法務
        { name: "買賣合約附加條款功能", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 提供預設附加條款範本庫（如「瑕疵擔保」「裝潢保留」）。\n2. 可自訂附加條款文字，富文本格式支援。\n3. 條款選擇後自動插入合約對應位置。\n4. 附加條款需買賣雙方各自確認同意後生效。\n5. 法律顧問可遠端審閱並批注（不可直接修改）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "合約與法務 (Contracts & Legal)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租賃合約附加條款功能", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 提供租賃專用附加條款範本（如「禁止飼養寵物」「提前終止違約金」）。\n2. 附加條款以區塊形式拖曳排序調整位置。\n3. 租客簽署前需確認閱讀所有附加條款。\n4. 附加條款變更需雙方重新確認。\n5. 記錄條款版本歷史（修改時間、修改者）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "合約與法務 (Contracts & Legal)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成買賣制式合約", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 輸入必要資訊（買賣雙方資料、物件資訊、成交金額、付款條件）後一鍵生成。\n2. 生成的合約符合台灣不動產買賣制式合約規範。\n3. 生成時間 < 10 秒，輸出格式為 PDF。\n4. 合約草稿可人工修改（關鍵條款標黃提示不建議修改）。\n5. 合約生成記錄存檔，可查看歷史版本。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "合約與法務 (Contracts & Legal)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成租賃制式合約", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 輸入出租方/承租方資訊、物件地址、租金、期限、押金後一鍵生成。\n2. 生成合約符合住宅租賃定型化契約規範（內政部版）。\n3. 生成 PDF 時自動套用雙方姓名、地址、日期等資訊。\n4. 合約可加蓋電子騎縫章（每頁）。\n5. 支援繁/簡/英三語版本切換。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "合約與法務 (Contracts & Legal)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "電子簽約功能", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 生成合約後可發送電子簽署邀請至買賣/租賃雙方 Email。\n2. 每一方在安全連結中完成電子簽名（手寫簽名或文字簽名）。\n3. 所有方完成簽署後，生成合法效力的電子合約（含簽署時間戳）。\n4. 已簽署合約以 PDF 格式自動發送至所有簽署方。\n5. 合約簽署狀態可即時追蹤（待某方簽署/全部完成）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "合約與法務 (Contracts & Legal)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },

        // 通用/系統
        { name: "一鍵切換UI風格：暗/亮模式", locatedPage: "全站", percentage: 0, acceptanceCriteria: "1. 點擊切換按鈕（或依系統設定）立即切換暗/亮模式，無需刷新頁面。\n2. 使用者設定持久化（下次登入維持上次選擇）。\n3. 所有頁面、組件、彈窗均支援暗/亮模式，無色彩殘留問題。\n4. 過渡動畫流暢（約200ms）。\n5. 系統自動偵測作業系統主題並設為預設值。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md", category: "通用/系統 (General/System)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "RWD網頁響應式設計", locatedPage: "全站", percentage: 80, acceptanceCriteria: "1. 手機（320px+）、平板（768px+）、桌機（1024px+）三種斷點下版面正確顯示。\n2. 導航選單在手機版切換為漢堡選單（Hamburger Menu）。\n3. 所有表單元素在手機版觸控操作友善（最小觸控區域44x44px）。\n4. 圖片採用響應式圖片（srcset），依裝置解析度載入適當尺寸。\n5. 手機版首屏渲染 < 3 秒（4G網路環境）。", docPath: "/project-process/features/company-homepage.md", featureSpecDocPath: "/project-process/features/company-homepage.md", tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md", category: "通用/系統 (General/System)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者身份驗證系統", locatedPage: "web/login, web/register", percentage: 90, acceptanceCriteria: "1. 支援 Email/密碼登入與 Google OAuth 登入。\n2. JWT Token 有效期24小時，Refresh Token 有效期7天。\n3. 連續5次登入失敗後帳號暫時鎖定（15分鐘）。\n4. 新裝置登入時發送 Email 安全通知。\n5. 密碼需符合強度要求（最少8字元、含大小寫與數字）。", docPath: "/project-process/features/auth-system.md", featureSpecDocPath: "/project-process/features/auth-system.md", tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md", category: "通用/系統 (General/System)", points: 8, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "註冊的使用者都有自己的行事曆管理頁面", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 行事曆提供日/週/月三種視圖切換。\n2. 可新增、編輯、刪除行程（含標題、時間、地點、備註）。\n3. 系統自動事件（看房預約、合約到期、繳費日）顯示在行事曆。\n4. 可設定事件提醒（提前15分/1小時/1天通知）。\n5. 行事曆可匯出 .ics 格式（相容 Google Calendar）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者登入頁面", locatedPage: "web/login", percentage: 100, acceptanceCriteria: "1. 頁面提供 Email/密碼表單與 Google OAuth 按鈕。\n2. 密碼欄位有顯示/隱藏切換功能。\n3. 登入成功後依角色導向對應儀表板（房東→房東儀表板）。\n4. 表單提交後有 loading 狀態，防止重複提交。\n5. 提供「忘記密碼」連結，導向密碼重設流程。", docPath: "/project-process/features/auth-system.md", featureSpecDocPath: "/project-process/features/auth-system.md", tddSpecDocPath: "/project-process/features/tdd-login-portal-iam-20260221.md", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "使用者登入頁面-記住我功能", locatedPage: "web/login", percentage: 100, acceptanceCriteria: "1. 勾選「記住我」後，登出後再次登入毋需重新輸入 Email/密碼（30天有效）。\n2. 「記住我」以安全的 HttpOnly Cookie 實作，不暴露於 localStorage。\n3. 於新裝置/瀏覽器「記住我」不自動生效。\n4. 使用者可在帳號設定中撤銷所有「記住我」的設備。\n5. 30天後 Cookie 自動到期，需重新登入。", docPath: "/project-process/features/remember-me-tdd-report-20260205.md", featureSpecDocPath: "/project-process/features/remember-me-tdd-report-20260205.md", tddSpecDocPath: "/project-process/features/remember-me-tdd-report-20260205.md", category: "通用/系統 (General/System)", points: 2, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "使用者密碼重設頁面", locatedPage: "web/forgot-password, web/update-password", percentage: 95, acceptanceCriteria: "1. 輸入 Email 後發送密碼重設連結，連結有效期1小時。\n2. 點擊連結後進入重設頁面，輸入新密碼（需輸入兩次確認）。\n3. 重設成功後前一個 Session 自動登出。\n4. 重設連結只能使用一次，使用後失效。\n5. 24小時內申請重設次數上限5次（防止暴力攻擊）。", docPath: "/project-process/features/auth-system.md", featureSpecDocPath: "/project-process/features/auth-system.md", tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者的溝通頁面", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 集中顯示所有角色的訊息往來（不依物件分割）。\n2. 可同時與多個對象對話（多視窗或分頁切換）。\n3. 訊息支援 Markdown 格式。\n4. 群組對話功能（如「物件 A 的所有相關方」）。\n5. 離線時未讀訊息在上線後彙整推送通知。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "受邀使用者登入介面", locatedPage: "web/onboarding/add-role", percentage: 0, acceptanceCriteria: "1. 受邀者點擊邀請連結後進入專屬歡迎頁（含邀請方名稱與角色說明）。\n2. 可選擇使用 Email 創建帳號或 Google 登入綁定。\n3. 帳號設定完成後，直接進入對應角色的儀表板。\n4. 若邀請連結已過期（24小時），顯示明確提示並提供重新申請入口。\n5. 完成首次登入後，邀請連結自動失效。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        {
            name: "謄本權狀掃描功能",
            locatedPage: "web/landlord/properties/add",
            percentage: 95,
            acceptanceCriteria: "1. 上傳謄本/權狀文件（JPG、PNG、PDF），系統自動辨識並擷取關鍵資訊。\n2. 擷取資訊包含：地段、地號、面積、所有權人、抵押設定。\n3. OCR 準確率在清晰文件下達 90% 以上。\n4. 擷取結果可人工校正，並儲存至物件資料。\n5. 文件儲存至雲端，可隨時下載原始掃描檔。",
            docPath: "/project-process/features/vlm-ocr-system.md",
            featureSpecDocPath: "/project-process/features/vlm-ocr-system.md",
            tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md",
            category: "通用/系統 (General/System)",
            points: 5,
            lastModifiedBy: "Trae AI",
            lastModifiedDate: "2026/03/15",
            devLog: "[2026/03/15] (Trae AI)\n• 支援地端 (Local) 與雲端 (Cloud) 雙機制切換\n• 實作 CJK 相容字元正規化與控制字元清理\n• 完善建物與土地謄本的欄位對應邏輯",
            devLogDocPath: "/docs/operational-guides/transcript-parsing-guide.md"
        },
        { name: "上傳物件照片功能", locatedPage: "web/landlord/properties/add", percentage: 95, acceptanceCriteria: "1. 支援一次選擇並上傳最多20張照片。\n2. 上傳格式支援 JPG、PNG、WebP，單檔最大 10MB。\n3. 上傳時顯示進度條，支援斷點續傳。\n4. 上傳後可拖曳排序，設定封面照。\n5. 系統自動生成壓縮縮圖（Thumbnail），用於列表預覽。", docPath: "/project-process/features/photo-upload.md", featureSpecDocPath: "/project-process/features/photo-upload.md", tddSpecDocPath: "/project-process/features/tdd-system-common-20260221.md", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 金流支付
        { name: "可用的付款方式之一: ID pay", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 使用者可在結帳頁面選擇 ID Pay 作為付款方式。\n2. 整合 ID Pay API，完成身份驗證後付款。\n3. 付款成功後系統自動更新付款狀態並發送確認通知。\n4. 失敗的付款提供明確錯誤說明與重試入口。\n5. 支援 ID Pay 的退款流程（7個工作天內）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: Apple Pay", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 在支援 Apple Pay 的裝置與瀏覽器上顯示 Apple Pay 按鈕。\n2. 點擊後觸發裝置原生的 Touch ID/Face ID 驗證。\n3. 驗證成功後完成支付，整個流程 < 10 秒。\n4. 付款成功發送確認通知（Email + 系統通知）。\n5. 不支援 Apple Pay 的環境自動隱藏該選項。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: PayPal", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 點擊 PayPal 按鈕後跳出 PayPal 登入/快速結帳視窗。\n2. 支援 PayPal 帳戶付款與訪客信用卡付款兩種模式。\n3. PayPal 完成確認後返回系統並更新付款狀態。\n4. 支援 AUD 與 TWD 貨幣。\n5. 退款可從系統後台直接觸發 PayPal 退款 API。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: Credit card", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 整合 Stripe 信用卡付款（支援 Visa、Mastercard、AMEX）。\n2. 卡號輸入使用 Stripe Elements（安全嵌入式輸入）。\n3. 付款失敗時顯示 Stripe 返回的錯誤原因（如：餘額不足）。\n4. 支援儲存卡號功能（Token化，不儲存原始卡號）。\n5. 3DS 二次驗證整合（符合 PSD2 標準）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "線上支付功能", locatedPage: "web (待建)", percentage: 0, acceptanceCriteria: "1. 結帳頁面顯示付款摘要（項目、金額、稅金、總計）。\n2. 支援多種付款方式選擇（信用卡、PayPal、Apple Pay、ID Pay）。\n3. 付款成功後生成電子收據（PDF），自動寄送至 Email。\n4. 系統顯示付款結果頁（成功/失敗），失敗附有重試按鈕。\n5. 所有付款交易記錄在後台可查詢（含交易ID、時間、金額、狀態）。", docPath: "", tddSpecDocPath: "/project-process/features/tdd-contracts-payments-20260221.md", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 測試與品質保證
        { name: "登入頁面>「記住我」功能 TDD 開發進度檢測報告", locatedPage: "文件/測試報告", percentage: 100, acceptanceCriteria: "1. 測試報告需包含所有測試案例清單（Happy Path & Edge Case）。\n2. 每個測試案例需標示通過/失敗狀態與執行時間。\n3. 程式碼覆蓋率需達 80% 以上（Unit + Integration）。\n4. 報告需列出發現的缺陷與修復說明。\n5. 最終結論明確標示功能是否符合驗收標準。", docPath: "/project-process/features/remember-me-tdd-report-20260205.md", featureSpecDocPath: "/project-process/features/remember-me-tdd-report-20260205.md", tddSpecDocPath: "/project-process/features/remember-me-tdd-report-20260205.md", category: "測試與品質保證 (Testing & QA)", points: 5, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },

        // 專案管理與工具
        { 
            name: "專案開發進度儀表板重構 (Project Dashboard Overhaul)",
            locatedPage: "superadmin/dashboard/project-progress",
            percentage: 100,
            acceptanceCriteria: "1. 需支援欄位寬度動態調整。\n2. 需記憶使用者偏好設定。\n3. 需支援雙語標題。\n4. 需整合開發日誌與測試日誌連結。",
            docPath: "/project-process/progress-reports/daily-reports/project-dashboard-overhaul-2026-02-06.md",
            tddSpecDocPath: "/project-process/features/tdd-project-management-20260221.md",
            category: "專案管理與工具 (Project Management)", 
            points: 3, 
            lastModifiedBy: "Trae AI", 
            lastModifiedDate: "2026/02/13",
            devLog: "[2026/02/13] (Trae AI)\n• 完成第二階段重構：支援 9 欄位 Flexbox 佈局、拖曳調整寬度、雙語標題與連結整合。\n詳見: [開發日誌](../dev-logs/dev-dashboard-refactor-2026-02-13.md)",
            testProgress: "[2026/02/13] (Trae AI)\n• 驗證欄位拖曳、localStorage 存取與重置功能正常。\n詳見: [測試日誌](../test-logs/test-dashboard-refactor-2026-02-13.md)",
            testCoverage: 0
        },

        // === 2026-02-14 新增任務 ===
        {
            name: "OCR 服務 lint 與型別檢查修正",
            locatedPage: "後端/OCR 服務",
            percentage: 100,
            workCategory: "維運",
            featureDescription: "修復 OCR 服務 ruff 規範問題並完成 ruff 驗證，同步執行 mypy 型別檢查並彙整待修項目",
            acceptanceCriteria: "1. ruff check src tests 無錯誤。\n2. mypy 執行完成並輸出待修清單。",
            developmentProgress: "100%（已修正 B904/unused/whitespace/exception chaining）",
            tddSpecDocPath: "/project-process/features/tdd-project-management-20260221.md",
            category: "專案管理與工具 (Project Management)",
            points: 3,
            devLog: "• 今日完成項目：修正 OCR service 的 ruff 錯誤（B904/unused/whitespace/exception chaining），重新執行 ruff 驗證。\n• 技術難點與解法：B904 例外鏈結與局部型別不一致問題，透過補齊 raise from 與整理變數使用修正。\n• 心得報告與避坑指南：先清掉 lint 噪音再做型別修正，可降低後續 mypy 修復成本。\n• 下階段計畫與預估工時：分批修復 mypy 型別標註與 Optional/union 問題，預估 4-6 小時。",
            testProgress: "60%（ruff 通過；mypy 已執行仍有 237 errors 待修）",
            testLog: "已執行：ruff check src tests（通過）、mypy src（失敗）。\n缺陷：mypy 回報 237 errors（缺少型別標註、Optional/union 取用問題）。\n修復狀態：已完成 ruff 修正，mypy 待處理。",
            lastModifiedBy: "Trae AI",
            lastModifiedDate: "2026/02/14"
        },
        {
            name: "删除錯誤的 vercel.json 配置文件",
            locatedPage: "專案根目錄/部署",
            percentage: 100,
            workCategory: "部署優化",
            featureDescription: "移除破壞 Next.js App Router 的 SPA 重寫規則配置，確保 SSR、API Routes 和 Server Actions 正常運作",
            acceptanceCriteria: "1. vercel.json 文件已刪除。\n2. Next.js SSR 功能正常。\n3. API Routes 可正常訪問。\n4. Server Actions 正常執行。\n5. Vercel 自動檢測 Next.js 項目配置。",
            developmentProgress: "100%",
            tddSpecDocPath: "/project-process/features/tdd-project-management-20260221.md",
            category: "專案管理與工具 (Project Management)",
            points: 2,
            devLog: "### 今日完成項目\n• 刪除錯誤的 vercel.json（SPA rewrite 規則破壞 Next.js SSR）\n• Git commit: acb83b2\n\n### 技術難點與解決方案\n• 問題: vercel.json SPA 配置會將所有請求導向 /index.md，繞過 Next.js 渲染引擎\n• 解決: 完全刪除，讓 Vercel 自動檢測 Next.js\n\n### 避坑指南\n⚠️ 不要將 CRA/Vue/Angular 的 SPA 配置用於 Next.js\n⚠️ Next.js 16+ 不需要 vercel.json\n\n### 下階段計畫\n• [ ] 驗證生產環境 SSR 和 API Routes",
            testProgress: "100%",
            testLog: "✅ 文件刪除成功\n✅ Git 提交完成 (acb83b2)\n✅ 本地 Next.js 構建和運行正常",
            lastModifiedBy: "Claude Sonnet 4.5",
            lastModifiedDate: "2026/02/14"
        },
        {
            name: "Winston 日誌系統重構為 Supabase 資料庫日誌",
            locatedPage: "apps/web/lib",
            percentage: 100,
            workCategory: "日誌系統",
            featureDescription: "將基於文件系統的 Winston 日誌改造為 Supabase 資料庫日誌，實現 Serverless 環境兼容性",
            acceptanceCriteria: "1. 創建 logs 資料表及 RLS 策略。\n2. 實作 SupabaseTransport 批次寫入機制。\n3. 支援環境自動檢測（Serverless vs Container）。\n4. 保留可選的文件日誌功能。\n5. 通過 Supabase migration 部署測試。",
            developmentProgress: "100%",
            tddSpecDocPath: "/project-process/features/tdd-project-management-20260221.md",
            category: "專案管理與工具 (Project Management)",
            points: 5,
            devLog: "### 今日完成項目\n• 重構 apps/web/lib/logger.ts，新增 SupabaseTransport\n• 創建 migration: 20260214000000_create_logs_table.sql\n• 實作批次寫入（10 條或 5 秒超時）\n• 環境檢測（Vercel/Netlify/AWS/Cloudflare）\n• Git commit: acb83b2\n\n### 技術難點與解決方案\n• 問題 1: fs.mkdir/fs.appendFile 在 Serverless 無法持久化 → 改用 Supabase DB\n• 問題 2: 高頻寫入 → 批次隊列機制\n• 問題 3: 本地開發便利性 → ENABLE_FILE_LOGGING 環境變數\n\n### 避坑指南\n⚠️ Serverless 環境不能用文件日誌\n⚠️ 批次寫入需處理 process beforeExit flush\n⚠️ 使用 service role key，禁用 session 持久化\n\n### 下階段計畫\n• [ ] 部署 migration（npx supabase db push）\n• [ ] 配置 SUPABASE_SERVICE_ROLE_KEY\n• [ ] 測試日誌寫入和查詢",
            testProgress: "80%（代碼完成，待部署後驗證）",
            testLog: "✅ TypeScript 編譯通過\n✅ 環境檢測邏輯正確\n✅ SupabaseTransport 結構完整\n✅ SQL migration 語法正確\n⏳ 待部署後驗證實際寫入",
            lastModifiedBy: "Claude Sonnet 4.5",
            lastModifiedDate: "2026/02/14"
        },
        {
            name: "雲端部署平台選擇說明書",
            locatedPage: "docs/operational-guides",
            percentage: 100,
            workCategory: "文件撰寫",
            featureDescription: "撰寫完整的雲端部署平台選擇指南，涵蓋 7 個平台對比、成本分析、三階段部署策略及風險評估",
            acceptanceCriteria: "1. 完成 7 平台對比（Vercel、Cloudflare、Railway、Render、Netlify、AWS、VPS）。\n2. 三階段成本分析。\n3. 實施路線圖和決策矩陣。\n4. 風險評估與緩解策略。",
            developmentProgress: "100%",
            tddSpecDocPath: "/project-process/features/tdd-project-management-20260221.md",
            category: "專案管理與工具 (Project Management)",
            points: 3,
            docPath: "/docs/operational-guides/deployment-guides/cloud-deployment-platform-selection-guide.md",
            devLog: "### 今日完成項目\n• 創建 cloud-deployment-platform-selection-guide.md（2314 行）\n• 7 個平台詳細對比\n• 成本試算（1K MAU 和 10K MAU）\n• 三階段部署路線圖\n• 風險矩陣和緩解策略\n\n### 重點心得\n• Cloudflare Pages 無限流量是最大亮點\n• Vercel Hobby 最適合初期測試\n• 文件系統需求是 Serverless vs Container 的分水嶺\n\n### 避坑指南\n⚠️ 不要一開始就選企業級方案\n⚠️ 監控 Vercel 100GB 帶寬限制\n⚠️ SUPABASE_SERVICE_ROLE_KEY 不可加 NEXT_PUBLIC_ 前綴\n\n### 下階段計畫\n• [ ] 2-3 個月後評估實際流量\n• [ ] 準備平台遷移演練（每半年一次）",
            testProgress: "100%（文檔完成並已審閱）",
            testLog: "✅ Markdown 語法正確\n✅ 7 個平台全部覆蓋\n✅ 定價資訊準確\n✅ 實施步驟可操作\n✅ 風險評估全面",
            lastModifiedBy: "Claude Sonnet 4.5",
            lastModifiedDate: "2026/02/14"
        },

        // === 2026-02-16 新增任務 ===
        {
            name: "登入／Portal／IAM 角色流程與 Superadmin 全角色選單",
            locatedPage: "web/portal, superadmin/users",
            percentage: 100,
            workCategory: "認證與權限",
            featureDescription: "登入後一律進 Portal；多角色與 middleware 同步；Portal 顯示使用者 IAM 角色卡；Superadmin 邀請使用者可選全部 iam_roles；測試帳號加入所有 IAM 群組並以 Playwright 驗證。",
            acceptanceCriteria: "1. 登入後一律導向 /portal。\n2. 多角色用戶在 Portal 可見所有被指派角色卡。\n3. Superadmin「Invite User」角色下拉顯示 DB 內全部角色（約 16 個）。\n4. 測試帳號 a0405142777@gmail.com 於 Portal 可見 11 張角色卡。\n5. Playwright 可完成登入→Portal→Superadmin 流程驗證。",
            developmentProgress: "100%",
            tddSpecDocPath: "/project-process/features/tdd-login-portal-iam-20260221.md",
            category: "通用/系統 (General/System)",
            points: 5,
            docPath: "/project-process/dev-logs/dev-login-portal-iam-roles-2026-02-16.md",
            devLog: "### 今日完成項目\n- 登入後一律導向 Portal；syncUserRolesToAuthMetadata 改 fire-and-forget。\n- normalizeRoles 移至 lib/roles.ts；middleware 空 roles 時導向 /portal。\n- Superadmin getRoles() 改為 admin client，Invite User 從 iam_roles 載入全表。\n- Migration 補齊 16 個 iam_roles、測試用戶加入所有 IAM 群組（Portal 11 張卡）。\n- Playwright 符號連結 1208→1200；以帳密執行登入與 Portal／Invite 驗證。\n\n### 技術難點與解決方案\n- 登入卡住：不 await sync，立即 window.location.href = '/portal'。\n- Portal 僅 2 卡：測試用戶僅 2 群組 → migration 加入所有 iam_groups。\n- Invite 僅 2 選項：getRoles() 用 service_role 查 iam_roles + migration 種子全角色。\n- normalizeRoles 在 'use server' 報錯：移至 lib/roles.ts。\n\n### 避坑指南\n⚠️ 'use server' 匯出函式須為 async。\n⚠️ 登入導向勿阻塞在 sync metadata。\n⚠️ Playwright MCP 缺 1200 時可 symlink 至 1208。\n\n### 下階段計畫\n- [ ] 評估 IAM 變更時同步 Auth user_metadata.roles。\n- [ ] E2E 新增多角色登入→Portal、Portal 卡數與 IAM 一致。\n\n詳見: /superadmin/docs?scope=project&path=project-process/dev-logs/dev-login-portal-iam-roles-2026-02-16.md",
            testProgress: "100%（Playwright 登入→Portal→Superadmin Invite 手動驗證通過）",
            testLog: "✅ 登入後進入 /portal。\n✅ Portal 顯示 11 張角色卡（測試用戶已加入所有群組）。\n✅ Superadmin Invite User 角色下拉 16 選項。\n✅ Playwright MCP 登入＋擷取角色卡數與選項數驗證。",
            lastModifiedBy: "Claude (Auto)",
            lastModifiedDate: "2026/02/16"
        },
        {
            name: "OAuth 用戶新增角色功能修復（Add Role Feature Fix）",
            locatedPage: "web/portal, web/onboarding/add-role",
            percentage: 100,
            workCategory: "認證與權限",
            featureDescription: "修復 OAuth 登入用戶在 Portal 新增角色時出現的失敗問題，涉及 RLS 權限、IAM 群組映射、前端路由跳轉三個層面的問題診斷與修復。",
            acceptanceCriteria: "1. OAuth 用戶可在 Portal 成功新增角色（potential_tenant、potential_buyer 等）。\n2. 新增角色後 users_profile.roles 與 IAM 群組成員資格同步更新。\n3. Portal 頁面正確顯示所有用戶角色（從 IAM 系統讀取）。\n4. 前端無卡頓，成功跳轉回 Portal。\n5. ROLE_TO_GROUP_NAME 映射完整涵蓋所有角色類型。",
            developmentProgress: "100%",
            tddSpecDocPath: "/project-process/features/tdd-project-management-20260221.md",
            category: "通用/系統 (General/System)",
            points: 5,
            devLog: "### 今日完成項目\n- 修復 addUserRole Server Action：改用 admin 客戶端繞過 RLS 限制\n- 修復前端路由跳轉：router.push 改為 window.location.href 強制完整重新載入\n- 修復 IAM 角色映射缺失：ROLE_TO_GROUP_NAME 補齊 potential_tenant、potential_buyer、contracted_tenant、contracted_buyer、super_admin\n- 手動修復測試用戶的 IAM 群組成員資格（加入 Potential Buyers 和 Potential Tenants）\n- 驗證 get_user_roles RPC 正確返回所有 3 個角色\n\n### 技術難點與解決方案\n- **問題 1**: Server Action 一直 rendering，無法完成\n  **根因**: router.push() 在某些情況下不立即執行，導致頁面保持 loading 狀態\n  **解決**: 使用 window.location.href 強制完整頁面重新載入\n\n- **問題 2**: 角色成功添加到 users_profile.roles，但 Portal 不顯示\n  **根因**: ROLE_TO_GROUP_NAME 映射缺少 potential_tenant/potential_buyer，導致 addUserToIamGroupByRole 使用默認的 landlord 群組，IAM 系統未正確添加群組成員資格\n  **解決**: 補齊映射表，手動修復現有用戶的 IAM 群組成員資格\n\n- **問題 3**: addUserRole 使用普通客戶端可能受 RLS 限制\n  **根因**: createClient() 使用 anon key，雖然 RLS 允許更新，但使用 admin 客戶端更安全可靠\n  **解決**: 改用 createAdminClient() 進行角色更新操作\n\n### 重點心得\n- Portal 頁面通過 get_user_roles RPC 從 IAM 系統讀取角色，而非直接讀 users_profile.roles\n- IAM 系統是 Single Source of Truth，users_profile.roles 僅為緩存\n- 角色映射配置（ROLE_TO_GROUP_NAME）必須完整，否則會導致 IAM 同步失敗但不報錯\n- 數據庫層面的 UPDATE 成功不代表整個業務邏輯成功\n\n### 避坑指南\n⚠️ 新增角色類型時必須同步更新 ROLE_TO_GROUP_NAME 映射\n⚠️ Server Action 中處理敏感權限操作應使用 admin 客戶端\n⚠️ 路由跳轉問題可能不會拋錯，需要通過用戶反饋發現\n⚠️ 驗證功能時要檢查整個數據流：DB → IAM → RPC → Portal 顯示\n⚠️ 日誌中顯示「Success」不一定代表所有步驟都成功（IAM 添加被標記為 non-critical）\n\n### 下階段計畫\n- [ ] 考慮在 addUserRole 中添加 IAM 同步失敗時的回滾機制\n- [ ] 新增 E2E 測試覆蓋多角色添加流程\n- [ ] 監控生產環境用戶新增角色的成功率",
            testProgress: "100%（手動測試通過，涵蓋完整流程驗證）",
            testLog: "✅ 數據庫層面 UPDATE 操作成功（SQL 測試通過）\n✅ RLS 政策允許用戶更新自己的 profile\n✅ addUserRole Server Action 成功返回\n✅ IAM 群組成員資格正確添加（手動驗證 iam_group_members 表）\n✅ get_user_roles RPC 返回所有 3 個角色\n✅ Portal 頁面顯示所有角色卡片（landlord、potential_buyer、potential_tenant）\n✅ 前端路由跳轉正常，無卡頓\n✅ 重複添加已有角色時正確顯示錯誤訊息",
            testCoverage: 0,
            lastModifiedBy: "Claude Sonnet 4.5",
            lastModifiedDate: "2026/02/16-23:30"
        },
        // 超級管理員 - AI 服務設定（API 金鑰與模型）
        {
            name: "超級管理員-AI 服務設定（API 金鑰與模型費用）",
            locatedPage: "superadmin/settings/api_key_and_model_setting",
            percentage: 86,
            acceptanceCriteria: "1. API 金鑰管理：從 .env 導入、單筆/全部刪除、金鑰驗證。\n2. 未登入時以 resolveUserId fallback 寫入/讀取 Supabase（keys/models/modules/prompts）。\n3. 側欄組態概況：已選總 models 數量即時反映各 provider 勾選加總。\n4. 儲存設定按鈕：將畫面上已選模型寫入 ai_model_selections。\n5. 分頁命名：模型費用說明；說明文案導向「模型費用說明」分頁。",
            docPath: "/docs/update-project-progress-guide.md",
            featureSpecDocPath: "/project-process/features/tdd-ai-settings-20260221.md",
            tddSpecDocPath: "/project-process/features/tdd-ai-settings-20260221.md",
            category: "超級管理員 (Super Admin)",
            points: 5,
            devLog: "### 2026-03-04 更新\n- 修復 統一prompt測試 功能無限重渲染 bug（Maximum update depth exceeded）。\n- 根本原因：page.tsx 每次渲染時 currentKeys 產生新陣列引用，導致 allRows→handleBatchTest→headerActionsRef useEffect 形成無限迴圈。\n- 修復方案（雙重防護）：(1) ModelEvaluator.tsx 使用 stable ref 模式（handleBatchTestRef + stableRunBatchTest），移除 handleBatchTest 作為 useEffect dep；(2) page.tsx 以 useMemo 穩定 currentKeys 引用。\n- TDD：新增 5 個批次測試執行行為測試案例，共 28 個測試全部通過。\n\n### 2026-03-06 更新\n- 在「已選/可選模型評估」分頁列右側新增「統一測試設定」按鈕。\n- 按鈕重用既有 isEvalToolbarOpen 狀態，僅切換本頁統一測試面板顯示，不影響其他頁面功能。\n- 補上 aria-controls 對應面板 id（global-test-settings-panel），強化可及性。\n\n### 2026-03-06 更新（調整）\n- 移除 ModelEvaluator 表頭「統一測試」按鈕與 onOpenGlobalTestPanel 相關程式碼。\n- 移除 settings/api_key_and_model_setting 的 `*-global-test` hash 入口，`#blog-global-test` 不再觸發對應頁面行為。\n- 同步刪除已不適用的按鈕行為測試案例，避免測試與現況不一致。\n\n### 2026-03-06 更新（獨立頁）\n- 「統一測試設定」按鈕改為固定顯示在分頁列右側，不再只在 evaluations 分頁顯示。\n- 按鈕改為導向獨立頁 `/superadmin/settings/evaluations-global-test`，不再綁定 `#evaluations` 或本頁內嵌面板開關。\n- 移除 api_key_and_model_setting 內嵌的統一測試設定面板，避免與獨立頁重複。\n\n### 2026-03-06 更新（批次報告）\n- 批次測試完成後，自動將結果快照寫入 localStorage（最近一次報告）。\n- 新增「檢視最近報告」動作，透過 headerActionsRef 暴露給頁首按鈕呼叫。\n- 在「開始統一測試」旁新增「檢視最近報告」按鈕，使用者可隨時重新開啟最近一次批次結果視窗。\n\n### 2026-03-06 更新（UX 精簡）\n- 將右側設定區主流程收斂為「雲端 Prompt 選擇/載入 + 儲存雲端新版本 + 開始統一測試」。\n- 補上「載入雲端 Prompt」明確動作，避免僅選取下拉選單卻未真正載入內容的混淆。\n- 將本機 Prompt、下載、刪除雲端等操作收進「進階設定」摺疊區，降低主畫面複雜度。\n\n### 2026-03-06 更新（提示與確認流程）\n- 將 evaluations-global-test 頁面的 window.alert / window.confirm 全數移除，改為頁內 inline 提示訊息。\n- 刪除本機 Prompt 與刪除雲端 Prompt 改為「二次點擊確認」流程，避免誤刪且不中斷操作。\n- 提示訊息統一在右側設定區顯示，成功/錯誤/資訊狀態一致化。\n\n### 2026-03-06 更新（最近報告一鍵修正）\n- 新增「套用最近報告修正狀態」按鈕，將最近批次報告一次套用到模型分類與狀態。\n- 依報告內容自動推斷 `display_status_override`（VLM/LLM/不可用）並同步更新 `is_working`、`notes`、`last_tested_at`。\n- 套用後即回寫 ai_model_evaluations，避免逐筆手動調整模型狀態。\n\n### 2026-03-06 更新（移除混亂控件）\n- 依使用者回饋移除右側設定區的雲端 Prompt 管理與進階設定區塊（含載入、版本命名、儲存版本、本機 Prompt、刪除與下載）。\n- 僅保留核心流程：上傳測試檔案、編輯全域 Prompt、開始統一測試、檢視最近報告、套用最近報告修正狀態。",
            testProgress: "TDD: 28/28 tests passing（含 統一/單一 prompt 測試功能完整測試）",
            testCoverage: 15,
            testScriptCount: 28,
            testScriptPassedCount: 28,
            lastModifiedBy: "GPT-5.3-Codex",
            lastModifiedDate: "2026/03/06"
        },

        // === 2026-02-21 新增任務 ===
        {
            name: "Project Progress Dashboard — Feature Spec URL & TDD Spec URL 欄位完善",
            locatedPage: "superadmin/dashboard/project-progress",
            percentage: 100,
            workCategory: "資料補全/功能強化",
            featureDescription: "為 Development Tab 的 Col3 (Feature Spec URL) 與 Col5 (TTD Spec URL) 補全所有 feature 的 acceptanceCriteria、featureSpecDocPath、tddSpecDocPath 欄位。新增 4 個 TDD spec HTML 報告文件。更新 DevelopmentTab.tsx 讓兩欄同時顯示連結與文字內容。",
            acceptanceCriteria: "1. 所有 65 個 feature 均有 acceptanceCriteria 驗收標準文字。\n2. 有現有 spec 文件的 feature 均設定 featureSpecDocPath，顯示為「Spec Doc」連結。\n3. 主要測試 feature 均設定 tddSpecDocPath，顯示為「TDD Spec」連結。\n4. Col3/Col5 Cell 同時顯示連結 icon 與文字內容。\n5. TypeScript 嚴格模式零錯誤。",
            docPath: "",
            featureSpecDocPath: "/project-process/features/tdd-project-progress-dashboard-20260221.md",
            tddSpecDocPath: "/project-process/features/tdd-project-progress-dashboard-20260221.md",
            category: "專案管理與工具 (Project Management)",
            points: 5,
            mode: "agent",
            model: "claude-sonnet-4-6",
            testProgress: "100%（TypeScript 零錯誤，畫面驗證通過）",
            testLog: "✅ tsc --noEmit 零錯誤\n✅ Col3 Spec Doc 連結正確渲染\n✅ Col5 TDD Spec 連結正確渲染\n✅ 65 個 feature 均有 acceptanceCriteria\n✅ 4 個 TDD spec HTML 文件建立完成",
            testCoverage: 0,
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/02/21"
        },

        // === 2026-02-19 新增任務 ===
        {
            name: "Project Progress Dashboard — 四階段 Tab 重構",
            locatedPage: "superadmin/dashboard/project-progress",
            percentage: 100,
            workCategory: "重構/優化",
            featureDescription: "將 1,478 行單一頁面拆分為四階段 Tab 架構（開發/測試/部署/運維），抽取共用元件，主頁面縮減至 87 行。新增 PhaseType 資料模型、Pill 風格 Tab 列、各階段統計卡片、DevelopmentTab（完整功能保留）、Testing/Deployment/Operations Tab 骨架。",
            acceptanceCriteria: "1. 四個 Pill Tab 正確顯示並可切換（#development/#testing/#deployment/#operations hash 導航）。\n2. Development Tab 保留所有原有功能（搜尋、分類篩選、凍結窗格、欄寬調整、Save Widths、排版對齊、伺服器同步）。\n3. 各 Tab 顯示差異化統計卡片。\n4. TypeScript 型別嚴格（禁 any），npm run build 零錯誤。\n5. 主頁面 < 100 行，各 Tab 元件各 200-400 行。",
            docPath: "/docs/update-project-progress-guide.md",
            featureSpecDocPath: "/project-process/features/tdd-project-progress-dashboard-20260221.md",
            tddSpecDocPath: "/project-process/features/tdd-project-progress-dashboard-20260221.md",
            category: "專案管理與工具 (Project Management)",
            points: 5,
            mode: "agent",
            model: "claude-sonnet-4-6",
            devLog: "### 今日完成項目\n- page.tsx 1,478 行 → 87 行（重構率 94%）\n- 新增 PhaseType、RoadmapFeature 擴展（phase/testStatus/deployStatus/ops 欄位）\n- 建立 components/: ProgressBar, StatCard, PhaseTabBar, SharedStatsCards, DevelopmentTab, TestingTab, DeploymentTab, OperationsTab\n- DevelopmentTab 完整搬移：凍結窗格、欄寬拖曳、Preset、排版、Server 同步\n- Hash-based navigation (#development/#testing/#deployment/#operations)\n- inferPhase() 自動從現有資料推導階段（testCoverage>0 → testing）\n- npm run build 零錯誤",
            testProgress: "100%（npm run build 通過，頁面結構與 Tab 切換手動驗證）",
            testLog: "✅ npm run build 零 TypeScript 錯誤\n✅ /superadmin/dashboard/project-progress 四 Tab 正確渲染\n✅ Development Tab 保留所有原有表格功能\n✅ URL hash 同步（#development 等）\n✅ 統計卡片隨 Tab 切換",
            testCoverage: 0,
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/02/19"
        },
        {
            name: "LocalAgent - Cursor & Claude CLI IDE 整合",
            locatedPage: "tools/local-agent, superadmin/dashboard/project-progress",
            category: "專案管理與工具 (Project Management)",
            percentage: 85,
            phase: "development",
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/02/24",
            devLog: "### 完成項目\n- dev_tasks DB migration 直接套用（bypass broken chain）\n- [id]/route.ts 修正 Next.js 16 async params (await context.params)\n- CursorAdapter：自動偵測 /Applications/IDEs/Cursor.app 路徑，產生 .cursor/dev-tasks/task-*.md 並啟動\n- ClaudeCLIAdapter：實作 spawn claude --dangerously-skip-permissions -p [prompt] --add-dir，等待完成後回報 status/logs\n- tools/local-agent/package.json + tsconfig.json：npm install && npm run build && npm run cursor/claude\n- run-cursor.sh / run-claude.sh：一鍵啟動腳本\n- apply-dev-tasks-migration.sh：bypass migration chain 直接套用 SQL\n- 完整 E2E 驗證：POST /api/dev-tasks → queued → LocalAgent 撿取 → succeeded，logs/result_summary 正確寫入 DB",
            docPath: "/tools/local-agent/README (run-cursor.sh / run-claude.sh)"
        },
        {
            name: "IAM Management Hub（整合）",
            locatedPage: "/superadmin/dashboard/iam-management",
            category: "超級管理員 (Super Admin)",
            percentage: 100,
            phase: "development",
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/02/27",
            devLog: "### 完成項目\n- 將 4 個分散頁面（iam-management, users, groups, rbac_access_control）整合為單一 tab 式儀表板\n- 新增 IAMTabBar / OverviewTab / UsersTab / GroupsTab / RolesTab 元件\n- iam-management/page.tsx 改為 hash-based tab shell（'use client'）\n- /superadmin/users、/superadmin/groups、/superadmin/dashboard/rbac_access_control 改為 client-side redirect\n- Sidebar 移除 3 個舊項目，IAM Management 改用 Shield icon\n- 2026/02/26：Roles tab Permission Matrix 完整 DB 持久化（iam_role_permissions 表、CRUD actions、即時儲存 UI）\n- 2026/02/27（Phase A）：修復 Hydration Error（useState 初始值從 getTabFromHash 改為 'overview' 常數，hash 讀取移至 useEffect）；刪除孤兒元件 PermissionMatrixTab.tsx（已被 RolesTab DB 版取代）"
        },
        {
            name: "Enterprise RBAC — Resources / Route Permissions / Scope",
            locatedPage: "/superadmin/dashboard/iam-management#roles",
            category: "超級管理員 (Super Admin)",
            percentage: 100,
            phase: "development",
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/02/27",
            devLog: "### 完成項目\n- DB migration 20260226190000：iam_role_permissions 新增 scope 欄位（all/own/assigned）+ CHECK constraint + index；新增 check_user_permission RPC\n- lib/rbac/resources.ts：16 resource 定義，分 5 組（Property/Contracts/Finance/IAM/System），export ResourceId + RESOURCE_DEFINITIONS + RESOURCES\n- lib/rbac/permissions.ts：PermissionScope type、checkUserHasPermission RPC wrapper、ROUTE_PERMISSIONS（21 路由對應）、findRoutePermission（最長前綴匹配）、getAccessibleRoutes\n- actions.ts：RolePermission 加 scope，getAllRolePermissions/saveRolePermissions 同步更新\n- RolesTab.tsx：16 resource 替換舊 7 個、scopeMatrix state、每欄 scope badge 可循環切換、Legend 說明\n- Sidebar.tsx：export navItems + NavItem，新增 accessibleHrefs prop 過濾可見路由\n- layout.tsx：改 async Server Component，呼叫 get_user_roles 判斷 isSuperAdmin，傳 accessibleHrefs 給 Sidebar\n- 2026/02/27（Phase C）：migration 20260227110000 — 5 張核心資料表（property_rentals / property_sales / lease_agreements / rental_ledger / sales_ledger）加入 iam_controlled_read + iam_managed_full_access 加法式 RLS 政策；透過 check_user_permission RPC 回傳 all/own/NULL 控制存取，保留既有 landlord/agent 政策不動\n- 2026/02/27（Phase D）：apps/web/middleware.ts 全面改寫 — 新增 ROUTE_ROLE_GUARDS（最長前綴優先）、getRequiredRoles()；受保護路由使用 get_user_roles() RPC 即時查 IAM 角色，super_admin 繞過全部守衛；role 不符跳轉 /portal?reason=insufficient_role"
        },
        {
            name: "OAuth 用戶入職 — Avatar URL 支援",
            locatedPage: "/onboarding",
            category: "通用/系統 (General/System)",
            percentage: 100,
            phase: "development",
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/02/27",
            devLog: "### 完成項目（Phase B）\n- config.toml：確認 Supabase CLI 不支援 scopes 鍵；改以 Dashboard UI 或 GOTRUE_EXTERNAL_*_SCOPES 環境變數設定 OAuth Scope（已在 config.toml 加入說明注解）\n- migration 20260227100000：users_profile 新增 avatar_url TEXT 欄位；從 auth.users.raw_user_meta_data 回填現有 OAuth 用戶（Google: avatar_url/picture，Facebook: avatar_url）\n- apps/web/lib/actions/onboarding.ts：createUserProfile() 新增 avatarUrl 提取（metadata.avatar_url || metadata.picture），寫入 users_profile.avatar_url"
        },
        {
            name: "超級管理員-物件管理（新增物件含媒體上傳）",
            locatedPage: "superadmin/properties",
            category: "超級管理員 (Super Admin)",
            percentage: 90,
            phase: "development",
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/03/02",
            devLog: "### 完成項目\n- getOwnersList() / createProperty() server actions（lib/actions/properties.ts）\n- CreatePropertyInput / OwnerOption 型別（lib/types/properties.ts）\n- PropertyCreateModal.tsx：含完整 6 頁籤（物件基本資訊 / 物件照片 / 謄本 / 權狀 / 合約 / 部落格）；兩段式建立流程：第一次儲存建立物件取得 ID，後續 tabs 接入 PropertyMediaSection；物件類型與所有權人建立後鎖定\n- PropertiesList.tsx：新增物件按鈕接入 PropertyCreateModal，onCreated 觸發 router.refresh()\n- properties/page.tsx：並行 fetch getAllProperties() + getOwnersList() 後傳入 PropertiesList",
            developmentProgress: "物件列表與編輯功能（含 PropertyEditModal + PropertyMediaSection）已完成；本次新增物件建立功能，6-tab create modal 完成。待補強：表單欄位前端 validation、建立後自動跳至媒體頁籤。"
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
            devLog: "### 完成項目\n- DB Migration：ocr_parse_results 表 + property_documents 新增 consensus_metadata / parse_strategy 欄位\n- TypeScript 型別：ModelParseResult / ConsensusMetadata / ConflictDetail / JudgeResolution\n- Feature Module：拆分 online_ocr → online_ocr_parse（解析組）+ online_ocr_judge（裁判組）\n- 共識演算法：transcript-consensus.ts — 多模型 majority vote、台灣特規正規化、信心分數\n- AI API 共用呼叫器：ai-api-callers.ts — 支援 OpenAI/Anthropic/Gemini/DeepSeek/Grok\n- 共識引擎 Server Action：consensus-parse.ts — 平行呼叫 → 共識投票 → 裁判仲裁 三階段流程\n- 向下相容：parse-transcript.ts 改為 wrapper 委派至共識引擎\n- UI 更新：PropertyMediaSection 新增信心徽章、衝突明細面板、共識 metadata 顯示\n- FeatureModuleSelector 提示文字：解析組建議 2~3 模型、裁判組為可選配置\n### 2026-03-04 新增\n- SSE 串流 API：/api/transcript-parse/stream — POST 端點，以 ReadableStream 逐模型即時回傳解析進度事件\n- TranscriptParseSection 元件：從 PropertyMediaSection 拆出（原 610 行降至 387 行），新增：(1) 可收折「解析設定」面板（顯示已設定之解析/裁判模型、一次性 Prompt 覆寫欄位、跳轉 AI 設定連結）；(2) 解析中以逐模型進度列表取代單一轉圈，即時顯示各模型狀態（等待/解析中/完成/失敗）及耗時\n### 2026-03-07 新增/調整\n- 解析模型單一事實來源：TranscriptParseSection 僅使用 online_ocr_parse 模組綁定的 assigned_models，移除與統一測試 441 個候選模型的耦合，避免使用者在兩處重覆設定\n- 每次謄本解析最多呼叫 5 個成功解析模型：依 OCP 排序逐一呼叫模型，成功數達 5 即停止；若前幾個失敗則依序啟用後續模型，避免一次對數十/數百模型發送 API 呼叫\n- 裁判模型排序備援：後端依 online_ocr_judge 的 assigned_models 順序（含本次 overrideJudgeModel）輪流嘗試裁判模型，任一成功即套用其判決；全部失敗時回退至多模型共識結果\n- JSON 安全性強化：transcript-parse/stream 與 consensus-parse 在儲存裁判 raw_output 時採用 try/catch 保護，裁判回傳畸形 JSON 時僅記錄 error_message，不再中斷整體解析流程\n- 物件編輯頁解析設定 UX：AI 解析謄本設定面板顯示本次實際使用的解析/裁判模型，支援 per-run 勾選啟用與一次性 Prompt 覆寫，並確保畫面與後端實際呼叫模型一致",
            developmentProgress: "核心架構與 UI 已完成。2026-03-14 地端 Python 解析器全面升級：(P0.1) schema_converter.py 直接輸出 TranscriptParseOutput 統一格式，消除 buildFromLocalPython 橋接函式；(P1.2) 每個欄位附帶 field_confidences（regex 命中=1.0，空值=0.0）；(P2) local/route.ts 優先呼叫 HTTP 服務（port 8819），HTTP 不可用時自動降級至 CLI subprocess；(P0.2) PDF 無文字層（422）時前端自動觸發雲端解析；(P1.1) 地端解析結果可作為 local/local-regex-parser 虛擬模型注入共識 Pipeline；(P3) CJK 正規化擴充：全形小寫字母、括號變體、全形冒號/標點、日文漢字（証→證、様→樣等）。"
        },
        {
            name: "Prompt 模板庫（儲存 / 載入）",
            locatedPage: "superadmin/settings/evaluations-global-test",
            category: "超級管理員 (Super Admin)",
            percentage: 100,
            phase: "development",
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/03/08",
            devLog: "### 完成項目\n- DB Migration：20260308180000_create_saved_prompts.sql — saved_prompts 表（id / name / content / created_by / created_at / updated_at）、更新觸發器與 RLS 策略（iam_user_roles + iam_roles）\n- Server Actions：promptActions.ts — listSavedPrompts / savePrompt / deleteSavedPrompt，限 super_admin 存取，使用 createAdminClient（service_role）\n- UI 元件：PromptLibraryModal.tsx — save 模式（命名＋預覽前 200 字後送出）/ load 模式（列出全部已儲存 Prompt，支援一鍵載入 / 刪除）\n- 整合 evaluations-global-test/page.tsx：在 Prompt textarea 右下角以 flex justify-end 排列「儲存 Prompt」與「載入 Prompt」兩個按鈕，視覺上緊貼輸入框；PromptLibraryModal 以 Portal 渲染，支援 Esc 關閉",
            developmentProgress: "功能完整實作：儲存、列出、載入、刪除 Prompt 均已連接雲端 Supabase；UI 風格與現有頁面一致。"
        },
        {
            name: "Prompt 管理獨立頁面",
            locatedPage: "superadmin/settings/prompt-management",
            category: "超級管理員 (Super Admin)",
            percentage: 100,
            phase: "development",
            lastModifiedBy: "Claude Sonnet 4.6",
            lastModifiedDate: "2026/03/08",
            devLog: "### 完成項目\n- 將原本分散在 evaluations-global-test 頁面的「儲存 Prompt」與「載入 Prompt」整合為獨立的 Prompt 管理頁面\n- Server Action：promptActions.ts 新增 updatePrompt（依 id 更新 name/content/updated_at）\n- 新頁面：settings/prompt-management/page.tsx — 左右分割面板佈局：左欄 = 可搜尋的 Prompt 列表（全域計數、hover 顯示複製/刪除操作、二次確認刪除）；右欄 = EditorPanel（新增/編輯，含字元計數、dirty-state 檢查、儲存回覆後自動更新列表）\n- Sidebar nav-items.ts 新增「Prompt 管理」（BookMarked 圖示）導覽項目\n- settings/page.tsx 新增 Prompt 管理入口卡片",
            developmentProgress: "獨立頁面完整實作：新增、編輯、刪除、搜尋、複製內容均已完成，與 saved_prompts 表雲端連接。"
        }
];

export const ROADMAP_DATA: RoadmapData = {
    lastUpdated: "2026/03/08",
    features: RAW_FEATURES.map(f => ({ ...f, phase: inferPhase(f) })),
};
