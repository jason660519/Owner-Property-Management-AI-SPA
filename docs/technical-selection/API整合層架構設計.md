# API 整合層架構設計

> **創建日期**: 2026-01-31  
> **創建者**: Claude Sonnet 4.5  
> **最後修改**: 2026-01-31  
> **修改者**: Claude Sonnet 4.5  
> **版本**: 1.0  
> **文件類型**: 架構設計文件

---

## 📋 執行摘要

本文件定義了前端應用與 Supabase 後端之間的 API 整合層架構，採用 **Repository Pattern + React Query** 模式，提供統一的資料存取介面、錯誤處理、快取策略。

**關鍵決策**:
- ✅ 使用 React Query (TanStack Query) 管理伺服器狀態
- ✅ 實作 Repository Pattern 封裝 Supabase 查詢
- ✅ 統一錯誤處理與日誌記錄
- ✅ 實作樂觀更新與快取失效策略

---

## 一、架構概觀

### 1.1 整體架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                     UI Components                            │
│  (LoginPage, PropertyList, Dashboard...)                    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   React Query Hooks                          │
│  useAuth, useProperties, useTenants, useContracts...        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Repository Layer                      │
│  AuthRepository, PropertyRepository, TenantRepository...    │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Client                           │
│  (createClientComponentClient)                               │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Backend                          │
│  PostgreSQL + Storage + Auth + Realtime                     │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 設計原則

1. **關注點分離** (Separation of Concerns)
   - UI 組件只負責渲染與用戶互動
   - React Query Hooks 負責資料獲取與狀態管理
   - Repository 負責實際的 API 呼叫

2. **單一資料來源** (Single Source of Truth)
   - React Query 快取作為客戶端唯一資料來源
   - 避免多個組件各自維護狀態

3. **錯誤優先** (Error-First)
   - 所有 API 呼叫必須處理錯誤
   - 統一錯誤格式與用戶提示

4. **效能優化**
   - 使用 React Query 的自動快取與重新驗證
   - 實作樂觀更新減少等待時間
   - 使用分頁與無限滾動減少資料載入

---

## 二、技術選型

### 2.1 React Query vs SWR vs 自建方案

| 項目 | React Query | SWR | 自建方案 |
|------|------------|-----|---------|
| **學習曲線** | 中等 | 低 | 高 |
| **功能完整性** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **DevTools** | ✅ 強大 | ⚠️ 基礎 | ❌ 無 |
| **樂觀更新** | ✅ 內建 | ✅ 內建 | 🔧 需自建 |
| **快取管理** | ✅ 細粒度控制 | ✅ 自動 | 🔧 需自建 |
| **並發請求控制** | ✅ 支援 | ⚠️ 有限 | 🔧 需自建 |
| **檔案大小** | ~13KB | ~4KB | 0KB |
| **社群活躍度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | N/A |

**最終選擇**: **React Query (TanStack Query v5)**

**理由**:
1. ✅ 功能最完整，適合中大型應用
2. ✅ DevTools 強大，易於除錯
3. ✅ 支援樂觀更新、無限滾動、分頁
4. ✅ 與 Supabase 整合良好
5. ⚠️ 檔案較大，但效益遠大於成本

---

## 三、Repository Pattern 設計

### 3.1 Repository 介面定義

**目的**: 將 Supabase 查詢邏輯封裝成可重用、可測試的函數

**範例**: Property Repository

```typescript
// lib/api/repositories/PropertyRepository.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database';
import type { Property, CreatePropertyData, UpdatePropertyData } from '@/types/property';

export class PropertyRepository {
  private supabase = createClientComponentClient<Database>();

  /**
   * 查詢所有物件 (房東)
   */
  async getProperties(landlordId: string): Promise<Property[]> {
    const { data, error } = await this.supabase
      .from('property_rentals')
      .select(`
        *,
        property_photos(*)
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }

    return data as Property[];
  }

  /**
   * 查詢單一物件詳情
   */
  async getPropertyById(id: string): Promise<Property> {
    const { data, error } = await this.supabase
      .from('property_rentals')
      .select(`
        *,
        property_photos(*),
        lease_agreements(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch property: ${error.message}`);
    }

    return data as Property;
  }

  /**
   * 新增物件
   */
  async createProperty(data: CreatePropertyData): Promise<Property> {
    const { data: property, error } = await this.supabase
      .from('property_rentals')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create property: ${error.message}`);
    }

    return property as Property;
  }

  /**
   * 更新物件
   */
  async updateProperty(id: string, data: UpdatePropertyData): Promise<Property> {
    const { data: property, error } = await this.supabase
      .from('property_rentals')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update property: ${error.message}`);
    }

    return property as Property;
  }

  /**
   * 刪除物件
   */
  async deleteProperty(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('property_rentals')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete property: ${error.message}`);
    }
  }

  /**
   * 搜尋物件 (公開)
   */
  async searchProperties(filters: PropertySearchFilters): Promise<Property[]> {
    let query = this.supabase
      .from('property_rentals')
      .select('*')
      .eq('status', 'available');

    // 價格範圍
    if (filters.minPrice) {
      query = query.gte('monthly_rent', filters.minPrice);
    }
    if (filters.maxPrice) {
      query = query.lte('monthly_rent', filters.maxPrice);
    }

    // 地區
    if (filters.city) {
      query = query.eq('city', filters.city);
    }

    // 房型
    if (filters.bedrooms) {
      query = query.eq('bedrooms', filters.bedrooms);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to search properties: ${error.message}`);
    }

    return data as Property[];
  }
}

// 導出單例
export const propertyRepository = new PropertyRepository();
```

### 3.2 Repository 工廠模式 (可選)

```typescript
// lib/api/repositories/index.ts
import { PropertyRepository } from './PropertyRepository';
import { TenantRepository } from './TenantRepository';
import { ContractRepository } from './ContractRepository';

export class RepositoryFactory {
  private static _propertyRepository: PropertyRepository;
  private static _tenantRepository: TenantRepository;
  private static _contractRepository: ContractRepository;

  static get property(): PropertyRepository {
    if (!this._propertyRepository) {
      this._propertyRepository = new PropertyRepository();
    }
    return this._propertyRepository;
  }

  static get tenant(): TenantRepository {
    if (!this._tenantRepository) {
      this._tenantRepository = new TenantRepository();
    }
    return this._tenantRepository;
  }

  static get contract(): ContractRepository {
    if (!this._contractRepository) {
      this._contractRepository = new ContractRepository();
    }
    return this._contractRepository;
  }
}

// 使用方式
import { RepositoryFactory } from '@/lib/api/repositories';
const properties = await RepositoryFactory.property.getProperties(landlordId);
```

---

## 四、React Query 整合

### 4.1 Query Client 配置

**檔案**: `apps/web/lib/react-query/queryClient.ts`

```typescript
import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { toast } from 'sonner'; // 或其他 Toast 庫

// 全域錯誤處理
const queryCache = new QueryCache({
  onError: (error, query) => {
    console.error('Query error:', error, 'Query key:', query.queryKey);
    
    // 顯示用戶友善的錯誤訊息
    if (error instanceof Error) {
      toast.error(error.message || '資料載入失敗');
    }
  },
});

const mutationCache = new MutationCache({
  onError: (error, variables, context, mutation) => {
    console.error('Mutation error:', error);
    
    if (error instanceof Error) {
      toast.error(error.message || '操作失敗');
    }
  },
});

export const queryClient = new QueryClient({
  queryCache,
  mutationCache,
  defaultOptions: {
    queries: {
      // 預設配置
      staleTime: 1000 * 60 * 5, // 5 分鐘後標記為 stale
      gcTime: 1000 * 60 * 30, // 30 分鐘後從快取移除 (原 cacheTime)
      retry: 1, // 失敗後重試 1 次
      refetchOnWindowFocus: true, // 視窗聚焦時重新驗證
      refetchOnReconnect: true, // 重新連線時重新驗證
    },
    mutations: {
      retry: 0, // Mutation 不重試
    },
  },
});
```

### 4.2 Query Provider

**檔案**: `apps/web/app/providers.tsx`

```typescript
'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from '@/lib/react-query/queryClient';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster position="top-right" />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

**使用**: 在 `app/layout.tsx` 包裹

```typescript
import { Providers } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-TW">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 五、React Query Hooks

### 5.1 查詢 Hooks (Query)

**檔案**: `apps/web/hooks/api/useProperties.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertyRepository } from '@/lib/api/repositories/PropertyRepository';
import type { CreatePropertyData, UpdatePropertyData } from '@/types/property';

// Query Keys (統一管理)
export const propertyKeys = {
  all: ['properties'] as const,
  lists: () => [...propertyKeys.all, 'list'] as const,
  list: (landlordId: string) => [...propertyKeys.lists(), landlordId] as const,
  details: () => [...propertyKeys.all, 'detail'] as const,
  detail: (id: string) => [...propertyKeys.details(), id] as const,
  search: (filters: any) => [...propertyKeys.all, 'search', filters] as const,
};

/**
 * 查詢房東的所有物件
 */
export function useProperties(landlordId: string) {
  return useQuery({
    queryKey: propertyKeys.list(landlordId),
    queryFn: () => propertyRepository.getProperties(landlordId),
    enabled: !!landlordId, // 只在有 landlordId 時執行
  });
}

/**
 * 查詢單一物件詳情
 */
export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => propertyRepository.getPropertyById(id),
    enabled: !!id,
  });
}

/**
 * 搜尋物件 (公開)
 */
export function useSearchProperties(filters: PropertySearchFilters) {
  return useQuery({
    queryKey: propertyKeys.search(filters),
    queryFn: () => propertyRepository.searchProperties(filters),
    staleTime: 1000 * 60 * 10, // 搜尋結果保持 10 分鐘
  });
}
```

### 5.2 變更 Hooks (Mutation)

```typescript
/**
 * 新增物件
 */
export function useCreateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePropertyData) => propertyRepository.createProperty(data),
    onSuccess: (newProperty, variables) => {
      // 失效相關查詢
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      
      // 樂觀更新 (可選)
      queryClient.setQueryData(
        propertyKeys.list(variables.landlord_id),
        (oldData: Property[] | undefined) => {
          return oldData ? [newProperty, ...oldData] : [newProperty];
        }
      );

      toast.success('物件新增成功');
    },
    onError: (error) => {
      console.error('Create property error:', error);
      // toast.error 由 mutationCache 統一處理
    },
  });
}

/**
 * 更新物件
 */
export function useUpdateProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePropertyData }) =>
      propertyRepository.updateProperty(id, data),
    onMutate: async ({ id, data }) => {
      // 取消正在進行的查詢
      await queryClient.cancelQueries({ queryKey: propertyKeys.detail(id) });

      // 保存當前值 (用於回滾)
      const previousProperty = queryClient.getQueryData(propertyKeys.detail(id));

      // 樂觀更新
      queryClient.setQueryData(propertyKeys.detail(id), (old: Property | undefined) => {
        return old ? { ...old, ...data } : old;
      });

      return { previousProperty };
    },
    onError: (error, variables, context) => {
      // 回滾
      if (context?.previousProperty) {
        queryClient.setQueryData(propertyKeys.detail(variables.id), context.previousProperty);
      }
    },
    onSuccess: (updatedProperty, variables) => {
      // 更新快取
      queryClient.setQueryData(propertyKeys.detail(variables.id), updatedProperty);
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      
      toast.success('物件更新成功');
    },
  });
}

/**
 * 刪除物件
 */
export function useDeleteProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => propertyRepository.deleteProperty(id),
    onSuccess: (_, deletedId) => {
      // 移除快取
      queryClient.removeQueries({ queryKey: propertyKeys.detail(deletedId) });
      queryClient.invalidateQueries({ queryKey: propertyKeys.lists() });
      
      toast.success('物件刪除成功');
    },
  });
}
```

### 5.3 組件使用範例

```typescript
// components/PropertyList.tsx
'use client';

import { useProperties, useDeleteProperty } from '@/hooks/api/useProperties';
import { useAuth } from '@/hooks/useAuth';

export function PropertyList() {
  const { user } = useAuth();
  const { data: properties, isLoading, error } = useProperties(user?.id || '');
  const deleteProperty = useDeleteProperty();

  if (isLoading) return <div>載入中...</div>;
  if (error) return <div>載入失敗: {error.message}</div>;

  const handleDelete = (id: string) => {
    if (confirm('確定要刪除此物件？')) {
      deleteProperty.mutate(id);
    }
  };

  return (
    <div>
      {properties?.map((property) => (
        <div key={property.id}>
          <h3>{property.title}</h3>
          <button onClick={() => handleDelete(property.id)}>刪除</button>
        </div>
      ))}
    </div>
  );
}
```

---

## 六、快取策略

### 6.1 快取失效規則

| 操作 | 失效範圍 | 理由 |
|------|---------|------|
| **新增物件** | `propertyKeys.lists()` | 列表需重新載入 |
| **更新物件** | `propertyKeys.detail(id)` + `propertyKeys.lists()` | 詳情與列表都需更新 |
| **刪除物件** | `propertyKeys.detail(id)` + `propertyKeys.lists()` | 移除快取並更新列表 |
| **新增照片** | `propertyKeys.detail(id)` | 物件詳情需重新載入 |

### 6.2 預取策略 (Prefetching)

```typescript
// hooks/api/useProperties.ts
import { useQueryClient } from '@tanstack/react-query';

/**
 * 預取物件詳情 (滑鼠懸停時)
 */
export function usePrefetchProperty() {
  const queryClient = useQueryClient();

  return (id: string) => {
    queryClient.prefetchQuery({
      queryKey: propertyKeys.detail(id),
      queryFn: () => propertyRepository.getPropertyById(id),
      staleTime: 1000 * 60 * 5,
    });
  };
}

// 使用
function PropertyCard({ property }: { property: Property }) {
  const prefetchProperty = usePrefetchProperty();

  return (
    <Link
      href={`/properties/${property.id}`}
      onMouseEnter={() => prefetchProperty(property.id)}
    >
      {property.title}
    </Link>
  );
}
```

### 6.3 背景重新驗證

```typescript
// 自動重新驗證 (當資料可能過期時)
export function useProperties(landlordId: string) {
  return useQuery({
    queryKey: propertyKeys.list(landlordId),
    queryFn: () => propertyRepository.getProperties(landlordId),
    staleTime: 1000 * 60 * 5, // 5 分鐘後標記為 stale
    refetchInterval: 1000 * 60 * 10, // 每 10 分鐘背景重新驗證 (可選)
    refetchOnWindowFocus: true, // 視窗聚焦時重新驗證
  });
}
```

---

## 七、錯誤處理

### 7.1 錯誤類型定義

```typescript
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class AuthenticationError extends ApiError {
  constructor(message = '請先登入') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends ApiError {
  constructor(message = '無權限執行此操作') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message = '資源不存在') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, public errors?: Record<string, string[]>) {
    super(message, 422, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}
```

### 7.2 錯誤處理 Wrapper

```typescript
// lib/api/errorHandler.ts
import { PostgrestError } from '@supabase/supabase-js';
import { ApiError, AuthenticationError, NotFoundError } from './errors';

export function handleSupabaseError(error: PostgrestError): never {
  // PGRST301 - JWT expired
  if (error.code === 'PGRST301') {
    throw new AuthenticationError('登入已過期，請重新登入');
  }

  // PGRST116 - Row not found
  if (error.code === 'PGRST116') {
    throw new NotFoundError('資源不存在');
  }

  // PGRST204 - Permission denied
  if (error.message.includes('permission denied')) {
    throw new AuthorizationError('無權限執行此操作');
  }

  // 通用錯誤
  throw new ApiError(error.message, 500, error.code);
}
```

### 7.3 React Query 錯誤邊界

```typescript
// components/ErrorBoundary.tsx
'use client';

import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="p-4 border border-red-300 bg-red-50 rounded">
      <h2 className="text-red-800 font-bold mb-2">發生錯誤</h2>
      <p className="text-red-600 mb-4">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      >
        重試
      </button>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ReactErrorBoundary onReset={reset} FallbackComponent={ErrorFallback}>
          {children}
        </ReactErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}
```

---

## 八、TypeScript 型別定義

### 8.1 資料庫型別生成

```bash
# 生成 Supabase TypeScript 型別
npx supabase gen types typescript --local > apps/web/types/database.ts
```

### 8.2 擴展型別

```typescript
// types/property.ts
import type { Database } from './database';

// 基礎型別
export type Property = Database['public']['Tables']['property_rentals']['Row'];
export type PropertyInsert = Database['public']['Tables']['property_rentals']['Insert'];
export type PropertyUpdate = Database['public']['Tables']['property_rentals']['Update'];

// 擴展型別 (含關聯)
export type PropertyWithPhotos = Property & {
  property_photos: PropertyPhoto[];
};

export type PropertyWithAll = Property & {
  property_photos: PropertyPhoto[];
  lease_agreements: LeaseAgreement[];
};

// 表單資料型別
export type CreatePropertyData = Omit<PropertyInsert, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePropertyData = Partial<CreatePropertyData>;

// 搜尋過濾器
export interface PropertySearchFilters {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: 'apartment' | 'house' | 'studio';
}
```

---

## 九、效能優化

### 9.1 分頁

```typescript
// hooks/api/useProperties.ts
export function usePropertiesPaginated(landlordId: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: [...propertyKeys.list(landlordId), 'paginated', page],
    queryFn: async () => {
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;

      const { data, error, count } = await propertyRepository.supabase
        .from('property_rentals')
        .select('*', { count: 'exact' })
        .eq('landlord_id', landlordId)
        .range(start, end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data as Property[],
        count: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      };
    },
    placeholderData: (previousData) => previousData, // 保留舊資料避免閃爍
  });
}
```

### 9.2 無限滾動

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';

export function usePropertiesInfinite(landlordId: string, pageSize = 20) {
  return useInfiniteQuery({
    queryKey: [...propertyKeys.list(landlordId), 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const start = pageParam * pageSize;
      const end = start + pageSize - 1;

      const { data, error } = await propertyRepository.supabase
        .from('property_rentals')
        .select('*')
        .eq('landlord_id', landlordId)
        .range(start, end)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        data: data as Property[],
        nextCursor: data.length === pageSize ? pageParam + 1 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  });
}

// 使用
function PropertyList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = usePropertiesInfinite(landlordId);

  return (
    <div>
      {data?.pages.map((page) =>
        page.data.map((property) => <PropertyCard key={property.id} property={property} />)
      )}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? '載入中...' : '載入更多'}
        </button>
      )}
    </div>
  );
}
```

---

## 十、監控與除錯

### 10.1 React Query DevTools

```typescript
// app/providers.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
```

### 10.2 日誌記錄

```typescript
// lib/logger.ts
export const logger = {
  query: (key: unknown[], data: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Query success:', key, data);
    }
  },
  mutation: (fn: string, variables: unknown, data: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Mutation success:', fn, variables, data);
    }
  },
  error: (error: unknown, context?: unknown) => {
    console.error('API Error:', error, context);
    // 發送至 Sentry (生產環境)
    if (process.env.NODE_ENV === 'production') {
      // Sentry.captureException(error);
    }
  },
};
```

---

## 附錄

### A. 完整檔案結構

```
apps/web/
├── lib/
│   ├── api/
│   │   ├── repositories/
│   │   │   ├── PropertyRepository.ts
│   │   │   ├── TenantRepository.ts
│   │   │   ├── ContractRepository.ts
│   │   │   └── index.ts
│   │   ├── errors.ts
│   │   └── errorHandler.ts
│   ├── react-query/
│   │   └── queryClient.ts
│   └── supabase/
│       ├── client.ts
│       ├── server.ts
│       └── middleware.ts
├── hooks/
│   ├── api/
│   │   ├── useProperties.ts
│   │   ├── useTenants.ts
│   │   └── useContracts.ts
│   └── useAuth.ts
├── types/
│   ├── database.ts (自動生成)
│   ├── property.ts
│   ├── tenant.ts
│   └── auth.ts
└── app/
    ├── providers.tsx
    └── ...
```

---

**文件狀態**: ✅ 完成  
**下次審查**: 2026-02-07  
**負責人**: 架構師 + 前端團隊
