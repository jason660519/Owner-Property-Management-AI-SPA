# 合約套版多範本選擇器 — TDD Spec

> **Row ID**: #120 | **建立日期**: 2026-04-07

## 測試策略

### 單元測試

| 測試案例 | 目標元件 | 類型 |
|:---------|:---------|:-----|
| 渲染 6 張範本卡片 | ContractDraftPreviewSection | Unit |
| 點擊卡片切換選取狀態 | ContractDraftPreviewSection | Unit |
| 未選取時顯示提示文字 | ContractDraftPreviewSection | Unit |
| AI 可用範本顯示雙模式切換 | ContractDraftPanel | Unit |
| AI 不可用範本預設開啟上傳模式 | ContractDraftPanel | Unit |
| AI 不可用時 AI Tab 禁用 | ContractDraftPanel | Unit |
| 委託合約渲染委託專屬欄位 | ContractDraftPanel | Integration |
| 租賃合約渲染租賃專屬欄位 | ContractDraftPanel | Integration |
| 委託欄位雙向綁定（輸入→form state） | ContractDraftCommissionFields | Unit |
| 委託方式下拉選項正確 | ContractDraftCommissionFields | Unit |
| 佣金數值輸入範圍限制 | ContractDraftCommissionFields | Unit |
| 租賃委託顯示「月租金」標籤 | ContractDraftCommissionFields | Unit |
| 銷售委託顯示「委託售價」標籤 | ContractDraftCommissionFields | Unit |

### E2E 測試（Playwright）

| 測試案例 | 流程 |
|:---------|:-----|
| 選取委託範本 → 填寫 → 產生草稿 | superadmin 物件編輯頁 → 合約 Tab → 選取 commission-sale → 填寫 → 產生 |
| 選取預售範本 → 上傳 PDF | superadmin 物件編輯頁 → 合約 Tab → 選取 presale → 上傳 → 預覽 |

### Mock 策略

- `uploadContractFile` → mock Supabase storage upload
- `getPropertyContractFiles` → 回傳空陣列或 mock 檔案
- `/api/contracts/draft` → mock API response with sample draft
- `listCloudDrafts` / `saveCloudDraft` → mock localStorage
