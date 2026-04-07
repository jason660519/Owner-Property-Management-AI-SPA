# 合約套版多範本選擇器 — Dev Spec

> **Row ID**: #120 | **建立日期**: 2026-04-07 | **最後更新**: 2026-04-07

## 功能概述

在 Superadmin 物件編輯頁的「各類合約書套版」Tab，提供 6 種官方合約範本的多選卡片介面，每份合約支援「AI 套版生成」與「自行上傳合約」雙模式，讓使用者可同時管理同一物件的多種合約類型。

## 架構設計

### 元件結構

```
PropertyEditForm (parent)
  └── ContractDraftPreviewSection
      ├── Template Selector Grid (6 card checkboxes)
      └── Per-template ContractDraftPanel
          ├── Mode Selector (AI Generate | Upload)
          ├── AI Generate Mode:
          │   ├── ContractDraftLeaseFields (租賃)
          │   ├── ContractDraftSaleFields (買賣)
          │   ├── ContractDraftCommissionFields (委託)
          │   ├── Cloud draft sync (localStorage + Supabase)
          │   └── Version history
          └── Upload Mode:
              └── ContractDraftUploadPanel (drag-drop + preview)
```

### 檔案清單

| 檔案 | 行數 | 用途 |
|:-----|:-----|:-----|
| `ContractTemplateConfig.ts` | ~145 | 6 範本定義、表單介面、分類樣式 |
| `ContractDraftPreviewSection.tsx` | ~100 | 範本多選 Grid + Panel 渲染 |
| `ContractDraftPanel.tsx` | ~420 | 單一範本主面板（雙模式、草稿、版本管理） |
| `ContractDraftUploadPanel.tsx` | ~205 | 拖曳上傳、檔案列表、PDF 預覽 |
| `ContractDraftLeaseFields.tsx` | ~137 | 租賃合約專屬欄位 |
| `ContractDraftSaleFields.tsx` | ~153 | 買賣合約專屬欄位 |
| `ContractDraftCommissionFields.tsx` | ~160 | 委託合約專屬欄位 |
| `ContractDraftNumericInput.tsx` | ~90 | 通用數值輸入元件 |

### 6 種合約範本

| ID | 名稱 | 分類 | AI 生成 | 上傳 |
|:---|:-----|:-----|:--------|:-----|
| `lease` | 房屋租賃契約書 | 租賃 | ✅ | ✅ |
| `sale` | 成屋買賣契約書 | 買賣 | ✅ | ✅ |
| `commission-lease` | 房屋委託租賃契約書 | 委託 | ✅ | ✅ |
| `commission-sale` | 不動產委託銷售契約書 | 委託 | ✅ | ✅ |
| `presale` | 預售屋買賣契約書 | 預售 | ❌ (開發中) | ✅ |
| `presale-parking` | 預售停車位買賣契約書 | 預售 | ❌ (開發中) | ✅ |

### 關鍵 API

- `POST /api/contracts/draft` — AI 生成合約草稿
- `uploadContractFile()` — 上傳合約檔案至 Supabase Storage
- `getPropertyContractFiles()` — 查詢已上傳合約
- `deletePropertyDocument()` — 軟刪除合約檔案

### 資料流

1. 使用者勾選範本 → `selectedIds` state 更新
2. 每個選取範本渲染獨立 `ContractDraftPanel`
3. AI 模式：填寫欄位 → localStorage + cloud sync → 產生草稿 → 預覽/下載
4. 上傳模式：拖曳檔案 → Supabase Storage → 檔案列表

### 委託合約欄位

- 委託人（屋主）/ 受託仲介公司
- 委託方式（專任/一般）
- 委託期限（起迄日）
- 委託售價/租金 + 底價
- 佣金比例 (%) 或固定金額
- 授權行銷方式
- 委託特約事項

## 擴充指南

### 新增範本類型

1. 在 `ContractTemplateConfig.ts` 的 `ContractTemplateId` type 和 `CONTRACT_TEMPLATE_OPTIONS` 新增項目
2. 建立對應欄位元件（如 `ContractDraftPresaleFields.tsx`）
3. 在 `ContractDraftPanel.tsx` 根據 `templateId` 渲染對應欄位
4. 如需 AI 生成：擴展 `contract-draft-builders.ts` + `contract-document-renderer.ts`
5. 設定 `available: true` 啟用 AI 模式

### AI 未就緒的範本

設定 `available: false`：
- AI 模式 Tab 顯示「（開發中）」且無法點選
- 上傳模式正常運作
- 預設開啟上傳模式
