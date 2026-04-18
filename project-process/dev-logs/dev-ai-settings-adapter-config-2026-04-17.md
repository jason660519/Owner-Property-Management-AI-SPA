# 開發日誌 — Row 100 AI Settings Adapter Config（2026-04-17）

**Row ID**：100  
**功能名稱**：超級管理員-AI 服務設定（API 金鑰與模型費用）  
**對應頁面**：`/superadmin/settings/api_key_and_model_setting#adapter-config`  
**DEV-SPEC**：`/project-process/features/tdd-ai-settings-20260221.md`  
**TDD-SPEC**：`/project-process/features/tdd-ai-settings-20260221.md`  
**TDD Progress Report**：`/project-process/test-logs/test-ai-settings-adapter-config-2026-04-17.md`  
**狀態**：In Progress（今日修正已完成並驗證）

---

## 1) 本日完成任務清單（交付物 + 完成度）

| # | 任務 | 具體交付物 | 完成度 |
| :--: | :--- | :--- | :--: |
| 1 | 將 `REVIEW 測試ＯＫ` 改為系統自動判斷欄位 `測試評價` | `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-config-columns.tsx` | 100% |
| 2 | 新增「測試評價」判斷核心純函式 | `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-evaluation.ts` | 100% |
| 3 | 移除手動 review toggle 與舊狀態依賴 | `adapter-config-columns.tsx` + `page.tsx`（刪除 `reviewStatus` 與 label 依賴） | 100% |
| 4 | 清理舊的 review 持久化流程（local/cloud snapshot） | `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/page.tsx` | 100% |
| 5 | 補齊單元測試（含 edge case） | `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/__tests__/adapter-evaluation.test.ts` | 100% |

---

## 2) 遭遇困難（現象 → 排查 → 根因 → 解法）

### 困難 A：`effectiveModel` 未回傳時易誤判為 fallback

- **問題現象**  
  render 有內容，但 `effectiveModel` 尚未更新時，若直接比較 requested/effective，會落到「模型不正確，暫時回退到 未知模型」。
- **排查過程**  
  1. 先比對前端 state 更新節點（`start/poll/control` 三條路徑）。  
  2. 發現 `renderedOutput` 與 `effectiveModel` 並非必然同時可得。  
  3. 檢查評價函式的判斷順序，確認缺少「資料未就緒」分支。
- **根因分析**  
  判斷流程將「資料不足」與「模型不一致」混為同一類。
- **最終解決方案**  
  在 `adapter-evaluation.ts` 加入 `!effectiveModel` 的 `pending` 分支：`待判定（尚未取得實際模型）`，避免錯誤警示。

### 困難 B：自動化後仍留存手動 review state，模型語義不一致

- **問題現象**  
  UI 已改自動評分，但資料流仍讀寫 `reviewStatus`，形成「看不到也無法操作」的殘留狀態。
- **排查過程**  
  1. 全域搜尋 `reviewStatus` / `AdapterReviewStatus` / `LS_ADAPTER_REVIEW_STATUS`。  
  2. 逐段確認初始化、localStorage、cloud snapshot 的序列化欄位。  
  3. 比對現行 UI 使用欄位，確認已無有效讀取端。
- **根因分析**  
  功能從手動審核轉為系統判斷後，未同步做資料模型收斂。
- **最終解決方案**  
  移除 `reviewStatus` 型別、儲存與回填流程，讓資料模型只保留系統判斷所需欄位。

---

## 3) 本日踩雷事件與事前可預防指標

| 踩雷事件 | 影響 | 事前可預防指標 |
| :--- | :--- | :--- |
| 先改 UI 文案，再補判斷狀態機 | 出現「資料未就緒被判錯」的回修 | PR checklist 增加「狀態機是否含 pending/unknown 分支」 |
| 自動化上線但未同時移除 legacy state | 產生死資料與維護成本 | 新增 rule：移除互動 UI 時必檢查對應 `type + persist + hydrate` 全鏈路 |

---

## 4) 下次避免措施（流程 / 工具 / 自動化）

1. **流程優化**：建立「評價欄位改版」標準清單：文案、判斷函式、型別、持久化、測試同步更新，缺一不可。  
2. **工具導入**：在 `adapter-config` 模組加入薄型 state schema 檢查測試，驗證 snapshot 不含廢棄欄位。  
3. **自動化需求**：增加 CI 腳本檢查 `localStorage` key 與 TypeScript type 欄位一致性（避免 UI 拔掉、資料仍寫入）。  
4. **測試治理**：要求所有「系統判斷」邏輯至少包含 4 類測試：成功、失敗、警告、待判定。

---

## 5) 明日優先工作項目（工時 / 相依 / 風險）

| 優先序 | 項目 | 預估工時 | 相依性 | 風險 |
| :--: | :--- | :--: | :--- | :--- |
| P0 | 將「過短輸出」門檻抽成可配置常數（含 UI 提示） | 1.5h | 需確認 PM 對及格門檻定義 | 門檻過嚴或過寬都會造成誤判 |
| P1 | 補 E2E：`adapter-config` 驗證 badge 內容與顏色 | 2.5h | 測試帳號與 API keys 可用 | 外部 provider 回應波動造成 flaky |
| P1 | 補「Requested/Effective 不一致」分析 tooltip（含來源 modelSource） | 1.5h | 現有 run payload 需穩定帶 `modelSource` | source 值不一致造成文案歧義 |
| P2 | 將評價結果納入匯出報表欄位（CSV/JSON） | 2h | 既有 export 流程可重用 | 若格式改動需同步前端/後端 consumers |

---

## 6) 狀態更新（對應系統欄位）

- **DEV-SPEC**：沿用 `tdd-ai-settings-20260221.md`（本日屬同功能增量修正）  
- **TDD-SPEC**：沿用 `tdd-ai-settings-20260221.md`  
- **TDD PROGRESS REPORT.md**：已更新 `test-ai-settings-adapter-config-2026-04-17.md`（新增本日章節）  
- **Development Log Summary**：本檔已建立，並由 `roadmap.ts` 的 `devLogDocPath` 指向  
