# 物件廣告生成頁 Wireframe 與元件結構稿

日期：2026-03-30

適用頁面：superadmin/properties/[id]/edit?tab=advertisement_creators

## 頁面層級 Wireframe

```text
+----------------------------------------------------------------------------------+
| 物件廣告生成                                                                    |
| 可用內容 5/8 | 缺：格局圖、權狀連結、地圖座標 | [前往照片] [前往文件] [前往定位]   |
+----------------------------------------------------------------------------------+
| Step 1 選擇內容區塊                                                             |
| [x] 物件基本資料   [x] 物件介紹     [x] 物件照片     [-] 格局圖（尚未上傳）      |
| [ ] 謄本連結       [ ] 面積明細表   [-] 權狀連結     [-] Google 地圖（缺座標）   |
+----------------------------------------------------------------------------------+
| Step 2 選擇頁面風格                                                             |
| 模式: (o) 系統模板  ( ) 參考網址                                                |
| [豪宅暗色調] [清爽明亮] [商務簡潔] [溫馨日系]                                   |
| 或                                                                               |
| [ 參考網址輸入框 ...................................................... ] [套用] |
+----------------------------------------------------------------------------------+
| [ 生成廣告草稿 ]                                                                |
+----------------------------------------------------------------------------------+
| 預覽與微調                                                                      |
| +----------------------------------+ +----------------------------------------+ |
| | 左側：廣告預覽 iframe / mock    | | 右側：草稿設定                         | |
| |                                  | | 標題                                   | |
| | Hero / Gallery / Map / CTA       | | 摘要                                   | |
| |                                  | | 區塊排序                               | |
| |                                  | | 區塊顯示切換                           | |
| +----------------------------------+ | CTA 文案                                | |
|                                      | [儲存草稿] [重新生成]                   | |
|                                      +----------------------------------------+ |
+----------------------------------------------------------------------------------+
| 輸出方式                                                                        |
| [本站頁面] [Google Blogger] [下載 HTML]                                         |
| 依不同輸出方式顯示：發布、複製 HTML、下載檔案、查看公開連結                     |
+----------------------------------------------------------------------------------+
```

## 使用者操作順序

1. 看見資料完整度摘要。
2. 勾選要放進廣告的內容區塊。
3. 選擇模板模式與視覺風格。
4. 點擊生成廣告草稿。
5. 在右側微調內容，在左側即時預覽。
6. 選擇輸出方式並完成發布或下載。

## 元件結構建議

### 頁面容器

1. PropertyAdvertisementCreator
2. PropertyAdvertisementBuilder

職責：

1. 管理整體 builder state
2. 串接 property 資料、document 狀態、photo 狀態、map 狀態
3. 協調生成、預覽、輸出三段流程

### 資料摘要區

1. AdvertisementReadinessSummary
2. MissingAssetActions

職責：

1. 呈現可用內容數量
2. 顯示缺漏資產與 CTA
3. 不參與生成，只提供導引

### 內容選擇區

1. AdvertisementSectionSelector
2. AdvertisementSectionCard

建議 props：

1. sections
2. selectedSectionIds
3. onToggleSection
4. onJumpToFix

section shape 建議：

1. id
2. label
3. description
4. availabilityStatus
5. unavailableReason
6. fixTargetTab
7. recommended

### 風格選擇區

1. AdvertisementStyleModeSwitch
2. AdvertisementPresetGallery
3. AdvertisementReferenceUrlInput

建議 state：

1. styleMode: preset | reference
2. selectedPreset
3. referenceUrl
4. referenceUrlStatus

### 生成控制區

1. AdvertisementGenerateBar

職責：

1. 顯示主要 CTA
2. 顯示生成前檢查結果
3. 顯示生成中狀態與錯誤

### 預覽與微調區

1. AdvertisementDraftWorkspace
2. AdvertisementPreviewPane
3. AdvertisementSettingsPane
4. AdvertisementSectionOrderEditor
5. AdvertisementCtaEditor

建議 state：

1. draftId
2. title
3. excerpt
4. enabledSections
5. sectionOrder
6. contactCta
7. dirty

### 輸出區

1. AdvertisementExportOptions
2. AdvertisementSupabasePublishCard
3. AdvertisementBloggerPublishCard
4. AdvertisementHtmlDownloadCard

職責：

1. 將同一份草稿輸出到不同交付方式
2. 顯示每種輸出的狀態與操作
3. 避免直接暴露平台差異到生成階段

## 建議狀態切分

### Server 聚合資料

1. propertyCoreData
2. propertyDocuments
3. propertyPhotos
4. propertyMapData
5. propertyStructuredDetails
6. existingDrafts
7. exportStatuses

### Client Builder State

1. selectedSectionIds
2. styleMode
3. selectedPreset
4. referenceUrl
5. activeDraftId
6. exportTarget

### Derived State

1. readinessSummary
2. availableSections
3. recommendedSections
4. canGenerate
5. selectedContentPreview

## 與現有元件的重用建議

### 建議保留

1. BlogSupabasePanel 的部分預覽與編輯能力
2. BlogGooglePanel 的平台整合與發布能力
3. getPropertyBlogVariants / platform post 查詢能力

### 建議降級為次級區塊

1. 平台 selector
2. Blogger copy/paste controls
3. 每列 row action buttons

### 建議淘汰主導地位

1. 以表格為主的 style row 操作
2. 生成前即暴露平台差異
3. 下方 panel 作為主要工作區的模式

## 狀態遷移圖

```text
readiness_loaded
  -> selecting_sections
  -> selecting_style
  -> generating_draft
  -> draft_ready
  -> editing_draft
  -> exporting
  -> exported
```

## 實作拆分建議

1. 第一階段先建立新的 builder 外框與狀態模型，不動舊平台發布細節。
2. 第二階段將 Step 1 的可用性判斷抽到獨立 utility 或 server action。
3. 第三階段將 preview workspace 接到既有 blog draft 資料。
4. 第四階段把舊的 row actions 與 panel 邏輯收斂到 export 區。

## 風險提醒

1. 若後端仍強綁 targetPlatform 產生內容，前端流程雖重整，產品認知仍會分裂。
2. 若 disabled 項目沒有可修正入口，使用者仍會卡在資料準備階段。
3. 若 reference URL fallback 規則不清楚，會持續造成「為何生成結果不像我選的模板」的困惑。