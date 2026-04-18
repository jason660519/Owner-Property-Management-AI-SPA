# Claude Code / Anthropic SDK 資源整理

來源：
- https://docs.anthropic.com/en/api/client-sdks
- https://docs.claude.com/en/api/agent-sdk/overview

## 1) Anthropic Client SDK（Claude API）

| 語言 | 套件 | 安裝 | 官方文件 |
|---|---|---|---|
| Python | `anthropic` | `pip install anthropic` | https://docs.anthropic.com/en/api/client-sdks |
| TypeScript/JavaScript | `@anthropic-ai/sdk` | `npm i @anthropic-ai/sdk` | https://docs.anthropic.com/en/api/client-sdks |
| Java |（官方 Java SDK）|（見文件）| https://docs.anthropic.com/en/api/client-sdks |
| Go |（官方 Go SDK）|（見文件）| https://docs.anthropic.com/en/api/client-sdks |
| Ruby / C# / PHP |（官方 SDK）|（見文件）| https://docs.anthropic.com/en/api/client-sdks |

認證（常用）：
- `ANTHROPIC_API_KEY`（環境變數）

## 2) Claude Agent SDK（Claude Code 的可程式化版本）

重點：
- 用 Python / TypeScript 寫出「像 Claude Code 一樣」能讀檔、跑命令、編輯檔、管理 session / permissions / subagents / MCP 的 agent loop。
- 適合：把原本 CLI 的工作流程產品化（CI、內部工具、服務化 agent）。

官方文件：
- https://docs.claude.com/en/api/agent-sdk/overview

