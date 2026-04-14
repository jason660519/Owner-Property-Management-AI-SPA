# Elastic Observability MVP 落地指南

> Task ID: `ELASTIC-OBS-142`  
> 適用環境：本地開發（Docker）/ 測試環境  
> 最後更新：2026-04-14

---

## 1. 目標

以最小可行方式建立可展示、可驗收的 observability 能力：

1. 可監控主機與容器健康
2. 可追蹤 Node/Python 服務效能
3. 可觀察 PostgreSQL 負載
4. 可執行使用者旅程可用性監測
5. 可設定核心告警門檻

---

## 2. 先決條件

- Docker Desktop 已啟動
- Elasticsearch + Kibana 可運行
- 專案根目錄可執行 `./start.sh`

快速啟動：

```bash
./start.sh elastic
./start.sh observability
```

---

## 3. 修復 Integration 安裝來源（Fleet Registry）

若 Kibana Integrations 頁面出現：

- `Kibana cannot connect to the Elastic Package Registry`

先跑檢查腳本：

```bash
tools/observability/check-fleet-registry.sh
```

若主機可連外但容器不可連外，優先檢查：

1. Docker DNS 設定
2. 公司 Proxy 設定（容器需同樣可用）
3. 防火牆白名單（`epr.elastic.co:443`）

若環境受限，採 air-gapped 方案：

- 部署自建 Elastic Package Registry
- 讓 Kibana 指向自建 registry
- 受限網路環境建議設定 Fleet air-gapped 旗標（見官方文件）

---

## 4. MVP Integrations 安裝順序

建議依序安裝並逐項驗收：

1. `System`
2. `Docker`
3. `APM`（Node.js）
4. `APM`（Python）
5. `PostgreSQL`
6. `Synthetics`

每裝完一項就跑：

```bash
tools/observability/mvp-smoke.sh
```

---

## 5. Dashboard MVP（4 張）

1. `Platform Health`
   - Host CPU / Memory / Disk
   - Container restart count
   - 服務可達性

2. `Journey Performance`
   - API latency p50/p95/p99
   - error ratio（4xx/5xx）
   - 關鍵 endpoint 趨勢

3. `OCR Pipeline`
   - OCR request latency
   - success/fail ratio
   - 常見錯誤分類

4. `DB Reliability`
   - active connections
   - 慢查詢趨勢
   - lock / wait 指標

---

## 6. 一鍵驗收

```bash
./start.sh observability
```

此命令會依序執行：

1. `tools/observability/check-fleet-registry.sh`
2. `tools/observability/mvp-smoke.sh`

---

## 7. 常見問題

### Q1. Kibana 可開，但 integrations 仍不能裝

- 多半是容器無法連到 EPR，不是 Kibana 網頁本身壞掉
- 先看 `check-fleet-registry.sh` 的 container 檢查結果

### Q2. smoke 顯示沒有 traces 或 metrics

- 代表 integration 已裝但尚無資料流入
- 先確認 agent/pipeline 是否有送資料，再產生一次流量

### Q3. Synthetics 沒資料

- 先確認 monitor 已建立並啟用
- 確認 monitor 執行頻率與 target URL 可達

---

## 8. 交付建議（對外賣點）

- 將 4 張 dashboard 整理成「營運健康報表」
- 將告警策略整理成 SLA 章節
- 在 Superadmin 建立 observability 入口（後續迭代）
