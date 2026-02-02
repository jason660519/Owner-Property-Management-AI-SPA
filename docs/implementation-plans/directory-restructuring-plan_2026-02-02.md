# Directory Restructuring Plan - English-Only Names
# 目錄重構計劃 - 英文專用名稱

> **Created Date**: 2026-02-02  
> **Created By**: Claude Sonnet 4.5  
> **Status**: Ready to Execute / 準備執行  
> **Purpose**: Rename all Chinese directory and file names to English to avoid encoding issues  
> **目的**: 將所有中文目錄和檔案名改為英文，避免編碼問題

---

## 🎯 Objective / 目標

**Rename all Chinese directory and file names to English while preserving all content.**  
**將所有中文目錄和檔案名改為英文，同時保留所有內容。**

### Why? / 為什麼？

- ✅ Avoid encoding issues on exFAT file systems / 避免 exFAT 檔案系統的編碼問題
- ✅ Better cross-platform compatibility / 更好的跨平台兼容性
- ✅ Prevent file corruption / 防止檔案損壞
- ✅ Easier for international collaboration / 便於國際協作
- ✅ Prevent `._*` metadata file issues / 避免 `._*` 元數據檔案問題

---

## 📋 Directory Renaming Plan / 目錄重命名計劃

### Current Structure (Chinese) / 當前結構（中文）

```
docs/
├── 硬體與軟體技術選型說明/
├── 產品概述及使用場景說明/
├── progress-reports/
│   ├── OCR開發進度報告/
│   ├── 工程師每日工作報告/
│   └── 資料庫進度報告/
└── 本專案檔案命名規則與新增文件歸檔總則.md
```

### New Structure (English) / 新結構（英文）

```
docs/
├── technical-selection/        # 硬體與軟體技術選型說明
├── product-overview/           # 產品概述及使用場景說明
├── progress-reports/
│   ├── ocr-development/        # OCR開發進度報告
│   ├── daily-reports/          # 工程師每日工作報告
│   └── database-reports/       # 資料庫進度報告
└── file-naming-guidelines.md   # 本專案檔案命名規則與新增文件歸檔總則
```

---

## 🔄 Detailed Renaming Map / 詳細重命名對照表

### Level 1: docs/ subdirectories / 第一層：docs/ 子目錄

| Current Name (Chinese)                    | New Name (English)          | Description                          |
| :---------------------------------------- | :-------------------------- | :----------------------------------- |
| `硬體與軟體技術選型說明/`                 | `technical-selection/`      | Technical architecture and selection |
| `產品概述及使用場景說明/`                 | `product-overview/`         | Product requirements and use cases   |
| `本專案檔案命名規則與新增文件歸檔總則.md` | `file-naming-guidelines.md` | File naming and archiving guidelines |

| 當前名稱（中文）                          | 新名稱（英文）              | 說明               |
| :---------------------------------------- | :-------------------------- | :----------------- |
| `硬體與軟體技術選型說明/`                 | `technical-selection/`      | 技術架構與選型決策 |
| `產品概述及使用場景說明/`                 | `product-overview/`         | 產品需求與使用場景 |
| `本專案檔案命名規則與新增文件歸檔總則.md` | `file-naming-guidelines.md` | 檔案命名與歸檔總則 |

### Level 2: progress-reports/ subdirectories / 第二層：progress-reports/ 子目錄

| Current Name (Chinese) | New Name (English)  | Description                      |
| :--------------------- | :------------------ | :------------------------------- |
| `OCR開發進度報告/`     | `ocr-development/`  | OCR development progress reports |
| `工程師每日工作報告/`  | `daily-reports/`    | Daily work reports               |
| `資料庫進度報告/`      | `database-reports/` | Database progress reports        |

| 當前名稱（中文）      | 新名稱（英文）      | 說明               |
| :-------------------- | :------------------ | :----------------- |
| `OCR開發進度報告/`    | `ocr-development/`  | OCR 開發進度報告   |
| `工程師每日工作報告/` | `daily-reports/`    | 工程師每日工作報告 |
| `資料庫進度報告/`     | `database-reports/` | 資料庫進度報告     |

---

## 📝 File Renaming Plan / 檔案重命名計劃

### Files to Rename / 需要重命名的檔案

**We will NOT rename individual report files at this time to preserve Git history.**  
**我們暫時不重命名個別報告檔案，以保留 Git 歷史記錄。**

**Only directory names will be changed.**  
**僅更改目錄名稱。**

---

## 🚀 Execution Steps / 執行步驟

### Step 1: Backup / 備份

```bash
# Create backup
cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA
tar -czf docs_backup_before_rename_2026-02-02.tar.gz docs/
```

### Step 2: Rename Directories / 重命名目錄

```bash
cd docs/

# Level 1 directories
mv "硬體與軟體技術選型說明" "technical-selection"
mv "產品概述及使用場景說明" "product-overview"

# Level 2 directories under progress-reports/
cd progress-reports/
mv "OCR開發進度報告" "ocr-development"
mv "工程師每日工作報告" "daily-reports"
mv "資料庫進度報告" "database-reports"

# Back to docs/
cd ..

# Rename main guideline file
mv "本專案檔案命名規則與新增文件歸檔總則.md" "file-naming-guidelines-old.md"
```

### Step 3: Update References / 更新引用

**Files that need to be updated / 需要更新的檔案：**

1. `CLAUDE.md` - Update directory structure
2. `.claude/rules/general.md` - Update file organization
3. `README.md` - Update documentation links
4. Any files that reference the old directory names

### Step 4: Verify / 驗證

```bash
# Check new structure
tree docs/ -L 2

# Check for any remaining Chinese directory names
find docs/ -type d | grep -E '[\u4e00-\u9fa5]'

# Check for any remaining Chinese file names (optional)
find docs/ -type f -name "*.md" | grep -E '[\u4e00-\u9fa5]'
```

---

## 📊 Impact Analysis / 影響分析

### Files Affected / 受影響的檔案

| File                             | Update Required   | Description                        |
| :------------------------------- | :---------------- | :--------------------------------- |
| `CLAUDE.md`                      | ✅ Yes             | Update directory structure section |
| `.claude/rules/general.md`       | ✅ Yes             | Update file organization section   |
| `README.md`                      | ✅ Yes             | Update documentation links         |
| `docs/file-naming-guidelines.md` | ✅ Already updated | New version created                |

| 檔案                             | 需要更新 | 說明             |
| :------------------------------- | :------- | :--------------- |
| `CLAUDE.md`                      | ✅ 是     | 更新目錄結構章節 |
| `.claude/rules/general.md`       | ✅ 是     | 更新檔案組織章節 |
| `README.md`                      | ✅ 是     | 更新文檔連結     |
| `docs/file-naming-guidelines.md` | ✅ 已更新 | 已創建新版本     |

### Git Impact / Git 影響

**Git will track directory renames automatically.**  
**Git 會自動追蹤目錄重命名。**

```bash
# Git will show:
# renamed: docs/硬體與軟體技術選型說明/ -> docs/technical-selection/
# renamed: docs/產品概述及使用場景說明/ -> docs/product-overview/
# etc.
```

---

## ⚠️ Important Notes / 重要注意事項

### Before Execution / 執行前

1. ✅ **Backup created** / 已創建備份
2. ✅ **Team notified** / 已通知團隊
3. ✅ **No pending commits** / 沒有待提交的變更

### During Execution / 執行中

1. ⚠️ **Do NOT interrupt** / 不要中斷
2. ⚠️ **Execute in order** / 按順序執行
3. ⚠️ **Verify each step** / 驗證每一步

### After Execution / 執行後

1. ✅ **Verify structure** / 驗證結構
2. ✅ **Update references** / 更新引用
3. ✅ **Test build** / 測試建置
4. ✅ **Commit changes** / 提交變更

---

## 🎯 Success Criteria / 成功標準

### Checklist / 檢查清單

- [ ] All Chinese directory names renamed to English / 所有中文目錄名已改為英文
- [ ] All files preserved / 所有檔案已保留
- [ ] References updated / 引用已更新
- [ ] Build successful / 建置成功
- [ ] Git history preserved / Git 歷史已保留
- [ ] Backup created / 已創建備份

---

## 📞 Rollback Plan / 回滾計劃

**If anything goes wrong / 如果出現問題：**

```bash
# Restore from backup
cd /Volumes/KLEVV-4T-1/Real\ Estate\ Management\ Projects/Owner-Property-Management-AI-SPA
rm -rf docs/
tar -xzf docs_backup_before_rename_2026-02-02.tar.gz
```

---

## 🎊 Expected Result / 預期結果

### Before / 之前

```
docs/
├── 硬體與軟體技術選型說明/  ❌ Chinese
├── 產品概述及使用場景說明/  ❌ Chinese
└── progress-reports/
    ├── OCR開發進度報告/      ❌ Chinese
    ├── 工程師每日工作報告/    ❌ Chinese
    └── 資料庫進度報告/        ❌ Chinese
```

### After / 之後

```
docs/
├── technical-selection/      ✅ English
├── product-overview/         ✅ English
└── progress-reports/
    ├── ocr-development/      ✅ English
    ├── daily-reports/        ✅ English
    └── database-reports/     ✅ English
```

---

**Ready to execute? / 準備執行？**

**Please confirm before I proceed with the renaming.**  
**請確認後我再繼續執行重命名。**

---

**Created Date**: 2026-02-02  
**Created By**: Claude Sonnet 4.5  
**Version**: 1.0  
**Status**: Ready to Execute / 準備執行
