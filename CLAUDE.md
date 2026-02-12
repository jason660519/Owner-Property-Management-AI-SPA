# Owner-Property-Management-AI-SPA

> 房東物件管理 AI 平台 — Monorepo (Turborepo)

---

## 核心規範文件（必讀）

| 規範 | 路徑 |
|:-----|:-----|
| 通用開發規則 | [.claude/rules/general.md](.claude/rules/general.md) |
| 前端規則 | [.claude/rules/frontend/react-expo.md](.claude/rules/frontend/react-expo.md) |
| 後端規則 | [.claude/rules/backend/supabase.md](.claude/rules/backend/supabase.md) |
| 檔案命名總則 | [docs/file-naming-guidelines.md](docs/file-naming-guidelines.md) |
| UI/UX 設計規範 | [docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md](docs/design-guidelines/UNIFIED_DESIGN_STANDARD.md) |
| 測試快速參考 | [docs/testing/TEST_QUICK_REFERENCE.md](docs/testing/TEST_QUICK_REFERENCE.md) |

---

## 專案架構

```
root/
├── apps/
│   ├── web/                  # Next.js 15 Web App + PWA (Port 3000) ← 主要開發
│   ├── superadmin/           # Next.js Superadmin 後台 (Port 3001)
│   └── mobile/               # Expo App (已暫停，代碼保留)
├── packages/
│   ├── ui/                   # 共用 UI 組件
│   ├── utils/                # 共用工具函數
│   └── types/                # 共用 TypeScript 型別
├── backend/
│   └── ocr_service/          # Python OCR 微服務
├── supabase/
│   └── migrations/           # SQL 遷移檔 (Core + IAM)
├── docs/                     # 專案文檔中心
│   ├── access-matrix-design-guidelines-and-process/
│   ├── deployment-guides/
│   ├── design-guidelines/
│   ├── implementation-plans/
│   ├── product-overview/
│   └── testing/
├── project-process/          # 專案流程與進度報告
└── scripts/                  # 自動化腳本
```

**開發策略**：Phase 1 專注 Next.js Web + PWA（響應式 + 可安裝），Mobile App 暫停。

---

## 資料庫架構

**存取策略**：
- **SQL View** (`unified_properties_view`) → 標準查詢（列表、詳情）
- **RPC** → 特殊邏輯（地理搜尋、複雜權限、批量操作）

| 核心表 | 用途 | 訪問方式 |
|:-------|:-----|:---------|
| `unified_properties_view` | 整合 Sales/Rentals 的虛擬表 | View (Read-Only) |
| `Property_Sales` / `Property_Rentals` | 出售/出租物件 | 透過 View 或 RPC |
| `Property_Photos` | 物件照片 | 直接訪問 |
| `users_profile` | 使用者資料 | 直接訪問 |
| `iam_groups` / `iam_roles` / `iam_group_members` | IAM 權限系統 | Server Action / RPC |

---

## AI 協作規範

**Git Commit 格式**：`[Claude] type(scope): message`

**程式碼 Header**：
```typescript
// filepath: apps/web/components/UserProfile.tsx
// created: 2026-01-30 | creator: Claude Opus 4.6
```

**Markdown Metadata**：
```markdown
> **創建日期**: YYYY-MM-DD | **創建者**: AI 名稱
> **最後修改**: YYYY-MM-DD | **修改者**: AI 名稱 | **版本**: X.Y
```

**AI 識別**：Claude → `[Claude]`、Gemini → `[Gemini]`、GPT → `[GPT-4]`、DeepSeek → `[DeepSeek]`

---

## 快速指令

```bash
# 啟動服務
./start.sh menu               # 選擇啟動 (Web/Admin/OCR/Tracker)
./start.sh all                # 一鍵啟動全部
./stop.sh                     # 停止所有服務
npm run dev:web               # Web 主站 (Port 3000)
npm run dev:admin             # Superadmin (Port 3001)

# 測試
npm run test                  # 單元測試 (Jest)
npm run test:e2e              # E2E 測試 (Playwright)
npm run build && npm run lint # 建構 + 檢查
```

---

## Context7 文檔路徑

| 技術 | 路徑 |
|:-----|:-----|
| Next.js 15 | `/vercel/next.js` |
| React 19 | `/facebook/react` |
| Supabase | `/supabase/supabase` |
| Expo 54 | `/expo/expo` |
| TypeScript | `/microsoft/typescript` |

---

## 關鍵約束（速記）

1. **TypeScript strict** — 禁止 `any`，所有函數需型別標註
2. **檔案歸檔** — 禁止根目錄放文檔/臨時檔，詳見 [general.md](.claude/rules/general.md)
3. **命名規則** — 組件 PascalCase / 工具 camelCase / 資料夾 kebab-case / 文檔 snake_case
4. **測試結構** — 單元測試 colocated (`__tests__/`)，E2E 在 `e2e/flows/{module}/`
5. **Skills 優先級** — `.claude/rules/` > `.claude/skills/` > 系統 Skills
