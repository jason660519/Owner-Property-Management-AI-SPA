
#!/bin/bash
# Start the Development Progress Dashboard
PORT=3001
DIR="$(dirname "$0")/../dev-dashboard"

echo "Starting Project Development Dashboard on http://localhost:$PORT"
echo "Press Ctrl+C to stop"

# Check if python3 is available
if command -v python3 &> /dev/null; then
    cd "$DIR" && python3 -m http.server $PORT
else
    # Fallback to python (v2 or v3 alias)
    cd "$DIR" && python -m SimpleHTTPServer $PORT
fi
