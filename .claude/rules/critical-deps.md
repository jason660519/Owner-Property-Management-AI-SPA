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
