#!/bin/bash
# filepath: apps/mobile/verify-phase1.sh
# description: Verification script for Phase 1 document upload implementation
# created: 2026-01-31
# creator: Claude Sonnet 4.5

set -e

echo "=========================================="
echo "📋 Phase 1 文件上傳功能驗證腳本"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

# Function to check file existence
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 (missing)"
        ((FAIL++))
    fi
}

# Function to check directory existence
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $1/"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1/ (missing)"
        ((FAIL++))
    fi
}

# Function to check npm package
check_package() {
    if grep -q "\"$1\"" package.json; then
        echo -e "${GREEN}✓${NC} $1 installed"
        ((PASS++))
    else
        echo -e "${RED}✗${NC} $1 not found in package.json"
        ((FAIL++))
    fi
}

echo "1️⃣  檢查目錄結構..."
echo "---"
check_dir "src/types"
check_dir "src/services"
check_dir "src/hooks"
check_dir "src/components/documents"
echo ""

echo "2️⃣  檢查核心文件..."
echo "---"
check_file "src/types/documents.ts"
check_file "src/services/documentService.ts"
check_file "src/hooks/useDocumentUpload.ts"
check_file "src/components/documents/DocumentUploader.tsx"
check_file "src/screens/dashboard/DocumentsScreen.tsx"
echo ""

echo "3️⃣  檢查文檔文件..."
echo "---"
check_file "INTEGRATION_GUIDE.md"
check_file "TEST_CHECKLIST.md"
check_file "DOCUMENT_UPLOAD_README.md"
check_file "DASHBOARD_INTEGRATION_EXAMPLE.md"
check_file "../../docs/progress-reports/文件上傳功能_Phase1_實作完成報告_2026-01-31.md"
echo ""

echo "4️⃣  檢查 npm 依賴..."
echo "---"
check_package "expo-document-picker"
check_package "expo-file-system"
echo ""

echo "5️⃣  檢查 TypeScript 編譯..."
echo "---"
if npx tsc --noEmit 2>&1 | grep -q "src/types/documents.ts\|src/services/documentService.ts\|src/hooks/useDocumentUpload.ts\|src/components/documents/DocumentUploader.tsx\|src/screens/dashboard/DocumentsScreen.tsx"; then
    echo -e "${RED}✗${NC} TypeScript errors found in new files"
    ((FAIL++))
else
    echo -e "${GREEN}✓${NC} No TypeScript errors in new files"
    ((PASS++))
fi
echo ""

echo "=========================================="
echo "📊 驗證結果"
echo "=========================================="
echo -e "通過: ${GREEN}${PASS}${NC}"
echo -e "失敗: ${RED}${FAIL}${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✅ Phase 1 實作驗證通過！${NC}"
    echo ""
    echo "🚀 下一步:"
    echo "   1. 執行測試: 參考 TEST_CHECKLIST.md"
    echo "   2. 整合至 Dashboard: 參考 DASHBOARD_INTEGRATION_EXAMPLE.md"
    echo "   3. 提交代碼: git add . && git commit"
    exit 0
else
    echo -e "${RED}❌ 驗證失敗，請檢查缺失的文件${NC}"
    exit 1
fi
