# 統一設計規範與開發標準指南 (Unified Design Standard)

> **生效日期**: 2026-02-01
> **適用範圍**: 公司首頁 (Next.js) 與 Web App (Expo)
> **目的**: 解決現有設計風格混亂問題，提供統一的開發依據。
> **關聯文件**: 具體樣式數據（顏色、字體、間距）請查閱 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)。

## 1. 核心設計原則 (Core Principles)

為確保產品一致性，所有開發者必須遵循以下原則：

1.  **不死刻代碼 (No Dead Copying)**：參考範例資料夾中的架構與視覺流程，但必須使用專案現有的技術棧（Tailwind CSS, React Pattern）重新實作。
2.  **統一設計語言 (Design Tokens)**：所有顏色、字體、間距必須遵循 `DESIGN_SYSTEM.md` 中的定義，嚴禁使用 Magic Number (如 `margin: 17px`)。
3.  **響應式優先 (Mobile First)**：所有頁面必須優先考慮移動端展示，再適配 Desktop。
4.  **明暗模式支援 (Dark/Light Mode)**：系統架構必須預留或實作明暗模式切換機制。

---

## 2. 專案參考架構 (Reference Architecture)

### 2.1 公司首頁 (Marketing Site)
- **技術棧**: Next.js 15 (App Router) + Tailwind CSS
- **參考資源**: `docs/design-guidelines/references/layout-homepage/`
- **實作指南**:
    - **視覺參考**: 請打開該資料夾中的 PNG 圖片 (`home-page-desktop.png`, `home-page-mobile.png`) 作為排版依據。
    - **排版重點**:
        - 採用 **Section-based** 的佈局方式。
        - **Hero Section**: 大標題 + 強調色按鈕 + 視覺圖。
        - **Feature Grid**: 卡片式佈局，並在 Mobile 上轉為單欄堆疊。
        - **導航欄**: Desktop 為橫向展開，Mobile 需轉為漢堡選單 (Hamburger Menu)。
    - **開發路徑**: `apps/web/app/`

### 2.2 Web Web App (Dashboard)
- **技術棧**: Expo (React Native for Web) + NativeWind/Gluestack
- **參考資源**: `docs/design-guidelines/references/layout-dashboard/`
- **實作指南**:
    - **架構參考**: 參考 `dashboard.html` (或截圖) 的 **Sidebar + Topbar + Main Content** 佈局。
    - **在地化適配 (Localization)**：
        - **參考**: Turbotenant 的 Dashboard 是為了美國市場設計，我們必須修改。
        - **修改點**:
            - **地址格式**: 改為台灣縣市區街道填寫邏輯。
            - **幣別**: 強制使用 TWD (新台幣)，金額顯示格式如 `$12,000`。
            - **面積單位**: 除了制式的平方公尺，還要能換算台灣（坪），英尺 (Sqft)...等**。


---

## 3. 開發流程規範 (Development Process)

為避免「各做各的」情況發生，請遵循以下步驟：

1.  **查閱 Token**: 在寫任何 CSS 之前，先確認 `apps/web/tailwind.config.ts` 或 `DESIGN_SYSTEM.md` 是否已有對應顏色變數。
2.  **組件化 (Componentization)**:
    - 如果一個 UI 元素 (如 Button, Card) 在多個頁面出現，**必須** 提取到 `packages/ui` 或專案的 `components/` 目錄。
    - 命名規則：`FeatureName` + `ComponentType` (例如 `PropertyCard`, `NavHeader`)。
3.  **RWD 檢查清單**:
    - [ ] Mobile (390px): 內容不溢出，字體可讀。
    - [ ] Tablet (768px): Grid 從 1 欄變 2 欄。
    - [ ] Desktop (1440px): 內容置中，最大寬度限制 (Container)。

## 4. 目錄結構 (Directory Structure)

本設計指南相關文檔已整理如下：

```
docs/design-guidelines/
├── DESIGN_SYSTEM.md           # 核心樣式定義 (Single Source of Truth)
├── UNIFIED_DESIGN_STANDARD.md # 本開發規範
├── references/                # 參考資料
│   ├── layout-homepage/       # 原 NextJS Desktop Pad Mobile Page Example
│   ├── layout-dashboard/      # 原 Turbotenant WebApp Dashboard Example
│   └── templates/             # 原 Lahomes
```

---

**備註**: `Turbotenant` 與 `Lahomes` 範例中包含大量的程式碼檔案 (HTML/JS)，僅作為**邏輯參考**，**嚴禁**直接複製貼上到專案中，以免引入不必要的依賴或垃圾代碼。
