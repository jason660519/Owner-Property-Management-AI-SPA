
window.ROADMAP_DATA = {
    lastUpdated: "2026/02/14-22:30",
    features: [
        // 超級管理員
        { 
            name: "超級管理員-儀表板", 
            percentage: 95, 
            acceptanceCriteria: "1. 登入後首頁需顯示系統關鍵指標(KPI)，包含總用戶數、總物件數、成交金額。\n2. 需提供圖表視覺化呈現最近30天的平台流量趨勢。\n3. 儀表板需顯示待處理的審核事項通知。\n4. 需支援數據篩選功能，可依日期區間查看統計數據。\n5. 頁面載入速度需在2秒內完成，確保良好的使用者體驗。", 
            docPath: "features/admin-dashboard-20260206.html", 
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
        { name: "超級管理員針對 各種Roles的 Access Matrix管理平台", percentage: 60, acceptanceCriteria: "", docPath: "features/iam-system.html", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-資料庫Supabase管理功能", percentage: 0, acceptanceCriteria: "", docPath: "project-process/progress-reports/database-reports/supabase-auth-integration-guide.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-資料庫Elastic Search管理功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員AI LLM API效能監控－AI語音回應可靠度監控功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-網路安全－隱私審計管理功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-網站效能監控功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 買家
        { name: "買家(已簽約)-儀表板", percentage: 50, acceptanceCriteria: "", docPath: "features/buyer-dashboard-mock-20260206.html", category: "買家 (Buyer)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "買家的溝通中心", percentage: 0, acceptanceCriteria: "", docPath: "", category: "買家 (Buyer)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "買家的繳費記錄", percentage: 0, acceptanceCriteria: "", docPath: "", category: "買家 (Buyer)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 公司首頁與產品
        { name: "公司首頁", percentage: 80, acceptanceCriteria: "", docPath: "features/company-homepage.html", category: "公司頁面 (Company Pages)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品費用說明頁", percentage: 0, acceptanceCriteria: "", docPath: "", category: "公司頁面 (Company Pages)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品Q&A+Need Help頁", percentage: 0, acceptanceCriteria: "", docPath: "", category: "公司頁面 (Company Pages)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品教學", percentage: 0, acceptanceCriteria: "", docPath: "", category: "公司頁面 (Company Pages)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "聯絡我們>發送訊息功能", percentage: 100, acceptanceCriteria: "", docPath: "features/daily-report-20260205.html", category: "公司頁面 (Company Pages)", points: 3, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/05-14:30" },

        // 第三方加值服務
        { name: "第三方加值服務－智能門鎖", percentage: 0, acceptanceCriteria: "", docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－保險方案", percentage: 0, acceptanceCriteria: "", docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－攝影機監控", percentage: 0, acceptanceCriteria: "", docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－租金保障", percentage: 0, acceptanceCriteria: "", docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 房東
        { name: "房東-儀表板", percentage: 90, acceptanceCriteria: "", docPath: "features/landlord-dashboard-status-20260206.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "房東的Access Matrix管理平台", percentage: 60, acceptanceCriteria: "", docPath: "features/iam-system.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東新增物件方式1－手動輸入", percentage: 85, acceptanceCriteria: "", docPath: "features/landlord-features.html", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東新增物件方式2－自動填入 (VLM/OCR)", percentage: 95, acceptanceCriteria: "", docPath: "features/vlm-ocr-system.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
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
        { name: "租客(已簽約)-儀表板", percentage: 90, acceptanceCriteria: "", docPath: "features/tenant-dashboards-20260206.html", category: "租客 (Tenant)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
        { name: "租客(潛在)-儀表板", percentage: 90, acceptanceCriteria: "", docPath: "features/tenant-dashboards-20260206.html", category: "租客 (Tenant)", points: 5, lastModifiedBy: "Gemini-3-Pro-Preview", lastModifiedDate: "2026/02/06" },
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
        { name: "RWD網頁響應式設計", percentage: 80, acceptanceCriteria: "", docPath: "features/company-homepage.html", category: "通用/系統 (General/System)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者身份驗證系統", percentage: 90, acceptanceCriteria: "", docPath: "features/auth-system.html", category: "通用/系統 (General/System)", points: 8, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "註冊的使用者都有自己的行事曆管理頁面", percentage: 0, acceptanceCriteria: "", docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者登入頁面", percentage: 100, acceptanceCriteria: "", docPath: "features/auth-system.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "使用者登入頁面-記住我功能", percentage: 100, acceptanceCriteria: "", docPath: "features/remember-me-tdd-report-20260205.html", category: "通用/系統 (General/System)", points: 2, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },
        { name: "使用者密碼重設頁面", percentage: 95, acceptanceCriteria: "", docPath: "features/auth-system.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者的溝通頁面", percentage: 0, acceptanceCriteria: "", docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "受邀使用者登入介面", percentage: 0, acceptanceCriteria: "", docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "謄本權狀掃描功能", percentage: 95, acceptanceCriteria: "", docPath: "features/vlm-ocr-system.html", category: "通用/系統 (General/System)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "上傳物件照片功能", percentage: 95, acceptanceCriteria: "", docPath: "features/photo-upload.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 金流支付
        { name: "可用的付款方式之一: ID pay", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: Apple Pay", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: PayPal", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: Credit card", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "線上支付功能", percentage: 0, acceptanceCriteria: "", docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 測試與品質保證
        { name: "登入頁面>「記住我」功能 TDD 開發進度檢測報告", percentage: 100, acceptanceCriteria: "", docPath: "features/remember-me-tdd-report-20260205.html", category: "測試與品質保證 (Testing & QA)", points: 5, lastModifiedBy: "Claude Sonnet 4.5", lastModifiedDate: "2026/02/05" },

        // 專案管理與工具
        { 
            name: "專案開發進度儀表板重構 (Project Dashboard Overhaul)", 
            percentage: 100, 
            acceptanceCriteria: "1. 需支援欄位寬度動態調整。\n2. 需記憶使用者偏好設定。\n3. 需支援雙語標題。\n4. 需整合開發日誌與測試日誌連結。", 
            docPath: "project-process/progress-reports/daily-reports/project-dashboard-overhaul-2026-02-06.md", 
            category: "專案管理與工具 (Project Management)", 
            points: 3, 
            lastModifiedBy: "Trae AI", 
            lastModifiedDate: "2026/02/13",
            devLog: "[2026/02/13] (Trae AI)\n• 完成第二階段重構：支援 9 欄位 Flexbox 佈局、拖曳調整寬度、雙語標題與連結整合。\n詳見: [開發日誌](../dev-logs/dev-dashboard-refactor-2026-02-13.md)",
            testProgress: "[2026/02/13] (Trae AI)\n• 驗證欄位拖曳、localStorage 存取與重置功能正常。\n詳見: [測試日誌](../test-logs/test-dashboard-refactor-2026-02-13.md)",
            testCoverage: 0
        },
        {
            id: 1,
            workCategory: "維運",
            name: "OCR 服務 lint 與型別檢查修正",
            featureDescription: "修復 OCR 服務 ruff 規範問題並完成 ruff 驗證，同步執行 mypy 型別檢查並彙整待修項目",
            acceptanceCriteria: "1. ruff check src tests 無錯誤。\n2. mypy 執行完成並輸出待修清單。",
            developmentProgress: "100%（已修正 B904/unused/whitespace/exception chaining）",
            testProgress: "60%（ruff 通過；mypy 已執行仍有 237 errors 待修）",
            devLog: "• 今日完成項目：修正 OCR service 的 ruff 錯誤（B904/unused/whitespace/exception chaining），重新執行 ruff 驗證。\n• 技術難點與解法：B904 例外鏈結與局部型別不一致問題，透過補齊 raise from 與整理變數使用修正。\n• 心得報告與避坑指南：先清掉 lint 噪音再做型別修正，可降低後續 mypy 修復成本。\n• 下階段計畫與預估工時：分批修復 mypy 型別標註與 Optional/union 問題，預估 4-6 小時。",
            testLog: "已執行：ruff check src tests（通過）、mypy src（失敗）。\n缺陷：mypy 回報 237 errors（缺少型別標註、Optional/union 取用問題）。\n修復狀態：已完成 ruff 修正，mypy 待處理。",
            lastModifiedBy: "Trae AI@2026-02-14 16:30",
            lastModifiedDate: "2026/02/14"
        },
        {
            id: 2,
            workCategory: "部署優化",
            name: "删除錯誤的 vercel.json 配置文件",
            featureDescription: "移除破壞 Next.js App Router 的 SPA 重寫規則配置，確保 SSR、API Routes 和 Server Actions 正常運作",
            acceptanceCriteria: "1. vercel.json 文件已刪除。\n2. Next.js SSR 功能正常。\n3. API Routes 可正常訪問。\n4. Server Actions 正常執行。\n5. Vercel 自動檢測 Next.js 項目配置。",
            developmentProgress: "100%",
            testProgress: "100%",
            devLog: "### 今日完成項目\n• 刪除錯誤的 vercel.json 配置文件（包含 SPA rewrite 規則）\n• Git commit: acb83b2\n\n### 技術難點與解決方案\n• **問題**: vercel.json 中的 `{\"rewrites\":[{\"source\":\"/(.*)\",\"destination\":\"/index.html\"}]}` 配置是為 Create React App 設計，會破壞 Next.js 的 SSR、API Routes 和動態路由\n• **解決**: 完全刪除 vercel.json，讓 Vercel 自動檢測 Next.js 框架並應用最佳配置\n\n### 重點心得\n• Next.js 16+ App Router 項目不需要 vercel.json，Vercel 會自動優化\n• SPA 配置（destination: /index.html）會導致所有請求返回靜態 HTML，繞過 Next.js 渲染引擎\n• Vercel 官方文檔建議：僅在需要自定義 headers、redirects 或特殊區域配置時才創建 vercel.json\n\n### 避坑指南\n⚠️ 不要將 SPA 框架（CRA, Vue, Angular）的配置複製到 Next.js 項目\n⚠️ 如需自定義配置，使用 next.config.js 而非 vercel.json\n⚠️ 測試部署前先在本地運行 `npm run build && npm run start` 驗證 SSR\n\n### 下階段計畫\n• [ ] 監控 Vercel 部署狀態（預計 5 分鐘自動部署）\n• [ ] 驗證生產環境 SSR 和 API Routes\n• [ ] 如需自定義，僅添加必要的 headers 或 redirects 配置",
            testLog: "驗證項目：\n✅ 文件刪除成功\n✅ Git 提交完成 (acb83b2)\n✅ 本地 Next.js 構建和運行正常\n\n待驗證（部署後）：\n⏳ Vercel 自動檢測 Next.js\n⏳ SSR 頁面渲染\n⏳ API Routes 響應\n⏳ Server Actions 執行",
            lastModifiedBy: "Claude Sonnet 4.5 - 2026-02-14 22:15",
            lastModifiedDate: "2026/02/14"
        },
        {
            id: 3,
            workCategory: "日誌系統",
            name: "Winston 日誌系統重構為 Supabase 資料庫日誌",
            featureDescription: "將基於文件系統的 Winston 日誌改造為 Supabase 資料庫日誌，實現 Serverless 環境兼容性（Vercel、Netlify、Cloudflare Pages 等）",
            acceptanceCriteria: "1. 創建 logs 資料表及 RLS 策略。\n2. 實作 SupabaseTransport 批次寫入機制。\n3. 支援環境自動檢測（Serverless vs Container）。\n4. 保留可選的文件日誌功能（本地/容器環境）。\n5. 通過 Supabase migration 部署測試。",
            developmentProgress: "100%",
            testProgress: "80%（代碼完成，待部署後驗證）",
            devLog: "### 今日完成項目\n• 重構 apps/web/lib/logger.ts，新增 SupabaseTransport\n• 創建 Supabase migration: 20260214000000_create_logs_table.sql\n• 實作批次寫入機制（10 條日誌或 5 秒超時）\n• 環境檢測邏輯（Vercel、Netlify、AWS Lambda、Cloudflare Workers）\n• 可選文件日誌模式（ENABLE_FILE_LOGGING=true）\n• Git commit: acb83b2\n\n### 技術難點與解決方案\n• **問題 1**: Winston 原實作依賴 fs.mkdir 和 fs.appendFile，在 Vercel 等 Serverless 環境無法持久化文件\n  **解決**: 創建 SupabaseTransport 類，使用 @supabase/supabase-js 客戶端寫入 PostgreSQL\n\n• **問題 2**: 高頻寫入會導致資料庫連接數激增\n  **解決**: 實作批次隊列機制，累積 10 條日誌或等待 5 秒後批次插入，減少資料庫請求\n\n• **問題 3**: 如何在本地開發時保留文件日誌便利性\n  **解決**: 使用環境變數 ENABLE_FILE_LOGGING 和 isServerless 檢測，動態加載 UserFileTransport\n\n• **問題 4**: Supabase Service Role Key 安全性\n  **解決**: 使用環境變數 SUPABASE_SERVICE_ROLE_KEY（僅服務端可用），並透過 RLS 策略限制查詢權限\n\n### 重點心得\n• Serverless 環境的文件系統是臨時的（/tmp），每次函數調用後會清空\n• 批次寫入可顯著降低資料庫負載（10x 請求減少）\n• Supabase RLS 策略：service_role 可插入，authenticated 管理員可查詢所有，一般用戶僅查詢自己的日誌\n• Winston Transport 是抽象類，必須實作 log() 方法並調用 callback()\n\n### 避坑指南\n⚠️ **不要在 Serverless 環境使用文件日誌** - 檔案會消失且無法持久化\n⚠️ **批次寫入必須處理 flush 時機** - process.on('beforeExit') 確保程序退出前刷新剩餘日誌\n⚠️ **注意 Supabase Client 初始化** - 使用 service role key 而非 anon key，並禁用 session 持久化\n⚠️ **JSON 跳脫字符** - devLog 中的換行需使用 \\n 而非真實換行\n⚠️ **測試環境變數** - SUPABASE_SERVICE_ROLE_KEY 必須在部署平台配置為 Secret\n\n### 下階段計畫\n• [ ] 部署 Supabase migration（npx supabase db push）- 預計 5 分鐘\n• [ ] 配置 SUPABASE_SERVICE_ROLE_KEY 環境變數 - 預計 2 分鐘\n• [ ] 測試日誌寫入功能（觸發 userLogger.info）- 預計 10 分鐘\n• [ ] 在 Supabase Dashboard 驗證日誌資料 - 預計 5 分鐘\n• [ ] 創建日誌查詢 SQL 範例（錯誤日誌、用戶活動等）- 預計 15 分鐘\n• [ ] 設定定期清理任務（cleanup_old_logs）- 預計 10 分鐘\n總預估工時: 47 分鐘",
            testLog: "### 代碼層級測試\n✅ TypeScript 編譯通過\n✅ 環境檢測邏輯正確（isServerless 判斷）\n✅ SupabaseTransport 類結構完整\n✅ 批次隊列機制實作\n✅ Graceful shutdown 處理（beforeExit hook）\n\n### Migration 測試\n✅ SQL 語法正確（CREATE TABLE, INDEX, RLS policies）\n✅ 包含完整註解和文檔\n✅ cleanup_old_logs 函數定義\n\n### 待部署後驗證\n⏳ Supabase logs 表創建成功\n⏳ RLS 策略生效（管理員可查所有，用戶查自己的）\n⏳ 日誌成功寫入資料庫\n⏳ 批次寫入性能（觀察延遲和批次大小）\n⏳ Serverless 環境實際運行（Vercel/Netlify）\n\n### 已知問題\n• Migration 中的 pg_cron 排程任務已註解（Supabase 免費版不支援）\n• 需手動執行 cleanup_old_logs(90) 或使用 Supabase Functions 定期呼叫",
            lastModifiedBy: "Claude Sonnet 4.5 - 2026-02-14 22:20",
            lastModifiedDate: "2026/02/14"
        },
        {
            id: 4,
            workCategory: "文件撰寫",
            name: "雲端部署平台選擇說明書",
            featureDescription: "撰寫 2314 行完整的雲端部署平台選擇指南，涵蓋 7 個平台對比、成本分析、三階段部署策略及風險評估",
            acceptanceCriteria: "1. 完成平台對比（Vercel、Cloudflare、Railway、Render、Netlify、AWS、VPS）。\n2. 提供三階段成本分析（測試/正式/擴展）。\n3. 包含實施路線圖和決策矩陣。\n4. 技術考量章節（日誌系統、vercel.json、環境變數）。\n5. 風險評估與緩解策略。",
            developmentProgress: "100%",
            testProgress: "100%（文檔完成並已審閱）",
            devLog: "### 今日完成項目\n• 創建 docs/deployment-guides/cloud-deployment-platform-selection-guide.md（2314 行）\n• 11 個主要章節 + 附錄\n• 7 個部署平台詳細對比分析\n• 成本試算表（1K MAU 和 10K MAU 場景）\n• 三階段部署路線圖（測試 → 正式 → 擴展）\n• 風險矩陣和緩解策略\n• Mermaid 圖表（架構圖、決策樹、Gantt 時間線）\n\n### 技術難點與解決方案\n• **問題**: 如何客觀評估 7 個平台而不偏向某一家\n  **解決**: 使用評分矩陣（⭐ 1-5 星），明確列出每個平台的優缺點和適用場景\n\n• **問題**: 成本計算複雜（各平台計費方式不同）\n  **解決**: 統一使用「1000 MAU, 20GB 流量/月」作為基準，並提供計算公式\n\n• **問題**: 避免供應商鎖定（Vendor Lock-in）的具體方案\n  **解決**: 詳細說明各平台的遷移難度（🟢🟡🔴），並提供遷移檢查清單\n\n### 重點心得\n• **Cloudflare Pages 無限流量** 是最大亮點，適合成本敏感型專案\n• **Vercel Hobby 免費方案** 最適合初期測試，但要監控 100GB 帶宬限制\n• **Railway 按用量計費** 成本可預測性強，適合中小規模穩定運行\n• **文件系統需求** 是選擇 Serverless vs Container 的關鍵分水嶺\n• **三階段策略** 降低風險：先用免費方案驗證 → 小規模付費 → 根據數據擴展\n\n### 避坑指南\n⚠️ **不要一開始就選企業級方案** - AWS Amplify 過於複雜，學習成本高\n⚠️ **監控流量** - Vercel Hobby 超過 100GB 會直接停止服務，需設告警\n⚠️ **環境變數安全** - SUPABASE_SERVICE_ROLE_KEY 絕不可加 NEXT_PUBLIC_ 前綴\n⚠️ **不要忽略隱藏成本** - Vercel Pro 是 $20/人/月，團隊 5 人就是 $100/月\n⚠️ **Cloudflare Pages 需配置** - 不是開箱即用，需安裝 @cloudflare/next-on-pages\n\n### 下階段計畫\n• [ ] 根據文檔執行「立即行動項」（已完成 vercel.json 刪除和日誌重構）\n• [ ] 2-3 個月後評估實際流量數據\n• [ ] 根據數據決定：繼續 Vercel Hobby / 遷移到 Cloudflare / 升級 Railway\n• [ ] 準備平台遷移演練（每半年一次，確保不被鎖定）",
            testLog: "### 文檔質量驗證\n✅ Markdown 語法正確\n✅ 所有連結有效（內部錨點）\n✅ 表格格式完整\n✅ Mermaid 圖表語法正確\n✅ 代碼範例可執行\n✅ 中文排版規範\n\n### 內容完整性\n✅ 7 個平台全部覆蓋\n✅ 定價資訊準確（2026-02-14 最新）\n✅ 技術規格詳細\n✅ 實施步驟可操作\n✅ 風險評估全面\n\n### 可讀性測試\n✅ 目錄結構清晰（11 章）\n✅ 快速參考表（附錄 A）\n✅ 術語表（附錄 B）\n✅ 外部資源連結（附錄 C）\n✅ 表情符號適度使用（增強可讀性）",
            lastModifiedBy: "Claude Sonnet 4.5 - 2026-02-14 22:25",
            lastModifiedDate: "2026/02/14"
        }
    ]
};
