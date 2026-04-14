# Elastic Observability MVP — DEV-SPEC

**Task ID**: ELASTIC-OBS-142  
**Row ID (roadmap)**: 142  
**功能名稱**: Elastic Observability MVP（APM / PostgreSQL / Docker / Synthetics）  
**版本**: 1.0（審查稿）  
**日期**: 2026/04/14  
**狀態**: 待審查（Approved 後實作）

---

## 1) 背景與目標

目前專案已具備 Elasticsearch + Kibana 本地啟停能力，但尚未形成可對外展示的「SaaS 可觀測性賣點」。

本任務目標是建立最小可行的觀測體系（MVP），讓團隊可以在 1 個工作迭代內交付以下可演示能力：

1. 關鍵服務健康可視化（Host + Container + App）
2. 核心使用者旅程效能追蹤（登入、搜尋、預約、文件流程）
3. OCR 與資料庫瓶頸快速定位
4. 可落地告警與營運門檻（SLA 導向）

---

## 2) 範圍

### 2.1 In Scope（本次要做）

- 修復/治理 Kibana Fleet Integration 來源可用性（Online 或 Air-gapped 方案）
- 安裝並配置以下 integrations（MVP）：
  - System
  - Docker
  - APM（Node.js）
  - APM（Python）
  - PostgreSQL
  - Synthetics（HTTP / Browser）
- 建立 4 張 MVP Dashboard
- 設定 5 條核心告警規則
- 補齊操作文件與驗收清單

### 2.2 Out of Scope（本次不做）

- SIEM / Endpoint Defend 完整資安方案
- 多叢集跨區域災備
- 向量搜尋與高階 ML 觀測分析

---

## 3) 受影響元件

- `backend/elasticsearch/docker-compose.yml`
- `start.sh`（已完成 ELK 啟停整合）
- `stop.sh`（已完成 ELK 停止整合）
- `docs/operational-guides/*`（新增 observability 指南）
- `apps/superadmin/app/data/roadmap.ts`（本列規劃與進度）

---

## 4) 功能需求與驗收條件

1. **Integration Source 可用**
   - Kibana 不再出現「cannot connect to Elastic Package Registry」阻斷安裝的狀態，或已切換到自建 registry 並可安裝套件。
2. **MVP Integrations 完成**
   - 上述 6 類 integrations 在 dev 環境至少可收數 24 小時。
3. **Dashboard 完成**
   - `Platform Health`
   - `Journey Performance`
   - `OCR Pipeline`
   - `DB Reliability`
4. **告警可觸發**
   - 5 條規則可成功觸發與回復（測試事件或門檻觸發）。
5. **文檔可重現**
   - 新人依文檔可在 60 分鐘內重建同等監控能力。

---

## 5) 技術方案（MVP）

### P0: Fleet/Registry 可用性

- 優先走 Online（可連外 EPR）
- 若受網路限制，切 Air-gapped（自建 EPR + Kibana 設定）
- 在 `kibana.yml` 標記 air-gapped 旗標（若採離線模式）

### P1: 資料收集

- 主機層：System
- 容器層：Docker
- 應用層：Node APM + Python APM
- 資料層：PostgreSQL metrics/logs
- 體驗層：Synthetics journeys

### P2: 視覺化 + 告警

- 先完成 4 張核心儀表板
- 告警先採固定門檻，後續再做動態基線

---

## 6) 風險與對策

- **風險**: 公司網路阻擋 EPR  
  **對策**: 自建 registry 並文件化切換流程
- **風險**: APM 埋點影響性能  
  **對策**: 先低採樣率，逐步提升
- **風險**: 告警過多造成疲勞  
  **對策**: 第一版只開 5 條高價值告警

---

## 7) 交付物

1. 可運作的 integrations（MVP 範圍）
2. 4 張 dashboard（可演示）
3. 5 條告警（可觸發）
4. 操作文件（安裝/驗收/故障排查）
5. roadmap 進度與測試文件同步更新

---

## 8) 審查清單（你確認後我才實作）

- [ ] 範圍與優先順序同意
- [ ] MVP integrations 名單同意
- [ ] 4 張 dashboard 命名與內容同意
- [ ] 告警門檻同意（可先用預設）
- [ ] 同意進入實作（含腳本/設定/文件落地）

