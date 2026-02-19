# Owner-Property-Management-AI-SPA

Monorepo。主要開發 `apps/web/`（Port 3000），`apps/superadmin/`（Port 3001）。

大部分規範文件在 `docs/`，詳細規則在 `.claude/rules/`，有疑問先讀那裡，不要猜。

## 規範文件

| 用途 | 路徑 |
| :--- | :--- |
| 通用開發規則 | `.claude/rules/general.md` |
| 前端規則 | `.claude/rules/frontend/react-expo.md` |
| 後端規則 | `.claude/rules/backend/supabase.md` |
| 檔案命名 | `docs/file-naming-guidelines.md` |
| UI/UX 設計 | `docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md` |
| 測試參考 | `docs/testing/TEST_QUICK_REFERENCE.md` |
| 進度更新 | `docs/update-project-progress-guide.md` |

## 硬性規定

- TypeScript strict，禁 `any`
- SQL 只能放 `supabase/migrations/`，格式 `YYYYMMDDHHMMSS_描述.sql`
- 文檔/臨時檔不能放根目錄

## 啟動

```bash
# 先開 Docker Desktop，再執行：
./start.sh
```
