# 專案專業詞彙說明書 / Project Glossary

> **唯一事實來源 (Single Source of Truth)**
> 本文件為跨文化、跨語言工程師的詞彙參照基準。
> 新增術語請以 Pull Request 提交，並更新對應的英文欄與說明欄。
>
> This document is the canonical reference for all domain and technical terms used in this project.
> To add a new term, submit a Pull Request and fill in all columns.

---

## 目錄 / Table of Contents

1. [系統角色 System Roles](#1-系統角色-system-roles)
2. [房地產業務 Real Estate Business](#2-房地產業務-real-estate-business)
3. [物件屬性 Property Attributes](#3-物件屬性-property-attributes)
4. [財務與交易 Finance &amp; Transactions](#4-財務與交易-finance--transactions)
5. [系統架構 System Architecture](#5-系統架構-system-architecture)
6. [資料庫與後端 Database &amp; Backend](#6-資料庫與後端-database--backend)
7. [AI 功能 AI Features](#7-ai-功能-ai-features)
8. [測試與品質保證 Testing &amp; QA](#8-測試與品質保證-testing--qa)
9. [開發流程 Development Workflow](#9-開發流程-development-workflow)
10. [UI / UX 元件 UI / UX Components](#10-ui--ux-元件-ui--ux-components)

---

## 1. 系統角色 System Roles

| 繁體中文       | English           | 程式碼識別字          | 說明                                                                                        |
| :------------- | :---------------- | :-------------------- | :------------------------------------------------------------------------------------------ |
| 超級管理員     | Super Admin       | `super_admin`       | 系統最高權限角色，可繞過所有 RLS，管理 IAM、AI 設定、資料庫等；在 `apps/superadmin/` 操作 |
| 房東           | Landlord          | `landlord`          | 擁有物件並委託平台管理的業主；可新增/編輯物件、查看財務、管理租客                           |
| 租客（潛在）   | Potential Tenant  | `tenant_potential`  | 已註冊，正在尋找租屋、尚未簽約的租客，可以管理自己的我的最愛                                |
| 租客（已簽約） | Contracted Tenant | `tenant_contracted` | 已與房東簽署租賃合約的租客                                                                  |
| 買家（潛在）   | Potential Buyer   | `buyer_potential`   | 已註冊，正在尋找購屋標的、尚未簽約的買家                                                    |
| 買家（已簽約） | Contracted Buyer  | `buyer_contracted`  | 已簽署買賣契約的買家                                                                        |
| 仲介           | Agent             | `agent`             | 協助媒合房東與買/租客的房仲人員                                                             |
| 服務供應商     | Service Provider  | `service_provider`  | 維修、清潔等物業服務廠商                                                                    |
| 訪客           | Guest / Public    | —（未登入）          | 未登入註冊的使用者，僅可瀏覽公開頁面                                                        |

---

## 2. 房地產業務 Real Estate Business

| 繁體中文   | English                           | 程式碼 / DB 欄位                               | 說明                                                   |
| :--------- | :-------------------------------- | :--------------------------------------------- | :----------------------------------------------------- |
| 物件       | Property / Listing                | `property_sales`, `property_rentals`       | 出售或出租的不動產標的                                 |
| 出售物件   | Sale Property                     | `property_sales`                             | 以買賣為目的的物件；價格單位「萬元（新台幣）」         |
| 出租物件   | Rental Property                   | `property_rentals`                           | 以租賃為目的的物件；價格單位「月租（新台幣）」         |
| 委託       | Listing Commission / Mandate      | `contract_category`                          | 房東授權仲介或平台代為銷售/出租的委託關係              |
| 專任委託   | Exclusive Listing                 | —                                             | 委託單一仲介；期間不得另行委託他人                     |
| 一般委託   | Open Listing                      | —                                             | 可同時委託多家仲介                                     |
| 謄本       | Land/Building Registry Transcript | `transcript_case_number`                     | 地政事務所核發的土地或建物登記謄本，是所有權的法定憑證 |
| 地號       | Land Lot Number                   | `land_number`                                | 地政系統中唯一識別一筆土地的編號                       |
| 建號       | Building Number                   | `building_number`                            | 地政系統中唯一識別一棟建物的編號                       |
| 所有權人   | Owner                             | `owner_name`                                 | 謄本上登記的合法所有權人                               |
| 共有人     | Co-owner                          | —                                             | 同一不動產持有部分持分的其他所有權人                   |
| 持分       | Ownership Share                   | —                                             | 共有不動產中各所有權人所佔的比例                       |
| 租賃合約   | Lease Agreement                   | `leases` (table)                             | 房東與租客簽訂的租屋契約，記錄租期、租金、押金等       |
| 買賣契約   | Sale and Purchase Agreement (SPA) | —                                             | 房東（賣方）與買家（買方）簽訂的不動產買賣合約         |
| 租期       | Lease Term                        | `lease_start_date`, `lease_end_date`       | 租賃合約的起始日至終止日                               |
| 押金       | Deposit / Security Deposit        | `deposit_amount`                             | 擔保用。主要用於租賃（如租房、租車）或提供服務（如住院、借用設備），擔保契約履行或標的物損壞賠償。契約期滿或服務結束後，若無應賠償事由（如物品損壞、欠費），須全額無息返還；若債務人違約，債權人可自押金扣抵損失。 |
| 定金       | Earnest Money / Deposit           | —                                             | 確保契約成立。依民法為確保契約（尤其買賣）履行而交付之金額，具強法律效力，為契約成立之證明。適用定金罰則：付定金方違約（不買）不得請求返還；收定金方違約（不賣）須加倍返還。 |
| 訂金       | Booking Fee / Reservation Fee     | —                                             | 預付款。日常交易（如訂餐廳、訂房、預購）中表示有意購買而先付之部分款項，法律上屬價金之一部分。不具定金之強約束力；原則上交易取消時應返還，若有手續費或損失，賣方得主張扣除。 |
| 斡旋金     | Negotiation Deposit / Earnest Money| —                                             | 議價誠意金。主要用於不動產買賣，買方委託仲介向賣方議價時所支付；若賣方同意出價，通常轉為定金。議價成功則轉定金、適用定金罰則；議價失敗則仲介須全額無息返還；通常有斡旋期間限制。 |
| 帶看       | Property Viewing / Showing        | `viewings`                                   | 仲介或房東帶領潛在買/租客實地參觀物件的行程            |
| 看屋預約   | Viewing Appointment               | `appointments`                               | 帶看行程的預約紀錄                                     |
| 議價       | Price Negotiation                 | —                                             | 買賣雙方就成交價格進行協商的過程                       |
| 成交       | Closing / Transaction Closed      | `status = 'sold'` / `'rented'`             | 買賣或租賃合約正式簽訂、交易完成                       |
| 委託到期日 | Contract Expiry Date              | `contract_expiry_date`                       | 委託合約的效力終止日期                                 |
| 業務區     | Business Area                     | `business_area_code`, `business_area_name` | 仲介公司自行劃分的銷售管轄區域                         |
| 社區       | Community / Complex               | `community_code`, `community_name`         | 物件所屬的住宅社區或大樓名稱                           |
| 分店       | Branch                            | `branch_code`                                | 仲介公司的分店或據點                                   |

---

## 3. 物件屬性 Property Attributes

| 繁體中文   | English                 | 程式碼 / DB 欄位                                                                      | 說明                                             |
| :--------- | :---------------------- | :------------------------------------------------------------------------------------ | :----------------------------------------------- |
| 建物類型   | Building Type           | `building_type`                                                                     | 例：住宅大樓、公寓、透天、別墅、店面             |
| 用途       | Building Purpose        | `building_purpose`                                                                  | 例：住宅用、商業用、工業用                       |
| 屋齡       | Building Age (years)    | `building_age_years`                                                                | 建物從完工日起算的年數                           |
| 完工日期   | Completion Date         | `completion_date_raw`                                                               | 建物竣工的原始文字記錄（可能為民國年）           |
| 朝向       | Orientation / Facing    | `orientation`                                                                       | 主要採光面方向，例：南、東南、南北通             |
| 邊間       | Corner Unit             | `is_corner_unit`                                                                    | 位於建築物角落、兩面採光的單位                   |
| 總坪數     | Total Area (坪)         | `area_registered`                                                                   | 地政登記的建物全部面積（1坪 ≈ 3.3058㎡）        |
| 使用坪數   | Usable Area             | `area_usable`                                                                       | 扣除公設後實際可使用的室內面積                   |
| 主建物     | Main Building Area      | `area_main_building`                                                                | 產權登記中的主體建物面積                         |
| 附屬建物   | Auxiliary Building Area | `area_auxiliary`                                                                    | 陽台、雨遮等附屬於主建物的面積                   |
| 公設比     | Common Area Ratio       | —                                                                                    | 公共設施面積佔總坪數的比例                       |
| 公設坪數   | Common Area             | `area_common`                                                                       | 電梯、走廊、大廳等公共設施分攤的面積             |
| 地坪       | Land Area               | `area_land`                                                                         | 土地的登記面積（坪）                             |
| 停車位坪數 | Parking Area            | `area_parking`                                                                      | 停車位所佔的面積                                 |
| 樓層       | Floor                   | `floor_min`, `floor_max`                                                          | 物件所在樓層；範圍型（如 5F–7F）以 min/max 表示 |
| 總樓層     | Total Floors            | `total_floors`                                                                      | 建物地面層以上的總樓層數                         |
| 地下層數   | Basement Floors         | `basement_floors`                                                                   | 建物地下樓層數                                   |
| 格局       | Floor Plan / Layout     | `layout_rooms`, `layout_living_rooms`, `layout_bathrooms`, `layout_balconies` | 房/廳/衛/陽台的數量配置，例：3房2廳2衛           |
| 停車位     | Parking Space           | `has_parking`, `parking_type`, `parking_number`                                 | 停車位的有無、類型（坡道式/機械式/平面式）及編號 |
| 車位權屬   | Parking Ownership       | `parking_ownership`                                                                 | 停車位的產權登記方式，例：專用、共用、無權狀     |
| 附近學區   | Nearby School District  | `nearby_junior_high`, `nearby_elementary`                                         | 最近的國中、國小名稱（影響購屋決策）             |
| 附近捷運   | Nearby MRT Station      | `nearby_mrt`                                                                        | 最近的捷運站名稱                                 |
| 附近公園   | Nearby Park             | `nearby_park`                                                                       | 最近的公園名稱                                   |
| 360° VR   | Virtual Reality Tour    | `vr_720_url`                                                                        | 720° 全景虛擬導覽的連結網址                     |
| 物件來源   | Property Source         | `property_source`                                                                   | 物件取得管道，例：自行開發、買方介紹、廣告來電   |

---

## 4. 財務與交易 Finance & Transactions

| 繁體中文     | English                       | 程式碼 / DB 欄位              | 說明                                                               |
| :----------- | :---------------------------- | :---------------------------- | :----------------------------------------------------------------- |
| 售價         | Asking Price / List Price     | `price`                     | 房東委託的掛牌出售金額（萬元）                                     |
| 底價         | Reserve Price / Floor Price   | `agent_price`               | 房東告知仲介的最低可接受成交價，不對外公開                         |
| 單價（登記） | Unit Price (Registered Area)  | `unit_price_registered`     | 每坪登記坪數的單價（萬元/坪）                                      |
| 單價（使用） | Unit Price (Usable Area)      | `unit_price_usable`         | 每坪使用坪數的單價（萬元/坪）                                      |
| 頭期款       | Down Payment                  | `down_payment`              | 買家自備款，即購屋總價扣除貸款後需自籌的金額                       |
| 貸款餘額     | Outstanding Mortgage          | `current_mortgage_amount`   | 賣方仍有的現有貸款尚未還清金額                                     |
| 代書費       | Notary / Legal Processing Fee | —                            | 辦理產權移轉所需的代書（地政士）服務費                             |
| 仲介費       | Brokerage Commission          | —                            | 成交後支付給仲介的服務報酬，通常為成交價的一定比例                 |
| 租金         | Rent                          | `price` (rentals)           | 租客每月應支付的租賃費用（新台幣）                                 |
| 含稅租金     | Rent Including Tax            | `rent_includes_tax`         | 租金是否已含業主稅額（5% 房屋稅等）                                |
| 押金月數     | Deposit Months                | `rental_deposit_months`     | 押金相當於幾個月租金，台灣常見為 2 個月                            |
| 信託帳戶     | Escrow Account                | `escrow_account` (resource) | 不動產交易中由第三方（通常是銀行）管理的中介帳戶，確保款項安全移轉 |

---

## 5. 系統架構 System Architecture

| 繁體中文      | English                       | 路徑 / 識別字         | 說明                                                                                   |
| :------------ | :---------------------------- | :-------------------- | :------------------------------------------------------------------------------------- |
| 單頁應用程式  | Single Page Application (SPA) | —                    | 前端以 JavaScript 動態更新頁面而無需整頁重載的應用架構                                 |
| 單一倉庫      | Monorepo                      | `/` (根目錄)        | 多個相關應用程式放在同一個 Git 儲存庫中管理                                            |
| 前台 Web 應用 | Web App (Frontend)            | `apps/web/`         | 房東、租客、買家使用的主要前台，Port 3000                                              |
| 後台管理介面  | Superadmin Dashboard          | `apps/superadmin/`  | 超級管理員專用的後台管理介面，Port 3001                                                |
| 共用套件      | Shared Package                | `packages/`         | 跨應用共用的型別、元件、工具函式                                                       |
| 伺服器元件    | Server Component              | —                    | Next.js 預設，在伺服器端渲染、可直接存取資料庫，不可含瀏覽器事件處理                   |
| 客戶端元件    | Client Component              | `'use client'`      | 需要互動（如 useState、onClick）的前端元件，須加 `'use client'` 宣告                 |
| 伺服器動作    | Server Action                 | `'use server'`      | Next.js 在伺服器端執行的異步函式，用於資料變更（mutation）；以 `actions.ts` 集中管理 |
| 應用路由      | App Router                    | `app/` 目錄         | Next.js 15 基於檔案系統的路由架構（取代 Pages Router）                                 |
| 中介層        | Middleware                    | `middleware.ts`     | Next.js 請求進入頁面前的攔截處理，用於驗證、角色守衛、IP 黑名單等                      |
| 角色守衛      | Route Role Guard              | `ROUTE_ROLE_GUARDS` | Middleware 中定義路由與允許角色的對應表，未授權角色將被重導向                          |
| 入口頁        | Portal                        | `app/portal/`       | 登入後依角色跳轉的中繼頁面，每個角色有獨立的 portal 子頁                               |
| 入職流程      | Onboarding                    | `app/onboarding/`   | 新用戶首次登入後設定角色的引導流程                                                     |
| 環境變數      | Environment Variable          | `.env.local`        | 應用程式設定值（API 金鑰、資料庫 URL 等），不得提交至版本控制                          |

---

## 6. 資料庫與後端 Database & Backend

| 繁體中文           | English                              | 路徑 / 識別字                               | 說明                                                                                         |
| :----------------- | :----------------------------------- | :------------------------------------------ | :------------------------------------------------------------------------------------------- |
| Supabase           | Supabase                             | —                                          | 本專案使用的 Backend-as-a-Service (BaaS)，提供 PostgreSQL、Auth、Storage、Realtime 等功能    |
| 資料庫遷移         | Migration                            | `supabase/migrations/`                    | 以 SQL 檔案描述 schema 變更的版本化腳本；命名格式 `YYYYMMDDHHmmss_描述.sql`                |
| 列級安全           | Row Level Security (RLS)             | `ENABLE ROW LEVEL SECURITY`               | PostgreSQL 的安全機制，依使用者身份決定哪些資料列可被存取                                    |
| RLS 政策           | RLS Policy                           | `CREATE POLICY`                           | 定義 RLS 存取規則的具體描述（SELECT / INSERT / UPDATE / DELETE）                             |
| 服務角色           | Service Role                         | `service_role` key                        | Supabase 後端專用金鑰，可繞過 RLS；僅限 `createAdminClient` 使用，**絕不暴露於前端** |
| 管理客戶端         | Admin Client                         | `createAdminClient`                       | 使用 `service_role` 的 Supabase 客戶端，用於 Superadmin 操作                               |
| 身份識別與存取管理 | Identity and Access Management (IAM) | `iam_roles`, `iam_role_permissions`     | 管理系統角色、資源與操作權限的機制                                                           |
| 存取矩陣           | Access Matrix                        | —                                          | 以角色 × 資源 × 操作 (CRUD) 構成的二維權限對照表                                           |
| 遠端程序呼叫       | Remote Procedure Call (RPC)          | `supabase.rpc(...)`                       | 直接呼叫 Supabase/PostgreSQL 中定義的 Function 的方式                                        |
| 儲存桶             | Storage Bucket                       | `property-photos`, `property-documents` | Supabase Storage 中用於儲存檔案的命名空間                                                    |
| 型別產生           | Type Generation                      | `supabase gen types typescript`           | 從 Supabase schema 自動產生 TypeScript 型別定義，輸出至 `packages/types/database.ts`       |
| 結構化位址         | Structured Address                   | `structured_address` (jsonb)              | 將地址拆解為縣市、行政區、路段、門號等欄位的 JSON 物件                                       |
| 黑名單             | Blacklist                            | `check_superadmin_blacklist` (RPC)        | Superadmin Middleware 執行的 IP 封鎖檢查                                                     |

---

## 7. AI 功能 AI Features

| 繁體中文        | English                             | 程式碼 / 模組                           | 說明                                                                         |
| :-------------- | :---------------------------------- | :-------------------------------------- | :--------------------------------------------------------------------------- |
| 大型語言模型    | Large Language Model (LLM)          | —                                      | 以大規模文字資料訓練的 AI 模型，可理解與生成自然語言                         |
| 視覺語言模型    | Vision Language Model (VLM)         | —                                      | 同時具備影像理解與語言生成能力的多模態 AI 模型                               |
| 光學字元辨識    | Optical Character Recognition (OCR) | OCR module                              | 從圖片或 PDF 中提取文字內容的技術；本專案用於辨識謄本、房屋照片等            |
| OCR 解析結果    | OCR Parse Result                    | `ocr_parse_results` (table)           | 儲存 OCR 模型對物件文件的辨識與結構化輸出                                    |
| AI 模型評估     | Model Evaluation                    | `ModelEvaluator` component            | 在 Superadmin 中對多個 LLM/VLM API 金鑰與模型進行批次效能測試的介面          |
| API 金鑰        | API Key                             | `ai_api_keys` (table)                 | 呼叫第三方 AI 服務（OpenAI、Anthropic、Google 等）的驗證金鑰                 |
| 模型供應商      | AI Provider                         | `provider` field                      | AI 模型的服務提供商，例：`anthropic`、`openai`、`google`、`together` |
| AI 設定頁       | AI Settings Page                    | `settings/api_key_and_model_setting/` | Superadmin 管理 AI API 金鑰、模型選擇與各模組提示詞的設定頁面                |
| 靜態廣告生成    | Static Ad Generation                | Static AD module                        | 使用 AI 自動生成物件的行銷廣告文案                                           |
| 合約生成        | Contract Generation                 | Contract module                         | 使用 AI 輔助生成租賃或買賣合約草稿                                           |
| 部落格生成      | Blog Generation                     | Blog module                             | 使用 AI 自動產生物件介紹或市場資訊的部落格文章                               |
| 提示詞          | Prompt                              | `aiPrompt`, `prompts` (DB)          | 傳遞給 AI 模型的指令文字，用於引導模型產生特定格式或內容的輸出               |
| 共識謄本解析    | Consensus Transcript Parsing        | —                                      | 多個 AI 模型對同一份謄本各自辨識後，取交集或多數決產生最終結果的機制         |
| AI 金鑰驗證快取 | AI Key Validation Cache             | `ai_key_validation_cache` (table)     | 快取 AI API 金鑰的有效性檢查結果，避免重複對外呼叫                           |
| 顯示狀態覆寫    | Display Status Override             | `display_status_override`             | 允許手動覆蓋 AI 模型評估結果顯示狀態的欄位                                   |

---

## 8. 測試與品質保證 Testing & QA

| 繁體中文       | English                       | 路徑 / 工具                | 說明                                                      |
| :------------- | :---------------------------- | :------------------------- | :-------------------------------------------------------- |
| 單元測試       | Unit Test                     | `__tests__/*.test.tsx`   | 測試單一函式或元件的隔離行為；使用 Jest + Testing Library |
| 端對端測試     | End-to-End Test (E2E)         | `e2e/flows/**/*.spec.ts` | 模擬真實使用者操作完整流程的測試；使用 Playwright         |
| 測試驅動開發   | Test-Driven Development (TDD) | —                         | 先寫測試、再寫實作的開發方法論；本專案要求 80%+ 覆蓋率    |
| 測試覆蓋率     | Test Coverage                 | `testCoverage`           | 被測試覆蓋的程式碼比例（%）                               |
| 單元測試覆蓋率 | Unit Test Coverage            | `unitTestCoverage`       | 單元測試覆蓋的程式碼比例                                  |
| E2E 測試覆蓋率 | E2E Test Coverage             | `e2eTestCoverage`        | E2E 測試覆蓋的功能流程比例                                |
| 缺陷數量       | Defect Count                  | `defectCount`            | 測試階段發現的未修復 Bug 數量                             |
| 測試狀態       | Test Status                   | `testStatus`             | `pending` / `in_progress` / `passed` / `failed`   |
| 驗收標準       | Acceptance Criteria           | `acceptanceCriteria`     | 定義功能「完成」的可驗證條件列表                          |

---

## 9. 開發流程 Development Workflow

| 繁體中文       | English                 | 路徑 / 識別字                           | 說明                                                                                                                      |
| :------------- | :---------------------- | :-------------------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| 功能開發週期   | Feature Lifecycle Phase | `phase` field                         | 功能從開發到上線的四個階段：`development` → `testing` → `deployment` → `operations`                            |
| 路線圖         | Roadmap                 | `apps/superadmin/app/data/roadmap.ts` | 紀錄所有功能的開發進度、測試狀態與部署資訊的資料來源                                                                      |
| 開發日誌       | Dev Log                 | `project-process/dev-logs/`           | 記錄每次開發工作細節與決策的文件                                                                                          |
| 功能規格書     | Feature Spec            | `project-process/features/`           | 描述功能需求、使用情境與驗收標準的規格文件                                                                                |
| TDD 規格書     | TDD Spec                | `tddSpecDocPath`                      | 描述測試案例設計的文件，在實作前撰寫                                                                                      |
| 提交訊息       | Commit Message          | —                                      | Git commit 的說明文字；格式：`<type>: <description>`，type 可為 `feat / fix / docs / refactor / style / test / chore` |
| 部署狀態       | Deploy Status           | `deployStatus`                        | `not_deployed` / `staging` / `production` / `rollback`                                                            |
| 部署環境       | Deployment Environment  | `deployEnv`                           | 部署的目標環境，例：`local`、`staging`、`production`                                                                |
| 上線時間百分比 | Uptime Percent          | `uptimePercent`                       | 服務在特定時間段內可正常運作的時間比例（%）                                                                               |
| 錯誤率         | Error Rate              | `errorRate`                           | 請求中發生錯誤的比例（%）                                                                                                 |
| 平均回應時間   | Average Response Time   | `avgResponseTime`                     | API 或頁面回應請求的平均時間（ms）                                                                                        |

---

## 10. UI / UX 元件 UI / UX Components

| 繁體中文     | English                     | 程式碼 / 路徑                                    | 說明                                                                                                 |
| :----------- | :-------------------------- | :----------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| 徽章         | Badge                       | `<Badge variant="...">`                        | 顯示狀態標籤的小型元件；合法 variant：`default` / `success` / `warning` / `error` / `info` |
| 側邊欄       | Sidebar                     | `components/layout/Sidebar.tsx`                | Superadmin 後台的主要導覽列；新增頁面需同步更新 `navItems` 陣列                                    |
| 抽屜         | Sheet / Drawer              | `components/ui/Sheet.tsx`                      | 從螢幕邊緣滑入的浮動面板；使用 `ReactDOM.createPortal` 掛載至 `document.body` 以避免堆疊層問題   |
| 響應式設計   | Responsive Web Design (RWD) | Tailwind breakpoints                             | 頁面自動適應不同螢幕尺寸的設計方式                                                                   |
| 設計系統     | Design System               | `docs/design-guidelines/`                      | 本專案的統一視覺規範，包含顏色、間距、排版等                                                         |
| CSS 設計令牌 | CSS Design Token            | `text-text-primary`, `bg-bg-secondary`, etc. | 以語意命名的 CSS 變數，取代直接使用 Tailwind 顏色值                                                  |
| 強調色       | Accent Color                | `text-accent`, `bg-accent`                   | 專案主題強調色的 CSS token                                                                           |

---

> **維護說明 Maintenance Notes**
>
> - 每當資料庫新增重要欄位或系統新增角色，請同步更新本文件對應章節
> - 若中英文譯名有爭議，以本文件為準，並在文件內說明原因
> - 本文件路徑：`docs/glossary.md`
> - Last updated: 2026-03-05 by Claude Sonnet 4.6
