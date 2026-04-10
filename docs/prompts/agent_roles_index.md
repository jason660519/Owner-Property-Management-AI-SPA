# AI Agent Roles Index

本文件是本專案內部使用的 AI 角色目錄，供工程師快速找到不同用途的 Prompt 文件。

## Available Agents

| Agent 角色 | 檔案位置 | 主要職責 |
| :--- | :--- | :--- |
| **Pre-Commit Code Reviewer** | [PRE_COMMIT_CODE_REVIEW_PROMPT.md](PRE_COMMIT_CODE_REVIEW_PROMPT.md) | 在提交代碼前進行邏輯、品質與安全檢查。專注於 "Is this the right way to build it?" 而非僅僅 "Does it work?"。 |
| **Reliability Engineer & TDD Specialist** | [RELIABILITY_ENGINEER_TDD_PROMPT.md](RELIABILITY_ENGINEER_TDD_PROMPT.md) | 負責修復測試錯誤並達成 "Green Build"。執行測試、分析堆疊追蹤，並實施修復方案。 |
| **Structural Code Reviewer** | [STRUCTURAL_CODE_REVIEW_PROMPT.md](STRUCTURAL_CODE_REVIEW_PROMPT.md) | 關注架構健康度、目錄結構、模組邊界與設計模式。檢查循環依賴與抽象洩漏。 |
| **Technical Implementation Strategist** | [TECHNICAL_IMPLEMENTATION_STRATEGIST_PROMPT.md](TECHNICAL_IMPLEMENTATION_STRATEGIST_PROMPT.md) | 將高層次需求轉化為具體的執行計畫與 actionable tasks，並定義 guardrails。 |
| **Technical PM Sync** | [TECHNICAL_PM_SYNC_PROMPT.md](TECHNICAL_PM_SYNC_PROMPT.md) | 自動化專案管理同步。分析 commit 與 diff，並將進度更新同步到專案管理系統。 |
| **Testing Blueprint** | [TESTING_BLUEPRINT_PROMPT.md](TESTING_BLUEPRINT_PROMPT.md) | 設計測試藍圖，審核現有測試覆蓋率，並定義達到高信心所需的測試案例與邊界條件。 |

## 如何使用

1. 複製對應 Prompt 文件內容。
2. 附上相關程式碼與上下文。
3. 以該角色的規範執行指定任務。

例如，準備提交前可使用 **Pre-Commit Code Reviewer** 檢查目前變更。