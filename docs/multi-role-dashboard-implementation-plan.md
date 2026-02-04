# 多角色儀表板需求與實作規劃報告

## 1. 角色定義與權限矩陣

### 1.1 角色定義

| 角色                 | 英文名稱             | 權限範圍                       | 典型用戶     |
| -------------------- | -------------------- | ------------------------------ | ------------ |
| **超級管理員** | `super_admin`      | 完整系統存取權限               | 平台運營人員 |
| **房東**       | `landlord`         | 自己的物件、租客、合約、財務   | 房屋所有權人 |
| **租客**       | `tenant`           | 自己的租約、繳費記錄、維修請求 | 承租人       |
| **仲介**       | `agent`            | 經手的物件與客戶、成交記錄     | 房地產經紀人 |
| **廠商**       | `service_provider` | 維修請求與報價、服務記錄       | 維修廠商     |

### 1.2 權限矩陣表格

| 功能模組           | 超級管理員 | 房東 | 租客 | 房東的仲介 | 廠商 |
| ------------------ | ---------- | ---- | ---- | ---------- | ---- |
| **系統管理** | CRUD       | -    | -    | -          | -    |
| **用戶管理** | CRUD       | CRUD | -    | -          | -    |
| **角色管理** | CRUD       | -    | -    | -          | -    |
| **物件管理** | CRUD       | CRUD | R    | R          | -    |
| **租約管理** | CRUD       | CRUD | R    | -          | -    |
| **財務管理** | CRUD       | CRUD | R    | -          | -    |
| **維修管理** | CRUD       | CRUD | CR   | -          | CRUD |
| **報表分析** | CRUD       | R    | R    | -          | R    |
| **通知中心** | CRUD       | CRUD | CRUD | CRUD       | CRUD |


**圖例**: C=Create, R=Read, U=Update, D=Delete, -=無權限

## 2. 各角色儀表板功能需求

### 2.1 超級管理員儀表板

**核心指標**:

- 平台總用戶數（按角色分類）
- 物件統計：平台目前委託總數（有效出售總數＋有效出租總數），目前目前有效出售物件總數，目前目前有效出租物件總數，物件統計（歷史總數、空置率...等）
- 系統健康狀態（API 響應時間、錯誤率）
- 財務總覽（月收入、待收款）

**圖表組件**:

- 用戶增長趨勢圖（折線圖）
- 角色分布餅圖
- 系統效能監控儀表板
- 財務收入柱狀圖

**快速入口**:

- 用戶管理
- 系統設定
- 財務報表
- 審核中心

**資料來源**: `auth.users`, `users_profile`, `system_metrics`, `financial_records`
**更新頻率**: 即時（15秒輪詢）

### 2.2 房東儀表板

**核心指標**:

- 總物件數與空置率
- 月租金收入與待收款
- 維修請求狀態

**圖表組件**:

- 租金收入趨勢圖
- 物件空置狀態分布
- 維修請求處理時效
- 租約到期提醒

**快速操作**:

- 新增物件
- 發布招租
- 收租管理
- 維修派單

**資料來源**: `properties`, `rental_contracts`, `payment_records`, `maintenance_requests`
**更新頻率**: 即時（30秒輪詢）

### 2.3 租客儀表板

**核心指標**:

- 當前租約狀態
- 待繳費用與期限
- 維修進度追蹤
- 鄰里評分與評價

**圖表組件**:

- 費用繳交歷史
- 維修處理時程
- 租約重要日期
- 社區公告

**快速操作**:

- 線上繳費
- 申請維修
- 續約申請
- 聯繫房東

**資料來源**: `rental_contracts`, `payment_records`, `maintenance_requests`, `community_announcements`
**更新頻率**: 即時（60秒輪詢）

### 2.4 房東的仲介儀表板

這平台主要目標客戶是房東，所以仲介只能查看房東授權的物件，出售，出租狀況，download房東自己create審核過的空白租約,空白買賣合約供仲介的客戶簽名用，所以仲介除非有屋主的授權，否則不能修改物件明細或合約，但可以留言．聯繫房東

**資料來源**: `property_viewings`,
**更新頻率**: 即時（30秒輪詢）

### 2.5 廠商儀表板

**核心指標**:

- 待處理維修單
- 完成率與評分
- 月收入與待收款
- 服務區域分布

**圖表組件**:

- 服務請求類型分布
- 處理時效分析
- 客戶評價趨勢
- 收入來源分析

**快速操作**:

- 接單處理
- 報價提交
- 服務完成確認
- 請款申請

**資料來源**: `maintenance_requests`, `service_quotes`, `completion_records`, `payment_requests`
**更新頻率**: 即時（30秒輪詢）

## 3. 技術實作方案

### 3.1 前端架構

**框架選擇**:

- Next.js 14 (App Router)
- React 18 with TypeScript
- Tailwind CSS for styling
- Shadcn/ui 元件庫

**佈局策略**:

- 響應式設計 (Mobile First)
- 深色模式支援
- 國際化 (i18n) 準備
- 無障礙訪問 (WCAG 2.1)

**核心元件**:

```typescript
// 儀表板佈局元件
interface DashboardLayoutProps {
  role: UserRole;
  children: React.ReactNode;
  quickActions?: QuickAction[];
}

// 資料卡片元件
interface DataCardProps {
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  onClick?: () => void;
}

// 圖表容器
interface ChartContainerProps {
  title: string;
  data: any[];
  chartType: 'line' | 'bar' | 'pie' | 'area';
  loading?: boolean;
}
```

### 3.2 後端架構

**API 設計**:

```typescript
// 儀表板資料聚合 API
GET /api/dashboard/{role}/overview
GET /api/dashboard/{role}/metrics
GET /api/dashboard/{role}/charts/{chartType}

// 角色判斷中介軟體
const roleMiddleware = async (req: NextRequest) => {
  const user = await getCurrentUser();
  const userRole = await getUserRole(user.id);
  
  // 驗證角色權限
  if (!hasPermission(userRole, req.nextUrl.pathname)) {
    return NextResponse.redirect('/unauthorized');
  }
  
  return NextResponse.next();
};
```

**資料聚合策略**:

- 使用 PostgreSQL 物化視圖緩存常用聚合資料
- Redis 快取熱門查詢結果（TTL: 5分鐘）
- 增量更新避免全表掃描

**快取機制**:

```typescript
const dashboardCache = new Map<string, {
  data: any;
  timestamp: number;
  ttl: number;
}>();

// 快取儀表板資料
async function getCachedDashboardData(role: string, userId: string) {
  const cacheKey = `dashboard:${role}:${userId}`;
  const cached = dashboardCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  
  const freshData = await fetchDashboardData(role, userId);
  dashboardCache.set(cacheKey, {
    data: freshData,
    timestamp: Date.now(),
    ttl: 300000 // 5分鐘
  });
  
  return freshData;
}
```

### 3.3 安全機制

**權限模型**: RBAC + ABAC 混合

- 角色基礎訪問控制 (RBAC)
- 屬性基礎訪問控制 (ABAC)
- 行級安全 (RLS) 於資料庫層

**驗證方式**: JWT + Refresh Token

- Access Token 有效期: 15分鐘
- Refresh Token 有效期: 7天
- Token 自動刷新機制

**敏感資料脫敏**:

```typescript
// 金融資料脫敏
function maskFinancialData(data: any) {
  return {
    ...data,
    bankAccount: data.bankAccount?.replace(/.(?=.{4})/g, '*'),
    creditCard: data.creditCard?.replace(/.(?=.{4})/g, '*')
  };
}

// 個人資料脫敏
function maskPersonalData(data: any) {
  return {
    ...data,
    phone: data.phone?.replace(/.(?=.{3})/g, '*'),
    idNumber: data.idNumber?.replace(/.(?=.{4})/g, '*')
  };
}
```

## 4. 資料流程與架構圖

### 4.1 系統架構圖

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  用戶請求        │    │   API 閘道      │    │  權限服務       │
│  (前端應用)     │───▶│  (Next.js       │───▶│  (RBAC/ABAC    │
│                 │    │   Middleware)   │    │  驗證)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │                       │
                                 ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  儀表板服務      │    │  資料聚合層      │    │  資料庫層       │
│  (角色專屬      │◀───│  (Redis快取     │◀───│  (PostgreSQL   │
│  元件渲染)       │    │  物化視圖)       │    │  RLS策略)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 │                       │
                                 ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  第三方服務      │    │  監控與日誌      │    │  備份與恢復     │
│  (支付、短信     │    │  (Sentry,       │    │  (定期備份      │
│  等整合)        │    │   LogRocket)     │    │  機制)         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 4.2 動態渲染流程

1. **用戶請求**: 用戶訪問 `/dashboard`
2. **角色識別**: Middleware 從 JWT 解析用戶角色
3. **權限驗證**: 檢查用戶是否有權訪問請求的路由
4. **資料聚合**: 根據角色聚合所需的儀表板資料
5. **元件渲染**: 動態載入角色專屬的儀表板元件
6. **客戶端更新**: 建立 WebSocket 連接進行即時更新

### 4.3 資料查詢優化

```sql
-- 物化視圖範例：房東儀表板資料
CREATE MATERIALIZED VIEW landlord_dashboard_cache AS
SELECT 
  p.landlord_id,
  COUNT(p.id) as total_properties,
  COUNT(CASE WHEN r.id IS NULL THEN 1 END) as vacant_properties,
  SUM(r.monthly_rent) as total_monthly_rent,
  COUNT(mr.id) as pending_maintenance_requests
FROM properties p
LEFT JOIN rental_contracts r ON p.id = r.property_id AND r.status = 'active'
LEFT JOIN maintenance_requests mr ON p.id = mr.property_id AND mr.status = 'pending'
GROUP BY p.landlord_id;

-- 定期刷新物化視圖
REFRESH MATERIALIZED VIEW CONCURRENTLY landlord_dashboard_cache;
```

## 5. 開發與測試計畫

### 5.1 專案里程碑

**階段一：需求確認與設計 (1週)**

- [ ] 完成所有角色需求訪談
- [ ] 確認儀表板視覺設計
- [ ] 制定 API 規格文件
- [ ] 建立元件庫規範

**階段二：UI 原型開發 (2週)**

- [ ] 開發可重用的儀表板元件
- [ ] 實現響應式佈局
- [ ] 完成深色模式支援
- [ ] 建立角色切換預覽功能

**階段三：後端開發 (3週)**

- [ ] 實現資料聚合 API
- [ ] 建立快取機制
- [ ] 完成權限中介軟體
- [ ] 優化資料庫查詢

**階段四：前端整合 (2週)**

- [ ] 整合儀表板元件
- [ ] 實現即時資料更新
- [ ] 完成國際化支援
- [ ] 優化載入效能

**階段五：整合測試 (1週)**

- [ ] 端到端測試所有角色流程
- [ ] 效能壓力測試
- [ ] 安全滲透測試
- [ ] 無障礙訪問測試

**階段六：UAT 與上線 (1週)**

- [ ] 用戶驗收測試
- [ ] 生產環境部署
- [ ] 監控系統設定
- [ ] 文件撰寫與培訓

### 5.2 測試策略

**單元測試覆蓋率目標**: ≥ 90%

- 元件測試: React Testing Library
- API 測試: Jest + Supertest
- 工具函數測試: 100% 覆蓋率

**整合測試腳本**:

```typescript
describe('房東儀表板整合測試', () => {
  test('應該顯示正確的物件統計', async () => {
    const { getByText } = render(<LandlordDashboard />);
    await waitFor(() => {
      expect(getByText('總物件數')).toBeInTheDocument();
      expect(getByText('5')).toBeInTheDocument(); // 模擬資料
    });
  });
});
```

**效能基準**:

- 頁面載入時間: < 2 秒
- API 回應時間: < 300 ms
- 首次內容繪製 (FCP): < 1.5 秒
- 最大內容繪製 (LCP): < 2.5 秒

## 6. 交付項目與品質指標

### 6.1 文件交付

**需求規格書**:

- 角色權限矩陣詳細規格
- 儀表板功能需求說明
- API 端點詳細文檔

**API 文件**:

- OpenAPI 3.0 規格文件
- API 使用範例與錯誤碼說明
- 速率限制與驗證方式

**測試報告**:

- 單元測試覆蓋率報告
- 整合測試結果摘要
- 效能測試數據
- 安全掃描報告

**維運手冊**:

- 系統監控指南
- 故障排除流程
- 備份與恢復程序
- 升級與部署指南

### 6.2 程式交付

**可部署的原始碼**:

- Docker 容器化部署
- Kubernetes 部署配置
- 環境變數管理

**Dockerfile**:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

**CI/CD Pipeline**:

```yaml
name: Deploy Dashboard
on:
  push:
    branches: [main]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      - run: npm run build
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: success()
    steps:
      - uses: actions/checkout@v3
      - uses: akhileshns/heroku-deploy@v3.12.12
        with:
          heroku_api_key: ${{secrets.HEROKU_API_KEY}}
          heroku_app_name: ${{secrets.HEROKU_APP_NAME}}
          heroku_email: ${{secrets.HEROKU_EMAIL}}
```

### 6.3 品質指標

**安全性**:

- 零高風險漏洞 (OWASP Top 10)
- 通過 Snyk 安全掃描
- 無敏感資料泄露風險

**效能**:

- Lighthouse 性能分數 ≥ 90
- SEO 分數 ≥ 95
- 無障礙訪問分數 ≥ 90

**可擴展性**:

- 支援 1000 同時在線用戶
- API 速率限制: 1000 requests/分鐘
- 資料庫連接池: 最大 100 連接

**可靠性**:

- 系統可用性: 99.9%
- 平均恢復時間 (MTTR): < 15 分鐘
- 資料備份頻率: 每小時增量，每日全量

---

## 附錄：技術堆疊詳情

### 前端技術

- **框架**: Next.js 14, React 18, TypeScript
- **樣式**: Tailwind CSS, Shadcn/ui, CSS Modules
- **圖表**: Recharts, Chart.js
- **地圖**: Mapbox GL JS, React Leaflet
- **狀態管理**: Zustand, React Query
- **表單處理**: React Hook Form, Zod
- **測試**: Jest, React Testing Library, Cypress

### 後端技術

- **框架**: Next.js API Routes
- **資料庫**: PostgreSQL with Supabase
- **快取**: Redis, Upstash
- **搜尋**: Algolia, PostgreSQL Full-Text Search
- **即時通訊**: WebSocket, Server-Sent Events
- **檔案儲存**: Supabase Storage, AWS S3
- **監控**: Sentry, LogRocket, Vercel Analytics

### 開發工具

- **版本控制**: Git, GitHub
- **程式碼品質**: ESLint, Prettier, Husky
- **容器化**: Docker, Docker Compose
- **部署**: Vercel, Netlify, AWS
- **CI/CD**: GitHub Actions, CircleCI
- **文件**: Nextra, Storybook, Chromatic

### 安全措施

- **驗證**: JWT, OAuth 2.0, Supabase Auth
- **權限**: Row Level Security (RLS)
- **加密**: TLS 1.3, Database Encryption
- **防護**: CSP, CORS, Rate Limiting
- **審計**: Security Headers, Vulnerability Scanning

---

**版本**: 1.0.0
**最後更新**: 2026-02-04
**狀態**: 草案 (供審閱)
