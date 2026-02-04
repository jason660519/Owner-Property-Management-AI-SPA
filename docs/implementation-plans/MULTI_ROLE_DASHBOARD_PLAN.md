# 多角色儀表板完整實作計劃

> **創建日期**: 2026-02-05
> **創建者**: Claude Sonnet 4.5
> **最後修改**: 2026-02-05
> **修改者**: Claude Sonnet 4.5
> **預估工時**: 25-30 工作天
> **版本**: 2.0

---

## 🎯 專案目標

根據開發儀表板 http://localhost:3001/ 的現有架構與設計模式，完整實作系統中所有角色專屬的儀表板頁面。

### 目標角色清單

| # | 角色 | 英文名稱 | 狀態 | 優先級 | 說明 |
|---|------|---------|------|--------|------|
| 1 | 房東 | Landlord | ✅ 已部分完成 | P0 | 物件擁有者 |
| 2 | 簽約租客 | Contracted Tenant | ⏳ 待實作 | P0 | 已簽署租約的租客 |
| 3 | 潛在租客 | Potential Tenant | ⏳ 待實作 | P0 | 尋找租屋的潛在客戶 |
| 4 | 簽約買家 | Contracted Buyer | ⏳ 待實作 | P1 | 已簽署購買合約的買家 |
| 5 | 潛在買家 | Potential Buyer | ⏳ 待實作 | P1 | 尋找購屋的潛在客戶 |
| 6 | 仲介 | Agent | ⏳ 待實作 | P1 | 房地產仲介 |
| 7 | 服務提供者 | Service Provider | ⏳ 待實作 | P2 | 維修、清潔等服務商 |
| 8 | 超級管理員 | Super Admin | ⏳ 待實作 | P2 | 系統管理員 |

**角色差異說明**：
- **簽約 vs 潛在**：簽約角色已有正式合約，潛在角色為意向客戶
- **數據存取權限**：簽約角色可查看合約詳情、付款記錄；潛在角色僅可查看瀏覽記錄、預約記錄
- **功能差異**：簽約角色需管理義務（繳款、維修），潛在角色專注搜尋與預約

---

## 📊 現況分析

### 已完成功能

✅ **Landlord Dashboard** (房東儀表板)
- 路徑: `/landlord/dashboard`
- 功能: KPI 卡片、物件總數、出租率、月收入、年收入
- 問題:
  - 使用模擬數據，未連接 Supabase
  - 缺少進度超連結
  - 缺少角色切換功能

### 待實作功能

❌ **其他 7 個角色的儀表板**（簽約租客、潛在租客、簽約買家、潛在買家、仲介、服務提供者、超級管理員）
❌ **角色切換選單**（支援 8 種角色切換）
❌ **角色狀態轉換**（潛在 → 簽約的自動切換）
❌ **進度超連結系統**
❌ **統一的 Loading/Error/Empty States**
❌ **RWD 響應式優化**
❌ **單元測試 & E2E 測試**

---

## 🏗️ 架構設計

### 1. 通用 Dashboard 模板

創建一個可重用的 Dashboard 模板組件：

```
components/dashboard/
├── DashboardLayout.tsx        # 通用佈局（麵包屑、角色切換）
├── KPICard.tsx                # KPI 卡片組件
├── ProgressLink.tsx           # 進度超連結組件
├── RoleSwitcher.tsx           # 角色切換選單
├── StatsGrid.tsx              # 統計數據網格
└── types.ts                   # TypeScript 類型定義
```

### 2. 角色專屬配置

每個角色有獨立的配置檔案：

```
lib/config/dashboards/
├── landlord.ts                # 房東配置
├── tenant.ts                  # 租客配置
├── buyer.ts                   # 買家配置
├── agent.ts                   # 仲介配置
├── service-provider.ts        # 服務提供者配置
└── super-admin.ts             # 超級管理員配置
```

### 3. 進度超連結系統

```typescript
interface ProgressLink {
  label: string
  href: string
  query?: Record<string, string>
  badge?: {
    count: number
    variant: 'info' | 'warning' | 'success' | 'error'
  }
}

interface KPIConfig {
  title: string
  value: number | string
  icon: React.ComponentType
  color: string
  trend?: {
    value: number
    direction: 'up' | 'down'
    label: string
  }
  progressLinks: ProgressLink[]
}
```

---

## 📅 分階段執行計劃

### Phase 1: 基礎架構 (3-4 天)

**目標**: 建立通用 Dashboard 架構

**工作項目**:
1. 創建通用 Dashboard 組件
   - `DashboardLayout.tsx` - 統一佈局
   - `KPICard.tsx` - 可重用的 KPI 卡片
   - `ProgressLink.tsx` - 進度超連結組件
   - `RoleSwitcher.tsx` - 角色切換選單

2. 創建配置系統
   - Dashboard 配置介面定義
   - 角色權限對照表
   - 路由配置

3. 重構現有 Landlord Dashboard
   - 使用新的通用組件
   - 添加進度超連結
   - 連接 Supabase 實際數據

**交付物**:
- ✅ 通用組件程式碼
- ✅ Landlord Dashboard 重構完成
- ✅ 技術文檔

---

### Phase 2: 租客儀表板（簽約 & 潛在） (5-6 天)

**目標**: 實作 P0 優先級的租客儀表板（區分簽約與潛在狀態）

#### Contracted Tenant Dashboard (簽約租客儀表板)

**路徑**: `/tenant/contracted/dashboard` 或 `/tenant/dashboard?status=contracted`

**角色特徵**: 已簽署租約，擁有合約權利與義務

**KPI 指標**:
1. 當前租約狀態
   - 租約到期日（距今天數提醒）
   - 月租金金額
   - 押金狀態（已繳/未繳/退還中）
   - **進度連結**:
     - 「查看租約詳情」→ `/tenant/leases/{id}`
     - 「續約申請」→ `/tenant/leases/{id}/renew`

2. 繳款狀態
   - 本月應繳金額
   - 已繳款次數 / 總期數
   - 逾期次數（若 > 0 顯示警告）
   - 下次繳款日期
   - **進度連結**:
     - 「查看繳款記錄」→ `/tenant/payments`
     - 「立即繳款」→ `/tenant/payments/new`

3. 維修申請
   - 待處理申請數
   - 處理中申請數
   - 已完成申請數
   - **進度連結**:
     - 「查看所有申請」→ `/tenant/maintenance`
     - 「提交新申請」→ `/tenant/maintenance/new`

4. 通知訊息
   - 未讀通知數
   - 最新重要通知預覽
   - **進度連結**: 「查看所有通知」→ `/tenant/notifications`

**資料來源**:
- `rental_contracts` - 租約資料
- `payment_records` - 繳款記錄
- `maintenance_requests` - 維修申請
- `notifications` - 通知訊息

---

#### Potential Tenant Dashboard (潛在租客儀表板)

**路徑**: `/tenant/potential/dashboard` 或 `/tenant/dashboard?status=potential`

**角色特徵**: 尋找租屋的潛在客戶，尚未簽署租約

**KPI 指標**:
1. 收藏物件
   - 收藏總數
   - 本週新增收藏
   - 價格區間分布
   - **進度連結**:
     - 「查看所有收藏」→ `/tenant/favorites`
     - 「繼續瀏覽」→ `/properties?type=rental`

2. 看房預約
   - 待確認預約數
   - 已完成看房數
   - 今日/本週預約行程
   - **進度連結**:
     - 「管理預約」→ `/tenant/viewings`
     - 「預約看房」→ `/properties?type=rental`

3. 租屋評估
   - 預算範圍設定
   - 符合條件物件數
   - 推薦物件（AI 推薦）
   - **進度連結**:
     - 「更新預算」→ `/tenant/budget`
     - 「查看推薦」→ `/tenant/recommendations`

4. 申請進度（若已申請）
   - 進行中的租屋申請
   - 房東回覆狀態
   - **進度連結**:
     - 「查看申請」→ `/tenant/applications`
     - 「提交新申請」→ `/properties?type=rental`

**資料來源**:
- `tenant_favorites` - 收藏物件（關聯 `property_rentals`）
- `property_viewings` - 看房預約
- `rental_applications` - 租屋申請（潛在租客 → 簽約租客的過渡）
- `tenant_budgets` - 預算資料

**狀態轉換**: 當租屋申請被接受並簽約後，自動從 Potential Tenant 轉為 Contracted Tenant

---

### Phase 3: 買家儀表板（簽約 & 潛在） (5-6 天)

**目標**: 實作 P1 優先級的買家儀表板（區分簽約與潛在狀態）

#### Contracted Buyer Dashboard (簽約買家儀表板)

**路徑**: `/buyer/contracted/dashboard` 或 `/buyer/dashboard?status=contracted`

**角色特徵**: 已簽署購買合約，進入交易流程

**KPI 指標**:
1. 購買進度
   - 合約簽署日期
   - 尾款金額與期限
   - 過戶預定日期
   - 交易進度百分比
   - **進度連結**:
     - 「查看合約詳情」→ `/buyer/contracts/{id}`
     - 「查看物件資訊」→ `/properties/{id}`

2. 付款狀態
   - 已付訂金金額
   - 已付款項明細
   - 待付款項目與金額
   - 下次付款日期
   - **進度連結**:
     - 「查看付款記錄」→ `/buyer/payments`
     - 「付款提醒設定」→ `/buyer/payments/reminders`

3. 貸款進度（若有貸款）
   - 貸款申請狀態
   - 核貸金額
   - 利率與期數
   - **進度連結**: 「查看貸款詳情」→ `/buyer/loans/{id}`

4. 文件檢查清單
   - 必備文件清單
   - 已提交 / 待提交
   - 審核狀態
   - **進度連結**: 「管理文件」→ `/buyer/documents`

**資料來源**:
- `purchase_contracts` - 購買合約
- `payment_records` - 付款記錄
- `loan_applications` - 貸款申請
- `buyer_documents` - 文件管理

---

#### Potential Buyer Dashboard (潛在買家儀表板)

**路徑**: `/buyer/potential/dashboard` 或 `/buyer/dashboard?status=potential`

**角色特徵**: 尋找購屋的潛在客戶，尚未簽署購買合約

**KPI 指標**:
1. 收藏物件
   - 收藏總數
   - 新增收藏本週
   - 價格區間分布
   - 平均單價分析
   - **進度連結**:
     - 「查看所有收藏」→ `/buyer/favorites`
     - 「繼續瀏覽」→ `/properties?type=sale`

2. 看房預約
   - 待確認預約數
   - 已完成看房數
   - 今日/本週預約行程
   - **進度連結**:
     - 「管理預約」→ `/buyer/viewings`
     - 「預約看房」→ `/properties?type=sale`

3. 出價記錄
   - 進行中出價數
   - 已接受出價
   - 已拒絕出價
   - **進度連結**:
     - 「查看出價記錄」→ `/buyer/offers`
     - 「提交新出價」→ `/properties?type=sale`

4. 購屋評估
   - 預算範圍設定
   - 貸款試算結果
   - 符合條件物件數
   - 推薦物件（AI 推薦）
   - **進度連結**:
     - 「更新預算」→ `/buyer/budget`
     - 「貸款試算」→ `/buyer/loan-calculator`
     - 「查看推薦」→ `/buyer/recommendations`

**資料來源**:
- `buyer_favorites` - 收藏物件（關聯 `property_sales`）
- `property_viewings` - 看房預約
- `purchase_offers` - 出價記錄
- `buyer_budgets` - 預算資料
- `loan_simulations` - 貸款試算記錄

**狀態轉換**: 當出價被接受並簽約後，自動從 Potential Buyer 轉為 Contracted Buyer

---

### Phase 4: 仲介 & 服務提供者儀表板 (4-5 天)

#### Agent Dashboard (仲介儀表板)

**路徑**: `/agent/dashboard`

**KPI 指標**:
1. 委託物件
   - 委託總數
   - 本月新增
   - **進度連結**: 「管理委託」→ `/agent/listings`

2. 成交記錄
   - 本月成交
   - 本月佣金
   - **進度連結**: 「查看成交」→ `/agent/deals`

3. 客戶管理
   - 活躍客戶數
   - 待跟進客戶
   - **進度連結**: 「客戶列表」→ `/agent/clients`

4. 看房安排
   - 今日看房
   - 本週看房
   - **進度連結**: 「查看行程」→ `/agent/schedule`

---

#### Service Provider Dashboard (服務提供者儀表板)

**路徑**: `/service-provider/dashboard`

**KPI 指標**:
1. 服務請求
   - 待接單數
   - 進行中訂單
   - **進度連結**: 「查看請求」→ `/service-provider/requests`

2. 收入統計
   - 本月收入
   - 待收款項
   - **進度連結**: 「收入明細」→ `/service-provider/income`

3. 評價統計
   - 平均評分
   - 評價總數
   - **進度連結**: 「查看評價」→ `/service-provider/reviews`

4. 行程管理
   - 今日行程
   - 本週行程
   - **進度連結**: 「管理行程」→ `/service-provider/schedule`

---

### Phase 5: 超級管理員儀表板 (3-4 天)

#### Super Admin Dashboard (超級管理員儀表板)

**路徑**: `/admin/dashboard`

**KPI 指標**:
1. 系統概況
   - 總用戶數
   - 活躍用戶數（本月）
   - **進度連結**: 「用戶管理」→ `/admin/users`

2. 物件統計
   - 總物件數
   - 待審核物件
   - **進度連結**: 「物件管理」→ `/admin/properties`

3. 交易統計
   - 本月交易數
   - 交易總額
   - **進度連結**: 「交易記錄」→ `/admin/transactions`

4. 系統健康
   - API 回應時間
   - 錯誤率
   - **進度連結**: 「系統監控」→ `/admin/monitoring`

---

### Phase 6: 測試 & 優化 (4-5 天)

**工作項目**:

1. **單元測試** (覆蓋率 >= 80%)
   - Dashboard 組件測試
   - 配置系統測試
   - 進度連結測試

2. **E2E 測試**
   - 角色切換流程測試
   - 進度連結導航測試
   - RWD 響應式測試

3. **性能優化**
   - 資料查詢優化
   - 快取策略
   - Loading States

4. **視覺優化**
   - RWD 響應式調整
   - 動畫效果
   - 無障礙功能

---

### Phase 7: 文檔 & 部署 (2-3 天)

**工作項目**:

1. **使用指南**
   - 各角色入口 URL
   - 權限對照表
   - 常見問題
   - 聯絡窗口

2. **技術文檔**
   - API 文檔
   - 組件使用指南
   - 配置說明

3. **部署準備**
   - Build 驗證
   - PR 建立
   - QA 測試
   - 上線檢查清單

---

## 🧪 測試策略

### 單元測試

```typescript
// 範例: KPICard 組件測試
describe('KPICard', () => {
  it('should render KPI data correctly', () => {})
  it('should render progress links', () => {})
  it('should handle click events', () => {})
  it('should show loading state', () => {})
  it('should show error state', () => {})
  it('should show empty state', () => {})
})
```

### E2E 測試

```typescript
// 範例: Dashboard 導航測試
test('User can navigate between roles', async ({ page }) => {
  await page.goto('/landlord/dashboard')
  await page.click('[data-testid="role-switcher"]')
  await page.click('text=租客')
  await expect(page).toHaveURL('/tenant/dashboard')
})
```

---

## 📏 驗收標準

### 功能性

- [ ] 所有 8 個角色儀表板已實作（房東、簽約租客、潛在租客、簽約買家、潛在買家、仲介、服務提供者、超級管理員）
- [ ] 角色切換功能正常運作（支援 8 種角色）
- [ ] 角色狀態轉換機制（潛在 → 簽約）
- [ ] 所有進度連結可正確跳轉
- [ ] 麵包屑導航正確顯示
- [ ] Loading/Error/Empty States 完整

### 技術性

- [ ] `npm run build` 無編譯錯誤
- [ ] 單元測試覆蓋率 >= 80%
- [ ] E2E 測試全部通過
- [ ] RWD 在 1920×1080、1366×768、手機解析度正常顯示

### 文檔性

- [ ] 角色儀表板使用指南完成
- [ ] 技術文檔完成
- [ ] PR 描述包含截圖與錄屏
- [ ] QA 回歸測試通過

---

## 🚀 快速開始（Phase 1）

### 立即可執行的第一步

由於這是一個大型專案，建議先完成 **Phase 1: 基礎架構**：

```bash
# 1. 創建通用組件目錄
mkdir -p apps/web/components/dashboard

# 2. 創建配置目錄
mkdir -p apps/web/lib/config/dashboards

# 3. 開始實作第一個組件
# 創建 DashboardLayout.tsx
```

### 預估時程

| Phase | 內容 | 工作天數 | 依賴 |
|-------|------|---------|------|
| Phase 1 | 基礎架構 | 3-4 天 | - |
| Phase 2 | 租客儀表板（簽約 & 潛在） | 5-6 天 | Phase 1 |
| Phase 3 | 買家儀表板（簽約 & 潛在） | 5-6 天 | Phase 1 |
| Phase 4 | 仲介 & 服務提供者儀表板 | 4-5 天 | Phase 1 |
| Phase 5 | 超級管理員儀表板 | 3-4 天 | Phase 1 |
| Phase 6 | 測試 & 優化 | 4-5 天 | Phase 2-5 |
| Phase 7 | 文檔 & 部署 | 2-3 天 | Phase 6 |
| **總計** | | **25-30 天** | |

**並行開發策略**：
- Phase 2 和 Phase 3 可以並行開發（租客與買家儀表板）
- Phase 4 和 Phase 5 可以並行開發（仲介、服務提供者與超級管理員）
- 若採用並行開發，總時程可縮短至 **18-22 天**

---

## ⚠️ 風險與建議

### 風險

1. **時間壓力**: 完整實作需要 20-25 工作天
2. **資料依賴**: 需要確認所有資料表都已建立
3. **權限系統**: 需要完整的 IAM 系統支援
4. **測試資料**: 需要準備各角色的測試資料

### 建議

1. **分階段交付**: 不要一次實作所有角色，優先 P0
2. **先做 MVP**: 先實作核心功能，再優化
3. **並行開發**: Phase 2 和 Phase 3 可以並行
4. **及早測試**: 每個 Phase 完成後立即測試

---

## 📞 聯絡窗口

- **專案經理**: [姓名]
- **後端負責人**: [姓名]
- **QA 負責人**: [姓名]
- **產品經理**: [姓名]

---

## 📋 版本修訂記錄

| 版本 | 日期 | 修改者 | 修改內容 |
|-----|------|-------|---------|
| 2.0 | 2026-02-05 | Claude Sonnet 4.5 | 將租客和買家拆分為簽約/潛在狀態，角色從 6 個擴展至 8 個 |
| 1.0 | 2026-02-05 | Claude Sonnet 4.5 | 初始版本，規劃 6 個角色儀表板 |

---

**計劃版本**: 2.0
**最後更新**: 2026-02-05
**下次審核**: Phase 1 完成後
