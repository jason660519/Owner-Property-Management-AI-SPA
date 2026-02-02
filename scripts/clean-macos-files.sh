#!/bin/bash

# macOS 隱藏文件清理腳本
# 用途: 清理整個專案中的 ._* 文件
# 創建日期: 2026-02-02
# 創建者: Claude Sonnet 4.5

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 專案根目錄
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  macOS 隱藏文件清理工具${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# 統計當前的 ._* 文件數量
echo -e "${YELLOW}🔍 掃描 ._* 文件...${NC}"
HIDDEN_FILES_COUNT=$(find "$PROJECT_ROOT" -name "._*" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ "$HIDDEN_FILES_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 沒有找到 ._* 文件！${NC}"
    exit 0
fi

echo -e "${YELLOW}📊 找到 ${HIDDEN_FILES_COUNT} 個 ._* 文件${NC}"
echo ""

# 詢問是否刪除
read -p "是否刪除這些文件？(y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⏸️  取消操作${NC}"
    exit 0
fi

# 刪除文件
echo -e "${YELLOW}🗑️  刪除中...${NC}"
find "$PROJECT_ROOT" -name "._*" -type f -delete 2>/dev/null

# 驗證結果
REMAINING_COUNT=$(find "$PROJECT_ROOT" -name "._*" -type f 2>/dev/null | wc -l | tr -d ' ')

if [ "$REMAINING_COUNT" -eq 0 ]; then
    echo -e "${GREEN}✅ 成功刪除 ${HIDDEN_FILES_COUNT} 個文件！${NC}"
else
    echo -e "${RED}⚠️  還剩 ${REMAINING_COUNT} 個文件未刪除${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ 清理完成${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}💡 提示：${NC}"
echo -e "  • 這些文件會在 exFAT 格式的磁碟上持續生成"
echo -e "  • 建議定期運行此腳本清理"
echo -e "  • 或考慮將專案移到 APFS/HFS+ 格式的磁碟"
echo ""
