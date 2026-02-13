# 統一設計規範與開發標準指南 (Unified Design Standard)

> **生效日期**: 2026-02-01
> **最後修改**: 2026-02-13 | **修改者**: Claude Opus 4.6 | **版本**: 1.2
> **適用範圍**: Web App (Next.js) 與 Superadmin 後台 (Next.js)
> **目的**: 解決現有設計風格混亂問題，提供統一的開發依據。
> **關聯文件**: 具體樣式數據（顏色、字體、間距）請查閱 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)。

## 1. 核心設計原則 (Core Principles)

為確保產品一致性，所有開發者必須遵循以下原則：

1.  **不死刻代碼 (No Dead Copying)**：參考範例資料夾中的架構與視覺流程，但必須使用專案現有的技術棧（Tailwind CSS, React Pattern）重新實作。
2.  **統一設計語言 (Design Tokens)**：所有顏色、字體、間距必須遵循 `DESIGN_SYSTEM.md` 中的定義，嚴禁使用 Magic Number (如 `margin: 17px`)。
3.  **響應式優先 (Mobile First)**：所有頁面必須優先考慮移動端展示，再適配 Desktop。
4.  **明暗模式支援 (Dark/Light Mode)**：所有應用必須使用統一的主題切換機制（見下方 §1.1）。

### 1.1 主題切換統一規範

所有 Next.js 應用 (Web / Superadmin) **必須遵循以下一致性要求**：

| 項目 | 規範 |
|:-----|:-----|
| **Theme Provider** | `next-themes` v0.4+，`attribute="class"`，`defaultTheme="system"`，`enableSystem` |
| **CSS 結構** | 所有主題變數定義在 `globals.css` 的 `@layer base` 區塊內 |
| **基礎色彩** | 兩個應用共用相同的 primitive 色彩變數（grey-08~900, purple-60 等） |
| **語意化 Token** | 每個主題覆寫完全相同的語意變數集（text-primary/secondary/muted, bg-primary/secondary/tertiary, border-default/light, accent/accent-hover/accent-subtle） |
| **Hydration** | `<html>` 標籤必須加上 `suppressHydrationWarning` |
| **Tailwind 映射** | `tailwind.config.ts` 中 `bg`/`text`/`border`/`accent` 映射到 CSS 變數 |

**可用主題**：

| 主題 | CSS Class | 適用範圍 |
|:-----|:----------|:---------|
| Light | `:root` (預設) | Web + Superadmin |
| Dark | `.dark` | Web + Superadmin |
| Midnight | `.midnight` | Web + Superadmin |
| Ultra-Dark | `.ultra-dark` | 僅 Superadmin |

> 完整色彩對照表請見 [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) 的「語意化色彩變數 — 主題切換系統」章節。

### 1.2 組件主題化開發指南

**禁止事項**：
- 禁止使用硬編碼 hex 值（如 `bg-[#1A1A1A]`、`dark:bg-[#2A2A2A]`）
- 禁止使用 Tailwind 預設 gray 色階搭配 `dark:` 前綴（如 `text-gray-500 dark:text-gray-400`）
- 禁止在組件中混用 `dark:` 前綴和 CSS 變數系統

**正確做法**：
```tsx
// 使用語意化 Tailwind token（自動跟隨主題切換）
<div className="bg-bg-primary text-text-primary border-border-default">
  <p className="text-text-secondary">Secondary text</p>
  <span className="text-text-muted">Muted text</span>
</div>

// 使用 accent 色系
<button className="bg-accent hover:bg-accent-hover text-white">
  CTA Button
</button>
```

**可用的語意化 Tailwind class**：

| 類別 | 可用值 | 說明 |
|:-----|:-------|:-----|
| `bg-bg-*` | `primary`, `secondary`, `tertiary` | 背景色（自動切換） |
| `text-text-*` | `primary`, `secondary`, `muted` | 文字色（自動切換） |
| `border-border-*` | `default`, `light` | 邊框色（自動切換） |
| `bg-accent` / `text-accent` | `DEFAULT`, `hover`, `subtle` | 強調色（自動切換） |

### 1.3 主題切換測試驗收標準

每次涉及 UI 變更的 PR 必須通過以下檢查：

- [ ] Light Mode 下所有文字清晰可讀（對比度 >= 4.5:1）
- [ ] Dark Mode 下所有文字清晰可讀（對比度 >= 4.5:1）
- [ ] 主題切換時無白色閃爍（FOUC）
- [ ] 頁面刷新後主題偏好保持不變
- [ ] 所有組件在 Light/Dark 兩種模式下視覺正確
- [ ] 無硬編碼 hex 顏色值（`grep -r "bg-\[#" components/` 應無結果）
- [ ] 無殘留的 `dark:` + Tailwind 預設色彩組合
- [ ] 響應式佈局在 Mobile/Tablet/Desktop 皆正常

### 1.4 主題管理技術架構

```
┌─────────────────────────────────────────────┐
│ next-themes (ThemeProvider)                  │
│   attribute="class"                         │
│   defaultTheme="system"                     │
│   storageKey="theme" (localStorage)         │
├─────────────────────────────────────────────┤
│ <html class="dark">                         │
│   └─ globals.css @layer base                │
│       ├─ :root { Light 色彩變數 }            │
│       ├─ .dark { Dark 色彩變數覆寫 }          │
│       └─ .midnight { Midnight 色彩變數覆寫 }  │
├─────────────────────────────────────────────┤
│ tailwind.config.ts                          │
│   darkMode: "class"                         │
│   colors: { bg, text, border, accent }      │
│   → 映射至 CSS 變數                          │
├─────────────────────────────────────────────┤
│ 組件層                                       │
│   ✅ className="bg-bg-primary text-text-*"  │
│   ❌ className="bg-white dark:bg-gray-900"  │
└─────────────────────────────────────────────┘
```

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

### 2.3 內部工具 (Internal Tools)
- **適用範圍**: 專案進度儀表板、開發輔助工具 (e.g., `project-process/`)
- **技術棧**: HTML5 + Tailwind CSS (CDN) + Alpine.js (CDN)
- **設計原則**:
    - **輕量化**: 不需 Build Step，單檔 HTML 即可運作。
    - **功能優先**: 介面簡潔清晰，以資訊展示與操作效率為主。
    - **深色導航**: 統一使用深色 (`bg-slate-900`) Top Navigation Bar 以區隔產品與內部工具。



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
