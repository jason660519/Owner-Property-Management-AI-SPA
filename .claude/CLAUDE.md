此檔案包含專案架構、開發流程與常用指令的詳細說明

## 專案架構

### 技術棧

| 層級     | 技術              | 版本  |
| :------- | :---------------- | :---- |
| 前端框架 | React             | 19    |
| 行動端   | Expo              | 54    |
| 語言     | TypeScript        | 5.x   |
| 後端服務 | Supabase          | local |
| 資料庫   | PostgreSQL        | 17    |
| 即時同步 | Supabase Realtime | -     |
| 檔案儲存 | Supabase Storage  | -     |

### 目錄結構

```
root/
├── frontend/           # React/Expo 前端應用
│   ├── src/
│   │   ├── components/ # UI 組件
│   │   ├── hooks/      # 自訂 Hooks
│   │   ├── lib/        # 工具函數（含 supabase.ts）
│   │   └── pages/      # 路由頁面
│   └── assets/         # 靜態資源
├── backend/            # 後端服務（如有）
├── supabase/           # Supabase 配置
│   ├── migrations/     # 資料庫遷移檔
│   └── config.toml     # Supabase 設定
├── docs/               # 專案文檔
└── resources/          # 範本與範例資料
```

### 開發階段

- **目前階段**：Phase 1 MVP
- **功能範圍**：物件管理、用戶認證、看房預約
- **參考文件**：@docs/專案架構說明/軟體功能分階段開發計劃.md

---

## 本地開發環境

### 服務端點

| 服務            | URL                    |
| :-------------- | :--------------------- |
| Supabase API    | http://localhost:54321 |
| Supabase Studio | http://localhost:54323 |
| Expo 開發伺服器 | http://localhost:8081  |

### 常用指令

```bash
# === Supabase ===
supabase start          # 啟動本地 Supabase
supabase stop           # 停止服務
supabase status         # 查看狀態
supabase db reset       # 重置資料庫（會清除所有資料）
supabase db diff        # 查看 schema 變更

# === 前端開發 ===
cd frontend
npm install             # 安裝依賴
npx expo start          # 啟動開發伺服器
npx expo start --clear  # 清除快取後啟動

# === Git ===
git status
git add .
git commit -m "feat: description"
git push origin main
```
### RLS 政策

所有表都必須啟用 Row Level Security，使用 `auth.uid()` 進行用戶隔離。

---


## 開發流程

### Git 分支策略

| 分支類型 | 命名格式      | 用途       |
| :------- | :------------ | :--------- |
| 功能分支 | `feature/xxx` | 新功能開發 |
| 修復分支 | `fix/xxx`     | Bug 修復   |
| 文檔分支 | `docs/xxx`    | 文檔更新   |

### Commit 訊息規範

```
feat: 新功能
fix: Bug 修復
docs: 文檔更新
refactor: 重構
style: 格式調整
test: 測試
chore: 雜項
```

### 提交前檢查

1. 執行 `npm run lint` 檢查程式碼風格
2. 確認 TypeScript 無編譯錯誤
3. 測試主要功能正常運作

---

## 注意事項

### 安全性

- 永遠不要將 `.env` 檔案提交到 Git
- API Key 必須透過環境變數注入
- 所有資料庫操作必須通過 RLS 政策

### 效能

- 圖片上傳前先壓縮
- 使用分頁查詢大量資料
- 善用 Supabase 的即時訂閱功能

### Context7 使用提醒

當遇到以下情況時，請使用 Context7 查詢最新文檔：

- 不確定 API 用法
- 需要最新的 best practices
- 遇到版本相關問題
