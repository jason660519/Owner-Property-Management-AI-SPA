#!/bin/bash
# filepath: scripts/migrate-tests.sh
# description: Migrate test files to colocated structure
# created: 2026-02-06
# creator: Claude Opus 4.5

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$PROJECT_ROOT/apps/web"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  測試檔案遷移腳本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to create directory if not exists
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}✓ 建立目錄: $1${NC}"
    fi
}

# Function to move file with backup
move_file() {
    local src="$1"
    local dest="$2"

    if [ -f "$src" ]; then
        # Create destination directory
        create_dir "$(dirname "$dest")"

        # Move file
        mv "$src" "$dest"
        echo -e "${GREEN}✓ 遷移: $(basename "$src") → $dest${NC}"
    else
        echo -e "${YELLOW}⚠ 檔案不存在: $src${NC}"
    fi
}

# Phase 1: Remove duplicate test files
phase1_cleanup() {
    echo ""
    echo -e "${BLUE}Phase 1: 清理重複測試檔案${NC}"
    echo "----------------------------------------"

    local duplicates=(
        "$WEB_DIR/__tests__/components/pages/LoginPage.test.tsx"
        "$WEB_DIR/__tests__/components/pages/RegisterPage.test.tsx"
        "$WEB_DIR/__tests__/components/pages/ForgotPasswordPage.test.tsx"
    )

    for file in "${duplicates[@]}"; do
        if [ -f "$file" ]; then
            rm "$file"
            echo -e "${GREEN}✓ 刪除重複檔案: $(basename "$file")${NC}"
        fi
    done

    # Clean up empty directories
    find "$WEB_DIR/__tests__/components/pages" -type d -empty -delete 2>/dev/null || true
}

# Phase 2: Create new directory structure
phase2_create_structure() {
    echo ""
    echo -e "${BLUE}Phase 2: 建立新目錄結構${NC}"
    echo "----------------------------------------"

    # Page test directories
    create_dir "$WEB_DIR/app/(auth)/login/__tests__"
    create_dir "$WEB_DIR/app/(auth)/register/__tests__"
    create_dir "$WEB_DIR/app/(auth)/forgot-password/__tests__"
    create_dir "$WEB_DIR/app/(auth)/update-password/__tests__"

    # Component test directories
    create_dir "$WEB_DIR/components/admin/__tests__"
    create_dir "$WEB_DIR/components/ui/UserNav/__tests__"

    # Library test directories
    create_dir "$WEB_DIR/lib/supabase/__tests__"
    create_dir "$WEB_DIR/lib/validators/__tests__"

    # Actions test directories
    create_dir "$WEB_DIR/actions/__tests__"

    # Admin test directories
    create_dir "$WEB_DIR/app/admin/users/__tests__"

    # Landlord test directories
    create_dir "$WEB_DIR/app/landlord/add-property/__tests__"

    # E2E flow directories
    create_dir "$WEB_DIR/e2e/flows/auth"
    create_dir "$WEB_DIR/e2e/flows/landlord"
    create_dir "$WEB_DIR/e2e/flows/tenant"
    create_dir "$WEB_DIR/e2e/flows/admin"
    create_dir "$WEB_DIR/e2e/flows/public"
    create_dir "$WEB_DIR/e2e/fixtures"
    create_dir "$WEB_DIR/e2e/utils"
}

# Phase 3: Migrate test files
phase3_migrate_files() {
    echo ""
    echo -e "${BLUE}Phase 3: 遷移測試檔案${NC}"
    echo "----------------------------------------"

    # Auth component tests
    move_file "$WEB_DIR/__tests__/auth/components/LoginPage.test.tsx" \
              "$WEB_DIR/app/(auth)/login/__tests__/page.test.tsx"

    move_file "$WEB_DIR/__tests__/auth/components/RegisterPage.test.tsx" \
              "$WEB_DIR/app/(auth)/register/__tests__/page.test.tsx"

    move_file "$WEB_DIR/__tests__/auth/components/ForgotPasswordPage.test.tsx" \
              "$WEB_DIR/app/(auth)/forgot-password/__tests__/page.test.tsx"

    move_file "$WEB_DIR/__tests__/auth/components/UpdatePasswordPage.test.tsx" \
              "$WEB_DIR/app/(auth)/update-password/__tests__/page.test.tsx"

    move_file "$WEB_DIR/__tests__/auth/components/InviteUserModal.test.tsx" \
              "$WEB_DIR/components/admin/__tests__/InviteUserModal.test.tsx"

    # Service and validator tests
    move_file "$WEB_DIR/__tests__/auth/services/auth.service.test.ts" \
              "$WEB_DIR/lib/supabase/__tests__/auth.service.test.ts"

    move_file "$WEB_DIR/__tests__/auth/validators/auth.validator.test.ts" \
              "$WEB_DIR/lib/validators/__tests__/auth.validator.test.ts"

    # Supabase tests
    move_file "$WEB_DIR/__tests__/lib/supabase/auth.test.ts" \
              "$WEB_DIR/lib/supabase/__tests__/auth.test.ts"

    # Action tests
    move_file "$WEB_DIR/__tests__/app/actions/auth.test.ts" \
              "$WEB_DIR/actions/__tests__/auth.test.ts"

    move_file "$WEB_DIR/__tests__/app/actions/contact.test.ts" \
              "$WEB_DIR/actions/__tests__/contact.test.ts"

    # Admin tests
    move_file "$WEB_DIR/__tests__/admin/users/actions.test.ts" \
              "$WEB_DIR/app/admin/users/__tests__/actions.test.ts"

    # Landlord tests
    move_file "$WEB_DIR/__tests__/landlord/add-property.test.tsx" \
              "$WEB_DIR/app/landlord/add-property/__tests__/page.test.tsx"

    # UI component tests
    move_file "$WEB_DIR/__tests__/components/ui/UserNav.test.tsx" \
              "$WEB_DIR/components/ui/UserNav/__tests__/UserNav.test.tsx"

    # Auth utility test
    move_file "$WEB_DIR/__tests__/auth/auth.test.ts" \
              "$WEB_DIR/lib/supabase/__tests__/auth-utils.test.ts"
}

# Phase 4: Migrate E2E tests
phase4_migrate_e2e() {
    echo ""
    echo -e "${BLUE}Phase 4: 重組 E2E 測試${NC}"
    echo "----------------------------------------"

    # Auth E2E tests
    move_file "$WEB_DIR/e2e/test-login.spec.ts" \
              "$WEB_DIR/e2e/flows/auth/login.spec.ts"

    move_file "$WEB_DIR/e2e/create-test-account.spec.ts" \
              "$WEB_DIR/e2e/flows/auth/create-account.spec.ts"

    move_file "$WEB_DIR/e2e/manual-auth-flow.spec.ts" \
              "$WEB_DIR/e2e/flows/auth/manual-auth.spec.ts"

    move_file "$WEB_DIR/e2e/password-reset-flow.spec.ts" \
              "$WEB_DIR/e2e/flows/auth/password-reset.spec.ts"

    move_file "$WEB_DIR/e2e/reset-password-admin.spec.ts" \
              "$WEB_DIR/e2e/flows/admin/reset-password.spec.ts"

    # Landlord E2E tests
    move_file "$WEB_DIR/e2e/add-property.spec.ts" \
              "$WEB_DIR/e2e/flows/landlord/add-property.spec.ts"

    move_file "$WEB_DIR/e2e/landlord-add-property.spec.ts" \
              "$WEB_DIR/e2e/flows/landlord/add-property-full.spec.ts"

    move_file "$WEB_DIR/e2e/add-property-complete.spec.ts" \
              "$WEB_DIR/e2e/flows/landlord/add-property-complete.spec.ts"

    move_file "$WEB_DIR/e2e/property-photo-upload.spec.ts" \
              "$WEB_DIR/e2e/flows/landlord/photo-upload.spec.ts"

    move_file "$WEB_DIR/e2e/vlm-document-scan.spec.ts" \
              "$WEB_DIR/e2e/flows/landlord/vlm-document-scan.spec.ts"

    # Utility E2E tests
    move_file "$WEB_DIR/e2e/quick-test.spec.ts" \
              "$WEB_DIR/e2e/utils/quick-test.spec.ts"

    move_file "$WEB_DIR/e2e/server-check.spec.ts" \
              "$WEB_DIR/e2e/utils/server-check.spec.ts"
}

# Phase 5: Cleanup empty directories
phase5_cleanup() {
    echo ""
    echo -e "${BLUE}Phase 5: 清理空目錄${NC}"
    echo "----------------------------------------"

    # Remove empty directories in old __tests__ structure
    find "$WEB_DIR/__tests__" -type d -empty -delete 2>/dev/null || true

    # Check if __tests__ is empty and remove
    if [ -d "$WEB_DIR/__tests__" ] && [ -z "$(ls -A "$WEB_DIR/__tests__")" ]; then
        rmdir "$WEB_DIR/__tests__"
        echo -e "${GREEN}✓ 移除空的 __tests__ 目錄${NC}"
    fi
}

# Run verification tests
verify_tests() {
    echo ""
    echo -e "${BLUE}Phase 6: 驗證測試${NC}"
    echo "----------------------------------------"

    cd "$WEB_DIR"

    echo -e "${YELLOW}執行單元測試...${NC}"
    if npm test -- --passWithNoTests 2>/dev/null; then
        echo -e "${GREEN}✓ 單元測試通過${NC}"
    else
        echo -e "${RED}✗ 單元測試失敗${NC}"
        return 1
    fi
}

# Main execution
main() {
    echo -e "${YELLOW}開始遷移測試檔案...${NC}"
    echo ""

    # Ask for confirmation
    read -p "確定要執行遷移嗎？這會移動測試檔案到新位置 (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "已取消遷移"
        exit 0
    fi

    phase1_cleanup
    phase2_create_structure
    phase3_migrate_files
    phase4_migrate_e2e
    phase5_cleanup

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  遷移完成！${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "下一步："
    echo "1. 執行 'npm test' 驗證測試"
    echo "2. 執行 'npm run test:e2e' 驗證 E2E 測試"
    echo "3. 更新 import 路徑（如有需要）"
    echo "4. 提交變更到 Git"
}

# Run main function
main "$@"
