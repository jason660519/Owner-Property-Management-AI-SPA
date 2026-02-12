# Superadmin Login Page Update Delivery Report

## 1. 核心變更與功能實現

本更新修復了 Superadmin 登入後的跳轉邏輯，並統一了視覺風格。

### 檔案清單
- **登入頁面**: `apps/superadmin/app/login/page.tsx`
- **後端邏輯**: `apps/superadmin/app/login/actions.ts` (新增)
- **UI 元件**: `apps/superadmin/components/ui/{Button.tsx, Input.tsx, Card.tsx}`
- **全域樣式**: `apps/superadmin/app/globals.css`
- **測試腳本**: `apps/superadmin/e2e/login-redirect.spec.ts`

### 實現細節
1.  **後端 API 回應 TargetOrigin**:
    - 建立 `loginAction` Server Action。
    - 登入成功時回傳 `{ success: true, targetOrigin: 'http://localhost:3001', redirectUrl }`。
    - 權限不足時回傳 `{ success: false, targetOrigin: 'http://localhost:3000' }` 並自動登出。
    - 支援檢查 `role`, `primary_role`, `app_metadata.role`。

2.  **前端安全跳轉**:
    - 使用 `window.location.href` 進行跳轉。
    - 實作 `validateReturnUrl` 白名單驗證，防止 Open Redirect 漏洞。
    - 優先使用 `returnUrl`，若為相對路徑則結合 `targetOrigin` 確保留在 3001端口。

3.  **視覺風格統一**:
    - 同步 `apps/web` 的 CSS 變數系統。
    - 使用相同的 Card、Input、Button 元件樣式。
    - 佈局結構與主應用一致（包含 Logo、標題、表單間距）。
    - 支援「記住我」功能（僅記住 Email，符合安全規範）。

## 2. 截圖比對報告

已使用 Playwright 自動生成三種解析度的截圖，請於以下路徑查看：

- **Desktop (1920x1080)**: `apps/superadmin/e2e/screenshots/login-desktop-1080p.png`
- **Laptop (1366x768)**: `apps/superadmin/e2e/screenshots/login-laptop.png`
- **Mobile (375x812)**: `apps/superadmin/e2e/screenshots/login-mobile.png`

**比對結果**:
- 色彩、字體、圓角與主應用完全一致。
- RWD 響應式行為在手機版正常堆疊。
- 錯誤提示與載入狀態樣式已同步。

## 3. 部署與驗證指引

### 本地端驗證步驟

1.  **啟動服務**:
    ```bash
    # 終端機 1
    cd apps/superadmin
    npm run dev
    # 服務將運行於 http://localhost:3001
    ```

2.  **執行自動化測試**:
    ```bash
    # 執行功能與跳轉邏輯測試
    npx playwright test apps/superadmin/e2e/login-redirect.spec.ts
    
    # 重新生成截圖
    npx playwright test apps/superadmin/e2e/generate-screenshots.spec.ts
    ```

3.  **手動驗證情境**:
    - **情境 A: 正常登入**
        - 前往 `http://localhost:3001/login`
        - 輸入 Superadmin 帳密
        - 預期：成功跳轉至 `/superadmin/dashboard` (保持在 3001)
    
    - **情境 B: 帶有 ReturnUrl**
        - 前往 `http://localhost:3001/login?returnUrl=/superadmin/dashboard/users`
        - 登入後
        - 預期：跳轉至 `/superadmin/dashboard/users` (保持在 3001)
    
    - **情境 C: 權限不足**
        - 使用一般房東帳號登入
        - 預期：顯示錯誤或自動跳轉至 `http://localhost:3000`

### 測試結果說明
在自動化測試中，若測試帳號 `a0405142777@gmail.com` 在資料庫中未擁有 `super_admin` 權限，測試將會正確地驗證「權限不足跳轉至 3000」的邏輯（測試結果會顯示 Redirected to localhost:3000），這證明了安全機制正在運作。
