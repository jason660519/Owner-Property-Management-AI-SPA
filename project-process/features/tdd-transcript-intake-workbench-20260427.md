# 統一謄本解析工作台 TDD Spec

日期：2026-04-27  
Roadmap Row：085

## 測試策略

第一階段先測穩定 contract 與 deterministic routing，避免後續 UI 與 worker 依賴不穩定。

## Unit Tests

- `intake-router` 能辨識 PDF、圖片、JSON、文字檔。
- PDF 有足夠繁中謄本標記時走 `local_python_text`。
- PDF 文字層稀疏或非謄本內容時走 `vlm_visual`。
- 真實 PDF 樣本需覆蓋可文字解析謄本、影像型權狀影本、非謄本文字 PDF 三種 routing regression。
- 圖片檔固定走 `vlm_visual`。
- JSON 固定走 `structured_json`。
- prompt seed 包含新工作台三段 prompt。
- intake worker 能 claim run 並推進到 `needs_user_confirmation`。
- intake worker 在 parse 失敗時標記 run failed。
- intake worker 會呼叫 AI detect/review stage。
- AI detect/review 失敗時 fallback 到 seed，不中斷整個 run。
- process API 需要 superadmin auth，成功後透過 `after()` 啟動 worker。
- 工作台 UI 會顯示空狀態、建立 run，並呼叫 process endpoint。
- confirm API 只確認 `needs_user_confirmation` run 並寫入 confirmed_result。
- confirmed result mapper 會輸出建物、土地、車位與車位產權的 property details patch。
- confirm API 會同步 property details，讓建物土地面積明細表讀取確認後資料。
- 工作台 UI 可觸發確認並顯示成功訊息。

## Integration Tests

後續實作 queue worker 後補：

- 建立 intake run。
- 多文件來源寫入 `source_document_ids`。
- detect、parse、review 階段逐步更新 DB status。
- failed 狀態保留 error_message。
- user confirmation 後寫入 confirmed_result 並同步 property details。

## E2E Tests

後續 UI 完成後補：

- User 上傳掃描 PDF 後看到 VLM 路由。
- User 上傳文字層 PDF 後看到 Python 路由。
- User 可確認車位產權複選結果。
- 儲存後建物土地明細表可讀到已確認結果。

## 驗收標準

- User 不需要先手動選建物、土地或車位類別。
- 系統可解釋為何選 Python 或 VLM。
- AI review 能標示需要人工確認的欄位。
- 未確認結果不覆蓋 canonical transcript data。
