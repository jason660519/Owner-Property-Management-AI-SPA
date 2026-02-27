# Owner-Property-Management-AI-SPA

Monorepo。主要開發 `apps/web/`（Port 3000），`apps/superadmin/`（Port 3001）。

大部分規範文件在 `docs/`，詳細規則在 `.claude/rules/`，有疑問先讀那裡，不要猜。

## 規則檔案索引

| 用途 | 路徑 |
| :--- | :--- |
| 通用規則（命名、Git、檔案組織、進度更新） | `.claude/rules/general.md` |
| 前端規則（Next.js、React、Tailwind） | `.claude/rules/frontend/react-next.md` |
| 後端規則（Supabase、RLS、Migration） | `.claude/rules/backend/supabase.md` |
| 檔案命名詳細規範 | `docs/file-naming-guidelines.md` |
| 專案進度儀表板更新（roadmap、Dev-Spec/TDD Spec/Report .md） | `docs/update-project-progress-guide.md` |
| UI/UX 設計 | `docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md` |

## 硬性規定

- TypeScript strict，禁 `any`
- SQL 只能放 `supabase/migrations/`，格式 `YYYYMMDDHHMMSS_描述.sql`
- 文檔/臨時檔不能放根目錄

## 啟動

```bash
# 先開 Docker Desktop，再執行：
./start.sh
```
