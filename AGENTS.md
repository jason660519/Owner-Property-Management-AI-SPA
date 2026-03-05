# AI Agents & Roles

本專案定義了多個 AI Agent 角色，用於輔助開發流程的不同階段。這些 Agent 的詳細 Prompt 定義位於 `docs/Prompt/` 目錄下。

## Available Agents

| Agent 角色 | 檔案位置 | 主要職責 |
| :--- | :--- | :--- |
| **Pre-Commit Code Reviewer** | [`docs/Prompt/PRE_COMMIT_CODE_REVIEW_PROMPT.md`](docs/Prompt/PRE_COMMIT_CODE_REVIEW_PROMPT.md) | 在提交代碼前進行邏輯、質量與安全檢查。專注於 "Is this the right way to build it?" 而非僅僅 "Does it work?"。 |
| **Reliability Engineer & TDD Specialist** | [`docs/Prompt/RELIABILITY_ENGINEER_TDD_PROMPT.md`](docs/Prompt/RELIABILITY_ENGINEER_TDD_PROMPT.md) | 負責修復測試錯誤並達成 "Green Build"。執行測試、分析堆疊追蹤 (Stack Traces)、並實施修復方案。 |
| **Structural Code Reviewer** | [`docs/Prompt/STRUCTURAL_CODE_REVIEW_PROMPT.md`](docs/Prompt/STRUCTURAL_CODE_REVIEW_PROMPT.md) | 關注架構健康度、目錄結構、模組邊界與設計模式。檢查循環依賴與抽象洩漏。 |
| **Technical Implementation Strategist** | [`docs/Prompt/TECHNICAL_IMPLEMENTATION_STRATEGIST_PROMPT.md`](docs/Prompt/TECHNICAL_IMPLEMENTATION_STRATEGIST_PROMPT.md) | 將高層次需求轉化為具體的執行計畫與 Actionable Tasks。定義 "What NOT to do" (Guardrails)。 |
| **Technical PM Sync** | [`docs/Prompt/TECHNICAL_PM_SYNC_PROMPT.md`](docs/Prompt/TECHNICAL_PM_SYNC_PROMPT.md) | 自動化專案管理同步。分析 Commit 與 Diff，並將進度更新同步到專案管理系統 (如 Plane)。 |
| **Testing Blueprint** | [`docs/Prompt/TESTING_BLUEPRINT_PROMPT.md`](docs/Prompt/TESTING_BLUEPRINT_PROMPT.md) | 設計測試藍圖，審核現有測試覆蓋率，並定義達到 100% 信心所需的測試案例與邊界條件。 |

## 如何使用

這些 Agent Prompt 設計用於在特定開發情境下切換 AI 的「角色」。當你需要特定領域的深度協助時，可以：

1.  **複製 Prompt 內容**：將對應 `.md` 檔案的內容複製給 AI。
2.  **指定任務**：附上相關的代碼或上下文，讓 AI 依照該角色的規範執行任務。

例如，在準備 Git Commit 前，可以使用 **Pre-Commit Code Reviewer** 的 Prompt 來檢查當前的變更。
