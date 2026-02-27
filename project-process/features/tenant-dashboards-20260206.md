# 租客儀表板 (已簽約/潛在) - 技術報告

> 由 HTML 遷移為 Markdown，以利 AI 讀取與版本控制。原始檔：`tenant-dashboards-20260206.html`

---

# 租客儀表板功能實作報告

## 📊 執行摘要

- 完成「已簽約租客」與「潛在租客」的分流儀表板

- 整合共用 `DashboardLayout` 與 `StatsGrid` 元件

- 實作 Server Actions 獲取即時數據 (Lease Status, Applications)

## 🔧 技術實作

租客儀表板根據用戶狀態分為兩個獨立路由：

- 已簽約 (Contracted): `/tenant/contracted/dashboard`

- 潛在 (Potential): `/tenant/potential/dashboard`

### 關鍵程式碼片段

使用 `getTenantDashboardStats` 獲取合約與繳費資訊：

```
// apps/web/app/(dashboard)/tenant/contracted/dashboard/page.tsx
const kpis: KPIConfig[] = [
{
title: '當前租約狀態',
value: stats ? `${leaseEndDays} 天到期` : '-',
icon: FileText,
color: 'text-blue-500',
// ...
}
]
```

## ✅ 測試結果

- 路由分流: 成功區分不同狀態租客

- 數據加載: Server Actions 正常回傳 JSON 數據

- 響應式: 在手機與桌面版皆顯示正常

## 💡 經驗總結

將「潛在」與「已簽約」租客分開設計，能更精準地提供相關資訊（如：潛在租客關注看房，已簽約租客關注繳費），提升 UX。
