# Linux CLI（AWTLCL-21.10）重點指令整理

來源：
- `docs/Adapter CLIs/AWTLCL-21.10.pdf`（Adventures with the Linux Command Line, 21.10）
- https://documentation.ubuntu.com/desktop/en/latest/tutorial/the-linux-command-line-for-beginners/

| Command | Command Description | Command Example | Command Example Explain | 指令說明 | 範例指令說明 |
|---|---|---|---|---|---|
| `mc [dir1] [dir2]` | Launch Midnight Commander (TUI file manager), optionally opening 1–2 directories. | `mc /etc /var/log` | Opens MC with left/right panels set to the two directories. | 啟動 Midnight Commander（雙欄檔案管理器）。 | 左右面板分別開啟 `/etc` 與 `/var/log`。 |
| `screen` | Start a GNU Screen session (terminal multiplexer). | `screen` | Opens a new screen session and shows a shell in window 0. | 啟動 GNU Screen 會話。 | 進入 screen，開始管理多個 window。 |
| `screen <program> [args...]` | Start screen and run a program in the first window. | `screen vim ~/.bashrc` | Starts screen and immediately opens Vim in the first window. | 在 screen 的第一個 window 直接執行指定程式。 | 啟動 screen 並直接用 Vim 開啟 `~/.bashrc`。 |
| `screen -list` | List running screen sessions. | `screen -list` | Prints available sessions (pid.tty.host). | 列出目前系統上的 screen sessions。 | 顯示可用的 session 清單（含 pid/tty/host）。 |
| `screen -d -r [session]` | Detach session from old terminal and reattach to current terminal. | `screen -d -r` | Moves the session to your current terminal. | 把舊終端的 session 轉移到目前終端。 | 常用於「斷線後接回」或換終端接續工作。 |
| `screen -D -R [session]` | Detach session, log off old terminal, and attach here (creates if none). | `screen -D -R` | “Force move” the session to current terminal. | 強制把 session 移到目前終端（必要時建立新 session）。 | 直接把 session 搶回來（作者偏好用法）。 |
| `Ctrl-a c` (screen) | Create a new screen window. |  |  | screen 建立新 window 的快捷鍵。 | 在 screen 內按 `Ctrl-a` 再按 `c` 新開一個 window。 |
| `Ctrl-a p / Ctrl-a n` (screen) | Switch to previous/next window. |  |  | screen 切換前/後 window。 | 在多個 window 間快速切換。 |
| `Ctrl-a "` (screen) | Show window list and pick one. |  |  | 顯示 window 清單並選擇。 | 看到所有 window 後選要跳轉的那個。 |
| `Ctrl-a d` (screen) | Detach current session. |  |  | 將 screen session 從終端分離（背景繼續跑）。 | 常用於 ssh 斷線前先 detach，之後再 reattach。 |
| `tmux new [-s name] [-n win]` | Create a new tmux session, optionally naming session/window. | `tmux new -s "my session" -n "window 1"` | Creates session `my session` with first window named `window 1`. | 建立 tmux session（可指定 session / window 名稱）。 | 建立名為 `my session` 的 session，首個 window 叫 `window 1`。 |
| `tmux neww -n <win>` | Create a new tmux window (command-line form). | `tmux neww -n Window1` | Adds a window named `Window1` to current session. | 新增 tmux window。 | 在目前 session 新增名為 `Window1` 的 window。 |
| `tmux ls` | List tmux sessions. | `tmux ls` | Prints sessions and their state. | 列出 tmux sessions。 | 顯示目前有哪些 session。 |
| `tmux attach [-d] -t <name>` | Attach to a session by name (optionally detach elsewhere). | `tmux attach -d -t PaneDemo` | Detaches `PaneDemo` from other terminal and attaches here. | 連線到指定 tmux session。 | 把 `PaneDemo` 從其他終端轉移到目前終端。 |
| `Ctrl-b c` (tmux) | Create a new tmux window. |  |  | tmux 建立新 window 的快捷鍵。 | 在 tmux 內按 `Ctrl-b` 再按 `c`。 |
| `Ctrl-b " / Ctrl-b %` (tmux) | Split pane horizontally / vertically. |  |  | tmux 分割 pane（橫/直）。 | 在同一個 window 內拆出多個 pane 同時操作。 |
| `Ctrl-b d` (tmux) | Detach current tmux session. |  |  | tmux 將 session 分離到背景。 | detach 後可稍後再 attach 接續工作。 |
| `byobu` | Start byobu (wrapper around tmux/screen). | `byobu` | Starts byobu using tmux backend by default (varies by distro). | 啟動 byobu（封裝 tmux/screen）。 | 以較友善介面進入多工終端環境。 |
| `F2 / Shift-F2 / Ctrl-F2` (byobu) | New window / horizontal split / vertical split. |  |  | byobu 以功能鍵建立 window 或分割。 | `F2` 開新 window；`Shift-F2` 橫分割；`Ctrl-F2` 直分割。 |
| `F6 / Shift-F6` (byobu) | Detach session and logout / detach without logout. |  |  | byobu 分離 session（可選擇是否登出）。 | 遠端操作常用：保留工作在背景繼續跑。 |
| `alias` | List current aliases. | `alias` | Prints alias definitions currently active in your shell. | 列出目前已設定的 alias。 | 檢查系統/自己已有哪些 alias。 |
| `alias <name>='<cmd>'` | Define a shell alias (usually in `~/.bashrc`). | `alias ll='ls -l'` | Creates `ll` as a shortcut for `ls -l`. | 建立別名縮寫指令。 | 用 `ll` 取代常用的 `ls -l`。 |
| `type <name>` | Show how a command name resolves (alias/builtin/file). | `type ll` | Helps detect conflicts before creating new aliases. | 查看名稱實際指向（alias/內建/外部指令）。 | 新增 alias 前先確認名稱沒衝突。 |
| `function_name() { ... }` | Define a shell function (more powerful than alias). | `status(){ uptime; df -h; }` | Defines a reusable function that runs multiple commands. | 定義 shell function（可含邏輯與多指令）。 | 把常用檢查整理成 `status` 一鍵執行。 |
| `set -o noclobber` | Prevent `>` from overwriting existing files. | `set -o noclobber` | Makes `command > file` fail if `file` already exists. | 防止 `>` 覆寫既有檔案。 | 避免誤把重要檔案截斷成空檔。 |
| `set +o noclobber` | Turn off noclobber. | `set +o noclobber` | Restores default overwrite behavior for `>`. | 關閉 noclobber。 | 恢復 `>` 可覆寫檔案的預設行為。 |
| `>|` | Override noclobber for a single redirection. | `command >| file` | Forces overwrite even when noclobber is enabled. | 單次強制覆寫（繞過 noclobber）。 | 在已開啟 noclobber 時仍要覆寫可用。 |
| `2>&1` | Duplicate stderr to stdout destination (order matters). | `command > file 2>&1` | Sends both stdout and stderr into `file`. | 把 stderr 也導向到 stdout 同一目的地。 | 常用於把所有輸出收斂到同一個 log 檔。 |
| `exec [program] [redirections]` | Replace shell with program, or (if program omitted) apply redirections to current shell. | `exec 1> output.txt` | From this point, stdout goes to `output.txt`. | `exec` 可把重導向套用到「目前 shell/腳本」後續所有輸出。 | 讓後續 `echo` 等都寫進 `output.txt`。 |
| `exec 3> <file>` | Open an extra file descriptor for output. | `exec 3> some_file.txt` | Opens fd 3 for writing to the file. | 開啟額外檔案描述元（fd）。 | 用 fd 3 指向某檔案作為另一路輸出。 |
| `exec 3>&-` | Close an extra file descriptor. | `exec 3>&-` | Closes fd 3. | 關閉 fd。 | 用完 fd 3 後關閉避免資源外洩。 |
| `/dev/tty` | Special device that points to the controlling terminal. | `exec 3> /dev/tty` | Sends writes to fd 3 back to the terminal even in pipelines. | 指向「控制終端」的特殊裝置檔。 | 管線輸出到檔案時，仍可把進度訊息寫回螢幕。 |
| `tput longname` | Print terminal long name (terminfo capability). | `tput longname` | Shows descriptive terminal type name. | 查詢終端機資訊（terminfo）。 | 顯示目前終端類型的完整名稱。 |
| `tput cols` | Print terminal width (columns). | `tput cols` | Returns number of columns. | 顯示終端寬度（欄數）。 | 可用於腳本動態排版。 |
| `tput lines` | Print terminal height (rows). | `tput lines` | Returns number of rows. | 顯示終端高度（列數）。 | 可用於腳本動態排版。 |
| `tput cup <row> <col>` | Move cursor to row/col. | `tput cup 5 20` | Moves cursor near the top-left area of the screen. | 移動游標到指定座標。 | 用於製作進度條、時計等 TUI 效果。 |
| `tput bold` | Enable bold attribute. | `tput bold; echo "bold"; tput sgr0` | Turns on bold then resets attributes. | 開啟粗體效果。 | 輸出後用 `tput sgr0` 還原。 |
| `tput sgr0` | Reset text attributes to default. | `tput sgr0` | Clears effects (bold/underline/reverse, etc.). | 重置文字效果。 | 清除粗體/底線/反白等狀態。 |
| `tput setaf <n>` | Set foreground color (ANSI indexed color via terminfo). | `tput setaf 2; echo "green"; tput sgr0` | Sets foreground to green (index depends on terminal palette). | 設定前景色。 | 以色碼 2 顯示綠字，最後重置。 |
| `tput setab <n>` | Set background color. | `tput setab 4; echo "bg"; tput sgr0` | Sets background color (e.g., blue). | 設定背景色。 | 以色碼 4 設定藍底，最後重置。 |
| `tput smcup` | Switch to alternate screen buffer. | `tput smcup` | Enters alternate screen (like full-screen TUIs). | 進入替代螢幕緩衝區。 | 做全螢幕 TUI 時常用。 |
| `tput rmcup` | Return from alternate screen buffer. | `tput rmcup` | Exits alternate screen back to normal buffer. | 離開替代螢幕緩衝區。 | 回到正常終端畫面。 |
| `dialog --yesno <text> <h> <w>` | Show a Yes/No dialog box. | `dialog --yesno "Continue?" 10 40` | Shows dialog and returns exit status for Yes/No. | 顯示「是/否」對話框。 | 依使用者選擇決定後續流程（看 exit code）。 |
| `dialog --inputbox ... 2> <file>` | Capture user input (dialog writes result to stderr). | `dialog --inputbox "Name:" 10 40 2> /tmp/name.txt` | Saves typed text into `/tmp/name.txt`. | 顯示輸入框並取得輸入值。 | 因 dialog 以 stderr 輸出結果，所以用 `2>` 存檔。 |
| `dialog --gauge <text> <h> <w> <percent>` | Display a progress gauge. | `printf "50\n" | dialog --gauge "Working" 10 60 0` | Feeds progress values via stdin. | 顯示進度條（Gauge）。 | 透過 stdin 餵入百分比更新進度。 |
| `awk 'program' [file...]` | Run an AWK program provided inline. | `ls -l /usr/bin | awk 'NF>9{print $9,$NF}'` | Prints symlink name and target from `ls -l` output (simplified). | 以 inline 程式執行 AWK。 | 從 `ls -l` 擷取欄位（例：符號連結名稱與目標）。 |
| `awk -f <program_file> [file...]` | Run an AWK program from a file. | `awk -f report.awk input.txt` | Executes AWK script stored in `report.awk`. | 以檔案方式執行 AWK。 | 把 AWK 程式寫成檔案便於維護。 |
| `#!/usr/bin/awk -f` | Make an AWK script directly executable via shebang. | `chmod +x report.awk && ./report.awk input.txt` | Runs the AWK script like a standalone program. | 讓 AWK 腳本像一般程式可直接執行。 | 用 shebang + 可執行權限直接跑。 |
| `awk 'BEGIN{FS=":"} {print $1,$5}' /etc/passwd` | Example: change input field separator. | `awk 'BEGIN{FS=":"}{print $1,$5}' /etc/passwd` | Prints username and GECOS/name field. | AWK 透過 `FS` 指定欄位分隔符。 | `/etc/passwd` 用 `:` 分欄，輸出帳號與第 5 欄資訊。 |
| `vim <file>` | Open Vim editor. | `vim ~/.bashrc` | Opens file for editing. | 啟動 Vim 編輯檔案。 | 編輯 `~/.bashrc`。 |
| `source <file>` | Execute commands from a file in the current shell. | `source ~/.bashrc` | Reloads shell configuration without starting a new shell. | 在「目前 shell」載入並執行檔案內容。 | 重新載入 `.bashrc`，立即生效。 |
| `. <file>` | Shorthand for `source`. | `. ~/.bashrc` | Same effect as `source ~/.bashrc`. | `source` 的縮寫。 | 與 `source` 相同效果。 |
| `sqlite3 [dbfile]` | Start SQLite CLI (uses in-memory DB if no file). | `sqlite3 adv-sql.sqlite` | Opens/creates `adv-sql.sqlite` and shows `sqlite>` prompt. | 啟動 SQLite3 命令列介面。 | 進入 `sqlite>` 互動模式操作資料庫檔。 |
| `.help` (sqlite prompt) | Show SQLite dot-command help. | `sqlite> .help` | Lists available dot commands. | SQLite 內建指令說明。 | 查詢有哪些 dot commands 可用。 |
| `.headers on` (sqlite prompt) | Show column headers in query output. | `sqlite> .headers on` | Enables header row for subsequent output. | 顯示查詢結果的欄位標題。 | 讓輸出更可讀。 |
| `.mode column` (sqlite prompt) | Format output in aligned columns. | `sqlite> .mode column` | Switches to column-aligned output mode. | 設定輸出排版模式。 | 用欄對齊方式顯示結果（常配合 `.headers on`）。 |
| `.mode insert <table>` (sqlite prompt) | Emit query results as INSERT statements for a table. | `sqlite> .mode insert Package_Files` | Converts output rows into `INSERT INTO Package_Files ...` form. | 將查詢輸出轉成 INSERT 語句。 | 便於匯出/重建資料或產生測試資料。 |
| `.quit` (sqlite prompt) | Exit sqlite3. | `sqlite> .quit` | Leaves the sqlite prompt. | 離開 sqlite3。 | 結束互動模式。 |
| `.open <file>` (sqlite prompt) | Open a database file from within sqlite3. | `sqlite> .open my.db` | Switches from in-memory DB to `my.db`. | 在 sqlite3 內切換/開啟資料庫檔。 | 從暫存 DB 改為操作 `my.db`。 |
| `sqlite3 <dbfile> < <sqlfile>` | Execute SQL (and dot commands) from stdin. | `sqlite3 adv-sql.sqlite < setup.sql` | Runs statements in `setup.sql` against the DB. | 用非互動方式執行 SQL 檔。 | 把 `setup.sql` 內容導入 sqlite3 執行。 |
| `Ctrl-Alt-T` | Open a terminal (common default shortcut on many Linux systems). |  |  | 開啟終端機視窗的常見快捷鍵。 | 在桌面環境快速叫出 Terminal。 |
| `pwd` | Print working directory. | `pwd` | Prints the current working directory path (e.g. `/home/user`). | 顯示目前工作目錄。 | 不確定自己在哪個資料夾時用來確認路徑。 |
| `cd <path>` | Change directory. | `cd /etc` | Changes working directory to `/etc`. | 切換工作目錄。 | 切到 `/etc` 後，後續檔案操作預設都在這裡進行。 |
| `cd` | Change to home directory. | `cd` | Jumps to your home directory. | 快速回到家目錄。 | 不帶參數的 `cd` 會直接回到 `~`。 |
| `cd ..` | Go to parent directory. | `cd ..` | Moves up one directory level. | 回到上一層目錄。 | 從 `/var/log` 回到 `/var`。 |
| `cd ~` | Change to home directory using `~` shortcut. | `cd ~/Desktop` | Goes to Desktop folder under your home. | 用 `~` 表示家目錄。 | 以家目錄為起點進入 `Desktop`。 |
| `ls [path]` | List directory contents. | `ls /etc` | Lists files and folders under `/etc`. | 列出目錄內容。 | 不用切目錄也能直接列出指定路徑內容。 |
| `ls -a` | List all items including hidden files (dotfiles). | `ls -a` | Shows entries like `.hidden` and `..`. | 顯示包含隱藏檔的清單。 | 需要看到 `.config` 或 dotfiles 時使用。 |
| `whoami` | Print current username. | `whoami` | Prints the login username. | 顯示目前使用者名稱。 | 用於組出 `/home/<user>/...` 之類路徑時。 |
| `mkdir <dir...>` | Create one or more directories. | `mkdir dir1 dir2 dir3` | Creates multiple directories in one command. | 建立資料夾。 | 一次建立多個資料夾。 |
| `mkdir -p <path>` | Create directories including parents. | `mkdir -p dir4/dir5/dir6` | Creates nested directories even if parents don’t exist. | 連同父層一起建立資料夾。 | 一次建立多層巢狀資料夾。 |
| `"..."` / `'...'` / `\ ` | Escape spaces in file/folder names. | `mkdir "folder 1"` | Creates a directory literally named `folder 1`. | 處理含空白的檔名/資料夾名。 | 用引號或反斜線讓 shell 把空白當成名稱的一部分。 |
| `>` | Redirect stdout to a file (overwrite). | `ls > output.txt` | Writes `ls` output into `output.txt`. | 輸出重導向（覆寫）。 | 把原本印在螢幕的內容寫到檔案。 |
| `>>` | Redirect stdout to a file (append). | `echo "line" >> combined.txt` | Appends a new line to the file. | 輸出重導向（附加）。 | 在檔案尾端追加內容而不覆寫。 |
| `cat <file...>` | Print file(s) to stdout (can concatenate multiple files). | `cat test_1.txt test_2.txt` | Outputs both files back-to-back. | 顯示檔案內容／串接多檔。 | 一次把多個檔案內容接在一起輸出。 |
| `Ctrl-C` | Cancel a running foreground command. |  |  | 中斷目前正在執行的指令。 | 例如誤跑互動模式的 `cat` 時按下停止。 |
| `Ctrl-Shift-C` / `Ctrl-Shift-V` | Copy/paste in many terminal emulators. |  |  | 在終端機內複製/貼上常用快捷鍵。 | 終端保留 `Ctrl-C` 作為中斷，因此多用 `Ctrl-Shift` 來複製貼上。 |
| `echo <text>` | Print text. | `echo "This is a test"` | Prints the string to stdout. | 印出文字。 | 常搭配 `>` / `>>` 快速建立或追加檔案內容。 |
| `?` / `*` | Wildcards for matching filenames (single char / zero or more). | `cat test_?.txt` | Matches `test_1.txt`, `test_2.txt`, etc. | 檔名萬用字元。 | 省去逐一列出檔名的麻煩。 |
| `less <file>` | View a file with a pager. | `less combined.txt` | Opens an interactive viewer; press `q` to quit. | 分頁檢視檔案內容。 | 檔案很長時用 `less` 逐頁看，按 `q` 離開。 |
| `mv <src...> <dest>` | Move/rename files or directories. | `mv combined.txt dir1` | Moves file into `dir1`. | 移動/重新命名。 | 把檔案移到指定資料夾（或改名）。 |
| `cp <src...> <dest>` | Copy files (and directories with options). | `cp combined.txt combined_backup.txt` | Copies file to a new name. | 複製檔案。 | 建立備份檔或複製到其他目錄。 |
| `rm <file...>` | Remove file(s). | `rm combined_backup.txt` | Deletes the file permanently. | 刪除檔案。 | 直接刪除，不會進垃圾桶。 |
| `rm -i <file...>` | Interactive remove (prompts before each delete). | `rm -i t*` | Asks for confirmation per match. | 互動式刪除。 | 不確定萬用字元會匹配哪些檔案時更安全。 |
| `rmdir <dir...>` | Remove empty directories. | `rmdir folder_1` | Deletes directory only if it’s empty. | 刪除空資料夾。 | 只能刪除沒有內容的資料夾。 |
| `rm -r <dir>` | Remove directory recursively (dangerous). | `rm -r /tmp/tutorial` | Deletes the directory and everything inside it. | 遞迴刪除資料夾（危險）。 | 會把資料夾內所有內容一起刪除。 |
| `wc -l <file>` | Count lines in a file. | `wc -l combined.txt` | Prints line count and filename. | 計算行數。 | 快速得知檔案有幾行。 |
| `|` | Pipe stdout of one command into stdin of another. | `ls /etc | wc -l` | Counts how many entries are in `/etc`. | 管線。 | 把前一個指令的輸出直接交給下一個指令處理。 |
| `uniq` | Filter adjacent duplicate lines. | `sort combined.txt \| uniq` | Removes duplicates after sorting groups them together. | 移除相鄰重複行。 | 常先 `sort` 再 `uniq` 才能真正去重。 |
| `sort` | Sort lines of text. | `sort combined.txt` | Outputs lines in sorted order. | 排序文字行。 | 讓重複行相鄰以便 `uniq` 去重。 |
| `man <command>` | Show manual page for a command. | `man uniq` | Opens the manual in a pager (often `less`). | 查看指令手冊（man page）。 | 忘記參數用法時快速查閱。 |
| `sudo <command...>` | Run a command with superuser privileges. | `sudo cat /etc/shadow` | Prompts for your password and runs as admin. | 以管理者權限執行單一指令。 | 用於讀取/修改需要權限的系統檔案或安裝軟體。 |
| `reset` | Reset terminal display state. | `reset` | Clears and reinitializes the terminal. | 重置終端顯示狀態。 | 顯示亂掉或輸出很怪時可用。 |
| `apt install <pkg>` | Install software from Ubuntu repositories (typically with sudo). | `sudo apt install tree` | Installs `tree` package. | 安裝 Ubuntu 套件。 | 從官方套件庫安裝 `tree` 工具。 |
| `tree` | Display directory structure as a tree. | `tree /tmp/tutorial` | Prints folders/files in a tree layout. | 以樹狀顯示目錄結構。 | 快速看出資料夾層級與檔案分布。 |
| `tree -a` | Show hidden files in tree output. | `tree -a` | Includes dotfiles and dot-directories. | 樹狀輸出也顯示隱藏檔。 | 需要包含 `.config` 等時使用。 |
| `exit` | Exit the shell. | `exit` | Closes the current shell session. | 離開 shell。 | 結束終端會話（也可直接關視窗）。 |
| `Ctrl-D` | End-of-file in shell; commonly logs out/closes shell. |  |  | 送出 EOF，常用來結束 shell。 | 取代輸入 `exit` 的快捷鍵。 |
