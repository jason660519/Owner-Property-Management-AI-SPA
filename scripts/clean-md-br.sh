#!/bin/bash

# 這個腳本用於清理專案中所有 .md 檔案中的 <br> 標籤
# 使用方式: ./scripts/clean-md-br.sh

echo "正在搜尋並移除專案中所有 .md 檔案中的 <br> 標籤..."

# 使用 find 尋找所有 .md 檔案，並用 sed 進行取代
# 注意: macOS 的 sed 需要備份副檔名或使用特定的語法，這裡採用相容性較好的方式
find . -name "*.md" -type f -exec sed -i '' 's/<br>//g' {} +

echo "清理完成！"
