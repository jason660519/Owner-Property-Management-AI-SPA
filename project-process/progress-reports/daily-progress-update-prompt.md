# 開發進度儀表板更新 - 標準作業程序 (SOP)

**版本**: 1.2.0  
**最後更新**: 2026/02/06  
**適用對象**: AI 工程師  
**目的**: 確保開發進度儀表板的更新具一致性、完整性及可追溯性

---

## 📋 更新版本記錄

### v1.2.0 (2026/02/06)
- ✅ 修正：避免新增重複或過於細分的項目
- ✅ 規範：單一功能應整合為一個項目，而非拆分成多個子項目
- ✅ 原則：項目名稱應反映主要功能，而非實作方法或工具

### v1.1.0 (2026/02/05)
- ✅ 新增：參考資料URL驗證規範
- ✅ 新增：文檔品質檢查清單
- ✅ 強化：有憑有據原則

### v1.0.0 (2026/02/05)
- 初始版本建立

---

## 🎯 核心原則

### 1️⃣ 項目整合原則 ⚠️ 重要
- **避免重複**: 不要為同一功能的不同面向建立多個項目
- **功能導向**: 項目名稱應描述「做什麼」，而非「怎麼做」
- **適當粒度**: 單一功能整合為一個項目，不過度細分

**錯誤示例** ❌:
```javascript
{ name: "TDD 測試驅動開發實踐", percentage: 100, ... },
{ name: "登入功能單元測試", percentage: 100, ... },
{ name: "自動化測試腳本", percentage: 100, ... }
```
這三個項目實際上是同一個工作的不同面向，應整合為一個。

**正確示例** ✅:
```javascript
{ name: "登入功能-TDD測試開發", percentage: 100, ... }
```
簡潔明確，一個項目涵蓋完整功能開發。

### 2️⃣ 有憑有據原則
- **必須提供有效URL**: 所有參考資料必須是可驗證的外部資源
- **無資源則省略**: 如果沒有外部參考資料，直接移除「參考資料」區塊
- **禁止虛構連結**: 不可編造或假設不存在的URL

### 3️⃣ 完整記錄原則
- 每次更新必須記錄：時間、內容、影響範圍
- 所有技術決策必須有文檔支持
- 測試結果必須可驗證

---

## 🔧 執行步驟

### Step 1: 收集資訊 📊
收集今日完成的所有開發工作：
- 修改的檔案清單及路徑
- 功能變更描述
- 測試結果數據
- 相關文檔路徑

### Step 2: 更新 roadmap.js 📝

**檔案位置**: `project-process/project-progress-dashboard/roadmap.js`

**更新項目**:
1. **lastUpdated**: 更新為當前日期時間（格式: YYYY/MM/DD-HH:mm）
2. **現有功能進度**: 更新 percentage
3. **新增功能項目**: 遵循項目整合原則

**新增項目格式**:
```javascript
{
    name: "功能名稱",                    // 功能導向，避免技術細節
    percentage: 0-100,                  // 完成度百分比
    docPath: "相對路徑",                 // 相對於專案根目錄
    category: "分類名稱",                // 使用既有分類
    points: 1-8,                       // 複雜度評分
    lastModifiedBy: "AI名稱",           // 例如: "Claude Sonnet 4.5"
    lastModifiedDate: "YYYY/MM/DD"     // 最後修改日期
}
```

**項目命名規範**:
```javascript
// ✅ 好的命名 - 功能導向
{ name: "登入功能-記住我" }
{ name: "物件管理-照片上傳" }
{ name: "財務報表-租金收支" }

// ❌ 不好的命名 - 技術導向或過度細分
{ name: "TDD測試開發" }          // 太技術性
{ name: "單元測試撰寫" }          // 太細分
{ name: "React Hook Form 整合" } // 工具名稱
```

### Step 3: 建立技術報告 📄

**檔案位置**: `project-process/features/[feature-name]-[date].html`

**必要區塊**:
1. **標題與摘要**
   - 清晰的功能標題
   - 執行摘要（3-5重點）

2. **技術細節**
   - 實作方法
   - 關鍵程式碼片段
   - 技術決策理由

3. **測試結果**
   - 測試案例清單
   - 通過率統計
   - 測試覆蓋範圍

4. **問題與解決方案**
   - 遇到的技術挑戰
   - 解決方法
   - 經驗教訓

5. **參考資料** ⚠️ 重要規範
   - **必須是外部可驗證的URL** (如: https://react.dev/, https://testing-library.com/)
   - **內部檔案路徑不算參考資料** (如: apps/web/page.tsx 是專案文件，非參考資源)
   - 沒有外部資源時，整個區塊直接移除或註解標示
   - 只有在引用外部文檔、教學、API文件時才包含此區塊

**參考資料範例**:
```html
<!-- ✅ 正確 - 有外部URL -->
<div class="references">
    <h2>📚 參考資料</h2>
    <ul>
        <li><a href="https://react-hook-form.com/api">React Hook Form API</a></li>
        <li><a href="https://testing-library.com/docs/react-testing-library/intro">React Testing Library</a></li>
        <li><a href="https://jestjs.io/docs/getting-started">Jest Official Docs</a></li>
    </ul>
</div>

<!-- ✅ 正確 - 無外部資源時使用註解標示 -->
<!-- 相關資源區塊已移除 - 無外部參考資料 -->

<!-- ❌ 錯誤 - 內部路徑不是參考資料 -->
<div class="references">
    <h3>📎 相關資源</h3>
    <a href="../../apps/web/page.tsx">頁面程式碼</a>  <!-- ❌ 專案內部文件 -->
    <a href="../../docs/report.md">報告</a>  <!-- ❌ 專案內部文件 -->
</div>

<!-- ❌ 錯誤 - 沒有完整URL -->
<div class="references">
    <li>React 官方文檔</li>  <!-- ❌ 缺少URL -->
    <li>MDN Web Docs</li>  <!-- ❌ 缺少URL -->
</div>
```

### Step 4: 建立開發日誌 📋

**檔案位置**: `docs/reports/daily-work-log-[date].md`

**內容結構**:
```markdown
# 開發工作日誌 - YYYY/MM/DD

## 📊 工作概覽
- 主要任務: [簡述]
- 完成項目數: X
- 測試通過率: X%

## 🛠️ 完成項目

### 1. [項目名稱]
- **目標**: [功能目標]
- **實作**: [實作方法]  
- **檔案**: [修改的檔案]
- **測試**: [測試結果]

## 📝 技術筆記
[重要的技術發現或決策]

## 🔄 下一步
[待處理項目或改進方向]
```

### Step 5: 驗證更新 ✅

**檢查清單**:
- [ ] roadmap.js 語法正確（JSON格式）
- [ ] lastUpdated 已更新
- [ ] 所有新項目遵循整合原則
- [ ] 項目名稱為功能導向
- [ ] 避免重複或過度細分的項目
- [ ] docPath 路徑正確
- [ ] 技術報告包含所有必要區塊
- [ ] **參考資料僅包含外部URL（非內部文件路徑）**
- [ ] **無外部資源時已移除或註解標示參考資料區塊**
- [ ] **HTML報告文字清晰可見（無需反白）**
- [ ] **CSS樣式確保足夠對比度（文字 vs. 背景）**
- [ ] **渐变背景使用inline style確保顏色正確顯示**
- [ ] 開發日誌資訊完整
- [ ] 儀表板可正常訪問 (http://localhost:3002)

---

## 📊 HTML 報告模板

```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>[功能名稱] - 技術報告</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .container {
            background: white;
            border-radius: 10px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        h1 { color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; }
        h2 { color: #764ba2; margin-top: 30px; }
        .meta { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .highlight { background: #fff3cd; padding: 2px 5px; border-radius: 3px; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; color: #1f2937; }
        pre { background: #2d2d2d; color: #f8f8f2; padding: 20px; border-radius: 5px; overflow-x: auto; }
        .success { color: #28a745; font-weight: bold; }
        .warning { color: #ffc107; font-weight: bold; }
        
        /* ⚠️ 重要: 漸變背景區塊必須確保文字可見性 */
        .gradient-section {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            padding: 1.5rem;
            border-radius: 0.75rem;
        }
        .gradient-section h2,
        .gradient-section h3,
        .gradient-section p,
        .gradient-section li {
            color: #ffffff !important;  /* 強制白色文字 */
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>[功能名稱] - 技術實作報告</h1>
        
        <div class="meta">
            <p><strong>開發日期:</strong> YYYY/MM/DD</p>
            <p><strong>開發人員:</strong> [AI名稱]</p>
            <p><strong>開發方法:</strong> [例如: TDD]</p>
            <p><strong>專案狀態:</strong> <span class="success">✅ 已完成</span></p>
        </div>

        <h2>📋 執行摘要</h2>
        <ul>
            <li>重點1</li>
            <li>重點2</li>
            <li>重點3</li>
        </ul>

        <h2>🔧 技術實作</h2>
        [技術細節內容]

        <h2>✅ 測試結果</h2>
        [測試結果內容]

        <h2>💡 經驗總結</h2>
        [經驗教訓內容]

        <!-- ⚠️ 重要：只有在有外部URL時才包含此區塊 -->
        <!-- <h2>📚 參考資料</h2>
        <ul>
            <li><a href="https://example.com">外部資源標題</a></li>
        </ul> -->
    </div>
</body>
</html>
```

---

## 📝 Markdown 日誌模板

```markdown
# 開發工作日誌 - YYYY/MM/DD

## 📊 工作概覽
- **主要任務**: [任務描述]
- **開發方法**: [例如: TDD]
- **完成項目**: X 個
- **測試通過率**: 100%

---

## 🛠️ 完成項目

### 1. [功能名稱]
**目標**: [功能目標]

**實作內容**:
- 項目1
- 項目2

**修改檔案**:
- `路徑/檔案1.tsx`
- `路徑/檔案2.test.tsx`

**測試結果**: ✅ X/X 通過

---

## 📝 技術筆記

### 重要發現
[技術發現內容]

### 解決的問題
[問題及解決方案]

---

## 🔄 下一步計畫
- [ ] 待處理項目1
- [ ] 待處理項目2

---

<!-- ⚠️ 重要：只有在有外部URL時才包含此區塊 -->
<!-- ## 📚 參考資料
- [外部資源標題](https://example.com)
-->

**報告產生時間**: YYYY/MM/DD HH:mm  
**開發人員**: [AI名稱]
```

---

## ⚠️ 常見錯誤與修正

### 錯誤 1: 項目過度細分
```javascript
// ❌ 錯誤
{ name: "表單驗證功能" },
{ name: "表單錯誤處理" },
{ name: "表單提交邏輯" }

// ✅ 正確
{ name: "使用者註冊表單" }
```

### 錯誤 2: 技術導向命名
```javascript
// ❌ 錯誤
{ name: "React Hook Form 整合" }
{ name: "Zod Schema 驗證" }

// ✅ 正確
{ name: "登入表單驗證" }
```

### 錯誤 3: 重複記錄測試工作
```javascript
// ❌ 錯誤 - 為同一功能創建多個測試項目
{ name: "功能A開發" },
{ name: "功能A單元測試" },
{ name: "功能A整合測試" }

// ✅ 正確 - 測試是開發的一部分
{ name: "功能A" }  // 測試包含在開發過程中
```

### 錯誤 4: 虛構參考資料
```html
<!-- ❌ 錯誤 -->
<h2>參考資料</h2>
<ul>
    <li>React 官方文檔</li>  <!-- 沒有URL -->
    <li>內部設計文件</li>    <!-- 不是外部資源 -->
</ul>

<!-- ✅ 正確選項1: 有實際URL -->
<h2>參考資料</h2>
<ul>
    <li><a href="https://react.dev/">React Official Docs</a></li>
</ul>

<!-- ✅ 正確選項2: 無外部資源時省略 -->
<!-- 直接不包含參考資料區塊 -->
```

### 錯誤 5: CSS 樣式導致文字不可見
```html
<!-- ❌ 錯誤 - 文字需要反白才能看到 -->
<div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
    <h2 class="text-2xl">標題</h2>
    <div class="opacity-90">內容文字</div>  <!-- opacity 可能導致對比度不足 -->
</div>

<!-- ✅ 正確 - 使用 inline style 確保顏色正確 -->
<div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; padding: 1.5rem; border-radius: 0.75rem;">
    <h2 style="color: #ffffff;">標題</h2>
    <div style="color: #ffffff;">內容文字</div>
</div>
```

---

## 🎓 最佳實踐

1. **保持項目簡潔**: 一個功能 = 一個項目
2. **功能優先**: 從用戶角度描述功能，而非技術實作
3. **避免冗餘**: 不為開發過程的不同階段創建多個項目
4. **測試融合**: 測試是開發的一部分，不單獨成項
5. **文檔求實**: 有憑有據，無外部資源則省略參考區塊

---

## 📞 支援資訊

如有疑問，請參考：
- 專案儀表板: http://localhost:3002/project-process/index.html
- 文檔指南: `docs/file-naming-guidelines.md`
- 此SOP文件: `docs/prompts/daily-progress-update-prompt.md`

---

**文件擁有者**: 開發團隊  
**審核週期**: 每月  
**下次審核**: 2026/03/06
