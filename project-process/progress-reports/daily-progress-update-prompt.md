# 開發進度儀表板更新 - 標準作業程序 (SOP)

**版本**: 1.3.0  
**最後更新**: 2026/02/13  
**適用對象**: AI 工程師  
**目的**: 確保開發進度儀表板的更新具一致性、完整性及可追溯性，並整合新版欄位結構。

---

## 📋 更新版本記錄

### v1.3.0 (2026/02/13)
- ✅ **欄位整合**: 支援新版 `roadmap.js` 結構 (Dev Log, Test Log, Test Coverage)
- ✅ **資料夾規範**: 明確定義 `features/`, `dev-logs/`, `test-logs/` 的用途與命名規則
- ✅ **連結策略**: 規範如何在 `roadmap.js` 中正確連結至對應日誌檔案

### v1.2.0 (2026/02/06)
- ✅ 修正：避免新增重複或過於細分的項目
- ✅ 規範：單一功能應整合為一個項目，而非拆分成多個子項目
- ✅ 原則：項目名稱應反映主要功能，而非實作方法或工具

---

## 🎯 核心原則

### 1️⃣ 項目整合原則 ⚠️ 重要
- **避免重複**: 不要為同一功能的不同面向建立多個項目
- **功能導向**: 項目名稱應描述「做什麼」，而非「怎麼做」
- **適當粒度**: 單一功能整合為一個項目，不過度細分

### 2️⃣ 檔案結構與命名原則 📁
專案進度相關檔案統一存放於 `project-process/` 目錄下：

| 資料夾 | 用途 | 命名範例 |
|-------|------|---------|
| `features/` | 功能規格與詳細說明文件 | `user-login-auth.html` |
| `dev-logs/` | 開發過程日誌 (技術決策、實作細節) | `dev-user-login-2026-02-13.md` |
| `test-logs/` | 測試執行日誌 (測試案例、結果截圖) | `test-user-login-2026-02-13.md` |

- **命名規範**: `[type]-[feature-name]-[date].[ext]`
- **連結方式**: 在 `roadmap.js` 中使用相對路徑連結 (例如: `../dev-logs/filename.md`)

---

## 🔧 執行步驟

### Step 1: 收集資訊 📊
收集今日完成的所有開發工作：
- 修改的檔案清單及路徑
- 功能變更描述
- 測試結果數據 (覆蓋率、通過率)
- 相關文檔路徑

### Step 2: 建立/更新日誌檔案 📝

1. **開發日誌 (Dev Log)**
   - 位置: `project-process/dev-logs/`
   - 格式: Markdown
   - 內容: 技術實作細節、遇到的問題與解決方案、程式碼片段

2. **測試日誌 (Test Log)**
   - 位置: `project-process/test-logs/`
   - 格式: Markdown
   - 內容: 測試案例清單、測試執行結果、覆蓋率報告

3. **功能說明 (Feature Doc) - 選用**
   - 位置: `project-process/features/`
   - 格式: HTML (使用標準模板)
   - 內容: 功能規格、驗收標準、UI/UX 設計圖

### Step 3: 更新 roadmap.js 🔄

**檔案位置**: `project-process/project-progress-dashboard/roadmap.js`

**更新邏輯**:
1. **讀取資料**: 讀取 `window.ROADMAP_DATA`
2. **任務識別**: 
   - 若有指定 **任務編號 (ID)**，直接更新該項目
   - 若無指定，則在 `features` 陣列末端新增
3. **欄位更新**:
   - `percentage`: 更新開發進度 (0-100)
   - `testCoverage`: 更新測試覆蓋率 (0-100)
   - `devLog`: **附加** 今日重點摘要 (條列式)，並附上 `[詳情](dev-logs/xxx.md)` 連結
   - `testProgress`: **附加** 今日測試摘要，並附上 `[詳情](test-logs/xxx.md)` 連結
   - `lastModifiedDate`: 更新為今日 (`YYYY/MM/DD`)
   - `lastModifiedBy`: 更新為你的名稱

**新增項目範例**:
```javascript
{
    name: "功能名稱",
    category: "分類名稱",
    percentage: 50,                  // 開發進度
    testCoverage: 80,                // 測試覆蓋率
    acceptanceCriteria: "1. 標準A\n2. 標準B",
    docPath: "../features/feature-name.html",  // 功能說明文件 (選填)
    devLog: "[2026/02/13] 完成核心邏輯開發，解決了 Auth 問題。\n詳見: [開發日誌](../dev-logs/dev-feature-20260213.md)",
    testProgress: "[2026/02/13] 單元測試通過率 100%。\n詳見: [測試日誌](../test-logs/test-feature-20260213.md)",
    owner: "Team A",
    points: 5,
    lastModifiedBy: "AI Assistant",
    lastModifiedDate: "2026/02/13"
}
```

### Step 4: 驗證更新 ✅

**檢查清單**:
- [ ] `roadmap.js` 語法正確 (注意逗號與引號)
- [ ] `lastUpdated` 全域時間已更新
- [ ] 日誌檔案已正確建立於對應資料夾
- [ ] `roadmap.js` 中的連結路徑正確指向新建立的日誌檔案
- [ ] 儀表板可正常顯示且連結可點擊

---

## 📝 開發日誌模板 (Markdown)

```markdown
# 開發日誌: [功能名稱]

**日期**: YYYY/MM/DD  
**作者**: [AI Name]  
**狀態**: [進行中/已完成]

## 🛠️ 實作內容
- [ ] 實作項目 1
- [ ] 實作項目 2

## 🔧 技術細節
- 使用了 X 技術解決 Y 問題
- 關鍵程式碼說明...

## 🐛 遇到的問題與解決方案
- **問題**: ...
- **解決**: ...
```

## 📝 測試日誌模板 (Markdown)

```markdown
# 測試日誌: [功能名稱]

**日期**: YYYY/MM/DD  
**覆蓋率**: XX%

## ✅ 測試案例
| ID | 案例描述 | 預期結果 | 實際結果 | 狀態 |
|----|----------|----------|----------|------|
| T1 | ...      | ...      | ...      | PASS |

## 📊 測試報告摘要
- 單元測試: X 個通過
- 整合測試: Y 個通過
```
