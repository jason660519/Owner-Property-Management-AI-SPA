# 工程師每日工作進度更新指南

**版本**: 1.0.0  
**最後更新**: 2026/02/06  
**適用對象**: 全體工程師（人類 & AI）  
**儀表板網址**: http://localhost:3002（Port 3001 為 Superadmin 後台）

---

## 📌 核心原則

### 🎯 一項功能一個條目
**避免過度細分**：不要為同一功能的不同實作步驟建立多個項目

```javascript
// ❌ 錯誤 - 過度細分
{ name: "登入功能開發" }
{ name: "登入功能測試" }
{ name: "登入功能文檔" }

// ✅ 正確 - 整合為一
{ name: "登入功能-完整開發" }  // 包含開發、測試、文檔
```

### 📝 功能導向命名
**描述「做什麼」而非「怎麼做」**

```javascript
// ❌ 技術導向
{ name: "React Hook Form 整合" }
{ name: "Jest 單元測試撰寫" }
{ name: "TDD 開發實踐" }

// ✅ 功能導向
{ name: "使用者註冊表單" }
{ name: "登入頁面>密碼驗證" }
{ name: "房東儀表板>數據統計" }
```

### 🔗 參考資料規範
**必須是可驗證的外部 URL，否則省略**

```html
<!-- ✅ 有外部 URL -->
<h2>📚 參考資料</h2>
<ul>
    <li><a href="https://react.dev/">React Official Documentation</a></li>
    <li><a href="https://testing-library.com/docs/react-testing-library/intro">React Testing Library</a></li>
</ul>

<!-- ✅ 無外部資源時使用註解 -->
<!-- 參考資料區塊已移除 - 無外部參考資源 -->

<!-- ❌ 內部路徑不算參考資料 -->
<li>apps/web/page.tsx</li>  <!-- 這是專案文件 -->
```

### 🎨 HTML 報告樣式規範
**確保所有文字清晰可見（無需反白）**

```css
/* ✅ 正確 - 代碼塊高對比度 */
.code-block {
    background-color: #0d1117 !important;  /* 強制深色背景 */
    color: #e6edf3 !important;             /* 強制亮白色文字 */
    border: 1px solid #30363d;
    font-size: 0.9rem;
    line-height: 1.6;
}

.code-inline {
    background-color: #dbeafe;  /* 淺藍背景 */
    color: #1e3a8a;             /* 深藍文字 */
    font-weight: 600;           /* 加粗增強可讀性 */
    border: 1px solid #93c5fd;  /* 邊框增加區分度 */
}

/* ✅ 漸變背景使用 inline style */
<div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff;">
    <h2 style="color: #ffffff;">標題</h2>
    <p style="color: #ffffff;">內容</p>
</div>
```

---

## 🚀 快速開始（5步驟）

### Step 1: 準備資料 📋
收集今日完成的工作內容：
- [ ] 修改的檔案清單（含完整路徑）
- [ ] 功能變更描述（用戶視角）
- [ ] 測試結果（通過率、覆蓋率）
- [ ] 相關文檔路徑
- [ ] 外部參考資料 URL（如有）

### Step 2: 更新 roadmap.js 📝

**檔案位置**: `project-process/project-progress-dashboard/roadmap.js`

```javascript
window.ROADMAP_DATA = {
    lastUpdated: "2026/02/06-15:30",  // ⬅️ 更新日期時間
    features: [
        // 現有項目更新進度
        { 
            name: "使用者身份驗證系統", 
            percentage: 90,  // ⬅️ 更新百分比
            // ... 其他欄位保持不變
        },
        
        // 新增項目（如果完成新功能）
        { 
            name: "登入頁面>「記住我」功能 TDD 開發進度檢測報告",  // 功能導向命名
            percentage: 100, 
            docPath: "features/remember-me-tdd-report-20260205.html",  // 相對路徑
            category: "測試與品質保證 (Testing & QA)", 
            points: 5,  // 複雜度: 1-8
            lastModifiedBy: "你的名字",  // 例如: "Claude Sonnet 4.5"
            lastModifiedDate: "2026/02/05" 
        }
    ]
};
```

**進度百分比指南**:
- 0-25%: 規劃階段
- 25-50%: 開發中
- 50-75%: 基本功能完成
- 75-90%: 測試與優化
- 90-100%: 完成並文檔化
- 100%: 完全完成

**複雜度評分 (points)**:
- 1-2: 簡單功能（UI調整、文案修改）
- 3-5: 中等功能（表單、列表、基本CRUD）
- 6-8: 複雜功能（權限系統、AI整合、支付流程）

### Step 3: 創建技術報告 📄

**檔案命名**: `dev-dashboard/features/[功能名稱]-[日期].html`  
**範例**: `remember-me-tdd-report-20260205.html`

**必要區塊**:
```html
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <title>[功能名稱] - 技術報告</title>
    <style>
        /* 關鍵樣式 - 使用較柔和、可長時間閱讀的配色；避免純黑(#000)/純白(#fff)對比過強 */
        .code-block {
            background-color: #0b1220 !important; /* 柔和深藍灰 */
            color: #cbd5e1 !important;            /* 淡米白文字 */
            padding: 1rem;
            border-radius: 0.5rem;
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            border: 1px solid #24313a;
            font-size: 0.92rem;
            line-height: 1.6;
        }
        .code-inline {
            background-color: #eef6ff;  /* 柔和藍灰 */
            color: #0f3b6b;             /* 深藍文字 */
            font-weight: 600;
            padding: 0.125rem 0.375rem;
            border-radius: 0.25rem;
            font-family: 'Monaco', 'Menlo', monospace;
            border: 1px solid #cfe0ff;
        }
        /* 漸變背景區塊 */
        .gradient-header {
            background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
            color: #ffffff;
            padding: 1.5rem;
            border-radius: 0.75rem;
        }
        /* 注意: 如果在漸層上展示統計卡，避免使用淺色半透明（例如 tailwind 的 bg-white/10）遮罩，
           因為會導致文字與數字灰化且可讀性下降。請改用深色半透明或實色方塊並移除文字 opacity。 */
        .gradient-header h2,
        .gradient-header p,
        .gradient-header li {
            color: #ffffff !important;
        }
    </style>
</head>
<body>
    <!-- 1. 執行摘要 -->
    <div class="gradient-header">
        <h2 style="color: #ffffff;">📊 執行摘要</h2>
        <ul>
            <li style="color: #ffffff;">重點1</li>
            <li style="color: #ffffff;">重點2</li>
        </ul>
    </div>

    <!-- 2. 技術細節 -->
    <h2>🔧 技術實作</h2>
    <p>使用 <code class="code-inline">localStorage</code> API 儲存資料</p>
    <pre class="code-block">// 範例程式碼
const data = localStorage.getItem('key');</pre>

    <!-- 3. 測試結果 -->
    <h2>✅ 測試結果</h2>
    <ul>
        <li>測試通過率: 100% (7/7)</li>
        <li>覆蓋率: 85%</li>
    </ul>

    <!-- 4. 問題與解決 -->
    <h2>💡 經驗總結</h2>
    <p>遇到的挑戰及解決方案</p>

    <!-- 5. 參考資料（可選） -->
    <!-- ⚠️ 只有在有外部 URL 時才包含此區塊 -->
    <!-- <h2>📚 參考資料</h2>
    <ul>
        <li><a href="https://...">外部資源</a></li>
    </ul> -->
</body>
</html>
```

### Step 4: 創建開發日誌 📋

**檔案命名**: `docs/reports/daily-work-log-[日期].md`

```markdown
# 開發工作日誌 - 2026/02/06

## 📊 工作概覽
- **主要任務**: [簡述今日主要工作]
- **完成項目**: 3 個
- **測試通過率**: 100%
- **開發時間**: 6 小時

---

## 🛠️ 完成項目

### 1. [功能名稱]
**目標**: [從用戶角度描述功能]

**實作內容**:
- 項目1: 實作細節
- 項目2: 實作細節

**修改檔案**:
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/__tests__/auth/LoginPage.test.tsx`

**測試結果**: ✅ 7/7 通過

**技術報告**: [dev-dashboard/features/xxx.html](../../dev-dashboard/features/xxx.html)

---

## 📝 技術筆記

### 重要發現
[記錄技術發現、最佳實踐]

### 解決的問題
- **問題**: [描述]
- **解決**: [方案]

---

## 🔄 下一步計畫
- [ ] 待處理項目1
- [ ] 待處理項目2

---

<!-- ⚠️ 只有在引用外部資源時才包含此區塊 -->
<!-- ## 📚 參考資料
- [外部資源標題](https://...)
-->

**報告時間**: 2026/02/06 15:30  
**工程師**: [你的名字]
```

### Step 5: 驗證與發布 ✅

**自我檢查清單**:
- [ ] `roadmap.js` 語法正確（JSON 格式無誤）
- [ ] `lastUpdated` 已更新為當前日期時間
- [ ] 項目命名為功能導向（非技術導向）
- [ ] 沒有重複或過度細分的項目
- [ ] `docPath` 路徑正確可訪問
- [ ] HTML 報告所有文字清晰可見（測試：無需反白）
- [ ] 代碼塊使用正確樣式（`.code-block` 和 `.code-inline`）
- [ ] 參考資料僅包含外部 URL 或已移除
- [ ] 開發日誌資訊完整
- [ ] 儀表板可正常訪問: http://localhost:3002

**測試步驟**:
1. 在瀏覽器打開 http://localhost:3002
2. 檢查進度是否正確更新
3. 點擊技術報告連結，確認可以打開
4. 檢查報告中所有文字是否清晰可見
5. 測試響應式設計（手機、平板、桌面）

---

## 📚 範例參考

### 優秀項目命名範例
```javascript
// ✅ 清晰的功能導向命名
{ name: "登入頁面>「記住我」功能 TDD 開發進度檢測報告" }
{ name: "房東儀表板>物件統計圖表" }
{ name: "租客管理>篩選與排序功能" }
{ name: "合約生成>電子簽名整合" }
{ name: "支付系統>信用卡驗證流程" }
```

### 分類指南
常用分類：
- `超級管理員 (Super Admin)`
- `房東 (Landlord)`
- `租客 (Tenant)`
- `買家 (Buyer)`
- `通用/系統 (General/System)`
- `測試與品質保證 (Testing & QA)`
- `合約與法務 (Contracts & Legal)`
- `金流支付 (Payments)`
- `公司頁面 (Company Pages)`
- `第三方加值服務 (Third Party)`

---

## ⚠️ 常見錯誤與解決

### 錯誤 1: 項目過度細分
```javascript
// ❌ 錯誤
{ name: "表單UI設計" }
{ name: "表單驗證邏輯" }
{ name: "表單提交處理" }
{ name: "表單錯誤顯示" }

// ✅ 正確
{ name: "使用者註冊表單" }  // 一個完整功能
```

### 錯誤 2: 技術導向命名
```javascript
// ❌ 錯誤
{ name: "React Hook Form 整合" }
{ name: "Supabase Auth SDK 配置" }
{ name: "Tailwind CSS 樣式調整" }

// ✅ 正確
{ name: "使用者註冊表單" }
{ name: "使用者登入系統" }
{ name: "響應式介面優化" }
```

### 錯誤 3: CSS 對比度不足
```css
/* ❌ 錯誤 - 灰底灰字 */
.code-inline {
    background-color: #f3f4f6;  /* 淺灰 */
    color: #6b7280;             /* 中灰 - 對比度低 */
}

/* ✅ 正確 - 高對比度 */
.code-inline {
    background-color: #dbeafe;  /* 淺藍背景 */
    color: #1e3a8a;             /* 深藍文字 */
    font-weight: 600;           /* 加粗 */
    border: 1px solid #93c5fd;  /* 邊框 */
}
```

### 錯誤 4: 漸變背景文字不可見
```html
<!-- ❌ 錯誤 -->
<div class="bg-gradient-to-r from-blue-500 to-blue-600">
    <h2>標題</h2>  <!-- 可能看不清 -->
</div>

<!-- ✅ 正確 -->
<div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);">
    <h2 style="color: #ffffff;">標題</h2>  <!-- 明確指定白色 -->
</div>
```

### 錯誤 5: 內部路徑作為參考資料
```html
<!-- ❌ 錯誤 -->
<h2>參考資料</h2>
<ul>
    <li><a href="../../apps/web/page.tsx">程式碼</a></li>
    <li><a href="../../docs/design.md">設計文件</a></li>
</ul>

<!-- ✅ 正確選項 1: 有外部 URL -->
<h2>📚 參考資料</h2>
<ul>
    <li><a href="https://react.dev/">React Docs</a></li>
    <li><a href="https://tailwindcss.com/">Tailwind CSS</a></li>
</ul>

<!-- ✅ 正確選項 2: 無外部資源 -->
<!-- 參考資料區塊已移除 - 無外部參考資源 -->
```

---

## 🎓 最佳實踐

1. **每日更新**: 工作結束前更新當日進度
2. **保持簡潔**: 一個功能 = 一個項目
3. **用戶視角**: 從用戶角度描述功能價值
4. **測試優先**: 包含測試結果和覆蓋率
5. **文檔完整**: 技術報告 + 開發日誌
6. **樣式檢查**: 確保所有內容清晰可見
7. **連結驗證**: 確保所有路徑和 URL 有效
8. **即時驗證**: 更新後立即檢查儀表板

---

## 💡 快捷提示

### VS Code 快捷鍵
- 開啟檔案: `Cmd+P` → 輸入檔名
- 搜尋內容: `Cmd+Shift+F`
- 格式化文件: `Shift+Alt+F`

### 終端機指令
```bash
# 啟動儀表板
open http://localhost:3002

# 檢查 JSON 語法
node -c dev-dashboard/roadmap.js

# 搜尋特定內容
grep -r "功能名稱" dev-dashboard/
```

---

## 📞 支援與資源

- **儀表板**: http://localhost:3002
- **文件指南**: `docs/file-naming-guidelines.md`
- **AI 工程師 SOP**: `docs/prompts/daily-progress-update-prompt.md`
- **本指南**: `docs/prompts/engineer-daily-log-update.md`

---

## 📝 版本記錄

### v1.0.0 (2026/02/06)
- ✅ 初始版本發布
- ✅ 核心原則定義
- ✅ 5步驟快速流程
- ✅ CSS 樣式規範
- ✅ 常見錯誤對照
- ✅ 最佳實踐指南

---

**文件擁有者**: 開發團隊  
**審核週期**: 每月  
**下次審核**: 2026/03/06  

---

**記住**: 清晰的文檔 = 高效的團隊協作 🚀
