# Superadmin Middleware Cookie 修復 — 開發日誌

> **日期**: 2026-04-13 | **作者**: Claude Opus 4.6 | **Row ID**: 077（使用者身份驗證系統）
> **影響範圍**: `apps/superadmin/middleware.ts`
> **狀態**: Done

---

## 1. 本日完成任務清單

| # | 任務 | 交付物 | 完成度 |
|:--|:-----|:-------|:-------|
| 1 | 調查 Superadmin 間歇性登入失敗根因 | 根因分析報告（見下方 §2） | 100% |
| 2 | 修復 `setAll` callback cookie 同步機制 | `middleware.ts` L59-65：mirror request cookies + rebuild response | 100% |
| 3 | 修復 redirect 路徑 cookie 丟失 | `middleware.ts` L80-88：新增 `redirectWithCookies()` helper | 100% |
| 4 | 交叉比對 `apps/web/middleware.ts` 驗證修復正確性 | 確認與主站 pattern 一致 | 100% |

---

## 2. 技術困難：問題現象、排查過程、根因分析與解決方案

### 問題現象

Superadmin (`localhost:3001/superadmin`) 登入行為不穩定：
- 有時可正常登入進入 dashboard
- 有時被踢回 `/login` 頁面
- 無規律、無錯誤訊息，純粹「時好時壞」
- 用戶反映「以前沒有這現象」

### 排查過程

1. **閱讀 `apps/superadmin/middleware.ts`** — 發現 `const response = NextResponse.next()` 且 `setAll` 僅寫入此 response
2. **閱讀 `apps/web/middleware.ts`（正確參考實作）** — 發現主站用 `let supabaseResponse` 且 `setAll` 中會：
   - 先同步 `request.cookies`
   - 再重建 `supabaseResponse = NextResponse.next({ request })`
3. **比對差異** — superadmin 缺少上述兩步驟，且 redirect 路徑建立全新 `NextResponse.redirect()` 不帶任何 cookie

### 根因分析

**兩個缺陷疊加導致間歇性登入失敗：**

**缺陷 A — `setAll` callback 不完整**
```typescript
// Before (bug)
const response = NextResponse.next({ request });
// setAll 只寫到 response，不同步 request.cookies，也不重建 response
```
當 Supabase SDK 呼叫 `getUser()` 觸發 session token refresh 時，新 cookie 被寫到 `response`，但 `request.cookies` 未同步，導致後續邏輯讀到的仍是過期資料。

**缺陷 B — redirect 時建立全新 response**
```typescript
// Before (bug)
return NextResponse.redirect(loginUrl); // 新 response，cookie 全部丟失
```
即使 `setAll` 正確寫入了刷新後的 cookie，redirect 時建立的新 response 不包含這些 cookie，瀏覽器拿到的仍是過期 token。

**為何「時好時壞」**：
- Session token **未過期** → 不觸發 refresh → 不呼叫 `setAll` → cookie 無變化 → 正常
- Session token **剛好過期** → 觸發 refresh → `setAll` 被呼叫 → cookie 寫入但丟失 → 下次請求失敗 → 被踢到登入頁

### 最終解決方案

**修復 A — 同步 request.cookies 並重建 response（L59-65）**
```typescript
setAll(cookiesToSet) {
  cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
  response = NextResponse.next({ request });
  cookiesToSet.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options)
  );
}
```

**修復 B — redirect 路徑保留 cookie（L80-88）**
```typescript
const redirectWithCookies = (url: URL) => {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie.name, cookie.value);
  });
  return redirectResponse;
};
```

---

## 3. 踩雷事件與事前可預防指標

| # | 踩雷事件 | 影響 | 事前可預防指標 |
|:--|:---------|:-----|:---------------|
| 1 | Superadmin middleware 未遵循主站已驗證的 cookie pattern | 用戶反覆被登出，影響開發效率 | **Code Review checklist**：新建 middleware 時需與主站 pattern 比對 |
| 2 | `const` 宣告 response 導致無法在 `setAll` 中重建 | Bug 隱藏數月，難以復現 | **Lint rule / code template**：middleware 中 response 必須用 `let` |
| 3 | Redirect 路徑未攜帶 cookie 但不報錯 | 靜默失敗，無 log 可追 | **Middleware 測試**：需覆蓋 session refresh + redirect 組合場景 |

---

## 4. 下次避免措施

### 流程優化
- [ ] 建立 **Middleware Cookie Pattern Checklist**：每次新增或修改 middleware 時必須比對 `apps/web/middleware.ts` 的 `setAll` + redirect pattern
- [ ] 在 PR Review 中加入「middleware cookie 一致性」檢查項

### 工具導入
- [ ] 考慮抽取共用 `createMiddlewareSupabaseClient()` 到 `packages/` 層級，避免各 app 重複實作且出現偏差
- [ ] 新增 middleware 整合測試：模擬 session 過期 → refresh → redirect 的完整流程

### 自動化腳本需求
- [ ] 撰寫 lint script 檢查所有 `middleware.ts` 中的 `NextResponse.next` / `NextResponse.redirect` 是否正確處理 cookie
- [ ] 加入 nightly 測試：自動驗證 superadmin 登入 → session 過期 → 自動刷新 → 仍能存取 dashboard

---

## 5. 明日優先工作項目與預估工時

| 優先序 | 工作項目 | 預估工時 | 相依性 | 風險 |
|:-------|:---------|:---------|:-------|:-----|
| P0 | 驗證修復：重啟 superadmin dev server，手動測試登入穩定性 | 0.5h | 無 | 低 |
| P1 | 抽取共用 middleware Supabase client 到 `packages/` | 2h | 需確認 web-au 是否也有同樣問題 | 中（需三個 app 同時驗證） |
| P2 | 撰寫 middleware cookie 一致性 lint script | 1.5h | P1 完成後 | 低 |
| P3 | 補齊 E2E 測試：session refresh + redirect 場景 | 3h | Playwright 環境正常 | 中（需模擬 token 過期） |

---

## 6. 修改檔案清單

| 檔案 | 變更類型 | 說明 |
|:-----|:---------|:-----|
| `apps/superadmin/middleware.ts` | 修改 | 修復 `setAll` cookie 同步 + 新增 `redirectWithCookies` helper |

---

## 7. 相關文件

- 參考正確實作：`apps/web/middleware.ts`（L30-58）
- 認證系統文件：`/project-process/features/auth-system.md`
- IAM 角色流程日誌：`/project-process/dev-logs/dev-login-portal-iam-roles-2026-02-16.md`
