# 房東物件管理語音 AI App (Phase 1 MVP)

## 核心規範

- [檔案命名與歸檔規則](docs/本專案檔案命名規則與新增文件歸檔總則.md)
- [通用開發規則](.claude/rules/general.md)
- [前端規則](.claude/rules/frontend/react-expo.md)
- [後端規則](.claude/rules/backend/supabase.md)

## 代碼要求

1. 命名使用正確 casing（PascalCase/camelCase/kebab-case）
2. 檔案包含 `// filepath:` 註解
3. 遵守 Monorepo 結構
4. 文檔放入 `docs/` 對應分類


## Context7 技術文檔

查詢最新官方文檔時使用：

- React 19: `/facebook/react`
- Expo 54: `/expo/expo`
- Supabase: `/supabase/supabase`
- TypeScript: `/microsoft/typescript`
- PostgreSQL 17: `/postgres/postgres`

## 快速指令

```bash
supabase start              # 啟動 Supabase
cd frontend && npx expo start  # 啟動前端
supabase db reset           # 重置資料庫
```

## 核心路徑

- `frontend/` - 前端代碼
- `backend/` - 後端代碼
- `supabase/migrations/` - 資料庫 Schema
- `docs/` - 專案文檔
