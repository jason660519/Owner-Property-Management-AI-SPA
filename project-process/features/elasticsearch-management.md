# Elasticsearch 管理功能 - 功能規格書

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`elasticsearch-management.html`

---

## 1. 功能概述

本模組旨在為超級管理員提供強大的全文檢索與索引管理能力，特別針對中文房地產謄本資料進行優化。整合 Elasticsearch 8.12 搜尋引擎，支援高效的模糊搜尋、同音字辨識與簡繁體自動轉換。

### 中文語意搜尋

整合 IK Analyzer 與 STConvert，支援精準分詞與簡繁體通用搜尋。

### 即時資料同步

OCR 辨識完成後自動索引，並提供全量重建索引 (Reindex) 機制。

### 叢集健康監控

即時監控 ES 節點狀態、分片健康度與索引儲存空間。

## 2. 系統架構

```
[Frontend: Superadmin Dashboard]
|
v
[Backend API: Search Data Service]
|-- POST /ocr/single (Trigger Sync)
|-- GET /admin/es/health
|-- GET /admin/es/stats
|-- POST /admin/es/reindex
|
v
[Elasticsearch 8.12 Container]
|-- Plugin: analysis-ik (Segmentation)
|-- Plugin: analysis-stconvert (T2S/S2T)
|-- Index: property_documents
```

## 3. API 介面規格

GET
`/api/v1/search/documents`

搜尋房地產文件。支援參數：`q` (模糊搜尋), `owner_name` (屋主), `address` (地址)。

GET
`/api/v1/admin/es/health`

取得叢集健康狀態 (Green/Yellow/Red) 與節點資訊。

POST
`/api/v1/admin/es/reindex`

觸發背景任務，將 PostgreSQL 資料庫中的所有已完成文件重新同步至 ES。

## 4. 驗收標準 (Acceptance Criteria)

- [Pass] 中文搜尋準確率需達 95% 以上，並支援模糊比對。

- [Pass] 搜尋回應時間不超過 2 秒。

- [Pass] 建立 PostgreSQL 與 Elastic Search 資料同步機制。

- [Pass] 可正確識別並計算指定屋主名下的所有房地產數量。

- [Pass] 提供 Elastic Search 叢集健康狀態監控與索引管理介面。

&copy; 2026 Real Estate Management System. All rights reserved.
