# Gemini（Google）SDK 資源整理

來源：
- https://ai.google.dev/gemini-api/docs/libraries
- https://ai.google.dev/gemini-api/docs/migrate
- https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview

## 1) Google GenAI SDK（官方、GA）

Google 建議使用 Google GenAI SDK（新世代官方 SDK；取代舊版 `google-generativeai` / `@google/generative-ai` 等 legacy library）：
- https://ai.google.dev/gemini-api/docs/libraries

| 語言 | 套件 | 安裝 | Repo / 文件 |
|---|---|---|---|
| Python | `google-genai` | `pip install --upgrade google-genai` | https://ai.google.dev/gemini-api/docs/libraries |
| JavaScript/TypeScript | `@google/genai` | `npm install @google/genai` | https://ai.google.dev/gemini-api/docs/libraries |
| Go | `google.golang.org/genai` | `go get google.golang.org/genai` | https://ai.google.dev/gemini-api/docs/libraries |
| Java | `com.google.genai:google-genai` |（Maven dependency，見文件）| https://ai.google.dev/gemini-api/docs/libraries |
| .NET | `Google.GenAI` | `dotnet add package Google.GenAI` | https://ai.google.dev/gemini-api/docs/libraries |

## 2) Gemini Developer API vs Vertex AI（同一套 SDK）

同一套 Google GenAI SDK 可用於：
- Gemini Developer API（一般開發者 API key 流程）
- Vertex AI（企業/Google Cloud 工作流程）

概覽：
- https://cloud.google.com/vertex-ai/generative-ai/docs/sdks/overview

遷移指南（legacy → GenAI SDK）：
- https://ai.google.dev/gemini-api/docs/migrate

