# 檔案整理與歸檔系統：指標體系

## 指標檔案

- backups/file-manager/metrics.json

格式（摘要）：

- scannedAt：掃描時間（ISO）
- totalFiles / totalDirs / totalBytes：規模指標
- duplicateGroups：重複內容群組數（以 SHA-256 聚合）
- violationsBySeverity：違規嚴重度分佈（error/warning/info）
- violationsByRule：各規則的違規數量

## 建議 KPI

- Root Noise：根目錄未列入 allowedRoot 的檔案/資料夾數（目標：趨近 0）
- Policy Drift：命名規則違規數的趨勢（目標：每週下降）
- Duplicate Pressure：duplicateGroups（目標：可控下降，或至少不要暴增）
- Auto-action Coverage：plan.actions 數量（目標：逐步提升，但以安全為前提）
- Cleanup Hygiene：備份/報告存量（目標：符合 retentionDays，不爆量）

## 改進迴路（建議流程）

1. 每次 pre-push 或每日排程跑 scan（產生報告 + 更新 metrics）
2. 每週 review：
   - violationsByRule 前 5 名
   - root-disallowed-file / root-disallowed-dir 出現來源
3. 對高頻問題：
   - 先加「偵測」規則（namingRules）
   - 再加「歸檔」規則（archiveRules）
   - 最後才考慮「刪除」規則（deleteRules）
4. 每次擴充自動化動作後，用 UI 產生 plan 再 apply，並保留回滾能力

## 排程建議

範例（macOS / Linux cron）：

- 每天 02:30 跑一次 scan + plan：

```bash
cd /path/to/repo
npm run file-manager:plan
```

如需把 error 當作阻斷條件：

```bash
cd apps/superadmin
npm run file-manager:scan -- --fail-on error
```
