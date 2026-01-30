# 房東物件管理語音 AI 平台

> A landlord-focused Property Management AI platform built with modern web technologies.
> This platform is designed exclusively to help property owners manage rental and sale workflows more efficiently.

## 📚 Documentation

- **[產品概述](./docs/產品概述及使用場景說明/產品概述.md)** - 房東物件管理語音 AI 產品定位與價值主張
- **[Mobile App 使用者場景](./docs/產品概述及使用場景說明/Mobile%20App%20-%20使用者場景.md)** - 房東在出租與出售流程中的實際使用情境
- **[房東－房屋資料準備手冊](./docs/產品概述及使用場景說明/房東－房屋資料準備手冊.md)** - 出租／出售前應備妥的權利文件與物件資料
- **[房客－預約看房須知](./docs/產品概述及使用場景說明/房客－預約看房須知.md)** - 提供給潛在房客的預約看房指引與權益說明
- **[專案檔案命名與歸檔規則](./docs/本專案檔案命名規則與新增文件歸檔總則.md)** - 文檔與原始資料的一致命名與歸檔規範
- **[AI 開發規範](./CLAUDE.md)** - AI 協作者必須遵守的開發規則與標準

## 🚀 Quick Start

```bash
# 1. 啟動 Docker Desktop
open -a Docker

# 2. 啟動 Supabase 本地服務
supabase start

# 3. 安裝所有依賴 (Monorepo)
npm install

# 4. 啟動開發服務器
turbo dev                     # 同時啟動 Web & Mobile
turbo dev --filter=web        # 僅啟動 Web (Port 3000)
turbo dev --filter=mobile     # 僅啟動 Mobile (Port 8081)

# 5. 在瀏覽器訪問
# Web:    http://localhost:3000
# Mobile: http://localhost:8081
```

## ✅ 測試狀態（最後測試：2026-01-30）

| 服務            | 狀態   | URL                                                     |
| --------------- | ------ | ------------------------------------------------------- |
| Web 應用        | ✅ 正常 | http://localhost:3000                                   |
| Mobile 應用     | ✅ 正常 | http://localhost:8081                                   |
| Supabase API    | ✅ 正常 | http://127.0.0.1:54321                                  |
| Supabase Studio | ✅ 正常 | http://127.0.0.1:54323                                  |
| PostgreSQL      | ✅ 正常 | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

### 資料庫結構

- ✅ `Property_Sales` - 出售物件
- ✅ `Property_Rentals` - 出租物件
- ✅ `Property_Photos` - 物件照片
- ✅ `users_profile` - 使用者資料
- ✅ `building_title_records` - 建物權狀記錄
- ✅ `land_title_records` - 土地權狀記錄

## 📁 Project Structure (Monorepo)

```text
root/
├── apps/                     # 應用程式
│   ├── web/                  # 🌐 Next.js 官網 (Port 3000)
│   └── mobile/               # 📱 Expo 管理 App (Port 8081)
│
├── packages/                 # 共用套件
│   ├── ui/                   # 共用 UI 組件
│   ├── utils/                # 共用工具函數
│   └── types/                # 共用 TypeScript 型別
│
├── backend/                  # 🔧 後端服務
│   └── ocr_service/          # Python OCR 微服務
│
├── supabase/                 # 🗄️ 資料庫
│   ├── migrations/           # SQL 遷移檔
│   └── config.toml
│
├── docs/                     # 📚 專案文檔中心
│   ├── roadmap/              # 專案規劃
│   ├── progress-reports/     # 進度報告
│   └── 產品概述及使用場景說明/  # 產品文檔
│
└── scripts/                  # 🔨 自動化腳本
```

## 🛠️ Tech Stack

| 類別 | 技術 |
| --- | --- |
| **Frontend - Web** | Next.js 15 (Webpack), React 19, TypeScript, Tailwind CSS |
| **Frontend - Mobile** | Expo 54, React Native, Metro Bundler |
| **Backend** | Supabase (PostgreSQL), Python OCR Service |
| **Monorepo** | Turborepo |
| **Build Tool** | Webpack (Web), Metro (Mobile) |
| **Deployment** | Vercel |

> **注意**: Web 端使用穩定的 Webpack 打包工具（2026-01-31 由 Turbopack 切換），以確保開發環境穩定性。

## 📝 版本修訂記錄

| 日期 | 修改者 | 修改內容 |
|------|--------|----------|
| 2026-01-31 | Claude Sonnet 4.5 | 🔧 **技術選型變更**: 將 Web 端打包工具從 Turbopack 切換至 Webpack，解決快取資料庫損壞導致的穩定性問題 |
| 2026-01-30 | Claude Sonnet 4.5 | 更新為 Monorepo 結構，修正無效連結，更新 Quick Start 指令，完成首頁設計系統對齊 |
| 2026-01-22 | Project Team | 完成開發環境前後端連線測試，確認所有服務正常運行 |
| 2026-01-17 | Project Team | 更新為以房東出租／出售管理為核心的產品說明 |
