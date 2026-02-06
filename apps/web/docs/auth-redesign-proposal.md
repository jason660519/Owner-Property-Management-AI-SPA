# 使用者身份驗證系統重新設計報告 (Screen Tree & Specs)

> **創建日期**: 2026-02-03
> **創建者**: Trae AI Pair Programmer
> **最後修改**: 2026-02-03
> **修改者**: Claude Opus 4.5
> **版本**: 2.0
> **狀態**: ✅ 已審核 - 準備實施

## 1. 執行摘要 (Executive Summary)

本文件旨在解決現有認證系統中的關鍵缺陷，包括密碼重設連結錯誤、註冊流程異常凍結以及權限管理漏洞。我們將透過重新設計 Screen Tree 與優化後端驗證邏輯，提供一個穩定、安全且流暢的使用者體驗。

### 主要修正目標

1. **密碼重設**: 修正郵件連結導向錯誤，確保使用者能順利完成密碼更新。
2. **註冊優化**: 解決 `signUp` 後的 Race Condition 導致的頁面凍結與資料讀取錯誤。
3. **權限控管**: 強化 Middleware 與 Dashboard 權限檢查，防止未授權存取。
4. **UI/UX 提升**: 在 Dashboard 增加使用者個人選單與頭像顯示。

### 設計決策

- **註冊流程**: 採用「手動登入」方式（註冊成功後導向登入頁面）
- **密碼重設**: 成功後導向登入頁面（而非直接進入 Dashboard）

---

## 2. Screen Tree (頁面結構圖)

```text
App (Root)
├── (Auth) [公開路由 - Public Layout]
│   ├── /login                 # 登入頁
│   ├── /register              # 註冊頁
│   ├── /forgot-password       # 忘記密碼（輸入 Email）
│   ├── /update-password       # 更新密碼頁（點擊信件連結後進入）
│   └── /auth/callback         # [API] 處理 Supabase 驗證回調
│
├── (Protected) [受保護路由 - Dashboard Layout]
│   ├── /landlord/dashboard    # 房東儀表板
│   ├── /tenant/dashboard      # 租客儀表板
│   ├── /agent/dashboard       # 經紀人儀表板
│   ├── (super_admin → 導向 http://localhost:3001/superadmin/dashboard 獨立站)
│   └── /profile               # 個人資料頁（所有角色共用）
│
└── middleware.ts              # 路由守衛 (Route Guard)
```

### 路由規則

| 情境 | 動作 |
|:-----|:-----|
| 未登入 → 訪問 `/landlord/*` | 重定向到 `/login?redirectTo=...` |
| 未登入 → 訪問 `/login` | 顯示登入頁 |
| 已登入 → 訪問 `/login` | 重定向到對應角色的 Dashboard |
| 已登入 → 訪問 `/register` | 重定向到對應角色的 Dashboard |

---

## 3. 核心流程設計 (Flowcharts)

### A. 登入流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         登入流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 用戶訪問 /login                                              │
│     ↓                                                           │
│  2. 輸入 Email + 密碼                                            │
│     ↓                                                           │
│  3. 提交表單 → signInWithPassword()                              │
│     ↓                                                           │
│  4. Supabase 驗證                                                │
│     ├── 失敗 → 顯示錯誤訊息                                       │
│     └── 成功 → 建立 Session                                      │
│                ↓                                                │
│  5. 查詢 users_profile                                          │
│     ├── 找不到 → Self-healing: 自動創建 Profile                   │
│     └── 找到 → 取得 primary_role                                 │
│                ↓                                                │
│  6. 根據角色重定向到對應 Dashboard                                 │
│     • landlord → /landlord/dashboard                            │
│     • tenant → /tenant/dashboard                                │
│     • super_admin → http://localhost:3001/superadmin/dashboard   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### B. 註冊流程（手動登入版）

```
┌─────────────────────────────────────────────────────────────────┐
│                         註冊流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 用戶訪問 /register                                           │
│     ↓                                                           │
│  2. 填寫表單（姓名、Email、密碼、角色）                             │
│     ↓                                                           │
│  3. 提交表單 → Server Action: signUpWithRole()                   │
│     ↓                                                           │
│  4. 後端處理（使用 Admin Client）                                 │
│     a. 檢查用戶是否已存在                                         │
│     b. 創建 auth.users（email_confirm: true）                    │
│     c. 創建 users_profile                                        │
│     d. 等待同步完成（500ms）                                      │
│     ↓                                                           │
│  5. 返回結果                                                     │
│     ├── 失敗 → 顯示錯誤訊息                                       │
│     └── 成功 → 顯示成功訊息                                       │
│                ↓                                                │
│  6. 3 秒後自動跳轉到 /login                                       │
│     ↓                                                           │
│  7. 用戶手動登入                                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### C. 密碼重設流程

```
┌─────────────────────────────────────────────────────────────────┐
│                       密碼重設流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 用戶訪問 /forgot-password                                    │
│     ↓                                                           │
│  2. 輸入 Email                                                   │
│     ↓                                                           │
│  3. 提交 → resetPasswordForEmail()                               │
│     • redirectTo: /auth/callback?next=/update-password          │
│     ↓                                                           │
│  4. Supabase 發送重設郵件                                         │
│     • 本地開發：查看 http://127.0.0.1:54324 (Inbucket)            │
│     ↓                                                           │
│  5. 用戶點擊郵件中的連結                                          │
│     • 連結格式: /auth/callback?code=XXX&next=/update-password    │
│     ↓                                                           │
│  6. /auth/callback 處理                                          │
│     a. 交換 code 取得 Session                                    │
│     b. 根據 next 參數重定向到 /update-password                    │
│     ↓                                                           │
│  7. 用戶在 /update-password 輸入新密碼                            │
│     ↓                                                           │
│  8. 提交 → updateUser({ password })                              │
│     ↓                                                           │
│  9. 成功 → 顯示成功訊息 → 3 秒後跳轉到 /login                      │
│     ↓                                                           │
│  10. 用戶使用新密碼登入                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### D. 登出流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         登出流程                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. 用戶點擊 Dashboard 右上角的「登出」                            │
│     ↓                                                           │
│  2. 呼叫 signOut()                                               │
│     ↓                                                           │
│  3. 清除 Session 和 Cookies                                      │
│     ↓                                                           │
│  4. 重定向到 /login                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 技術規格

### 4.1 API 函數

| 函數 | 用途 | 文件位置 |
|:-----|:-----|:---------|
| `signInWithPassword()` | 登入 | `lib/supabase/auth.ts` |
| `signUpWithRole()` | 註冊（Server Action） | `app/actions/auth.ts` |
| `resetPassword()` | 發送重設密碼郵件 | `lib/supabase/auth.ts` |
| `updatePassword()` | 更新密碼 | `lib/supabase/auth.ts` |
| `signOut()` | 登出 | `lib/supabase/auth.ts` |

### 4.2 頁面組件

| 頁面 | 文件位置 | 功能 |
|:-----|:---------|:-----|
| 登入 | `app/(auth)/login/page.tsx` | Email + 密碼登入 |
| 註冊 | `app/(auth)/register/page.tsx` | 新用戶註冊 |
| 忘記密碼 | `app/(auth)/forgot-password/page.tsx` | 發送重設郵件 |
| 更新密碼 | `app/(auth)/update-password/page.tsx` | 設定新密碼 |
| Auth 回調 | `app/auth/callback/route.ts` | 處理驗證回調 |

### 4.3 UI 組件

| 組件 | 功能 | 狀態 |
|:-----|:-----|:-----|
| `Input` | 表單輸入框（支援密碼顯示/隱藏） | ✅ 已實現 |
| `Button` | 按鈕（支援 loading 狀態） | ✅ 已實現 |
| `Card` | 卡片容器 | ✅ 已實現 |
| `UserNav` | Dashboard 用戶選單 | ❌ 待實現 |

### 4.4 Middleware 規則

```typescript
// 受保護的路由
const protectedRoutes = ['/landlord', '/tenant', '/buyer']; // super_admin 在 3001 獨立站

// 認證相關路由（已登入時應重定向）
const authRoutes = ['/login', '/register', '/forgot-password'];
```

---

## 5. 驗收標準 (Acceptance Criteria)

### 5.1 登入功能

- [ ] 輸入正確帳密可成功登入
- [ ] 輸入錯誤帳密顯示明確錯誤訊息
- [ ] 登入成功後根據角色導向對應 Dashboard
- [ ] 舊帳號若 Profile 缺失，自動修復並登入成功
- [ ] 密碼輸入框有眼睛圖示可切換顯示/隱藏

### 5.2 註冊功能

- [ ] 填寫完整表單可成功註冊
- [ ] 註冊過程無凍結、無錯誤
- [ ] 註冊成功後顯示明確訊息
- [ ] 3 秒後自動跳轉到登入頁面
- [ ] 資料庫 `auth.users` 與 `users_profile` 資料一致
- [ ] 密碼和確認密碼都有眼睛圖示

### 5.3 密碼重設功能

- [ ] 輸入 Email 可收到重設郵件（本地：Inbucket）
- [ ] 郵件連結正確導向 `/update-password`（經由 `/auth/callback`）
- [ ] 可以成功設定新密碼
- [ ] 成功後 3 秒跳轉到登入頁面
- [ ] 可以使用新密碼登入

### 5.4 登出功能

- [ ] 點擊登出可清除 Session
- [ ] 登出後重定向到 /login
- [ ] 登出後無法訪問受保護路由

### 5.5 權限控制

- [ ] 未登入無法訪問 `/landlord/dashboard`（重定向到 /login）
- [ ] 已登入訪問 `/login` 會重定向到 Dashboard
- [ ] 已登入訪問 `/register` 會重定向到 Dashboard

### 5.6 UI/UX

- [ ] Dashboard 右上角顯示用戶頭像和名稱
- [ ] 點擊頭像顯示下拉選單（Profile、Settings、Sign out）
- [ ] 所有表單有適當的載入狀態和錯誤處理

---

## 6. 測試計畫

### 6.1 單元測試

| 測試項目 | 測試內容 |
|:---------|:---------|
| `signInWithPassword` | 驗證登入邏輯、錯誤處理 |
| `signUpWithRole` | 驗證註冊邏輯、Profile 創建 |
| `resetPassword` | 驗證郵件發送、redirectTo 設定 |
| `updatePassword` | 驗證密碼更新邏輯 |
| `signOut` | 驗證登出邏輯 |

### 6.2 整合測試

| 測試流程 | 步驟 |
|:---------|:-----|
| 完整註冊流程 | 註冊 → 跳轉登入 → 登入 → 進入 Dashboard |
| 密碼重設流程 | 忘記密碼 → 收郵件 → 點連結 → 更新密碼 → 登入 |
| 權限測試 | 未登入訪問保護路由 → 重定向 → 登入 → 返回原頁面 |

### 6.3 E2E 測試（Playwright）

```typescript
// 測試案例
test('user can register and login', async ({ page }) => {
  // 註冊
  await page.goto('/register');
  await page.fill('[name="fullName"]', 'Test User');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.fill('[name="confirmPassword"]', 'Password123!');
  await page.click('button[type="submit"]');

  // 等待跳轉到登入頁
  await expect(page).toHaveURL('/login', { timeout: 5000 });

  // 登入
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  // 驗證進入 Dashboard
  await expect(page).toHaveURL('/landlord/dashboard');
});
```

---

## 7. 實施優先順序

| 優先級 | 項目 | 狀態 |
|:-------|:-----|:-----|
| P0 | 修復密碼重設連結導向 | ✅ 已修復 |
| P0 | 修復註冊流程凍結問題 | ✅ 已修復 |
| P0 | 登入 Self-healing 邏輯 | ✅ 已實現 |
| P1 | Middleware 完善（已登入重定向） | 🔄 進行中 |
| P1 | UserNav 組件（用戶選單） | ❌ 待實現 |
| P2 | 單元測試 | ❌ 待實現 |
| P2 | E2E 測試 | ❌ 待實現 |

---

## 8. 修改歷史

| 日期 | 版本 | 修改者 | 修改內容 |
|:-----|:-----|:-------|:---------|
| 2026-02-03 | 1.0 | Trae AI | 初始版本 |
| 2026-02-03 | 2.0 | Claude Opus 4.5 | 修正流程圖、統一採用手動登入、更新驗收標準 |
