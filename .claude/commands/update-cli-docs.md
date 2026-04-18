更新 `docs/Adapter CLIs/` 下的各家 CLI 指令文件，使其反映最新版本的指令集。

## 資料來源（依優先序）

1. **`/tmp/cli-help-raw/` 目錄**：由 `scripts/collect-cli-help.sh` 產生的原始 `--help` 輸出（最可靠）
2. **Context7 MCP**：對於本機未安裝的 CLI（列在 `_missing.txt`），用 `resolve-library-id` + `get-library-docs` 從官方文件取得最新指令
3. **現有文件內容**：`docs/Adapter CLIs/*.md` 中已有的中文說明和範例，盡量保留

## 執行流程

### Step 1: 收集原始資料

先確認 `/tmp/cli-help-raw/` 是否存在且資料新鮮（7 天內）。若不存在或過期：

```bash
bash scripts/collect-cli-help.sh
```

讀取 `_summary.txt` 確認哪些 CLI 成功收集、哪些缺少。

### Step 2: 補充缺少的 CLI 文件

對 `_missing.txt` 中列出的每個 CLI，使用 Context7 MCP：
1. `resolve-library-id`：搜尋該 CLI 的官方文件套件
2. `get-library-docs`：查詢「CLI commands reference」取得完整指令列表

### Step 3: 逐一比對並更新

對每個 CLI 文件（`Claude_Code_CLI.md`、`CodeX_CLI.md`、`Cursor_CLI.md`、`OpenCode_CLI.md`、`Gemini_CLI.md`、`Kilo_CLI.md`、`Linux_CLI.md`）：

1. **讀取現有 .md 檔案**，解析表格中所有 Command
2. **讀取對應的 .help.txt**（或 Context7 結果），提取所有可用指令
3. **分類差異**：
   - 🆕 **新增**：help 輸出中有、但現有文件沒有的指令
   - ✏️ **修改**：指令存在但描述/用法有變更
   - ⚠️ **疑似移除**：現有文件有、但 help 輸出中找不到的指令（標記但不直接刪除）
4. **更新表格**，嚴格保持現有 6 欄格式：

```
| Command | Command Description | Command Example | Command Example Explain | 指令說明 | 範例指令說明 |
```

### Step 4: 格式規範（直接遵循，不需額外 Skill）

- 表格欄位順序和名稱不可更改
- `Command` 欄位用 backtick 包裹：`` `command` ``
- `Command Description` 和 `Command Example Explain` 用英文
- `指令說明` 和 `範例指令說明` 用繁體中文
- 新增的指令按字母順序插入（與周圍指令排序一致）
- 疑似移除的指令**不要直接刪除**，在該行 `指令說明` 後方加上 `⚠️ 待確認是否已移除（YYYY-MM-DD）`
- 每個 .md 檔案開頭保留現有的標題和來源連結

### Step 5: 產生 Changelog

在所有檔案更新完成後，輸出一份摘要：

```
## CLI 文件更新摘要 — YYYY-MM-DD

### Claude Code CLI
- 🆕 新增 3 條指令：/foo, /bar, /baz
- ✏️ 修改 1 條：/compact（新增 --strategy 參數）
- ⚠️ 疑似移除 0 條

### CodeX CLI
- （無變更）

### 整體統計
- 更新檔案：4/7
- 新增指令：12
- 修改指令：5
- 疑似移除：2
```

## 失敗處理

- 如果 `--help` 輸出和 Context7 都拿不到某個 CLI 的資料，**跳過該檔案**，在 changelog 中標記「⏭️ 跳過：無可用來源」
- 如果某個 CLI 的 help 輸出格式完全改變（如大版本升級），**暫停並提醒使用者手動確認**，不要自動覆蓋

## 排程建議

每 15 天執行一次。建議搭配 cron 或手動觸發：

```bash
# 半自動：先收集資料，確認後再觸發 command
bash scripts/collect-cli-help.sh
# 然後在 Claude Code 中執行 /update-cli-docs

# 或設定 cron 只跑收集（不自動更新）
# 0 9 1,16 * * cd /path/to/repo && bash scripts/collect-cli-help.sh && echo "CLI help collected, run /update-cli-docs to update" | mail -s "CLI Docs Update Ready" you@email.com
```
