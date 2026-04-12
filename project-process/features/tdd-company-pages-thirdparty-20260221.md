# TDD 規格報告：公司頁面與第三方服務功能群組 — 2026/02/21

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`tdd-company-pages-thirdparty-20260221.html`
> **最後更新**：2026-04-12（Row 019 公司產品教學測試實作）

---

# TDD 規格報告：公司頁面與第三方服務功能群組

**功能總數**: 5 項
**已完成**: 4 項
**進度範圍**: 0–100%
**建立日期**: 2026/02/21

---

## 一、公司頁面功能測試清單

| # | 功能 | 進度 | 測試描述 | 類型 | 狀態 |
| --- | --- | --- | --- | --- | --- |
| T-01 | 公司首頁 | 80% | Lighthouse LCP < 2.5 秒；Hero 標題與 CTA 導流連結顯示 | 單元 + E2E | 部分完成 |
| T-02 | 關於我們頁面 | 100% | 多角色平台定位標題、四大原則、協作流程顯示；導流連結正確 | 單元 | 完成 |
| T-03 | 平台能力（服務）頁面 | 100% | 委託型態比較表、角色功能卡顯示；預約諮詢連結正確 | 單元 | 完成 |
| T-04 | 收費方式（定價）頁面 | 100% | 多方案顯示；幣別/計費週期切換；CTA 連結正確 | 單元 | 完成 |
| T-05 | **公司產品教學** | **60%** | 詳見下方 Row 019 測試清單 | 單元 + E2E | **實作中** |

---

## 二、Row 019 — 公司產品教學 (TDD Progress)

**更新日期**: 2026-04-12
**實作者**: Architect Agent
**ADR**: `/docs/technical-selection/adr-019-company-product-tutorial.md`

### 2.1 測試清單

| # | 測試描述 | 類型 | 檔案路徑 | 狀態 |
| --- | --- | --- | --- | --- |
| U-01 | 教學角色選擇頁渲染「產品教學」H1 | 單元 | `apps/web/app/tutorial/__tests__/page.test.tsx` | ✅ 已實作 |
| U-02 | 角色選擇頁顯示三個角色卡片（房東/租客/買家） | 單元 | 同上 | ✅ 已實作 |
| U-03 | 角色卡片連結指向正確路由 `/tutorial/{role}` | 單元 | 同上 | ✅ 已實作 |
| U-04 | 角色選擇頁顯示各角色步驟數量 | 單元 | 同上 | ✅ 已實作 |
| U-05 | 角色教學頁顯示正確標題（房東版） | 單元 | `apps/web/app/tutorial/[role]/__tests__/page.test.tsx` | ✅ 已實作 |
| U-06 | 進度條初始顯示 0%（progressbar） | 單元 | 同上 | ✅ 已實作 |
| U-07 | 點擊標記完成呼叫 markStepComplete | 單元 | 同上 | ✅ 已實作 |
| U-08 | 已完成步驟隱藏完成按鈕 | 單元 | 同上 | ✅ 已實作 |
| U-09 | 全部完成顯示完成徽章（role="status"） | 單元 | 同上 | ✅ 已實作 |
| U-10 | 租客版顯示 3 個步驟 | 單元 | 同上 | ✅ 已實作 |
| U-11 | 無效角色呼叫 notFound() | 單元 | 同上 | ✅ 已實作 |
| D-01 | TUTORIAL_DATA 三角色資料完整性（唯一 id、必填欄位） | 資料 | `apps/superadmin/unit_and_integration_test/019/tutorial-data.test.ts` | ✅ 已實作 |
| D-02 | getTotalSteps 各角色回傳正確步驟數 | 資料 | 同上 | ✅ 已實作 |
| D-03 | video 步驟 videoDurationSec ≤ 120 秒 | 資料 | 同上 | ✅ 已實作 |
| E-01 | 角色選擇頁顯示三個角色卡片（E2E） | E2E | `apps/superadmin/e2e/019/company-tutorial.spec.ts` | ✅ 已實作 |
| E-02 | 房東版教學頁初始進度 0% | E2E | 同上 | ✅ 已實作 |
| E-03 | 點擊完成後進度更新為 25% | E2E | 同上 | ✅ 已實作 |
| E-04 | 完成所有步驟後顯示完成徽章 | E2E | 同上 | ✅ 已實作 |
| E-05 | 無效角色路由回傳 404 | E2E | 同上 | ✅ 已實作 |

### 2.2 尚未實作（待 Phase 2）

| # | 測試描述 | 原因 |
| --- | --- | --- |
| P-01 | 截圖資產存在且可載入 | 截圖尚未製作，`public/tutorial/screenshots/` 為空 |
| P-02 | localStorage 進度跨頁面保存（E2E reload） | 需要 E2E 環境連線 localhost:3000 |
| P-03 | 登入用戶進度同步至 Supabase | 階段二 DB 功能，pending |
| P-04 | Lighthouse LCP < 2.5 秒（tutorial 頁） | 需部署後測量 |

---

## 三、架構與技術決策摘要

> 完整內容見 `/docs/technical-selection/adr-019-company-product-tutorial.md`

| 決策 | 選定方案 | 理由 |
| --- | --- | --- |
| 路由設計 | `/tutorial` (Server) + `/tutorial/[role]` (Client) | SSG + CSR 分界最優 LCP 與互動性 |
| 進度儲存 | localStorage（階段一） | 零摩擦、無需登入；後續可升級至 Supabase |
| 教學內容 | 靜態 TypeScript Module | 更新頻率低，類型安全，版控完整 |
| 媒體資源 | 靜態截圖 + Next.js Image | 低成本，自動 WebP/srcset 優化 |

---

## 四、第三方 API 整合測試策略（原規格）

第三方 API 整合：先以 MSW（Mock Service Worker）模擬 API 回應進行快速單元測試，再於 Staging 環境連真實沙盒 API 執行整合測試。
