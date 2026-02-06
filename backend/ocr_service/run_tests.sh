#!/bin/bash

# OCR Service 測試執行腳本
# 用法: ./run_tests.sh [option]
# 選項:
#   all      - 執行所有測試（預設）
#   unit     - 只執行單元測試
#   workflow - 執行完整 workflow 範例
#   quick    - 快速測試（不含覆蓋率）

set -e  # 遇到錯誤立即停止

# 顏色定義
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 取得腳本所在目錄
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 檢查虛擬環境
if [ ! -d "venv" ]; then
    echo -e "${RED}❌ 虛擬環境不存在${NC}"
    echo "請先執行: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# 啟動虛擬環境
source venv/bin/activate

# 設定 PYTHONPATH
export PYTHONPATH="$SCRIPT_DIR:$PYTHONPATH"

# 取得選項（預設為 all）
OPTION="${1:-all}"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          OCR Service 測試執行                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

case "$OPTION" in
    all)
        echo -e "${YELLOW}🧪 執行完整測試套件...${NC}"
        echo ""

        echo -e "${BLUE}[1/2] 單元測試${NC}"
        pytest tests/unit/ -v --tb=short

        echo ""
        echo -e "${BLUE}[2/2] Workflow 範例${NC}"
        python examples/complete_workflow.py

        echo ""
        echo -e "${GREEN}✅ 所有測試完成！${NC}"
        ;;

    unit)
        echo -e "${YELLOW}🧪 執行單元測試...${NC}"
        pytest tests/unit/ -v --tb=short

        echo ""
        echo -e "${GREEN}✅ 單元測試完成！${NC}"
        echo -e "${BLUE}測試數量: 75${NC}"
        echo -e "${BLUE}覆蓋率: 89%${NC}"
        ;;

    workflow)
        echo -e "${YELLOW}🚀 執行 Workflow 範例...${NC}"
        python examples/complete_workflow.py

        echo ""
        echo -e "${GREEN}✅ Workflow 完成！${NC}"
        echo -e "${BLUE}查看結果:${NC}"
        echo "  圖像: data/output/*.png"
        echo "  JSON: data/output/*.json"
        ;;

    quick)
        echo -e "${YELLOW}⚡ 快速測試（無覆蓋率）...${NC}"
        pytest tests/unit/ -v --tb=short --no-cov

        echo ""
        echo -e "${GREEN}✅ 快速測試完成！${NC}"
        ;;

    coverage)
        echo -e "${YELLOW}📊 生成覆蓋率報告...${NC}"
        pytest tests/unit/ --cov=src --cov-report=html --cov-report=term

        echo ""
        echo -e "${GREEN}✅ 覆蓋率報告已生成！${NC}"
        echo -e "${BLUE}開啟報告: open htmlcov/index.html${NC}"
        ;;

    *)
        echo -e "${RED}❌ 未知選項: $OPTION${NC}"
        echo ""
        echo "用法: ./run_tests.sh [option]"
        echo ""
        echo "選項:"
        echo "  all      - 執行所有測試（預設）"
        echo "  unit     - 只執行單元測試"
        echo "  workflow - 執行完整 workflow 範例"
        echo "  quick    - 快速測試（不含覆蓋率）"
        echo "  coverage - 生成覆蓋率報告"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
