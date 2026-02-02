# Lahomes 專案 - 開啟頁面指南

## 快速開啟

### 方法一：使用終端機指令

在終端機中執行以下指令開啟主頁面：

```bash
open "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Lahomes/techzaa.in/lahomes/admin/index.html"
```

### 方法二：使用 Finder

1. 開啟 Finder
2. 導航至：`/Volumes/KLEVV-4T-1/Real Estate Management Projects/Lahomes/techzaa.in/lahomes/admin/`
3. 雙擊 `index.html` 檔案

### 方法三：建立快捷別名（推薦）

在您的 shell 設定檔（`~/.zshrc` 或 `~/.bashrc`）中加入：

```bash
alias lahomes='open "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Lahomes/techzaa.in/lahomes/admin/index.html"'
```

重新載入設定後，只需在終端機輸入：

```bash
lahomes
```

---

## 主要頁面列表

### 儀表板
- **主儀表板**: `index.html`
- **客戶儀表板**: `dashboard-customer.html`

### 物業管理
- **物業詳情**: `property-details.html`
- **物業網格**: `property-grid.html`
- **物業列表**: `property-list.html`

### 經紀人管理
- **經紀人網格**: `agents-grid.html`
- **經紀人列表**: `agents-list.html`
- **經紀人詳情**: `agents-details.html`

### 客戶管理
- **新增客戶**: `customers-add.html`
- **客戶詳情**: `customers-details.html`
- **客戶列表**: `customers-list.html`

### 其他功能
- **收件匣**: `inbox.html`
- **行事曆**: `app-calendar.html`
- **聊天**: `app-chat.html`
- **發票**: `pages-invoice.html`

### 認證頁面
- **登入**: `auth-login.html`
- **註冊**: `auth-signup.html`
- **忘記密碼**: `auth-password.html`
- **鎖定畫面**: `auth-lock-screen.html`

---

## 開啟特定頁面

若要開啟特定頁面，將檔名替換為對應的 HTML 檔案：

```bash
open "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Lahomes/techzaa.in/lahomes/admin/[頁面名稱].html"
```

例如：

```bash
# 開啟經紀人網格頁面
open "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Lahomes/techzaa.in/lahomes/admin/agents-grid.html"

# 開啟客戶儀表板
open "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Lahomes/techzaa.in/lahomes/admin/dashboard-customer.html"
```

---

## 專案結構

```
Lahomes/
└── techzaa.in/
    └── lahomes/
        └── admin/
            ├── index.html          # 主頁面
            ├── assets/             # 靜態資源
            │   ├── css/
            │   ├── js/
            │   └── images/
            ├── *.html              # 各功能頁面
            └── ...
```

---

**最後更新**: 2026-01-21
