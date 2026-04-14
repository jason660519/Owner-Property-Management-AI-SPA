# Elastic Observability MVP — TDD SPEC

**Task ID**: ELASTIC-OBS-142  
**Row ID (roadmap)**: 142  
**功能名稱**: Elastic Observability MVP（APM / PostgreSQL / Docker / Synthetics）  
**版本**: 1.0（審查稿）  
**日期**: 2026/04/14  
**狀態**: 待審查（Approved 後依本規格實作與驗證）

---

## 1) 測試策略總覽

本任務採「先可用、再完整」的測試策略：

1. **配置驗證**：確保 ELK/Fleet/integration 設定可啟動與可連線
2. **資料可達性驗證**：確認 metrics/logs/traces/synthetics 皆有資料流入
3. **儀表板驗證**：確認 dashboard 元件有數據且查詢正確
4. **告警驗證**：確認觸發與恢復流程正常

---

## 2) 測試資產規劃

| 類型 | 路徑 |
|---|---|
| Unit / Integration | `apps/superadmin/unit_test/142/` |
| E2E Acceptance | `apps/superadmin/e2e/142/` |
| 操作驗證文件 | `docs/operational-guides/elastic-observability-mvp.md`（待建立） |

---

## 3) 測試案例（先規格，後實作）

### 3.1 啟動與連線

- `start.sh elastic` 後：
  - `http://localhost:9200/_cluster/health` 可回應
  - `http://localhost:5601` 可回應
- Fleet integrations 頁可載入，無阻斷性 registry 錯誤

### 3.2 Integration 安裝驗證

- System：可看到主機 CPU/Mem/Disk 指標
- Docker：可看到目標容器指標（web/superadmin/ocr/elasticsearch/kibana）
- APM Node.js：可看到至少一個 node service traces
- APM Python：可看到 OCR service traces
- PostgreSQL：可看到連線與查詢相關指標
- Synthetics：可看到 heartbeat 或 browser journey 結果

### 3.3 Dashboard 驗證

- 4 張 dashboard 可載入
- 每張至少 3 個 panel 顯示非空資料
- 時間範圍切換（15m/24h）查詢可正常更新

### 3.4 告警驗證

- `API p95 > 1.5s` 觸發/恢復
- `5xx ratio > 2%` 觸發/恢復
- `OCR fail rate > 3%` 觸發/恢復
- `DB active connections > 80%` 觸發/恢復
- `container restart >= 3 in 15m` 觸發/恢復

---

## 4) 測試執行順序

1. Smoke：ELK 啟動與健康檢查
2. Integration：逐項安裝並驗證資料流
3. Dashboard：載入與查詢驗證
4. Alert：門檻模擬與通知驗證

---

## 5) Definition of Done

- [ ] `apps/superadmin/unit_test/142/` 至少包含啟動/連線 smoke 驗證腳本
- [ ] `apps/superadmin/e2e/142/` 至少包含 1 條 dashboard acceptance 測試
- [ ] MVP integrations 全部可收數
- [ ] 4 張 dashboard 驗證完成
- [ ] 5 條告警完成觸發/恢復測試
- [ ] roadmap 對應欄位更新（percentage/testProgress/docPath）

---

## 6) 風險測試

- EPR 不可用時，驗證 Air-gapped fallback 文件可落地
- APM Agent 版本不一致時，驗證最小兼容組合
- PostgreSQL integration 授權不足時，驗證最小權限與錯誤訊息可診斷

---

## 7) 審查清單（你確認後我才開始寫測試與實作）

- [ ] 測試範圍同意
- [ ] 驗收順序同意（Smoke -> Integration -> Dashboard -> Alert）
- [ ] DoD 同意
- [ ] 同意進入實作階段

