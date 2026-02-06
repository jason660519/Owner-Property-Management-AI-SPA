# 測試檔案統一管理規範

> **創建日期**: 2026-02-06
> **創建者**: Claude Opus 4.5
> **最後修改**: 2026-02-06
> **修改者**: Claude Opus 4.5
> **版本**: 1.0
> **適用範圍**: Owner-Property-Management-AI-SPA 全專案

---

## 目錄

1. [概述](#1-概述)
2. [測試類型定義](#2-測試類型定義)
3. [資料夾結構規範](#3-資料夾結構規範)
4. [命名規範](#4-命名規範)
5. [路徑規則表](#5-路徑規則表)
6. [現況分析與問題](#6-現況分析與問題)
7. [遷移計畫](#7-遷移計畫)
8. [版本控制與維護流程](#8-版本控制與維護流程)
9. [CI/CD 整合](#9-cicd-整合)
10. [檢查清單](#10-檢查清單)

---

## 1. 概述

### 1.1 目的

本規範旨在統一專案中所有測試檔案的組織方式，確保：
- 測試檔案易於查找和維護
- 測試與原始碼有清晰的對應關係
- 新開發人員能快速理解測試結構
- CI/CD 流程能正確執行所有測試

### 1.2 技術堆疊

| 測試類型 | 框架/工具 | 配置檔 |
|:---------|:----------|:-------|
| 單元測試 | Jest + React Testing Library | `jest.config.js` |
| 整合測試 | Jest + Supabase Mock | `jest.config.js` |
| E2E 測試 | Playwright | `playwright.config.ts` |
| API 測試 | Jest + MSW (建議) | `jest.config.js` |

### 1.3 適用範圍

```
monorepo/
├── apps/web/          ✅ 主要測試範圍
├── apps/mobile/       ⏸️ 已暫停（保留基本測試）
├── packages/ui/       ✅ 需建立測試
├── packages/utils/    ✅ 需建立測試
└── backend/           ⚠️ Python 測試（另行規範）
```

---

## 2. 測試類型定義

### 2.1 測試金字塔

```
                    ┌─────────────┐
                    │    E2E      │  ← 少量，覆蓋關鍵流程
                    │  (12 tests) │
                ┌───┴─────────────┴───┐
                │     Integration     │  ← 中等，測試模組協作
                │     (8 tests)       │
            ┌───┴─────────────────────┴───┐
            │         Unit Tests          │  ← 大量，測試獨立單元
            │         (22 tests)          │
            └─────────────────────────────┘
```

### 2.2 測試類型說明

| 類型 | 副檔名 | 目的 | 執行速度 | 隔離程度 |
|:-----|:-------|:-----|:---------|:---------|
| **單元測試** | `.test.ts(x)` | 測試獨立函數/Hook/組件 | 快 (ms) | 完全隔離 |
| **整合測試** | `.integration.test.ts(x)` | 測試多模組協作 | 中 (s) | 部分隔離 |
| **E2E 測試** | `.spec.ts` | 測試完整用戶流程 | 慢 (min) | 無隔離 |

---

## 3. 資料夾結構規範

### 3.1 採用策略：Colocated + 集中式混合

**原則**：測試檔案盡量靠近被測試的原始碼，E2E 測試集中管理。

### 3.2 標準目錄結構

```
apps/web/
├── __tests__/                          # 🔴 廢棄（遷移後刪除）
│
├── app/                                # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   │   ├── page.tsx
│   │   │   └── __tests__/
│   │   │       └── page.test.tsx       # ✅ 頁面測試
│   │   └── register/
│   │       ├── page.tsx
│   │       └── __tests__/
│   │           └── page.test.tsx
│   ├── api/
│   │   └── auth/
│   │       ├── route.ts
│   │       └── __tests__/
│   │           └── route.test.ts       # ✅ API 路由測試
│   └── landlord/
│       └── dashboard/
│           ├── page.tsx
│           └── __tests__/
│               └── page.test.tsx
│
├── components/                         # React 組件
│   ├── ui/
│   │   ├── Button/
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── __tests__/
│   │   │       └── Button.test.tsx     # ✅ 組件測試
│   │   └── Input/
│   │       ├── Input.tsx
│   │       └── __tests__/
│   │           └── Input.test.tsx
│   └── property/
│       ├── PhotoUpload/
│       │   ├── PhotoUpload.tsx
│       │   └── __tests__/
│       │       └── PhotoUpload.test.tsx
│       └── PropertyCard/
│           ├── PropertyCard.tsx
│           └── __tests__/
│               └── PropertyCard.test.tsx
│
├── hooks/                              # React Hooks
│   ├── useAuth/
│   │   ├── useAuth.ts
│   │   └── __tests__/
│   │       └── useAuth.test.ts         # ✅ Hook 測試
│   └── useFormDraft/
│       ├── useFormDraft.ts
│       └── __tests__/
│           └── useFormDraft.test.ts
│
├── lib/                                # 工具函數與服務
│   ├── supabase/
│   │   ├── auth.ts
│   │   ├── client.ts
│   │   └── __tests__/
│   │       ├── auth.test.ts            # ✅ 服務測試
│   │       └── client.test.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   └── __tests__/
│   │       └── formatters.test.ts      # ✅ 工具函數測試
│   └── validators/
│       ├── auth.validator.ts
│       └── __tests__/
│           └── auth.validator.test.ts
│
├── actions/                            # Server Actions
│   ├── auth.ts
│   ├── contact.ts
│   └── __tests__/
│       ├── auth.test.ts                # ✅ Server Action 測試
│       └── contact.test.ts
│
├── e2e/                                # 🎭 E2E 測試（集中管理）
│   ├── flows/                          # 用戶流程測試
│   │   ├── auth/
│   │   │   ├── login.spec.ts
│   │   │   ├── register.spec.ts
│   │   │   └── password-reset.spec.ts
│   │   ├── landlord/
│   │   │   ├── add-property.spec.ts
│   │   │   └── photo-upload.spec.ts
│   │   └── admin/
│   │       └── user-management.spec.ts
│   ├── fixtures/                       # 測試固定資料
│   │   ├── users.json
│   │   └── properties.json
│   ├── utils/                          # E2E 工具函數
│   │   ├── auth.helper.ts
│   │   └── test.utils.ts
│   └── global-setup.ts                 # 全域設置
│
├── __mocks__/                          # 全域 Mock
│   ├── supabase.ts
│   ├── next-navigation.ts
│   └── nodemailer.ts
│
├── jest.config.js                      # Jest 配置
├── jest.setup.js                       # Jest 全域設置
└── playwright.config.ts                # Playwright 配置

packages/ui/
├── src/
│   ├── Button/
│   │   ├── Button.tsx
│   │   └── __tests__/
│   │       └── Button.test.tsx
│   └── index.ts
├── jest.config.js
└── package.json

packages/utils/
├── src/
│   ├── date/
│   │   ├── formatDate.ts
│   │   └── __tests__/
│   │       └── formatDate.test.ts
│   └── index.ts
├── jest.config.js
└── package.json
```

### 3.3 目錄命名規則

| 目錄類型 | 命名規則 | 範例 |
|:---------|:---------|:-----|
| 測試目錄 | `__tests__` | `components/ui/__tests__/` |
| E2E 目錄 | `e2e` | `apps/web/e2e/` |
| Mock 目錄 | `__mocks__` | `apps/web/__mocks__/` |
| Fixture 目錄 | `fixtures` | `e2e/fixtures/` |

---

## 4. 命名規範

### 4.1 測試檔案命名

| 測試類型 | 命名模式 | 範例 |
|:---------|:---------|:-----|
| 單元測試 | `{SourceName}.test.ts(x)` | `Button.test.tsx` |
| 整合測試 | `{SourceName}.integration.test.ts(x)` | `auth.integration.test.ts` |
| E2E 測試 | `{feature-name}.spec.ts` | `login.spec.ts` |
| Hook 測試 | `{hookName}.test.ts` | `useAuth.test.ts` |
| API 測試 | `route.test.ts` | `route.test.ts` |

### 4.2 測試描述命名

```typescript
// ✅ 推薦：使用中文描述，清楚表達測試意圖
describe('LoginPage', () => {
  describe('表單驗證', () => {
    test('應該在 email 格式錯誤時顯示錯誤訊息', () => {});
    test('應該在密碼少於 8 字元時顯示錯誤訊息', () => {});
  });

  describe('登入流程', () => {
    test('應該在登入成功後重定向到 dashboard', () => {});
    test('應該在登入失敗時顯示錯誤訊息', () => {});
  });
});

// ❌ 避免：模糊不清的描述
describe('LoginPage', () => {
  test('test 1', () => {});
  test('works correctly', () => {});
});
```

### 4.3 E2E 測試命名

```typescript
// ✅ 推薦：描述用戶流程
// e2e/flows/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('登入流程', () => {
  test('使用者可以使用有效憑證登入', async ({ page }) => {});
  test('使用者在輸入錯誤密碼時看到錯誤訊息', async ({ page }) => {});
  test('使用者可以使用「記住我」功能保持登入狀態', async ({ page }) => {});
});
```

---

## 5. 路徑規則表

### 5.1 原始碼與測試對應關係

| 原始碼路徑 | 測試檔案路徑 |
|:-----------|:-------------|
| `app/(auth)/login/page.tsx` | `app/(auth)/login/__tests__/page.test.tsx` |
| `components/ui/Button.tsx` | `components/ui/Button/__tests__/Button.test.tsx` |
| `components/property/PhotoUpload.tsx` | `components/property/PhotoUpload/__tests__/PhotoUpload.test.tsx` |
| `hooks/useAuth.ts` | `hooks/useAuth/__tests__/useAuth.test.ts` |
| `lib/supabase/auth.ts` | `lib/supabase/__tests__/auth.test.ts` |
| `lib/utils/formatters.ts` | `lib/utils/__tests__/formatters.test.ts` |
| `actions/auth.ts` | `actions/__tests__/auth.test.ts` |
| `app/api/auth/route.ts` | `app/api/auth/__tests__/route.test.ts` |

### 5.2 E2E 測試路徑規則

| 功能模組 | E2E 測試路徑 |
|:---------|:-------------|
| 認證流程 | `e2e/flows/auth/*.spec.ts` |
| 房東功能 | `e2e/flows/landlord/*.spec.ts` |
| 租客功能 | `e2e/flows/tenant/*.spec.ts` |
| 管理員功能（主站導向） | `e2e/flows/admin/*.spec.ts`（主站 `/admin` 導向 3001）；超級管理員完整流程於 `apps/superadmin`，可另建 `e2e/flows/superadmin/*.spec.ts` 指向 http://localhost:3001） |
| 公共頁面 | `e2e/flows/public/*.spec.ts` |

### 5.3 Packages 測試路徑

| Package | 測試路徑模式 |
|:--------|:-------------|
| `packages/ui` | `packages/ui/src/{ComponentName}/__tests__/{ComponentName}.test.tsx` |
| `packages/utils` | `packages/utils/src/{category}/__tests__/{utilName}.test.ts` |

---

## 6. 現況分析與問題

### 6.1 現有測試統計

| 類別 | 數量 | 位置 |
|:-----|:-----|:-----|
| 單元/整合測試 | 17 | `apps/web/__tests__/` |
| Colocated 測試 | 2 | `components/`, `hooks/` |
| E2E 測試 | 12 | `apps/web/e2e/` |
| Packages 測試 | 0 | - |
| **總計** | **31** | - |

### 6.2 發現的問題

#### 問題 1：重複的測試檔案 🔴 高優先

```
重複檔案對：
├── __tests__/auth/components/LoginPage.test.tsx
└── __tests__/components/pages/LoginPage.test.tsx  ← 重複

├── __tests__/auth/components/RegisterPage.test.tsx
└── __tests__/components/pages/RegisterPage.test.tsx  ← 重複

├── __tests__/auth/components/ForgotPasswordPage.test.tsx
└── __tests__/components/pages/ForgotPasswordPage.test.tsx  ← 重複
```

**影響**：測試可能執行兩次，維護成本增加

#### 問題 2：測試目錄結構不一致 🟡 中優先

```
目前混用兩種模式：
├── __tests__/ (集中式) ← 17 個測試
└── components/**/__tests__/ (colocated) ← 2 個測試
```

**影響**：查找測試檔案困難，新成員容易混淆

#### 問題 3：Packages 缺少測試 🟡 中優先

```
packages/
├── ui/      ← 無測試
└── utils/   ← 無測試
```

**影響**：共用模組品質無法保證

#### 問題 4：E2E 測試檔案命名不一致 🟢 低優先

```
e2e/
├── test-login.spec.ts       ← 有 test- 前綴
├── add-property.spec.ts     ← 無前綴
└── landlord-add-property.spec.ts  ← 有角色前綴
```

**影響**：難以從檔名判斷測試範圍

---

## 7. 遷移計畫

### 7.1 遷移總覽

```
Phase 1 (Week 1): 清理重複檔案 + 建立新結構
Phase 2 (Week 2): 遷移現有測試檔案
Phase 3 (Week 3): 建立 Packages 測試 + E2E 重組
Phase 4 (Week 4): 驗證 + 文檔更新
```

### 7.2 Phase 1：清理與準備（第 1 週）

#### Step 1.1：識別並刪除重複測試

```bash
# 比較重複檔案內容
diff apps/web/__tests__/auth/components/LoginPage.test.tsx \
     apps/web/__tests__/components/pages/LoginPage.test.tsx

# 保留較完整的版本，刪除重複
rm apps/web/__tests__/components/pages/LoginPage.test.tsx
rm apps/web/__tests__/components/pages/RegisterPage.test.tsx
rm apps/web/__tests__/components/pages/ForgotPasswordPage.test.tsx
```

#### Step 1.2：建立新目錄結構

```bash
# 在各模組下建立 __tests__ 目錄
mkdir -p apps/web/app/\(auth\)/login/__tests__
mkdir -p apps/web/app/\(auth\)/register/__tests__
mkdir -p apps/web/lib/supabase/__tests__
mkdir -p apps/web/lib/validators/__tests__
mkdir -p apps/web/actions/__tests__
mkdir -p apps/web/e2e/flows/auth
mkdir -p apps/web/e2e/flows/landlord
mkdir -p apps/web/e2e/fixtures
mkdir -p apps/web/e2e/utils
```

### 7.3 Phase 2：遷移測試檔案（第 2 週）

#### 遷移對照表

| 原始位置 | 目標位置 |
|:---------|:---------|
| `__tests__/auth/components/LoginPage.test.tsx` | `app/(auth)/login/__tests__/page.test.tsx` |
| `__tests__/auth/components/RegisterPage.test.tsx` | `app/(auth)/register/__tests__/page.test.tsx` |
| `__tests__/auth/components/ForgotPasswordPage.test.tsx` | `app/(auth)/forgot-password/__tests__/page.test.tsx` |
| `__tests__/auth/components/UpdatePasswordPage.test.tsx` | `app/(auth)/update-password/__tests__/page.test.tsx` |
| `__tests__/auth/components/InviteUserModal.test.tsx` | `components/admin/__tests__/InviteUserModal.test.tsx` |
| `__tests__/auth/services/auth.service.test.ts` | `lib/supabase/__tests__/auth.service.test.ts` |
| `__tests__/auth/validators/auth.validator.test.ts` | `lib/validators/__tests__/auth.validator.test.ts` |
| `__tests__/lib/supabase/auth.test.ts` | `lib/supabase/__tests__/auth.test.ts` |
| `__tests__/app/actions/auth.test.ts` | `actions/__tests__/auth.test.ts` |
| `__tests__/app/actions/contact.test.ts` | `actions/__tests__/contact.test.ts` |
| `__tests__/admin/users/actions.test.ts` | `app/admin/users/__tests__/actions.test.ts`（主站）；超級管理員同功能於 `apps/superadmin/app/superadmin/users/actions.ts` |
| `__tests__/landlord/add-property.test.tsx` | `app/landlord/add-property/__tests__/page.test.tsx` |
| `__tests__/components/ui/UserNav.test.tsx` | `components/ui/UserNav/__tests__/UserNav.test.tsx` |

#### 遷移腳本

```bash
#!/bin/bash
# scripts/migrate-tests.sh

set -e

WEB_DIR="apps/web"

echo "🚀 開始遷移測試檔案..."

# 1. 頁面測試遷移
echo "📦 遷移頁面測試..."
mv "$WEB_DIR/__tests__/auth/components/LoginPage.test.tsx" \
   "$WEB_DIR/app/(auth)/login/__tests__/page.test.tsx"

mv "$WEB_DIR/__tests__/auth/components/RegisterPage.test.tsx" \
   "$WEB_DIR/app/(auth)/register/__tests__/page.test.tsx"

# ... 其他遷移命令

# 2. 更新 import 路徑
echo "🔄 更新 import 路徑..."
find "$WEB_DIR" -name "*.test.ts" -o -name "*.test.tsx" | \
  xargs sed -i '' 's|@/app/\(auth\)/login/page|../page|g'

# 3. 執行測試驗證
echo "✅ 驗證測試..."
cd "$WEB_DIR" && npm test

echo "🎉 遷移完成！"
```

### 7.4 Phase 3：建立新測試（第 3 週）

#### Packages 測試建立

```bash
# packages/ui 測試設置
cd packages/ui
npm install -D jest @testing-library/react @testing-library/jest-dom

# 建立 jest.config.js
cat > jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
EOF
```

#### E2E 測試重組

```bash
# 重新組織 E2E 測試
mkdir -p apps/web/e2e/flows/{auth,landlord,tenant,admin,public}

# 遷移並重命名
mv e2e/test-login.spec.ts e2e/flows/auth/login.spec.ts
mv e2e/password-reset-flow.spec.ts e2e/flows/auth/password-reset.spec.ts
mv e2e/add-property.spec.ts e2e/flows/landlord/add-property.spec.ts
mv e2e/property-photo-upload.spec.ts e2e/flows/landlord/photo-upload.spec.ts
```

### 7.5 Phase 4：驗證與文檔（第 4 週）

```bash
# 1. 執行所有測試
npm run test
npm run test:e2e

# 2. 檢查覆蓋率
npm run test:coverage

# 3. 驗證 CI 流程
git push origin feature/test-migration

# 4. 更新文檔
# - 更新 README.md 測試章節
# - 更新 CONTRIBUTING.md
# - 歸檔本規範文件
```

---

## 8. 版本控制與維護流程

### 8.1 測試檔案的 Git 規範

#### Commit 訊息格式

```bash
# 新增測試
git commit -m "test(auth): add login page validation tests"

# 修改測試
git commit -m "test(property): fix flaky photo upload test"

# 重構測試
git commit -m "refactor(tests): migrate to colocated structure"
```

#### Branch 命名

```bash
# 測試相關分支
test/add-login-validation-tests
test/fix-flaky-e2e-tests
test/migrate-to-colocated-structure
```

### 8.2 測試維護 SOP

#### 每日維護

```yaml
觸發條件: CI 測試失敗
負責人: 當日值班開發者
流程:
  1. 檢視失敗的測試報告
  2. 判斷是 Flaky Test 還是真正的 Bug
  3. Flaky Test → 標記 @retry 或修復
  4. 真正 Bug → 開 Issue 追蹤
```

#### 每週維護

```yaml
觸發條件: 每週五下午
負責人: Tech Lead
流程:
  1. 審查測試覆蓋率報告
  2. 識別覆蓋率低的模組
  3. 建立下週測試任務
  4. 清理過時的測試
```

#### 每月維護

```yaml
觸發條件: 每月第一週
負責人: QA / Tech Lead
流程:
  1. 審查測試執行時間趨勢
  2. 優化慢速測試
  3. 更新測試框架版本
  4. 審查並更新 Mock 資料
```

### 8.3 測試品質指標

| 指標 | 目標 | 當前值 | 狀態 |
|:-----|:-----|:-------|:-----|
| 單元測試覆蓋率 | ≥ 80% | TBD | 🟡 |
| E2E 關鍵流程覆蓋 | 100% | ~70% | 🟡 |
| Flaky Test 比例 | < 2% | TBD | 🟡 |
| 測試執行時間 (Unit) | < 30s | ~3s | 🟢 |
| 測試執行時間 (E2E) | < 5min | TBD | 🟡 |

---

## 9. CI/CD 整合

### 9.1 GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    name: Unit & Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage
        working-directory: apps/web

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: apps/web/coverage/lcov.info

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: unit-tests
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        working-directory: apps/web
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}

      - name: Upload test artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/web/playwright-report/
```

### 9.2 Pre-commit Hook 配置

```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# 只對變更的測試相關檔案執行測試
CHANGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(test|spec)\.(ts|tsx)$')

if [ -n "$CHANGED_FILES" ]; then
  echo "🧪 Running tests for changed files..."
  npm run test -- --findRelatedTests $CHANGED_FILES
fi
```

### 9.3 Jest 配置更新

```javascript
// apps/web/jest.config.js
module.exports = {
  testEnvironment: 'jest-environment-jsdom',

  // 更新測試匹配模式以支援 colocated 結構
  testMatch: [
    '<rootDir>/**/__tests__/**/*.test.{ts,tsx}',
    '<rootDir>/**/*.test.{ts,tsx}',
  ],

  // 排除 E2E 測試
  testPathIgnorePatterns: [
    '/node_modules/',
    '/e2e/',
    '/.next/',
  ],

  // 覆蓋率配置
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'actions/**/*.{ts,tsx}',
    '!**/__tests__/**',
    '!**/*.d.ts',
  ],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 80,
      statements: 80,
    },
  },

  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

### 9.4 Playwright 配置更新

```typescript
// apps/web/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // 更新測試目錄結構
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // 並行執行
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,

  // 報告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['github'], // GitHub Actions 整合
  ],

  // 全域設置
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // 測試專案配置
  projects: [
    // 桌面瀏覽器
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },

    // 行動裝置
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
  ],

  // 開發伺服器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## 10. 檢查清單

### 10.1 新增測試檔案檢查清單

```markdown
## 新增測試檔案 Checklist

### 檔案位置
- [ ] 測試檔案放在被測試檔案同目錄的 `__tests__/` 下
- [ ] E2E 測試放在 `e2e/flows/{module}/` 下

### 命名規範
- [ ] 單元測試使用 `.test.ts(x)` 後綴
- [ ] E2E 測試使用 `.spec.ts` 後綴
- [ ] 檔名與被測試檔案對應

### 測試內容
- [ ] describe 區塊使用中文清楚描述測試範圍
- [ ] test 區塊使用「應該...」格式描述期望行為
- [ ] 包含正向與負向測試案例
- [ ] 包含邊界條件測試

### Mock 配置
- [ ] 使用 `jest.setup.js` 中的全域 Mock
- [ ] 特定 Mock 放在測試檔案內或 `__mocks__/` 目錄

### 驗證
- [ ] 本地測試通過
- [ ] CI 測試通過
- [ ] 覆蓋率未下降
```

### 10.2 遷移完成檢查清單

```markdown
## 測試遷移完成 Checklist

### Phase 1：清理
- [ ] 刪除 `__tests__/components/pages/LoginPage.test.tsx`
- [ ] 刪除 `__tests__/components/pages/RegisterPage.test.tsx`
- [ ] 刪除 `__tests__/components/pages/ForgotPasswordPage.test.tsx`

### Phase 2：遷移
- [ ] 頁面測試遷移至 `app/*/__tests__/`
- [ ] 組件測試遷移至 `components/*/__tests__/`
- [ ] Hook 測試遷移至 `hooks/*/__tests__/`
- [ ] 工具函數測試遷移至 `lib/*/__tests__/`
- [ ] Server Action 測試遷移至 `actions/__tests__/`

### Phase 3：新建
- [ ] `packages/ui` 測試建立
- [ ] `packages/utils` 測試建立
- [ ] E2E 測試重組至 `e2e/flows/`

### Phase 4：驗證
- [ ] 所有單元測試通過
- [ ] 所有 E2E 測試通過
- [ ] CI/CD 流程正常
- [ ] 文檔已更新

### 清理
- [ ] 刪除空的 `__tests__/` 目錄
- [ ] 更新 `.gitignore`（如需要）
- [ ] 更新 `jest.config.js`
- [ ] 更新 `playwright.config.ts`
```

### 10.3 Code Review 測試檢查清單

```markdown
## PR 測試 Review Checklist

### 測試存在性
- [ ] 新功能有對應的單元測試
- [ ] Bug 修復有回歸測試
- [ ] 關鍵流程有 E2E 測試

### 測試品質
- [ ] 測試描述清楚表達測試目的
- [ ] 測試獨立，不依賴執行順序
- [ ] Mock 合理，不過度 Mock

### 測試位置
- [ ] 測試檔案放在正確位置
- [ ] 命名符合規範

### CI 結果
- [ ] 所有測試通過
- [ ] 覆蓋率未下降
- [ ] 無新增 Flaky Test
```

---

## 附錄

### A. 常用測試模式範例

#### A.1 React 組件測試

```typescript
// components/ui/Button/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  describe('渲染', () => {
    test('應該正確渲染按鈕文字', () => {
      render(<Button>點擊我</Button>);
      expect(screen.getByRole('button', { name: '點擊我' })).toBeInTheDocument();
    });

    test('應該套用 primary variant 樣式', () => {
      render(<Button variant="primary">Primary</Button>);
      expect(screen.getByRole('button')).toHaveClass('primary');
    });
  });

  describe('互動', () => {
    test('應該在點擊時觸發 onClick', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click</Button>);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    test('應該在 disabled 時不觸發 onClick', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled</Button>);

      fireEvent.click(screen.getByRole('button'));

      expect(handleClick).not.toHaveBeenCalled();
    });
  });
});
```

#### A.2 Hook 測試

```typescript
// hooks/useAuth/__tests__/useAuth.test.ts
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('應該回傳初始未登入狀態', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  test('應該在登入後更新狀態', async () => {
    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await result.current.login('test@example.com', 'password');
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user?.email).toBe('test@example.com');
  });
});
```

#### A.3 Server Action 測試

```typescript
// actions/__tests__/auth.test.ts
import { signIn, signOut } from '../auth';
import { createClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server');

describe('Auth Actions', () => {
  const mockSupabase = {
    auth: {
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
  };

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('signIn', () => {
    test('應該在登入成功時回傳 user', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '1', email: 'test@example.com' } },
        error: null,
      });

      const result = await signIn({ email: 'test@example.com', password: 'password' });

      expect(result.user).toEqual({ id: '1', email: 'test@example.com' });
      expect(result.error).toBeNull();
    });

    test('應該在登入失敗時回傳錯誤', async () => {
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid credentials' },
      });

      const result = await signIn({ email: 'test@example.com', password: 'wrong' });

      expect(result.user).toBeNull();
      expect(result.error).toBe('Invalid credentials');
    });
  });
});
```

#### A.4 E2E 測試

```typescript
// e2e/flows/auth/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('登入流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('應該顯示登入表單', async ({ page }) => {
    await expect(page.getByLabel('電子郵件')).toBeVisible();
    await expect(page.getByLabel('密碼')).toBeVisible();
    await expect(page.getByRole('button', { name: '登入' })).toBeVisible();
  });

  test('應該在輸入錯誤憑證時顯示錯誤', async ({ page }) => {
    await page.getByLabel('電子郵件').fill('invalid@example.com');
    await page.getByLabel('密碼').fill('wrongpassword');
    await page.getByRole('button', { name: '登入' }).click();

    await expect(page.getByText(/登入失敗|Invalid/i)).toBeVisible();
  });

  test('應該在登入成功後導向 dashboard', async ({ page }) => {
    await page.getByLabel('電子郵件').fill(process.env.TEST_USER_EMAIL!);
    await page.getByLabel('密碼').fill(process.env.TEST_USER_PASSWORD!);
    await page.getByRole('button', { name: '登入' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
  });
});
```

---

### B. 相關文件

| 文件 | 路徑 | 說明 |
|:-----|:-----|:-----|
| 檔案命名規則 | `docs/本專案檔案命名規則與新增文件歸檔總則.md` | 通用命名規範 |
| Jest 配置 | `apps/web/jest.config.js` | 單元測試配置 |
| Playwright 配置 | `apps/web/playwright.config.ts` | E2E 測試配置 |
| CI 配置 | `.github/workflows/test.yml` | GitHub Actions 配置 |

---

## 修訂記錄

| 日期 | 版本 | 修改者 | 修改內容 |
|:-----|:-----|:-------|:---------|
| 2026-02-06 | 1.0 | Claude Opus 4.5 | 初版建立 |
