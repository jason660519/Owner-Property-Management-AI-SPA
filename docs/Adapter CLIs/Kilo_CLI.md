# Kilo CLI 指令整理

來源：
- https://kilo.ai/docs/code-with-ai/platforms/cli-reference

| Command | Command Description | Command Example | Command Example Explain | 指令說明 | 範例指令說明 |
|---|---|---|---|---|---|
| `kilo` | Start Kilo TUI in current directory. | `kilo` | Launches interactive terminal UI. | 啟動 Kilo 互動式終端介面。 | 直接在目前目錄開始使用。 |
| `kilo [project]` | Start Kilo in a specific project path. | `kilo /path/to/project` | Uses target path as workspace. | 在指定專案路徑啟動 Kilo。 | 不用先 `cd` 也能指定專案。 |
| `kilo -m, --model <provider/model>` | Select model for session. | `kilo -m anthropic/claude-3-7-sonnet` | Runs with selected provider/model. | 指定本次會話模型。 | 使用 `provider/model` 格式。 |
| `kilo -c, --continue` | Continue the last session. | `kilo --continue` | Restores latest session context. | 延續最近一次會話。 | 快速接續上次工作。 |
| `kilo -s, --session <id>` | Continue by session ID. | `kilo --session abc123` | Resumes session `abc123`. | 用 session ID 續接。 | 直接回到指定會話。 |
| `kilo --fork` | Fork when continuing a session. | `kilo --continue --fork` | Continues on a branched session. | 續接時分叉成新會話。 | 保留原會話，另開分支續作。 |
| `kilo --cloud-fork` | Pull cloud session and continue locally. | `kilo --session abc123 --cloud-fork` | Syncs cloud session to local continuation. | 從雲端會話拉回本機續接。 | 搭配 `--session` 使用。 |
| `kilo --prompt <name>` | Use a named prompt preset. | `kilo --prompt code-review` | Starts with selected prompt template. | 指定 prompt 模板。 | 以固定模板啟動會話。 |
| `kilo --agent <name>` | Use a specific agent profile. | `kilo --agent reviewer` | Runs with `reviewer` agent behavior. | 指定 agent。 | 用特定 agent 行為執行。 |
| `kilo run [message]` | Non-interactive run with message. | `kilo run "explain this repo"` | Runs once and returns output. | 非互動模式執行訊息。 | 適合腳本或一次性任務。 |
| `kilo run --format <default\|json>` | Control output format for run. | `kilo run --format json "status"` | Emits raw JSON events. | 設定 `run` 的輸出格式。 | 用 `json` 方便程式解析。 |
| `kilo run -f, --file <path>` | Attach files to run message. | `kilo run -f ./error.log "analyze"` | Sends file as context. | 在 `run` 模式附檔。 | 讓回覆包含檔案上下文。 |
| `kilo run --share` | Share the run session. | `kilo run --share "summarize"` | Produces shareable session. | 分享本次 session。 | 產生可分享會話。 |
| `kilo run --attach <url>` | Attach run to existing server. | `kilo run --attach http://localhost:4096 "check"` | Reuses running server backend. | 連到既有 server 執行 run。 | 避免每次冷啟動。 |
| `kilo run --auto` | Auto-approve all permissions. | `kilo run --auto "fix lint"` | Enables autonomous mode. | 自動核准所有權限。 | 適合 pipeline/autonomous 流程。 |
| `kilo run --dangerously-skip-permissions` | Approve non-denied permissions automatically. | `kilo run --dangerously-skip-permissions "refactor"` | Dangerous low-friction mode. | 危險模式：大幅跳過權限確認。 | 僅在可控環境使用。 |
| `kilo attach [url]` | Attach TUI to a running Kilo server. | `kilo attach http://localhost:4096` | Connects local UI to remote/local backend. | 把本機 TUI 接到既有 server。 | 常用於遠端或常駐服務。 |
| `kilo serve` | Start headless Kilo server. | `kilo serve --port 4096` | Runs API/backend without TUI. | 啟動無介面的 Kilo server。 | 提供 API/遠端存取。 |
| `kilo acp` | Start ACP (Agent Client Protocol) server. | `kilo acp --port 4096` | Exposes ACP endpoint for clients. | 啟動 ACP 伺服器。 | 供外部 agent client 對接。 |
| `kilo auth` | Manage provider credentials. | `kilo auth list` | Lists configured providers. | 管理 AI provider 憑證。 | 可列出、登入、登出 provider。 |
| `kilo auth login [url]` | Log in to a provider. | `kilo auth login -p openai` | Authenticates selected provider. | 登入指定 provider。 | 可跳過 provider/method 選擇。 |
| `kilo auth logout` | Log out from a provider. | `kilo auth logout` | Clears stored auth config. | 登出 provider。 | 清除本機保存憑證。 |
| `kilo mcp` | Manage MCP servers. | `kilo mcp list` | Shows MCP servers and status. | 管理 MCP server。 | 可新增、列出、授權、登出。 |
| `kilo mcp add` | Add an MCP server. | `kilo mcp add` | Interactive MCP server setup. | 新增 MCP server。 | 依提示完成設定。 |
| `kilo mcp auth [name]` | OAuth auth for MCP server. | `kilo mcp auth user-context7` | Authenticates selected MCP server. | 對 MCP server 進行 OAuth 授權。 | 可指定名稱直接授權。 |
| `kilo mcp logout [name]` | Remove MCP OAuth credentials. | `kilo mcp logout user-context7` | Clears MCP auth token. | 移除 MCP 授權資訊。 | 讓 server 回到未授權狀態。 |
| `kilo mcp debug <name>` | Debug MCP OAuth connectivity. | `kilo mcp debug user-context7` | Prints diagnostics for auth issues. | 排查 MCP OAuth 連線問題。 | 顯示診斷資訊協助除錯。 |
| `kilo agent` | Manage agents. | `kilo agent list` | Lists available agents. | 管理 agent。 | 可建立或列出 agents。 |
| `kilo agent create` | Create a new agent config. | `kilo agent create --mode subagent` | Generates custom agent definition. | 建立新 agent 設定。 | 支援 mode/tools/model 參數。 |
| `kilo models [provider]` | List available models. | `kilo models anthropic --verbose` | Shows models and metadata/costs. | 列出可用模型。 | 可依 provider 篩選並顯示細節。 |
| `kilo stats` | Show token and cost statistics. | `kilo stats --days 7 --models 5` | Shows recent usage and top models. | 顯示 token/費用統計。 | 觀察近 7 天與熱門模型。 |
| `kilo session` | Manage sessions. | `kilo session list -n 20` | Lists recent sessions. | 管理 sessions。 | 可列出或刪除會話。 |
| `kilo session delete <sessionID>` | Delete a session. | `kilo session delete abc123` | Removes selected session. | 刪除指定 session。 | 清理舊會話資料。 |
| `kilo export [sessionID]` | Export session JSON. | `kilo export abc123` | Outputs session data as JSON. | 匯出 session 成 JSON。 | 可做備份/遷移。 |
| `kilo import <file-or-url>` | Import session from JSON/URL. | `kilo import session.json` | Restores session data into local store. | 從檔案或 URL 匯入 session。 | 將既有會話資料帶回本機。 |
| `kilo pr <number>` | Checkout GitHub PR branch and run Kilo. | `kilo pr 128` | Fetches PR branch then opens Kilo. | 拉取 PR 分支後啟動 Kilo。 | 針對 PR 做審查/修改很方便。 |
| `kilo db [query]` | Open SQLite shell or run SQL query. | `kilo db "select * from sessions limit 10"` | Runs direct query against local DB. | 存取 Kilo 本機資料庫工具。 | 可快速查詢 session 資料。 |
| `kilo db path` | Print database path. | `kilo db path` | Shows absolute DB file location. | 顯示資料庫檔案路徑。 | 用於除錯與備份。 |
| `kilo db migrate` | Migrate JSON data to SQLite. | `kilo db migrate` | Imports legacy JSON into DB. | 將舊 JSON 資料遷移到 SQLite。 | 合併既有資料到新儲存。 |
| `kilo config check` | Check config warnings/errors. | `kilo config check` | Validates configuration health. | 檢查設定檔是否有問題。 | 上線前快速驗證設定。 |
| `kilo plugin <module>` | Install plugin and update config. | `kilo plugin @acme/kilo-plugin -g` | Installs plugin globally. | 安裝插件並更新設定。 | 可用 `-g` 全域安裝。 |
| `kilo debug` | Debug/troubleshooting toolset. | `kilo debug config` | Access debug subcommands. | 除錯工具集合。 | 可看 config、lsp、rg、file 等診斷。 |
| `kilo remote` | Enable remote connection relay mode. | `kilo remote` | Starts remote relay capability. | 啟用遠端連線 relay。 | 讓 session 可遠端串接。 |
| `kilo upgrade [target]` | Upgrade to latest or specific version. | `kilo upgrade v0.1.48` | Updates Kilo to selected version. | 升級 Kilo。 | 可指定版本或升最新版。 |
| `kilo uninstall` | Uninstall Kilo and related files. | `kilo uninstall --dry-run` | Preview what would be removed. | 解除安裝 Kilo。 | 可先 dry-run 檢查刪除內容。 |
| `kilo completion` | Generate shell completion script. | `kilo completion` | Outputs completion for shell setup. | 產生 shell 自動補全腳本。 | 用於 zsh/bash/fish 整合。 |
| `kilo help [command]` | Show full CLI help. | `kilo help --all --format md` | Prints all command docs in markdown. | 顯示 CLI 說明。 | 可輸出完整 markdown 參考。 |
| `kilo --version` | Print CLI version. | `kilo --version` | Shows installed Kilo version. | 顯示 Kilo 版本。 | 確認目前安裝版本。 |
