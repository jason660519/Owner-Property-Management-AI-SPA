
window.ROADMAP_DATA = {
    lastUpdated: "2026/02/06-16:30",
    features: [
        // 超級管理員
        { 
            name: "超級管理員-儀表板", 
            percentage: 90, 
            docPath: "../features/admin-dashboard-20260206.html", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-02-10", endDate: "2026-02-18", owner: "Dev Team", points: 8, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 登入後首頁需顯示系統關鍵指標(KPI)，包含總用戶數、總物件數、成交金額。\n2. 需提供圖表視覺化呈現最近30天的平台流量趨勢。\n3. 儀表板需顯示待處理的審核事項通知。\n4. 需支援數據篩選功能，可依日期區間查看統計數據。\n5. 頁面載入速度需在2秒內完成，確保良好的使用者體驗。"
        },
        { 
            name: "超級管理員-網站行為監控與紀錄功能", 
            percentage: 0, 
            docPath: "", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-02-19", endDate: "2026-02-24", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需自動記錄所有使用者的API請求日誌(Access Logs)。\n2. 需提供即時儀表板監控線上使用者人數與分佈。\n3. 針對異常流量(如DDoS攻擊特徵)需有自動偵測與告警機制。\n4. 管理員可透過User ID查詢特定使用者的操作軌跡。\n5. 行為紀錄資料需保留至少90天以供稽核。"
        },
        { 
            name: "超級管理員的RBAC CRUD平台", 
            percentage: 0, 
            docPath: "", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-02-25", endDate: "2026-03-05", owner: "Dev Team", points: 8, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需提供介面新增、修改、刪除系統角色(Role)。\n2. 需提供介面定義權限(Permission)顆粒度至API層級。\n3. 需支援將多個權限批量指派給特定角色。\n4. 角色刪除時需檢查相依性，避免孤兒帳號產生。\n5. 所有權限變更需記錄操作人員與時間(Audit Log)。"
        },
        { 
            name: "超級管理員-雲端空間管理功能", 
            percentage: 0, 
            docPath: "", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-03-06", endDate: "2026-03-11", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需顯示目前雲端儲存空間(如S3/Supabase Storage)的總使用量。\n2. 需提供檔案類型分佈統計(圖片、文件、影片)。\n3. 需具備清理過期或未參照檔案(Orphaned Files)的工具。\n4. 管理員可設定單一使用者的上傳配額限制。\n5. 需支援 CDN 流量使用狀況的監控報表。"
        },
        { 
            name: "超級管理員針對 各種Roles的 Access Matrix管理平台", 
            percentage: 60, 
            docPath: "../features/iam-system.html", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-03-12", endDate: "2026-03-20", owner: "Dev Team", points: 8, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需以矩陣形式顯示 角色(Row) vs 資源(Column) 的權限關係。\n2. 點擊矩陣格子可直接切換 允許/拒絕/唯讀 狀態。\n3. 需支援權限設定的匯入與匯出(JSON/CSV)。\n4. 介面需具備搜尋與篩選功能，以便快速找到特定資源權限。\n5. 修改權限後需有確認對話框，防止誤觸。"
        },
        { 
            name: "超級管理員-資料庫Supabase管理功能", 
            percentage: 100, 
            docPath: "../progress-reports/database-reports/supabase-auth-integration-guide.md", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-02-06", endDate: "2026-02-06", owner: "Trae AI", points: 5, 
            lastModifiedBy: "Trae AI", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 需整合 Supabase 管理介面或提供連結至 Supabase Dashboard。\n2. 需監控資料庫連線數(Connection Pooling)與健康狀態。\n3. 需提供資料庫備份與還原的操作指引或自動化設定介面。\n4. 需能查看慢查詢(Slow Queries)日誌以進行效能優化。\n5. 需設定資料庫層級的 Row Level Security (RLS) 政策檢視。"
        },
        { 
            name: "超級管理員-資料庫Elastic Search管理功能", 
            percentage: 0, 
            docPath: "", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-03-27", endDate: "2026-04-01", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需顯示 Elastic Search 叢集的健康狀態(Green/Yellow/Red)。\n2. 需提供索引(Index)管理功能，包含重建索引(Reindex)。\n3. 需監控搜尋請求的平均回應時間。\n4. 需提供搜尋關鍵字分析，了解熱門搜尋詞彙。\n5. 需具備同義詞庫(Synonyms)的管理介面。"
        },
        { 
            name: "超級管理員AI LLM API效能監控－AI語音回應可靠度監控功能", 
            percentage: 0, 
            docPath: "", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-04-02", endDate: "2026-04-10", owner: "Dev Team", points: 8, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需監控 LLM API 的呼叫次數、費用與回應時間。\n2. 針對 AI 語音回應，需有自動化測試機制檢測回應準確度。\n3. 需記錄 AI 發生的錯誤或幻覺(Hallucination)案例。\n4. 需設定預算警示，當 API 費用超過門檻時發送通知。\n5. 需提供模型版本切換或 A/B Testing 的設定功能。"
        },
        { 
            name: "超級管理員-網路安全－隱私審計管理功能", 
            percentage: 0, 
            docPath: "", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-04-11", endDate: "2026-04-16", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需定期掃描系統是否含有未加密的敏感個資(PII)。\n2. 需記錄所有存取敏感資料的操作人員與時間。\n3. 需提供 GDPR/CCPA 等隱私法規遵循的查核報表。\n4. 需具備使用者「被遺忘權」(資料刪除)的自動化處理流程。\n5. 需偵測並阻擋常見的資安攻擊(如 SQL Injection, XSS)。"
        },
        { 
            name: "超級管理員-網站效能監控功能", 
            percentage: 0, 
            docPath: "", 
            category: "超級管理員 (Super Admin)", 
            startDate: "2026-04-17", endDate: "2026-04-22", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需整合 Google Core Web Vitals 指標(LCP, FID, CLS)。\n2. 需監控各主要頁面的平均載入時間。\n3. 需提供前端錯誤監控(JavaScript Errors)與回報機制。\n4. 需分析不同裝置(Mobile/Desktop)與瀏覽器的效能差異。\n5. 需設定效能低落時的自動告警通知。"
        },

        // 買家
        { 
            name: "買家(已簽約)-儀表板", 
            percentage: 50, 
            docPath: "../features/buyer-dashboard-mock-20260206.html", 
            category: "買家 (Buyer)", 
            startDate: "2026-03-10", endDate: "2026-03-15", owner: "Dev Team", points: 5, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 登入後首頁需顯示目前已簽約物件的最新狀態與進度。\n2. 需顯示即將到期的待辦事項（如付款截止日、交屋日）。\n3. 需提供快速聯絡負責房仲或房東的按鈕。\n4. 儀表板需整合行事曆，顯示看房、簽約等重要日程。\n5. 介面需清晰易懂，重要資訊需在三秒內可被讀取。"
        },
        { 
            name: "買家的溝通中心", 
            percentage: 0, 
            docPath: "", 
            category: "買家 (Buyer)", 
            startDate: "2026-03-16", endDate: "2026-03-19", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需提供即時聊天室功能，支援文字、圖片與文件傳送。\n2. 對話紀錄需依物件或專案分類，方便檢索。\n3. 收到新訊息時需有即時通知(App推播或Email)。\n4. 需支援訊息已讀/未讀狀態顯示。\n5. 敏感資訊(如匯款帳號)傳送時需有安全提示。"
        },
        { 
            name: "買家的繳費記錄", 
            percentage: 0, 
            docPath: "", 
            category: "買家 (Buyer)", 
            startDate: "2026-03-20", endDate: "2026-03-23", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需列出所有已繳與未繳的款項明細(訂金、簽約金、尾款)。\n2. 每一筆交易需提供電子收據下載功能。\n3. 需顯示付款狀態(待付款、處理中、已入帳)。\n4. 需支援歷史繳費紀錄的查詢與篩選。\n5. 接近繳費期限時需在頁面顯著位置提示。"
        },

        // 公司首頁與產品
        { 
            name: "公司首頁", 
            percentage: 80, 
            docPath: "../features/company-homepage.html", 
            category: "公司頁面 (Company Pages)", 
            startDate: "2026-02-05", endDate: "2026-02-10", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 首頁需清楚傳達品牌價值主張(Value Proposition)。\n2. 需有顯著的行動呼籲按鈕(CTA)，引導使用者註冊或搜尋物件。\n3. 需展示精選物件輪播圖，並確保圖片載入優化。\n4. 頁面需符合 SEO 規範，包含正確的 Meta Tags 與結構化資料。\n5. 需包含客戶見證或成功案例區塊以增加信任感。"
        },
        { 
            name: "公司產品費用說明頁", 
            percentage: 0, 
            docPath: "", 
            category: "公司頁面 (Company Pages)", 
            startDate: "2026-02-11", endDate: "2026-02-13", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需以表格清晰列出各項服務的收費標準與方案比較。\n2. 需說明是否有隱藏費用或額外加購項目。\n3. 需提供試算工具，讓使用者預估可能產生的費用。\n4. 內容需包含常見付費問題的解答(FAQ)。\n5. 價格資訊需保持最新，並標註生效日期。"
        },
        { 
            name: "公司產品Q&A+Need Help頁", 
            percentage: 0, 
            docPath: "", 
            category: "公司頁面 (Company Pages)", 
            startDate: "2026-02-14", endDate: "2026-02-16", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需提供分類清楚的常見問題集(FAQ)。\n2. 需具備關鍵字搜尋功能，協助使用者快速找到解答。\n3. 若找不到答案，需提供聯絡客服的表單或入口。\n4. 需提供使用者對問答有用性的回饋機制(Like/Dislike)。\n5. 頁面需包含新手入門指引或教學影片連結。"
        },
        { 
            name: "公司產品教學", 
            percentage: 0, 
            docPath: "", 
            category: "公司頁面 (Company Pages)", 
            startDate: "2026-02-17", endDate: "2026-02-20", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需提供分角色的操作手冊(房東/租客/買家)。\n2. 教學內容需包含圖文步驟說明或短影片示範。\n3. 需提供互動式導覽(Tooltip Tour)引導新使用者上手。\n4. 教學文件需支援關鍵字搜尋。\n5. 需定期更新教學內容以配合系統功能改版。"
        },
        { 
            name: "聯絡我們>發送訊息功能", 
            percentage: 100, 
            docPath: "../features/daily-report-20260205.html", 
            category: "公司頁面 (Company Pages)", 
            startDate: "2026-02-21", endDate: "2026-02-24", owner: "Dev Team", points: 3, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/05-14:30",
            acceptanceCriteria: "1. 聯絡表單需包含姓名、Email、主旨與訊息內容欄位。\n2. 送出前需進行欄位驗證與 CAPTCHA 驗證，防止垃圾訊息。\n3. 送出成功後需顯示確認訊息，並發送自動回覆信件給使用者。\n4. 系統後台需即時收到通知並記錄該筆聯絡資訊。\n5. 若發送失敗(如網路問題)，需保留使用者輸入內容並提示重試。"
        },

        // 第三方加值服務
        { 
            name: "第三方加值服務－智能門鎖", 
            percentage: 0, 
            docPath: "", 
            category: "第三方加值服務 (Third Party)", 
            startDate: "2026-04-15", endDate: "2026-04-20", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需展示支援的智能門鎖品牌與型號列表。\n2. 房東應能透過平台遠端發送一次性密碼(OTP)給看房者。\n3. 需即時同步門鎖的開關狀態與進出紀錄。\n4. 需提供安裝預約與技術支援的聯絡管道。\n5. 系統需確保門鎖權限與租約狀態連動(退租自動失效)。"
        },
        { 
            name: "第三方加值服務－保險方案", 
            percentage: 0, 
            docPath: "", 
            category: "第三方加值服務 (Third Party)", 
            startDate: "2026-04-21", endDate: "2026-04-26", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需展示合作保險公司的租賃相關保險產品(如火險、凶宅險)。\n2. 使用者可直接在平台上進行保費試算。\n3. 需支援線上投保申請流程的整合。\n4. 需提供理賠流程說明與協助。\n5. 保單資訊需能整合至使用者的合約管理頁面。"
        },
        { 
            name: "第三方加值服務－攝影機監控", 
            percentage: 0, 
            docPath: "", 
            category: "第三方加值服務 (Third Party)", 
            startDate: "2026-04-27", endDate: "2026-05-02", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需支援雲端攝影機的串接與即時影像預覽。\n2. 需提供移動偵測告警設定功能。\n3. 影像資料需符合隱私法規，僅授權人員可查看。\n4. 需提供歷史影像回放與下載功能。\n5. 設備離線時需發送通知給管理者。"
        },
        { 
            name: "第三方加值服務－租金保障", 
            percentage: 0, 
            docPath: "", 
            category: "第三方加值服務 (Third Party)", 
            startDate: "2026-05-03", endDate: "2026-05-08", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需說明租金保障服務的涵蓋範圍與理賠條件。\n2. 房東申請服務時需進行自動化資格審核。\n3. 當租客拖欠租金時，需有明確的通報與索賠流程。\n4. 需整合催收進度追蹤功能。\n5. 服務費用需能設定為自動從租金扣除或定期繳費。"
        },

        // 房東
        { 
            name: "房東-儀表板", 
            percentage: 90, 
            docPath: "../features/landlord-dashboard-status-20260206.html", 
            category: "房東 (Landlord)", 
            startDate: "2026-02-20", endDate: "2026-02-28", owner: "Dev Team", points: 8, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 登入後首頁需顯示收租率、空置率等關鍵財務指標。\n2. 需顯示待處理事項，如維修申請、合約到期提醒。\n3. 需提供所有持有物件的列表概覽與狀態(出租中/空置)。\n4. 需整合近期財務收支圖表。\n5. 介面需支援快速新增物件或查看租客資料的捷徑。"
        },
        { 
            name: "房東的Access Matrix管理平台", 
            percentage: 60, 
            docPath: "../features/iam-system.html", 
            category: "房東 (Landlord)", 
            startDate: "2026-03-01", endDate: "2026-03-09", owner: "Dev Team", points: 8, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可設定代理人(如物業管理員)的系統存取權限。\n2. 需提供預設的權限範本(Template)供快速套用。\n3. 權限設定需細分至單一物件或單一功能模組。\n4. 需記錄所有權限變更的操作歷程。\n5. 代理人登入時僅能看到被授權的資料範圍。"
        },
        { 
            name: "房東新增物件方式1－手動輸入", 
            percentage: 85, 
            docPath: "../features/landlord-features.html", 
            category: "房東 (Landlord)", 
            startDate: "2026-03-10", endDate: "2026-03-15", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需提供完整的表單輸入物件基本資料(地址、坪數、格局)。\n2. 需支援地址自動完成與地圖定位功能。\n3. 必填欄位未填寫時需有明確提示，無法送出。\n4. 需支援暫存草稿功能，避免資料遺失。\n5. 送出後需進行資料格式驗證，並提示新增成功。"
        },
        { 
            name: "房東新增物件方式2－自動填入 (VLM/OCR)", 
            percentage: 95, 
            docPath: "../features/vlm-ocr-system.html", 
            category: "房東 (Landlord)", 
            startDate: "2026-03-16", endDate: "2026-03-24", owner: "Dev Team", points: 8, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 支援上傳權狀或謄本圖片/PDF檔案。\n2. 系統需透過 OCR/VLM 技術自動辨識並填入物件資料欄位。\n3. 辨識完成後需提供介面供使用者校對與修正資料。\n4. 需支援多頁文件的連續辨識。\n5. 辨識準確率在標準文件下需達到 90% 以上。"
        },
        { 
            name: "房東的預約看房管理功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-03-25", endDate: "2026-03-28", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可設定物件可供預約看房的時段。\n2. 收到預約申請時需發送通知，並允許房東接受或拒絕。\n3. 預約確認後需自動發送行事曆邀請給雙方。\n4. 看房前一天系統需自動發送提醒通知。\n5. 看房後需有介面供房東記錄看房者的意願與反饋。"
        },
        { 
            name: "房東的客戶－Details模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-03-29", endDate: "2026-03-31", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 點擊客戶列表需進入詳細資料頁面，顯示完整個人資訊。\n2. 需顯示該客戶的歷史租賃紀錄與信用評分(若有)。\n3. 需整合該客戶的所有往來訊息與文件紀錄。\n4. 需提供編輯客戶備註或標籤的功能。\n5. 頁面載入需包含相關聯的合約與帳務資訊。"
        },
        { 
            name: "房東的客戶－Grid模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-04-01", endDate: "2026-04-03", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 客戶列表需以卡片網格形式呈現，顯示大頭貼與關鍵資訊。\n2. 版面需響應式調整，適應不同螢幕寬度。\n3. 每個卡片需有快速操作按鈕(如撥打電話、發送訊息)。\n4. 需支援依狀態(如已簽約、潛在)進行顏色區分。\n5. 圖片載入需使用 Lazy Loading 優化效能。"
        },
        { 
            name: "房東的客戶－List模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-04-04", endDate: "2026-04-06", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 客戶列表需以表格條列形式呈現，方便大量瀏覽。\n2. 需支援各欄位(如姓名、狀態、到期日)的排序功能。\n3. 需提供分頁功能，每頁顯示數量可自訂。\n4. 需具備批次操作功能(如批次發信、批次標記)。\n5. 列表需支援關鍵字搜尋與進階篩選。"
        },
        { 
            name: "房東的客戶－新增客戶", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-04-07", endDate: "2026-04-10", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需提供表單輸入客戶基本資料(姓名、電話、Email)。\n2. 系統需檢查 Email 或電話是否已存在，避免重複建檔。\n3. 新增成功後可選擇是否立即發送邀請信。\n4. 需支援從通訊錄匯入或 CSV 批次匯入功能。\n5. 必填欄位驗證需即時回饋。"
        },
        { 
            name: "房東的客戶－成交客戶", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-04-11", endDate: "2026-04-14", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需自動將已簽約的客戶歸類為成交客戶。\n2. 需顯示成交客戶的合約摘要與租期進度條。\n3. 需提供快速續約或退租的操作入口。\n4. 需統計成交客戶的總貢獻金額(LTV)。\n5. 列表需能篩選即將到期的成交客戶。"
        },
        { 
            name: "房東－邀請第三人成為user的功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-04-15", endDate: "2026-04-18", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可輸入 Email 發送註冊邀請連結。\n2. 邀請連結需有時效性(如 48 小時)。\n3. 受邀者點擊連結後應自動導向註冊頁面並帶入預設資料。\n4. 房東可追蹤邀請狀態(已發送、已點擊、已註冊)。\n5. 註冊成功後，系統需自動建立房東與該使用者的關聯。"
        },
        { 
            name: "房東的部落格創建功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-04-19", endDate: "2026-04-24", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需提供簡易的 CMS 介面供房東撰寫文章。\n2. 編輯器需支援富文本(Rich Text)與圖片上傳。\n3. 文章需支援 SEO 設定(Title, Description, Keywords)。\n4. 發布前需提供預覽功能。\n5. 需支援文章分類與標籤管理。"
        },
        { 
            name: "房東給租客的Ｑ＆Ａ", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-04-25", endDate: "2026-04-27", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可建立專屬的租客常見問題集。\n2. 需支援不同物件設定不同的 Q&A 內容。\n3. 租客登入後應能在顯著位置看到此 Q&A。\n4. 需支援問題的排序與分類。\n5. 房東可將常用回答存為範本，在聊天室中快速引用。"
        },
        { 
            name: "房東給買家的Ｑ＆Ａ", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-04-28", endDate: "2026-04-30", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 針對出售物件，房東可建立買家常見問題集。\n2. 內容可包含產權說明、周邊環境等資訊。\n3. 買家瀏覽物件詳情頁時可直接查看此 Q&A。\n4. 需支援多語系設定(若平台支援)。\n5. 房東可統計哪些問題被查看最多次。"
        },
        { 
            name: "一鍵生成物件銷售部落格", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-05-01", endDate: "2026-05-06", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需根據物件資料自動生成一篇介紹文章。\n2. 文章結構需包含標題、亮點介紹、詳細規格與聯絡方式。\n3. 需自動插入物件的高畫質圖片。\n4. 生成內容需具備行銷吸引力(Copywriting)。\n5. 房東可對生成內容進行手動微調後發布。"
        },
        { 
            name: "房東的部落格 AI 寫手", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-05-07", endDate: "2026-05-12", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 整合 LLM，房東輸入關鍵字即可自動生成文章草稿。\n2. AI 需能根據指定的語氣(專業、親切)調整寫作風格。\n3. 需支援自動生成文章標題與摘要。\n4. AI 寫手需能針對特定節日或活動生成行銷文案。\n5. 生成內容需通過基本的敏感詞過濾。"
        },
        { 
            name: "房東的部落格 AI 講房", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-05-13", endDate: "2026-05-18", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需能將物件介紹文字轉換為語音導覽(TTS)。\n2. 需配合物件照片生成自動導覽影片(Video Generation)。\n3. 語音需自然流暢，支援多種語言或口音選擇。\n4. 生成的導覽內容可嵌入至物件詳情頁或部落格。\n5. 房東可編輯講稿內容並重新生成。"
        },
        { 
            name: "房東自定義銷售物件的Ｑ＆Ａ功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-05-19", endDate: "2026-05-22", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可針對特定銷售物件新增自定義問答。\n2. 系統可提供預設的銷售相關題庫供選擇。\n3. 自定義問答需能即時更新至前端頁面。\n4. 需支援隱藏或暫時下架特定問題。\n5. 需提供介面讓房東管理所有物件的問答資料庫。"
        },
        { 
            name: "房東自定義出租物件的Ｑ＆Ａ功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-05-23", endDate: "2026-05-26", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可針對特定出租物件新增自定義問答(如寵物政策)。\n2. 系統可提供預設的租賃相關題庫供選擇。\n3. 租客在簽約前需能查閱這些特定條款說明。\n4. 需支援附件下載(如房屋守則 PDF)。\n5. 問答內容變更時，需評估是否通知現有租客。"
        },
        { 
            name: "AI TTS語音助理+物件專屬轉接號碼", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-05-27", endDate: "2026-06-04", owner: "Dev Team", points: 8, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 每個物件可分配一組虛擬轉接號碼，保護房東隱私。\n2. 來電時可由 AI 語音助理先行應答過濾。\n3. AI 需能回答基本的物件資訊(租金、坪數)。\n4. 若來電者有意預約，AI 需能協助安排或轉接真人。\n5. 所有通話需有錄音紀錄與文字轉錄(Transcript)。"
        },
        { 
            name: "房東的仲介－Details模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-06-05", endDate: "2026-06-07", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 顯示仲介的完整個人檔案、證照號碼與所屬公司。\n2. 需列出該仲介目前負責的所有物件列表。\n3. 需顯示仲介的績效指標(成交數、帶看數)。\n4. 需整合與該仲介的通訊紀錄。\n5. 房東可在此頁面評價或更換仲介。"
        },
        { 
            name: "房東的仲介－Grid模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-06-08", endDate: "2026-06-10", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 以名片卡片形式展示合作仲介列表。\n2. 卡片需顯示仲介評分與專長區域。\n3. 需支援拖拉排序或分組顯示。\n4. 點擊卡片可快速撥打電話或發送訊息。\n5. 版面需整齊美觀，適應不同裝置。"
        },
        { 
            name: "房東的仲介－List模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-06-11", endDate: "2026-06-13", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 以表格列出所有合作仲介，方便比較績效。\n2. 需支援依成交量、客戶滿意度等欄位排序。\n3. 需提供篩選功能(如依地區、服務類型)。\n4. 列表需顯示合約起訖日期。\n5. 需支援匯出仲介名單功能。"
        },
        { 
            name: "房東的仲介－新增仲介", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-06-14", endDate: "2026-06-17", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可透過 Email 或電話邀請仲介加入。\n2. 支援搜尋平台上的公開仲介資料庫並發送合作邀請。\n3. 新增時需設定仲介的權限範圍與佣金比例。\n4. 系統需驗證仲介的執業執照有效性(若有串接外部API)。\n5. 邀請發送後需有狀態追蹤介面。"
        },
        { 
            name: "房東財務－銀行帳戶管理", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-06-18", endDate: "2026-06-21", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可新增、編輯、刪除收款銀行帳戶。\n2. 需支援設定預設收款帳戶。\n3. 敏感資料(帳號)需進行遮罩處理與加密儲存。\n4. 新增帳戶需進行基本的格式驗證(銀行代碼、帳號長度)。\n5. 支援多國貨幣帳戶的設定(若適用)。"
        },
        { 
            name: "房東財務－收支明細儀表板", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-06-22", endDate: "2026-06-27", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需以圖表顯示每月/每季的總收入與總支出。\n2. 需提供收支類別分析(如租金收入、維修支出、稅務)。\n3. 需支援日期區間篩選與比較功能(YoY, MoM)。\n4. 點擊圖表區塊需能鑽取(Drill-down)至詳細交易紀錄。\n5. 儀表板需即時反映最新的財務數據。"
        },
        { 
            name: "房東財務－租金收支管理", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-06-28", endDate: "2026-07-03", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需自動產生每期租金的應收帳款紀錄。\n2. 需支援手動記帳功能(如現金收款)。\n3. 租金入帳後需自動更新狀態並發送收據給租客。\n4. 需支援分期付款或部分付款的紀錄。\n5. 遲繳租金需自動計算滯納金(若合約有約定)。"
        },
        { 
            name: "房東財務－ATO租賃報稅表生成功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-07-04", endDate: "2026-07-09", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需能彙整年度租賃收支資料。\n2. 需依照澳洲稅務局(ATO)格式生成報稅參考報表。\n3. 需支援折舊(Depreciation)計算或整合折舊報告。\n4. 報表需區分資本支出(Capital Works)與維修支出。\n5. 生成的報表可匯出為 PDF 或 Excel 格式。"
        },
        { 
            name: "房東財務－台灣租賃報稅表生成功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-07-10", endDate: "2026-07-15", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需能彙整年度租賃收支資料。\n2. 需依照台灣國稅局格式生成租賃所得申報參考資料。\n3. 需支援列舉扣除額(維修費、房屋稅、地價稅)的計算。\n4. 需區分一般租金所得與社會住宅包租代管的稅務優惠。\n5. 生成的報表可匯出為 PDF 或 Excel 格式。"
        },
        { 
            name: "房東的溝通頁面", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-07-16", endDate: "2026-07-19", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 整合所有與租客、仲介、廠商的對話紀錄。\n2. 需支援依照物件或專案進行對話分組。\n3. 介面需類似即時通訊軟體，操作直覺。\n4. 需支援重要訊息標註(Pin)與搜尋功能。\n5. 需整合系統通知(Notification)至溝通中心。"
        },
        { 
            name: "房東的物件展示功能－Details模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-07-20", endDate: "2026-07-22", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 完整呈現物件的所有資訊，包含照片、影片、規格、描述。\n2. 需顯示物件的地理位置地圖與周邊設施。\n3. 需提供公開預覽連結(Public View)的分享功能。\n4. 頁面需包含預約看房的入口。\n5. 房東可在此頁面快速編輯物件資料。"
        },
        { 
            name: "房東的物件展示功能－Grid模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-07-23", endDate: "2026-07-25", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 物件列表以圖片為主的卡片網格呈現。\n2. 卡片需顯示租金、坪數、地址等關鍵資訊。\n3. 需標示物件狀態(招租中、已出租、下架)。\n4. 圖片需優化載入速度，並支援滑鼠懸停預覽多圖。\n5. 版面需響應式設計。"
        },
        { 
            name: "房東的物件－照片增生功能 (AI)", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-07-26", endDate: "2026-08-03", owner: "Dev Team", points: 8, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 支援利用 AI 技術提升照片解析度與畫質。\n2. 需提供 AI 虛擬軟裝(Virtual Staging)功能，將空屋照片加入家具。\n3. 需支援移除照片中的雜物或隱私資訊。\n4. 需能調整照片的光線與色調(HDR)。\n5. 處理後的照片需可直接儲存並套用至物件相簿。"
        },
        { 
            name: "房東的物件展示功能－List模式", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-08-04", endDate: "2026-08-06", owner: "Dev Team", points: 2, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 物件列表以資訊為主的表格呈現。\n2. 需顯示點擊率、瀏覽量等數據指標。\n3. 需支援快速上下架操作。\n4. 列表欄位可自訂顯示項目。\n5. 需支援批次編輯功能。"
        },
        { 
            name: "房東的維修派工管理", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-08-07", endDate: "2026-08-12", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可查看所有維修申請單的狀態與進度。\n2. 需能指派維修廠商並發送工單。\n3. 需追蹤維修報價、施工日期與完工驗收。\n4. 需整合維修前後的照片紀錄。\n5. 維修費用需自動連結至財務支出紀錄。"
        },
        { 
            name: "房東的行銷部落格網站行為監控", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-08-13", endDate: "2026-08-18", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需追蹤部落格文章的瀏覽次數與訪客來源。\n2. 需分析讀者的停留時間與跳出率。\n3. 需顯示熱門文章排行。\n4. 需追蹤文章內的 CTA 點擊轉換率。\n5. 報表需視覺化呈現流量趨勢。"
        },
        { 
            name: "房東的email inbox信箱", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-08-19", endDate: "2026-08-24", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需提供專屬 Email 地址，並將收到的信件整合至平台。\n2. 需能自動將信件歸檔至相關聯的物件或聯絡人。\n3. 需支援撰寫、回覆、轉寄郵件的基本功能。\n4. 需具備垃圾郵件過濾機制。\n5. 需支援郵件範本(Templates)以快速回覆。"
        },
        { 
            name: "房東的客戶-租客篩選功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-08-25", endDate: "2026-08-30", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可設定租客篩選條件(如信用分數、收入證明)。\n2. 系統需自動比對申請者資料並給予推薦指數。\n3. 需整合外部信用資料庫進行背景調查(需授權)。\n4. 需提供篩選結果的詳細報告。\n5. 需符合公平住房法規，避免歧視性篩選。"
        },
        { 
            name: "房東的會計人員查帳審計功能", 
            percentage: 0, 
            docPath: "", 
            category: "房東 (Landlord)", 
            startDate: "2026-08-31", endDate: "2026-09-05", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可開設唯讀權限帳號給會計師或審計人員。\n2. 審計人員可查看所有財務報表與原始憑證。\n3. 需提供匯出完整會計年度帳務資料的功能。\n4. 系統需記錄審計人員的所有查詢操作。\n5. 需支援對特定帳目進行標註或提問的功能。"
        },

        // 租客
        { 
            name: "租客(已簽約)-儀表板", 
            percentage: 90, 
            docPath: "../features/tenant-dashboards-20260206.html", 
            category: "租客 (Tenant)", 
            startDate: "2026-03-01", endDate: "2026-03-06", owner: "Dev Team", points: 5, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 登入後首頁需顯示目前租約狀態與剩餘租期。\n2. 需顯示下期租金金額與繳費截止日。\n3. 需提供快速報修入口。\n4. 需顯示房東或管理員發布的重要公告。\n5. 介面需整合近期繳費紀錄概覽。"
        },
        { 
            name: "租客(潛在)-儀表板", 
            percentage: 90, 
            docPath: "../features/tenant-dashboards-20260206.html", 
            category: "租客 (Tenant)", 
            startDate: "2026-03-07", endDate: "2026-03-12", owner: "Dev Team", points: 5, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 登入後首頁需顯示已收藏或申請中的物件狀態。\n2. 需推薦符合使用者偏好的新上架物件。\n3. 需顯示最近瀏覽紀錄。\n4. 需提供預約看房的行程表。\n5. 需提示完善個人資料以提高申請成功率。"
        },
        { 
            name: "租客的維修申請", 
            percentage: 0, 
            docPath: "", 
            category: "租客 (Tenant)", 
            startDate: "2026-03-13", endDate: "2026-03-16", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 租客可填寫維修申請單，包含損壞描述與照片上傳。\n2. 需支援選擇損壞類別(水電、家電、結構等)。\n3. 送出後需能即時追蹤處理進度(已受理、派工中、已完工)。\n4. 維修完成後，租客可對維修服務進行評分。\n5. 需支援緊急維修的快速通報管道。"
        },
        { 
            name: "租客的溝通中心", 
            percentage: 0, 
            docPath: "", 
            category: "租客 (Tenant)", 
            startDate: "2026-03-17", endDate: "2026-03-20", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 租客可與房東或管理員進行即時訊息溝通。\n2. 需支援分類顯示不同物件的對話紀錄。\n3. 收到新訊息需有推播通知。\n4. 需支援傳送圖片或影片以輔助溝通(如維修狀況)。\n5. 訊息紀錄需永久保存以保障雙方權益。"
        },
        { 
            name: "租客的繳費記錄", 
            percentage: 0, 
            docPath: "", 
            category: "租客 (Tenant)", 
            startDate: "2026-03-21", endDate: "2026-03-24", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需列出所有歷史繳費明細，包含租金、押金、水電費。\n2. 需提供付款證明或電子收據下載。\n3. 需顯示未繳款項的明顯提示與立即付款按鈕。\n4. 需支援查看各期帳單的詳細項目。\n5. 需提供年度繳費總覽報表。"
        },

        // 合約與法務
        { 
            name: "買賣合約附加條款功能", 
            percentage: 0, 
            docPath: "", 
            category: "合約與法務 (Contracts & Legal)", 
            startDate: "2026-03-15", endDate: "2026-03-18", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 編輯合約時，需提供介面新增自定義附加條款。\n2. 系統需提供常用的法律條款範本庫供選擇。\n3. 附加條款需清楚標示並與主合約區隔。\n4. 雙方需針對附加條款部分進行個別確認或簽署。\n5. 系統需檢查附加條款是否與主合約條文衝突(AI輔助)。"
        },
        { 
            name: "租賃合約附加條款功能", 
            percentage: 0, 
            docPath: "", 
            category: "合約與法務 (Contracts & Legal)", 
            startDate: "2026-03-19", endDate: "2026-03-22", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 房東可針對寵物、吸菸等特殊規範新增附加條款。\n2. 需支援從範本庫快速匯入條款。\n3. 租客簽約前需強制閱讀並勾選同意附加條款。\n4. 附加條款內容需完整列印於合約文件中。\n5. 修改附加條款需觸發重新簽署流程。"
        },
        { 
            name: "一鍵生成買賣制式合約", 
            percentage: 0, 
            docPath: "", 
            category: "合約與法務 (Contracts & Legal)", 
            startDate: "2026-03-23", endDate: "2026-03-28", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需根據交易資料自動填入買賣合約範本。\n2. 合約範本需符合當地不動產交易法規。\n3. 生成前需進行關鍵資料(金額、地號)的防呆檢查。\n4. 生成的合約需為不可竄改的 PDF 格式。\n5. 需支援產生草稿供雙方審閱。"
        },
        { 
            name: "一鍵生成租賃制式合約", 
            percentage: 0, 
            docPath: "", 
            category: "合約與法務 (Contracts & Legal)", 
            startDate: "2026-03-29", endDate: "2026-04-03", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 系統需根據物件與租客資料自動填入租賃合約。\n2. 需支援住宅、商用等不同類型的租約範本。\n3. 生成的合約需包含所有法定應記載事項。\n4. 需自動計算並填入租期、租金、押金等數值。\n5. 需支援產生多份副本(房東、租客、仲介留存)。"
        },
        { 
            name: "電子簽約功能", 
            percentage: 0, 
            docPath: "", 
            category: "合約與法務 (Contracts & Legal)", 
            startDate: "2026-04-04", endDate: "2026-04-12", owner: "Dev Team", points: 8, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需整合合法的電子簽章服務(如 DocuSign 或自建憑證)。\n2. 簽署過程需記錄 IP、時間戳記與身份驗證資訊。\n3. 支援多方依序簽署流程。\n4. 簽署完成後需自動發送完稿合約給所有相關方。\n5. 簽署歷程需有完整的稽核紀錄(Audit Trail)。"
        },

        // 通用/系統
        { 
            name: "一鍵切換UI風格：暗/亮模式", 
            percentage: 100, 
            docPath: "", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-02-01", endDate: "2026-02-03", owner: "Dev Team", points: 2, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 介面需提供明顯的切換開關。\n2. 切換後所有頁面元素需即時套用對應的顏色主題。\n3. 系統需記住使用者的偏好設定(Local Storage/DB)。\n4. 初次進入需自動偵測作業系統的色彩偏好。\n5. 暗模式下的文字對比度需符合無障礙標準(WCAG)。"
        },
        { 
            name: "RWD網頁響應式設計", 
            percentage: 80, 
            docPath: "../features/company-homepage.html", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-02-04", endDate: "2026-02-09", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 所有頁面需在 Desktop, Tablet, Mobile 三種尺寸下正常顯示。\n2. 選單在移動裝置上需自動轉換為漢堡選單(Hamburger Menu)。\n3. 表格與圖片需具備自適應縮放能力。\n4. 觸控操作目標尺寸需足夠大(至少 44x44px)。\n5. 需通過 Google Mobile-Friendly 測試。"
        },
        { 
            name: "使用者身份驗證系統", 
            percentage: 90, 
            docPath: "../features/auth-system.html", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-02-10", endDate: "2026-02-18", owner: "Dev Team", points: 8, 
            lastModifiedBy: "Claude Sonnet 4.5", 
            lastModifiedDate: "2026/02/05",
            acceptanceCriteria: "1. 支援 Email/Password 註冊與登入。\n2. 需整合 OAuth 第三方登入(Google, Facebook)。\n3. 密碼需強制符合複雜度要求並加密儲存(Salted Hash)。\n4. 登入 session 需有逾時自動登出機制。\n5. 需使用 JWT 或 Session Cookie 進行安全的狀態管理。"
        },
        { 
            name: "註冊的使用者都有自己的行事曆管理頁面", 
            percentage: 0, 
            docPath: "", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-02-19", endDate: "2026-02-22", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 每個使用者擁有個人專屬行事曆。\n2. 系統產生的事件(看房、繳費)需自動同步至行事曆。\n3. 使用者可手動新增私人備忘事項。\n4. 需支援日、週、月視圖切換。\n5. 需支援匯出至外部行事曆(Google Calendar, iCal)。"
        },
        { 
            name: "使用者登入頁面", 
            percentage: 100, 
            docPath: "../features/auth-system.html", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-02-23", endDate: "2026-02-26", owner: "Dev Team", points: 3, 
            lastModifiedBy: "Claude Sonnet 4.5", 
            lastModifiedDate: "2026/02/05",
            acceptanceCriteria: "1. 介面需簡潔，包含帳號、密碼輸入框與登入按鈕。\n2. 需提供「忘記密碼」與「註冊帳號」連結。\n3. 輸入錯誤時需顯示友善的錯誤訊息，但不透露帳號是否存在。\n4. 需防止暴力破解攻擊(Rate Limiting)。\n5. 支援 Tab 鍵切換焦點與 Enter 鍵送出表單。"
        },
        { 
            name: "使用者登入頁面-記住我功能", 
            percentage: 100, 
            docPath: "../features/remember-me-tdd-report-20260205.html", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-02-27", endDate: "2026-03-01", owner: "Dev Team", points: 2, 
            lastModifiedBy: "Claude Sonnet 4.5", 
            lastModifiedDate: "2026/02/05",
            acceptanceCriteria: "1. 登入表單需有「記住我」勾選框。\n2. 勾選登入後，關閉瀏覽器再打開需維持登入狀態。\n3. 「記住我」的 Token 有效期需設定合理長度(如 14 天)。\n4. 使用者主動登出後，需清除相關 Token。\n5. 敏感操作時需要求重新輸入密碼驗證。"
        },
        { 
            name: "使用者密碼重設頁面", 
            percentage: 95, 
            docPath: "../features/auth-system.html", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-03-02", endDate: "2026-03-05", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 使用者輸入 Email 後，系統發送重設連結。\n2. 重設連結需有時效性且僅能使用一次。\n3. 重設頁面需驗證新密碼符合複雜度要求。\n4. 重設成功後需強制將其他裝置登出。\n5. 流程中需防止 Email 枚舉攻擊。"
        },
        { 
            name: "使用者的溝通頁面", 
            percentage: 0, 
            docPath: "", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-03-06", endDate: "2026-03-09", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 統一的訊息中心，整合系統通知與人際對話。\n2. 介面需支援即時更新(WebSocket/Polling)。\n3. 需提供搜尋對話與聯絡人的功能。\n4. 支援封鎖騷擾使用者的功能。\n5. 訊息內容需支援基本的格式設定與表情符號。"
        },
        { 
            name: "受邀使用者登入介面", 
            percentage: 0, 
            docPath: "", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-03-10", endDate: "2026-03-13", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 透過邀請連結進入的使用者，需顯示專屬的歡迎訊息。\n2. 註冊/登入表單需自動帶入邀請資訊(如 Email)。\n3. 流程需引導使用者完成接受邀請的必要步驟。\n4. 若邀請已過期，需顯示明確提示並提供重新申請方式。\n5. 完成後需自動導向至邀請相關的頁面(如共用專案)。"
        },
        { 
            name: "謄本權狀掃描功能", 
            percentage: 95, 
            docPath: "../features/vlm-ocr-system.html", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-03-14", endDate: "2026-03-19", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 支援上傳常見圖片格式(JPG, PNG)與 PDF。\n2. 需具備影像前處理功能(裁切、旋轉、增強)。\n3. 掃描結果需即時預覽並標示辨識區域。\n4. 需能辨識關鍵欄位(地號、建號、所有權人)。\n5. 敏感個資(身分證號)需可選擇自動遮蔽。"
        },
        { 
            name: "上傳物件照片功能", 
            percentage: 95, 
            docPath: "../features/photo-upload.html", 
            category: "通用/系統 (General/System)", 
            startDate: "2026-03-20", endDate: "2026-03-23", owner: "Dev Team", points: 3, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 支援多張照片批次上傳。\n2. 上傳前需在前端進行壓縮與格式檢查。\n3. 需提供拖拉(Drag & Drop)上傳介面。\n4. 上傳後需可調整照片順序與設定封面圖。\n5. 需顯示上傳進度條與失敗重試機制。"
        },

        // 金流支付
        { 
            name: "可用的付款方式之一: ID pay", 
            percentage: 0, 
            docPath: "", 
            category: "金流支付 (Payments)", 
            startDate: "2026-04-01", endDate: "2026-04-06", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 結帳頁面需顯示 ID pay 選項。\n2. 點擊後需導向 ID pay 驗證流程。\n3. 支付成功後需即時回調並更新訂單狀態。\n4. 需處理支付失敗或取消的狀況並提示使用者。\n5. 交易紀錄需包含 ID pay 的交易序號。"
        },
        { 
            name: "可用的付款方式之一: Apple Pay", 
            percentage: 0, 
            docPath: "", 
            category: "金流支付 (Payments)", 
            startDate: "2026-04-07", endDate: "2026-04-12", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 在支援的裝置(Safari/iOS)上需顯示 Apple Pay 按鈕。\n2. 需支援透過 FaceID/TouchID 快速驗證付款。\n3. 需整合 Payment Request API。\n4. 支付流程需符合 Apple 的 UI/UX 規範。\n5. 需正確處理授權與請款流程。"
        },
        { 
            name: "可用的付款方式之一: PayPal", 
            percentage: 0, 
            docPath: "", 
            category: "金流支付 (Payments)", 
            startDate: "2026-04-13", endDate: "2026-04-18", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 結帳頁面需顯示 PayPal 按鈕。\n2. 支援跳轉至 PayPal 登入頁面完成付款。\n3. 需支援多幣別結帳(若有跨國需求)。\n4. 需處理 PayPal IPN (Instant Payment Notification) 回調。\n5. 退款流程需能透過 API 自動發起。"
        },
        { 
            name: "可用的付款方式之一: Credit card", 
            percentage: 0, 
            docPath: "", 
            category: "金流支付 (Payments)", 
            startDate: "2026-04-19", endDate: "2026-04-24", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 需提供安全的信用卡輸入表單(PCI DSS 合規)。\n2. 需即時驗證卡號格式與有效期限。\n3. 支援 3D Secure 驗證流程。\n4. 需支援記憶卡號功能(Tokenization)供下次快速結帳。\n5. 錯誤代碼(如餘額不足)需轉換為友善提示。"
        },
        { 
            name: "線上支付功能", 
            percentage: 0, 
            docPath: "", 
            category: "金流支付 (Payments)", 
            startDate: "2026-04-25", endDate: "2026-04-30", owner: "Dev Team", points: 5, 
            lastModifiedBy: "", 
            lastModifiedDate: "",
            acceptanceCriteria: "1. 整合第三方金流閘道(Payment Gateway)。\n2. 結帳流程需全程加密(HTTPS)。\n3. 需建立獨立的交易資料表記錄每筆支付詳情。\n4. 需防止重複扣款機制(Idempotency)。\n5. 支付成功頁面需顯示訂單摘要與下一步指引。"
        },

        // 測試與品質保證
        { 
            name: "登入頁面>「記住我」功能 TDD 開發進度檢測報告", 
            percentage: 100, 
            docPath: "../features/remember-me-tdd-report-20260205.html", 
            category: "測試與品質保證 (Testing & QA)", 
            startDate: "2026-02-15", endDate: "2026-02-20", owner: "Dev Team", points: 5, 
            lastModifiedBy: "Claude Sonnet 4.5", 
            lastModifiedDate: "2026/02/05",
            acceptanceCriteria: "1. 需包含針對「記住我」功能的完整單元測試案例。\n2. 測試報告需顯示測試覆蓋率(Coverage)。\n3. 需包含成功路徑與失敗路徑(Edge Cases)的測試結果。\n4. 報告需自動生成並可透過網頁檢視。\n5. 所有測試案例需全數通過(Green)。"
        },

        // 資料庫與後端架構
        { 
            name: "Supabase 資料庫架構與遷移", 
            percentage: 95, 
            docPath: "../progress-reports/database-reports/supabase-schema-status.md", 
            category: "資料庫與後端架構 (Database & Backend Infrastructure)", 
            startDate: "2026-01-22", endDate: "2026-02-10", owner: "Dev Team", points: 5, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 核心表格 (Users, Properties) 已建立並包含完整關聯。\n2. RLS (Row Level Security) 策略已部署並通過安全性測試。\n3. 資料庫 Migration 腳本已版本化管理。\n4. 建立效能優化所需的索引 (Indexes)。\n5. 實作自動備份機制。"
        },
        { 
            name: "Supabase 認證與授權系統", 
            percentage: 90, 
            docPath: "../progress-reports/auth-reports/supabase-auth-status.md", 
            category: "資料庫與後端架構 (Database & Backend Infrastructure)", 
            startDate: "2026-02-01", endDate: "2026-02-15", owner: "Dev Team", points: 5, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 支援 Email/Password 與 OAuth 登入。\n2. 實作 Next.js Middleware 進行 Session 驗證。\n3. 整合 RBAC (Role-Based Access Control) 權限管理。\n4. 完成 Mobile App (Expo) 的登入狀態同步。\n5. 實作密碼重設與 Email 驗證流程。"
        },
        { 
            name: "Supabase 儲存空間 (Storage) 整合", 
            percentage: 85, 
            docPath: "../progress-reports/storage-reports/supabase-storage-status.md", 
            category: "資料庫與後端架構 (Database & Backend Infrastructure)", 
            startDate: "2026-02-05", endDate: "2026-02-20", owner: "Dev Team", points: 5, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 建立 `property-photos` 與 `property-documents` Buckets。\n2. 設定 Storage RLS 以限制檔案存取權限。\n3. 前端實作多檔案上傳元件 (Drag & Drop)。\n4. 後端 (Python) 整合文件上傳與處理流程。\n5. 實作圖片上傳後的自動壓縮或格式轉換 (若有)。"
        },
        { 
            name: "Supabase 即時功能 (Realtime) 與 API", 
            percentage: 20, 
            docPath: "", 
            category: "資料庫與後端架構 (Database & Backend Infrastructure)", 
            startDate: "2026-02-25", endDate: "2026-03-05", owner: "Dev Team", points: 5, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 建立即時通知系統 (Notification) 的資料表訂閱。\n2. 實作聊天室訊息的即時推播。\n3. 儀表板數據 (Dashboard Stats) 支援即時更新。\n4. API 端點回應時間需低於 200ms。\n5. 壓力測試支援 1000+ 並發連線。"
        },
        { 
            name: "Supabase Edge Functions 開發", 
            percentage: 0, 
            docPath: "", 
            category: "資料庫與後端架構 (Database & Backend Infrastructure)", 
            startDate: "2026-03-10", endDate: "2026-03-20", owner: "Dev Team", points: 8, 
            lastModifiedBy: "Gemini-3-Pro-Preview", 
            lastModifiedDate: "2026/02/06",
            acceptanceCriteria: "1. 建立 Edge Functions 開發環境與部署流程。\n2. 遷移複雜的觸發器 (Triggers) 邏輯至 Edge Functions。\n3. 實作第三方 Webhook 處理 (如金流回調)。\n4. 確保 Edge Functions 的執行延遲低於 100ms。\n5. 實作全域的 Edge Cache 策略。"
        }
    ]
};
