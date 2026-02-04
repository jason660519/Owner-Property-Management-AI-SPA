
window.ROADMAP_DATA = {
    lastUpdated: "2026-02-05",
    features: [
        // 超級管理員
        { name: "超級管理員-儀表板", percentage: 20, docPath: "", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-網站行為監控與紀錄功能", percentage: 0, docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員的RBAC CRUD平台", percentage: 0, docPath: "", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-雲端空間管理功能", percentage: 0, docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員針對 各種Roles的 Access Matrix管理平台", percentage: 60, docPath: "features/iam-system.html", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-資料庫Supabase管理功能", percentage: 0, docPath: "docs/progress-reports/database-reports/supabase-auth-integration-guide.md", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-資料庫Elastic Search管理功能", percentage: 0, docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員AI LLM API效能監控－AI語音回應可靠度監控功能", percentage: 0, docPath: "", category: "超級管理員 (Super Admin)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-網路安全－隱私審計管理功能", percentage: 0, docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "超級管理員-網站效能監控功能", percentage: 0, docPath: "", category: "超級管理員 (Super Admin)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 買家
        { name: "買家的儀表板", percentage: 0, docPath: "", category: "買家 (Buyer)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "買家的溝通中心", percentage: 0, docPath: "", category: "買家 (Buyer)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "買家的繳費記錄", percentage: 0, docPath: "", category: "買家 (Buyer)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 公司首頁與產品
        { name: "公司首頁", percentage: 80, docPath: "features/company-homepage.html", category: "公司 (Company)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品費用說明頁", percentage: 0, docPath: "", category: "公司 (Company)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品Q&A+Need Help頁", percentage: 0, docPath: "", category: "公司 (Company)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "公司產品教學", percentage: 0, docPath: "", category: "公司 (Company)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 第三方加值服務
        { name: "第三方加值服務－智能門鎖", percentage: 0, docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－保險方案", percentage: 0, docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－攝影機監控", percentage: 0, docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "第三方加值服務－租金保障", percentage: 0, docPath: "", category: "第三方加值服務 (Third Party)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 房東
        { name: "房東-儀表板", percentage: 70, docPath: "features/landlord-features.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的Access Matrix管理平台", percentage: 60, docPath: "features/iam-system.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東新增物件方式1－手動輸入", percentage: 85, docPath: "features/landlord-features.html", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東新增物件方式2－自動填入 (VLM/OCR)", percentage: 95, docPath: "features/vlm-ocr-system.html", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的預約看房管理功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－Details模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－Grid模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－List模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－新增客戶", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶－成交客戶", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東－邀請第三人成為user的功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格創建功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東給租客的Ｑ＆Ａ", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東給買家的Ｑ＆Ａ", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成物件銷售部落格", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格 AI 寫手", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的部落格 AI 講房", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東自定義銷售物件的Ｑ＆Ａ功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東自定義出租物件的Ｑ＆Ａ功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "AI TTS語音助理+物件專屬轉接號碼", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－Details模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－Grid模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－List模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的仲介－新增仲介", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－銀行帳戶管理", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－收支明細儀表板", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－租金收支管理", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－ATO租賃報稅表生成功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東財務－台灣租賃報稅表生成功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的溝通頁面", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－Details模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－Grid模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件－照片增生功能 (AI)", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的物件展示功能－List模式", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的維修派工管理", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的行銷部落格網站行為監控", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的email inbox信箱", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的客戶-租客篩選功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "房東的會計人員查帳審計功能", percentage: 0, docPath: "", category: "房東 (Landlord)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },

        // 租客
        { name: "租客的儀表板", percentage: 0, docPath: "", category: "租客 (Tenant)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租客的維修申請", percentage: 0, docPath: "", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租客的溝通中心", percentage: 0, docPath: "", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租客的繳費記錄", percentage: 0, docPath: "", category: "租客 (Tenant)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 合約與法務
        { name: "買賣合約附加條款功能", percentage: 0, docPath: "", category: "合約與法務 (Contracts & Legal)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "租賃合約附加條款功能", percentage: 0, docPath: "", category: "合約與法務 (Contracts & Legal)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成買賣制式合約", percentage: 0, docPath: "", category: "合約與法務 (Contracts & Legal)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "一鍵生成租賃制式合約", percentage: 0, docPath: "", category: "合約與法務 (Contracts & Legal)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "電子簽約功能", percentage: 0, docPath: "", category: "合約與法務 (Contracts & Legal)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },

        // 通用/系統
        { name: "一鍵切換UI風格：暗/亮模式", percentage: 0, docPath: "", category: "通用/系統 (General/System)", points: 2, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "RWD網頁響應式設計", percentage: 80, docPath: "features/company-homepage.html", category: "通用/系統 (General/System)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者身份驗證系統", percentage: 85, docPath: "features/auth-system.html", category: "通用/系統 (General/System)", points: 8, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "註冊的使用者都有自己的行事曆管理頁面", percentage: 0, docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者登入頁面", percentage: 100, docPath: "features/auth-system.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者密碼重設頁面", percentage: 95, docPath: "features/auth-system.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "使用者的溝通頁面", percentage: 0, docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "受邀使用者登入介面", percentage: 0, docPath: "", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "謄本權狀掃描功能", percentage: 95, docPath: "features/vlm-ocr-system.html", category: "通用/系統 (General/System)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "上傳物件照片功能", percentage: 95, docPath: "features/photo-upload.html", category: "通用/系統 (General/System)", points: 3, lastModifiedBy: "", lastModifiedDate: "" },

        // 金流支付
        { name: "可用的付款方式之一: ID pay", percentage: 0, docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: Apple Pay", percentage: 0, docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: PayPal", percentage: 0, docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "可用的付款方式之一: Credit card", percentage: 0, docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" },
        { name: "線上支付功能", percentage: 0, docPath: "", category: "金流支付 (Payments)", points: 5, lastModifiedBy: "", lastModifiedDate: "" }
    ]
};
