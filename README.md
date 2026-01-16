# 房東物件管理語音 AI 平台

> A landlord-focused Property Management AI platform built with modern web technologies.
> This platform is designed exclusively to help property owners manage rental and sale workflows more efficiently.

## 📚 Documentation

- **[產品概述](./docs/產品概述及使用場景說明/產品概述.md)** - 房東物件管理語音 AI 產品定位與價值主張
- **[使用者場景](./docs/產品概述及使用場景說明/使用者場景.md)** - 房東在出租與出售流程中的實際使用情境
- **[房東－房屋資料準備手冊](./docs/產品概述及使用場景說明/房東－房屋資料準備手冊.md)** - 出租／出售前應備妥的權利文件與物件資料
- **[房客－預約看房須知](./docs/產品概述及使用場景說明/房客－預約看房須知.md)** - 提供給潛在房客的預約看房指引與權益說明
- **[需求規格書](./requirements.md)** - 系統功能、財務與合規需求總覽
- **[專案檔案命名與歸檔規則](./docs/本專案檔案命名規則與新增文件歸檔總則.md)** - 文檔與原始資料的一致命名與歸檔規範

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Setup environment
cp .env.example .env

# Run development server
pnpm dev
```

## 📁 Project Structure

```text
├── backend/          # Backend API services
├── frontend/         # Frontend application
├── supabase/         # Database & migrations
├── docs/             # Project documentation
└── scripts/          # Automation scripts
```

For detailed structure, see [Project Structure Documentation](./docs/architecture/project-structure-documentation_2026-05-20.md).

## 🛠️ Tech Stack

- **Frontend**: React, Next.js, Expo
- **Backend**: Node.js, Express
- **Database**: Supabase (PostgreSQL)
- **Deployment**: Vercel

## 📝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting pull requests.

## 📄 License

[MIT License](./LICENSE)

## 版本修訂記錄

- **2026-01-17**：更新為以房東出租／出售管理為核心的產品說明，修正文檔連結並補充專案文件索引。
