# Gemini CLI 指令整理

來源：
- https://geminicli.com/docs/cli/cli-reference/

| Command | Command Description | Command Example | Command Example Explain | 指令說明 | 範例指令說明 |
|---|---|---|---|---|---|
| `gemini` | Start interactive REPL. | `gemini` | Opens Gemini interactive terminal mode. | 啟動 Gemini 互動式 REPL。 | 直接進入聊天/代理模式。 |
| `gemini -p "<query>"` | Run non-interactive one-shot prompt. | `gemini -p "summarize README.md"` | Prints answer and exits. | 非互動模式執行一次查詢。 | 適合腳本或單次任務。 |
| `gemini "<query>"` | Start session with initial query. | `gemini "explain this project"` | Sends first prompt and remains interactive. | 以初始提示詞進入互動模式。 | 第一輪先提問，再持續對話。 |
| `cat file \| gemini` | Process piped stdin input. | `cat logs.txt \| gemini` | Uses piped content as context for analysis. | 用管線輸入內容給 Gemini。 | 常用於 logs/輸出分析。 |
| `gemini -i "<query>"` | Execute prompt, then continue interactively. | `gemini -i "What is this project for?"` | Runs initial query before entering REPL. | 先執行提問，再進入互動模式。 | 一次帶入任務背景。 |
| `gemini -r "latest"` | Resume the most recent session. | `gemini -r "latest"` | Continues from last saved conversation. | 恢復最近一次 session。 | 直接接續上次工作。 |
| `gemini -r "<id>" "<query>"` | Resume specific session and ask new query. | `gemini -r "abc123" "Finish this PR"` | Loads session by ID and continues with prompt. | 用 session ID 恢復並續問。 | 適合跨日延續長任務。 |
| `gemini --list-sessions` | List available sessions in current project. | `gemini --list-sessions` | Shows resume targets and indexes. | 列出目前專案可恢復 session。 | 可先看索引再 `--resume`。 |
| `gemini --delete-session <index>` | Delete session by index. | `gemini --delete-session 3` | Removes chosen conversation record. | 依索引刪除 session。 | 清理不需要的歷史會話。 |
| `gemini update` | Update Gemini CLI to latest version. | `gemini update` | Performs in-place CLI update. | 更新 Gemini CLI。 | 升級到最新版本。 |
| `gemini -m, --model <alias-or-model>` | Choose model for this run. | `gemini -m flash` | Uses selected alias/model (e.g. `pro`, `flash`). | 指定本次模型。 | 可用別名或完整模型名稱。 |
| `gemini -o, --output-format <text\|json\|stream-json>` | Set output format. | `gemini -p "status" -o json` | Returns machine-readable output. | 設定 CLI 輸出格式。 | `json`/`stream-json` 便於自動化。 |
| `gemini -d, --debug` | Enable verbose debug logging. | `gemini --debug` | Prints detailed runtime logs. | 開啟除錯詳細輸出。 | 排查問題時使用。 |
| `gemini -w, --worktree [name]` | Start in a new git worktree (experimental). | `gemini -w feature-auth` | Isolates changes in separate worktree. | 在隔離 worktree 啟動。 | 避免汙染目前工作樹。 |
| `gemini -s, --sandbox` | Run in sandboxed environment. | `gemini --sandbox` | Adds safety isolation for execution. | 啟用沙盒執行環境。 | 提升安全性。 |
| `gemini --approval-mode <default\|auto_edit\|yolo\|plan>` | Set approval policy for tool execution. | `gemini --approval-mode plan` | Controls how strictly actions need approval. | 設定工具執行核准策略。 | `plan` 偏保守、`yolo` 偏自動。 |
| `gemini --allowed-mcp-server-names <names>` | Restrict usable MCP servers. | `gemini --allowed-mcp-server-names github,context7` | Only listed MCP servers are allowed. | 限制可用 MCP server 名單。 | 強化執行範圍控制。 |
| `gemini --include-directories <paths>` | Add extra directories to workspace context. | `gemini --include-directories ../shared,../docs` | Expands readable context roots. | 加入額外目錄到工作上下文。 | 讓 agent 可讀更多路徑。 |
| `gemini -e, --extensions <list>` | Enable only selected extensions for run. | `gemini -e git-tools,reviewer` | Loads specific extensions only. | 指定本次載入的 extensions。 | 控制會話可用能力。 |
| `gemini -l, --list-extensions` | List available extensions and exit. | `gemini --list-extensions` | Displays installed/discoverable extensions. | 列出可用 extensions。 | 檢視目前擴充狀態。 |
| `gemini extensions list` | List installed extensions. | `gemini extensions list` | Shows extension inventory. | 列出已安裝 extensions。 | 檢查擴充清單。 |
| `gemini extensions install <url-or-path>` | Install extension from Git URL or local path. | `gemini extensions install https://github.com/user/ext` | Adds extension to local environment. | 從 Git/本機安裝 extension。 | 擴充 CLI 功能。 |
| `gemini extensions update --all` | Update all extensions. | `gemini extensions update --all` | Upgrades every installed extension. | 更新所有 extensions。 | 維持擴充版本最新。 |
| `gemini extensions enable <name>` | Enable specific extension. | `gemini extensions enable my-extension` | Activates installed extension. | 啟用指定 extension。 | 暫時停用後可再啟用。 |
| `gemini extensions disable <name>` | Disable specific extension. | `gemini extensions disable my-extension` | Deactivates extension without uninstalling. | 停用指定 extension。 | 不刪除但停止使用。 |
| `gemini mcp add <name> <command...>` | Add stdio MCP server. | `gemini mcp add github npx -y @modelcontextprotocol/server-github` | Registers command-based MCP server. | 新增 stdio 類型 MCP server。 | 用命令方式啟動 MCP。 |
| `gemini mcp add --transport http` | Add HTTP MCP server. | `gemini mcp add api http://localhost:3000 --transport http` | Registers MCP via HTTP endpoint. | 新增 HTTP 類型 MCP server。 | 以 URL 連線遠端 MCP。 |
| `gemini mcp list` | List configured MCP servers. | `gemini mcp list` | Shows MCP configuration overview. | 列出已設定 MCP servers。 | 檢查 MCP 是否已註冊。 |
| `gemini mcp remove <name>` | Remove MCP server configuration. | `gemini mcp remove github` | Deletes server entry from config. | 移除 MCP server 設定。 | 清理不再使用的 MCP。 |
| `gemini skills list` | List discovered agent skills. | `gemini skills list` | Displays installed/linked skills. | 列出可用技能（skills）。 | 查看目前技能庫。 |
| `gemini skills install <source>` | Install skill from Git/path/file. | `gemini skills install https://github.com/u/repo` | Adds reusable skill package. | 安裝 skill。 | 可從 Git 或本機來源安裝。 |
| `gemini skills enable --all` | Enable all skills. | `gemini skills enable --all` | Turns on every discovered skill. | 啟用全部 skills。 | 快速開啟完整技能集。 |
| `gemini skills disable --all` | Disable all skills. | `gemini skills disable --all` | Turns off all skills globally. | 停用全部 skills。 | 需要極簡行為時使用。 |
| `/help` | Show interactive command help. | `/help` | Lists REPL slash commands. | REPL 內查看可用指令。 | 互動模式下最常用幫助命令。 |
| `/mcp reload` | Reload MCP servers in REPL. | `/mcp reload` | Restarts and reloads MCP integrations. | 在互動模式重載 MCP。 | 更新設定後不用重開 CLI。 |
| `/extensions reload` | Reload all active extensions in REPL. | `/extensions reload` | Reinitializes extension runtime. | 在互動模式重載 extensions。 | 開發 extension 時常用。 |
| `/quit` | Exit interactive session. | `/quit` | Closes REPL and ends current session. | 離開互動式會話。 | 結束本次工作。 |
