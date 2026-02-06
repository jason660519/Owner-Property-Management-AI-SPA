
#!/bin/bash
# Start the Project Process Dashboard
# Serves the project root so /project-process/ URLs work correctly
# Port 3001 保留給 Superadmin 後台 (npm run dev:superadmin)；專案進度儀表板使用 3002
export PORT=${PORT:-3002}
# Get the project root directory (parent of scripts directory)
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Starting Project Process Dashboard on http://localhost:${PORT}/project-process/project-progress-dashboard/index.html"
echo "Serving from root: $PROJECT_ROOT"
echo "Press Ctrl+C to stop"

# Check if python3 is available
if command -v python3 &> /dev/null; then
    echo "Using custom server.py"
    cd "$PROJECT_ROOT" && python3 server.py
else
    # Fallback to python (v2 or v3 alias)
    echo "Using custom server.py (fallback)"
    cd "$PROJECT_ROOT" && python server.py
fi
