#!/bin/bash
# filepath: apps/web/test-remember-me.sh
# Test script for "Remember Me" functionality

echo "🧪 測試「記住我」功能"
echo "================================"

# 顏色定義
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 測試計數器
TESTS_PASSED=0
TESTS_FAILED=0

# 測試函數
test_case() {
    local description=$1
    local command=$2
    local expected=$3
    
    echo -e "\n${YELLOW}測試: ${description}${NC}"
    
    result=$(eval "$command")
    
    if [[ "$result" == *"$expected"* ]]; then
        echo -e "${GREEN}✓ 通過${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}✗ 失敗${NC}"
        echo "  預期: $expected"
        echo "  實際: $result"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo -e "\n${YELLOW}步驟 1: 執行單元測試${NC}"
echo "-----------------------------"

cd "$(dirname "$0")"

# 執行記住我功能的測試
npm test -- LoginPage.test.tsx --testNamePattern="記住我功能測試" 2>&1 | tee test-output.log

# 檢查測試結果
if grep -q "4 passed" test-output.log; then
    echo -e "\n${GREEN}✓ 所有「記住我」單元測試通過！${NC}"
    ((TESTS_PASSED+=4))
else
    echo -e "\n${RED}✗ 部分單元測試失敗${NC}"
    ((TESTS_FAILED+=4))
fi

# 清理
rm -f test-output.log

echo -e "\n${YELLOW}步驟 2: 檢查程式碼實作${NC}"
echo "-----------------------------"

# 檢查是否正確實作 localStorage
if grep -q "localStorage.setItem('rememberedPassword'" ../../apps/web/app/\(auth\)/login/page.tsx; then
    echo -e "${GREEN}✓ 程式碼中包含儲存密碼的邏輯${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 程式碼中缺少儲存密碼的邏輯${NC}"
    ((TESTS_FAILED++))
fi

if grep -q "localStorage.getItem('rememberedPassword')" ../../apps/web/app/\(auth\)/login/page.tsx; then
    echo -e "${GREEN}✓ 程式碼中包含讀取密碼的邏輯${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 程式碼中缺少讀取密碼的邏輯${NC}"
    ((TESTS_FAILED++))
fi

if grep -q "localStorage.removeItem('rememberedPassword')" ../../apps/web/app/\(auth\)/login/page.tsx; then
    echo -e "${GREEN}✓ 程式碼中包含清除密碼的邏輯${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ 程式碼中缺少清除密碼的邏輯${NC}"
    ((TESTS_FAILED++))
fi

# 測試結果總結
echo -e "\n================================"
echo -e "測試結果總結"
echo -e "================================"
echo -e "${GREEN}通過: $TESTS_PASSED${NC}"
echo -e "${RED}失敗: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 所有測試都通過了！${NC}"
    echo -e "\n${YELLOW}手動測試步驟：${NC}"
    echo "1. 開啟 http://localhost:3000/login"
    echo "2. 輸入 email 和 password"
    echo "3. 勾選「記住我」"
    echo "4. 點擊登入"
    echo "5. 登入成功後，重新訪問 http://localhost:3000/login"
    echo "6. 確認 email 和 password 已自動填入"
    echo "7. 修改 password 並再次登入"
    echo "8. 重新訪問登入頁面，確認新密碼已被記住"
    exit 0
else
    echo -e "\n${RED}❌ 有測試失敗，請檢查上述錯誤${NC}"
    exit 1
fi
