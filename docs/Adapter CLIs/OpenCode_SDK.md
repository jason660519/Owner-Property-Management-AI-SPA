# OpenCode SDK 資源整理

來源：
- https://opencode.ai/docs/sdk/
- https://dev.opencode.ai/docs/server

## 1) JS/TS SDK（官方）

OpenCode 提供官方 JS/TS SDK（type-safe client），用來以程式方式控制 opencode server：
- SDK 文件：https://opencode.ai/docs/sdk/

安裝：
- `npm install @opencode-ai/sdk`

重點能力（依官方文件）：
- `createOpencode()`：可同時啟動 server + client（適合本機整合/工具化）
- `createOpencodeClient()`：只建立 client，連線到既有 server
- 型別定義由 server 的 OpenAPI 規格生成（可直接 import types）

## 2) Server / OpenAPI（自行產生 SDK）

OpenCode 的架構是 TUI（client）+ server（HTTP API）。server 會公開 OpenAPI 規格：
- Server 文件：https://dev.opencode.ai/docs/server
- OpenAPI 入口：`http://<hostname>:<port>/doc`

用途：
- 你可以用 OpenAPI generator / 自家工具，產生你想要語言的 client SDK。
- 也可以直接用 HTTP 呼叫（例如 `opencode serve` 常駐後端，其他程式以 HTTP 控制）。

