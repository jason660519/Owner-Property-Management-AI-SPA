# 房東物件管理 SaaS 專案開發 Roadmap

> **創建日期**: 2026-01-30  
> **創建者**: Project Team  
> **最後修改**: 2026-01-30  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 專案規劃

---


> **生成日期**: 2026-01-30
> **專案啟動日**: 2026-02-03 (預定) / 2026-01-16 (實際啟動)
> **總需求數**: 84 (持續調整中)
> **總 Sprint 數**: 50
> **預估完成日**: 2028-02-22
> **專案週期**: 100 週
> **當前狀態**: **架構重組與 Sprint 1 準備期**

---

## 📊 專案概覽 (更新版)

### 開發階段規劃 (依據最新三軌並行架構調整)

### Phase 1: MVP 核心功能
- **時間**: Sprint 1 - 8
- **週期**: 16 週
- **關鍵調整**: 
    - 導入 **Turborepo Monorepo** 架構。
    - **Web (Next.js)** 與 **App (Expo)** 雙軌並行開發。
    - **OCR 服務** 提前至 Sprint 1-2 整合。
- **目標**: 完成基礎認證、Web 官網、App 儀表板與核心物件管理功能。

### Phase 2: 進階功能開發
- **時間**: Sprint 9 - 16
- **週期**: 16 週
- **目標**: 完成合約管理、財務報表與客戶管理功能。

### Phase 3: 加值服務與優化
- **時間**: Sprint 17 - 50
- **週期**: 68 週
- **目標**: 完成加值服務、AI 功能與系統優化。

---

## 📅 近期 Sprint 狀態追蹤

| Sprint | 日期 | 狀態 | 重點任務 | 完成度 |
|:-------|:-----|:-----|:---------|:-------|
| **Pre-Sprint** | 01/16-02/02 | 🔄 進行中 | 架構重組 (Monorepo), OCR 核心, 基礎 UI | 80% |
| **Sprint 1** | 02/03-02/17 | ⏳ 準備中 | 認證系統 (Web/App), 首頁, 儀表板 | 0% |
| **Sprint 2** | 02/18-03/04 | ⏳ 規劃中 | 權限管理 (RBAC), 資訊安全, 物件上傳 | 0% |

---

## 📝 詳細 Sprint 計畫調整 (Sprint 1)

### Sprint 1: 2026-02-03 - 2026-02-17 (修正版)

**Sprint 目標**: 完成雙端 (Web/App) 基礎建設與認證流程，共 40 Story Points。

#### 📋 需求清單 (修正後)

| ID | 功能名稱 | 平台 | Story Points | 狀態 |
|:---|:---------|:-----|:------------|:-----|
| HOME_001 | 公司首頁 (Landing Page) | **Web** | 3 | ⏳ 待開發 |
| AUTH_001 | 統一認證服務 (Supabase Auth) | **Backend** | 5 | ✅ 已完成 |
| WEB_AUTH | Web 端註冊/登入頁面 | **Web** | 5 | ⏳ 待開發 |
| APP_AUTH | App 端註冊/登入頁面 | **App** | 5 | ⏳ 待開發 |
| RENTER_DASH | 房客儀表板 | **Web/App** | 5 | ⏳ 待開發 |
| LANDLORD_DASH | 房東儀表板 (提前移入) | **App** | 5 | 🔄 進行中 |
| OCR_CORE | OCR 核心解析服務 (提前移入) | **Backend** | 8 | ✅ 已完成 |
| NFR_SCALABILITY | 可擴展性 (Monorepo 架構) | **Infra** | 4 | ✅ 已完成 |

#### 🎯 Sprint 1 交付目標變更說明

1.  **認證系統**: 不再區分多個管理員頁面需求，改為統一的 **Supabase Auth** 整合任務，分別在 Web 與 App 實作 UI。
2.  **架構先行**: 提前完成了 **Monorepo** 架構 (NFR_SCALABILITY)，為後續開發清除障礙。
3.  **OCR 提前**: OCR 核心邏輯已完成，將在 Sprint 1 進行 API 整合。

#### 📅 建議時間分配 (修正後)

- **Week 1 (02/03-02/09)**: Web 端衝刺
  - Day 1-2: Web Landing Page & Auth UI
  - Day 3-5: Web 房客儀表板
- **Week 2 (02/10-02/17)**: App 端衝刺 & 整合
  - Day 1-2: App Auth UI & 房東儀表板
  - Day 3-4: 前後端 API 串接 (OCR/Auth)
  - Day 5: Sprint Review

---

## ⚠️ 風險評估 (更新)

### 高風險項目
- **Web 端人力**: `apps/web` 為全新專案，需在 Sprint 1 內完成首頁與認證，時間緊迫。
- **雙端 UI 一致性**: 需確保 Web 與 App 的 Design System (UI Kit) 同步，避免重複工。

### 緩解措施
- 利用 **Turborepo** 的 `packages/ui` 共用元件庫，減少重複開發。
- 優先使用 **Supabase Auth UI** 或現成元件加速認證頁面開發。

---

## 🎯 下一步行動

1.  **Sprint 1 啟動會議 (Kick-off)**: 確認 Web 與 App 的分工細節。
2.  **UI Kit 建立**: 在 `packages/ui` 建立基礎元件 (Button, Input, Layout)。
3.  **Web 首頁開發**: 立即啟動 `apps/web` 的 Landing Page 實作。
