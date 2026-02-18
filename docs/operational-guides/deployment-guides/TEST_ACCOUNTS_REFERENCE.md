# 測試帳號參考文檔

> **創建日期**: 2026-02-18  
> **創建者**: Claude Sonnet 4.5  
> **最後修改**: 2026-02-18  
> **版本**: 1.0

## 📝 概述

本文檔記錄所有開發與測試環境的測試帳號資訊，供團隊成員快速參考。

---

## 🔐 本地開發環境測試帳號

### 主要測試帳號

| Email | 密碼 | 角色 | 用途 | 狀態 |
|-------|------|------|------|------|
| `a0426788981@gmail.com` | `!qaz2wsX` | landlord | 主要開發測試帳號（房東） | ✅ 可用 |
| `awsjasonyu@gmail.com` | `!qaz2wsX` | 多角色 | 多角色測試 | ✅ 可用 |
| `a0405142777@gmail.com` | `!qaz2wsX` | 多角色 | 備用測試帳號 | ✅ 可用 |

### 其他測試帳號（過往文檔中提及）

| Email | 用途 | 備註 |
|-------|------|------|
| `a0405145777@gmail.com` | 登入優化測試 | 見 `docs/reports/login_optimization_test_report.md` |
| `jason660519@gmail.com` | 登入優化測試 | 見 `docs/reports/login_optimization_test_report.md` |

---

## 🛠️ 測試帳號管理工具

### 1. 列出所有用戶

```bash
npx tsx scripts/list_users.ts
```

### 2. 診斷用戶權限

```bash
npx tsx scripts/diagnose_user.ts <email>
```

### 3. 重設密碼

```bash
npx tsx scripts/reset_password.ts <email> <新密碼>

# 範例
npx tsx scripts/reset_password.ts a0426788981@gmail.com '!qaz2wsX'
```

### 4. 同步 IAM 角色到 Auth Metadata

```bash
npx tsx scripts/sync_user_roles_to_metadata.ts <email>
```

### 5. 分配 IAM 群組

```bash
# 使用預設群組（所有角色）
npx tsx scripts/assign_user_to_iam_groups.ts <email>

# 指定特定群組
npx tsx scripts/assign_user_to_iam_groups.ts <email> "Standard Landlords" "Agents"
```

---

## ⚠️ 重要注意事項

### 密碼管理原則

1. **統一密碼**: 本地開發環境所有測試帳號統一使用 `!qaz2wsX`
2. **文檔同步**: 修改密碼後，必須更新以下文檔：
   - 本文檔 (`TEST_ACCOUNTS_REFERENCE.md`)
   - 快速啟動指南 (`quick-start-guide.md`)
   - 主 README.md（如有提及）
3. **生產環境**: 生產環境絕不使用這些測試帳號和密碼

### 常見問題

#### ❌ 問題：登入失敗「登入被拒絕」

**原因**：
- 密碼不正確（可能忘記或被修改）
- Auth metadata 缺少 `roles` 欄位

**解決方法**：
```bash
# 1. 重設密碼
npx tsx scripts/reset_password.ts a0426788981@gmail.com '!qaz2wsX'

# 2. 同步角色到 metadata
npx tsx scripts/sync_user_roles_to_metadata.ts a0426788981@gmail.com

# 3. 驗證角色
npx tsx scripts/diagnose_user.ts a0426788981@gmail.com
```

#### ❌ 問題：登入後跳轉到 Portal 但看不到角色卡片

**原因**：IAM 系統中沒有角色分配

**解決方法**：
```bash
# 為用戶分配所有測試角色
npx tsx scripts/assign_user_to_iam_groups.ts a0426788981@gmail.com

# 同步到 auth metadata
npx tsx scripts/sync_user_roles_to_metadata.ts a0426788981@gmail.com
```

#### ❌ 問題：忘記測試帳號密碼

**解決方法**：
1. 查閱本文檔（`docs/operational-guides/deployment-guides/TEST_ACCOUNTS_REFERENCE.md`）
2. 使用重設密碼腳本重設為標準密碼
3. 若本文檔過時，請更新並通知團隊

---

## 🔄 測試帳號建立流程

### 方式 1：透過 UI 註冊（推薦）

1. 訪問 http://localhost:3000/register
2. 填寫資訊並註冊
3. 使用腳本分配角色和權限

### 方式 2：透過腳本建立

```bash
# 1. 建立測試用戶（需編寫腳本，或使用 Supabase Admin API）
# 2. 分配 IAM 群組
npx tsx scripts/assign_user_to_iam_groups.ts <email> "Standard Landlords"

# 3. 同步角色到 metadata
npx tsx scripts/sync_user_roles_to_metadata.ts <email>

# 4. 設定密碼
npx tsx scripts/reset_password.ts <email> '!qaz2wsX'
```

---

## 📋 測試場景對應帳號

| 測試場景 | 推薦帳號 | 備註 |
|---------|---------|------|
| 基本登入測試 | `a0426788981@gmail.com` | 單一 landlord 角色 |
| 多角色測試 | `awsjasonyu@gmail.com` | 已分配多個角色 |
| Portal 選擇測試 | `awsjasonyu@gmail.com` | 登入後應顯示角色選擇 |
| 權限測試 | `a0405142777@gmail.com` | 可用於測試不同權限組合 |
| 邀請碼流程 | 新建帳號 | 使用 Superadmin 後台發送邀請 |

---

## 🔍 檢查測試帳號狀態

### 快速診斷

```bash
# 一次檢查所有測試帳號
for email in a0426788981@gmail.com awsjasonyu@gmail.com a0405142777@gmail.com; do
  echo "=== $email ==="
  npx tsx scripts/diagnose_user.ts "$email"
  echo ""
done
```

### 資料庫直接查詢

```bash
# 連接到本地 Supabase PostgreSQL
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres

# 查詢測試帳號
SELECT id, email, raw_user_meta_data->>'role' as role, 
       raw_user_meta_data->>'roles' as roles 
FROM auth.users 
WHERE email IN ('a0426788981@gmail.com', 'awsjasonyu@gmail.com', 'a0405142777@gmail.com');
```

---

## 📌 更新日誌

| 日期 | 變更內容 | 變更者 |
|------|---------|--------|
| 2026-02-18 | 初始版本，記錄現有測試帳號 | Claude Sonnet 4.5 |

---

## 🤝 貢獻指南

**修改測試帳號資訊時，請遵循以下流程：**

1. 更新本文檔
2. 更新 `quick-start-guide.md`
3. 通知團隊成員（Slack/Teams）
4. 在 Git commit 中註明變更

**Commit 格式範例**：
```
docs: 更新測試帳號密碼為 NewPassword123

- 更新 TEST_ACCOUNTS_REFERENCE.md
- 更新 quick-start-guide.md
- 通知：所有測試帳號密碼統一變更
```

---

**維護者**: 開發團隊  
**聯絡方式**: 請在專案 Issue 中提出問題
