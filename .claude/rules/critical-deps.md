# Critical Dependencies — 禁止降級

以下套件的 major 版本由專案政策鎖定，**禁止降級**。降級會被 pre-commit hook 和 CI 擋下。

| 套件 | 最低 major | 原因 |
| :-- | :-- | :-- |
| `react` | 19 | Next.js 16 requires React 19; SWC/Turbopack compilation depends on it |
| `react-dom` | 19 | Peer of react |
| `react-leaflet` | 5 | v5 is the React 19-compatible line; v4 breaks peer deps |
| `next` | 16 | App Router feature set the codebase assumes |
| `typescript` | 5 | Strict-mode features used across workspaces |

## 如何修改

1. **小版本升級** (19.2.4 → 19.3.0)：直接改 `package.json` + `npm install`。check 只看 major。
2. **Major 升級** (19 → 20)：編輯 `scripts/check-critical-deps.js` 的 `CRITICAL` map，commit 訊息說明升級動機與驗證結果。
3. **Major 降級**：**先寫 RFC 或 issue**。找 @jason660519 討論。絕不要「為了修啟動錯誤」就降版——大多數情況根因是 `node_modules` stale 或 lockfile 不同步，用 `rm -rf node_modules && npm install --legacy-peer-deps` 處理，而不是降版。

## 歷史事件

- **2026-04-14**：發現 `react` 被從 19.2.4 降到 18.2.0、`react-leaflet` 從 5 降到 4。推測是為了繞過 SWC 啟動錯誤。已恢復並建立本守則。真正的啟動問題是 `packageManager: "npm@10.0.0"` 欄位觸發 yarn/corepack，跟 React 版本無關。

## 歷史事件（續）

- **2026-04-19**：CI lint job (`Lint (superadmin)`) 失敗的根因不是 Next.js 16 移除 `next/dist/compiled/babel/eslint-parser`（檔案仍存在於 16.1.6 / 16.2.4 的 tarball），而是 npm workspaces hoist 不對稱：`eslint-config-next` 被 hoist 到 root，但 `next` 只裝在每個 app 自己的 `node_modules/`，導致 root 的 `eslint-config-next/dist/parser.js` 用 Node 解析 `next/...` 時找不到模組。修法：在 root `package.json` devDependencies 加 `next@16.1.6` 強制 hoist，CI lint job 拿掉 `continue-on-error`。同時放寬測試檔的部分規則（mock 用 `any`、`require()`），並把 `eslint-plugin-react-hooks@7` 的 React Compiler 新規則（`set-state-in-effect`/`purity`/`immutability`/`refs`）暫降為 `warn`（後續評估完整啟用）。Production code 仍維持 `no-explicit-any: error`。

---

## Node 25 + tsx 已知陷阱（Row 145 Sprint 2b 實測，2026-04-20）

> **TL;DR**：在 Node 25.2.1 + tsx 環境下跑 `tools/people-db/parse.ts` 會在 module-load 階段崩潰。不是程式邏輯 bug，是 tsx 對某組合 module graph 的執行期干擾。**寫新 CLI 工具時避開此組合**，Sprint 7 會改 tsc 編譯後 plain node 執行一勞永逸。

### 症狀

```
TypeError: Cannot assign to read only property 'valueOf' of object '#<Object>'
TypeError: Cannot assign to read only property 'toString' of object '#<Object>'
```

發生在 `import ...` 階段（還沒跑到 user code 第一行）就 throw 並 exit non-zero。

### 再現條件（全部同時滿足才會觸發）

1. 執行環境：Node.js **25.x**（Node 22 LTS 下推測不觸發，尚未實測證實）
2. Runner：**tsx**（`npx tsx` / `node --import tsx/esm` / `npx tsx --experimental-strip-types` 全中）
3. Module graph 同時載入：
   - `apps/superadmin/lib/people-db/parsers/index.ts` barrel（其 transitive 依賴包含 `exceljs` → `dayjs.min.js` + `pdfjs-dist`）
   - `@supabase/supabase-js`

少任何一個條件就不觸發。純 unit test（jest + ts-jest）不觸發（jest 不經 tsx）。

### 已試過但無效的 workaround

- `npm override` 把 `dayjs` 鎖版本
- patch-package 把 `exceljs/csv.js` 改 lazy require dayjs
- `package.json` 加 `"dayjs": "./node_modules/dayjs/esm"` redirect
- `node --import tsx/esm` 取代 `npx tsx`
- `node --experimental-strip-types` 取代 tsx
- `NODE_OPTIONS=--no-deprecation`

以上全試過，都無法讓 `parse.ts` 在 Node 25 + tsx 下啟動。

### 有效繞法（依推薦優先序）

1. **不走 parsers barrel**：直接從個別 module import，例如 `import { parseDbfStreaming } from '../../apps/superadmin/lib/people-db/parsers/dbf-stream'`，跳過 `parsers/index.ts` 的 transitively 展開。
2. **不混用 supabase-js**：改用 `pg.Pool` 直連 Postgres，繞開 `@supabase/supabase-js` 的 module 載入。
3. **一勞永逸（Sprint 7 計畫）**：用 `tsc` 編譯成 `.js` 再用 plain `node` 執行。tsx 只是開發便利，build pipeline 成形後 CLI 走編譯產物更穩。

### 參考實作

- [tools/people-db/sprint-2b-validate.ts](../../tools/people-db/sprint-2b-validate.ts) — Sprint 2b 的 one-off 驗證 CLI，採用繞法 #1 + #2，在 Node 25 + tsx 下正常跑完 1.6 GB DBF（3,082,917 rows）
- [project-process/dev-logs/dev-people-db-bulk-ingestion-sprint-2b-2026-04-20.md](../../project-process/dev-logs/dev-people-db-bulk-ingestion-sprint-2b-2026-04-20.md) — Task F 完整踩坑紀錄（含所有試過的 workaround）

### 新 CLI 工具建議

寫新 CLI 前先評估：

- **只讀寫 Postgres** → 用 `pg.Pool` 不用 supabase-js
- **需要 supabase Auth/RLS** → 考慮把邏輯放 API route 讓 server-side Next.js runtime 處理，不走 standalone tsx CLI
- **需要 people-db parsers** → 直接 import 個別 parser module，不走 barrel

Sprint 7 build pipeline 成形後可放寬此限制。
