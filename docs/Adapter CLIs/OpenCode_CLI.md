# OpenCode CLI 指令整理

來源：
- https://opencode.ai/docs/cli/
- https://opencode.ai/docs/web/

| Command | Command Description | Command Example | Command Example Explain | 指令說明 | 範例指令說明 |
|---|---|---|---|---|---|
| `opencode` (default TUI) | Start the OpenCode terminal user interface (TUI) by default. | `opencode` | Launches the TUI in the current directory. | 預設啟動 OpenCode 的終端互動介面（TUI）。 | 在目前目錄啟動 TUI。 |
| `opencode [project]` (default TUI) | Start TUI with a target project directory. | `opencode /path/to/project` | Opens TUI using the given directory as the project context. | 以指定專案目錄作為上下文啟動 TUI。 | 用指定資料夾作為專案根目錄開啟 TUI。 |
| `opencode --continue, -c` | Continue the last session. | `opencode --continue` | Continues the most recent session. | 續接上一個 session。 | 直接回到最近一次會話。 |
| `opencode --session, -s <id>` | Continue a specific session by ID. | `opencode --session abc123` | Continues session `abc123`. | 用 session ID 續接會話。 | 直接進入 `abc123`。 |
| `opencode --fork` | Fork the session when continuing (use with `--continue`/`--session`). | `opencode --continue --fork` | Continues by creating a new forked session. | 續接時分叉成新 session。 | 從最近會話分支續聊，不覆蓋原會話。 |
| `opencode --prompt <name>` | Prompt preset to use. | `opencode --prompt my-prompt` | Starts using the specified prompt preset. | 指定要使用的 prompt。 | 用指定 prompt 啟動。 |
| `opencode --model, -m <provider/model>` | Model to use in the form of `provider/model`. | `opencode -m google/gemini-2.5-flash` | Uses the specified provider/model. | 指定使用模型。 | 以 `provider/model` 指定模型。 |
| `opencode --agent <name>` | Agent to use. | `opencode --agent reviewer` | Uses agent `reviewer`. | 指定 agent。 | 用 `reviewer` agent 啟動。 |
| `opencode --port <port>` | Port to listen on (server-related modes). | `opencode web --port 4096` | Starts the web server on port 4096. | 指定監聽 port。 | 讓 web server 固定用 4096。 |
| `opencode --hostname <host>` | Hostname to listen on (server-related modes). | `opencode web --hostname 0.0.0.0` | Binds to all interfaces for LAN access. | 指定綁定 hostname。 | 用 `0.0.0.0` 讓區網可存取。 |
| `opencode agent` | Manage agents for OpenCode. | `opencode agent [command]` | Runs an agent management subcommand (e.g. `create`, `list`). | 管理 OpenCode 的 agents。 | 執行 agent 子指令（如建立/列出）。 |
| `opencode agent create` | Create a new agent with custom configuration. | `opencode agent create` | Starts an interactive flow to create an agent (prompt + tools config). | 建立自訂 agent 設定。 | 進入互動式流程建立 agent（含系統提示詞與工具設定）。 |
| `opencode agent list` | List all available agents. | `opencode agent list` | Prints available agents. | 列出可用的 agents。 | 顯示目前可用的 agent 清單。 |
| `opencode attach [url]` | Attach a terminal TUI to a running OpenCode backend started via `serve`/`web`. | `opencode web --port 4096 --hostname 0.0.0.0`<br/>`opencode attach http://10.20.30.40:4096` | Starts a remote-accessible server, then attaches a local TUI to it. | 將本機 TUI 連到已在遠端/本機跑起來的 OpenCode 後端。 | 先啟動可遠端存取的 server，再用 attach 把本機 TUI 接上去操作。 |
| `opencode auth` | Manage credentials and login for providers. | `opencode auth [command]` | Runs auth subcommands (login/list/logout). | 管理各模型供應商（providers）的登入憑證。 | 執行 auth 子指令（登入/列出/登出）。 |
| `opencode auth login` | Configure API keys for providers; stored in `~/.local/share/opencode/auth.json`. | `opencode auth login` | Logs in / saves provider credentials; also reads env vars or project `.env`. | 設定/登入各 provider 的 API key，並保存到本機憑證檔。 | 互動式登入並寫入憑證；啟動時也會讀環境變數或專案 `.env`。 |
| `opencode auth list` | List authenticated providers stored in the credentials file. | `opencode auth list` | Shows providers you’re logged in to. | 列出已登入（已保存憑證）的 providers。 | 顯示目前已登入的供應商清單。 |
| `opencode auth ls` | Short alias for `opencode auth list`. | `opencode auth ls` | Same output as `auth list`. | `auth list` 的縮寫。 | 與 `auth list` 相同效果。 |
| `opencode auth logout` | Log out of a provider by clearing it from the credentials file. | `opencode auth logout` | Removes stored credentials for the selected provider. | 登出並清除某 provider 的本機憑證。 | 從憑證檔移除該 provider 的登入資訊。 |
| `opencode github` | Manage the GitHub agent for repository automation. | `opencode github [command]` | Runs GitHub agent subcommands (install/run). | 管理用於 Repo 自動化的 GitHub agent。 | 執行 GitHub agent 子指令（安裝/執行）。 |
| `opencode github install` | Install the GitHub agent in your repository (sets up GitHub Actions workflow). | `opencode github install` | Configures the repo for running the GitHub agent in Actions. | 在 repo 內安裝 GitHub agent（建立所需的 Actions workflow 等）。 | 讓 repo 具備在 GitHub Actions 內執行 agent 的設定。 |
| `opencode github run` | Run the GitHub agent (typically in GitHub Actions). | `opencode github run` | Executes the GitHub agent; supports flags like mock event/token. | 執行 GitHub agent（多用於 Actions）。 | 在 CI 環境中跑 agent（可搭配 event/token 參數）。 |
| `opencode mcp` | Manage Model Context Protocol (MCP) servers. | `opencode mcp [command]` | Runs MCP management subcommands. | 管理 MCP servers。 | 執行 MCP 子指令（新增/列出/授權等）。 |
| `opencode mcp add` | Add an MCP server to your configuration. | `opencode mcp add` | Interactive flow to add local/remote MCP server. | 新增 MCP server 設定。 | 互動式新增本機或遠端 MCP server。 |
| `opencode mcp list` | List configured MCP servers and connection status. | `opencode mcp list` | Shows MCP servers + whether they’re connected. | 列出已設定的 MCP servers 與連線狀態。 | 顯示 MCP server 清單與目前狀態。 |
| `opencode mcp ls` | Short alias for `opencode mcp list`. | `opencode mcp ls` | Same output as `mcp list`. | `mcp list` 的縮寫。 | 與 `mcp list` 相同效果。 |
| `opencode mcp auth [name]` | Authenticate with an OAuth-enabled MCP server. | `opencode mcp auth [name]` | OAuth login for a server; prompts if name omitted. | 對支援 OAuth 的 MCP server 進行授權登入。 | 指定 server 名稱授權；不給名稱會提示選擇。 |
| `opencode mcp auth list` | List OAuth-capable MCP servers and their auth status. | `opencode mcp auth list` | Shows which OAuth MCP servers are authenticated. | 列出支援 OAuth 的 MCP servers 與授權狀態。 | 顯示哪些 server 已授權、哪些尚未。 |
| `opencode mcp auth ls` | Short alias for `opencode mcp auth list`. | `opencode mcp auth ls` | Same as `mcp auth list`. | `mcp auth list` 的縮寫。 | 與 `mcp auth list` 相同效果。 |
| `opencode mcp logout [name]` | Remove OAuth credentials for an MCP server. | `opencode mcp logout [name]` | Clears OAuth tokens/credentials for the server. | 移除某 MCP server 的 OAuth 授權資訊。 | 清除該 server 的 OAuth 憑證。 |
| `opencode mcp debug <name>` | Debug OAuth connection issues for an MCP server. | `opencode mcp debug <name>` | Prints diagnostics to troubleshoot OAuth connectivity. | 用於排查 MCP server 的 OAuth 連線問題。 | 輸出診斷資訊協助除錯。 |
| `opencode models [provider]` | List available models from configured providers (`provider/model`). | `opencode models anthropic` | Shows models for a specific provider. | 列出各 provider 可用模型（格式 `provider/model`）。 | 篩選並顯示某個 provider 的模型清單。 |
| `opencode run [message..]` | Run in non-interactive mode by passing a prompt directly. | `opencode run Explain the use of context in Go`<br/>`opencode serve`<br/>`opencode run --attach http://localhost:4096 "Explain async/await in JavaScript"` | First runs a one-off prompt; second example avoids cold boots by attaching to a running server. | 以非互動模式直接送出提示詞（適合腳本/自動化）。 | 直接問一次；或先開 `serve` 再用 `--attach` 重用 server，避免每次冷啟動。 |
| `opencode run --attach <url> "<message>"` | Attach `run` to a running `serve` instance to avoid cold boot. | `opencode run --attach http://localhost:4096 "Explain async/await"` | Uses the already running backend at the URL. | 讓 `run` 連到既有後端執行。 | 透過 `--attach` 重用 `serve/web` 後端。 |
| `opencode run --file, -f <path>` | Attach file(s) to the message. | `opencode run -f ./error.log "Explain this"` | Sends the file as context with the prompt. | 在 `run` 模式附檔。 | 把檔案一起帶入上下文。 |
| `opencode run --format <default\|json>` | Output format for `run`. | `opencode run --format json "Hello"` | Outputs raw JSON events. | 設定 `run` 輸出格式。 | 用 `json` 方便腳本解析。 |
| `opencode run --title <text>` | Title for the session. | `opencode run --title "Quick check" "Check types"` | Names the session explicitly. | 設定 session 標題。 | 給這次 run 產生的會話命名。 |
| `opencode run --share` | Share the session. | `opencode run --share "Summarize this"` | Creates a shareable session. | 將 session 設為可分享。 | 產生可分享的會話。 |
| `opencode serve` | Start a headless OpenCode server for API access (supports basic auth via env). | `opencode serve` | Starts an HTTP server (no TUI) exposing an API. | 啟動無介面的後端 server，提供 HTTP API 存取。 | 開一個純後端 HTTP 服務供程式/工具呼叫。 |
| `opencode serve --port <port>` | Port to listen on. | `opencode serve --port 4096` | Starts the server on port 4096. | 指定 `serve` 監聽 port。 | 固定監聽 4096。 |
| `opencode serve --hostname <host>` | Hostname to listen on. | `opencode serve --hostname 0.0.0.0 --port 4096` | Binds to all interfaces for LAN access. | 指定 `serve` 綁定 hostname。 | 用 `0.0.0.0` 讓區網可存取。 |
| `opencode serve --mdns` | Enable mDNS discovery. | `opencode serve --mdns` | Makes the server discoverable on the local network. | 啟用 mDNS 發現。 | 讓同網段可用 mDNS 找到服務。 |
| `opencode serve --cors <origin>` | Additional browser origin(s) to allow CORS. | `opencode serve --cors https://example.com` | Allows browser requests from the origin. | 設定額外 CORS 來源。 | 讓 `https://example.com` 可跨域存取。 |
| `opencode session` | Manage OpenCode sessions. | `opencode session [command]` | Runs session subcommands (e.g. list). | 管理 OpenCode 的 sessions。 | 執行 session 子指令（如列出）。 |
| `opencode session list` | List all OpenCode sessions. | `opencode session list` | Prints session list (supports table/json output). | 列出所有 session。 | 顯示 session 清單（可輸出 table/json）。 |
| `opencode session list --max-count, -n <N>` | Limit to N most recent sessions. | `opencode session list -n 20` | Shows the 20 most recent sessions. | 限制列出 session 數量。 | 只列最近 20 個 session。 |
| `opencode session list --format <table\|json>` | Choose output format for session list. | `opencode session list --format json` | Outputs sessions as JSON. | 指定 session list 輸出格式。 | 用 `json` 方便程式處理。 |
| `opencode stats` | Show token usage and cost statistics for sessions. | `opencode stats` | Displays usage/cost stats (supports filters like days/tools/models/project). | 顯示 sessions 的 token 用量與花費統計。 | 觀看用量/成本統計（可用參數篩選）。 |
| `opencode stats --days <N>` | Show stats for the last N days (or all time). | `opencode stats --days 7` | Shows last 7 days of stats. | 指定統計天數。 | 查看近 7 天統計。 |
| `opencode stats --tools <N>` | Number of tools to show (or all). | `opencode stats --tools 10` | Shows top 10 tools by usage. | 顯示工具使用統計。 | 顯示使用量最高前 10 個工具。 |
| `opencode stats --models <N>` | Show model usage breakdown (hidden by default). | `opencode stats --models 5` | Shows top 5 models by usage. | 顯示模型使用分佈。 | 顯示使用量最高前 5 個模型。 |
| `opencode stats --project <name>` | Filter by project. | `opencode stats --project ""` | Filters stats to current project only. | 依專案篩選統計。 | 用空字串代表目前專案。 |
| `opencode export [sessionID]` | Export session data as JSON (prompts if session ID omitted). | `opencode export [sessionID]` | Exports a chosen session to JSON. | 匯出某個 session 成 JSON。 | 指定或選擇 session 後輸出 JSON 資料。 |
| `opencode import <file>` | Import session data from a JSON file or an OpenCode share URL. | `opencode import session.json`<br/>`opencode import https://opncd.ai/s/abc123` | Imports from local JSON or from a shared session URL. | 從 JSON 檔或分享連結匯入 session。 | 支援本機檔案或 OpenCode share URL 匯入。 |
| `opencode web` | Start a headless server with a web interface (supports basic auth via env). | `opencode web` | Starts HTTP server and opens a browser for the web UI. | 啟動帶 Web UI 的 server，並開啟瀏覽器。 | 開啟 Web 介面來使用 OpenCode。 |
| `opencode web --port <port>` | Specify a fixed port for the web server. | `opencode web --port 4096` | Starts the web UI on port 4096. | 指定 Web server port。 | 固定用 4096 開啟 Web UI。 |
| `opencode web --hostname <host>` | Bind hostname (use `0.0.0.0` for LAN access). | `opencode web --hostname 0.0.0.0 --port 4096` | Makes the web UI accessible on your network. | 指定 Web server 綁定 hostname。 | 用 `0.0.0.0` 讓同網段可連線。 |
| `opencode web --mdns` | Enable mDNS discovery (advertises as `opencode.local`). | `opencode web --mdns` | Sets hostname to `0.0.0.0` and advertises via mDNS. | 啟用 mDNS 發現。 | 區網可用 `opencode.local` 存取。 |
| `opencode web --mdns --mdns-domain <domain>` | Customize mDNS domain name to run multiple instances. | `opencode web --mdns --mdns-domain myproject.local` | Advertises as `myproject.local`. | 自訂 mDNS 網域名稱。 | 多實例用不同 `*.local` 區分。 |
| `opencode web --cors <origin>` | Allow additional domains for CORS. | `opencode web --cors https://example.com` | Allows browser requests from the origin. | 允許額外 CORS 來源。 | 讓自訂前端可跨網域呼叫。 |
| `OPENCODE_SERVER_PASSWORD=<pw> opencode web` | Enable HTTP basic auth for `serve`/`web`. | `OPENCODE_SERVER_PASSWORD=secret opencode web` | Protects access; username defaults to `opencode`. | 為 `serve/web` 啟用 Basic Auth。 | 用密碼保護 Web UI/API；預設帳號 `opencode`。 |
| `OPENCODE_SERVER_USERNAME=<name>` | Override the basic auth username (default `opencode`). | `OPENCODE_SERVER_USERNAME=admin OPENCODE_SERVER_PASSWORD=secret opencode web` | Uses `admin` as the username. | 覆蓋 Basic Auth 的使用者名稱。 | 改成 `admin/secret` 登入。 |
| `opencode.json (server config)` | Configure server settings in config file (CLI flags take precedence). | `{ "server": { "port": 4096, "hostname": "0.0.0.0", "mdns": true, "cors": ["https://example.com"] } }` | Sets default server config for web/serve. | 用設定檔配置 server 行為。 | 設定預設 port/hostname/mdns/cors（CLI 參數優先）。 |
| `opencode acp` | Start an ACP (Agent Client Protocol) server via stdin/stdout (nd-JSON). | `opencode acp` | Runs an ACP server that communicates over stdio using nd-JSON. | 啟動 ACP server（用 stdin/stdout 以 nd-JSON 溝通）。 | 讓外部 client 透過標準輸入輸出與 OpenCode 對接。 |
| `opencode uninstall` | Uninstall OpenCode and remove related files. | `opencode uninstall` | Removes the installation (supports keep-config/keep-data/dry-run/force flags). | 解除安裝 OpenCode 並移除相關檔案。 | 執行移除（可選擇保留設定/資料或先 dry-run）。 |
| `opencode uninstall --dry-run` | Show what would be removed without removing. | `opencode uninstall --dry-run` | Previews files that would be removed. | 解除安裝預覽。 | 先看會刪哪些檔案。 |
| `opencode uninstall --keep-config, -c` | Keep configuration files when uninstalling. | `opencode uninstall --keep-config` | Removes binaries but keeps config. | 解除安裝時保留設定檔。 | 不刪設定，只移除程式與相關檔案。 |
| `opencode uninstall --keep-data, -d` | Keep session data and snapshots when uninstalling. | `opencode uninstall --keep-data` | Keeps session history data. | 解除安裝時保留 session 資料。 | 保留對話/快照資料不刪。 |
| `opencode uninstall --force, -f` | Skip confirmation prompts during uninstall. | `opencode uninstall --force` | Uninstalls without prompting. | 解除安裝跳過確認。 | 直接移除不再提示。 |
| `opencode upgrade [target]` | Update opencode to the latest version or a specific version. | `opencode upgrade`<br/>`opencode upgrade v0.1.48` | Upgrades to latest; or pins to a specific version. | 升級 opencode 到最新版或指定版本。 | 不帶版本升到最新；帶版本號則升到指定版本。 |
| `opencode upgrade --method, -m <curl\|npm\|pnpm\|bun\|brew>` | The installation method that was used. | `opencode upgrade --method brew` | Upgrades using Homebrew method. | 指定升級方式。 | 用 `brew` 的安裝方式進行升級。 |
| `opencode --help, -h` | Display help. | `opencode --help` | Prints usage and flags. | 顯示說明。 | 查看所有用法與參數。 |
| `opencode --version, -v` | Print version number. | `opencode --version` | Shows CLI version. | 顯示版本號。 | 印出 opencode 版本。 |
| `opencode --print-logs` | Print logs to stderr. | `opencode --print-logs` | Emits logs on stderr for debugging. | 將 logs 輸出到 stderr。 | 除錯或腳本分流 logs。 |
| `opencode --log-level <DEBUG\|INFO\|WARN\|ERROR>` | Set log level. | `opencode --log-level DEBUG` | Enables verbose debug logging. | 設定 log 等級。 | 用 DEBUG 看更多除錯資訊。 |
