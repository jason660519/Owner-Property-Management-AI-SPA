# Cursor SDK / API 資源整理

來源：
- https://www.cursor.so/docs/api
- https://cursor.com/docs/account/teams/analytics-api

## 1) Cursor 官方 APIs（以 HTTP 形式提供）

Cursor 提供多個「團隊/管理/分析/Agent」相關 API（偏企業/團隊整合）。總覽與認證方式請以官方文件為準：
- APIs Overview：https://www.cursor.so/docs/api

重點摘要（依官方文件）：
- 多數為 Enterprise teams 可用（例如 Admin/Analytics/AI Code Tracking）。
- Cloud Agents API：Beta（All Plans）。
- 認證：Basic Authentication（把 API key 放在 username，password 留空），或直接設 `Authorization` header。

## 2) Analytics API

Analytics API 入口與範例：
- https://cursor.com/docs/account/teams/analytics-api

用途：
- 讀取團隊層級的使用統計、模型使用量、DAU、Tab 使用等（依官方 endpoint 定義）。

## 3) SDK 形式（建議策略）

Cursor 官方文件主要以「HTTP API」描述；若你要在專案內用「SDK」型態整合，常見作法是：
- 直接用各語言 HTTP client（fetch/axios/requests/httpx 等）包一層 typed client。
- 或依 OpenAPI 產生 client（若 Cursor 提供 OpenAPI/Schema，以官方為準）。

