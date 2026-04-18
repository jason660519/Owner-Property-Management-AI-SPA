# Kilo SDK / API 資源整理

來源：
- https://kilo.ai/docs/gateway/api-reference
- https://kilocode.ai/docs/gateway/models-and-providers

## 1) Kilo AI Gateway（OpenAI-compatible API）

Kilo 的 Gateway 提供 OpenAI 相容的 API（base URL / endpoint / request schema 以官方文件為準）：
- API Reference：https://kilo.ai/docs/gateway/api-reference

重點（依官方文件）：
- Base URL：`https://api.kilo.ai/api/gateway`
- 主要 endpoint：`POST /chat/completions`
- 回傳支援 streaming（SSE）

認證（常用）：
- `Authorization: Bearer $KILO_API_KEY`

## 2) 模型與 Provider

模型格式（依官方文件）：
- `provider/model-name`（例如 `anthropic/claude-sonnet-4.6`）

模型與 providers 參考：
- https://kilocode.ai/docs/gateway/models-and-providers

## 3) SDK 使用策略（建議）

因為是 OpenAI-compatible API，最常見的「SDK」整合方式是：
- 直接用 OpenAI 官方 SDK（Python/Node）把 `base_url`/`baseURL` 指向 Kilo Gateway，再用同樣的 request 結構呼叫。
- 或任意語言用 HTTP client 直接打 `/chat/completions`。

