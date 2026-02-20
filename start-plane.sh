#!/usr/bin/env bash
# 啟動本地 Docker 自架的 Plane（port 8080，不與 web:3000 / admin:3001 衝突）
# 參考：https://developers.plane.so/self-hosting/methods/docker-compose

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLANE_APP_DIR="$SCRIPT_DIR/plane-selfhost/plane-app"

if [[ ! -f "$PLANE_APP_DIR/docker-compose.yaml" ]] || [[ ! -f "$PLANE_APP_DIR/plane.env" ]]; then
  echo "錯誤：找不到 plane-app（需先執行安裝）。"
  echo "請在專案根目錄執行："
  echo "  mkdir -p plane-selfhost/plane-app"
  echo "  並從 https://github.com/makeplane/plane/releases 下載 setup.sh 在無空格路徑執行 Install，"
  echo "  再將 plane-app 內容複製到 plane-selfhost/plane-app，並設定 plane.env 的 LISTEN_HTTP_PORT=8080。"
  exit 1
fi

cd "$PLANE_APP_DIR"
if command -v docker-compose &>/dev/null; then
  docker-compose --env-file plane.env up -d
else
  docker compose --env-file plane.env up -d
fi

echo ""
echo "Plane 啟動中，請稍候約 1–2 分鐘後開啟： http://localhost:8080"
