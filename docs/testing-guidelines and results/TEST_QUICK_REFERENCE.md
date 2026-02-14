# 測試檔案快速參考卡

> **版本**: 1.0 | **更新日期**: 2026-02-06

---

## 測試檔案放哪裡？

```
原始碼位置                          測試檔案位置
─────────────────────────────────────────────────────────────
app/(auth)/login/page.tsx       → app/(auth)/login/__tests__/page.test.tsx
components/ui/Button.tsx        → components/ui/Button/__tests__/Button.test.tsx
hooks/useAuth.ts                → hooks/useAuth/__tests__/useAuth.test.ts
lib/supabase/auth.ts            → lib/supabase/__tests__/auth.test.ts
actions/auth.ts                 → actions/__tests__/auth.test.ts
─────────────────────────────────────────────────────────────
E2E 測試（集中管理）              → e2e/flows/{module}/*.spec.ts
```

---

## 命名規則

| 測試類型 | 後綴 | 範例 |
|:---------|:-----|:-----|
| 單元測試 | `.test.ts(x)` | `Button.test.tsx` |
| 整合測試 | `.integration.test.ts(x)` | `auth.integration.test.ts` |
| E2E 測試 | `.spec.ts` | `login.spec.ts` |

---

## 快速指令

```bash
# 執行所有單元測試
npm run test

# 執行特定測試檔案
npm test -- LoginPage.test.tsx

# 執行符合模式的測試
npm test -- --testNamePattern="登入"

# 監視模式
npm run test:watch

# 產生覆蓋率報告
npm run test:coverage

# 執行 E2E 測試
npm run test:e2e

# E2E 互動模式
npm run test:e2e:ui

# 查看 E2E 報告
npm run test:e2e:report
```

---

## 測試模板

### 組件測試

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from '../ComponentName';

describe('ComponentName', () => {
  test('應該正確渲染', () => {
    render(<ComponentName />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('應該處理點擊事件', () => {
    const onClick = jest.fn();
    render(<ComponentName onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Hook 測試

```ts
import { renderHook, act } from '@testing-library/react';
import { useHookName } from '../useHookName';

describe('useHookName', () => {
  test('應該回傳初始狀態', () => {
    const { result } = renderHook(() => useHookName());
    expect(result.current.value).toBe(initialValue);
  });
});
```

### E2E 測試

```ts
import { test, expect } from '@playwright/test';

test.describe('功能名稱', () => {
  test('使用者可以完成某操作', async ({ page }) => {
    await page.goto('/path');
    await page.getByLabel('欄位').fill('值');
    await page.getByRole('button', { name: '提交' }).click();
    await expect(page).toHaveURL('/success');
  });
});
```

---

## Checklist

### 新增測試時

- [ ] 測試放在 `__tests__/` 目錄
- [ ] 檔名使用正確後綴 (`.test.ts` / `.spec.ts`)
- [ ] describe 使用中文描述
- [ ] 包含正向與負向測試
- [ ] 本地測試通過

### Code Review 時

- [ ] 新功能有測試覆蓋
- [ ] 測試描述清楚
- [ ] CI 測試通過
- [ ] 覆蓋率未下降

---

## 常見問題

### Q: 測試要放在集中的 `__tests__/` 還是 colocated？

**A**: 使用 **colocated** 方式，將測試放在被測試檔案同目錄的 `__tests__/` 下。

### Q: E2E 測試要放哪裡？

**A**: 放在 `e2e/flows/{module}/` 下，按功能模組分類。

### Q: 什麼時候寫 E2E 測試？

**A**: 關鍵用戶流程（登入、註冊、核心業務功能）需要 E2E 測試。

---

## 相關文件

- [完整規範](./TEST_FILE_MANAGEMENT_STANDARD.md)
- [專案命名規則](../本專案檔案命名規則與新增文件歸檔總則.md)
