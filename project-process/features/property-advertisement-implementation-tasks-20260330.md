# 物件廣告生成流程重構 Implementation Tasks

日期：2026-03-30

對應 Spec：/project-process/features/property-advertisement-workflow-redesign-20260330.md

對應 Wireframe：/project-process/features/property-advertisement-wireframe-20260330.md

適用頁面：superadmin/properties/[id]/edit?tab=advertisement_creators

## 目標

將現有以平台與 style variant 為中心的流程，重構為內容導向的 builder flow，讓使用者依序完成：

1. 資料可用性確認
2. 內容區塊選擇
3. 風格選擇
4. 生成草稿
5. 預覽微調
6. 多平台輸出

## 實作策略

採分階段重構，優先改 UI 資訊架構與狀態模型，再逐步整理資料聚合、草稿模型與平台輸出。

## Phase 1：Builder 外框與資訊架構

### 1.1 建立新頁面主容器

任務：

1. 建立 PropertyAdvertisementBuilder 作為新主容器。
2. 將現有 PropertyBlogGenerator 降級為舊流程 wrapper 或過渡層。
3. 將畫面拆為：摘要區、內容選擇區、風格區、生成區、預覽區、輸出區。

完成條件：

1. 舊有表格不再是主畫面第一視覺。
2. 新頁面有明確 step 區段。

影響檔案建議：

1. apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx
2. apps/superadmin/components/admin/properties/PropertyAdvertisementBuilder.tsx

### 1.2 建立資料完整度摘要元件

任務：

1. 建立 AdvertisementReadinessSummary 元件。
2. 顯示可用內容數量與缺漏內容列表。
3. 提供前往照片、文件、定位等 tab 的快捷入口。

完成條件：

1. 使用者一進頁面即可看見 8 個內容來源中的可用數量。
2. 缺漏項目可直接導回對應 tab。

影響檔案建議：

1. apps/superadmin/components/admin/properties/AdvertisementReadinessSummary.tsx

### 1.3 建立內容區塊選擇元件

任務：

1. 建立 AdvertisementSectionSelector。
2. 支援 8 個內容區塊多選。
3. 支援 recommended、available、unavailable 三種狀態。
4. disabled 狀態顯示原因與修正入口。

完成條件：

1. 可不可選只依賴原始資料狀態。
2. 預設勾選基本資料、照片、可用的物件介紹。

影響檔案建議：

1. apps/superadmin/components/admin/properties/AdvertisementSectionSelector.tsx
2. apps/superadmin/components/admin/properties/AdvertisementSectionCard.tsx

### 1.4 建立風格模式切換區

任務：

1. 建立 preset 與 reference URL 互斥模式切換。
2. 建立風格卡片 gallery。
3. 將參考網址輸入改為獨立模式，不再與 preset 同時有效。
4. 顯示 fallback 規則與抓取失敗提示。

完成條件：

1. UI 可清楚看出目前是模板模式或參考網址模式。
2. 不再出現 preset 與 reference URL 同時生效的模糊狀態。

影響檔案建議：

1. apps/superadmin/components/admin/properties/AdvertisementStyleModeSwitch.tsx
2. apps/superadmin/components/admin/properties/AdvertisementPresetGallery.tsx
3. apps/superadmin/components/admin/properties/AdvertisementReferenceUrlInput.tsx

## Phase 2：資料可用性聚合與選項判斷

### 2.1 建立內容可用性聚合器

任務：

1. 新增 server-side 或 pure utility 聚合器，輸出 8 個內容區塊狀態。
2. 整合 property details、documents、photos、座標、OCR 結果。
3. 統一 unavailable reason 與 fixTargetTab。

完成條件：

1. 前端不再自行散落判斷資料可用性。
2. 一個函式可回傳完整 readiness summary 與 sections metadata。

影響檔案建議：

1. apps/superadmin/lib/utils/property-advertisement-readiness.ts
2. apps/superadmin/lib/actions/blog.ts 或新的 advertisement action 檔

### 2.2 定義內容區塊型別

任務：

1. 定義 AdvertisementSectionId、AdvertisementSectionAvailability、AdvertisementSectionDefinition。
2. 建立 section config 常數檔。
3. 讓前端顯示文案與後端判斷使用同一套 id。

完成條件：

1. 不再在 UI 中硬編碼 section 名稱。
2. 後續新增區塊時只需增補 config。

影響檔案建議：

1. apps/superadmin/lib/types/advertisement.ts
2. apps/superadmin/lib/config/advertisement-sections.ts

## Phase 3：生成草稿與資料模型調整

### 3.1 定義 canonical draft 概念

任務：

1. 新增 canonical draft 的產品層模型。
2. 明確區分內容主版本與平台輸出版本。
3. 檢查是否沿用現有 blog_posts 即可，或需新增欄位／表。

完成條件：

1. 生成流程可以先建立主草稿，再衍生平台輸出。
2. 不再把 targetPlatform 當作唯一生成入口。

設計決策待確認：

1. 延用 blog_posts + metadata
2. 新增 advertisement_drafts / advertisement_exports

### 3.2 建立草稿生成 action

任務：

1. 新增 generatePropertyAdvertisementDraft action。
2. 輸入包含 selectedSections、styleMode、stylePreset、referenceUrl。
3. 生成 canonical HTML 與 metadata。
4. 儲存草稿狀態與最後生成參數。

完成條件：

1. 前端只需呼叫單一 generate draft action。
2. 不需在生成前決定輸出平台。

影響檔案建議：

1. apps/superadmin/lib/actions/blog.ts
2. apps/superadmin/lib/actions/advertisement.ts

### 3.3 建立草稿設定更新 action

任務：

1. 建立 updatePropertyAdvertisementDraft action。
2. 支援更新標題、摘要、區塊顯示、區塊排序、CTA 文案。
3. 為預覽區提供可儲存的微調機制。

完成條件：

1. 使用者不需重新生成也可調整輸出結果。
2. 預覽區的右側設定能儲存並反映到左側預覽。

## Phase 4：預覽工作區

### 4.1 建立預覽工作區容器

任務：

1. 建立 AdvertisementDraftWorkspace。
2. 左側顯示 iframe 或 preview HTML。
3. 右側顯示設定面板。

完成條件：

1. 生成後立即切換至 preview/edit 模式。
2. 不需透過下方 panel 與列按鈕跳轉操作。

影響檔案建議：

1. apps/superadmin/components/admin/properties/AdvertisementDraftWorkspace.tsx
2. apps/superadmin/components/admin/properties/AdvertisementPreviewPane.tsx
3. apps/superadmin/components/admin/properties/AdvertisementSettingsPane.tsx

### 4.2 支援區塊排序與開關

任務：

1. 在設定區支援各 section 顯示開關。
2. 支援 drag-and-drop 或簡化版上下移動排序。
3. 將排序與 enabled state 寫回草稿。

完成條件：

1. 使用者能在不重新生成的情況下重排內容。

## Phase 5：輸出流程重整

### 5.1 建立輸出方式區塊

任務：

1. 將平台 selector 改成 export cards。
2. 顯示本站頁面、Google Blogger、下載 HTML 三種輸出方式。
3. 每種輸出卡片僅在草稿存在後顯示可操作狀態。

完成條件：

1. 平台概念從生成前移到生成後。
2. 使用者在同一份草稿基礎上做多種輸出。

影響檔案建議：

1. apps/superadmin/components/admin/properties/AdvertisementExportOptions.tsx
2. apps/superadmin/components/admin/properties/AdvertisementSupabasePublishCard.tsx
3. apps/superadmin/components/admin/properties/AdvertisementBloggerPublishCard.tsx
4. apps/superadmin/components/admin/properties/AdvertisementHtmlDownloadCard.tsx

### 5.2 收斂既有平台 panel

任務：

1. 將 BlogSupabasePanel 與 BlogGooglePanel 改為 export-specific 面板。
2. 移除它們在主流程中的主導地位。
3. 保留既有發布、同步、刪除等整合能力。

完成條件：

1. 既有平台能力仍可用。
2. 但不再主導主畫面資訊架構。

## Phase 6：清理舊流程

### 6.1 移除 style row action 為主體的操作模式

任務：

1. 降級或移除 PropertyBlogStyleRowActionCells 在主流程中的角色。
2. 取消「每列重生」作為主入口。
3. 若需保留，僅作為進階維護工具，不作為預設 UI。

完成條件：

1. 主畫面只剩一個生成主要 CTA。

### 6.2 清理 URL query 狀態

任務：

1. 檢視既有 blogPlatform、blogStylePreset、blogReferenceUrl query 的必要性。
2. 規劃新 builder state 的 URL persistence 策略。
3. 若保留 query，需對應新流程語意。

完成條件：

1. 重新整理後的狀態還原符合新流程，而非舊 variant 流程。

## 測試任務

### 單元測試

1. property-advertisement-readiness utility 測試
2. section availability mapping 測試
3. style mode switch 與 fallback 規則測試
4. generatePropertyAdvertisementDraft action 測試
5. updatePropertyAdvertisementDraft action 測試

### 元件測試

1. AdvertisementReadinessSummary 顯示缺漏項目與 CTA
2. AdvertisementSectionSelector disabled reason 與預設勾選
3. AdvertisementPresetGallery 單選互斥
4. AdvertisementReferenceUrlInput 套用與清除
5. AdvertisementDraftWorkspace 生成後預覽切換
6. AdvertisementExportOptions 依草稿狀態顯示可操作項目

### E2E 測試

1. 載入物件頁後顯示可用內容摘要
2. 勾選內容 + 選模板 + 生成草稿
3. 調整標題與區塊開關後預覽更新
4. 從同一草稿輸出本站頁面
5. 從同一草稿輸出 Google Blogger
6. 下載 HTML 成功
7. 重新整理後保留 builder state 或至少可還原 draft

## 建議實作順序

1. 先完成 Phase 1 與 Phase 2，讓畫面與內容判斷正確。
2. 再做 Phase 4，先有新預覽工作區。
3. 接著做 Phase 3，將生成 action 對齊新流程。
4. 最後做 Phase 5 與 Phase 6，整理平台輸出與舊流程退場。

## 預估拆工單位

1. UI 外框與 step flow：1 至 2 個工作日
2. readiness 聚合與 section config：1 個工作日
3. 草稿模型與 action 調整：2 至 3 個工作日
4. 預覽與微調工作區：1 至 2 個工作日
5. 輸出流程收斂：1 至 2 個工作日
6. 測試補齊：1 至 2 個工作日

總計：7 至 12 個工作日，依資料模型是否需 migration 而浮動。

## Blockers 與待決策

1. canonical draft 是否新增資料表，或沿用現有 blog_posts。
2. Facebook 粉絲頁是否納入首版輸出區，或先暫停顯示。
3. HTML 下載是否需要版本追蹤與下載紀錄。
4. 舊 query state 是否全面遷移，或提供相容層。

## 建議第一張工單

工單名稱：重構物件廣告生成頁資訊架構為內容導向 Builder

範圍：

1. 新增 Builder 外框
2. 接入 ReadinessSummary
3. 接入 SectionSelector
4. 接入 StyleModeSwitch
5. 先以 mock generate CTA 串起流程

驗收：

1. 使用者一進頁面可看到資料摘要
2. 可完成內容選擇與風格選擇
3. 舊表格不再作為主畫面主體