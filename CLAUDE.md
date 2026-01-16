# Owner Real Estate Agent SaaS

房東物件管理語音 AI App - Phase 1 MVP 開發中

---

## 專案概覽

- 專案說明：@README.md
- 快速開始：@START_HERE.md
- 開發進度：@docs/專案SDLC進度表報告\_2026-01-14.md
- 詳細記憶：@.claude/CLAUDE.md

---

## Context7 技術文檔規則

當需要以下技術的 API、程式碼範例或 best practices 時，
使用 Context7 MCP 查詢最新官方文檔，避免使用過時資訊：

| 技術       | Library ID              | 版本   |
| :--------- | :---------------------- | :----- |
| React      | `/facebook/react`       | 19     |
| Expo       | `/expo/expo`            | 54     |
| Supabase   | `/supabase/supabase`    | latest |
| TypeScript | `/microsoft/typescript` | 5.x    |
| PostgreSQL | `/postgres/postgres`    | 17     |

### 使用方式

1. **自動查詢**：在 prompt 中加入 `use context7`
2. **指定 Library**：`use library /supabase/supabase`
3. **指定版本**：在 prompt 中說明版本，如「React 19 hooks」

### 何時使用 Context7

- ✅ 需要 API 文檔或程式碼範例
- ✅ 設定或配置步驟
- ✅ Best practices 和設計模式
- ✅ 版本升級或遷移指南

---

## 快速指令

```bash
# 啟動 Supabase
supabase start

# 啟動前端開發
cd frontend && npx expo start

# 重置資料庫
supabase db reset

# 查看 Supabase 狀態
supabase status
```

---

## 重要路徑

| 類型          | 路徑                                      |
| :------------ | :---------------------------------------- |
| 前端原始碼    | `frontend/src/`                           |
| 資料庫 Schema | `supabase/migrations/`                    |
| API 函數      | `frontend/src/lib/supabase.ts`            |
| 文檔中心      | `docs/`                                   |
| 命名規則      | `本專案檔案命名規則與新增文件歸檔總則.md` |
