# Docs Index
# 文件索引

本目錄為專案文件中心（docs-as-code，single source of truth）。請優先閱讀下列入口文件與常用分類，避免在子資料夾中迷路。

## 快速入口

- 專案規則（Agent）：[AGENTS.md](../AGENTS.md)
- 專案規則（Claude）：[CLAUDE.md](../CLAUDE.md)
- 檔名與歸檔規範：[file-naming-guidelines.md](./file-naming-guidelines.md)
- 專案進度儀表板更新流程：[update-project-progress-guide.md](./update-project-progress-guide.md)
- 測試規範與模板：[testing-guidelines-and-results](./testing-guidelines-and-results/)
- 操作指南（部署、IAM 等）：[operational-guides](./operational-guides/)

## 分類導覽

- prompts：給人類/Agent 使用的 Prompt 範本與角色索引（見 [agent_roles_index.md](./prompts/agent_roles_index.md)）
- product-overview：產品需求與使用場景（含欄位定義 [property-core-fields-manual.md](./product-overview/property-core-fields-manual.md)）
- design-guidelines：設計系統、主題、UI/UX 參考資料與提案
- technical-selection：技術選型與架構決策
- implementation-plans：實作計畫、整併/重構方案、技術路線
- reports：分析與測試報告
- project-process：規格/開發/測試流程文件（Feature Spec、TDD Spec、Test Logs）
- domain-knowledge：領域知識筆記（例如台灣不動產流程：domain-knowledge/taiwan）
- VLM：OCR/VLM 相關文件、狀態、整合範例

## 命名與整理原則（摘要）

- 目錄與檔名一律使用英文（避免編碼問題與跨平台踩坑）
- 目錄名使用 kebab-case，避免空白與特殊符號
- 需要被引用的路徑（文件連結、腳本）在改名後必須同步更新
