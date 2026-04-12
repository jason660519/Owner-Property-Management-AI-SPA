# 物件廣告生成流程重構 開發順序與檔案修改清單

日期：2026-03-30

對應 Spec：/project-process/features/property-advertisement-workflow-redesign-20260330.md

對應 Wireframe：/project-process/features/property-advertisement-wireframe-20260330.md

對應 Tasks：/project-process/features/property-advertisement-implementation-tasks-20260330.md

適用頁面：superadmin/properties/[id]/edit?tab=advertisement_creators

## 開發原則

1. 先改資訊架構，再改資料模型。
2. 第一階段保留既有 blog variant / publish 能力，避免一次重寫過多層。
3. 每一票都要可獨立驗證，不依賴下一票才成立。
4. Phase 1 以前端骨架與互動路徑穩定為主，不先動 DB schema。

## 建議實作順序

### Ticket 1：Builder 骨架接管主畫面

目標：讓使用者一進 tab 就看到內容導向流程，而不是平台表格。

修改檔案：

1. apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx
2. apps/superadmin/components/admin/properties/PropertyAdvertisementBuilder.tsx
3. apps/superadmin/components/admin/properties/__tests__/PropertyBlogGenerator.test.tsx

內容：

1. 建立 step-based shell。
2. 保留現有 style table / reference URL / platform panels，但放入新 section 之下。
3. 新增 builder intro、step headers、generate area placeholder、export area framing。
4. 不變更既有 query restore/sync 邏輯。

完成判定：

1. 主畫面第一視覺改為 builder。
2. 既有測試與 query 行為不回歸。

### Ticket 2：Readiness summary 與內容區塊卡片

目標：把「可用什麼內容」明確顯示出來。

修改檔案：

1. apps/superadmin/components/admin/properties/AdvertisementReadinessSummary.tsx
2. apps/superadmin/components/admin/properties/AdvertisementSectionSelector.tsx
3. apps/superadmin/components/admin/properties/AdvertisementSectionCard.tsx
4. apps/superadmin/lib/types/advertisement.ts
5. apps/superadmin/lib/config/advertisement-sections.ts
6. apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx
7. apps/superadmin/components/admin/properties/__tests__/PropertyBlogGenerator.test.tsx

內容：

1. 先以前端假資料或暫時 mapping 接線，穩定 UI 狀態。
2. 支援 available / unavailable / recommended。
3. 先把 fixTargetTab 做成 link callback 或 badge，不必馬上串完整導頁。

完成判定：

1. 內容選擇 UI 可操作。
2. unavailable 原因與建議修正方向可見。

### Ticket 3：Readiness aggregator 與 section config 正式化

目標：把資料可用性判斷從 UI 抽離。

修改檔案：

1. apps/superadmin/lib/utils/property-advertisement-readiness.ts
2. apps/superadmin/lib/types/advertisement.ts
3. apps/superadmin/lib/config/advertisement-sections.ts
4. apps/superadmin/lib/actions/blog.ts 或新建 apps/superadmin/lib/actions/advertisement.ts
5. apps/superadmin/components/admin/properties/PropertyEditForm.tsx
6. apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx
7. 對應 unit tests

內容：

1. 統一輸出 readiness summary + sections metadata。
2. 讓 builder 不再硬編碼可用性規則。

### Ticket 4：Style mode 正式互斥化

目標：消除 preset 與 reference URL 同時有效的模糊狀態。

修改檔案：

1. apps/superadmin/components/admin/properties/AdvertisementStyleModeSwitch.tsx
2. apps/superadmin/components/admin/properties/AdvertisementPresetGallery.tsx
3. apps/superadmin/components/admin/properties/AdvertisementReferenceUrlInput.tsx
4. apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx
5. apps/superadmin/components/admin/properties/__tests__/PropertyBlogGenerator.test.tsx
6. apps/superadmin/e2e/common/regression/property-blog-query-sync.spec.ts

內容：

1. 建立 styleMode state。
2. Preset 與 reference URL 切換時互相清除。
3. 保留 URL query，但語意改為 builder mode。

### Ticket 5：Canonical draft generate action

目標：把生成入口從平台導向改成 draft 導向。

修改檔案：

1. apps/superadmin/lib/actions/advertisement.ts
2. apps/superadmin/lib/actions/blog.ts
3. apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx
4. apps/superadmin/components/admin/properties/AdvertisementDraftWorkspace.tsx
5. 對應 unit tests / integration tests
6. 視情況新增 migration

內容：

1. 新增 generate draft action。
2. 儲存 selectedSections / style params / canonical HTML。
3. 先不全面替換 publish card。

### Ticket 6：Preview workspace + export cards

目標：生成後可在同一畫面預覽與輸出。

修改檔案：

1. apps/superadmin/components/admin/properties/AdvertisementDraftWorkspace.tsx
2. apps/superadmin/components/admin/properties/AdvertisementPreviewPane.tsx
3. apps/superadmin/components/admin/properties/AdvertisementSettingsPane.tsx
4. apps/superadmin/components/admin/properties/AdvertisementExportOptions.tsx
5. apps/superadmin/components/admin/properties/AdvertisementSupabasePublishCard.tsx
6. apps/superadmin/components/admin/properties/AdvertisementBloggerPublishCard.tsx
7. apps/superadmin/components/admin/properties/BlogSupabasePanel.tsx
8. apps/superadmin/components/admin/properties/BlogGooglePanel.tsx

### Ticket 7：清理舊 row-based flow

目標：移除表格主流程與多餘 row actions。

修改檔案：

1. apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx
2. apps/superadmin/components/admin/properties/PropertyBlogStyleRowActionCells.tsx
3. apps/superadmin/components/admin/properties/__tests__/PropertyBlogGenerator.test.tsx
4. apps/superadmin/e2e/common/regression/property-blog-query-sync.spec.ts
5. apps/superadmin/app/data/roadmap.ts

## 第一張工單的安全邊界

本次先做 Ticket 1，以下內容先不碰：

1. Supabase schema。
2. Blog generate server actions。
3. BlogSupabasePanel / BlogGooglePanel 核心發布邏輯。
4. 既有 blogPlatform / blogStylePreset / blogReferenceUrl query key。

## 驗證建議

1. 先跑 PropertyBlogGenerator 單元測試。
2. 確認 tab=advertisement_creators 畫面仍可顯示既有平台 panel。
3. 確認重新整理後 query restore 邏輯未壞。
4. 完成 Ticket 1 後再更新 roadmap 與 developmentProgress。