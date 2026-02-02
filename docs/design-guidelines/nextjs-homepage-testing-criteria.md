# Next.js 公司首頁的測試標準和驗收準則測試和驗收標準

> **創建日期**: 2026-01-30  
> **創建者**: Project Team  
> **最後修改**: 2026-01-30  
> **修改者**: Project Team  
> **版本**: 1.0  
> **文件類型**: 技術文件

---


## 概述

本文檔定義了 Next.js 公司首頁的測試標準和驗收準則，確保最終產品符合 Figma 設計規範和最佳實踐。

## 1. 視覺設計測試

### 1.1 色彩系統

- ✅ **驗收標準**: 使用 DESIGN.md 定義的顏色系統
  - Grey/08 (#1A1A1A) - 主要背景
  - Grey/10 (#2A2A2A) - 次要背景
  - Purple/60 (#7C3AED) - 主要強調色
  - Absolute/White (#FFFFFF) - 文字顏色
- **測試方法**: 使用瀏覽器開發者工具檢查實際使用的顏色值
- **工具**: Chrome DevTools, Firefox Developer Tools

### 1.2 字體系統

- ✅ **驗收標準**: 使用 Inter 字體家族，符合 Figma 設計的字體層級
  - Heading-XL: 48px/56px, 600 weight
  - Heading-LG: 36px/44px, 600 weight
  - Heading-MD: 24px/32px, 600 weight
  - Body-LG: 18px/28px, 400 weight
  - Body-MD: 16px/24px, 400 weight
  - Body-SM: 14px/20px, 400 weight
- **測試方法**: 檢查 computed styles 中的 font-family, font-size, line-height, font-weight
- **工具**: Chrome DevTools Typography panel

### 1.3 組件樣式

- ✅ **驗收標準**: 所有組件符合 DESIGN.md 規格
  - Card 圓角: 12px (rounded-xl)
  - 圖片比例: 16:9 (aspect-video)
  - 按鈕圓角: 根據類型分別為 8px 或 12px
  - 信息標籤圓角: 28px
- **測試方法**: 測量實際像素值，對比 Figma 設計稿

## 2. 響應式設計測試

### 2.1 斷點測試

- ✅ **驗收標準**: 在以下斷點表現良好
  - 手機端: < 640px
  - 平板端: 640px - 1024px
  - 桌面端: 1024px - 1440px
  - 大桌面: > 1440px
- **測試方法**:
  - 使用瀏覽器響應式模式測試
  - 實際設備測試（iPhone, iPad, Android）
- **工具**: Chrome DevTools Device Mode, BrowserStack

### 2.2 內容適應性

- ✅ **驗收標準**:
  - 文字大小根據屏幕尺寸調整
  - 圖片自動縮放保持比例
  - 佈局從單列（手機）到多列（桌面）平滑過渡
  - 觸摸目標大小符合 WCAG 標準（最小 44x44px）

## 3. 性能測試

### 3.1 加載性能

- ✅ **驗收標準**:
  - First Contentful Paint (FCP) < 1.8s
  - Largest Contentful Paint (LCP) < 2.5s
  - Time to Interactive (TTI) < 3.8s
  - Speed Index < 3.4s
- **測試方法**:
  - Lighthouse 性能審計
  - WebPageTest 測試
- **工具**: Google Lighthouse, WebPageTest.org

### 3.2 圖片優化

- ✅ **驗收標準**:
  - 使用 Next.js Image 組件
  - 適當的圖片格式（WebP, AVIF）
  - 響應式圖片尺寸
  - 懶加載實現
  - 圖片加載錯誤處理
- **測試方法**: 檢查 Network tab 中的圖片請求

### 3.3 代碼優化

- ✅ **驗收標準**:
  - JavaScript 包大小 < 200KB (gzipped)
  - CSS 優化，移除未使用樣式
  - 適當的代碼分割
  - Tree shaking 有效
- **工具**: Webpack Bundle Analyzer, Chrome DevTools Coverage

## 4. 可訪問性測試

### 4.1 WCAG 2.1 合規性

- ✅ **驗收標準**: 符合 WCAG 2.1 AA 級別
  - 顏色對比度: 正常文字 4.5:1，大文字 3:1
  - 鍵盤導航: 所有交互元素可通過鍵盤訪問
  - 屏幕閱讀器支持: 適當的 ARIA 標籤和語義 HTML
  - 焦點指示器: 清晰可見的焦點樣式
- **工具**: axe DevTools, WAVE, NVDA/JAWS 屏幕閱讀器

### 4.2 語義 HTML

- ✅ **驗收標準**:
  - 正確使用 heading 層級 (h1-h6)
  - 適當的 landmark 元素 (header, main, footer, nav)
  - 圖片有 alt 屬性
  - 按鈕和鏈接有描述性文字或 aria-label

### 4.3 鍵盤導航

- ✅ **驗收標準**:
  - Tab 鍵順序邏輯
  - 可見的焦點指示器
  - 鍵盤快捷鍵支持（如適用）
  - 跳過鏈接功能

## 5. 交互測試

### 5.1 動畫效果

- ✅ **驗收標準**:
  - Framer Motion 動畫流暢
  - 動畫性能良好（60fps）
  - 適當的動畫時長（200-500ms）
  - 尊重 prefers-reduced-motion 設置
- **測試方法**: 使用 Chrome DevTools Performance tab

### 5.2 響應式交互

- ✅ **驗收標準**:
  - 懸停效果在桌面端工作正常
  - 觸摸交互在移動端響應靈敏
  - 加載狀態反饋清晰
  - 錯誤狀態處理完善

## 6. 跨瀏覽器兼容性

### 6.1 支持瀏覽器

- ✅ **驗收標準**:
  - Chrome 90+
  - Firefox 88+
  - Safari 14+
  - Edge 90+
  - 移動端瀏覽器（iOS Safari, Chrome Android）
- **測試方法**: 手動測試關鍵功能
- **工具**: BrowserStack, Sauce Labs

## 7. SEO 測試

### 7.1 技術 SEO

- ✅ **驗收標準**:
  - 適當的 meta 標籤
  - 結構化數據（JSON-LD）
  - XML 站點地圖
  - robots.txt 配置
  - 規範 URL 設置
- **工具**: Google Search Console, Screaming Frog

### 7.2 性能 SEO

- ✅ **驗收標準**:
  - Core Web Vitals 達標
  - 移動端友好性
  - HTTPS 安全連接
  - 快速加載時間

## 8. 代碼質量測試

### 8.1 TypeScript 類型檢查

- ✅ **驗收標準**:
  - 無 TypeScript 錯誤
  - 嚴格模式啟用
  - 適當的類型定義
  - 無 any 類型濫用
- **命令**: `npm run typecheck`

### 8.2 ESLint 檢查

- ✅ **驗收標準**:
  - 無 ESLint 錯誤
  - 遵循項目編碼規範
  - 適當的代碼註釋
- **命令**: `npm run lint`

### 8.3 單元測試

- ✅ **驗收標準**:
  - 關鍵組件有單元測試覆蓋
  - 工具函數測試覆蓋
  - 測試通過率 100%
- **工具**: Jest, React Testing Library
- **命令**: `npm run test`

## 9. 部署測試

### 9.1 構建測試

- ✅ **驗收標準**:
  - 生產構建成功
  - 構建輸出優化
  - 靜態資源正確加載
- **命令**: `npm run build`

### 9.2 環境測試

- ✅ **驗收標準**:
  - 開發環境正常運行
  - 生產環境部署成功
  - 環境變量正確配置

## 10. 用戶驗收測試 (UAT)

### 10.1 功能驗收

- ✅ **驗收標準**:
  - 所有鏈接正常工作
  - 表單提交功能正常
  - 導航菜單響應正確
  - 搜索功能可用（如適用）

### 10.2 設計驗收

- ✅ **驗收標準**:
  - 與 Figma 設計稿匹配度 > 95%
  - 品牌一致性
  - 視覺層次正確
  - 間距和對齊精確

## 測試執行計劃

### 階段 1: 開發中測試

1. 單元測試（開發人員）
2. TypeScript 和 ESLint 檢查（自動化）
3. 組件級別可訪問性測試

### 階段 2: 集成測試

1. 響應式設計測試
2. 跨瀏覽器兼容性測試
3. 性能基準測試

### 階段 3: 驗收測試

1. 完整可訪問性審計
2. SEO 審計
3. 設計精度驗證
4. 用戶驗收測試

### 階段 4: 上線前測試

1. 生產環境部署測試
2. 最終性能驗證
3. 安全檢查

## 測試工具清單

### 開發工具

- [ ] Chrome DevTools
- [ ] Firefox Developer Tools
- [ ] VS Code 插件（ESLint, Prettier）

### 自動化測試

- [ ] Google Lighthouse
- [ ] axe DevTools
- [ ] WAVE 可訪問性檢查器

### 設計工具

- [ ] Figma 設計稿對比
- [ ] 像素完美測試

### 性能工具

- [ ] WebPageTest
- [ ] GTmetrix
- [ ] Google PageSpeed Insights

### 跨瀏覽器測試

- [ ] BrowserStack
- [ ] 實際設備測試

## 驗收標準總結

項目通過驗收的最低要求：

1. ✅ 所有視覺設計測試通過
2. ✅ 響應式設計在所有斷點工作正常
3. ✅ Lighthouse 性能分數 > 85
4. ✅ WCAG 2.1 AA 級別合規
5. ✅ 無 TypeScript 或 ESLint 錯誤
6. ✅ 跨瀏覽器兼容性通過
7. ✅ 生產構建成功

## 持續監控

上線後持續監控：

- Core Web Vitals
- 用戶體驗指標
- 錯誤日誌
- 性能趨勢

---

*最後更新: 2024年*
*版本: 1.0*
