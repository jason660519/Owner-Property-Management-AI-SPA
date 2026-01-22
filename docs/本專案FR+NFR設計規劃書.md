# 房東物件管理語音 AI 平台 - 功能與非功能需求設計規劃書

> **文件版本**: 1.0.0  
> **建立日期**: 2026-01-22  
> **適用對象**: 產品經理、開發團隊、QA團隊、專案管理者

---

## 目錄

1. [專案概述](#1-專案概述)
2. [需求分類與優先級說明](#2-需求分類與優先級說明)
3. [功能需求 (FR) 詳細設計](#3-功能需求-fr-詳細設計)
4. [非功能需求 (NFR) 詳細設計](#4-非功能需求-nfr-詳細設計)
5. [技術架構與實作方案](#5-技術架構與實作方案)
6. [驗收標準與測試方法](#6-驗收標準與測試方法)
7. [依賴關係與開發順序](#7-依賴關係與開發順序)
8. [風險評估與應對策略](#8-風險評估與應對策略)

---

## 1. 專案概述

### 1.1 產品願景

建立一個專門為房東設計的房屋管理 AI 語音 SPA (Single Page Application)，透過自然語言對話，協助房東高效率處理房屋**出租、出售與持有期間管理**及相關財稅問題，降低物業管理與租賃合約管理的複雜度。

### 1.2 核心使用者

- **主要使用者**: 房東 (Landlord) - 實際不動產所有權人
- **次要使用者**: 仲介 (Agent) - 獲授權代管的房地產仲介
- **輔助使用者**: 會計人員 (Accountant) - 第三方審計與財稅服務人員

### 1.3 技術棧

- **前端**: Expo (React Native Web) - 支援 Web/iOS/Android 三平台
- **後端**: Supabase (PostgreSQL + Edge Functions)
- **AI 服務**: OpenAI GPT-4o / Claude 3.5 Sonnet
- **部署**: Vercel (前端) + Self-hosted Server (後端)

### 1.4 參考競品

- [TurboTenant](https://www.turbotenant.com) - 美國租賃管理平台
- [Bananas 香蕉租房](https://bananas.com.tw) - 台灣租屋平台
- [屋我也 Wuohyeah](https://wuohyeah.com) - 台灣物業管理

---

## 2. 需求分類與優先級說明

### 2.1 優先級定義

| 優先級  | 定義                   | 開發時程           |
| :-----: | :--------------------- | :----------------- |
|  **1**  | 核心功能，MVP 必須     | Phase 1 (1-3個月)  |
|  **2**  | 重要功能，用戶體驗關鍵 | Phase 2 (4-6個月)  |
|  **3**  | 系統管理功能           | Phase 2-3          |
|  **4**  | 進階功能，提升競爭力   | Phase 3 (6-12個月) |
| **700** | 非功能需求，持續優化   | 貫穿全週期         |
|  **8**  | 合規與安全審計         | Phase 2 開始       |

### 2.2 需求分類架構

```
├── WebApp-NFR (Non-Functional Requirements)
│   ├── 公司產品展示 (001_001 ~ 001_005)
│   ├── 多語言支援 (700)
│   ├── 響應式設計 (700)
│   ├── 資訊安全 (700, 8)
│   ├── 系統效能 (700)
│   └── 加值服務 (700)
│
└── WebApp-FR (Functional Requirements)
    ├── 身份驗證模組 (002_001 ~ 002_003)
    ├── 超級管理員模組 (003_001 ~ 003_009)
    ├── 房東核心功能 (004_001 ~ 004_034)
    │   ├── 儀表板與總覽
    │   ├── 物件管理
    │   ├── 客戶關係管理 (CRM)
    │   ├── 合約製作與簽署
    │   ├── 財務與會計
    │   ├── 溝通與通知
    │   └── 行銷與部落格
    └── 第三方服務 (8)
```

---

## 3. 功能需求 (FR) 詳細設計

### 3.1 身份驗證模組 (Priority 2)

#### 002_001: 登入功能

**功能說明**  
支援多種登入方式：手機+Email、社群帳號(Google, Facebook, Apple)

**技術方案**
- Expo React Native 表單驗證
- Supabase Auth API (支援 OAuth 2.0)
- Twilio Verify 發送 OTP
- Expo AuthSession 串接社群登入

**頁面路徑**: `/super_admin/authentication/sign_in`

**驗收標準**
- ✅ 使用者可用任一方式註冊
- ✅ 取得 OTP 後成功登入
- ✅ Session 於重新整理後仍有效
- ✅ 僅完成雙重驗證者 (status=verified) 可進入 Dashboard

**測試方法**
- Jest 表單驗證單元測試
- Supabase Sandbox 整合測試
- QA 以真實/測試手機與 email 驗證

---

#### 002_002: 密碼重設

**頁面路徑**: `/super_admin/authentication/reset_password`

**參考頁面**: `file:///Volumes/KLEVV-4T-1/Real Estate Management Projects/Lahomes/techzaa.in/lahomes/admin/auth-password.html`

**技術方案**
- Supabase Auth 內建密碼重設流程
- 發送驗證郵件至註冊 Email
- 雙重驗證確認身份

---

#### 002_003: 註冊功能

**功能說明**  
Email（預設帳號）+ 手機雙重驗證，標記合格使用者

**頁面路徑**: `/super_admin/authentication/sign_up`

**技術方案**
- Supabase Edge Function 紀錄驗證狀態
- Expo UI 分步驟引導
- profiles 表儲存 verified 標記

**驗收標準**
- ✅ Email/SMS 驗證完成後標記為已驗證
- ✅ 未驗證時權限受限，導向補驗證流程

---

### 3.2 超級管理員模組 (Priority 3)

#### 003_001: Access Matrix 授權設定

**功能說明**  
最高權限管理員 Access Matrix - 管理所有使用者對各功能的權限

**頁面路徑**: `/super_admin/access_matrix`

**技術方案**
- 基於 RBAC (Role-Based Access Control)
- Supabase RLS (Row Level Security) Policy
- 前端權限矩陣 UI 管理介面

---

#### 003_004: 最高權限管理員儀表板

**頁面路徑**: `/super_admin/dashboard`

**功能模組**
- 系統使用者統計
- 物件數量與狀態總覽
- 財務流水總計
- 系統健康度監控

---

#### 003_006 ~ 003_008: 網站效能監控功能

**003_006: AI 語音回應延遲監控**
- **目標**: AI 語音回應延遲 < 2 秒
- **技術方案**: 語音服務埋點 + APM 蒐集 RTA + 邊緣快取語音模型
- **驗收標準**: AI 語音回應 P95 < 2 秒; 異常自動告警

**003_007: 頁面載入時間監控**
- **目標**: 監測頁面載入時間 < 3 秒
- **技術方案**: Real User Monitoring + Lighthouse CI Pipeline + New Relic Dashboard
- **驗收標準**: 主要頁面在 P95 < 3 秒; 報表可視化

**003_008: 網頁故障修復時間**
- **目標**: 網頁故障修復時間 < 4 小時
- **技術方案**: PagerDuty 事件流程 + 災難復原演練 + 狀態頁同步
- **驗收標準**: 重大故障 MTTR < 4 小時; 狀態頁 15 分內更新

---

### 3.3 房東核心功能 (Priority 1 & 4)

#### 004_003: 房東儀表板

**頁面路徑**: `/landlord/dashboard`

**功能模組**
- 物件總覽 (出租中/空置/維修中)
- 本月收租狀態
- 待辦事項 (預約看房、維修請求)
- 財務快速摘要

---

#### 004_005: 新增物件 (核心功能)

**頁面路徑**: `/landlord/properties/add_property`

**功能說明**  
房東可上傳物件相關文字檔案與照片，系統自動解析並填入欄位

**文字檔案上傳+解析**
- 支援格式: Microsoft Word, Google Doc, PDF, Markdown
- VLM (Vision Language Model) 判讀內容
- 解析成 JSON 後存入資料庫
- 自動填入 Property Information 欄位
- 不合規檔案標記為「無效檔」

**照片上傳+過濾**
- 支援格式: JPG, GIF, PNG
- VLM 判讀照片內容
- 違法照片自動過濾
- 合規照片自動縮放並歸檔

**技術方案**
- OpenAI Vision API / Claude Vision
- Supabase Storage 儲存原始檔案
- JSONB 儲存解析結果
- 照片自動 CDN 優化

**驗收標準**
- ✅ 支援主流文字與圖片格式
- ✅ 解析準確率 > 90%
- ✅ 違規內容自動過濾
- ✅ 房東可手動修正錯誤

---

#### 004_006 ~ 004_008: 物件展示功能

- **004_006**: Details 模式 - `/landlord/properties/details`
- **004_007**: Grid 模式 - `/landlord/properties/grid`
- **004_008**: List 模式 - `/landlord/properties/list`

**參考頁面**: Lahomes 專案對應頁面

---

#### 004_009: 預約看房管理

**頁面路徑**: `/landlord/properties/appointment`

**功能說明**  
接收潛在客戶預約並即時通知房東

**技術方案**
- React Native Calendar 元件
- Supabase Edge Function 建立/更新預約
- SendGrid Email + Twilio SMS 通知

**驗收標準**
- ✅ 租客可成功預約
- ✅ 房東於 1 分鐘內收到通知
- ✅ 狀態同步於租客與房東端顯示

---

#### 004_001 ~ 004_002: 合約製作功能

**004_001: 租賃合約製作**
- 線上生成、預覽、儲存租賃合約並支援電子簽名
- 頁面路徑: `/landlord/dashboard/lease_agreement`

**004_002: 買賣合約製作**
- 線上生成、預覽、儲存買賣合約並支援電子簽名
- 頁面路徑: `/landlord/dashboard/sale_agreement`

**技術方案**
- 模板引擎 (Handlebars) 生成合約
- DocuSign 嵌入簽署
- Supabase 儲存版本

**驗收標準**
- ✅ 房東可生成/預覽/寄送合約
- ✅ 租客可完成電子簽署
- ✅ 簽署狀態同步

---

#### 004_004: 租客篩選功能

**頁面路徑**: `/landlord/customer/screen`

**功能說明**  
整合信用與背景查核，協助房東評估

**技術方案**
- Supabase 儲存審核報告
- 後端整合信用/背景 API
- React Native 資料表呈現評分

**驗收標準**
- ✅ 房東可查看信用與背景摘要
- ✅ 系統標記優良/風險租客
- ✅ 申請列表自動更新

---

#### 004_010: 自定義物件Q&A

**頁面路徑**: `/landlord/properties/q_a`

**功能說明**  
房東可自定義房客常見問答

**技術方案**
- React Native 表單 + Supabase CRUD
- 向量資料庫儲存 FAQ 嵌入
- AI 回覆自動引用 FAQ

**驗收標準**
- ✅ 房東可新增/編輯/刪除 FAQ
- ✅ AI 回覆正確引用內容
- ✅ 版本歷史可追蹤

---

#### 004_011: 行事曆功能

**頁面路徑**: `/landlord/calendar`

**功能說明**  
安排看屋、簽約、修理等事項

**參考頁面**: Lahomes > Pages > Calendar Page

---

#### 004_012: 簡訊溝通中心

**頁面路徑**: `/message_center`

**功能說明**  
所有人都可透過簡訊即時溝通，定時聯繫並預約提醒

**技術方案**
- 消息佇列 (Supabase Queue) + Twilio SMS
- 範本管理 UI

**驗收標準**
- ✅ 房東可建立與套用通知模板
- ✅ 系統自動發送重要提醒並紀錄送達狀態

---

#### 004_013: 維修管理 (Tradies)

**頁面路徑**: `/landlord/tradies`

**功能說明**  
建立維修申請、與 tradies 派工聯絡及追蹤進度

**技術方案**
- Supabase 工單表 + 任務狀態機
- React Native Kanban UI
- Twilio/Email 通知

**驗收標準**
- ✅ 房東可建立工單並指派
- ✅ 進度與通知即時更新
- ✅ 歷史紀錄可查

---

#### 004_014 ~ 004_019: 財務模組

**004_014: ATO 租賃報稅報表**
- 產生符合澳洲 ATO 的租賃報稅報表
- 技術: Supabase Function 計算稅額 + PDFKit 產出報表
- 驗收: 可生成 ATO 格式 PDF; 數值與實際資料一致

**004_015: 財務儀表板**
- 租金收入、支出與預算儀表板
- 技術: Supabase 分析視圖 + Victory Charts
- 驗收: 顯示季度/年度收支; 可下載 PDF/Excel

**004_016: 租金收款管理**
- 管理租金收款、欠租提醒與對帳
- 技術: Ledger 資料表 + 定時排程
- 驗收: 房東可查看收款紀錄; 設定自動提醒

**004_017: 銀行帳戶管理**
- 綁定多銀行帳戶並指定撥款帳戶
- 技術: Plaid Link 嵌入; Supabase 加密儲存
- 驗收: 可新增/刪除多個帳戶; 敏感資料 AES-256 加密

**004_018: 線上支付**
- 支援租金線上支付與自動扣款
- 技術: Serverless 金流編排 + React Native Web Checkout
- 驗收: 租客可完成支付與自動扣款; 手續費計算正確

**004_019: 離線付款登錄**
- 支援線下類 Apple Pay 付款登錄
- 技術: NFC/Token API 整合 + Supabase 記錄離線交易
- 驗收: 離線交易可成功註記並同步; 避免重複扣款

---

#### 004_020: 部落格網站行為監控

**頁面路徑**: `/landlord/blogs/monitor`

**功能說明**  
追蹤潛在客戶 IP 瀏覽了哪些物件的 Blog

---

#### 004_022 ~ 004_025: 仲介管理

- **004_022**: Details 模式 - `/landlord/agents/details`
- **004_023**: Grid 模式 - `/landlord/agents/grid`
- **004_024**: List 模式 - `/landlord/agents/list`
- **004_025**: 新增仲介 - `/landlord/agents/add_agent`

---

#### 004_026 ~ 004_030: 客戶管理

- **004_026**: Details 模式 - `/landlord/customers/details`
- **004_027**: Grid 模式 - `/landlord/customers/grid`
- **004_028**: List 模式 - `/landlord/customers/list`
- **004_029**: 新增客戶 - `/landlord/customers/add_customer`
- **004_030**: 成交客戶 - `/landlord/customers/buyer_and_renter`

---

#### 004_031: 部落格創建功能

**頁面路徑**: `/landlord/create_blog`

**功能說明**  
房東上傳照片+文字說明，自動創建物件或個人部落格展示頁面

**技術方案**
- React Native Web 模板引擎 + Mustache
- Supabase metadata
- 靜態頁面托管於 Vercel

**驗收標準**
- ✅ 資料齊全時自動生成分享連結
- ✅ 缺資料時顯示待補欄位清單

---

#### 004_032 ~ 004_033: 全球部落格展示

- **004_032**: 全球屋主物件部落格 - `/blog_grid/global`
- **004_033**: 台灣屋主物件部落格 - `/blog_grid/tw`

---

#### 004_034: 溝通頁面

**頁面路徑**: `/landlord/message`

**功能說明**  
未檢視/已檢視的聊天記錄，群聊功能，私聊功能

**參考頁面**: Lahomes 專案 messages.html

---

### 3.4 第三方服務模組 (Priority 8)

#### 第三方會計人員查帳審計功能

**頁面路徑**: `/third-party/accountants/audit`

**功能說明**  
第三方會計師可審計房東的財務資料

---

## 4. 非功能需求 (NFR) 詳細設計

### 4.1 公司產品展示 (Priority 1)

#### 001_001: 公司產品首頁

**頁面路徑**: `/home_page`

**參考網站**: https://www.turbotenant.com

**內容模組**
- Hero Section - 價值主張
- 功能特色展示
- 客戶評價
- CTA (Call-to-Action) 註冊按鈕

---

#### 001_002: 產品特色介紹

**頁面路徑**: `/home_page/feature`

**參考資料**: `/Volumes/KLEVV-4T-1/Real Estate Management Projects/Turbotenant/產品特色.png`

---

#### 001_003: 費用說明

**頁面路徑**: `/home_page/pricing`

**參考網站**: https://www.turbotenant.com/pricing/

---

#### 001_004: 互動教學

**頁面路徑**: `/home_page/tutorial`

**功能說明**  
提供系統操作指引與教學內容

**技術方案**
- React Joyride 導覽
- Supabase 任務追蹤
- Lottie 動畫

**驗收標準**
- ✅ 所有人可於 10 分鐘內完成教學
- ✅ 完成度事件記錄於分析平台

---

#### 001_005: Q&A + Need Help

**頁面路徑**: `/home_page/q_and_a`

**功能說明**  
提供常見問題解答

**參考網站**: https://rental.turbotenant.com/landlords/help_center

**技術方案**
- React Accordion + 搜尋
- Supabase CMS 儲存 FAQ

**驗收標準**
- ✅ 房東可快速搜尋問題
- ✅ 中英文內容同步
- ✅ 點擊率追蹤可用

---

### 4.2 資訊安全 (Priority 700)

#### 700_SSL: HTTPS 傳輸加密

**技術方案**
- 全站 HTTPS
- KMS 管理密鑰
- 年度稽核 SOP

**驗收標準**
- ✅ SSL Labs 測試 A 級
- ✅ 密鑰輪換測試
- ✅ 稽核報告完整

---

#### 700_RBAC: 防止未授權修改

**技術方案**
- 雙層 RBAC
- WAF (Web Application Firewall)
- 資料庫行級權限
- 敏感欄位加密

**驗收標準**
- ✅ 未授權行為被阻擋並記錄
- ✅ 敏感資料加密
- ✅ 安全稽核通過

---

#### 8_Audit: 隱私審計

**頁面路徑**: `/cyber_security/auditor/private`

**功能說明**  
審計隱私或個人資料有無外洩的可能性

---

### 4.3 系統效能 (Priority 700)

#### 700_Availability: 系統可用性

**目標**: 服務可用性 99.5%，支援故障轉移

**技術方案**
- Multi-AZ 部署
- 自動故障轉移
- 備援資料庫

**驗收標準**
- ✅ 年度可用性 ≥ 99.5%
- ✅ 故障轉移 < 2 分鐘
- ✅ DR 報告有效

---

#### 700_Scalability: 可擴展性

**目標**: 支援水平擴展應對用戶成長

**技術方案**
- Kubernetes 水平擴展
- Supabase 連線池
- Queue 解耦

**驗收標準**
- ✅ 系統可在需求成長時自動擴展
- ✅ 無重大性能衰退

---

### 4.4 使用者體驗 (Priority 700)

#### 700_Learnability: 可學習性

**目標**: 清楚操作指引，新用戶 10 分鐘內上架物件

**技術方案**
- Onboarding Checklist + 教學影片
- 互動引導

**驗收標準**
- ✅ 80% 新用戶 10 分鐘內完成首次上架
- ✅ 引導完成率被記錄

---

#### 700_Usability: 易用性

**目標**: 友善 UI，房東可透過語音或點擊操作

**技術方案**
- Design System + 無障礙規範
- Crisp Chat 與語音整合

**驗收標準**
- ✅ SUS 分數 ≥ 80
- ✅ 語音/點擊流程皆完成
- ✅ 無障礙 AA 達成

---

#### 700_Responsive: 響應式設計

**目標**: 支援 Web 與 Mobile 提供一致體驗

**技術方案**
- Expo React Native Web 響應式格線
- Tailwind RN
- 裝置偵測

**驗收標準**
- ✅ 不同裝置呈現一致
- ✅ 行動 Lighthouse 分數 ≥ 90
- ✅ 主要流程可順利完成

---

### 4.5 國際化 (Priority 700)

#### 700_i18n: 繁體中文/英文介面切換

**頁面路徑**: `/super_admin/multilanguage/i18next_table`

**技術方案**
- i18next 多語言框架
- 專業詞彙對照表
- Table 方式直接套用管理

**驗收標準**
- ✅ 多作業系統都能完整展示正確的文字

---

### 4.6 加值服務 (Priority 700)

#### 700_3D_Tour: 3D/2D 導覽

**技術方案**
- WebGL/Krpano 內嵌
- 媒體 CDN
- 預載縮圖

**驗收標準**
- ✅ VIP 房東可在 5 秒內載入導覽
- ✅ 支援 3D/2D 切換
- ✅ FPS 穩定 ≥ 30

---

#### 700_AI_Redesign: 3D/2D 變裝

**技術方案**
- GPU 推理服務 (Stable Diffusion) + 任務佇列
- React 動畫展示

**驗收標準**
- ✅ 提供至少 3 個風格版本
- ✅ 處理時間 < 10 分鐘
- ✅ 可下載高解析圖

---

#### 700_360: 720度全景看屋

**技術方案**
- 360 Viewer (krpano) + VR 模式
- CDN 切片串流

**驗收標準**
- ✅ 全景載入 < 6 秒
- ✅ 支援手機陀螺儀
- ✅ 無效媒體會顯示錯誤提示

---

#### 700_AI_Assistant: AI 小幫手

**技術方案**
- LangChain + OpenAI/Azure GPT
- Supabase 向量資料庫
- 前端浮動助理

**驗收標準**
- ✅ 用戶可即時提問
- ✅ AI 回答引用來源
- ✅ 正確率 ≥ 90% 且可導出

---

#### 700_AI_Voice: AI 講房

**技術方案**
- Supabase 地區資料 + Google Places
- LLM 摘要服務
- React Native 語音播放

**驗收標準**
- ✅ AI 解說包含交通/生活機能
- ✅ 內容正確率 ≥ 90%
- ✅ 支援文字與語音播放

---

#### 700_SmartLock: 智能設備 - 多元解鎖

**技術方案**
- 鎖控服務 (AWS IoT)
- AES 加密憑證庫
- App 遠端控制 UI

**驗收標準**
- ✅ 支援指紋/密碼/卡片/App/一次性密碼
- ✅ 異常即時通知
- ✅ 電量不足提醒

---

#### 700_Insurance: 保險方案

**技術方案**
- Supabase workflow + 保險 API (Sandbox)
- React Native 流程引導

**驗收標準**
- ✅ 房東可瀏覽方案、提交申購、追蹤進度
- ✅ 通知與文件歸檔完整

---

#### 700_RentGuarantee: 租金保障

**技術方案**
- 風險評估引擎 + 金融 API
- Supabase 合約紀錄
- 自動扣款整合

**驗收標準**
- ✅ 房東可啟用保障方案
- ✅ 代墊/扣款流程透明
- ✅ 報表可追蹤

---

#### 700_Camera: 攝影機即時監控

**技術方案**
- ONVIF/RTSP 串流服務
- WebRTC Viewer
- 加密串流

**驗收標準**
- ✅ 即時影像延遲 < 1 秒
- ✅ 權限控管依角色
- ✅ 錄影可回放

---

#### 700_VirtualNumber: 專屬轉接號碼

**技術方案**
- Serverless Voice 路由 (Twilio)
- Expo UI 控制開關
- 通話紀錄寫入 Supabase

**驗收標準**
- ✅ 房東可啟停轉接號碼
- ✅ 來電來源顯示與紀錄完整
- ✅ 通話資訊可匯出

---

#### 700_Video: 影片導覽服務

**技術方案**
- Mux 上傳 + 自動編解碼
- React 播放器組件

**驗收標準**
- ✅ 房東可上傳或申請拍攝
- ✅ 影片可在行銷頁播放
- ✅ 產出分享連結

---

### 4.7 全球物業展示 (Priority 700)

#### 700_001: 全球物業展示頁面

**技術方案**
- Expo Web/Next.js 公開站
- CDN 快取
- 排程清除過期物件

**驗收標準**
- ✅ 只顯示有效物件
- ✅ 監管合規
- ✅ 全球載入 P95 < 4 秒

---

#### 700_002: 全球物業客戶評價

**參考頁面**: Lahomes 專案 reviews.html

---

### 4.8 可維護性 (Priority 700)

#### 700_Maintainability: 模組化設計

**技術方案**
- Monorepo + Turborepo
- CI 靜態檢查
- 型別界面

**驗收標準**
- ✅ 模組邊界清晰
- ✅ CI < 10 分鐘完成
- ✅ 重大變更有測試覆蓋

---

## 5. 技術架構與實作方案

### 5.1 前端架構

```
frontend/
├── src/
│   ├── app/                    # 路由與頁面
│   │   ├── home/              # 公司首頁
│   │   ├── super_admin/       # 超級管理員
│   │   └── landlord/          # 房東功能
│   ├── components/            # 共用元件
│   ├── hooks/                 # 自定義 Hooks
│   ├── services/              # API 服務層
│   ├── store/                 # 狀態管理 (Zustand/Redux)
│   └── utils/                 # 工具函數
└── public/                    # 靜態資源
```

### 5.2 後端架構

```
backend/
├── supabase/
│   ├── functions/             # Edge Functions
│   │   ├── auth/             # 身份驗證
│   │   ├── property/         # 物件管理
│   │   ├── payment/          # 金流處理
│   │   └── ai/               # AI 服務
│   └── migrations/           # 資料庫遷移
└── scripts/                  # 自動化腳本
```

### 5.3 AI 架構

```
AI Services
├── LLM Provider
│   ├── OpenAI GPT-4o (主力)
│   └── Claude 3.5 Sonnet (備援)
├── Specialized Agents
│   ├── Website Creator Agent
│   ├── Legal Agent
│   ├── Lease Agreement Creator
│   ├── Accountant Agent
│   ├── Concierge Agent
│   └── Document Parser
└── Vector Database (Supabase pgvector)
```

### 5.4 資料庫架構

參考 **資料庫架構設計書.md** 完整 30 張資料表設計：

#### 7 大模組
1. **Identity & Core** - 使用者身份
2. **Property Assets** - 物件資產管理
3. **Leads & CRM** - 客源與客戶關係
4. **Transactions** - 交易與成交管理
5. **Accounting** - 財務與金流紀錄
6. **Operations** - 營運與專業服務
7. **Support & AI** - 系統支援與 AI

---

## 6. 驗收標準與測試方法

### 6.1 測試分類

| 測試類型     | 工具           | 覆蓋範圍           |
| :----------- | :------------- | :----------------- |
| **單元測試** | Jest           | 元件、函數邏輯     |
| **整合測試** | Cypress        | API 串接、資料流   |
| **E2E 測試** | Playwright     | 完整用戶流程       |
| **效能測試** | Lighthouse, k6 | 頁面載入、API 回應 |
| **安全測試** | OWASP ZAP      | 漏洞掃描、滲透測試 |

### 6.2 驗收流程

1. **開發自測** - 開發者本地測試
2. **Code Review** - 同儕審查
3. **CI/CD 自動化測試** - GitHub Actions
4. **QA 測試** - 測試團隊驗證
5. **UAT** - 使用者驗收測試
6. **上線部署** - Staging → Production

### 6.3 關鍵指標 (KPI)

| 指標                  | 目標值    |
| :-------------------- | :-------- |
| 頁面載入時間 (P95)    | < 3 秒    |
| AI 語音回應延遲 (P95) | < 2 秒    |
| 系統可用性            | ≥ 99.5%   |
| 故障修復時間 (MTTR)   | < 4 小時  |
| 新用戶上架物件時間    | < 10 分鐘 |
| 使用者滿意度 (SUS)    | ≥ 80      |
| 行動裝置 Lighthouse   | ≥ 90      |

---

## 7. 依賴關係與開發順序

### 7.1 Phase 1: MVP 核心功能 (1-3個月)

**優先級 1 功能**

```
[基礎建設]
├── 001_001 ~ 001_003: 公司首頁與產品介紹
├── 002_001 ~ 002_003: 身份驗證 (登入/註冊/重設密碼)
│
[房東核心功能]
├── 004_003: 房東儀表板
├── 004_005: 新增物件 (含 VLM 解析)
├── 004_006 ~ 004_008: 物件展示 (Grid/List/Details)
├── 004_009: 預約看房管理
└── 004_034: 溝通頁面 (訊息中心)
```

**里程碑**: 房東可註冊、上架物件、接收預約

---

### 7.2 Phase 2: 進階功能與管理 (4-6個月)

**優先級 2-3 功能**

```
[身份驗證強化]
├── 雙重驗證 (2FA)
│
[超級管理員]
├── 003_001: Access Matrix 權限管理
├── 003_004: 超級管理員儀表板
├── 003_006 ~ 003_009: 效能監控與網站行為紀錄
│
[房東進階功能]
├── 004_001 ~ 004_002: 合約製作與電子簽名
├── 004_004: 租客篩選功能
├── 004_010: 自定義物件 Q&A
├── 004_011: 行事曆功能
├── 004_012: 簡訊溝通中心
├── 004_022 ~ 004_029: 仲介與客戶管理 (Grid/List/Details)
└── 004_031: 部落格創建功能
```

**里程碑**: 完整 CRM、合約簽署、權限管理

---

### 7.3 Phase 3: 財務與加值服務 (6-12個月)

**優先級 4 功能**

```
[財務模組]
├── 004_013: 維修管理 (Tradies)
├── 004_014: ATO 租賃報稅報表
├── 004_015: 財務儀表板
├── 004_016: 租金收款管理
├── 004_017: 銀行帳戶管理
├── 004_018: 線上支付
├── 004_019: 離線付款登錄
└── 004_020: 部落格網站行為監控
│
[加值服務]
├── 700: 3D/2D 導覽
├── 700: AI 變裝設計
├── 700: 720度全景看屋
├── 700: AI 小幫手
├── 700: AI 講房
├── 700: 智能設備整合
├── 700: 保險方案
├── 700: 租金保障
├── 700: 攝影機監控
├── 700: 專屬轉接號碼
└── 700: 影片導覽服務
```

**里程碑**: 完整財務自動化、高級 AI 功能

---

### 7.4 持續優化 (全週期)

**優先級 700 非功能需求**

```
[效能優化]
├── 頁面載入優化
├── API 回應優化
├── 資料庫查詢優化
│
[安全強化]
├── HTTPS 全站
├── RBAC 權限細化
├── 定期安全稽核
│
[使用者體驗]
├── 響應式設計優化
├── 無障礙規範 (WCAG AA)
├── 多語言支援擴展
│
[可維護性]
├── 程式碼重構
├── 文檔更新
└── 技術債償還
```

---

## 8. 風險評估與應對策略

### 8.1 技術風險

| 風險               | 影響 | 機率  | 應對策略                                                   |
| :----------------- | :--- | :---: | :--------------------------------------------------------- |
| VLM 解析準確率不足 | 高   |  中   | 1. 多模型 A/B 測試<br>2. 人工審核機制<br>3. 漸進式訓練優化 |
| 第三方 API 不穩定  | 中   |  中   | 1. 備援服務商<br>2. 熔斷機制<br>3. 本地快取                |
| 資料庫效能瓶頸     | 高   |  低   | 1. 讀寫分離<br>2. Connection Pool<br>3. Redis 快取         |
| 跨平台相容性問題   | 中   |  中   | 1. Expo EAS Build<br>2. 真機測試覆蓋<br>3. Polyfill 補丁   |

### 8.2 業務風險

| 風險                     | 影響 | 機率  | 應對策略                                                    |
| :----------------------- | :--- | :---: | :---------------------------------------------------------- |
| 合規性問題 (GDPR/隱私法) | 極高 |  中   | 1. 法律顧問審查<br>2. 資料加密與權限控管<br>3. 定期合規稽核 |
| 金流安全與糾紛           | 高   |  中   | 1. PCI DSS 認證<br>2. 交易紀錄完整<br>3. 爭議處理流程       |
| 使用者接受度低           | 中   |  中   | 1. MVP 快速迭代<br>2. 使用者訪談<br>3. 免費試用期           |

### 8.3 資源風險

| 風險         | 影響 | 機率  | 應對策略                                                     |
| :----------- | :--- | :---: | :----------------------------------------------------------- |
| 開發人力不足 | 高   |  中   | 1. 外包輔助開發<br>2. 優先級動態調整<br>3. 自動化工具        |
| 預算超支     | 中   |  中   | 1. 分階段控管<br>2. 開源方案優先<br>3. Cloud Cost Monitoring |
| 關鍵人員離職 | 高   |  低   | 1. 知識文檔化<br>2. Pair Programming<br>3. 備援培訓          |

---

## 9. 附錄

### 9.1 參考文檔

- [產品概述](./產品概述及使用場景說明/產品概述.md)
- [專案軟體架構與硬體架構選型建議書](./專案架構說明/專案軟體架構與硬體架構選型建議書.md)
- [資料庫架構設計書](./專案架構說明/資料庫架構設計書.md)
- [檔案命名規則與新增文件歸檔總則](./本專案檔案命名規則與新增文件歸檔總則.md)

### 9.2 專業詞彙對照表

| 中文     | 英文          | 說明              |
| :------- | :------------ | :---------------- |
| 房東     | Landlord      | 物件所有權人      |
| 仲介     | Agent         | 房地產仲介        |
| 租客     | Tenant        | 承租人            |
| 買方     | Buyer         | 購屋者            |
| 物件     | Property      | 不動產標的        |
| 謄本     | Transcript    | 土地/建物登記謄本 |
| 權狀     | Title Deed    | 所有權狀          |
| 斡旋金   | Earnest Money | 議價保證金        |
| 定金     | Deposit       | 簽約保證金        |
| 履約保證 | Escrow        | 價金履約擔保      |

### 9.3 縮寫對照表

| 縮寫 | 全名                             | 中文           |
| :--- | :------------------------------- | :------------- |
| FR   | Functional Requirement           | 功能需求       |
| NFR  | Non-Functional Requirement       | 非功能需求     |
| MVP  | Minimum Viable Product           | 最小可行產品   |
| CRM  | Customer Relationship Management | 客戶關係管理   |
| RLS  | Row Level Security               | 行級安全性     |
| RBAC | Role-Based Access Control        | 角色權限控管   |
| VLM  | Vision Language Model            | 視覺語言模型   |
| LLM  | Large Language Model             | 大型語言模型   |
| OCR  | Optical Character Recognition    | 光學字元識別   |
| ATO  | Australian Taxation Office       | 澳洲稅務局     |
| SUS  | System Usability Scale           | 系統易用性量表 |

---

## 版本修訂記錄

- **2026-01-22**: 初版發布，整合 FR/NFR 需求清單，補充技術方案與驗收標準
