# 開發日誌：超級管理員功能群組批次實作

> **創建日期**: 2026-02-21 | **創建者**: Claude Sonnet 4.6
> **最後修改**: 2026-02-21 | **版本**: 1.0
> **分支**: `fix/test-ts-errors`

---

## 本次實作範圍

依計畫文件依序實作超級管理員 11 項功能中的 6 項，全部通過 `npm run build`（零 TypeScript 錯誤）。

---

## 各功能完成狀態

### Feature 2：網站行為監控（0% → 70%）

**新建檔案：**
```
supabase/migrations/20260221100000_behavior_logs.sql
apps/superadmin/app/superadmin/dashboard/behavior-monitoring/
  page.tsx                                    ← Server Component
  actions.ts                                  ← 5 個 server actions
  components/BehaviorMonitoringClient.tsx     ← Client Component 主容器
  components/BehaviorStatsCards.tsx           ← 6 張統計卡（總事件/活躍用戶/IP/異常/PAGE_VIEW/API_CALL）
  components/BehaviorChart.tsx                ← SVG 折線圖（30 天趨勢）
  components/BehaviorLogsTable.tsx            ← 可篩選/分頁日誌表
```

**DB Schema：**
- `behavior_logs` 資料表：`user_id, page_path, action_type (enum), ip_address, is_anomaly, metadata, created_at`
- RLS：super_admins 讀取、service_role 寫入+更新
- Index：`created_at DESC, user_id, ip_address, is_anomaly (partial)`
- SQL function：`cleanup_old_behavior_logs()`（>90 天自動清理）
- SQL function：`detect_behavior_anomalies()`（同 IP 1 分鐘 >100 次 → is_anomaly = true）
- View：`behavior_daily_stats`（每日彙整，供折線圖使用）

**Server Actions（`actions.ts`）：**
| Action | 用途 |
|---|---|
| `getBehaviorLogs(filter)` | 多條件篩選分頁查詢 |
| `getBehaviorStats()` | 30 天彙整統計 |
| `getDailyStats()` | 每日資料（從 view 取得） |
| `getAnomalies(limit)` | 取得異常記錄 |
| `runAnomalyDetection()` | 觸發 RPC 更新異常標記 |

**待後續工程師完成：**
- [ ] 在 `apps/superadmin/middleware.ts` 加入 fire-and-forget 行為記錄（呼叫 `/api/behavior-log` route handler 寫入 behavior_logs）
- [ ] Unit test：異常偵測邏輯（>`100次/分鐘` 規則）
- [ ] E2E：頁面載入、統計卡顯示、篩選功能

---

### Feature 8：AI LLM API 效能監控（0% → 65%）

**新建檔案：**
```
apps/superadmin/app/superadmin/dashboard/llm-monitor/
  page.tsx              ← Server Component（Promise.all 並發取資料）
  actions.ts            ← 3 個 server actions
  LLMMonitorClient.tsx  ← Client Component 主 UI
```

**連接資料表：** `ai_performance_metrics`（已存在於 `20260130000004_super_admin_tables.sql`）
欄位：`model_id, prompt_tokens, completion_tokens, total_cost, latency_ms, user_feedback_score, created_at`

**功能：**
- 5 張 Overall Stats 卡（總請求數、平均延遲、總花費、平均評分、模型數）
- 各模型效能比較表（依請求數排序、延遲顏色標示 <500ms/1500ms/超過）
- 最近 50 筆記錄明細

**待後續工程師完成：**
- [ ] API 使用量預算上限與警示閾值設定 UI
- [ ] 每日/週 Token 消耗統計折線圖
- [ ] API 密鑰輪換提醒功能（需連接 secret management）
- [ ] E2E 測試

---

### Feature 10：網站效能監控（0% → 65%）

**新建檔案：**
```
supabase/migrations/20260221110000_web_vitals.sql
apps/superadmin/app/superadmin/dashboard/performance/
  page.tsx                        ← Server Component
  actions.ts                      ← 3 個 server actions
  vitals-utils.ts                 ← 純工具函數（getLCPRating/getCLSRating/getTTFBRating）
  PerformanceMonitorClient.tsx    ← Client Component 主 UI
```

**⚠️ 重要：`vitals-utils.ts` 的設計原因**
`PerformanceMonitorClient.tsx` 是 `'use client'` 組件，無法直接 import `'use server'` 檔案中的純函數。因此評級函數必須放在 `vitals-utils.ts`（無 `'use server'` 宣告）。

**DB Schema：**
- `web_vitals` 資料表：`page_path, lcp_ms, fid_ms, cls_score, ttfb_ms, fcp_ms, inp_ms, connection_type, device_type, session_id`
- View：`web_vitals_page_summary`（使用 `PERCENTILE_CONT(0.75)` 計算 p75 LCP）
- RLS：super_admins 讀取、service_role 寫入

**Core Web Vitals 評級標準（Google CWV）：**
| 指標 | 良好 | 需改善 | 差 |
|---|---|---|---|
| LCP | < 2500ms | 2500-4000ms | ≥ 4000ms |
| CLS | < 0.1 | 0.1-0.25 | ≥ 0.25 |
| TTFB | < 800ms | 800-1800ms | ≥ 1800ms |

**待後續工程師完成：**
- [ ] 前端埋點：在 `apps/web` 使用 `web-vitals` npm 套件上報 CWV 資料至 `/api/web-vitals` route handler
- [ ] API 延遲 Top 10 端點列表（需從 Next.js instrumentation 或 APM 取得）
- [ ] 效能劣化趨勢自動警示
- [ ] E2E 測試

---

### Feature 6：資料庫 Supabase 管理（0% → 60%）

**修改檔案：**
```
apps/superadmin/app/superadmin/dashboard/supabase/
  page.tsx                      ← 改為 Server Component，連接真實資料
  SupabaseDashboardClient.tsx   ← 新建 Client Component（原 page.tsx 靜態 mock 移除）
```

**實作內容：**
- 連線健康度：`iam_groups` 簡單查詢作為 ping test
- 各資料表記錄數：使用 `Promise.allSettled` 並發查詢 9 張已知資料表
- RLS 政策：透過 `supabase.rpc('get_rls_policies')` 取得（若 RPC 不存在則不顯示，graceful fallback）
- 8 個 Supabase Dashboard 快速連結（自動拼接 `projectRef`）

**待後續工程師完成：**
- [ ] 建立 `get_rls_policies` RPC（查詢 `pg_policies` 系統表），讓 RLS 政策欄位實際顯示
- [ ] Migration 歷史紀錄列表（讀取 `supabase_migrations` schema 表）
- [ ] 手動備份觸發（需 Supabase Management REST API token）
- [ ] 連線數即時監控（需 `pg_stat_activity` 查詢 RPC）

---

### Feature 3：RBAC CRUD 平台（0% → 75%）

**修改/新建檔案：**
```
supabase/migrations/20260221120000_rbac_audit_and_inheritance.sql
apps/superadmin/app/superadmin/dashboard/rbac_access_control/
  actions.ts    ← 完全重寫，加入稽核日誌 + 繼承 + 刪除前檢查
  page.tsx      ← 完全重寫，加入稽核日誌分頁 + 繼承選擇器 + 刪除前確認
```

**DB Schema 新增：**
- `iam_roles.parent_role_id`（自身參照 FK）
- `rbac_audit_logs`：`role_id, role_name, action (enum), actor_id, actor_email, changes (JSONB), created_at`

**新增 Actions：**
| Action | 用途 |
|---|---|
| `getRoles()` | 加入 `parent_role_id` 欄位 |
| `getRbacAuditLogs(limit)` | 取得稽核日誌 |
| `checkRoleUsers(roleId)` | 刪除前檢查指派用戶數 |
| `createRole(formData)` | 建立角色 + 寫入稽核日誌 |
| `updateRole(formData)` | 更新角色 + 寫入稽核日誌 |
| `deleteRole(id, name, actorEmail)` | 刪除前檢查 → 刪除 → 稽核日誌 |

**UI 新增：**
- Permission Matrix / 稽核日誌 雙分頁
- 建立/編輯 Modal 加入「繼承父角色」下拉選單
- 刪除時若有指派用戶，顯示紅色錯誤 Banner（不中斷流程，只顯示訊息）

**待後續工程師完成：**
- [ ] `checkRoleUsers` 目前查 `iam_user_group_memberships`（以 group_id = role_id 近似）；若有獨立 `iam_user_roles` 資料表請改接
- [ ] Permission Matrix 目前為 UI-only（視覺展示），需接入 DB 儲存（`iam_role_permissions` 資料表）
- [ ] 角色繼承的實際權限計算邏輯
- [ ] E2E 測試

---

### Feature 4：雲端空間管理（0% → 70%）

**修改/新建檔案：**
```
supabase/migrations/20260221130000_storage_quotas.sql
apps/superadmin/app/actions/storage.ts   ← 補充 3 個新 actions
```

**DB Schema：**
- `storage_quotas`：`user_id (UNIQUE), quota_bytes (default 1GB), used_bytes, notes, set_by`
- Trigger：`storage_quotas_updated_at`（自動更新 `updated_at`）
- RLS：super_admins 全操作、users 讀取自身配額

**新增 Actions：**
| Action | 用途 |
|---|---|
| `getStorageQuotas()` | 取得全部配額設定 |
| `setUserQuota(userId, quotaBytes, notes)` | Upsert 配額（conflict on user_id） |
| `batchDeleteFiles(bucket, paths)` | 分塊批次刪除（每次 20 個，避免 Supabase 限制） |

**待後續工程師完成：**
- [ ] StorageDashboardClient.tsx quota tab：目前有 UI 框架但配額數據未接入 `storage_quotas` 資料表
- [ ] 超過配額 75% 自動警示邏輯
- [ ] E2E 測試

---

## Sidebar 導航新增

`apps/superadmin/components/layout/Sidebar.tsx` 新增 3 個導航項目：

```typescript
{ name: 'Behavior Monitor', href: '/superadmin/dashboard/behavior-monitoring', icon: Activity },
{ name: 'Performance Monitor', href: '/superadmin/dashboard/performance', icon: Gauge },
{ name: 'AI LLM Monitor', href: '/superadmin/dashboard/llm-monitor', icon: Brain },
```

---

## 技術難點與解決方案

### 問題 1：Client Component 無法 import Server Action 的純函數
**情境**：`PerformanceMonitorClient.tsx`（`'use client'`）需要 `getLCPRating` 等評級函數，這些函數原本在 `actions.ts`（`'use server'`）中。Build 時報錯：`exported function doesn't exist`。

**解決**：將純工具函數移至 `vitals-utils.ts`（無 `'use server'` 宣告），Client Component 從此 import；Server Actions 保留在 `actions.ts`。

**規則**：`'use server'` 檔案只能被 Server Component 或 `useTransition` 的 action 呼叫；純函數須放在中性模組。

---

### 問題 2：Badge `variant="danger"` 不存在
**情境**：Badge 組件只支援 `'default' | 'success' | 'warning' | 'error' | 'info'`，不支援 `'danger'`，TypeScript build 失敗。

**解決**：改用 `variant="error"`。

---

### 問題 3：StorageDashboardClient 使用 DashboardLayout
StorageDashboardClient 使用了 `DashboardLayout` wrapper，而其他新頁面直接用 `div` 包。兩種方式都可行，但需注意不要重複加 padding。

---

## 資料表一覽（本次新增）

| 資料表 | Migration 檔案 | 說明 |
|---|---|---|
| `behavior_logs` | `20260221100000` | 行為追蹤 + 異常偵測 |
| `web_vitals` | `20260221110000` | Core Web Vitals 效能記錄 |
| `rbac_audit_logs` | `20260221120000` | RBAC 變更稽核日誌 |
| `storage_quotas` | `20260221130000` | 用戶儲存配額設定 |
| `iam_roles.parent_role_id` | `20260221120000` | 角色繼承欄位（ALTER） |

---

## Build 驗證

```bash
cd apps/superadmin && npm run build
# ✓ Compiled successfully in 7.5s
# ✓ Generating static pages (34/34)

# 新增路由：
# ƒ /superadmin/dashboard/behavior-monitoring
# ƒ /superadmin/dashboard/llm-monitor
# ƒ /superadmin/dashboard/performance
# ○ /superadmin/dashboard/rbac_access_control
# ƒ /superadmin/dashboard/storage
# ƒ /superadmin/dashboard/supabase
```

---

## 下階段優先工作（給接手工程師）

### 優先度：高
1. **behavior_logs 前端埋點**：在 `apps/superadmin/middleware.ts` 加入 fire-and-forget 寫入（參考計畫文件）
2. **web_vitals 前端埋點**：在 `apps/web` 使用 `web-vitals` 套件，建立 `/api/web-vitals` route handler 接收上報
3. **Storage Quota UI 接真實資料**：StorageDashboardClient.tsx 的 quota tab 目前是 UI 框架，要呼叫 `getStorageQuotas()` 並整合 `setUserQuota` modal

### 優先度：中
4. **Feature 5（Access Matrix）**：`role_access_matrix/page.tsx` 已存在（60%），確認功能缺口並補強
5. **Feature 9（網路安全/隱私稽核）**：`iam-management/page.tsx` 是 mock data，接真實 `audit_logs` 資料表
6. **RBAC Permission Matrix 持久化**：建立 `iam_role_permissions` 資料表，讓 Permission Matrix 的勾選儲存到 DB

### 優先度：低
7. **Supabase RLS 政策顯示**：建立 `get_rls_policies()` RPC（查 `pg_policies`）
8. **LLM Monitor 圖表**：加入每日 Token 消耗折線圖
9. **各功能 E2E 測試**

---

## 相關文件

- [行為監控頁面](/superadmin/dashboard/behavior-monitoring)
- [AI LLM 監控頁面](/superadmin/dashboard/llm-monitor)
- [效能監控頁面](/superadmin/dashboard/performance)
- [RBAC 管理頁面](/superadmin/dashboard/rbac_access_control)
- [雲端空間管理](/superadmin/dashboard/storage)
- [Supabase 管理](/superadmin/dashboard/supabase)
- [專案進度儀表板](/superadmin/dashboard/project-progress)
