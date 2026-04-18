# AGENTS.md

Repository instructions for OpenAI-compatible coding agents (Codex, Cursor, etc.).

**本檔刻意精簡。** 專案規則與 `CLAUDE.md` 相同，請直接讀 `CLAUDE.md`：

- 硬性規定、Paperclip 派工規則、三層自動化、測試路徑規範、Hermes → `CLAUDE.md`
- 架構、Supabase client、Next.js 慣例、已知陷阱、禁止降級套件 → `.claude/rules/`
- 進度資料 → `apps/superadmin/app/data/roadmap.ts`

## Core Rules（速查）

- TypeScript strict，禁 `any`
- SQL 只能放 `supabase/migrations/`，檔名 `YYYYMMDDHHMMSS_描述.sql`
- 文檔/臨時檔不能放根目錄，單檔 ≤ 500 行
- 程式碼註解用英文；commit 訊息、文檔、UI 文字用繁體中文

## 維護

若本檔與 `CLAUDE.md` 衝突，以 `CLAUDE.md` 為準。更動規則只改一處（`CLAUDE.md` 或 `.claude/rules/`），不要在本檔重複貼。
