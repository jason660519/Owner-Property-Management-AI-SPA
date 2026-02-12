# Design System

> **創建日期**: 2026-01-31
> **創建者**: Project Team
> **最後修改**: 2026-02-13
> **修改者**: Claude Opus 4.6
> **版本**: 1.1
> **文件類型**: 設計文件

---

## 從 Figma 設計稿提取的完整設計規格

> **專案名稱**: Owner Property Management AI
> **Figma File Key**: `cqd9sDTv7CaQ6UE3EvpIk4`
> **Figma URL**: [https://www.figma.com/design/cqd9sDTv7CaQ6UE3EvpIk4](https://www.figma.com/design/cqd9sDTv7CaQ6UE3EvpIk4/Owner-Property-Management-AI)
> **提取日期**: 2026-01-31
> **提取方式**: Figma REST API

---

## 📐 響應式斷點 (Breakpoints)

| 裝置              | 視窗寬度 | 內容最大寬度 | 側邊 Padding |
| ----------------- | -------- | ------------ | ------------ |
| **Desktop** | 1920px   | 1596px       | 162px        |
| **Laptop**  | 1440px   | 1200px       | 120px        |
| **Mobile**  | 390px    | 100%         | 16px         |

### CSS 媒體查詢

```css
/* Mobile First Approach */
@media (min-width: 640px) { /* Tablet */ }
@media (min-width: 1024px) { /* Laptop */ }
@media (min-width: 1440px) { /* Desktop */ }
@media (min-width: 1920px) { /* Large Desktop */ }
```

---

## 🎨 色彩系統 (Color Palette)

### 基礎色彩定義 (Primitives)

兩個應用 (Web + Superadmin) **共用同一套基礎色彩變數**，定義在各自的 `globals.css` 中：

```css
:root {
  /* ===== Grey Scale (Dark) ===== */
  --color-grey-08: #1A1A1A;   /* Dark mode - 主要背景 */
  --color-grey-10: #2A2A2A;   /* Dark mode - 次要背景 */
  --color-grey-15: #333333;   /* Dark mode - 第三層背景 / 邊框 */
  --color-grey-60: #999999;   /* Dark mode - 次要文字 */

  /* ===== Grey Scale (Light) ===== */
  --color-grey-50: #F9FAFB;   /* Light mode - 次要背景 */
  --color-grey-100: #F3F4F6;  /* Light mode - 第三層背景 */
  --color-grey-200: #E5E7EB;  /* Light mode - 邊框 */
  --color-grey-500: #6B7280;  /* Light mode - 次要文字 */
  --color-grey-900: #111827;  /* Light mode - 主要文字 */

  /* ===== Brand Colors ===== */
  --color-purple-60: #7C3AED; /* 主要強調色 / CTA */
  --color-purple-50: #8B5CF6; /* 強調色 (淺) */

  /* ===== Midnight Theme ===== */
  --color-midnight-900: #0B1121;
  --color-midnight-800: #151E32;
  --color-midnight-700: #2A3655;
  --color-cyan-400: #22D3EE;

  /* ===== Utility ===== */
  --color-white: #FFFFFF;
  --color-black: #000000;
  --color-star: #F59E0B;
  --color-error: #EF4444;
}
```

### 語意化色彩變數 — 主題切換系統

所有主題透過覆寫語意化變數實現，兩個應用共用完全相同的值：

| 變數 | Light Mode | Dark Mode | Midnight | Ultra-Dark (Superadmin) |
|:-----|:-----------|:----------|:---------|:------------------------|
| `--color-text-primary` | `#111827` | `#FFFFFF` | `#F1F5F9` | `#E0E0E0` |
| `--color-text-secondary` | `#6B7280` | `#999999` | `#94A3B8` | `#9E9E9E` |
| `--color-text-muted` | `#9CA3AF` | `#666666` | `#64748B` | `#616161` |
| `--color-bg-primary` | `#FFFFFF` | `#1A1A1A` | `#0B1121` | `#0A0A0A` |
| `--color-bg-secondary` | `#F9FAFB` | `#2A2A2A` | `#151E32` | `#121212` |
| `--color-bg-tertiary` | `#F3F4F6` | `#333333` | `#1E293B` | `#0F0F0F` |
| `--color-border-default` | `#E5E7EB` | `#333333` | `#2A3655` | `#242424` |
| `--color-border-light` | `#D1D5DB` | `#444444` | `#334155` | `#1B1B1B` |
| `--color-accent` | `#7C3AED` | `#7C3AED` | `#22D3EE` | `#90CAF9` |
| `--color-accent-hover` | `#6D28D9` | `#6D28D9` | `#67E8F9` | `#64B5F6` |
| `--color-accent-subtle` | `rgba(124,58,237,0.08)` | `rgba(124,58,237,0.15)` | `rgba(34,211,238,0.15)` | `rgba(144,202,249,0.1)` |

### Tailwind CSS 語意色彩映射

兩個應用的 `tailwind.config.ts` 使用相同的語意 token：

```typescript
colors: {
  bg: {
    primary: 'var(--color-bg-primary)',
    secondary: 'var(--color-bg-secondary)',
    tertiary: 'var(--color-bg-tertiary)',
  },
  text: {
    primary: 'var(--color-text-primary)',
    secondary: 'var(--color-text-secondary)',
    muted: 'var(--color-text-muted)',
  },
  border: {
    default: 'var(--color-border-default)',
    light: 'var(--color-border-light)',
  },
  accent: {
    DEFAULT: 'var(--color-accent)',
    hover: 'var(--color-accent-hover)',
    subtle: 'var(--color-accent-subtle)',
  },
}
```

---

## 📝 字型系統 (Typography)

### 字型家族

```css
:root {
  /* 主要字型 - Urbanist (從 Figma 設計稿) */
  --font-primary: 'Urbanist', system-ui, -apple-system, sans-serif;
  
  /* 備用字型 */
  --font-fallback: 'Inter', 'Manrope', sans-serif;
}
```

### 字型載入

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### 字型樣式 (從 Figma 提取的實際數值)

| 樣式名稱             | 字重 | 大小 | 行高          | 用途       | 範例文字                               |
| -------------------- | ---- | ---- | ------------- | ---------- | -------------------------------------- |
| **Display**    | 600  | 60px | 72px (120%)   | 頁面主標題 | 「房東物業的 AI 好幫手」               |
| **H1**         | 600  | 48px | 72px (150%)   | 區塊標題   | 「我的啞巴兒子」                       |
| **H2**         | 600  | 46px | 55.2px (120%) | 大區塊標題 | 「Discover Your Dream Property」       |
| **H3**         | 600  | 38px | 57px (150%)   | 中標題     | 「Featured Properties」                |
| **H4**         | 700  | 40px | 60px (150%)   | 統計數字   | 「200+」                               |
| **H5**         | 600  | 30px | 45px (150%)   | 小標題     | 「3+ Years of Excellence」             |
| **H6**         | 600  | 24px | 36px (150%)   | 卡片標題   | 「我要如何與 AI 聯絡」                 |
| **Body Large** | 500  | 20px | 30px (150%)   | 重要內文   | 「01 of 60」                           |
| **Body**       | 500  | 18px | 27px (150%)   | 一般內文   | 「✨你的AI好幫手，輕鬆管理你的不動產」 |
| **Body Small** | 500  | 16px | 24px (150%)   | 次要內文   | 「Your journey to finding...」         |
| **Caption**    | 500  | 14px | 21px (150%)   | 標籤/說明  | 「✨Discover Your Dream Property」     |
| **Small**      | 500  | 12px | 18px (150%)   | 最小文字   | 版權說明                               |

### CSS 字型定義

```css
.text-display { font-size: 60px; font-weight: 600; line-height: 1.2; }
.text-h1 { font-size: 48px; font-weight: 600; line-height: 1.5; }
.text-h2 { font-size: 46px; font-weight: 600; line-height: 1.2; }
.text-h3 { font-size: 38px; font-weight: 600; line-height: 1.5; }
.text-h4 { font-size: 40px; font-weight: 700; line-height: 1.5; }
.text-h5 { font-size: 30px; font-weight: 600; line-height: 1.5; }
.text-h6 { font-size: 24px; font-weight: 600; line-height: 1.5; }
.text-body-lg { font-size: 20px; font-weight: 500; line-height: 1.5; }
.text-body { font-size: 18px; font-weight: 500; line-height: 1.5; }
.text-body-sm { font-size: 16px; font-weight: 500; line-height: 1.5; }
.text-caption { font-size: 14px; font-weight: 500; line-height: 1.5; }
.text-small { font-size: 12px; font-weight: 500; line-height: 1.5; }
```

---

## 📏 間距系統 (Spacing)

### 基礎間距 (從 Figma 提取)

```css
:root {
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 20px;
  --spacing-6: 24px;
  --spacing-7: 28px;
  --spacing-8: 30px;
  --spacing-9: 34px;
  --spacing-10: 38px;
  --spacing-11: 40px;
  --spacing-12: 46px;
  --spacing-14: 50px;
  --spacing-16: 60px;
  --spacing-20: 80px;
  --spacing-24: 100px;
  --spacing-28: 120px;
  --spacing-32: 150px;
  --spacing-36: 160px;
  --spacing-40: 162px;  /* Container padding */
  --spacing-48: 200px;
}
```

### 元件間距規格

| 元件                       | Padding   | Gap  | 用途                 |
| -------------------------- | --------- | ---- | -------------------- |
| **Container**        | 0 162px   | -    | 頁面主容器 (Desktop) |
| **Container-Laptop** | 0 120px   | -    | 頁面主容器 (Laptop)  |
| **Container-Mobile** | 0 16px    | -    | 頁面主容器 (Mobile)  |
| **Section**          | 100px 0   | 80px | 區塊間距             |
| **Card**             | 24px      | 20px | 卡片內距與間距       |
| **Button**           | 14px 24px | 8px  | 按鈕內距             |
| **Nav Links**        | 14px 24px | 30px | 導航連結             |
| **Input**            | 16px 20px | -    | 輸入框               |
| **FAQ Item**         | 20px 24px | 14px | FAQ 項目             |

---

## 🔲 圓角系統 (Border Radius)

### 從 Figma 提取的圓角值

```css
:root {
  /* 基礎圓角 */
  --radius-xs: 4px;       /* 小元素 */
  --radius-sm: 8px;       /* 小按鈕、標籤 */
  --radius-md: 10px;      /* 一般元素 */
  --radius-base: 12px;    /* 卡片、輸入框 */
  --radius-lg: 16px;      /* 大卡片 */
  --radius-xl: 20px;      /* 特大元素 */
  
  /* 特殊圓角 */
  --radius-2xl: 28px;     /* 導航按鈕 */
  --radius-3xl: 43px;     /* 標籤膠囊 */
  --radius-4xl: 58px;     /* 大按鈕 */
  --radius-nav: 69px;     /* 導航欄容器 */
  --radius-pill: 75px;    /* 膠囊形狀 */
  --radius-circle: 100px; /* 圓形 */
}
```

### 元件圓角對照

| 元件           | 圓角值 |
| -------------- | ------ |
| 按鈕 (Primary) | 10px   |
| 按鈕 (Pill)    | 75px   |
| 卡片           | 12px   |
| 輸入框         | 12px   |
| 導航欄容器     | 69px   |
| 頭像           | 100px  |
| 圖片遮罩       | 8-12px |

---

## 🔘 元件規格 (Components)

### 按鈕 (Buttons)

#### Primary Button

```css
.btn-primary {
  background: var(--color-accent);
  color: var(--color-text-primary);
  padding: 14px 24px;
  border-radius: var(--radius-md);
  font-family: var(--font-primary);
  font-weight: 500;
  font-size: 18px;
  line-height: 27px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--color-accent-light);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
}
```

#### Secondary Button

```css
.btn-secondary {
  background: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-default);
  padding: 14px 24px;
  border-radius: var(--radius-md);
  font-family: var(--font-primary);
  font-weight: 500;
  font-size: 18px;
  line-height: 27px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: var(--color-accent);
  background: rgba(111, 59, 246, 0.1);
}
```

#### Icon Button

```css
.btn-icon {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  width: 52px;
  height: 52px;
  border-radius: var(--radius-circle);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon:hover {
  border-color: var(--color-accent);
}
```

### 卡片 (Cards)

#### Property Card

```css
.property-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-base);
  padding: 24px;
  transition: all 0.3s ease;
}

.property-card:hover {
  border-color: var(--color-accent);
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

.property-card__image {
  border-radius: var(--radius-sm);
  overflow: hidden;
  margin-bottom: 20px;
}

.property-card__title {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 8px;
}

.property-card__description {
  font-size: 16px;
  color: var(--color-text-secondary);
  margin-bottom: 16px;
}
```

#### Testimonial Card

```css
.testimonial-card {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-base);
  padding: 40px;
}

.testimonial-card__stars {
  color: #ffe500;  /* Star color from Figma */
  margin-bottom: 24px;
}

.testimonial-card__text {
  font-size: 18px;
  line-height: 27px;
  color: var(--color-text-secondary);
  margin-bottom: 30px;
}

.testimonial-card__author {
  display: flex;
  align-items: center;
  gap: 12px;
}
```

### 導航欄 (Navigation)

```css
.navbar {
  background: var(--color-bg-secondary);
  border-bottom: 1px solid var(--color-border-default);
  height: 99px;
  padding: 0 162px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.navbar__logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.navbar__links {
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-nav);
  padding: 14px 24px;
  display: flex;
  gap: 30px;
}

.navbar__link {
  color: var(--color-text-primary);
  font-size: 18px;
  font-weight: 500;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: var(--radius-sm);
  transition: all 0.2s ease;
}

.navbar__link:hover,
.navbar__link--active {
  background: var(--color-bg-secondary);
}
```

### 輸入框 (Inputs)

```css
.input {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-base);
  padding: 16px 20px;
  font-family: var(--font-primary);
  font-size: 18px;
  color: var(--color-text-primary);
  width: 100%;
  transition: border-color 0.2s ease;
}

.input::placeholder {
  color: var(--color-text-muted);
}

.input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.input:hover:not(:focus) {
  border-color: var(--color-border-light);
}
```

### 標籤 (Tags/Badges)

```css
.tag {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-pill);
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tag--accent {
  background: rgba(111, 59, 246, 0.1);
  border-color: var(--color-accent);
  color: var(--color-accent-light);
}
```

---

## 🎞️ 動畫與過渡 (Animations)

### 過渡時間

```css
:root {
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 350ms ease;
  --transition-bounce: 350ms cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### 懸停效果

```css
/* 卡片懸停 */
.card-hover {
  transition: transform var(--transition-normal), 
              border-color var(--transition-normal),
              box-shadow var(--transition-normal);
}

.card-hover:hover {
  transform: translateY(-4px);
  border-color: var(--color-accent);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
}

/* 按鈕懸停 */
.btn-hover {
  transition: transform var(--transition-fast),
              background var(--transition-fast);
}

.btn-hover:hover {
  transform: scale(1.02);
}

/* 連結懸停 */
.link-hover {
  transition: color var(--transition-fast);
}

.link-hover:hover {
  color: var(--color-accent);
}
```

### 載入動畫

```css
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--color-bg-secondary) 0%,
    var(--color-border-default) 50%,
    var(--color-bg-secondary) 100%
  );
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease forwards;
}
```

### 陰影效果

```css
:root {
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 12px 24px rgba(0, 0, 0, 0.3);
  --shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.4);
}
```

---

## 🖼️ 頁面結構 (Page Layout)

### Home Page - Desktop (1920×5196)

```
┌─────────────────────────────────────────────────────────────┐
│  Banner (63px) - 公告橫幅                                     │
├─────────────────────────────────────────────────────────────┤
│  Navigation Bar (99px) - Logo + Nav Links + CTA              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Hero Section (~1000px)                                     │
│  ┌─────────────────────┬─────────────────────────────────┐  │
│  │  Left Column        │  Right Column                   │  │
│  │  - 標題文字          │  - 建築圖片                      │  │
│  │  - 統計數據 (3格)    │                                 │  │
│  └─────────────────────┴─────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  我的啞巴兒子 Section (~750px)                                │
│  - Section Header (標題 + 描述 + View All)                   │
│  - Property Cards Grid (3 columns)                          │
│  - Pagination                                               │
├─────────────────────────────────────────────────────────────┤
│  客戶評價 Section (~700px)                                    │
│  - Section Header                                           │
│  - Testimonial Cards Slider (3 visible)                     │
│  - Navigation Arrows                                        │
├─────────────────────────────────────────────────────────────┤
│  常見 Q&A Section (~500px)                                   │
│  - Section Header                                           │
│  - FAQ Accordion (2 columns)                                │
├─────────────────────────────────────────────────────────────┤
│  CTA Section (340px)                                        │
│  - Background Pattern                                       │
│  - Heading + Description + Button                           │
├─────────────────────────────────────────────────────────────┤
│  Footer (558px)                                             │
│  - Logo + Navigation Links                                  │
│  - Contact Info                                             │
│  - Social Links                                             │
│  - Copyright                                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📱 響應式設計規則

### Desktop → Laptop 調整

- Container: 1596px → 1200px
- Section padding: 100px → 80px
- Card grid: 3 columns → 3 columns (smaller)
- Font sizes: 保持不變

### Laptop → Mobile 調整

- Container: 1200px → 100% - 32px
- Navigation: 完整導航 → 漢堡選單
- Card grid: 3 columns → 1 column
- Hero: 2 columns → 1 column (堆疊)
- Font sizes: 縮小 20-30%
- Section padding: 80px → 50px

### 響應式字型

```css
/* Mobile */
:root {
  --text-display: 36px;
  --text-h1: 32px;
  --text-h2: 28px;
  --text-h3: 24px;
}

/* Laptop */
@media (min-width: 1024px) {
  :root {
    --text-display: 48px;
    --text-h1: 40px;
    --text-h2: 36px;
    --text-h3: 30px;
  }
}

/* Desktop */
@media (min-width: 1440px) {
  :root {
    --text-display: 60px;
    --text-h1: 48px;
    --text-h2: 46px;
    --text-h3: 38px;
  }
}
```

---

## ♿ 無障礙設計 (Accessibility)

### 對比度

- 主要文字 (#FFFFFF on #141414): 15.9:1 ✅ AAA
- 次要文字 (#999999 on #141414): 5.8:1 ✅ AA
- 強調色 (#703BF7 on #141414): 4.2:1 ✅ AA (大文字)

### 焦點狀態

```css
*:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(111, 59, 246, 0.3);
}
```

### 互動區域

- 最小觸控區域: 44×44px
- 按鈕最小高度: 48px
- 連結間距: 至少 8px

---

## 📂 設計圖匯出清單

所有頁面設計已匯出至 `docs/figma-exports/`:

| 檔案名稱                         | 尺寸       | 大小   |
| -------------------------------- | ---------- | ------ |
| `home-page-desktop.png`        | 1920×5196 | 2.2 MB |
| `home-page-mobile.png`         | 390×4882  | 504 KB |
| `about-page-desktop.png`       | 1920×6022 | 1.2 MB |
| `properties-page-desktop.png`  | 1920×4381 | 1.1 MB |
| `property-details-desktop.png` | 1920×7739 | 2.0 MB |
| `services-page-desktop.png`    | 1920×4522 | 723 KB |
| `contact-page-desktop.png`     | 1920×5180 | 1.8 MB |

---

## 🔧 開發實作指南

### CSS 變數使用範例

```css
.component {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border-default);
  border-radius: var(--radius-base);
  padding: var(--spacing-6);
  font-family: var(--font-primary);
  color: var(--color-text-primary);
  transition: all var(--transition-normal);
}

.component:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
}
```

### 檔案結構建議

```
styles/
├── base/
│   ├── reset.css
│   ├── typography.css
│   └── variables.css      # 設計系統變數
├── components/
│   ├── buttons.css
│   ├── cards.css
│   ├── forms.css
│   └── navigation.css
├── layouts/
│   ├── container.css
│   ├── grid.css
│   └── sections.css
└── pages/
    ├── home.css
    ├── about.css
    └── ...
```

---

## 📋 更新日誌

| 日期       | 版本  | 更新內容                                 |
| ---------- | ----- | ---------------------------------------- |
| 2026-02-13 | 1.1.0 | 統一 Web/Superadmin 主題切換系統，新增完整主題色彩對照表 |
| 2026-01-31 | 1.0.0 | 初始版本 - 從 Figma API 提取完整設計規格 |
