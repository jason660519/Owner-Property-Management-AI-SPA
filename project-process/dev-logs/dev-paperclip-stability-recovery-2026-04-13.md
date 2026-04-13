# Paperclip 穩定性修復今日日報（2026-04-13）

## 1) 今日完成項目（Done）
- 完成 Paperclip 反覆失敗（約每 5 分鐘）根因盤點：adapter 可用性、模型設定、API quota、OAuth 與 API key 混用路徑。
- 完成 OAuth 優先啟動腳本：scripts/paperclip-start-oauth.sh。
- 完成最近 10 分鐘健康檢查腳本：scripts/paperclip-health-last10m.sh。
- 將 8 位 agent 統一回復為 claude_local + model=sonnet 並恢復 active 狀態。
- 加入 fixpoint 機制，能分離「修復前舊失敗」與「修復後新執行」觀測區間，避免誤判修復失效。

## 2) 阻塞與修復（Blockers / Root Cause / Remediation）
- Blocker A：claude_local adapter 實際執行時，API key 路徑會觸發 credit balance 錯誤，導致週期性 failed。
  - Root cause：容器內執行路徑在 API key 與 OAuth token 混合時，會優先落到不穩定路徑。
  - Remediation：以 OAuth token 為主路徑重建容器並清空 runtime ANTHROPIC_API_KEY，建立可預期執行模式。
- Blocker B：部分 agent 模型設定與 adapter 不一致，造成 adapter/model mismatch。
  - Root cause：歷史設定殘留與多次切換造成 adapterConfig.model 不一致。
  - Remediation：批次修正 8 位 agent 的 adapterConfig.model 為 sonnet。
- Blocker C：健康檢查混入修復前舊 run，誤導觀測。
  - Root cause：只看最近 10 分鐘，未建立修復基準時間。
  - Remediation：新增 fixpoint timestamp，健康檢查支援 fixpoint 視角統計。

## 3) 避坑重點與預警指標（Pitfalls / Indicators）
- Pitfall：同時保留 API key 與 OAuth token 時，容易誤以為 fallback 一定會自動成功。
- Pitfall：只改 adapterType 未改 model，會出現看似正常但持續失敗的假穩定狀態。
- Pitfall：僅看「最近 N 分鐘」而無修復時間戳，會把舊失敗誤算進新狀態。
- Indicator：heartbeat-runs 在 fixpoint 後連續 3 個週期成功率低於 95%。
- Indicator：單 agent 連續 2 次 failed 且 error 類型重複（credit/model mismatch/auth）。
- Indicator：claude exec smoke 測試失敗或回應異常延遲。

## 4) 可執行預防措施（Actionable Safeguards）
- 在 daily startup 流程優先使用 scripts/paperclip-start-oauth.sh，避免人工遺漏環境切換。
- 例行巡檢採 scripts/paperclip-health-last10m.sh，並固定帶入 fixpoint。
- 每次批次切換 adapter 後，強制做一次 smoke + health 雙檢查：
  1. container 內 claude hello
  2. heartbeat-runs fixpoint 後統計
- 若要恢復 API key 路徑，需先做隔離驗證並記錄風險，不可直接覆寫現行穩定路徑。

## 5) 明日優先事項（Tomorrow Priorities）
- P1：連續 24h 穩定性觀測（fixpoint 後 run success rate、failed 類型、平均恢復時間）。
  - Dependency：Paperclip 容器持續在線、OAuth token 未失效。
  - Risk：若 token 失效或被覆寫，會回退到不穩定 API key 路徑。
- P2：建立「API key 與 OAuth 雙路徑切換」標準作業文件，明確切換條件與回滾步驟。
  - Dependency：需先完成 24h 穩定數據。
  - Risk：若未定義切換閘門，後續維運可能再次混用。
- P3：將 health script 輸出接到管理儀表板的每日摘要區（僅摘要，不暴露敏感資訊）。
  - Dependency：前端摘要元件與後端讀取接口排程。
  - Risk：若缺少資料清理規則，可能導致噪音告警。

## 6) 狀態判定（Backlog / Todo / In progress / In review / Done）
- 今日修復實作狀態：Done（腳本、設定修正、容器重建、agent 恢復均已完成）。
- 穩定性治理任務狀態：In review（待 24h 觀測數據收斂後關閉）。
- 明日延伸優化狀態：Todo（雙路徑 SOP 與儀表板摘要整合）。
