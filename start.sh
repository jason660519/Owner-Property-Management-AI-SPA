#!/bin/bash

# ==========================================
# Owner Property Management - 統一啟動腳本
# ==========================================
# 功能：整合開發環境啟動、服務管理、依賴檢查
# 用法：./start.sh [all|web|web-au|admin|elastic|observability|openclaw|test|menu]

set -e

# --- 配置 ---
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$PROJECT_ROOT/logs/dev"
ENV_FILE="$PROJECT_ROOT/.env"
ELASTIC_DIR="$PROJECT_ROOT/backend/elasticsearch"
HERMES_RUNTIME_DIR="$PROJECT_ROOT/tools/hermes-runtime"
HERMES_HOME_DIR="${HERMES_HOME_DIR:-$HOME/.hermes-opm}"
OPENCLAW_HOME_DIR="${OPENCLAW_HOME_DIR:-$HOME/.openclaw}"
HERMES_DASHBOARD_PORT="${HERMES_DASHBOARD_PORT:-9119}"
HERMES_DASHBOARD_AVAILABLE=0
HERMES_STATUS_MESSAGE="未檢查"

# --- 顏色定義 ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# --- 載入環境變數 ---
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
else
    # 如果沒有 .env，提供預設值 (避免指令碼報錯，實際上應引導用戶建立)
    echo -e "${YELLOW}⚠️  警告: 未找到 .env 檔案，將使用預設設定。請確保已建立 .env 檔案以避免 Keys 洩露。${NC}"
fi

# --- 輔助函式 ---
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}❌ 錯誤: 未安裝 $1${NC}"
        return 1
    fi
}

print_install_hint() {
    local cmd="$1"
    echo -e "${YELLOW}────────────────────────────────────────${NC}"
    case "$cmd" in
        docker)
            echo -e "${YELLOW}建議安裝：Docker Desktop (macOS)${NC}"
            echo -e "${YELLOW}下載：https://www.docker.com/products/docker-desktop/${NC}"
            ;;
        node|npm)
            echo -e "${YELLOW}建議安裝：Node.js 20+ (含 npm 10+)${NC}"
            echo -e "${YELLOW}下載：https://nodejs.org/${NC}"
            echo -e "${YELLOW}或用本腳本自動安裝（macOS）：./start.sh bootstrap-node${NC}"
            echo -e "${YELLOW}安裝後請重新開啟 Terminal，再執行 ./start.sh all${NC}"
            ;;
        supabase)
            echo -e "${YELLOW}建議安裝：Supabase CLI${NC}"
            echo -e "${YELLOW}說明：https://supabase.com/docs/guides/local-development/cli/getting-started${NC}"
            echo -e "${YELLOW}若已安裝 Node，也可直接用 npx：npx --yes supabase --version${NC}"
            echo -e "${YELLOW}或用本腳本安裝 Supabase CLI binary：./start.sh bootstrap-supabase${NC}"
            ;;
        python3)
            echo -e "${YELLOW}建議安裝：Python 3.11+${NC}"
            echo -e "${YELLOW}下載：https://www.python.org/downloads/${NC}"
            ;;
        openclaw)
            echo -e "${YELLOW}建議安裝：OpenClaw (需先有 Node)${NC}"
            echo -e "${YELLOW}指令：npm install -g openclaw${NC}"
            ;;
    esac
    echo -e "${YELLOW}────────────────────────────────────────${NC}"
}

require_command() {
    local cmd="$1"
    if ! command -v "$cmd" &> /dev/null; then
        echo -e "${RED}❌ 錯誤: 未安裝 $cmd${NC}"
        print_install_hint "$cmd"
        return 1
    fi
    return 0
}

is_interactive_shell() {
    [ -t 0 ] && [ -t 1 ]
}

prompt_yes_no() {
    local prompt="$1"
    local answer=""
    if ! is_interactive_shell; then
        return 1
    fi
    read -r -p "$prompt" answer
    case "$answer" in
        y|Y|yes|YES) return 0 ;;
        *) return 1 ;;
    esac
}

supabase_exec() {
    if command -v supabase > /dev/null 2>&1; then
        SUPABASE_TELEMETRY_DISABLED=1 supabase "$@"
        return $?
    fi

    if [ -x "$HOME/.local/bin/supabase" ]; then
        SUPABASE_TELEMETRY_DISABLED=1 "$HOME/.local/bin/supabase" "$@"
        return $?
    fi
    if command -v npx > /dev/null 2>&1; then
        SUPABASE_TELEMETRY_DISABLED=1 npx --yes supabase "$@"
        return $?
    fi
    echo -e "${RED}❌ 錯誤: 未安裝 supabase（且找不到 npx 可作為替代）${NC}"
    print_install_hint supabase
    return 1
}

ensure_local_bin_on_path() {
    local bin_dir="$HOME/.local/bin"
    mkdir -p "$bin_dir"
    case ":$PATH:" in
        *":$bin_dir:"*) return 0 ;;
    esac
    export PATH="$bin_dir:$PATH"
    echo -e "${YELLOW}ℹ️  已將 $bin_dir 暫時加入 PATH（僅本次 Terminal 有效）${NC}"
    echo -e "${YELLOW}   若要永久生效，請把以下加入 ~/.zshrc：${NC}"
    echo -e "${YELLOW}   export PATH=\"$bin_dir:\$PATH\"${NC}"
    return 0
}

bootstrap_node() {
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        check_node_version || return 1
        echo -e "${GREEN}✅ Node.js 已就緒${NC}"
        return 0
    fi

    if [[ "$OSTYPE" != "darwin"* ]]; then
        echo -e "${RED}❌ 目前只提供 macOS 的自動安裝流程（請自行安裝 Node.js 20+）${NC}"
        print_install_hint node
        return 1
    fi

    require_command curl || return 1

    echo -e "${BLUE}⬇️  安裝 nvm（用於安裝 Node.js）...${NC}"
    if [ ! -s "$HOME/.nvm/nvm.sh" ]; then
        curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash || {
            echo -e "${RED}❌ nvm 安裝失敗${NC}"
            return 1
        }
    fi

    export NVM_DIR="$HOME/.nvm"
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        . "$NVM_DIR/nvm.sh"
    fi

    if ! command -v nvm >/dev/null 2>&1; then
        echo -e "${RED}❌ 找不到 nvm（請重新開啟 Terminal 後重試：./start.sh bootstrap-node）${NC}"
        return 1
    fi

    if [ -n "${npm_config_prefix:-}" ]; then
        unset npm_config_prefix
    fi

    echo -e "${BLUE}⬇️  安裝 Node.js 20（含 npm）...${NC}"
    nvm install 20
    nvm use 20
    nvm alias default 20

    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        echo -e "${RED}❌ Node.js 安裝後仍無法使用，請重新開啟 Terminal${NC}"
        return 1
    fi

    check_node_version || return 1
    echo -e "${GREEN}✅ Node.js 已安裝完成（建議重新開啟 Terminal 讓環境變數完整生效）${NC}"
    return 0
}

bootstrap_supabase() {
    ensure_local_bin_on_path || return 1
    if command -v supabase >/dev/null 2>&1; then
        local existing_dir
        existing_dir="$(dirname "$(command -v supabase)" 2>/dev/null || echo "")"
        if [ -n "$existing_dir" ] && [ -x "$existing_dir/supabase-go" ]; then
            echo -e "${GREEN}✅ Supabase CLI 已就緒${NC}"
            return 0
        fi
    fi

    require_command curl || return 1
    require_command tar || return 1

    local arch platform version download_base tmpdir archive archive_url version_display
    arch="$(uname -m)"
    case "$arch" in
        arm64*) platform="darwin_arm64" ;;
        x86_64*) platform="darwin_amd64" ;;
        *) echo -e "${RED}❌ 不支援的 CPU 架構: $arch${NC}"; return 1 ;;
    esac
    tmpdir="$(mktemp -d)"
    archive="$tmpdir/supabase.tar.gz"
    archive_url="https://github.com/supabase/cli/releases/latest/download/supabase_${platform}.tar.gz"
    version_display="latest"

    echo -e "${BLUE}⬇️  下載 Supabase CLI: ${version_display} (${platform})...${NC}"
    if ! curl -fL -o "$archive" "$archive_url" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  無法從 releases/latest 下載，改用 GitHub API 查詢版本...${NC}"
        echo -e "${BLUE}⬇️  取得 Supabase CLI 最新版本資訊...${NC}"
        version="$(curl -fsSL https://api.github.com/repos/supabase/cli/releases/latest | grep '"tag_name":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')"
        if [ -z "$version" ]; then
            echo -e "${RED}❌ 無法取得 Supabase CLI 版本（GitHub API 失敗）${NC}"
            rm -rf "$tmpdir"
            return 1
        fi
        version_display="$version"
        download_base="https://github.com/supabase/cli/releases/download/${version}"

        echo -e "${BLUE}⬇️  下載 Supabase CLI: ${version_display} (${platform})...${NC}"
        local version_no_v
        version_no_v="${version#v}"
        if ! curl -fL -o "$archive" "${download_base}/supabase_${version_no_v}_${platform}.tar.gz" >/dev/null 2>&1; then
            if ! curl -fL -o "$archive" "${download_base}/supabase_${version}_${platform}.tar.gz" >/dev/null 2>&1; then
                curl -fL -o "$archive" "${download_base}/supabase_${platform}.tar.gz" >/dev/null 2>&1 || {
                echo -e "${RED}❌ 下載 Supabase CLI 失敗（請檢查網路或公司代理）${NC}"
                rm -rf "$tmpdir"
                return 1
                }
            fi
        fi
    fi

    mkdir -p "$tmpdir/extracted"
    tar -xzf "$archive" -C "$tmpdir/extracted"

    if [ ! -f "$tmpdir/extracted/supabase" ]; then
        echo -e "${RED}❌ Supabase CLI 解壓失敗：找不到 supabase binary${NC}"
        rm -rf "$tmpdir"
        return 1
    fi

    mkdir -p "$HOME/.local/bin"
    mv "$tmpdir/extracted/supabase" "$HOME/.local/bin/supabase"
    if [ -f "$tmpdir/extracted/supabase-go" ]; then
        mv "$tmpdir/extracted/supabase-go" "$HOME/.local/bin/supabase-go"
    fi
    chmod +x "$HOME/.local/bin/supabase"
    [ -f "$HOME/.local/bin/supabase-go" ] && chmod +x "$HOME/.local/bin/supabase-go"
    if command -v xattr >/dev/null 2>&1; then
        xattr -dr com.apple.quarantine "$HOME/.local/bin/supabase" 2>/dev/null || true
        xattr -dr com.apple.quarantine "$HOME/.local/bin/supabase-go" 2>/dev/null || true
    fi
    rm -rf "$tmpdir"

    if [ ! -x "$HOME/.local/bin/supabase" ]; then
        echo -e "${RED}❌ Supabase CLI 已下載但目前 Shell 找不到（請重新開啟 Terminal）${NC}"
        return 1
    fi

    if [ ! -x "$HOME/.local/bin/supabase-go" ]; then
        echo -e "${YELLOW}⚠️  Supabase CLI 已下載，但缺少 supabase-go（或無法執行）${NC}"
        echo -e "${YELLOW}   建議改用 npm 安裝：npm i -g supabase${NC}"
        return 1
    fi

    echo -e "${GREEN}✅ Supabase CLI 已安裝完成: $("$HOME/.local/bin/supabase" --version 2>/dev/null || echo 'ok')${NC}"
    return 0
}

bootstrap_all_deps() {
    bootstrap_node || true
    bootstrap_supabase || true
    echo -e "${GREEN}✅ bootstrap 流程已完成（若仍顯示找不到指令，請重新開啟 Terminal）${NC}"
}

check_node_version() {
    local v major
    v="$(node -v 2>/dev/null || true)"
    v="${v#v}"
    major="${v%%.*}"
    if [ -z "$major" ]; then
        echo -e "${RED}❌ 錯誤: 無法判斷 Node 版本 (node -v = $v)${NC}"
        print_install_hint node
        return 1
    fi
    if [ "$major" -lt 20 ]; then
        echo -e "${RED}❌ 錯誤: Node 版本過舊 (目前: v${v})，需要 Node.js 20+${NC}"
        print_install_hint node
        return 1
    fi
    return 0
}

check_docker_dependencies() {
    echo -e "${BLUE}🐳 檢查 Docker 狀態...${NC}"
    require_command docker || return 1
    ensure_docker_running
    if ! docker compose version > /dev/null 2>&1; then
        echo -e "${RED}❌ 錯誤: 找不到 docker compose (Compose v2)${NC}"
        echo -e "${YELLOW}請確認已安裝/啟用 Docker Desktop 的 Compose plugin${NC}"
        return 1
    fi
    local image_count
    image_count="$(docker image ls -q 2>/dev/null | wc -l | tr -d ' ')"
    if [ "${image_count:-0}" -eq 0 ]; then
        echo -e "${YELLOW}ℹ️  偵測到 Docker 目前是空的（沒有任何 images）${NC}"
        echo -e "${YELLOW}   第一次執行會需要下載/建立多個 images（Supabase / Kibana / Hermes 等）${NC}"
        echo -e "${YELLOW}   這可能需要一些時間與網路流量。${NC}"
        if prompt_yes_no "要現在開始下載/建立必要的 Docker images 嗎？(y/N) "; then
            echo -e "${GREEN}✅ 已確認，繼續執行${NC}"
        else
            echo -e "${YELLOW}↪ 已取消。你可以稍後再執行：./start.sh all${NC}"
            return 1
        fi
    fi
    return 0
}

check_supabase_dependencies() {
    if command -v supabase > /dev/null 2>&1; then
        return 0
    fi
    if [ -x "$HOME/.local/bin/supabase" ]; then
        return 0
    fi
    if command -v npx > /dev/null 2>&1; then
        echo -e "${YELLOW}ℹ️  未找到全域 supabase，將改用 npx supabase（首次執行可能需要下載）${NC}"
        return 0
    fi
    echo -e "${RED}❌ 錯誤: 未安裝 supabase（且找不到 npx 可作為替代）${NC}"
    print_install_hint node
    print_install_hint supabase
    echo -e "${YELLOW}或直接執行：./start.sh bootstrap（自動安裝 Node + Supabase CLI）${NC}"
    if prompt_yes_no "要現在自動安裝 Node + Supabase CLI 嗎？(y/N) "; then
        bootstrap_all_deps || return 1
        if command -v supabase > /dev/null 2>&1 || [ -x "$HOME/.local/bin/supabase" ] || command -v npx > /dev/null 2>&1; then
            return 0
        fi
        echo -e "${RED}❌ 安裝完成但仍找不到 supabase/npx，請重新開啟 Terminal 後重試${NC}"
        return 1
    fi
    return 1
}

load_nvm_if_available() {
    if [ -n "${npm_config_prefix:-}" ]; then
        unset npm_config_prefix
    fi

    if [ -n "${NVM_DIR:-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
        . "$NVM_DIR/nvm.sh"
    elif [ -s "$HOME/.nvm/nvm.sh" ]; then
        export NVM_DIR="$HOME/.nvm"
        . "$HOME/.nvm/nvm.sh"
    fi

    if command -v nvm >/dev/null 2>&1; then
        nvm use default >/dev/null 2>&1 || nvm use 20 >/dev/null 2>&1 || true
    fi
}

check_node_dependencies() {
    load_nvm_if_available
    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        echo -e "${RED}❌ 錯誤: 未安裝 node/npm${NC}"
        print_install_hint node
        if prompt_yes_no "要現在自動安裝 Node.js 20（nvm）嗎？(y/N) "; then
            bootstrap_node || return 1
            load_nvm_if_available
        else
            return 1
        fi
    fi
    check_node_version || {
        if prompt_yes_no "要改用自動安裝/切換到 Node.js 20（nvm）嗎？(y/N) "; then
            bootstrap_node || return 1
            load_nvm_if_available
        else
            return 1
        fi
    }
    return 0
}

check_python_dependencies() {
    require_command python3 || return 1
    return 0
}

ensure_node_modules() {
    load_nvm_if_available
    if [ -d "$PROJECT_ROOT/node_modules" ]; then
        return 0
    fi
    echo -e "${BLUE}📦 安裝 npm 依賴 (workspaces)...${NC}"
    (
        cd "$PROJECT_ROOT"
        if [ -f "$PROJECT_ROOT/package-lock.json" ]; then
            npm ci
        else
            npm install
        fi
    ) || {
        echo -e "${RED}❌ npm 依賴安裝失敗，請先修正後重試${NC}"
        return 1
    }
    echo -e "${GREEN}✅ npm 依賴已安裝${NC}"
    return 0
}

ensure_docker_running() {
    if ! docker info > /dev/null 2>&1; then
        echo -e "${YELLOW}🔄 Docker 未啟動，正在嘗試自動開啟 Docker Desktop...${NC}"
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open -a "Docker"
            echo -e "${YELLOW}⏳ 等待 Docker 準備就緒 (約需 30-60 秒)...${NC}"
            local timeout=60
            local count=0
            while ! docker info > /dev/null 2>&1; do
                if [ $count -ge $timeout ]; then
                    echo -e "${RED}❌ Docker 啟動超時，請手動確認 Docker Desktop 狀態。${NC}"
                    exit 1
                fi
                sleep 2
                ((count+=2))
                echo -n "."
            done
            echo -e "\n${GREEN}✅ Docker 已就緒${NC}"
        else
            echo -e "${RED}❌ 非 macOS 環境，請手動啟動 Docker Daemon。${NC}"
            exit 1
        fi
    else
        echo -e "${GREEN}✅ Docker 已在運行${NC}"
        list_running_containers
    fi
}

list_running_containers() {
    local running_containers
    running_containers=$(docker ps --format "{{.Names}}\t{{.Ports}}" 2>/dev/null)
    if [ -n "$running_containers" ]; then
        echo -e "${BLUE}📦 目前運行中的容器與 Port：${NC}"
        echo "$running_containers" | while read -r name ports; do
            # 格式化輸出，只顯示具體的 port 映射部分
            local clean_ports
            clean_ports=$(echo "$ports" | sed 's/0.0.0.0://g' | sed 's/->/ -> /g')
            echo -e "   • ${GREEN}${name}${NC} [${clean_ports}]"
        done
    else
        echo -e "${YELLOW}ℹ️  目前沒有運行中的 Docker 容器${NC}"
    fi
}

check_dependencies() {
    echo -e "${BLUE}🔍 檢查環境依賴...${NC}"
    check_docker_dependencies || exit 1
    check_node_dependencies || exit 1
    check_supabase_dependencies || exit 1
    check_python_dependencies || exit 1
}

ensure_log_dir() {
    mkdir -p "$LOG_DIR"
}

run_osascript_with_timeout() {
    local timeout_seconds="$1"
    shift

    if ! command -v osascript >/dev/null 2>&1; then
        return 1
    fi

    perl -e 'alarm shift @ARGV; exec @ARGV' "$timeout_seconds" osascript "$@"
}

get_openclaw_gateway_port() {
    if [ -n "${OPENCLAW_GATEWAY_PORT:-}" ]; then
        echo "$OPENCLAW_GATEWAY_PORT"
        return 0
    fi

    if command -v openclaw >/dev/null 2>&1; then
        openclaw config get gateway.port 2>/dev/null || echo "18789"
        return 0
    fi

    echo "18789"
}

get_hermes_dashboard_url() {
    echo "http://localhost:${HERMES_DASHBOARD_PORT:-9119}"
}

get_hermes_status_summary() {
    if [ "$HERMES_DASHBOARD_AVAILABLE" = "1" ]; then
        echo "Hermes Dashboard (Docker-only): $(get_hermes_dashboard_url)"
    else
        echo "Hermes Dashboard: ${HERMES_STATUS_MESSAGE:-未檢查}"
    fi
}

open_url_once_in_chrome() {
    local url="$1"
    local found_tab="NOT_FOUND"

    if ! command -v open >/dev/null 2>&1; then
        return 0
    fi

    if pgrep -x "Google Chrome" >/dev/null 2>&1 && command -v osascript >/dev/null 2>&1; then
        found_tab=$(run_osascript_with_timeout 3 - "$url" <<'EOF' 2>/dev/null || echo "NOT_FOUND"
on run argv
    set targetUrl to item 1 of argv
    tell application "Google Chrome"
        repeat with w in windows
            repeat with t in tabs of w
                set tabUrl to URL of t
                if tabUrl starts with targetUrl then
                    return "FOUND"
                end if
            end repeat
        end repeat
    end tell
    return "NOT_FOUND"
end run
EOF
)
    fi

    if [ "$found_tab" = "FOUND" ]; then
        echo -e "${YELLOW}↪ 已開啟，跳過: ${url}${NC}"
    else
        open -a "Google Chrome" "$url" >/dev/null 2>&1 || true
    fi
}

# 偵測是否在 Claude Code / 非互動環境執行
# 用於決定 dev server 要不要寫 log（避免 Claude 攔截 stdout 累積到 /private/tmp/claude-*/tasks/）
# 詳見 .claude/rules/claude-code-background-shell.md
is_headless_claude() {
    [ -n "${CLAUDECODE:-}" ] || [ -n "${CLAUDE_CODE:-}" ] || [ ! -t 0 ]
}

# 決定 dev server 的 log 目的地
# 在 Claude Code / headless 環境下回傳 /dev/null，避免無上限累積
dev_log_target() {
    if is_headless_claude; then
        echo "/dev/null"
    else
        echo "$1"
    fi
}

ensure_supabase_running() {
    echo -e "${BLUE}🐘 檢查 Supabase 狀態...${NC}"
    # 確保本地 Storage 持久化目錄存在（config.toml objects_path 使用）
    mkdir -p "$PROJECT_ROOT/supabase/storage-data/property-photos" "$PROJECT_ROOT/supabase/storage-data/property-documents"
    if docker ps --format '{{.Names}}' | grep -q "supabase_db_"; then
        echo -e "${GREEN}✅ Supabase 已在運行${NC}"
    else
        echo -e "${YELLOW}🔄 正在啟動 Supabase...${NC}"
        if ! supabase_exec start; then
            echo -e "${RED}❌ Supabase 啟動失敗。請確認 Docker 是否正常且無埠號衝突。${NC}"
            exit 1
        fi
        echo -e "${GREEN}✅ Supabase 啟動成功${NC}"
    fi
    # 更新 SUPABASE_URL (以防萬一)
    export SUPABASE_URL=$(supabase_exec status 2>/dev/null | grep "API URL" | awk '{print $3}')
    # 自動寫入/更新 apps/web 與 apps/superadmin 的 .env.local 中的 Supabase 變數
    ensure_web_env_supabase
    # 資料完整性檢查：storage volume 有檔案但 DB metadata 不一致時提示還原
    check_storage_integrity
}

# 從 supabase status -o env 取得 API_URL / ANON_KEY / SERVICE_ROLE_KEY，寫入或合併到 apps/web 與 apps/superadmin 的 .env.local
ensure_web_env_supabase() {
    local status_env
    status_env=$(supabase_exec status -o env 2>/dev/null) || return 0
    local api_url anon_key service_role_key
    api_url=$(echo "$status_env" | grep '^API_URL=' | sed 's/^API_URL=//' | tr -d '"')
    anon_key=$(echo "$status_env" | grep '^ANON_KEY=' | sed 's/^ANON_KEY=//' | tr -d '"')
    service_role_key=$(echo "$status_env" | grep '^SERVICE_ROLE_KEY=' | sed 's/^SERVICE_ROLE_KEY=//' | tr -d '"')
    if [ -z "$api_url" ] || [ -z "$anon_key" ] || [ -z "$service_role_key" ]; then
        echo -e "${YELLOW}⚠️  無法取得 Supabase 金鑰，請手動設定 .env.local${NC}"
        return 0
    fi
    for app in web web-au superadmin; do
        local env_file="$PROJECT_ROOT/apps/$app/.env.local"
        if [ -f "$env_file" ]; then
            # 移除舊的 Supabase 相關變數與本腳本寫入的註解，保留其餘
            grep -v -E '^NEXT_PUBLIC_SUPABASE_URL=|^NEXT_PUBLIC_SUPABASE_ANON_KEY=|^SUPABASE_SERVICE_ROLE_KEY=|^# Auto-generated by start.sh' "$env_file" > "${env_file}.tmp"
            mv "${env_file}.tmp" "$env_file"
        fi
        # 追加本次取得的 Supabase 變數（Next.js 需 NEXT_PUBLIC_ 前綴）
        {
            echo ""
            echo "# Auto-generated by start.sh from supabase status"
            echo "NEXT_PUBLIC_SUPABASE_URL=$api_url"
            echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$anon_key"
            echo "SUPABASE_SERVICE_ROLE_KEY=$service_role_key"
        } >> "$env_file"
        echo -e "${GREEN}✅ 已更新 apps/$app/.env.local 的 Supabase 變數${NC}"
    done
}

check_storage_integrity() {
    local DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
    local BACKUP_DIR="$PROJECT_ROOT/apps/superadmin/backups"

    if ! command -v psql &>/dev/null; then return 0; fi

    local STORAGE_COUNT PHOTOS_COUNT BACKUP_COUNT
    STORAGE_COUNT=$(psql "$DB_URL" -t -A -c \
      "SELECT COUNT(*) FROM storage.objects WHERE bucket_id='property-photos';" 2>/dev/null || echo "-1")
    PHOTOS_COUNT=$(psql "$DB_URL" -t -A -c \
      "SELECT COUNT(*) FROM property_photos WHERE storage_path NOT LIKE 'properties/%';" 2>/dev/null || echo "-1")
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup_*.json 2>/dev/null | wc -l | tr -d ' ')

    # Warn if storage.objects is empty but backups exist (db reset happened)
    if [ "$STORAGE_COUNT" = "0" ] && [ "$BACKUP_COUNT" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠️  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}   偵測到 Storage metadata 遺失（storage.objects 是空的）${NC}"
        echo -e "${YELLOW}   這通常是執行過 supabase db reset 導致的${NC}"
        echo -e "${YELLOW}   找到 ${BACKUP_COUNT} 個備份檔案可供還原${NC}"
        echo -e "${YELLOW}   → 請至 http://localhost:3001/superadmin/settings/backup 進行還原${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
    elif [ "$STORAGE_COUNT" != "-1" ] && [ "$PHOTOS_COUNT" != "-1" ] && [ "$STORAGE_COUNT" != "$PHOTOS_COUNT" ]; then
        echo -e "${YELLOW}⚠️  storage.objects (${STORAGE_COUNT}) 與 property_photos (${PHOTOS_COUNT}) 數量不一致，建議至備份頁面執行健康檢查${NC}"
    fi
}

check_python_venv() {
    local SERVICE_DIR="$1"
    if [ ! -d "$SERVICE_DIR/venv" ]; then
        echo -e "${YELLOW}🐍 建立 Python 虛擬環境: $SERVICE_DIR${NC}"
        cd "$SERVICE_DIR"
        python3 -m venv venv
        source venv/bin/activate
        pip install -q fastapi uvicorn pydantic cryptography 'python-jose[cryptography]' supabase
        deactivate
        cd "$PROJECT_ROOT"
    fi
}

# Check if any Chrome tab with the OpenClaw base URL is already open.
# If not, open with the tokenized URL (via openclaw dashboard --no-open) so
# the user does not have to manually enter a token.
open_openclaw_if_needed() {
    if ! command -v open >/dev/null 2>&1 || ! command -v openclaw > /dev/null 2>&1; then
        return 0
    fi
    local gw_port
    gw_port="$(get_openclaw_gateway_port)"
    gw_port="${gw_port:-18789}"
    local base_url="http://127.0.0.1:${gw_port}"
    local found_tab="NOT_FOUND"
    if pgrep -x "Google Chrome" >/dev/null 2>&1 && command -v osascript >/dev/null 2>&1; then
        found_tab=$(run_osascript_with_timeout 3 - "$base_url" <<'OSASCRIPT' 2>/dev/null || echo "NOT_FOUND"
on run argv
    set targetUrl to item 1 of argv
    tell application "Google Chrome"
        repeat with w in windows
            repeat with t in tabs of w
                if URL of t starts with targetUrl then
                    return "FOUND"
                end if
            end repeat
        end repeat
    end tell
    return "NOT_FOUND"
end run
OSASCRIPT
)
    fi
    if [ "$found_tab" = "FOUND" ]; then
        echo -e "${YELLOW}\u21aa OpenClaw \u5df2\u958b\u555f\uff0c\u8df3\u904e: ${base_url}${NC}"
        return 0
    fi
    # Get tokenized URL without opening browser, then open in Chrome
    local token_url
    token_url=$(openclaw dashboard --no-open 2>/dev/null | grep -oE 'https?://[^[:space:]]+' | head -1)
    if [[ "$token_url" == http* ]]; then
        echo -e "${BLUE}\ud83c\udf10 \u958b\u555f OpenClaw\uff08\u542b token\uff09: ${token_url}${NC}"
        open -a "Google Chrome" "$token_url" >/dev/null 2>&1 || true
    else
        # Fallback: let openclaw handle opening
        openclaw dashboard >/dev/null 2>&1 || true
    fi
}

open_all_service_pages() {
    if ! command -v open >/dev/null 2>&1; then
        return 0
    fi

    echo -e "${BLUE}\ud83c\udf10 \u4e00\u9375\u958b\u555f\u670d\u52d9\u9801\u9762...${NC}"
    open_url_once_in_chrome "http://localhost:3001/superadmin"
    open_openclaw_if_needed
    open_url_once_in_chrome "http://localhost:5601/app/integrations/browse"
    if [ "$HERMES_DASHBOARD_AVAILABLE" = "1" ] && curl -fsS "$(get_hermes_dashboard_url)" >/dev/null 2>&1; then
        open_url_once_in_chrome "$(get_hermes_dashboard_url)"
    fi
    open_url_once_in_chrome "http://localhost:54323/project/default"
    open_url_once_in_chrome "http://localhost:54324/"
}

update_hermes_image() {
    echo -e "${BLUE}📦 更新 Hermes Docker image...${NC}"
    echo -e "${YELLOW}ℹ️  Docker 模式請用這個指令更新；Hermes Dashboard 內建 Update 不適用${NC}"

    local compose_file="$HERMES_RUNTIME_DIR/docker-compose.yml"

    if [ ! -f "$compose_file" ]; then
        HERMES_STATUS_MESSAGE="runtime 設定遺失"
        echo -e "${RED}❌ 找不到 Hermes runtime 設定: $compose_file${NC}"
        return 1
    fi

    mkdir -p "$HERMES_HOME_DIR"

    (
        cd "$HERMES_RUNTIME_DIR"
        export PROJECT_ROOT="$PROJECT_ROOT"
        export HERMES_HOME_DIR="$HERMES_HOME_DIR"
        export HERMES_DASHBOARD_PORT="$HERMES_DASHBOARD_PORT"
        docker compose -f "$compose_file" pull
    ) || {
        HERMES_STATUS_MESSAGE="Hermes image 更新失敗"
        echo -e "${RED}❌ Hermes image 更新失敗${NC}"
        return 1
    }

    echo -e "${YELLOW}🔄 重新建立 Hermes 容器以套用新 image...${NC}"
    start_hermes_dashboard
}

start_hermes_dashboard() {
    echo -e "${BLUE}🤖 啟動 Hermes Dashboard (Docker-only)...${NC}"

    local compose_file="$HERMES_RUNTIME_DIR/docker-compose.yml"
    local dashboard_url
    local first_run=0
    local dashboard_container_state=""
    dashboard_url="$(get_hermes_dashboard_url)"

    if [ ! -f "$compose_file" ]; then
        HERMES_STATUS_MESSAGE="runtime 設定遺失"
        echo -e "${RED}❌ 找不到 Hermes runtime 設定: $compose_file${NC}"
        return 1
    fi

    mkdir -p "$HERMES_HOME_DIR"

    if [ ! -f "$HERMES_HOME_DIR/.env" ] && [ ! -f "$HERMES_HOME_DIR/config.yaml" ]; then
        first_run=1
        HERMES_STATUS_MESSAGE="首次設定中（等待 Dashboard 啟動）"
        echo -e "${YELLOW}⚠️  尚未初始化 Hermes 設定，先啟動 Dashboard 讓你在 browser 內完成設定${NC}"
        echo -e "   • 若要改走 CLI setup：docker run -it --rm -v \"$HERMES_HOME_DIR:/opt/data\" nousresearch/hermes-agent setup"
    fi

    if ! docker image inspect nousresearch/hermes-agent:latest >/dev/null 2>&1; then
        HERMES_STATUS_MESSAGE="下載 Hermes image 中"
        echo -e "${BLUE}📥 首次啟動，下載 Hermes Docker image...${NC}"
        docker pull nousresearch/hermes-agent:latest >/dev/null 2>&1 || {
            HERMES_STATUS_MESSAGE="Hermes image 下載失敗"
            echo -e "${RED}❌ Hermes image 下載失敗，請檢查 Docker 網路${NC}"
            return 1
        }
        echo -e "${GREEN}✅ Hermes image 已下載${NC}"
    fi

    local selected_port="$HERMES_DASHBOARD_PORT"
    if lsof -i :"$selected_port" > /dev/null 2>&1; then
        if docker ps --format '{{.Names}}' | grep -q '^hermes-dashboard$' && curl -fsS "$dashboard_url" >/dev/null 2>&1; then
            HERMES_DASHBOARD_AVAILABLE=1
            HERMES_STATUS_MESSAGE="已啟動"
            export HERMES_DASHBOARD_AVAILABLE
            echo -e "${GREEN}✅ Hermes Dashboard 已在運行: $dashboard_url${NC}"
            echo -e "${YELLOW}ℹ️  若要更新 Hermes，請執行: ./start.sh hermes-update${NC}"
            open_url_once_in_chrome "$dashboard_url"
            return 0
        fi

        selected_port="9120"
        if lsof -i :"$selected_port" > /dev/null 2>&1; then
            HERMES_STATUS_MESSAGE="Port 9119/9120 衝突"
            echo -e "${RED}❌ Port 9119 / 9120 都被佔用，請先釋放 port 或手動指定 HERMES_DASHBOARD_PORT${NC}"
            return 1
        fi

        HERMES_DASHBOARD_PORT="$selected_port"
        dashboard_url="$(get_hermes_dashboard_url)"
        echo -e "${YELLOW}⚠️  Port 9119 已被佔用，改用 Port ${selected_port}${NC}"
    fi

    if docker ps -a --format '{{.Names}}' | grep -q '^hermes-dashboard$'; then
        dashboard_container_state=$(docker inspect -f '{{.State.Status}}' hermes-dashboard 2>/dev/null || echo 'missing')
        if [ "$dashboard_container_state" != "running" ] || ! curl -fsS "$dashboard_url" >/dev/null 2>&1; then
            HERMES_STATUS_MESSAGE="清理舊的 Hermes Dashboard 容器"
            echo -e "${YELLOW}⚠️  偵測到舊的 Hermes Dashboard 容器（state: ${dashboard_container_state}），先移除再重建${NC}"
            docker rm -f hermes-dashboard >/dev/null 2>&1 || true
        fi
    fi

    if [ "$first_run" = "0" ] && docker ps -a --format '{{.Names}}' | grep -q '^hermes-opm$'; then
        local gateway_container_state
        gateway_container_state=$(docker inspect -f '{{.State.Status}}' hermes-opm 2>/dev/null || echo 'missing')
        if [ "$gateway_container_state" != "running" ]; then
            echo -e "${YELLOW}⚠️  偵測到舊的 Hermes Gateway 容器（state: ${gateway_container_state}），先移除再重建${NC}"
            docker rm -f hermes-opm >/dev/null 2>&1 || true
        fi
    fi

    ensure_log_dir
    (
        cd "$HERMES_RUNTIME_DIR"
        export PROJECT_ROOT="$PROJECT_ROOT"
        export HERMES_HOME_DIR="$HERMES_HOME_DIR"
        export HERMES_DASHBOARD_PORT="$HERMES_DASHBOARD_PORT"
        if [ "$first_run" = "1" ]; then
            docker compose -f "$compose_file" up -d --no-deps hermes-dashboard
        else
            docker compose -f "$compose_file" up -d
        fi
    ) > "$LOG_DIR/hermes-runtime.log" 2>&1 || {
        HERMES_STATUS_MESSAGE="啟動失敗（查看 hermes-runtime.log）"
        echo -e "${RED}❌ Hermes Dashboard 啟動失敗，詳見: $LOG_DIR/hermes-runtime.log${NC}"
        tail -n 20 "$LOG_DIR/hermes-runtime.log" || true
        return 1
    }

    local state
    state=$(docker inspect -f '{{.State.Status}}' hermes-dashboard 2>/dev/null || echo 'missing')
    if [ "$state" != "running" ]; then
        HERMES_STATUS_MESSAGE="容器狀態異常：$state"
        echo -e "${RED}❌ Hermes Dashboard 容器未正常運行（state: $state），詳見: $LOG_DIR/hermes-runtime.log${NC}"
        return 1
    fi

    for _ in $(seq 1 20); do
        if curl -fsS "$dashboard_url" >/dev/null 2>&1; then
            HERMES_DASHBOARD_AVAILABLE=1
            HERMES_STATUS_MESSAGE="已啟動"
            export HERMES_DASHBOARD_AVAILABLE HERMES_DASHBOARD_PORT
            echo -e "${GREEN}✅ Hermes Dashboard 啟動成功: $dashboard_url${NC}"
            if [ "$first_run" = "1" ]; then
                echo -e "${BLUE}🌐 首次設定可直接在 Dashboard 內填寫 API keys 與 config${NC}"
            fi
            echo -e "${YELLOW}ℹ️  Docker 模式更新請用: ./start.sh hermes-update${NC}"
            open_url_once_in_chrome "$dashboard_url"
            return 0
        fi
        sleep 1
    done

    HERMES_STATUS_MESSAGE="Dashboard 尚未可連線"
    echo -e "${RED}❌ Hermes Dashboard 尚未可連線，詳見: $LOG_DIR/hermes-runtime.log${NC}"
    return 1
}

# --- 啟動函式 ---


start_web() {
    echo -e "${BLUE}🌐 啟動 Web App (Port 3000)...${NC}"
    ensure_node_modules || return 1
    if lsof -i :3000 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Web App 已在運行${NC}"
    else
        cd "$PROJECT_ROOT/apps/web"
        # Default: background (survives terminal close / macOS sleep).
        # Pass "terminal" to open a visible Terminal tab instead.
        if [ "$1" == "terminal" ]; then
            osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/apps/web' && npm run dev\"" >/dev/null 2>&1 &
            echo -e "${GREEN}✅ Web App (Terminal) 啟動成功${NC}"
        else
            ensure_log_dir
            local log_target
            log_target=$(dev_log_target "$LOG_DIR/nextjs.log")
            nohup npm run dev > "$log_target" 2>&1 &
            disown
            if [ "$log_target" = "/dev/null" ]; then
                echo -e "${YELLOW}⚠️  Headless / Claude Code 環境，dev server 輸出已導向 /dev/null（避免 /private/tmp/claude-*/tasks/ 累積）${NC}"
                echo -e "${GREEN}✅ Web App (Background) 啟動成功${NC}"
            else
                echo -e "${GREEN}✅ Web App (Background) 啟動成功,log: $log_target${NC}"
            fi
        fi
    fi
}

start_web_au() {
    echo -e "${BLUE}🦘 啟動 Web App AU (Port 3002)...${NC}"
    ensure_node_modules || return 1
    if lsof -i :3002 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Web App AU 已在運行${NC}"
    else
        cd "$PROJECT_ROOT/apps/web-au"
        if [ "$1" == "terminal" ]; then
            osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/apps/web-au' && npm run dev\"" >/dev/null 2>&1 &
            echo -e "${GREEN}✅ Web App AU (Terminal) 啟動成功${NC}"
        else
            ensure_log_dir
            local log_target
            log_target=$(dev_log_target "$LOG_DIR/nextjs-au.log")
            nohup npm run dev > "$log_target" 2>&1 &
            disown
            if [ "$log_target" = "/dev/null" ]; then
                echo -e "${YELLOW}⚠️  Headless / Claude Code 環境，dev server 輸出已導向 /dev/null${NC}"
                echo -e "${GREEN}✅ Web App AU (Background) 啟動成功${NC}"
            else
                echo -e "${GREEN}✅ Web App AU (Background) 啟動成功,log: $log_target${NC}"
            fi
        fi
    fi
}

start_admin() {
    echo -e "${BLUE}🔐 啟動 Superadmin (Port 3001)...${NC}"
    ensure_node_modules || return 1
    if lsof -i :3001 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Superadmin 已在運行${NC}"
    else
        cd "$PROJECT_ROOT/apps/superadmin"
        if [ "$1" == "terminal" ]; then
            osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT/apps/superadmin' && npm run dev\"" >/dev/null 2>&1 &
            echo -e "${GREEN}✅ Superadmin (Terminal) 啟動成功${NC}"
        else
            ensure_log_dir
            local log_target
            log_target=$(dev_log_target "$LOG_DIR/superadmin.log")
            nohup npm run dev > "$log_target" 2>&1 &
            disown
            if [ "$log_target" = "/dev/null" ]; then
                echo -e "${YELLOW}⚠️  Headless / Claude Code 環境，dev server 輸出已導向 /dev/null${NC}"
                echo -e "${GREEN}✅ Superadmin (Background) 啟動成功${NC}"
            else
                echo -e "${GREEN}✅ Superadmin (Background) 啟動成功,log: $log_target${NC}"
            fi
        fi
    fi
}

start_openclaw() {
    echo -e "${BLUE}🕹️  啟動 OpenClaw...${NC}"
    if ! command -v openclaw > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  找不到 openclaw 指令${NC}"
        if prompt_yes_no "要現在用 npm 全域安裝 openclaw 嗎？(y/N) "; then
            if command -v npm >/dev/null 2>&1; then
                npm install -g openclaw || {
                    echo -e "${RED}❌ openclaw 安裝失敗${NC}"
                    return 1
                }
            else
                echo -e "${RED}❌ 找不到 npm，請先安裝 Node.js${NC}"
                return 1
            fi
        else
            echo -e "${RED}❌ 找不到 openclaw 指令，請先安裝：npm install -g openclaw${NC}"
            return 1
        fi
        if ! command -v openclaw > /dev/null 2>&1; then
            echo -e "${RED}❌ openclaw 安裝完成但仍找不到指令，請重新開啟 Terminal 後重試${NC}"
            return 1
        fi
    fi

    local gateway_port
    gateway_port="$(get_openclaw_gateway_port)"
    gateway_port="${gateway_port:-18789}"

    if openclaw gateway start > /dev/null 2>&1; then
        echo -e "${GREEN}✅ OpenClaw Gateway 啟動成功${NC}"
        echo -e "   • OpenClaw Dashboard: http://localhost:${gateway_port}"
        # Open with token so user is not asked to enter it manually.
        open_openclaw_if_needed
    else
        echo -e "${RED}❌ OpenClaw 啟動失敗，請執行 openclaw gateway status 檢查${NC}"
        return 1
    fi
}

ELASTIC_WAIT_PID=""

start_elasticsearch_stack() {
    echo -e "${BLUE}🔎 啟動 Elasticsearch + Kibana (Docker)...${NC}"

    local compose_file="$ELASTIC_DIR/docker-compose.yml"
    local elastic_log="$LOG_DIR/elasticsearch-startup.log"
    if [ ! -f "$compose_file" ]; then
        echo -e "${RED}❌ 找不到 Elasticsearch compose 設定: $compose_file${NC}"
        return 1
    fi

    ensure_log_dir
    : > "$elastic_log"

    # Fast path: if both are already healthy, skip all waits entirely.
    # Use /api/status for Kibana: root URL returns 200 even when "server is not ready yet".
    if curl -fsS "http://localhost:9200/_cluster/health" > /dev/null 2>&1 \
       && curl -fsS "http://localhost:5601/api/status" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Elasticsearch/Kibana 已在執行${NC}"
        echo -e "   • Elasticsearch:  http://localhost:9200"
        echo -e "   • Kibana:         http://localhost:5601"
        return 0
    fi

    (
        cd "$ELASTIC_DIR"
        docker compose -f "$compose_file" up -d elasticsearch kibana
    ) > "$elastic_log" 2>&1 || {
        echo -e "${RED}❌ Elasticsearch/Kibana 啟動失敗${NC}"
        echo -e "${YELLOW}ℹ️  詳細錯誤已寫入: $elastic_log${NC}"
        tail -n 30 "$elastic_log" || true
        return 1
    }

    # Background readiness wait: lets start_all continue with other services.
    (
        local es_ok=0 kb_ok=0
        for _ in $(seq 1 60); do
            if curl -fsS "http://localhost:9200/_cluster/health" > /dev/null 2>&1; then
                es_ok=1
                break
            fi
            sleep 1
        done
        for _ in $(seq 1 120); do
            if curl -fsS "http://localhost:5601/api/status" > /dev/null 2>&1; then
                kb_ok=1
                break
            fi
            sleep 1
        done
        if [ "$es_ok" -eq 1 ] && [ "$kb_ok" -eq 1 ]; then
            echo -e "${GREEN}✅ Elasticsearch/Kibana 就緒${NC}"
        else
            [ "$es_ok" -ne 1 ] && echo -e "${YELLOW}⚠️  Elasticsearch 尚未就緒 → http://localhost:9200${NC}"
            [ "$kb_ok" -ne 1 ] && echo -e "${YELLOW}⚠️  Kibana 尚未就緒 → http://localhost:5601${NC}"
        fi
    ) &
    ELASTIC_WAIT_PID=$!
    echo -e "${BLUE}   ↳ 健康檢查已放到背景（PID ${ELASTIC_WAIT_PID}），繼續啟動其他服務${NC}"
    return 0
}

run_observability_checks() {
    echo -e "${BLUE}📊 執行 Elastic Observability MVP 檢查...${NC}"

    local registry_script="$PROJECT_ROOT/tools/observability/check-fleet-registry.sh"
    local smoke_script="$PROJECT_ROOT/tools/observability/mvp-smoke.sh"

    if [ ! -x "$registry_script" ] || [ ! -x "$smoke_script" ]; then
        echo -e "${RED}❌ 找不到可執行的 observability 腳本，請確認 tools/observability 目錄${NC}"
        return 1
    fi

    if "$registry_script"; then
        echo -e "${GREEN}✅ Fleet registry 檢查完成${NC}"
    else
        echo -e "${YELLOW}⚠️  Fleet registry 檢查有警示，請參考 docs/operational-guides/elastic-observability-mvp.md${NC}"
    fi

    if "$smoke_script"; then
        echo -e "${GREEN}✅ MVP smoke 檢查完成${NC}"
    else
        echo -e "${YELLOW}⚠️  MVP smoke 檢查有警示，請先完成 integrations 安裝${NC}"
    fi
}

backup_agent_data() {
    echo -e "${BLUE}💾 備份 Hermes / OpenClaw 本機資料...${NC}"

    local backup_dir="$PROJECT_ROOT/backups/agent-data"
    local timestamp
    local archive_path
    local manifest_file=""
    local tar_list_file=""
    local tar_sources=()
    local source_path=""

    mkdir -p "$backup_dir"
    timestamp=$(date '+%Y%m%d-%H%M%S')
    archive_path="$backup_dir/agent-data-$timestamp.tar.gz"
    manifest_file=$(mktemp)
    tar_list_file=$(mktemp)

    cat > "$manifest_file" <<EOF
Created at: $timestamp
Project root: $PROJECT_ROOT
Hermes data: $HERMES_HOME_DIR
OpenClaw data: $OPENCLAW_HOME_DIR
EOF

    tar_sources+=("$manifest_file")

    if [ -d "$HERMES_HOME_DIR" ]; then
        tar_sources+=("$HERMES_HOME_DIR")
    fi

    if [ -d "$OPENCLAW_HOME_DIR" ]; then
        tar_sources+=("$OPENCLAW_HOME_DIR")
    fi

    if [ "${#tar_sources[@]}" -eq 1 ]; then
        echo -e "${RED}❌ 找不到可備份的 agent 資料目錄${NC}"
        rm -f "$manifest_file"
        rm -f "$tar_list_file"
        return 1
    fi

    for source_path in "${tar_sources[@]}"; do
        if [ -d "$source_path" ]; then
            (
                cd /
                find "${source_path#/}" \( -type s -o -type p \) -prune -o -print
            ) >> "$tar_list_file"
        else
            printf '%s\n' "${source_path#/}" >> "$tar_list_file"
        fi
    done

    tar -C / -czf "$archive_path" -T "$tar_list_file"
    rm -f "$manifest_file"
    rm -f "$tar_list_file"

    echo -e "${GREEN}✅ Agent 資料備份完成: $archive_path${NC}"
}

start_all() {
    echo -e "${BLUE}🚀 正在啟動所有服務 (背景模式)...${NC}"
    check_docker_dependencies || exit 1
    check_supabase_dependencies || exit 1
    local openclaw_port
    openclaw_port="$(get_openclaw_gateway_port)"
    openclaw_port="${openclaw_port:-18789}"
    ensure_log_dir
    ensure_supabase_running
    start_elasticsearch_stack
    if check_node_dependencies; then
        start_web "bg"
        start_web_au "bg"
        start_admin "bg"
    else
        echo -e "${YELLOW}⚠️  Node.js 未就緒，已跳過 Web/Superadmin 啟動。安裝完成後再執行：./start.sh web / admin / all${NC}"
    fi

    if ! start_hermes_dashboard; then
        echo -e "${YELLOW}⚠️  Hermes Dashboard 啟動失敗，先略過（可稍後執行：./start.sh hermes）${NC}"
    fi
    if ! start_openclaw "bg"; then
        echo -e "${YELLOW}⚠️  OpenClaw 啟動失敗，先略過（可稍後執行：./start.sh openclaw）${NC}"
    fi

    if [ -n "$ELASTIC_WAIT_PID" ]; then
        wait "$ELASTIC_WAIT_PID" 2>/dev/null || true
    fi

    echo ""
    echo -e "${GREEN}🎉 所有服務啟動程序已完成${NC}"
    echo -e "   • Web App (TW):     http://localhost:3000"
    echo -e "   • Web App (AU):     http://localhost:3002"
    echo -e "   • Superadmin:       http://localhost:3001/superadmin/dashboard"
    echo -e "   • Elasticsearch:    http://localhost:9200"
    echo -e "   • Kibana:           http://localhost:5601"
    echo -e "   • $(get_hermes_status_summary)"
    echo -e "   • OpenClaw Dashboard: http://localhost:${openclaw_port}"
    echo -e "   • Supabase Studio:  http://localhost:54323"
    echo -e "   • Mailpit (Email):  http://localhost:54324"
    echo -e "   • Logs:             $LOG_DIR/"
    echo -e "   • Hermes data:      $HERMES_HOME_DIR"
    echo -e "   • OpenClaw data:    $OPENCLAW_HOME_DIR"
    echo ""
    echo -e "${YELLOW}📝 測試帳號資訊${NC}"
    echo -e "   • 測試 Email:       a0426788981@gmail.com"
    echo -e "   • 統一密碼:         !qaz2wsX"
    echo -e "   • 詳細資訊:         docs/operational-guides/deployment-guides/TEST_ACCOUNTS_REFERENCE.md"
    open_all_service_pages
}

clean_cache() {
    echo -e "${YELLOW}🧹 清除快取...${NC}"
    rm -rf "$PROJECT_ROOT/apps/web/.next"
    rm -rf "$PROJECT_ROOT/apps/web-au/.next"
    rm -rf "$PROJECT_ROOT/apps/superadmin/.next"
    echo -e "${GREEN}✅ 完成${NC}"
}

run_tests() {
    echo -e "${BLUE}🧪 執行自動化測試...${NC}"
    
    # 檢查 Superadmin 是否運行
    if ! lsof -i :3001 > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Superadmin (Port 3001) 未啟動，測試需要該服務運行。${NC}"
        read -p "是否自動啟動 Superadmin (背景執行)? (y/n) " answer
        if [[ "$answer" == "y" || "$answer" == "Y" ]]; then
            start_admin "bg"
            echo -e "${YELLOW}⏳ 等待 10 秒讓服務準備就緒...${NC}"
            sleep 10
        else
            echo -e "${RED}❌ 無法執行測試：目標服務未啟動${NC}"
            return 1
        fi
    fi

    cd "$PROJECT_ROOT"
    
    echo -e "${BLUE}▶️  執行登入跳轉邏輯測試...${NC}"
    if npx playwright test apps/superadmin/e2e/login-redirect.spec.ts; then
        echo -e "${GREEN}✅ 登入邏輯測試通過${NC}"
    else
        echo -e "${RED}❌ 登入邏輯測試失敗${NC}"
        # 不中斷，繼續跑截圖
    fi
    
    echo -e "${BLUE}▶️  執行截圖生成測試...${NC}"
    if npx playwright test apps/superadmin/e2e/generate-screenshots.spec.ts; then
        echo -e "${GREEN}✅ 截圖生成成功${NC}"
    else
        echo -e "${RED}❌ 截圖生成失敗${NC}"
    fi
    
    echo -e "${GREEN}✅ 測試執行程序結束${NC}"
    echo -e "   • 截圖位置: apps/superadmin/e2e/screenshots/"
}

# --- 選單介面 ---
show_menu() {
    clear
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo -e "${BLUE}   Owner Property Management - 啟動選單 ${NC}"
    echo -e "${BLUE}════════════════════════════════════════${NC}"
    echo "1) 🚀 啟動所有服務 (背景執行)"
    echo "2) 🌐 啟動 Web App TW (Port 3000)"
    echo "3) 🦘 啟動 Web App AU (Port 3002)"
    echo "4) 🔐 啟動 Superadmin (Port 3001)"
    echo "5) 🧪 執行 Superadmin 測試 (含截圖)"
    echo "6) 🧹 清除快取 (TW + AU + Superadmin)"
    echo "7) 🤖 啟動 Hermes Dashboard (Docker-only)"
    echo "8) 📦 更新 Hermes Docker image"
    echo "9) 🔎 啟動 Elasticsearch + Kibana (Docker)"
    echo "10) 📊 執行 Observability MVP 檢查"
    echo "11) 🕹️  啟動 OpenClaw"
    echo "12) 💾 備份 Hermes / OpenClaw 資料"
    echo "13) 🛑 停止所有服務"
    echo "14) 🧰 安裝開發依賴（Node + Supabase CLI）"
    echo "15) 🧰 安裝 Node.js（nvm）"
    echo "16) 🧰 安裝 Supabase CLI"
    echo "0) 離開"
    echo ""
    read -p "請輸入選項: " choice

    case $choice in
        1) start_all ;;
        2) check_docker_dependencies && check_supabase_dependencies && check_node_dependencies && ensure_supabase_running && start_web ;;
        3) check_docker_dependencies && check_supabase_dependencies && check_node_dependencies && ensure_supabase_running && start_web_au ;;
        4) check_docker_dependencies && check_supabase_dependencies && check_node_dependencies && ensure_supabase_running && start_admin ;;
        5) run_tests ;;
        6) clean_cache ;;
        7) start_hermes_dashboard ;;
        8) update_hermes_image ;;
        9) start_elasticsearch_stack ;;
        10) run_observability_checks ;;
        11) start_openclaw ;;
        12) backup_agent_data ;;
        13) ./stop.sh ;;
        14) bootstrap_all_deps ;;
        15) bootstrap_node ;;
        16) bootstrap_supabase ;;
        0) exit 0 ;;
        *) echo "無效選項"; sleep 1; show_menu ;;
    esac
}

# --- 主邏輯 ---
case "${1:-menu}" in
    all)    start_all ;;
    bootstrap) bootstrap_all_deps ;;
    bootstrap-node) bootstrap_node ;;
    bootstrap-supabase) bootstrap_supabase ;;
    web)    check_docker_dependencies && check_supabase_dependencies && check_node_dependencies && ensure_supabase_running && start_web ;;
    web-au) check_docker_dependencies && check_supabase_dependencies && check_node_dependencies && ensure_supabase_running && start_web_au ;;
    admin)  check_docker_dependencies && check_supabase_dependencies && check_node_dependencies && ensure_supabase_running && start_admin ;;
    elastic) check_docker_dependencies && start_elasticsearch_stack ;;
    observability) check_docker_dependencies && run_observability_checks ;;
    openclaw) start_openclaw ;;
    backup-agent-data) backup_agent_data ;;
    hermes-update) check_docker_dependencies && update_hermes_image ;;
    hermes) check_docker_dependencies && start_hermes_dashboard ;;
    test)   run_tests ;;
    clean)  clean_cache ;;
    menu)   show_menu ;;
    *)      echo "用法: $0 [all|bootstrap|bootstrap-node|bootstrap-supabase|web|web-au|admin|elastic|observability|openclaw|backup-agent-data|hermes|hermes-update|test|clean|menu]" ;;
esac
