# 合約套版多範本選擇器 — TDD Progress Report

> **Row ID**: #120 | **日期**: 2026-04-07

## 測試覆蓋率

| 類型 | 通過 | 失敗 | 總計 | 覆蓋率 |
|:-----|:-----|:-----|:-----|:-------|
| 單元測試 | 16 | 0 | 16 | 100% |
| E2E 測試 | 0 | 0 | 0 | 0% |

## 已完成測試

### 單元測試 (`apps/superadmin/unit_test/120/ContractTemplateSelector.test.tsx`)

1. **ContractDraftPreviewSection — Template Cards**
   - [x] 渲染 6 張範本卡片含分類 badge
   - [x] 點擊卡片切換選取狀態
   - [x] 未選取時顯示提示文字
   - [x] 不可用範本顯示「僅支援上傳」提示

2. **ContractDraftPreviewSection — Panel mode switching**
   - [x] AI 可用範本預設 AI 模式且 Tab 未禁用
   - [x] AI 不可用範本預設上傳模式且 AI Tab 禁用
   - [x] 不可用範本仍可使用上傳面板

3. **ContractDraftCommissionFields**
   - [x] 渲染銷售委託所有專屬欄位
   - [x] 租賃委託顯示租金相關標籤
   - [x] 委託方式下拉選項正確（空/專任/一般）
   - [x] 輸入委託人姓名觸發 setField
   - [x] 選擇委託方式觸發 setField

4. **ContractTemplateConfig 靜態設定**
   - [x] 定義恰好 6 種範本
   - [x] 所有範本 ID 唯一
   - [x] 4 個分類各有對應 badge 樣式
   - [x] 預售範本 unavailable / 委託範本 available

## 手動驗證紀錄

| 項目 | 結果 | 備註 |
|:-----|:-----|:-----|
| TypeScript 編譯 | ✅ | 無新增錯誤 |
| 6 範本卡片顯示 | ✅ | 含分類 badge |
| 委託範本 AI+上傳雙模式 | ✅ | commission-lease/sale |
| 預售範本僅上傳模式 | ✅ | presale/presale-parking |
| 委託欄位完整渲染 | ✅ | 12 個欄位 |

## 待辦

- [ ] E2E：委託合約完整填寫與產生流程
- [ ] E2E：預售合約上傳 PDF 並預覽
- [ ] 預售合約 AI 生成欄位（Phase 3）
