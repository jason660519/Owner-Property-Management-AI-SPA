# Scripts 目錄使用說明書

> **位置**: `scripts/`
> **用途**: 存放專案全域工具、維護腳本、自動化任務及資料庫診斷工具。

本目錄下的腳本旨在輔助開發流程、維護資料完整性及簡化系統管理任務。

---

## 🛠️ 系統維護與清理 (System & Maintenance)

| 腳本名稱 | 格式 | 說明 |
| :--- | :--- | :--- |
| `backup-supabase.sh` | Shell | 備份本地 Supabase 資料庫。 |
| `clean-macos-files.sh` | Shell | 清理 macOS 產生的隱藏檔案（如 `.DS_Store`）。 |
| `clean-md-br.sh` | Shell | 自動搜尋並移除所有 `.md` 檔案中的 `<br>` 標籤。 |
| `generate-work-log.sh` | Shell | 根據 Git Commit 自動生成工作日誌。 |

---

## 📊 資料庫與資料完整性 (Database & Data Integrity)

| 腳本名稱 | 格式 | 說明 |
| :--- | :--- | :--- |
| `address_audit.sql` | SQL | 診斷物件地址欄位是否發生「串位」或格式錯誤。 |
| `address_fix.sql` | SQL | 修復地址欄位中的常見錯誤。 |
| `address_validate.sql` | SQL | 驗證地址資料的結構化完整性。 |

---

## 🔐 身分識別與存取管理 (IAM & User Management)

| 腳本名稱 | 格式 | 說明 |
| :--- | :--- | :--- |
| `bootstrap_admin.ts` | TypeScript | 初始化超級管理員帳號與基本權限。 |
| `diagnose_user.ts` | TypeScript | 診斷特定使用者的權限與角色狀態。 |
| `list_users.ts` / `list_roles.ts` | TypeScript | 列出系統中所有使用者或角色資訊。 |
| `reset_password.ts` | TypeScript | 重設指定使用者的登入密碼。 |
| `sync_user_roles_to_metadata.ts` | TypeScript | 將資料庫角色同步至 Supabase Auth Metadata。 |
| `test_iam_flow.ts` / `test_invite_flow.ts` | TypeScript | 測試 IAM 權限流轉與邀請流程。 |

---

## 🚀 開發工具與自動化 (Development Tools)

| 腳本名稱 | 格式 | 說明 |
| :--- | :--- | :--- |
| `check-file-compliance.sh` | Shell | 檢查檔案命名是否符合專案規範。 |
| `complete-dev-task.sh` | Shell | 標記開發任務完成並觸發後續流程。 |
| `download-taiwan-gov-documents.sh` | Shell | 下載台灣政府不動產標準契約範本。 |
| `generate_sample_images.py` | Python | 生成開發用的房屋範例圖片。 |
| `html-to-md.js` | Node.js | 將舊有的 HTML 格式規格書轉換為 Markdown。 |
| `mcp-manager.py` | Python | 管理 Model Context Protocol (MCP) 設定。 |
| `validate_file_headers.py` | Python | 驗證原始碼檔案是否包含正確的檔案頭資訊。 |

---

## ▶️ 專案啟停腳本補充

### `start.sh`

- 用途：統一啟動 Web、Web AU、Superadmin、OCR 與本地 Supabase 相依流程。
- 常用指令：
   - `./start.sh`：互動式選單
   - `./start.sh all`：背景模式啟動全部主要服務
- 背景模式日誌位置：`logs/dev/`
   - `logs/dev/nextjs.log`：Web App (3000)
   - `logs/dev/nextjs-au.log`：Web App AU (3002)
   - `logs/dev/superadmin.log`：Superadmin (3001)
   - `logs/dev/ocr_service.log`：OCR Service (8819)
- 設計目的：讓背景執行的服務保留 stdout/stderr，方便查啟動失敗、埠衝突、環境變數缺漏等問題。

### `stop.sh`

- 用途：統一停止本機主要服務，並清理對應背景日誌。
- 目前會處理的主要埠：3000、3001、3002、8819。
- 日誌清理行為：優先清理 `logs/dev/` 內的對應檔案，並保留舊 `/tmp` 路徑清理作為相容層。
- Supabase：會詢問是否一併停止 Docker 內的本地 Supabase。

---

## 📝 使用規範

1. **禁止直接在根目錄執行破壞性指令**：執行腳本前請確認當前工作目錄。
2. **新增腳本**：
   - 必須包含詳細的註解說明用途與參數。
   - 命名需符合專案規範（Shell 腳本用 `kebab-case`）。
   - 若為維護用，需同步更新本說明書。
3. **執行權限**：Shell 腳本需確保具備執行權限（`chmod +x scripts/*.sh`）。
