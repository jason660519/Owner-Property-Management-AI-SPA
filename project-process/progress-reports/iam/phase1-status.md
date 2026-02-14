# Access Matrix Design Status & Roadmap

> **Last Updated**: 2026-02-02  
> **Status**: Phase 1 Implementation Complete (Group-Based IAM)

## 1. 執行進度與狀態 (Current Status)

目前已完成 **Phase 1: 基礎架構建置**。我們成功從原本的「靜態矩陣文件」轉型為「動態 IAM 系統」。

### 1.1 已完成的設計階段
- [x] **需求分析**: 確立採用 AWS IAM 風格的 RBAC + Group 架構。
- [x] **Schema 設計**: 完成 PostgreSQL 資料表設計 (`iam_groups`, `roles`, `members`)。
- [x] **API 設計**: 完成基於 Supabase RPC 與 Server Actions 的權限查詢接口。
- [x] **UI 原型**: 完成 Next.js 版的 Admin Console (Users & Groups)。

### 1.2 設計決策與權衡 (Design Decisions & Trade-offs)
- **決策**: 引入「群組 (Group)」作為中介層。
  - *理由*: 避免直接管理數千名使用者的個別權限，提升維護性。
  - *權衡*: 增加了查詢複雜度 (需要 Join 多張表)，但透過 `get_user_roles` RPC 解決了效能疑慮。
- **決策**: 使用 CASL 作為前端權限庫。
  - *理由*: 支援同構 (Isomorphic) 定義，且語法語意清晰 (`can('read', 'Property')`)。
- **決策**: 在 `apps/web` (Next.js) 實作管理後台，而非 Expo。
  - *理由*: 複雜的表格與矩陣操作更適合桌面端 Web 環境。

### 1.3 符合的規範標準
- **NIST RBAC 標準**: 遵循 Level 1 (Flat RBAC) 與部分 Level 2 (Hierarchical RBAC, via Groups) 精神。
- **最小權限原則 (PoLP)**: 預設所有存取皆受 RLS (Row Level Security) 拒絕，僅透過明確授權開放。
- **單一真理來源 (SSOT)**: 權限定義收斂至資料庫 `iam_roles` 表，而非散落在 Code 中。

---

## 2. 接下來的設計計劃 (Design Roadmap)

### 2.1 預計完成的里程碑 (Milestones)

| 階段        | 任務名稱                                                                                                                                | 預計完成日 | 優先級 |
| :---------- | :-------------------------------------------------------------------------------------------------------------------------------------- | :--------- | :----- |
| **Phase 2** | **權限顆粒度深化 (Fine-grained Permissions)** <br> - 定義每個 Role 對應的具體 RLS Policy <br> - 實作前端 CASL 規則與後端 RLS 的同步機制 | 2026-02-15 | High   |
| **Phase 3** | **稽核與歷程 (Audit Logs)** <br> - 記錄「誰在何時把誰加入了哪個群組」 <br> - 權限變更的完整 Log                                         | 2026-02-28 | Medium |
| **Phase 4** | **動態矩陣視圖 (Dynamic Matrix View)** <br> - 在 Admin Console 繪製即時的 Permission Matrix <br> - 可視化檢查目前系統的安全覆蓋率       | 2026-03-10 | Low    |

### 2.2 待解決技術問題
- **CASL 與 RLS 的同步**: 目前前端的 `ability.ts` 規則是手寫的，尚未與資料庫的 RLS Policy 自動對齊。需設計一套機制確保兩者邏輯一致。
- **效能優化**: 當使用者數量達到萬級時，目前的 `get_user_roles` 視圖效能需重新評估。

### 2.3 資源與支援需求
- 需要 Security Engineer 協助審核目前的 IAM Schema 安全性。
- 需要 UI 設計師優化 Admin Console 的 UX，特別是手機版網頁的適配。

---

## 3. 變更紀錄 (Changelog)

- **2026-02-02**: 初始化文件。確認 Phase 1 完成，系統轉向 Group-Based IAM 架構。 (By AI Assistant)
