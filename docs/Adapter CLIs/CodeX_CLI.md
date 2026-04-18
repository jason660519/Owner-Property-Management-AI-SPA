# CodeX CLI 指令整理

| Command | Command Description | Command Example | Command Example Explain | 指令說明 | 範例指令說明 |
|---|---|---|---|---|---|
| `cd <project> && codex` | Launch the Codex terminal UI in a project directory. | `cd my-project && codex` | Opens Codex with the current directory as the workspace. | 在專案目錄開啟 Codex。 | 切到 `my-project` 後啟動 Codex。 |
| `codex --full-auto` | Reduce confirmations and let Codex run commands more automatically. | `codex --full-auto` | Runs in a low-friction mode with fewer approval prompts. | Codex 盡量自動執行命令、減少提示確認。 | 以全自動偏好的模式啟動 Codex。 |
| `codex --help` | Show all flags and usage. | `codex --help` | Prints CLI help text. | 顯示所有參數與用法。 | 列出指令說明與可用參數。 |
| `codex --model <model>` | Override the model used for this run. | `codex --model gpt-5` | Uses `gpt-5` for the session. | 指定使用模型。 | 指定本次使用 `gpt-5`。 |
| `codex --profile <name>` | Load a named profile from `~/.codex/config.toml`. | `codex --profile work` | Loads the `work` profile settings. | 使用 `config.toml` 中的設定檔。 | 以 `work` 設定檔啟動。 |
| `codex --remote <ws-url>` | Connect interactive TUI to a remote app-server over WebSocket. | `codex --remote ws://192.168.1.10:8080` | Uses a remote/local server as the backend while TUI runs locally. | 連到另一台機器上的 Codex app-server。 | CLI 當前端，連到 `192.168.1.10:8080` 的 server。 |
| `codex --remote <wss-url>` | Connect to a secure remote app-server via TLS WebSocket. | `codex --remote wss://myserver.com` | Encrypted WebSocket connection. | 使用加密 WebSocket 連遠端 server。 | 以 `wss://` 安全連線遠端。 |
| `codex --remote <wss-url> --remote-auth-token-env <ENV>` | Send bearer token from env var when connecting with `--remote`. | `codex --remote wss://myserver.com --remote-auth-token-env CODEX_TOKEN` | Reads `CODEX_TOKEN` from environment for auth. | 從環境變數讀 token 做驗證。 | 先設定 `CODEX_TOKEN`，再連線進行驗證。 |
| `codex --search` | Enable live browsing instead of cached search. | `codex --search` | Uses live web search for the session. | 啟用 live browsing，而不是 cached search。 | 改用即時查詢網路資料。 |
| `codex --search --full-auto` | Live search while running in low-friction auto mode. | `codex --search --full-auto` | Searches the web live and proceeds with fewer prompts. | 一邊查網路一邊自動修 code。 | 即時查詢 + 偏自動化執行。 |
| `codex --version` | Print CLI version number. | `codex --version` | Outputs installed Codex CLI version. | 顯示 CLI 版本號。 | 印出目前安裝版本。 |
| `codex -i <img1,img2,...>` | Attach one or more images to the initial prompt. | `codex -i login.png,dashboard.png` | Starts a session with multiple image attachments. | 一次附多張圖給 agent 分析。 | 以多張圖作為第一輪輸入附件。 |
| `codex -i <img>` | Attach an image to the initial prompt. | `codex -i mockup.png` | Starts with a design mockup attached. | 上傳設計圖後讓 Codex 生頁面。 | 以設計圖作為輸輸入，請 Codex 生成介面。 |
| `codex -i <img>` | Attach an image to the initial prompt. | `codex -i screenshot.png` | Starts the first turn with a screenshot. | 附圖進入第一輪對話。 | 以截圖作為第一輪輸入。 |
| `/agent` | Switch the active agent thread. | `/agent` | Inspect or continue work in a spawned subagent thread. | 切換目前使用的 agent thread。 | 進入子代理 thread 檢視或續做工作。 |
| `/apps` | Browse apps (connectors) and insert them into your prompt. | `/apps` | Attach an app as `$app-slug` before asking Codex to use it. | 瀏覽可用 apps（connectors）並插入到提示詞。 | 先附加 `$app-slug`，再請 Codex 使用該 app。 |
| `/clear` | Clear the terminal and start a fresh chat. | `/clear` | Resets visible UI and conversation for a fresh start. | 清除終端畫面並重置對話。 | 想要重新開始時使用。 |
| `/compact` | Summarize the visible conversation to free tokens. | `/compact` | Keeps key points while reducing context usage. | 壓縮對話以釋放 token。 | 長時間執行後保留重點、降低上下文占用。 |
| `/copy` | Copy the latest completed Codex output. | `/copy` | Copies the most recent finished response/plan. | 複製最近一次完成的輸出。 | 方便快速取用最新回覆內容。 |
| `/debug-config` | Print config layer and requirements diagnostics. | `/debug-config` | Helps debug precedence and policy requirements. | 輸出設定層與需求診斷資訊。 | 用於排查設定覆蓋與政策限制。 |
| `/diff` | Show the Git diff, including untracked files. | `/diff` | Review edits before commit/tests. | 顯示 Git diff（含未追蹤檔案）。 | 檢查 Codex 的修改內容再提交或跑測試。 |
| `/exit` | Exit the CLI (same as `/quit`). | `/exit` | Alternative spelling; both exit. | 退出 CLI（同 `/quit`）。 | 立刻結束會話。 |
| `/experimental` | Toggle experimental features. | `/experimental` | Enables/disables optional features. | 切換實驗功能。 | 開啟/關閉可選功能（如 subagents）。 |
| `/fast` | Toggle Fast mode for GPT-5.4. | `/fast` | Turn Fast mode on/off or check status. | 切換 Fast 模式（GPT-5.4）。 | 開關快速模式或查看是否啟用。 |
| `/feedback` | Send logs to the Codex maintainers. | `/feedback` | Report issues or share diagnostics. | 送出回饋與 logs。 | 回報問題或提供診斷資訊。 |
| `/fork` | Fork the current conversation into a new thread. | `/fork` | Branch to explore a new approach without losing current transcript. | 將對話分支成新 thread。 | 保留原脈絡，開新分支嘗試不同解法。 |
| `/init` | Generate an `AGENTS.md` scaffold in the current directory. | `/init` | Captures persistent instructions for the repo/dir. | 產生 `AGENTS.md` 範本。 | 在目前目錄建立可長期使用的指令/規範骨架。 |
| `/logout` | Sign out of Codex. | `/logout` | Clears local credentials. | 登出 Codex。 | 共用電腦時清除登入資訊。 |
| `/mcp` | List configured MCP tools. | `/mcp` | Shows which external tools are available. | 列出 MCP 工具。 | 檢查會話中可呼叫的外部工具。 |
| `/mention` | Attach a file to the conversation. | `/mention` | Points Codex to specific files/folders to inspect. | 附加檔案到對話。 | 指定要讓 Codex 下一步檢視的檔案/資料夾。 |
| `/model` | Choose the active model (and reasoning effort when available). | `/model` | Switch models before running a task. | 選擇模型（可能含推理強度）。 | 在執行任務前切換適合的模型。 |
| `/new` | Start a new conversation in the same CLI session. | `/new` | Resets chat context without leaving the CLI. | 在同一個 CLI 內開新對話。 | 不退出程式，直接重置對話上下文。 |
| `/permissions` | Set what Codex can do without asking first. | `/permissions` | Tighten/relax approvals mid-session. | 設定權限/核准策略。 | 於會話中切換 Auto、Read Only 等策略。 |
| `/personality` | Choose a communication style for responses. | `/personality` | Adjust verbosity and tone without changing instructions. | 選擇回覆風格。 | 讓回覆更精簡/更詳盡/更協作。 |
| `/plan` | Switch to plan mode and optionally send a prompt. | `/plan` | Requests an execution plan before changes. | 切換到規劃模式。 | 先要計畫再開始實作。 |
| `/plugins` | Browse installed and discoverable plugins. | `/plugins` | Inspect/install/manage plugin availability. | 管理插件。 | 查看已裝/可安裝插件並調整可用性。 |
| `/ps` | Show experimental background terminals and recent output. | `/ps` | Check long-running commands without leaving transcript. | 顯示背景終端與輸出（實驗）。 | 查看長跑指令的狀態與最近輸出。 |
| `/quit` | Exit the CLI. | `/quit` | Leaves session immediately. | 退出 CLI。 | 立刻離開會話。 |
| `/resume` | Resume a saved conversation from your session list. | `/resume` | Continue a previous session without starting over. | 恢復已保存的對話。 | 從清單選擇舊會話續做。 |
| `/review` | Ask Codex to review your working tree. | `/review` | Useful after changes or for a second set of eyes. | 請 Codex 檢視工作目錄修改。 | 改完後做一次檢查或請它找問題。 |
| `/sandbox-add-read-dir` | Grant sandbox read access to an extra directory (Windows only). | `/sandbox-add-read-dir` | Unblocks commands that need to read outside roots. | 允許 sandbox 額外讀取目錄（Windows）。 | 讓 sandbox 能讀取工作區之外的絕對路徑目錄。 |
| `/status` | Display session configuration and token usage. | `/status` | Confirms model, policy, roots, and remaining context. | 顯示會話設定與 token 使用量。 | 確認模型、核准策略、可寫目錄與剩餘上下文。 |
| `/statusline` | Configure status-line fields interactively. | `/statusline` | Reorder footer items and persist to `config.toml`. | 設定狀態列顯示欄位。 | 選擇/排序 footer 資訊並保存到設定檔。 |
| `/stop` | Stop all background terminals. | `/stop` | Cancels background work started by the session. | 停止所有背景終端。 | 取消目前會話啟動的背景任務。 |
| `/title` | Configure terminal window/tab title fields interactively. | `/title` | Pick and reorder title items like project/model/progress. | 設定終端標題欄位。 | 選擇/排序標題資訊（專案、分支、模型、進度等）。 |
| `codex` | Launch the terminal UI (accepts global flags and optional prompt/images). | `codex` | Opens interactive TUI. | 啟動 TUI。 | 直接進入互動介面。 |
| `codex app` | Launch the Codex desktop app on macOS, optionally with a workspace path. | `codex app` | Opens the desktop app. | 在 macOS 開啟 Codex Desktop。 | 啟動桌面版。 |
| `codex app-server` | Launch the Codex app server for local development/debugging. | `codex app-server` | Starts local app-server backend. | 啟動本機 Codex app server。 | 開發/除錯用後端 server。 |
| `codex apply` | Apply the latest diff generated by a Codex Cloud task. (Alias: `codex a`) | `codex apply` | Applies the most recent cloud-generated patch to working tree. | 套用 Codex Cloud 產生的最新 diff。 | 把雲端任務的修改套到本機。 |
| `codex cloud` | Browse or execute Codex Cloud tasks without opening the TUI. (Alias: `codex cloud-tasks`) | `codex cloud` | Lists/runs cloud tasks from terminal. | 從終端瀏覽/執行 Codex Cloud 任務。 | 不開 TUI 也能管理雲端任務。 |
| `codex completion` | Generate shell completion scripts. | `codex completion` | Produces completion scripts for shells (bash/zsh/fish/powershell). | 產生命令列自動補全腳本。 | 生成對應 shell 的 completion。 |
| `codex debug app-server send-message-v2` | Debug app-server by sending a single V2 message through test client. | `codex debug app-server send-message-v2` | Sends a test message for debugging. | 以測試 client 對 app-server 發送 V2 訊息除錯。 | 用來驗證 app-server 訊息流程。 |
| `codex exec` | Run Codex non-interactively. (Alias: `codex e`) | `codex exec "<prompt>"` | Runs a task and streams results to stdout/JSONL. | 非互動模式執行 Codex。 | 適合腳本化執行並輸出結果。 |
| `codex execpolicy` | Evaluate execpolicy rules and see allow/prompt/block decisions. | `codex execpolicy` | Checks what would happen for a given command/ruleset. | 評估 execpolicy 規則。 | 查看指令會被允許/詢問/阻擋。 |
| `codex features` | List feature flags and persistently enable/disable in `config.toml`. | `codex features` | Manages feature toggles. | 管理功能旗標。 | 列出並可在設定檔中開關功能。 |
| `codex fork` | Fork a previous interactive session into a new thread. | `codex fork` | Opens a picker to select a session to fork. | 從舊對話分支出新對話。 | 以選單挑一個 session 開新 thread。 |
| `codex login` | Authenticate Codex (ChatGPT OAuth, device auth, or API key via stdin). | `codex login` | Starts login flow. | 登入/驗證 Codex。 | 進行 OAuth 或其他登入流程。 |
| `codex logout` | Remove stored authentication credentials. | `codex logout` | Signs out and clears local creds. | 移除登入憑證。 | 清除本機保存的驗證資訊。 |
| `codex mcp` | Manage MCP servers (list/add/remove/authenticate). | `codex mcp` | Configures MCP integrations. | 管理 MCP servers。 | 列出/新增/移除/授權 MCP。 |
| `codex mcp-server` | Run Codex as an MCP server over stdio. | `codex mcp-server` | Allows other tools to connect to Codex via stdio. | 將 Codex 啟動為 MCP server（stdio）。 | 讓外部工具透過 stdio 與 Codex 溝通。 |
| `codex resume` | Continue a previous interactive session by ID or most recent conversation. | `codex resume <SESSION_ID>` | Resumes the specified session. | 恢復先前的互動式會話。 | 用 session ID 精準續接。 |
| `codex sandbox` | Run arbitrary commands inside Codex sandbox. | `codex sandbox -- ls -la` | Runs `ls -la` under sandbox restrictions. | 在 sandbox 環境執行指令。 | 以沙盒限制執行 `ls -la`。 |
| `--add-dir` | Grant additional directories write access (repeatable). | `codex --add-dir ../shared --add-dir ../lib` | Adds multiple writable roots. | 增加可寫入目錄（可重複）。 | 讓 Codex 可寫入多個額外路徑。 |
| `--ask-for-approval, -a` | Control when Codex asks for approval before running commands. | `codex -a on-request` | Prompts only when needed. | 控制何時需要人工核准。 | 在需要時才詢問（互動常用）。 |
| `--cd, -C` | Set working directory before processing request. | `codex -C ./my-project` | Starts in `./my-project`. | 設定啟動後的工作目錄。 | 先切到指定目錄再開始。 |
| `--config, -c` | Override configuration values (JSON-parsed when possible). | `codex -c model_provider="oss"` | Overrides config for this run. | 覆蓋設定值（可解析 JSON）。 | 本次執行臨時改設定。 |
| `--dangerously-bypass-approvals-and-sandbox, --yolo` | Run commands without approvals or sandboxing (only in hardened env). | `codex --yolo` | Disables approvals and sandbox protections. | 危險模式：略過核准與沙盒。 | 僅建議在已額外強化的環境中使用。 |
| `--disable <feature>` | Force-disable a feature flag (repeatable). | `codex --disable <name>` | Equivalent to `-c features.<name>=false`. | 強制停用某功能旗標。 | 停用指定 feature。 |
| `--enable <feature>` | Force-enable a feature flag (repeatable). | `codex --enable <name>` | Equivalent to `-c features.<name>=true`. | 強制啟用某功能旗標。 | 啟用指定 feature。 |
| `--no-alt-screen` | Disable alternate screen mode for the TUI. | `codex --no-alt-screen` | Uses normal terminal screen buffer. | 停用 TUI 的替代螢幕模式。 | 避免切換到 alternate screen。 |
| `--oss` | Use local open-source model provider (validates Ollama is running). | `codex --oss` | Uses local provider for the session. | 使用本機 OSS 模型供應商。 | 需先確保 Ollama 正在執行。 |
| `--model, -m` | Override the configured model. | `codex -m gpt-5.4` | Uses `gpt-5.4` for this run. | 覆蓋預設模型。 | 指定本次模型為 `gpt-5.4`。 |
| `--remote` | Connect interactive TUI to a remote app-server (supported for `codex`, `codex resume`, `codex fork`). | `codex --remote ws://127.0.0.1:8080` | Uses remote mode for interactive TUI. | 以 remote 模式連線 app-server。 | 用 TUI 當 client，連到指定 WebSocket。 |
| `--remote-auth-token-env` | Read bearer token from env var and send it with `--remote`. | `codex --remote wss://myserver.com --remote-auth-token-env CODEX_TOKEN` | Sends bearer token for auth. | 以環境變數提供 remote 連線 token。 | 安全地把 token 交給連線驗證。 |
| `--sandbox, -s` | Select sandbox policy for model-generated shell commands. | `codex -s workspace-write` | Chooses a sandbox policy. | 選擇 sandbox 策略。 | 設定模型產生指令的沙盒限制。 |
| `--search` | Enable live web search (sets web_search to `live`). | `codex --search` | Uses live search instead of cached. | 啟用即時網路搜尋。 | 改用 live search。 |
| `PROMPT` | Optional initial text instruction (omit to open TUI without prefilled message). | `codex "Fix failing tests"` | Opens TUI with an initial prompt. | 可選的初始提示詞。 | 啟動後第一輪就帶入任務描述。 |
| `codex app --download-url <url>` | Override default macOS Desktop download URL. | `codex app --download-url "https://example.com/codex.dmg"` | Installs Desktop app from custom source. | 覆蓋桌面版下載來源。 | 用自訂 URL 安裝（常用於企業鏡像）。 |
| `codex app <path>` | Launch Desktop app with a workspace path. | `codex app .` | Opens current folder as workspace. | 開啟桌面版並載入指定資料夾。 | 用目前資料夾作為 workspace。 |
| `codex app <abs-path>` | Launch Desktop app with an absolute workspace path. | `codex app /Users/name/work/react-app` | Opens a project by full path. | 用完整路徑開啟 workspace。 | 直接載入指定專案。 |
| `codex app <path>` | Launch Desktop app with specified workspace. | `codex app ~/Projects/demo` | Opens selected project folder. | 開啟桌面版並載入指定專案。 | 直接進入 `demo` 專案。 |
| `codex app-server --experimental` | Enable experimental fields and methods. | `codex app-server --experimental` | Includes gated schema features. | 啟用 app-server 實驗功能。 | 開發者測試新 API/schema 用。 |
| `codex app-server --listen stdio://` | Start app-server using stdio transport explicitly. | `codex app-server --listen stdio://` | Communicates via stdin/stdout. | 用 stdio 模式啟動 server。 | 適合本機程式串接。 |
| `codex app-server --listen ws://0.0.0.0:8080` | Start WebSocket server for LAN clients. | `codex app-server --listen ws://0.0.0.0:8080` | Allows devices on same network to connect. | 啟動區網可連線的 WebSocket server。 | 讓同網段裝置測試連線。 |
| `codex app-server --listen ws://0.0.0.0:8080 --ws-auth capability-token --ws-token-file <file>` | Start server with shared token auth. | `codex app-server --listen ws://0.0.0.0:8080 --ws-auth capability-token --ws-token-file /secrets/token.txt` | Requires client to present matching token. | 使用共享 token 驗證 client。 | 以 token 檔保護 WebSocket 存取。 |
| `codex app-server --listen ws://0.0.0.0:8080 --ws-auth signed-bearer-token --ws-shared-secret-file <file>` | Start server with signed bearer token (JWT) auth. | `codex app-server --listen ws://0.0.0.0:8080 --ws-auth signed-bearer-token --ws-shared-secret-file /secrets/key.txt` | Validates JWT using shared secret key. | 使用 JWT 驗證 client。 | 以 shared secret 驗證 bearer token。 |
| `codex app-server --listen ws://127.0.0.1:8080` | Start WebSocket server on localhost only. | `codex app-server --listen ws://127.0.0.1:8080` | Accepts connections from same machine. | 啟動本機 WebSocket server。 | 只允許本機 client 連線。 |
| `codex app-server --ws-audience <aud> --ws-issuer <iss>` | Validate JWT audience and issuer claims. | `codex app-server --listen ws://0.0.0.0:8080 --ws-auth signed-bearer-token --ws-audience codex-client --ws-issuer my-auth` | Only accepts tokens matching aud/iss. | 驗證 token 的 audience 與 issuer。 | 限制 token 來源與用途更安全。 |
| `codex app-server --ws-max-clock-skew-seconds <n>` | Allow JWT clock skew tolerance. | `codex app-server --listen ws://0.0.0.0:8080 --ws-auth signed-bearer-token --ws-max-clock-skew-seconds 60` | Allows 60s time difference. | 設定 token 時差容忍秒數。 | 多主機部署時常用。 |
| `codex fork --last` | Fork most recent session automatically. | `codex fork --last` | Creates new thread from latest session. | 直接分支最新 session。 | 快速複製最近工作流程。 |
| `codex fork <SESSION_ID>` | Fork a specific session by ID. | `codex fork 123e4567` | Forks the session with the given ID. | 指定 session 分支。 | 多版本實驗開發常用。 |
| `codex resume --all --last` | Resume latest session across all directories. | `codex resume --all --last` | Finds latest session globally. | 從所有目錄中找最近 session。 | 適合跨專案工作時使用。 |
| `codex sandbox --full-auto -- <cmd>` | Run sandboxed command with relaxed restrictions. | `codex sandbox --full-auto -- npm test` | Allows write access to workspace and `/tmp`. | 放寬 sandbox 權限執行指令。 | 適合 unattended 或自動化任務。 |
| `codex sandbox -c <key=value> -- <cmd>` | Override sandbox configuration (repeatable). | `codex sandbox -c mode=dev -- ls` | Applies custom config before running. | 覆蓋 sandbox 設定參數。 | 在沙盒中以 `mode=dev` 執行 `ls`。 |
| `codex sandbox -- <cmd>` | Forward command to sandbox; everything after `--` runs inside sandbox. | `codex sandbox -- python app.py` | Runs `python app.py` in sandbox. | 指定要在 sandbox 執行的指令。 | `--` 之後的指令都在沙盒內執行。 |
| `codex sandbox -c <key=value> -c <key2=value2> -- <cmd>` | Apply multiple config overrides. | `codex sandbox -c mode=dev -c debug=true -- npm test` | Runs with multiple sandbox configs applied. | 同時設定多個 config 參數。 | 同時啟用 dev 與 debug 來執行測試。 |
| `codex sandbox -c sandbox.level=high -- <cmd>` | Adjust sandbox security level/policy. | `codex sandbox -c sandbox.level=high -- python app.py` | Runs with stricter sandbox level. | 調整 sandbox 安全等級或策略。 | 用較高限制執行程式。 |
| `codex sandbox -c env.API_KEY=<value> -- <cmd>` | Inject environment variable via sandbox config. | `codex sandbox -c env.API_KEY="<API_KEY>" -- node app.js` | Passes env var into sandbox runtime. | 在 sandbox 中設定環境變數。 | 讓程式在沙盒內讀到 `API_KEY` 執行。 |
| `codex sandbox -c log.level=debug -- <cmd>` | Set logging level via sandbox config. | `codex sandbox -c log.level=debug -- script.sh` | Enables debug logging in sandbox run. | 設定 sandbox 執行時的 log 等級。 | 用 debug 模式執行腳本方便除錯。 |
