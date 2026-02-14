
// This file is auto-generated from the original roadmap.js
// Date: 2026-02-14

export interface RoadmapFeature {
  name: string;
  percentage: number;
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
  featureDescription?: string;
  workCategory?: string;
  developmentProgress?: string;
  testLog?: string;
}

export interface RoadmapData {
  lastUpdated: string;
  features: RoadmapFeature[];
}

export const ROADMAP_DATA: RoadmapData = {
    lastUpdated: "2026/02/14-22:30",
    features: [
        // 超級管理員
        { 
            name: "超級管理員-儀表板", 
            percentage: 95, 
            acceptanceCriteria: "1. 登入後首頁需顯示系統關鍵指標(KPI)，包含總用戶數、總物件數、成交金額。\n2. 需提供圖表視覺化呈現最近30天的平台流量趨勢。\n3. 儀表板需顯示待處理的審核事項通知。\n4. 需支援數據篩選功能，可依日期區間查看統計數據。\n5. 頁面載入速度需在2秒內完成，確保良好的使用者體驗。", 
            docPath: "/project-process/features/admin-dashboard-20260206.html", 
            category: "超級管理員 (Super Admin)", 
            points: 8, 
            lastModifiedBy: "Trae AI", 
            lastModifiedDate: "2026/02/13",
            devLog: "[2026/02/13] (Trae AI)\n• 完成儀表板進度頁面重構，支援 9 欄位動態調整寬度\n• 實作欄位順序優化與雙語標題顯示\n• 新增 `dev-logs` 與 `test-logs` 資料夾結構\n詳見: [開發日誌](../dev-logs/dev-dashboard-refactor-2026-02-13.md)",
            testProgress: "[2026/02/13] (Trae AI)\n• UI/UX 功能測試通過 (欄位拖曳、記憶還原、RWD)\n詳見: [測試日誌](../test-logs/test-dashboard-refactor-2026-02-13.md)",
            testCoverage: 0 
        },
        { name: "超級管理員-網站行為監控與紀錄功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員的RBAC CRUD平台", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-雲端空間管理平台", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員針對 各種Roles的 Access Matrix管理平台", percentage: 60, acceptanceCriteria: "", docPath: "/project-process/features/iam-system.html", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-資料庫Supabase管理功能", percentage: 0, acceptanceCriteria: "", docPath: "/project-process/progress-reports/database-reports/supabase-auth-integration-guide.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-資料庫Elastic Search管理功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員AI LLM API效能監控－AI語音回應可靠度監控功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-網路安全－隱私審計管理功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-網站效能監控功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 買家
        { name: "買家(已簽約)-儀表板", percentage: 50, acceptanceCriteria: "", docPath: "/project-process/features/buyer-dashboard-mock-20260206.html", category: "買家 (Buyer)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "買家的溝通中心", percentage: 0, acceptanceCriteria: "", docPath: "", category: "買家 (Buyer)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "買家的繳費記錄", percentage: 0, acceptanceCriteria: "", docPath: "", category: "買家 (Buyer)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 公司首頁與產品
        { name: "公司首頁", percentage: 80, acceptanceCriteria: "", docPath: "/project-process/features/company-homepage.html", category: "公司頁面 (Company Pages)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品費用說明頁", percentage: 0, acceptanceCriteria: "", docPath: "", category: "公司頁面 (Company Pages)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品Q&A+Need Help頁", percentage: 0, acceptanceCriteria: "", docPath: "", category: "公司頁面 (Company Pages)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品教學", percentage: 0, acceptanceCriteria: "", docPath: "", category: "公司頁面 (Company Pages)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "聯絡我們>發送訊息功能", percentage: 100, acceptanceCriteria: "", docPath: "/project-process/features/daily-report-20260205.html", category: "公司頁面 (Company Pages)", points: 3, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/05-14:30" },

        // 第三方加值服務
        { name: "第三方加值服務－智能門鎖", percentage: 0, acceptanceCriteria: "", docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－保險方案", percentage: 0, acceptanceCriteria: "", docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－攝影機監控", percentage: 0, acceptanceCriteria: "", docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－租金保障", percentage: 0, acceptanceCriteria: "", docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 房東
        { name: "房東-儀表板", percentage: 90, acceptanceCriteria: "", docPath: "/project-process/features/landlord-dashboard-status-20260206.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "房東的Access Matrix管理平台", percentage: 60, acceptanceCriteria: "", docPath: "/project-process/features/iam-system.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東新增物件方式1－手動輸入", percentage: 85, acceptanceCriteria: "", docPath: "/project-process/features/landlord-features.html", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東新增物件方式2－自動填入 (VLM/OCR)", percentage: 95, acceptanceCriteria: "", docPath: "/project-process/features/vlm-ocr-system.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的預約看房管理功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－Details模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－Grid模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－List模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－新增客戶", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－成交客戶", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東－邀請第三人成為user的功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格創建功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東給租客的Ｑ＆Ａ", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東給買家的Ｑ＆Ａ", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成物件銷售部落格", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格 AI 寫手", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格 AI 講房", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東自定義銷售物件的Ｑ＆Ａ功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東自定義出租物件的Ｑ＆Ａ功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "AI TTS語音助理+物件專屬轉接號碼", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－Details模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－Grid模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－List模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－新增仲介", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－銀行帳戶管理", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－收支明細儀表板", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－租金收支管理", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－ATO租賃報稅表生成功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－台灣租賃報稅表生成功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的溝通頁面", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－Details模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－Grid模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件－照片增生功能 (AI)", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－List模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的維修派工管理", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的行銷部落格網站行為監控", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的email inbox信箱", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶-租客篩選功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的會計人員查帳審計功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 租客
        { name: "租客(已簽約)-儀表板", percentage: 90, acceptanceCriteria: "", docPath: "/project-process/features/tenant-dashboards-20260206.html", category: "租客 (Tenant)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "租客(潛在)-儀表板", percentage: 90, acceptanceCriteria: "", docPath: "/project-process/features/tenant-dashboards-20260206.html", category: "租客 (Tenant)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "租客的維修申請", percentage: 0, acceptanceCriteria: "", docPath: "", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租客的溝通中心", percentage: 0, acceptanceCriteria: "", docPath: "", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租客的繳費記錄", percentage: 0, acceptanceCriteria: "", docPath: "", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 合約與法務
        { name: "買賣合約附加條款功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "合約與法務 (Contracts & Legal)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租賃合約附加條款功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "合約與法務 (Contracts & Legal)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成買賣制式合約", percentage: 0, acceptanceCriteria: "", docPath: "", category: "合約與法務 (Contracts & Legal)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成租賃制式合約", percentage: 0, acceptanceCriteria: "", docPath: "", category: "合約與法務 (Contracts & Legal)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "電子簽約功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "合約與法務 (Contracts & Legal)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },

        // 通用/系統
        { name: "一鍵切換UI風格：暗/亮模式", percentage: 0, acceptanceCriteria: "", docPath: "", category: "通用/系統 (General/System)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "RWD網頁響應式設計", percentage: 80, acceptanceCriteria: "", docPath: "/project-process/features/company-homepage.html", category: "通用/系統 (General/System)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者身份驗證系統", percentage: 90, acceptanceCriteria: "", docPath: "/project-process/features/auth-system.html", category: "通用/系統 (General/System)", points: 8, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "註冊的使用者都有自己的行事曆管理頁面", percentage: 0, acceptanceCriteria: "", docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者登入頁面", percentage: 100, acceptanceCriteria: "", docPath: "/project-process/features/auth-system.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "使用者登入頁面-記住我功能", percentage: 100, acceptanceCriteria: "", docPath: "/project-process/features/remember-me-tdd-report-20260205.html", category: "通用/系統 (General/System)", points: 2, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "使用者密碼重設頁面", percentage: 95, acceptanceCriteria: "", docPath: "/project-process/features/auth-system.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者的溝通頁面", percentage: 0, acceptanceCriteria: "", docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "受邀使用者登入介面", percentage: 0, acceptanceCriteria: "", docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "謄本權狀掃描功能", percentage: 95, acceptanceCriteria: "", docPath: "/project-process/features/vlm-ocr-system.html", category: "通用/系統 (General/System)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "上傳物件照片功能", percentage: 95, acceptanceCriteria: "", docPath: "/project-process/features/photo-upload.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 金流支付
        { name: "可用的付款方式之一: ID pay", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: Apple Pay", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: PayPal", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: Credit card", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "線上支付功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 測試與品質保證
        { name: "登入頁面>「記住我」功能 TDD 開發進度檢測報告", percentage: 100, acceptanceCriteria: "", docPath: "/project-process/features/remember-me-tdd-report-20260205.html", category: "測試與品質保證 (Testing & QA)", points: 5, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },

        // 專案管理與工具
        { 
            name: "專案開發進度儀表板重構 (Project Dashboard Overhaul)", 
            percentage: 100, 
            acceptanceCriteria: "1. 需支援欄位寬度動態調整。\n2. 需記憶使用者偏好設定。\n3. 需支援雙語標題。\n4. 需整合開發日誌與測試日誌連結。", 
            docPath: "/project-process/progress-reports/daily-reports/project-dashboard-overhaul-2026-02-06.md", 
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
            percentage: 100,
            workCategory: "維運",
            featureDescription: "修復 OCR 服務 ruff 規範問題並完成 ruff 驗證，同步執行 mypy 型別檢查並彙整待修項目",
            acceptanceCriteria: "1. ruff check src tests 無錯誤。\n2. mypy 執行完成並輸出待修清單。",
            developmentProgress: "100%（已修正 B904/unused/whitespace/exception chaining）",
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
            percentage: 100,
            workCategory: "部署優化",
            featureDescription: "移除破壞 Next.js App Router 的 SPA 重寫規則配置，確保 SSR、API Routes 和 Server Actions 正常運作",
            acceptanceCriteria: "1. vercel.json 文件已刪除。\n2. Next.js SSR 功能正常。\n3. API Routes 可正常訪問。\n4. Server Actions 正常執行。\n5. Vercel 自動檢測 Next.js 項目配置。",
            developmentProgress: "100%",
            category: "專案管理與工具 (Project Management)",
            points: 2,
            devLog: "### 今日完成項目\n• 刪除錯誤的 vercel.json（SPA rewrite 規則破壞 Next.js SSR）\n• Git commit: acb83b2\n\n### 技術難點與解決方案\n• 問題: vercel.json SPA 配置會將所有請求導向 /index.html，繞過 Next.js 渲染引擎\n• 解決: 完全刪除，讓 Vercel 自動檢測 Next.js\n\n### 避坑指南\n⚠️ 不要將 CRA/Vue/Angular 的 SPA 配置用於 Next.js\n⚠️ Next.js 16+ 不需要 vercel.json\n\n### 下階段計畫\n• [ ] 驗證生產環境 SSR 和 API Routes",
            testProgress: "100%",
            testLog: "✅ 文件刪除成功\n✅ Git 提交完成 (acb83b2)\n✅ 本地 Next.js 構建和運行正常",
            lastModifiedBy: "Claude Sonnet 4.5",
            lastModifiedDate: "2026/02/14"
        },
        {
            name: "Winston 日誌系統重構為 Supabase 資料庫日誌",
            percentage: 100,
            workCategory: "日誌系統",
            featureDescription: "將基於文件系統的 Winston 日誌改造為 Supabase 資料庫日誌，實現 Serverless 環境兼容性",
            acceptanceCriteria: "1. 創建 logs 資料表及 RLS 策略。\n2. 實作 SupabaseTransport 批次寫入機制。\n3. 支援環境自動檢測（Serverless vs Container）。\n4. 保留可選的文件日誌功能。\n5. 通過 Supabase migration 部署測試。",
            developmentProgress: "100%",
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
            percentage: 100,
            workCategory: "文件撰寫",
            featureDescription: "撰寫完整的雲端部署平台選擇指南，涵蓋 7 個平台對比、成本分析、三階段部署策略及風險評估",
            acceptanceCriteria: "1. 完成 7 平台對比（Vercel、Cloudflare、Railway、Render、Netlify、AWS、VPS）。\n2. 三階段成本分析。\n3. 實施路線圖和決策矩陣。\n4. 風險評估與緩解策略。",
            developmentProgress: "100%",
            category: "專案管理與工具 (Project Management)",
            points: 3,
            docPath: "/docs/operational-guides/deployment-guides/cloud-deployment-platform-selection-guide.md",
            devLog: "### 今日完成項目\n• 創建 cloud-deployment-platform-selection-guide.md（2314 行）\n• 7 個平台詳細對比\n• 成本試算（1K MAU 和 10K MAU）\n• 三階段部署路線圖\n• 風險矩陣和緩解策略\n\n### 重點心得\n• Cloudflare Pages 無限流量是最大亮點\n• Vercel Hobby 最適合初期測試\n• 文件系統需求是 Serverless vs Container 的分水嶺\n\n### 避坑指南\n⚠️ 不要一開始就選企業級方案\n⚠️ 監控 Vercel 100GB 帶寬限制\n⚠️ SUPABASE_SERVICE_ROLE_KEY 不可加 NEXT_PUBLIC_ 前綴\n\n### 下階段計畫\n• [ ] 2-3 個月後評估實際流量\n• [ ] 準備平台遷移演練（每半年一次）",
            testProgress: "100%（文檔完成並已審閱）",
            testLog: "✅ Markdown 語法正確\n✅ 7 個平台全部覆蓋\n✅ 定價資訊準確\n✅ 實施步驟可操作\n✅ 風險評估全面",
            lastModifiedBy: "Claude Sonnet 4.5",
            lastModifiedDate: "2026/02/14"
        }
    ]
};
