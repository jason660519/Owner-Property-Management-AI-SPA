# Owner Property Management AI Web App

> 🏠 AI 驅動的房東物業管理平台 — 讓物業管理更簡單、更智慧

---

## 🎯 專案狀態

**當前開發重點**: Next.js Web App + PWA

### Phase 1: Web App MVP (進行中) ✅

- ✅ Next.js 15 Web 應用
- ✅ 響應式設計 (手機友好)
- ✅ PWA 支援 (可安裝到手機桌面)
- ✅ 完整的房東管理功能

### Phase 2: Mobile App (暫停) ⏸️

- ⏸️ Expo/React Native 開發已暫停
- 📁 代碼保留在 [`apps/mobile/`](./apps/mobile/) (以備未來使用)
- 📊 待 Web App 上線後，根據用戶需求決定是否開發

---

## 🚀 快速開始

> 📖 **測試帳號**: 請參閱 [測試帳號參考文檔](./docs/operational-guides/deployment-guides/TEST_ACCOUNTS_REFERENCE.md)
> 🔑 **本地測試密碼**: 所有測試帳號統一使用 `!qaz2wsX`

### 開發環境

**Step 1：開啟 Docker Desktop**（Supabase 本地服務需要 Docker）

**Step 2：執行啟動腳本**

```bash
./start.sh        # 互動式選單（推薦）
./start.sh all    # 一鍵啟動全部服務
```

背景模式啟動時，服務輸出會寫入專案內的 `logs/dev/`：

- `logs/dev/nextjs.log`：Web App (3000)
- `logs/dev/nextjs-au.log`：Web App AU (3002)
- `logs/dev/superadmin.log`：Superadmin (3001)
- `logs/dev/ocr_service.log`：OCR Service (8819)

用途：

- 背景啟動後查錯用，避免關掉終端就看不到輸出
- 快速確認服務是否真的啟動完成（例如 `Ready`、`Uvicorn running`）
- 配合 `./stop.sh` 一起清理本輪開發日誌

啟動後訪問：
- 主站 (房東/租客/買家)：http://localhost:3000
- Superadmin 後台：http://localhost:3001/superadmin/dashboard
- 開發進度儀表板：http://localhost:3001/superadmin/dashboard/project-progress

### 查看本機 IP (供手機訪問)

```bash
# macOS/Linux
ifconfig | grep "inet "

# 或使用
ipconfig getifaddr en0
```

---

## 📱 手機使用方式

### 方式 1: 瀏覽器訪問 (推薦)

1. 手機連接同一 WiFi
2. 打開瀏覽器 (Safari/Chrome)
3. 訪問: `http://[你的電腦IP]:3000`
4. 完整功能，包括相機上傳

### 方式 2: PWA 安裝 (像 App 一樣)

#### iOS (Safari)

1. 訪問網站
2. 點擊「分享」按鈕 (底部中間)
3. 選擇「加入主畫面」
4. 桌面出現圖標，點擊使用

#### Android (Chrome)

1. 訪問網站
2. 點擊「選單」(右上角三點)
3. 選擇「安裝應用程式」
4. 桌面出現圖標，點擊使用

---

## 🏗️ 專案結構

```text
Owner-Property-Management-AI-SPA/
├── apps/
│   ├── web/                 # Next.js Web App (主要開發)
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # React 組件
│   │   ├── lib/            # 工具函數
│   │   └── public/         # 靜態資源
│   │
│   └── mobile/             # Expo App (已暫停開發)
│       └── (保留代碼，不刪除)
│
├── backend/                # Python OCR 服務
├── supabase/              # 資料庫遷移與配置
├── packages/              # 共用套件 (未來使用)
└── docs/                  # 專案文檔
```

---

## 🛠️ 技術棧

### 前端 (Web App)

- **框架**: Next.js 15.1.6
- **UI**: React 19
- **語言**: TypeScript 5.x
- **樣式**: Tailwind CSS 3.x
- **狀態管理**: React Context + Hooks
- **動畫**: Framer Motion

### 後端

- **BaaS**: Supabase (PostgreSQL)
- **認證**: Supabase Auth
- **儲存**: Supabase Storage
- **API**: REST + GraphQL

### 微服務

- **OCR**: Python 3.11 + Tesseract + FastAPI

---

## 📋 核心功能

### P0 功能 (必需 - 優先開發)

- [X] 🔐 用戶認證 (登入/註冊)
- [ ] 🏠 物件管理 (CRUD)
- [ ] 👥 租客管理
- [ ] 📄 合約管理
- [ ] 💰 租金管理

### P1 功能 (重要)

- [ ] 📊 財務報表
- [X] 📁 文件管理
- [ ] 🔍 搜尋與篩選
- [ ] 📸 相機上傳 (手機)

### P2 功能 (加分)

- [ ] 🔔 通知系統
- [ ] 🤖 OCR 自動識別
- [ ] 📈 數據分析
- [ ] 📱 PWA 離線支援

---

## 🎯 開發路線圖

### Month 1-2: 核心功能

- Week 1-2: 物件管理完善
- Week 3-4: 租客管理開發
- Week 5-6: 合約管理
- Week 7-8: 租金管理

### Month 3: 進階功能

- Week 9-10: 財務報表
- Week 11-12: 文件管理優化

### Month 4: 測試與上線

- Week 13-14: 內部測試 (10+ 用戶)
- Week 15-16: MVP 上線

---

## 📱 PWA 功能

### 已支援

- ✅ 安裝到桌面
- ✅ 全螢幕模式 (無瀏覽器 UI)
- ✅ 離線基本功能
- ✅ 推送通知 (計劃中)

### 手機原生功能

- ✅ 相機拍照
- ✅ 相簿選擇
- ✅ 文件上傳
- ✅ 地理位置
- ✅ 本地存儲

---

## 🔧 開發指令

### Web App

```bash
cd apps/web

# 開發模式
npm run dev

# 建置生產版本
npm run build

# 啟動生產服務器
npm start

# 代碼檢查
npm run lint

# 測試
npm test
```

### 資料庫

```bash
# 啟動 Supabase 本地服務
npx supabase start

# 停止服務
npx supabase stop

# 重置資料庫
npx supabase db reset

# 生成 TypeScript 類型
npx supabase gen types typescript --local > apps/web/lib/database.types.ts
```

---

## 📚 文檔

### 技術文檔

- [tech-stack-overview](./docs/硬體與軟體技術選型說明/tech-stack-overview.md)
- [專案簡化計劃](./docs/implementation-plans/專案簡化計劃_專注Next.js_Web_App.md)
- [行動清單](./docs/implementation-plans/專注Web_App_行動清單.md)

### 開發指南

- [開發環境快速啟動](./docs/operational-guides/deployment-guides/quick-start-guide.md)
- [測試帳號參考](./docs/operational-guides/deployment-guides/TEST_ACCOUNTS_REFERENCE.md) 🔐
- [檔案命名規則](./docs/本專案檔案命名規則與新增文件歸檔總則.md)

---

## 🤝 貢獻指南

### 分支策略

- `main`: 生產環境
- `develop`: 開發環境
- `feature/*`: 功能分支

### 提交規範

```text
feat: 新功能
fix: Bug 修復
docs: 文檔更新
style: 代碼格式
refactor: 重構
test: 測試
chore: 雜項
```

---

## 📊 開發進度

### 完成度

- 認證系統: ✅ 100%
- 物件管理: 🔄 60%
- 租客管理: ⏳ 0%
- 合約管理: ⏳ 0%
- 租金管理: ⏳ 0%

### 測試覆蓋率

- 目標: 80%
- 當前: 待建立

---

## 🔗 相關連結與服務

### 本地開發服務

| 服務名稱 | 位址 | 用途 | 狀態 |
|---------|------|------|------|
| **Web App** | http://localhost:3000 | Next.js 主應用 (房東/租客/買家) | Port 3000 預留 |
| **Superadmin 後台** | http://localhost:3001 | 超級管理員儀表板 (`npm run dev:superadmin`) | 按需啟動 |
| **開發進度追蹤** | http://localhost:3001/superadmin/dashboard/project-progress | Sprint 進度儀表板 (`npm run dev:superadmin`) | 按需啟動 |
| **VLM OCR 服務** | http://localhost:8819 | 離線謄本查詢系統 | ✅ 運行中 |
| **Supabase API** | http://localhost:54321 | 本地資料庫 API | ✅ 運行中 |
| **Supabase Studio** | http://localhost:54323 | 資料庫管理介面 | ✅ 運行中 |
| **Mailpit** | http://localhost:54324 | 郵件測試服務 | ✅ 運行中 |
| **E2E 測試報告** | http://localhost:9323 | Playwright 報告 | 按需啟動 |

### 快速啟動指令

```bash
# 開啟互動式啟動選單 (推薦)
./start.sh

# 一鍵啟動所有服務 (Web, Admin, OCR, Tracker)
./start.sh all

# 停止所有服務
./stop.sh

# 啟動 Web App
cd apps/web && npm run dev
```

### 外部連結

- [Supabase Dashboard](https://app.supabase.com)
- [Vercel Dashboard](https://vercel.com)
- [專案文檔](./docs/)
- [系統狀態報告](./project-process/progress-reports/SYSTEM_STATUS_REPORT_2026-02-05.md)

---

## 📞 支援

如有問題，請查看：

1. [專案文檔](./docs/)
2. [Issue Tracker](../../issues)
3. 聯繫開發團隊

---

## 📄 授權

Private - All Rights Reserved

---

## ❓ 本地開發常見問題 (Troubleshooting)

### 伺服器當機排除步驟

若遇到 `http://localhost:3000/` 無法訪問或伺服器當機，請嘗試以下步驟：

1. **檢查埠號佔用**:
   ```bash
   lsof -i :3000
   kill -9 <PID>
   ```

2. **重新安裝依賴**:
   ```bash
   cd apps/web
   rm -rf node_modules
   npm install
   ```

3. **檢查編譯錯誤**:
   查看終端機輸出，確認是否有 `Module not found` 或其他 TS 錯誤。常見問題包括相對路徑錯誤（建議使用 `@/` alias）。

4. **啟動偵錯模式**:
   使用以下指令啟動並觀察錯誤日誌：
   ```bash
   NODE_OPTIONS='--inspect' npm run dev
   ```

5. **日誌位置**:
   嚴重崩潰錯誤會記錄於 `logs/crash-*.log`。

---

**最後更新**: 2026-02-19
**版本**: 2.2
