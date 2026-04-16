# Claude Code CLI 指令整理

| Command | Command Description | Command Example | Command Example Explain | 指令說明 | 範例指令說明 |
|---|---|---|---|---|---|
| `@` | CLAUDE CLI 指定讀取文件的方法，可以指定 Claude 要先讀取的檔案。 |  |  | 指定 Claude 先讀取特定檔案/內容來源。 |  |
| `/add-dir` | Add additional working directories for Claude to read and edit files. |  |  | 新增額外的工作目錄。 |  |
| `/agents` | Manage custom AI subagents. |  |  | 管理自訂 AI 子代理。 |  |
| `/bashes` | List and manage background tasks. |  |  | 列出和管理背景任務。 | 想查看或控制正在執行的背景程序時。 |
| `/bug` | Report a bug (sends the conversation to Anthropic). |  |  | 回報錯誤（將對話發送給 Anthropic）。 |  |
| `/clear` | Clear conversation history. |  |  | 清除對話歷史記錄。 | 想要重新開始新的對話情境時。 |
| `/commit-push-pr` | Commits, pushes, and opens a PR in one step. |  |  | 一次完成 commit、push 並建立 PR。 |  |
| `/compact [instructions]` | Compact the conversation, optionally with focus instructions. |  |  | 壓縮對話（可選擇性加上焦點指示）。 | 對話太長需要精簡、保留特定重點、或 token 快用完時。 |
| `/config` | Open the settings UI (Config tab). |  |  | 開啟設定介面（Config 標籤）。 | 需要調整 Claude Code 的各項設定時。 |
| `/context` | Visualize current context usage. |  |  | 以彩色網格視覺化當前上下文使用量。 | 想了解目前對話佔用多少 token 空間時。 |
| `/cost` | Show token usage statistics. |  |  | 顯示 token 使用統計。 | 想追蹤 API 使用成本和消耗量時。 |
| `/doctor` | Check Claude Code installation status. |  |  | 檢查 Claude Code 安裝狀態。 | 遇到問題需要診斷安裝是否正常時。 |
| `/exit` | Exit the REPL. |  |  | 退出 REPL。 | 結束 Claude Code 互動式會話時。 |
| `/export [filename]` | Export the current conversation to a file or clipboard. |  |  | 匯出當前對話到檔案或剪貼簿。 | 需要保存對話記錄供日後參考時。 |
| `/help` | Get help/usage info. |  |  | 取得使用說明。 | 忘記指令或需要快速查詢功能時。 |
| `/hooks` | Manage tool event hooks. |  |  | 管理工具事件的掛鉤設定。 | 需要在特定工具執行時觸發自訂動作時。 |
| `/ide` | Manage IDE integration and show status. |  |  | 管理 IDE 整合並顯示狀態。 | 想連接或檢查編輯器整合狀態時。 |
| `/init` | Initialize project using the `CLAUDE.md` guide. |  |  | 使用 `CLAUDE.md` 指南初始化專案。 | 開始新專案時建立專案記憶檔案。 |
| `/install-github-app` | Set up Claude GitHub Actions for the repository. |  |  | 為儲存庫設定 Claude GitHub Actions。 | 需要在 GitHub 專案中啟用 Claude 自動化時。 |
| `/login` | Switch/sign in to an Anthropic account. |  |  | 切換 Anthropic 帳號。 | 需要更換使用的帳戶時。 |
| `/logout` | Log out of the Anthropic account. |  |  | 登出 Anthropic 帳號。 | 結束使用或切換帳號前登出時。 |
| `/mcp` | Manage MCP server connections and OAuth authentication. |  |  | 管理 MCP 伺服器連線與 OAuth 認證。 | 設定 Model Context Protocol 整合時。 |
| `/memory` | Auto-memory. |  |  | 記憶系統（Auto-memory）。 | 自動記憶功能相關（如記憶系統說明/管理）。 |
| `/model` | Choose or change the AI model. |  |  | 選擇或更改 AI 模型。 | 想切換到不同的 Claude 模型版本時。 |
| `/output-style [style]` | Set output style directly or choose from a menu. |  |  | 直接設定或從選單選擇輸出樣式。 | 需要調整 Claude 回應的格式風格時。 |
| `/permissions` | View or update permissions. |  |  | 查看或更新權限。 | 需要管理 Claude 的檔案存取權限時。 |
| `/plugin` | Manage Claude Code plugins. |  |  | 管理 Claude Code 插件。 | 安裝、啟用或停用擴充功能時。 |
| `/pr-comments` | View Pull Request comments. |  |  | 查看 Pull Request 評論。 | 檢視 GitHub PR 上的討論內容時。 |
| `/privacy-settings` | View and update privacy settings. |  |  | 查看和更新隱私設定。 | 需要調整資料分享和隱私選項時。 |
| `/release-notes` | View release notes. |  |  | 查看版本更新說明。 | 想了解最新功能和改進時。 |
| `/rename <name>` | Rename the current session. |  |  | 重新命名當前會話。 | 為對話取一個有意義的名稱方便識別時。 |
| `/resume [session]` | Resume a conversation by ID or name. |  |  | 透過 ID 或名稱恢復對話。 | 想繼續之前的對話或從會話選單選擇時。 |
| `/review` | Request code review. |  |  | 請求程式碼審查。 | 需要 Claude 檢查程式碼品質和問題時。 |
| `/rewind` | Open rewind menu to restore conversation, code, or both to a prior point. |  |  | 回溯對話和/或程式碼。 | 想回到之前的對話狀態或程式碼版本時。 |
| `/sandbox` | Enable sandboxed bash tool (filesystem/network isolation). |  |  | 啟用沙盒 bash 工具（檔案系統和網路隔離）。 | 需要更安全的執行環境進行自動化操作時。 |
| `/security-review` | Security review for pending changes on the current branch. |  |  | 對當前分支的待處理變更進行安全審查。 | 提交程式碼前檢查安全漏洞時。 |
| `/stats` | Visualize daily usage, session history, streaks, model preference. |  |  | 視覺化每日使用量、會話歷史、連續使用天數和模型偏好。 | 想了解使用習慣和統計數據時。 |
| `/status` | Open Status tab showing version, model, account, connection status. |  |  | 開啟設定介面（Status 標籤）顯示版本、模型、帳號和連線狀態。 | 快速檢查系統狀態和連線資訊時。 |
| `/statusline` | Configure Claude Code statusline UI. |  |  | 設定 Claude Code 的狀態列 UI。 | 自訂終端機狀態列顯示資訊時。 |
| `/terminal-setup` | Install Shift+Enter newline shortcut (iTerm2 and VSCode only). |  |  | 安裝 Shift+Enter 換行快捷鍵（僅 iTerm2 和 VSCode）。 | 設定終端機以便更方便輸入多行指令時。 |
| `/todos` | List current TODO items. |  |  | 列出當前 TODO 項目。 | 查看專案中待辦事項時。 |
| `/usage` | Show subscription limits and rate limit status (subscription-only). |  |  | 顯示訂閱方案使用限制與速率限制狀態（僅訂閱方案）。 | 想確認 API 配額剩餘量時。 |
| `/vim` | Enter vim mode (toggle insert/command modes). |  |  | 進入 vim 模式（交替插入和命令模式）。 | 偏好使用 vim 鍵位操作時。 |
| `cat <file> \| claude -p "<query>"` | Process piped content. | `cat logs.txt \| claude -p "explain"` | Pipes file content into Claude in print mode. | 將管線輸入的內容交給 Claude 處理。 | 把 `logs.txt` 內容送進 Claude，並以 print 模式輸出解釋。 |
| `claude` | Start interactive session. | `claude` | Launches interactive REPL. | 啟動互動式會話。 | 直接進入互動模式。 |
| `claude -c` | Continue most recent conversation in current directory. | `claude -c` | Loads the latest session for this directory. | 延續目前目錄最近一次對話。 | 直接接續最近的 session。 |
| `claude -c -p "<query>"` | Continue via SDK in print mode. | `claude -c -p "Check for type errors"` | Continues last session and prints the response, then exits. | 透過 SDK 延續對話並以 print 模式輸出後退出。 | 在最近 session 上檢查型別錯誤並輸出結果。 |
| `claude -p "<query>"` | Query via SDK, then exit. | `claude -p "explain this function"` | One-off prompt (no interactive session). | 以 SDK 發送一次性問題並結束。 | 問一次「解釋此函式」並直接輸出結果。 |
| `claude -r "<session>" "<query>"` | Resume session by ID or name. | `claude -r "auth-refactor" "Finish this PR"` | Resumes a named/ID session and continues with a query. | 用 ID 或名稱恢復 session 後繼續提問。 | 恢復 `auth-refactor` 並請它完成 PR。 |
| `claude "<query>"` | Start interactive session with initial prompt. | `claude "explain this project"` | Opens REPL with an initial task prompt. | 用初始提示詞開啟互動式會話。 | 以「解釋這個專案」作為第一個任務啟動。 |
| `claude agents` | List all configured subagents, grouped by source. | `claude agents` | Shows available subagents and where they come from. | 列出所有已設定子代理並按來源分組。 | 顯示有哪些 subagents 可用。 |
| `claude auth login` | Sign in to your Anthropic account. | `claude auth login --console` | Signs in using Anthropic Console billing (API usage). | 登入 Anthropic 帳號。 | 使用 Console 方式登入（偏 API 計費流程）。 |
| `claude auth logout` | Log out from your Anthropic account. | `claude auth logout` | Clears local auth session. | 登出 Anthropic 帳號。 | 清除本機登入狀態。 |
| `claude auth status` | Show authentication status as JSON (use `--text` for human output). | `claude auth status` | Exits 0 if logged in, 1 if not. | 以 JSON 顯示登入狀態（可用 `--text` 顯示人類可讀）。 | 用 exit code 表示是否登入（0 已登入 / 1 未登入）。 |
| `claude auto-mode defaults` | Print built-in auto mode classifier rules as JSON. | `claude auto-mode defaults > rules.json` | Writes default auto-mode rules into a file. | 輸出內建 auto mode 分類規則（JSON）。 | 將規則輸出並導向到 `rules.json`。 |
| `claude mcp` | Configure Model Context Protocol (MCP) servers. |  |  | 設定 MCP 伺服器。 | 參考 Claude Code MCP 文件。 |
| `claude plugin` | Manage Claude Code plugins (alias: `claude plugins`). | `claude plugin install code-review@claude-plugins-official` | Installs a plugin from the marketplace. | 管理 Claude Code 插件（別名 `claude plugins`）。 | 安裝 `code-review` 插件。 |
| `claude remote-control` | Start a Remote Control server (server mode, no local interactive session). | `claude remote-control --name "My Project"` | Runs remote control server with a display name. | 啟動 Remote Control 伺服器（伺服器模式）。 | 以指定名稱啟動遠端控制伺服器。 |
| `claude setup-token` | Generate a long-lived OAuth token for CI/scripts (prints only, not saved). | `claude setup-token` | Prints token to terminal for use in automation. | 產生可長期使用的 OAuth token（不保存，只輸出）。 | 取得 token 用於 CI 或腳本。 |
| `claude update` | Update to latest version. | `claude update` | Updates Claude Code installation. | 更新到最新版本。 | 執行更新。 |
| `--add-dir` | Add additional working directories. | `claude --add-dir ../apps ../lib` | Grants file access to extra directories. | 新增額外可讀寫的工作目錄（授予存取權）。 | 讓 Claude 可存取 `../apps`、`../lib`。 |
| `--agent` | Specify an agent for the current session. | `claude --agent my-custom-agent` | Overrides configured agent for this run. | 指定本次會話使用的 agent（覆寫設定）。 | 使用 `my-custom-agent` 執行本次任務。 |
| `--agents` | Define custom subagents dynamically via JSON. | `claude --agents '{"reviewer":{"description":"Reviews code","prompt":"You are a code reviewer"}}'` | Creates a `reviewer` subagent for this session. | 用 JSON 動態定義子代理。 | 在本次會話中建立 `reviewer` 子代理。 |
| `--allow-dangerously-skip-permissions` | Add bypassPermissions to Shift+Tab mode cycle without starting in it. | `claude --permission-mode plan --allow-dangerously-skip-permissions` | Allows switching to bypassPermissions later. | 允許之後切到跳過權限提示的模式（不必一開始就用）。 | 先用 plan 模式開始，必要時再切到 bypassPermissions。 |
| `--allowedTools` | Tools that execute without prompting for permission. | `"Bash(git log *)" "Bash(git diff *)" "Read"` | Defines auto-allowed tools; use `--tools` to restrict availability instead. | 設定免詢問就可執行的工具清單。 | 讓特定 Bash/Read 操作不用每次確認。 |
| `--append-system-prompt` | Append custom text to the end of the default system prompt. | `claude --append-system-prompt "Always use TypeScript"` | Adds a rule to the system prompt for this session. | 在預設系統提示詞尾端追加文字。 | 追加「永遠用 TypeScript」之類的規則。 |
| `--append-system-prompt-file` | Load additional system prompt text from a file and append to the default prompt. | `claude --append-system-prompt-file ./extra-rules.txt` | Appends file contents to the default system prompt. | 從檔案載入額外系統提示詞並追加。 | 把 `extra-rules.txt` 的內容加到系統提示詞尾端。 |
| `--bare` | Minimal mode: skip auto-discovery of hooks/skills/plugins/MCP/auto memory/CLAUDE.md. | `claude --bare -p "query"` | Faster scripted calls; provides Bash/Read/Edit only. | 最小化模式：跳過自動發現各種擴充。 | 用於腳本加速啟動，只保留基本工具。 |
| `--betas` | Beta headers to include in API requests (API key users only). | `claude --betas interleaved-thinking` | Enables a beta feature for requests. | 在 API 請求加入 beta header（限 API key 使用者）。 | 開啟指定 beta 功能。 |
| `--channels` | (Research preview) MCP servers whose channel notifications to listen for. | `claude --channels plugin:my-notifier@my-marketplace` | Listens to specified channel notifications in this session. | 設定本次會話要收聽的 channel 通知來源。 | 收聽指定 plugin/channel 的通知。 |
| `--chrome` | Enable Chrome browser integration. | `claude --chrome` | Allows web automation/testing via Chrome integration. | 啟用 Chrome 瀏覽器整合。 | 用於網頁自動化與測試。 |
| `--continue, -c` | Load the most recent conversation in the current directory. | `claude --continue` | Same as `-c`. | 載入目前目錄最近一次對話。 | 延續最近 session。 |
| `--dangerously-load-development-channels` | Enable non-allowlisted channels for local development (prompts). | `claude --dangerously-load-development-channels server:webhook` | Loads dev channels after confirmation. | 啟用未在白名單的開發用 channels。 | 載入 `server:webhook`（會提示確認）。 |
| `--dangerously-skip-permissions` | Skip permission prompts (equivalent to bypassPermissions). | `claude --dangerously-skip-permissions` | Runs without permission prompts. | 跳過權限提示（等同 bypassPermissions）。 | 不再逐次詢問允許操作。 |
| `--debug` | Enable debug mode with optional category filtering. | `claude --debug "api,mcp"` | Enables debug logs for selected categories. | 開啟 debug 模式（可指定分類）。 | 僅對 `api,mcp` 類別輸出除錯資訊。 |
| `--debug-file <path>` | Write debug logs to a specific file (enables debug). | `claude --debug-file /tmp/claude-debug.log` | Saves debug output to the given file. | 把 debug log 寫到指定檔案。 | 將除錯資訊輸出到 `/tmp/claude-debug.log`。 |
| `--disable-slash-commands` | Disable all skills and commands for this session. | `claude --disable-slash-commands` | Turns off slash commands/skills. | 停用本次會話所有 slash 指令與 skills。 | 讓 `/...` 指令不可用。 |
| `--disallowedTools` | Tools removed from context and cannot be used. | `"Bash(git log *)" "Bash(git diff *)" "Edit"` | Explicitly blocks specified tools. | 禁用指定工具（從上下文移除且不可用）。 | 阻止特定 Bash/Edit 操作。 |
| `--effort` | Set effort level (low/medium/high/max; Opus 4.6 only). | `claude --effort high` | Increases reasoning effort for the session. | 設定本次會話的 effort 等級。 | 用 high 提升推理投入（視模型支援）。 |
| `--enable-auto-mode` | Unlock auto mode in Shift+Tab cycle (plan dependent). | `claude --enable-auto-mode` | Makes auto mode selectable. | 解鎖 auto mode（依方案/模型而定）。 | 允許在模式切換中選到 auto。 |
| `--exclude-dynamic-system-prompt-sections` | Move per-machine dynamic sections into first user message (cache reuse). | `claude -p --exclude-dynamic-system-prompt-sections "query"` | Improves prompt-cache reuse across machines/users. | 把動態環境資訊從 system prompt 移到第一則使用者訊息。 | 用於多人/多機腳本呼叫提升快取命中。 |
| `--fallback-model` | Automatic fallback to specified model when default is overloaded (print mode). | `claude -p --fallback-model sonnet "query"` | Falls back to `sonnet` when needed. | 預設模型擁塞時自動改用備援模型（print 模式）。 | 指定 `sonnet` 作為 fallback。 |
| `--fork-session` | When resuming, create a new session ID instead of reusing original. | `claude --resume abc123 --fork-session` | Continues from a copy (new session). | 恢復對話時分叉成新 session。 | 從 `abc123` 開分支續聊，不覆蓋原 session。 |
| `--from-pr` | Resume sessions linked to a specific GitHub PR. | `claude --from-pr 123` | Loads sessions associated with PR #123. | 從指定 PR 連結的 session 續用。 | 續接 PR #123 相關 session。 |
| `--ide` | Auto-connect to IDE on startup when exactly one valid IDE exists. | `claude --ide` | Connects Claude Code to your editor integration. | 啟動時自動連接 IDE 整合。 | 自動連線到可用的編輯器整合。 |
| `--include-hook-events` | Include hook lifecycle events in output stream (requires stream-json). | `claude -p --output-format stream-json --include-hook-events "query"` | Emits hook events in the stream. | 在輸出串流中包含 hooks 事件。 | 以 stream-json 同步輸出 hook 生命週期事件。 |
| `--include-partial-messages` | Include partial streaming events (requires print + stream-json). | `claude -p --output-format stream-json --include-partial-messages "query"` | Emits partial message chunks. | 在串流輸出包含部分回覆片段。 | 讓串流事件包含 partial chunks。 |
| `--init` | Run initialization hooks and start interactive mode. | `claude --init` | Runs init hooks then opens REPL. | 執行初始化 hooks 並進入互動模式。 | 啟動前先跑 init 流程。 |
| `--init-only` | Run initialization hooks and exit. | `claude --init-only` | Runs init hooks then quits. | 只跑初始化 hooks 後退出。 | 用於只做初始化不進入互動。 |
| `--input-format` | Specify input format for print mode (text/stream-json). | `claude -p --output-format json --input-format stream-json` | Accepts stream-json input and outputs JSON. | 指定 print 模式的輸入格式。 | 以 stream-json 作為輸入，並輸出 json。 |
| `--json-schema` | Return validated JSON output matching a JSON Schema (print mode). | `claude -p --json-schema '{"type":"object","properties":{...}}' "query"` | Produces schema-validated JSON output. | 輸出符合 JSON Schema 的可驗證 JSON（print 模式）。 | 讓回覆嚴格符合指定 schema。 |
| `--maintenance` | Run maintenance hooks and start interactive mode. | `claude --maintenance` | Enters maintenance workflow. | 執行維護 hooks 並進入互動模式。 | 進入維護流程。 |
| `--max-budget-usd` | Maximum USD to spend on API calls before stopping (print mode). | `claude -p --max-budget-usd 5.00 "query"` | Stops once spend exceeds the budget. | 設定 print 模式 API 呼叫最大金額上限。 | 花費超過 5 美元就停止。 |
| `--max-turns` | Limit number of agentic turns (print mode). | `claude -p --max-turns 3 "query"` | Errors when limit is reached. | 限制 print 模式可進行的回合數。 | 超過 3 回合會以錯誤結束。 |
| `--mcp-config` | Load MCP servers from JSON files or strings (space-separated). | `claude --mcp-config ./mcp.json` | Uses MCP servers defined in the provided config. | 從 JSON 檔/字串載入 MCP server 設定。 | 套用 `mcp.json` 內的 MCP 設定。 |
| `--model` | Set model for current session (alias or full name). | `claude --model claude-sonnet-4-6` | Uses the specified model for this session. | 設定本次會話使用的模型。 | 指定使用 `claude-sonnet-4-6`。 |
| `--name, -n` | Set display name for the session. | `claude -n "my-feature-work"` | Names session for easier resume/identification. | 設定會話顯示名稱。 | 將會話命名為 `my-feature-work` 方便辨識/續用。 |
| `--no-chrome` | Disable Chrome integration for this session. | `claude --no-chrome` | Prevents Chrome tools from being used. | 停用本次會話的 Chrome 整合。 | 避免使用瀏覽器工具。 |
| `--no-session-persistence` | Disable session persistence (print mode only). | `claude -p --no-session-persistence "query"` | Response not saved; cannot resume. | 停用 session 存檔（僅 print 模式）。 | 不保存對話，因此無法續用。 |
| `--output-format` | Output format for print mode (text/json/stream-json). | `claude -p "query" --output-format json` | Prints JSON instead of plain text. | 指定 print 模式輸出格式。 | 以 JSON 形式輸出回覆。 |
| `--permission-mode` | Begin in a specified permission mode. | `claude --permission-mode plan` | Starts in plan mode. | 指定起始權限模式。 | 以 plan 模式開始。 |
| `--permission-prompt-tool` | Specify an MCP tool to handle permission prompts in non-interactive mode. | `claude -p --permission-prompt-tool mcp_auth_tool "query"` | Delegates permission prompts to an MCP tool. | 指定由 MCP 工具處理非互動模式的權限提示。 | 將權限詢問交給 `mcp_auth_tool`。 |
| `--plugin-dir` | Load plugins from a directory for this session only (repeatable). | `claude --plugin-dir ./my-plugins` | Loads plugins from local directory. | 從指定資料夾載入插件（僅本次會話）。 | 載入 `./my-plugins` 內的插件。 |
| `--print, -p` | Print response without interactive mode. | `claude -p "query"` | Outputs answer and exits. | 不進入互動模式，直接輸出回覆。 | 問一次就結束。 |
| `--remote` | Create a new web session on claude.ai with provided task description. | `claude --remote "Fix the login bug"` | Opens a new web session with the task. | 在 claude.ai 建立新的 web session。 | 以「修登入 bug」建立 web 會話。 |
| `--remote-control-session-name-prefix <prefix>` | Prefix for auto-generated Remote Control session names. | `claude remote-control --remote-control-session-name-prefix dev-box` | Uses `dev-box` as name prefix. | 設定 Remote Control 自動命名的前綴。 | 讓會話名稱以 `dev-box` 開頭。 |
| `--remote-control, --rc` | Start interactive session with Remote Control enabled. | `claude --remote-control "My Project"` | Enables control from Claude.ai/app. | 啟用 Remote Control 的互動式會話。 | 讓 Claude.ai/APP 可遠端控制本地會話。 |
| `--replay-user-messages` | Re-emit user messages from stdin back on stdout (requires stream-json). | `claude -p --input-format stream-json --output-format stream-json --replay-user-messages` | Echoes user messages for acknowledgment. | 把 stdin 的使用者訊息回放到 stdout。 | 用於串流情境的確認/回放。 |
| `--resume, -r` | Resume a specific session by ID or name (or show picker). | `claude --resume auth-refactor` | Resumes the named session. | 以 ID 或名稱續接 session（或開選單選）。 | 續接名為 `auth-refactor` 的會話。 |
| `--session-id` | Use a specific session ID (UUID). | `claude --session-id "550e8400-e29b-41d4-a716-446655440000"` | Forces the conversation to use the provided UUID. | 指定使用某個 session ID。 | 用給定 UUID 作為 session。 |
| `--setting-sources` | Comma-separated setting sources to load (user, project, local). | `claude --setting-sources user,project` | Loads only selected setting sources. | 指定要載入的設定來源。 | 只載入 user 與 project 設定。 |
| `--settings` | Path to settings JSON file or JSON string. | `claude --settings ./settings.json` | Loads additional settings. | 載入額外 settings（檔案或 JSON 字串）。 | 讀取 `settings.json` 設定。 |
| `--strict-mcp-config` | Only use MCP servers from `--mcp-config`, ignore others. | `claude --strict-mcp-config --mcp-config ./mcp.json` | Uses only provided MCP config. | 僅使用 `--mcp-config` 指定的 MCP 設定。 | 忽略其他來源的 MCP 設定。 |
| `--system-prompt` | Replace entire system prompt with custom text. | `claude --system-prompt "You are a Python expert"` | Overrides default system prompt. | 以自訂文字取代整份 system prompt。 | 讓 Claude 以「你是 Python 專家」的系統提示運作。 |
| `--system-prompt-file` | Load system prompt from a file, replacing default prompt. | `claude --system-prompt-file ./custom-prompt.txt` | Uses file content as system prompt. | 從檔案載入 system prompt 並取代預設。 | 用 `custom-prompt.txt` 內容作為 system prompt。 |
| `--teammate-mode` | Set teammate display mode (auto/in-process/tmux). | `claude --teammate-mode in-process` | Chooses how teammates display. | 設定 teammate mode 顯示方式。 | 使用 in-process 顯示模式。 |
| `--teleport` | Resume a web session in your local terminal. | `claude --teleport` | Brings web session into local CLI. | 將 web session 轉移到本機終端。 | 把網頁上的會話接回本地操作。 |
| `--tmux` | Create a tmux session for the worktree (requires `--worktree`). | `claude -w feature-auth --tmux` | Uses tmux panes/session for worktree. | 為 worktree 建立 tmux 工作階段。 | 在 `feature-auth` worktree 中用 tmux 管理窗格。 |
| `--tools` | Restrict which built-in tools Claude can use. | `claude --tools "Bash,Edit,Read"` | Allows only specified tools. | 限制 Claude 可用的內建工具。 | 只允許 Bash/Edit/Read。 |
| `--verbose` | Enable verbose logging. | `claude --verbose` | Shows turn-by-turn output. | 開啟詳細輸出。 | 顯示每一輪的輸出細節。 |
| `--version, -v` | Output version number. | `claude -v` | Prints installed version. | 顯示版本號。 | 輸出目前安裝版本。 |
| `--worktree, -w` | Start Claude in an isolated git worktree. | `claude -w feature-auth` | Creates/uses worktree at `.claude/worktrees/feature-auth`. | 在隔離的 git worktree 啟動 Claude。 | 在 `feature-auth` worktree 中進行工作。 |
| `\` + Enter | Insert a newline in the input. | `\` + Enter | Creates a newline without sending prompt. | 換行。 | 在輸入中插入換行，不送出訊息。 |
| `Alt + A` | Automatically accept edit suggestions. | `Alt + A` | Accepts suggested edits. | 自動接受編輯建議。 | 直接套用 Claude 的編輯建議。 |
| `Alt + P` | Switch between different Claude models. | `Alt + P` | Opens model switch/changes model. | 切換模型。 | 切換不同的 Claude 模型。 |
| `Alt + V` | Paste image content. | `Alt + V` | Pastes image content into input. | 貼上圖片。 | 將圖片內容貼到輸入中。 |
| `Ctrl + _` | Undo the previous action. | `Ctrl + _` | Reverts the last input/action. | 撤銷操作。 | 撤銷上一步操作。 |
| `Ctrl + B` | Run the task in the background. | `Ctrl + B` | Sends current task to background. | 背景執行。 | 將任務放到背景執行。 |
| `Ctrl + O` | Enable verbose output mode. | `Ctrl + O` | Toggles verbose output. | 開啟詳細輸出模式。 | 切換 verbose output。 |
| `Ctrl + S` | Save the current prompt (stash prompt). | `Ctrl + S` | Stashes current prompt for later. | 儲存提示。 | 儲存當前的提示（stash prompt）。 |
| `Ctrl + T` | Show todos (to-do list). | `Ctrl + T` | Opens todos list. | 顯示待辦事項。 | 顯示 todos（待辦清單）。 |
| `Esc` + `Esc` | Double-press Esc to clear input content. | `Esc` + `Esc` | Clears current input line. | 清除輸入。 | 雙擊 Esc 清除輸入內容。 |
| `Shift + Tab` | Accept Claude’s edit suggestions. | `Shift + Tab` | Accepts edit suggestion. | 接受編輯建議。 | 接受 Claude 的編輯建議。 |
