# Changelog

> **創建日期**: 2026-01-31  
> **創建者**: Claude Sonnet 4.5  
> **最後修改**: 2026-01-31  
> **修改者**: Claude Sonnet 4.5  
> **版本**: 1.0  
> **文件類型**: 版本變更歷史

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- 🔧 **[2026-01-31]** Web 端構建工具由 Turbopack 切換至 Webpack
  - **原因**: Turbopack (Next.js 15 實驗性功能) 的快取資料庫在配置檔變更時容易損壞，導致開發服務器頻繁崩潰
  - **影響**: 提升開發環境穩定性，無需手動清除快取
  - **權衡**: 熱更新速度略降，但換來更可靠的開發體驗
  - **修改檔案**: 
    - `apps/web/package.json` - 移除 `next dev --turbo` 的 `--turbo` 參數
    - `本案開發環境快速啟動指南.md` - 移除 Turbopack 快取清除步驟
    - `setup-phase-one.sh` - 簡化啟動腳本，移除快取清理邏輯

### Added
- 📚 **[2026-01-31]** 新增技術棧說明文檔 (`docs/專案架構說明/技術棧說明.md`)
- 📊 **[2026-01-31]** 新增開發環境服務檢測報告 (`docs/開發環境檢測報告_2026-01-31.md`)
  - 詳細列出 11 個可訪問的服務端點
  - 包含 Supabase 9 個後端服務和 2 個前端應用

### Fixed
- ✅ **[2026-01-31]** 修正開發服務器因 Turbopack 快取損壞導致的穩定性問題
- ✅ **[2026-01-30]** 修正首頁設計系統對齊（Inter 字體、12px 圓角、1440px 最大寬度）
- ✅ **[2026-01-30]** 修正圖片配置以支援遠程圖片載入（Unsplash）

---

## [2.0.0] - 2026-01-30

### Changed
- 🏗️ 專案架構升級為 Monorepo (Turborepo)
- 📱 更新術語：將"租客網站"改為"公司官網"，準確反映其作為產品介紹與多用戶登入入口的功能

### Added
- 📦 整合 apps/web (Next.js 15) 和 apps/mobile (Expo 54)
- 📦 建立共用套件結構 (packages/ui, packages/utils)
- 📚 完善文檔結構與快速啟動指南

### Verified
- ✅ 雙端服務同時啟動正常運行
- ✅ Supabase 本地服務整合成功
- ✅ 前後端連線測試通過

---

## [1.0.0] - 2026-01-22

### Added
- 🎉 初始專案結構建立
- 🗄️ Supabase 本地開發環境設置
- 📊 資料庫表格結構設計（building_title_records, land_title_records, property_appointments 等）

### Verified
- ✅ 前後端連線測試通過
- ✅ 所有 Supabase 服務正常運行

---

## 圖例說明

- 🔧 技術選型變更
- 🏗️ 架構調整
- 📚 文檔更新
- 📦 新增功能
- ✅ 問題修正
- 📊 資料/報告
- 🎉 重要里程碑
- 📱 行動端相關
- 🌐 Web 端相關
- 🗄️ 資料庫相關
