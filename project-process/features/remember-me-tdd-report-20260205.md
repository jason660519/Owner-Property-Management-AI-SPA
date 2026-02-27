# 「記住我」功能 TDD 開發報告 - 2026/02/05

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`remember-me-tdd-report-20260205.html`

---

# 「記住我」功能 TDD 開發報告

2026-02-05 | Claude Sonnet 4.5

## 📊 執行摘要

100%
Bug 修復完成度

7/7
測試通過率

4
新增單元測試

TDD
開發方法論

## 🛠️ 技術堆疊與工具

TDD
Jest
React Testing Library
React Hook Form
TypeScript
localStorage API
useEffect Hook
useState Hook

### 核心技術

- • Next.js 14 (App Router)

- • React 18 with Hooks

- • TypeScript 5.x

- • Zod Schema Validation

### 測試工具

- • Jest 29.x (測試框架)

- • @testing-library/react (組件測試)

- • @testing-library/user-event (用戶交互模擬)

- • @testing-library/jest-dom (斷言擴展)

## 🐛 問題描述

### Bug 報告

問題: 登入頁面的「記住我」功能只能記住第一次輸入的密碼，無法記住後續更改的密碼

影響: 使用者體驗不佳，當用戶修改密碼後，下次訪問登入頁面時仍顯示舊密碼

### 根本原因分析

- 只儲存 Email: 原實作只儲存了 `rememberedEmail`，沒有儲存密碼

- 表單狀態管理不完整: useEffect 載入時只設定 email 值，密碼欄位保持空白

- 缺少更新機制: 沒有在登入成功後更新 localStorage 中的密碼

- 缺少測試覆蓋: 沒有針對「記住我」功能的單元測試，導致問題未被及早發現

### 原始問題代碼

```
// ❌ 原始實作 - 有問題的代碼
useEffect(() => {
const savedEmail = localStorage.getItem('rememberedEmail');
if (savedEmail) {
setValue('email', savedEmail);
setValue('rememberMe', true);
}
// ❌ 問題: 沒有讀取和設定密碼
}, [setValue]);

// ❌ 只儲存 Email
if (data.rememberMe) {
localStorage.setItem('rememberedEmail', data.email);
// ❌ 問題: 沒有儲存密碼
} else {
localStorage.removeItem('rememberedEmail');
// ❌ 問題: 沒有移除密碼
}
```

## 🔬 TDD 開發方法論

### 什麼是 TDD？

TDD (Test-Driven Development，測試驅動開發) 是一種軟體開發方法，要求在編寫實際代碼之前先編寫測試。
這種方法遵循 紅-綠-重構 循環。

### TDD 三階段循環

1

#### 紅燈 (Red)

編寫一個失敗的測試，明確定義期望的行為

2

#### 綠燈 (Green)

編寫最小可行代碼，使測試通過

3

#### 重構 (Refactor)

優化代碼，保持測試通過

### 本次開發流程

1

編寫測試案例

定義 4 個測試場景，涵蓋儲存、載入、更新、清除功能

2

實作功能代碼

修改 LoginPage 組件，添加 password 的儲存和載入邏輯

3

驗證測試通過

執行測試套件，確認所有測試案例通過 (7/7)

4

手動驗證

在瀏覽器中實際測試功能，確保用戶體驗符合預期

## 🧪 測試案例設計

### 測試 1: 儲存功能

通過 ✓

描述: 勾選「記住我」checkbox 並登入後，email 和 password 應該被儲存到 localStorage

斷言:

- • `localStorage.getItem('rememberedEmail')` 返回輸入的 email

- • `localStorage.getItem('rememberedPassword')` 返回輸入的 password

### 測試 2: 清除功能

通過 ✓

描述: 取消勾選「記住我」並登入後，localStorage 中的資料應該被清除

斷言:

- • `localStorage.getItem('rememberedEmail')` 返回 null

- • `localStorage.getItem('rememberedPassword')` 返回 null

### 測試 3: 自動填入功能

通過 ✓

描述: 當 localStorage 中有儲存的資料時，重新載入頁面應該自動填入表單

斷言:

- • Email 輸入框的值為儲存的 email

- • Password 輸入框的值為儲存的 password

- • 「記住我」checkbox 為勾選狀態

### 測試 4: 密碼更新功能

通過 ✓

描述: 使用已儲存的 email 但更改密碼後登入，應該儲存新密碼而非舊密碼

斷言:

- • `localStorage.getItem('rememberedEmail')` 保持不變

- • `localStorage.getItem('rememberedPassword')` 為新密碼

### 測試程式碼範例

```
test('更改密碼後再次勾選記住我，應該儲存新密碼而非舊密碼', async () => {
const mockUser = { id: 'user-123', email: 'test@example.com' };
(signInWithPassword as jest.Mock).mockResolvedValue({
user: mockUser,
session: { user: mockUser },
});

// Mock Supabase profile query
(supabase.from as jest.Mock).mockReturnValue({
select: jest.fn().mockReturnValue({
eq: jest.fn().mockReturnValue({
single: jest.fn().mockResolvedValue({
data: { primary_role: 'landlord' },
error: null,
}),
}),
}),
});

// 設置舊的儲存資料
localStorage.setItem('rememberedEmail', 'test@example.com');
localStorage.setItem('rememberedPassword', 'OldPassword123');

render();

// 等待自動填入
await waitFor(() => {
const emailInput = screen.getByLabelText(/電子郵件/i) as HTMLInputElement;
const passwordInput = screen.getByLabelText(/密碼/i) as HTMLInputElement;
expect(emailInput.value).toBe('test@example.com');
expect(passwordInput.value).toBe('OldPassword123');
});

const passwordInput = screen.getByLabelText(/密碼/i);
const rememberMeCheckbox = screen.getByLabelText(/記住我/i);
const submitButton = screen.getByRole('button', { name: /登入/i });

// 清除密碼並輸入新密碼
await user.clear(passwordInput);
await user.type(passwordInput, 'NewPassword456');

// 確保記住我是勾選的
if (!(rememberMeCheckbox as HTMLInputElement).checked) {
await user.click(rememberMeCheckbox);
}

await user.click(submitButton);

// 驗證儲存了新密碼
await waitFor(() => {
expect(localStorage.getItem('rememberedEmail')).toBe('test@example.com');
expect(localStorage.getItem('rememberedPassword')).toBe('NewPassword456');
});
});
```

## ✅ 解決方案實作

### 核心修改點

#### 1. 表單初始化 - 添加預設值和 watch

```
const {
register,
handleSubmit,
setValue,
watch,  // ✅ 新增: 用於監控表單值
formState: { errors },
} = useForm({
resolver: zodResolver(loginSchema),
defaultValues: {  // ✅ 新增: 明確的預設值
email: '',
password: '',
rememberMe: false,
},
});
```

重點: 添加 `watch` 和明確的 `defaultValues`，
確保表單狀態管理更加明確和可預測。

#### 2. useEffect 載入邏輯 - 讀取並設定密碼

```
useEffect(() => {
const savedEmail = localStorage.getItem('rememberedEmail');
const savedPassword = localStorage.getItem('rememberedPassword');  // ✅ 新增

if (savedEmail) {
setValue('email', savedEmail, { shouldValidate: false });
setValue('rememberMe', true, { shouldValidate: false });
}
if (savedPassword) {  // ✅ 新增
setValue('password', savedPassword, { shouldValidate: false });
}
}, [setValue]);
```

重點: 使用 `shouldValidate: false` 避免在載入時觸發驗證，
改善用戶體驗。

#### 3. 登入後儲存邏輯 - 儲存密碼

```
// Handle Remember Me
if (data.rememberMe) {
localStorage.setItem('rememberedEmail', data.email);
localStorage.setItem('rememberedPassword', data.password);  // ✅ 新增
} else {
localStorage.removeItem('rememberedEmail');
localStorage.removeItem('rememberedPassword');  // ✅ 新增
}
```

重點: 同步儲存和移除 email 和 password，確保資料一致性。

#### ✅ 修復後的完整流程

- 用戶勾選「記住我」並登入 → email 和 password 儲存到 localStorage

- 用戶重新訪問登入頁面 → email 和 password 自動填入，checkbox 自動勾選

- 用戶修改密碼並登入 → 新密碼覆蓋舊密碼

- 用戶取消勾選「記住我」並登入 → localStorage 清空

## ⚠️ 技術挑戰與解決方案

### 挑戰 1: 表單值設定時機問題

問題: 在 useEffect 中直接使用 `setValue` 時，
可能觸發表單驗證，導致錯誤訊息閃現。

解決方案: 使用 `setValue` 的第三個參數
`{ shouldValidate: false }`

```
setValue('password', savedPassword, { shouldValidate: false });
```

### 挑戰 2: localStorage 資料同步問題

問題: 如果只儲存 email 不儲存 password，或只移除 email 不移除 password，
會導致資料不一致。

解決方案: 所有 localStorage 操作都同時處理 email 和 password

```
// 同時儲存
localStorage.setItem('rememberedEmail', data.email);
localStorage.setItem('rememberedPassword', data.password);

// 同時移除
localStorage.removeItem('rememberedEmail');
localStorage.removeItem('rememberedPassword');
```

### 挑戰 3: 測試環境 localStorage Mock

問題: Jest 測試環境中 localStorage 的狀態會在測試之間共享，導致測試互相干擾。

解決方案: 在每個測試的 `beforeEach` 中清空 localStorage

```
beforeEach(() => {
jest.clearAllMocks();
localStorage.clear();  // ✅ 清空 localStorage
// ... 其他設置
});
```

## 🔒 安全性考量

### ⚠️ 重要安全提醒

目前的實作將密碼以明文方式儲存在 localStorage 中。這存在以下安全風險：

- • XSS 攻擊: 如果網站存在跨站腳本漏洞，攻擊者可以讀取 localStorage 中的密碼

- • 共享電腦: 在公共或共享電腦上，其他使用者可能透過開發者工具查看密碼

- • 明文儲存: 密碼沒有任何加密保護，完全暴露

### 建議的安全改進方案

#### 方案 1: 使用 Session Token (推薦) ⭐

不儲存密碼，而是使用 Supabase 的 session 持久化機制。

```
// 不需要手動儲存密碼
// Supabase 會自動管理 session token
if (data.rememberMe) {
// 設定 session 持久化
await supabase.auth.setSession({
access_token: session.access_token,
refresh_token: session.refresh_token,
});
}
// Token 會自動儲存在 localStorage，且定期刷新
```

優點: 安全、由 Supabase 管理、支援 token 刷新

#### 方案 2: 使用加密儲存

使用加密演算法保護密碼，但仍存在一定風險。

```
import CryptoJS from 'crypto-js';

// 儲存時加密
const encryptedPassword = CryptoJS.AES.encrypt(
data.password,
userEmail + process.env.NEXT_PUBLIC_ENCRYPTION_KEY
).toString();
localStorage.setItem('rememberedPassword', encryptedPassword);

// 讀取時解密
const decryptedPassword = CryptoJS.AES.decrypt(
encryptedPassword,
userEmail + process.env.NEXT_PUBLIC_ENCRYPTION_KEY
).toString(CryptoJS.enc.Utf8);
```

注意: 加密金鑰仍在客戶端，有經驗的攻擊者仍可能解密

#### 方案 3: 只儲存 Email (最安全)

只記住 email，密碼每次都需要重新輸入。

```
if (data.rememberMe) {
localStorage.setItem('rememberedEmail', data.email);
// 不儲存密碼
}
```

優點: 最安全，符合多數安全規範
缺點: 使用者體驗略差

建議: 在生產環境中，強烈建議採用方案 1 (Session Token)，
這是最佳的安全性與使用者體驗平衡點。

## 🛠️ 測試工具與腳本

### 創建的測試資源

#### 1. 自動化測試腳本

`apps/web/test-remember-me.sh`

執行完整的測試套件，包括單元測試和程式碼檢查

```
cd apps/web
./test-remember-me.sh

# 輸出:
# 🧪 測試「記住我」功能
# ✓ 所有「記住我」單元測試通過！
# ✓ 程式碼中包含儲存密碼的邏輯
# ✓ 程式碼中包含讀取密碼的邏輯
# ✓ 程式碼中包含清除密碼的邏輯
# 通過: 7 | 失敗: 0
```

#### 2. 手動測試工具

`apps/web/test-remember-me.html`

互動式測試頁面，可以手動測試 localStorage 操作

- • 清除 localStorage

- • 模擬儲存登入資料

- • 檢查儲存的資料

- • 模擬載入資料

- • 測試密碼更新

#### 3. 單元測試

`apps/web/__tests__/auth/components/LoginPage.test.tsx`

新增 4 個針對「記住我」功能的測試案例

### 執行測試命令

```
# 執行所有「記住我」測試
npm test -- LoginPage.test.tsx --testNamePattern="記住我功能測試"

# 執行完整測試腳本
./test-remember-me.sh

# 開啟手動測試工具
open http://localhost:3000/test-remember-me.html
```

## 💡 經驗心得與最佳實踐

### 1. TDD 的價值

- • 提早發現問題: 在編寫代碼前定義測試，能及早發現邏輯錯誤

- • 明確需求: 測試案例就是需求文檔，清楚定義期望行為

- • 重構信心: 有測試保護，可以放心重構代碼

- • 自動回歸測試: 每次修改都會自動驗證，防止引入新 bug

### 2. React Hook Form 最佳實踐

- • 總是提供明確的 `defaultValues`

- • 使用 `shouldValidate: false` 控制驗證時機

- • 在 useEffect 中設定表單值時要小心副作用

- • 使用 `watch` 監控表單值變化

### 3. localStorage 使用建議

- • 不要儲存敏感資料（密碼、信用卡號等）

- • 如果必須儲存，考慮加密或使用更安全的方案

- • 保持資料同步，避免部分儲存/移除導致不一致

- • 在測試中記得清空 localStorage 避免測試干擾

### 4. 測試設計原則

- • 獨立性: 每個測試應該獨立，不依賴其他測試

- • 可重複性: 測試結果應該可重複，不受執行順序影響

- • 清晰的斷言: 每個測試應該有明確的斷言，驗證特定行為

- • 覆蓋邊界情況: 測試正常流程外，也要測試異常和邊界情況

## 🚫 預防措施

1

#### 為關鍵功能編寫測試

在開發新功能時，同步編寫單元測試，避免功能缺陷

2

#### Code Review 檢查清單

在 PR 中檢查是否有完整的資料處理邏輯（儲存、讀取、刪除）

3

#### 安全性審查

在儲存敏感資料前，進行安全性評估，選擇適當的儲存方案

4

#### 定期執行測試

將測試整合到 CI/CD 流程中，每次提交都自動執行

## 🎉 總結

### ✅ 完成項目

- • 修復「記住我」功能 bug

- • 實作密碼儲存與載入

- • 編寫 4 個單元測試（全部通過）

- • 創建自動化測試腳本

- • 創建手動測試工具

- • 撰寫完整技術文檔

### 📈 成果指標

- • Bug 修復: 100%

- • 測試通過率: 100% (7/7)

- • 測試覆蓋率: 提升

- • 文檔完整度: 完整

- • 安全性評估: 已完成

- • 改進建議: 已提供

透過 TDD 方法論，我們不僅修復了 bug，還建立了可靠的測試基礎設施，
確保未來的變更不會破壞現有功能。同時也識別了安全性風險並提供了改進建議。

Owner-Property-Management-AI-SPA © 2026 |
開發者: Claude Sonnet 4.5 |
開發方法: TDD (Test-Driven Development)
