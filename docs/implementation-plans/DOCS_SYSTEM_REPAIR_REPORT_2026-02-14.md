# 文件系統修復報告 (localhost:3001/docs)

> **創建日期**: 2026-02-14  
> **修改者**: Claude Opus 4.6  
> **版本**: 1.0

## 1. 執行摘要

針對 Superadmin 後台於 `http://localhost:3001/docs`（實際路由為 `/superadmin/docs`）的專案文件瀏覽系統進行全面檢查與修復，解決與專案根目錄 `/docs` 不同步、路徑解析錯誤、Watch SSE 清理未執行等問題，並建立穩定同步機制與錯誤處理。

---

## 2. 發現的問題

### 2.1 架構與路徑同步問題

| 問題                                | 說明                                                                                                                                                               | 嚴重性 |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| **DOCS_ROOT 僅用 `cwd/../../docs`** | 所有 API（tree、content、search、watch）均使用 `path.resolve(process.cwd(), '../../docs')`。當以 monorepo 根目錄為 cwd 啟動時，會解析到錯誤路徑。                  | 高     |
| **本地 docs 覆蓋專案 docs**         | 存在 `apps/superadmin/docs/`（內含單一檔案如 IAM_AUDIT_GUIDE.md）時，若先檢查 `cwd/docs`，會優先使用該目錄，導致畫面只顯示 1 個檔案，與專案根目錄 `docs/` 不同步。 | 高     |
| **無環境變數覆寫**                  | 無法透過 `DOCS_PATH` 指定文件目錄，不利於測試或不同部署環境。                                                                                                      | 中     |

### 2.2 功能與邏輯錯誤

| 問題                              | 說明                                                                                                                                                                                           | 嚴重性 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **Watch SSE 的 cleanup 從未執行** | `ReadableStream` 的 `cancel()` 內使用 `(this as any).__cleanup`，但 `this` 為 underlying source 物件，cleanup 實際被掛在 `stream.__cleanup` 上，導致客戶端斷線時 watcher 與 heartbeat 未釋放。 | 高     |
| **Watch 未檢查目錄存在**          | 直接對 `DOCS_ROOT` 執行 `chokidar.watch()`，若路徑不存在會拋錯且僅在 console 出現，前端只會看到 SSE 連線失敗。                                                                                 | 中     |
| **Path traversal 比對**           | content API 使用 `absolutePath.startsWith(DOCS_ROOT + path.sep)`，未先對兩邊做 `path.resolve`，在部分邊界情況下可能不夠嚴謹。                                                                  | 低     |

### 2.3 導航與路由

| 問題                     | 說明                                                                                                           | 嚴重性               |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------- |
| **/docs 未對應到文件頁** | 使用者若造訪 `http://localhost:3001/docs` 會 404，實際文件頁在 `/superadmin/docs`。                            | 中                   |
| **Header 的 Docs 連結**  | DashboardHeader 的「Docs」為 `/docs`，未與 Sidebar 的 `/superadmin/docs` 一致；需至少讓 `/docs` 可導向文件頁。 | 低（已用重定向解決） |

### 2.4 錯誤處理與日誌

| 問題                          | 說明                                                                                     | 嚴重性 |
| ----------------------------- | ---------------------------------------------------------------------------------------- | ------ |
| **API 錯誤訊息未回傳**        | tree/content 失敗時僅在前端寫死「無法載入文件目錄/內容」，未將後端 `error` 訊息傳給 UI。 | 中     |
| **無統一日誌前綴**            | 各 API 使用 `console.error` 隨意輸出，不利於過濾與除錯。                                 | 低     |
| **SearchBar 未處理 API 錯誤** | 搜尋 API 非 2xx 時未清空 results 或顯示錯誤狀態，可能留下舊結果。                        | 低     |

---

## 3. 採取的解決方案

### 3.1 統一 DOCS_ROOT 解析（同步機制）

- **新增** `apps/superadmin/lib/docs-config.ts`：
  - `getDocsRoot()`：依序使用  
    1) 環境變數 `DOCS_PATH`（可為絕對路徑或相對 cwd）  
    2) `cwd/../../docs`（在 `apps/superadmin` 下時對應專案根目錄的 `docs`）  
    3) `cwd/docs`（在 monorepo 根目錄執行時）
  - **優先使用專案根目錄 docs**：先檢查 `cwd/../../docs` 再檢查 `cwd/docs`，避免 `apps/superadmin/docs` 覆蓋專案 `docs`。
  - 匯出 `SKIP_DIRS`、`logDocsError`、`logDocsInfo` 供 API 共用。

- **所有 docs API**（tree、content、search、watch）改為呼叫 `getDocsRoot()`，不再硬編碼 `path.resolve(process.cwd(), '../../docs')`。

### 3.2 Watch SSE 修復

- **cleanup 可被正確呼叫**：以閉包變數 `cleanupFn` 儲存 cleanup，在 `cancel()` 中呼叫 `cleanupFn?.()`，確保客戶端斷線時會清除 heartbeat 並關閉 chokidar watcher。
- **先檢查目錄再 watch**：在建立 watcher 前以 `fs.existsSync(DOCS_ROOT)` 檢查，若不存在則送出 SSE `event: 'error'` 並關閉 stream，不再讓 chokidar 在無效路徑上拋錯。
- **Windows 路徑正規化**：`path.relative` 產生的路徑以 `.replace(/\\/g, '/')` 傳給前端，避免反斜線造成前端路徑比對問題。

### 3.3 路由與導航

- **middleware**：當 pathname 為 `/docs` 時，重定向至 `/superadmin/docs`（307），使 `http://localhost:3001/docs` 與「專案文件」頁一致。
- **config.matcher** 新增 `'/docs'`，其餘 superadmin 路由不變。

### 3.4 錯誤處理與日誌

- **API 回應**：tree、content、search 在錯誤時於 JSON 中回傳 `error`（必要時加 `details`），並使用適當 HTTP 狀態碼（400/403/404/500）。
- **DocsPage**：`fetchTree` / `fetchContent` 在 `!res.ok` 時讀取 `data?.error` 並設為 `setError(...)`，避免一律顯示固定文案。
- **SearchBar**：當搜尋 API 非 ok 時將 `results` 設為 `[]`，並在 console 輸出警告。
- **DocsPage SSE**：處理 `event === 'error'`，將 `liveConnected` 設為 false。
- **日誌**：透過 `logDocsError` / `logDocsInfo` 以 `[docs-api] [tree|content|search|watch]` 前綴輸出，便於過濾與維護。

### 3.5 Content API 安全

- 使用 `path.resolve(DOCS_ROOT)` 得到 `normalizedRoot`，再以 `absolutePath.startsWith(normalizedRoot + path.sep) || absolutePath === normalizedRoot` 做 path traversal 檢查，避免繞過。

---

## 4. 變更檔案清單

| 檔案                                            | 變更類型                                              |
| ----------------------------------------------- | ----------------------------------------------------- |
| `apps/superadmin/lib/docs-config.ts`            | 新增                                                  |
| `apps/superadmin/app/api/docs/tree/route.ts`    | 修改（使用 getDocsRoot、SKIP_DIRS、日誌）             |
| `apps/superadmin/app/api/docs/content/route.ts` | 修改（getDocsRoot、路徑正規化、日誌）                 |
| `apps/superadmin/app/api/docs/search/route.ts`  | 修改（getDocsRoot、SKIP_DIRS、日誌）                  |
| `apps/superadmin/app/api/docs/watch/route.ts`   | 修改（getDocsRoot、cleanup 閉包、目錄存在檢查、日誌） |
| `apps/superadmin/middleware.ts`                 | 修改（/docs → /superadmin/docs 重定向、matcher）      |
| `apps/superadmin/components/docs/DocsPage.tsx`  | 修改（API 錯誤訊息、SSE error 處理）                  |
| `apps/superadmin/components/docs/SearchBar.tsx` | 修改（API 錯誤時清空 results）                        |

---

## 5. 驗證結果

- **Build**：`npm run build --workspace superadmin` 通過。
- **路由**：`curl -sI http://localhost:3001/docs` → 307，`location: /superadmin/docs`。
- **Tree API**：`/api/docs/tree` 回傳完整目錄樹（含 technical-selection、deployment-guides、design-guidelines、file-naming-guidelines 等），與專案 `docs/` 一致。
- **Content API**：`/api/docs/content?path=file-naming-guidelines.md` 回傳正確 Markdown 內容。
- **Search API**：`/api/docs/search?q=...` 行為正常；錯誤時回傳 400/404/500 與 `error` 欄位。
- **Watch API**：SSE 連線後收到 `event: 'connected'`；目錄不存在時收到 `event: 'error'`；客戶端斷線後 cleanup 會執行（依程式邏輯與閉包修正）。

現有單元測試中，與 docs 無關的失敗（如 DashboardHeader 的 theme-toggle）未在本次修改範圍內；文件相關流程建議後續補上 E2E（例如 Playwright）驗證導航、搜尋與即時同步。

---

## 6. 未來預防建議

1. **DOCS_PATH**：在部署或特殊環境需指向不同文件目錄時，於 `.env` 或環境設定中設定 `DOCS_PATH`（可為絕對路徑或相對專案根之路徑）。
2. **單一真實來源**：專案文件以「專案根目錄 `docs/`」為唯一來源；避免在 `apps/superadmin/docs` 放置與對外文件重複的內容，或明確標示為「僅供本 app 使用」。
3. **E2E 測試**：為 `/superadmin/docs` 新增 E2E（如 Playwright），覆蓋：載入樹狀目錄、點選檔案顯示內容、搜尋、側欄收合、以及（可選）SSE 連線狀態。
4. **監控日誌**：在正式環境可對 `[docs-api]` 前綴日誌做集中收集，方便追蹤 404/500 與 watch 錯誤。

---

## 7. 附錄：如何驗證同步與 Watch

```bash
# 1. 啟動 Superadmin
npm run dev --workspace superadmin

# 2. 檢查 tree 是否為專案 docs
curl -s http://localhost:3001/api/docs/tree | jq '.totalFiles'

# 3. 檢查單一檔案內容
curl -s "http://localhost:3001/api/docs/content?path=file-naming-guidelines.md" | jq '.name'

# 4. 可選：在專案 docs 新增或修改 .md，確認 /superadmin/docs 頁面樹狀與內容會更新（需登入 superadmin）
```

若需強制指定文件目錄（例如 CI 或 Docker）：

```bash
DOCS_PATH=/absolute/path/to/docs npm run dev --workspace superadmin
```
