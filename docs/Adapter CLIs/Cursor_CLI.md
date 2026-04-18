# Cursor CLI 指令整理

來源：
- Local CLI help (`agent --help`, `agent help <command>`)
- https://cursor.com/install

| Command | Command Description | Command Example | Command Example Explain | 指令說明 | 範例指令說明 |
|---|---|---|---|---|---|
| `agent` | Start interactive Cursor Agent in current directory. | `agent` | Launches interactive session with current folder as workspace. | 在目前目錄啟動 Cursor Agent 互動模式。 | 直接進入互動式開發流程。 |
| `agent "<prompt>"` | Start agent with an initial prompt. | `agent "review this repo"` | Opens session and sends first task immediately. | 用初始提示詞啟動 agent。 | 一開啟就先送出任務。 |
| `agent -p "<prompt>"` | Run in print/non-interactive mode. | `agent -p "summarize this project"` | Prints response and exits (good for scripts). | 以非互動模式執行並輸出結果。 | 適合腳本或一次性查詢。 |
| `agent --output-format <text\|json\|stream-json>` | Control output format in print mode. | `agent -p --output-format json "list risks"` | Returns JSON output for automation. | 設定 print 模式輸出格式。 | 用 `json` 方便程式解析。 |
| `agent --stream-partial-output` | Stream partial deltas in stream-json mode. | `agent -p --output-format stream-json --stream-partial-output "explain build errors"` | Emits partial chunks progressively. | 在串流 JSON 模式輸出部分回覆片段。 | 可即時接收增量回應。 |
| `agent --mode <plan\|ask>` | Start in read-only plan or ask mode. | `agent --mode plan "design auth flow"` | Starts planning/Q&A style session without edits. | 以 plan/ask 只讀模式啟動。 | 先規劃或問答，不直接改檔。 |
| `agent --plan` | Shorthand for plan mode. | `agent --plan "refactor strategy"` | Same as `--mode plan`. | `--mode plan` 的簡寫。 | 快速進入規劃模式。 |
| `agent --resume [chatId]` | Resume an existing chat session. | `agent --resume` | Opens picker (or resume by provided chat ID). | 恢復先前會話。 | 不帶 ID 可選擇會話；帶 ID 可直接續接。 |
| `agent --continue` | Continue previous session quickly. | `agent --continue` | Loads the latest prior chat. | 快速續接最近一次會話。 | 直接延續上次工作。 |
| `agent --model <model>` | Select model for this run. | `agent --model gpt-5` | Uses specified model for current session. | 指定本次使用模型。 | 例如改成 `gpt-5`。 |
| `agent --list-models` | List available models and exit. | `agent --list-models` | Prints model list for the account. | 列出可用模型後結束。 | 查看帳號目前可選模型。 |
| `agent --workspace <path>` | Set workspace directory explicitly. | `agent --workspace ./apps/superadmin` | Uses that path as working root. | 指定工作目錄。 | 不必先 `cd` 也能指定專案根目錄。 |
| `agent -w [name]` | Start in isolated git worktree. | `agent -w feature-auth` | Creates/uses a dedicated worktree for isolated changes. | 在隔離 worktree 啟動。 | 避免汙染目前分支工作區。 |
| `agent --worktree-base <branch>` | Choose base ref for new worktree. | `agent -w feature-auth --worktree-base main` | Creates worktree based on `main`. | 指定 worktree 基底分支/參考。 | 從 `main` 開新隔離工作區。 |
| `agent --skip-worktree-setup` | Skip setup scripts from worktree config. | `agent -w hotfix --skip-worktree-setup` | Avoids running `.cursor/worktrees.json` setup hooks. | 略過 worktree 啟動腳本。 | 不執行預設 setup 流程。 |
| `agent --sandbox <enabled\|disabled>` | Force sandbox mode on/off. | `agent --sandbox enabled` | Overrides config sandbox behavior. | 強制啟用或停用 sandbox。 | 覆蓋設定檔中的 sandbox 選項。 |
| `agent -f` / `agent --yolo` | Force allow commands unless denied. | `agent --yolo "fix lint and commit"` | Low-friction mode with fewer approvals. | 減少核准提示、提高自動化。 | 常用於快速批次修正。 |
| `agent --approve-mcps` | Auto-approve all MCP servers. | `agent --approve-mcps` | Skips manual MCP approval prompts. | 自動核准所有 MCP server。 | 避免每次 MCP 連線都詢問。 |
| `agent --trust` | Trust current workspace in headless/print usage. | `agent -p --trust "check dependencies"` | Bypass trust prompt for scripted runs. | 在無互動模式下信任工作區。 | 腳本執行時避免信任提示中斷。 |
| `agent --api-key <key>` | Provide API key directly. | `agent --api-key sk_xxx -p "hello"` | Uses explicit key instead of stored login. | 直接傳入 API key。 | 臨時或 CI 環境可用。 |
| `CURSOR_API_KEY=<key> agent ...` | Provide API key via environment variable. | `CURSOR_API_KEY=sk_xxx agent -p "status"` | Reads key from env var. | 透過環境變數提供 API key。 | 避免在命令列明文放金鑰。 |
| `agent -H "Name: Value"` | Add custom request header (repeatable). | `agent -H "X-Team: infra" -p "health"` | Sends additional headers with requests. | 加入自訂 HTTP header。 | 可重複加入多個 header。 |
| `agent login` | Authenticate with Cursor account. | `agent login` | Starts login flow in browser/device auth. | 登入 Cursor 帳號。 | 進行授權後即可使用完整功能。 |
| `agent logout` | Sign out and clear local auth. | `agent logout` | Removes local credentials. | 登出並清除本機憑證。 | 共用電腦時建議執行。 |
| `agent status` / `agent whoami` | Show authentication/account status. | `agent status --format json` | Displays login info in text/json format. | 查看目前登入狀態。 | 可輸出 JSON 供腳本判斷。 |
| `agent about` | Show version/system/account details. | `agent about` | Prints environment and account summary. | 顯示版本、系統與帳號資訊。 | 快速檢查安裝與環境。 |
| `agent models` | List available models for this account. | `agent models` | Prints account model availability. | 列出帳號可用模型。 | 跟 `--list-models` 類似但屬於子命令。 |
| `agent update` | Update Cursor Agent to latest version. | `agent update` | Performs CLI self-update. | 更新 Cursor Agent。 | 升級到最新版本。 |
| `agent create-chat` | Create an empty chat and return its ID. | `agent create-chat` | Useful for scripted session orchestration. | 建立空白 chat 並回傳 ID。 | 自動化流程可先建立會話再接續。 |
| `agent ls` | Resume/select a chat session from list. | `agent ls` | Opens chat list for selection. | 從清單恢復會話。 | 用列表挑選要續接的對話。 |
| `agent resume` | Resume the latest chat session. | `agent resume` | Continues most recent chat directly. | 續接最新 chat。 | 快速回到最近一次工作。 |
| `agent install-shell-integration` | Install shell integration to `~/.zshrc`. | `agent install-shell-integration` | Adds helper shell integration. | 安裝 shell 整合設定。 | 將整合內容寫入 `~/.zshrc`。 |
| `agent uninstall-shell-integration` | Remove shell integration from `~/.zshrc`. | `agent uninstall-shell-integration` | Reverts shell integration changes. | 移除 shell 整合設定。 | 還原 `~/.zshrc` 中相關內容。 |
| `agent mcp list` | List configured MCP servers and status. | `agent mcp list` | Shows MCP registry and connection state. | 列出 MCP server 與狀態。 | 檢查哪些 MCP 可用。 |
| `agent mcp login <identifier>` | Authenticate MCP server. | `agent mcp login user-context7` | Performs auth flow for selected MCP server. | 對指定 MCP server 進行登入授權。 | 例如授權 `user-context7`。 |
| `agent mcp list-tools <identifier>` | List tools available on one MCP server. | `agent mcp list-tools user-context7` | Shows tool names and argument signatures. | 列出指定 MCP 的工具清單。 | 可確認工具名稱與參數需求。 |
| `agent mcp enable <identifier>` | Approve/enable an MCP server locally. | `agent mcp enable user-context7` | Adds server to local approved list. | 啟用並核准 MCP server。 | 讓該 server 可被載入使用。 |
| `agent mcp disable <identifier>` | Disable an MCP server locally. | `agent mcp disable user-context7` | Prevents that server from loading. | 停用 MCP server。 | 讓該 server 暫時不可用。 |
| `agent generate-rule` / `agent rule` | Generate Cursor rule interactively. | `agent rule` | Creates a new rule file via guided prompts. | 互動式產生 Cursor 規則檔。 | 依提示快速建立專案規範。 |
| `agent -v` / `agent --version` | Print agent CLI version. | `agent --version` | Outputs installed version string. | 顯示 Cursor CLI 版本。 | 用於確認目前安裝版本。 |
| `agent -h` / `agent --help` | Display help and command list. | `agent --help` | Prints global usage and subcommands. | 顯示說明與子命令清單。 | 查詢可用參數最方便的入口。 |
