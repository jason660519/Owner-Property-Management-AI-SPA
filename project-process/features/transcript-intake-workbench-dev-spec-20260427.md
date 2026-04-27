# 統一謄本解析工作台 Dev Spec

日期：2026-04-27  
Roadmap Row：085  
位置：`/superadmin/properties/:id/edit?tab=transcript`

## 目標

將謄本操作從分散式手動選項改為單一工作台。User 只需上傳謄本檔案，系統負責判斷檔案格式、解析技術、案件型態、車位產權型態，最後由 user 確認後再寫入建物土地明細資料來源。

## 範圍

- 支援上傳 PDF、圖片、JSON、文字等謄本來源。
- PDF 先檢查是否有可用繁中謄本文字層。
- 有可用文字層時走 local Python text parse。
- 無文字層、掃描件、圖片檔時走 VLM visual parse。
- AI 流程拆為 detect、parse、review 三段。
- 車位產權型態可複選：獨立產權、公設產權，或兩者皆有。
- User 確認後才儲存 canonical transcript result。

## 非目標

- 本階段不直接重做全部 UI。
- 本階段不改既有單文件 parse 行為。
- 本階段不直接產出建物土地明細表 UI。

## 第一階段交付

- `transcript_intake_runs` migration。
- transcript intake type contract。
- Python/VLM technical routing helper。
- detect、parse、review prompt contract。
- prompt seed 串接。
- targeted unit tests。

## 第二階段交付

- `POST /api/transcript-intake/runs` 建立 intake run。
- `GET /api/transcript-intake/runs` 依 property 查詢最近 run。
- `GET /api/transcript-intake/runs/:id` 查詢單一 run snapshot。
- 建立 run 時驗證文件存在、啟用中，且屬於指定物件。
- 建立 run 時依文件類型產生 route decision，保存於 `route_decision`。

## 第三階段交付

- `processTranscriptIntakeRunById` worker。
- `POST /api/transcript-intake/runs/:id/process` 背景啟動單一 run。
- `GET /api/cron/transcript-intake-runs` drain 最舊的 `route_selected` run。
- worker 目前會 claim run、寫入 detection seed、重用既有 transcript parse core、彙整 parsed documents、寫入 review seed，最後進入 `needs_user_confirmation`。

## 第三階段限制

- Python route 建立時已接 PDF text probe 作技術路由；parse 階段仍重用既有 cloud transcript parse core。

## 第四階段交付

- 新增 `intake-ai.ts`，負責 detect/review AI 呼叫。
- detect 使用 `transcript_detection` agent 與 `transcript.intake.detect` prompt。
- review 使用 `transcript_audit` agent 與 `transcript.intake.review` prompt。
- detect/review 寫入 prompt audit log。
- AI stage 失敗時 worker fallback 到 processor seed，避免 run 卡住。

## 第四階段限制

- detect/review 目前各取 agent chain 第一個模型，不做多模型共識。
- 視覺輸入目前以第一份文件為主，其他文件透過 context JSON 傳入；多文件逐份判讀留待後續強化。
- Python route 已於建立 run 時讀取 PDF 文字層判斷是否適合 local text path；實際 parse engine 仍沿用既有 parse core。

## 第五階段交付

- 新增 `TranscriptIntakeWorkbench` UI 面板。
- 工作台會聚合已上傳的建物、土地、車位謄本文件。
- User 可建立 intake run、啟動 process、重新整理/輪詢 run 狀態。
- UI 顯示技術路由、案件初判型態、車位產權、review confidence。
- 既有上傳欄位、單文件解析與結構化表單暫時保留。

## 第六階段交付

- `POST /api/transcript-intake/runs/:id` 將等待確認的 run 轉為 `confirmed`。
- 確認時寫入 `confirmed_result` snapshot，包含 confirmedAt、confirmedByUserId、detection、parsed、review。
- 工作台在 `needs_user_confirmation` 狀態顯示「確認並儲存」按鈕。
- 確認成功後 UI 顯示已確認狀態與成功訊息。

## 第六階段限制

- confirmed result 尚未提供欄位級人工修正；目前是確認當下 AI/parse snapshot。

## 第七階段交付

- confirmed result 會同步回 property `details`。
- 同步欄位包含 `buildingTranscript`、`landTranscript`、`parkingBuildingTranscript`、`parkingLandTranscript`、`parkingTitleRights`。
- 同步 property core flags：`has_independent_parking`、`is_pure_land`、`land_number`。
- 建物土地面積明細表沿用既有 `BuildingLandAreaDetailTab` 計算邏輯，自動讀取確認後的 transcript details。

## 第八階段交付

- 建立 run 時會下載 PDF 並抽取文字層作技術路由，不再只依副檔名或空字串判斷。
- 可讀取台灣繁體謄本文字且含謄本標記的 PDF 走 `local_python_text`。
- 掃描型權狀影本、無文字層 PDF、非謄本文件會走 `vlm_visual`。
- 新增真實 PDF 樣本回歸測試，覆蓋可文字解析謄本、影像型權狀影本、非謄本文字 PDF 三種路由。

## 流程

1. User 上傳一份或多份謄本文件。
2. 系統建立 intake run。
3. File probe 判斷格式與技術路由。
4. Detect AI 初判案件型態、文件型態、車位產權型態、建號與地號數。
5. Parse AI 依初判輸出結構化建物、土地、車位資料。
6. Review AI 交叉檢查台灣謄本實務矛盾與缺漏。
7. User 在工作台確認或修正。
8. 系統儲存確認結果，供下一頁建物土地明細表計算。

## 風險

- PDF 文字層可能是亂碼，路由必須保留 fallback 到 VLM。
- VLM 可能漏讀持分或共有部分，review 階段必須要求 evidence。
- 公設車位常藏在共有部分或備註，不能只靠文件標題判斷。
- 同一案件可同時存在獨立產權車位與公設產權車位。
