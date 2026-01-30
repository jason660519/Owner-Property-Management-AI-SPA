# 🚨 創建檔案前必讀清單

> **創建日期**: 2026-01-31  
> **創建者**: Claude Sonnet 4.5  
> **最後修改**: 2026-01-31  
> **修改者**: Claude Sonnet 4.5  
> **版本**: 1.0  
> **文件類型**: 開發指南

---

## ⚡ 快速檢查（30 秒）

創建任何檔案前，問自己三個問題：

1. ✅ **檔名符合規則嗎？** (PascalCase / camelCase / kebab-case)
2. ✅ **Metadata 加了嗎？** (Markdown) 或 **文件頭部註解加了嗎？** (Code)
3. ✅ **放對位置了嗎？** (apps / docs / packages / backend)

---

## 📝 Markdown 文檔範本

**複製貼上以下內容到新的 .md 檔案開頭：**

```markdown
# 文件標題

> **創建日期**: 2026-01-31  
> **創建者**: Claude Sonnet 4.5  
> **最後修改**: 2026-01-31  
> **修改者**: Claude Sonnet 4.5  
> **版本**: 1.0  
> **文件類型**: 技術文件 / 進度報告 / 開發指南 / API 規格

---

## 內容開始...
```

**必填欄位**：
- 創建日期：YYYY-MM-DD 格式
- 創建者：使用標準 AI 名稱（如 `Claude Sonnet 4.5`）或開發者姓名
- 版本：新檔案使用 `1.0`
- 文件類型：從上述選項中選擇

---

## 💻 TypeScript/JavaScript 檔案範本

**複製貼上以下內容到新的 .ts/.tsx/.js 檔案開頭：**

```typescript
// filepath: apps/web/xxx/ComponentName.tsx
/**
 * @file ComponentName.tsx
 * @description 簡短描述這個檔案的用途
 * @created 2026-01-31
 * @creator Claude Sonnet 4.5
 * @lastModified 2026-01-31
 * @modifiedBy Claude Sonnet 4.5
 * @version 1.0
 */

// 你的程式碼開始...
```

**必填欄位**：
- `filepath`: 完整的相對路徑
- `@file`: 檔案名稱
- `@description`: 簡短描述（一句話）
- `@created`: YYYY-MM-DD 格式
- `@creator`: 使用標準 AI 名稱或開發者姓名

---

## 🐍 Python 檔案範本

**複製貼上以下內容到新的 .py 檔案開頭：**

```python
"""
模組名稱

創建日期: 2026-01-31
創建者: Claude Sonnet 4.5
最後修改: 2026-01-31
修改者: Claude Sonnet 4.5
版本: 1.0
"""

# 你的程式碼開始...
```

---

## 📂 檔案命名規則速查表

| 檔案類型 | 命名規則 | ✅ 正確範例 | ❌ 錯誤範例 |
|---------|---------|-----------|-----------|
| **React Component** | PascalCase.tsx | `UserProfile.tsx` | `userProfile.tsx` |
| **React Hook** | camelCase.ts | `useAuth.ts` | `UseAuth.ts` |
| **Utility Function** | camelCase.ts | `formatDate.ts` | `FormatDate.ts` |
| **資料夾** | kebab-case | `user-profiles/` | `userProfiles/` |
| **Markdown 文檔** | kebab-case.md | `api-guide.md` | `API_Guide.md` |
| **帶日期文檔** | 類型_YYYY-MM-DD.md | `進度報告_2026-01-31.md` | `2026-01-31-report.md` |
| **圖片資源** | snake_case.png | `logo_main.png` | `logoMain.png` |
| **Migration** | YYYYMMDDHHmmss_name.sql | `20260131120000_init.sql` | `init-db.sql` |

---

## 🗂️ 檔案歸檔位置指南

### ✅ 正確的歸檔位置

```
📁 apps/web/
├── app/                    # Next.js 路由頁面
├── components/             # UI 組件
├── hooks/                  # Custom Hooks
├── lib/                    # 工具函數、API Client
└── types/                  # TypeScript 型別

📁 apps/mobile/
├── src/
│   ├── components/         # React Native 組件
│   ├── screens/            # 畫面
│   └── lib/                # 工具函數

📁 backend/
└── ocr_service/
    ├── src/                # Python 程式碼
    └── tests/              # 測試檔案

📁 docs/                    # 所有文檔的家
├── roadmap/                # 專案規劃
├── progress-reports/       # 進度報告
├── 專案架構說明/           # 架構文件
└── 開發環境+測試環境+上線部署指南/

📁 supabase/
└── migrations/             # SQL 遷移檔案
```

### ❌ 禁止的操作

- ❌ 在專案根目錄創建 `.md` 文檔（除了 README.md、CONTRIBUTING.md）
- ❌ 在專案根目錄創建測試或臨時檔案（如 `test.js`, `temp.md`）
- ❌ 使用中文命名程式碼檔案或資料夾

---

## 🎯 AI 協作者標準名稱

在 Metadata 或註解中使用以下標準名稱：

| AI 模型 | 標準識別名稱 | Git Commit 前綴 |
|---------|------------|----------------|
| Claude Opus 4.5 | `Claude Opus 4.5` | `[Claude]` |
| Claude Sonnet 4.5 | `Claude Sonnet 4.5` | `[Claude]` |
| Gemini 2.5 Pro | `Gemini 2.5 Pro` | `[Gemini]` |
| GPT-4o | `GPT-4o` | `[GPT-4]` |
| DeepSeek V3 | `DeepSeek V3` | `[DeepSeek]` |

---

## 🔍 自我檢查清單

創建檔案後，花 30 秒檢查：

- [ ] **檔名**：符合 PascalCase / camelCase / kebab-case 規則？
- [ ] **Metadata**：Markdown 文檔有完整的 Metadata 嗎？
- [ ] **文件頭部註解**：程式碼檔案有 `@creator` 和 `@created` 嗎？
- [ ] **創建者名稱**：使用標準 AI 名稱（如 `Claude Sonnet 4.5`）？
- [ ] **檔案位置**：放在正確的 Monorepo 目錄中？
- [ ] **filepath 註解**：TypeScript 檔案有 `// filepath: ...` 嗎？

---

## 📚 完整規範參考

- **詳細規範**：[docs/本專案檔案命名規則與新增文件歸檔總則.md](docs/本專案檔案命名規則與新增文件歸檔總則.md)
- **AI 協作指南**：[CLAUDE.md](CLAUDE.md)

---

## ⚠️ 重要提醒

> **5 分鐘的格式檢查，可以節省未來 50 分鐘的問題排查時間。**

遵守規範不是負擔，而是團隊協作的基礎！

---

**最後更新**: 2026-01-31  
**維護者**: Claude Sonnet 4.5
