> **創建日期**: 2026-02-01
> **創建者**: Claude Haiku 4.5
> **最後修改**: 2026-02-01
> **修改者**: Claude Haiku 4.5
> **版本**: 1.0
> **主題**: AsyncStorage 與 Supabase 資料庫架構補充報告

---

# AsyncStorage 與 Supabase 資料庫架構補充報告

## 📋 目錄

1. [概述](#概述)
2. [核心概念對比](#核心概念對比)
3. [資料分層架構](#資料分層架構)
4. [使用場景分析](#使用場景分析)
5. [離線支持策略](#離線支持策略)
6. [資料同步機制](#資料同步機制)
7. [實現指南](#實現指南)
8. [最佳實踐](#最佳實踐)

---

## 概述

### 背景

在房東管理 Dashboard (Expo Mobile) 中，面臨一個常見的移動應用架構問題：

- **網路不穩定**：用戶在外出時可能無網路連線
- **使用體驗**：每次操作都要等待網路延遲不好
- **資料同步**：多設備間的資料一致性需要保證

因此采用了 **本地緩存層 (AsyncStorage) + 遠程資料層 (Supabase)** 的分層架構。

### 整體架構

```
┌─────────────────────────────────────────────────────┐
│         Mobile App (房東 Dashboard)                 │
│         React Native + Expo                          │
└──────────────────┬──────────────────────────────────┘
                   │
      ┌────────────┴────────────┐
      ▼                         ▼
┌──────────────┐        ┌──────────────────────┐
│ AsyncStorage │        │  Supabase Database   │
│ (本地緩存)   │◀───────│ (PostgreSQL + RLS)   │
│              │        │                      │
│ - 快速存取   │        │ - 持久化存儲        │
│ - 離線工作   │        │ - 多設備同步        │
│ - 有限容量   │        │ - 安全機制(RLS)     │
└──────────────┘        └──────────────────────┘
```

---

## 核心概念對比

### AsyncStorage (React Native 本地存儲)

| 特性 | 說明 |
| :--- | :--- |
| **物理位置** | 設備本地（手機內部存儲或應用沙箱） |
| **存儲大小** | 有限（通常 5-10MB） |
| **存取速度** | ⚡ 極快（毫秒級） |
| **網路需求** | ❌ 不需要網路 |
| **資料持久化** | ✅ 永久（除非應用卸載） |
| **跨設備同步** | ❌ 不支持 |
| **加密** | ❌ 無內建加密 |
| **API** | `getItem()`, `setItem()`, `removeItem()` |
| **使用技術** | 基於設備底層儲存（iOS: Keychain/UserDefaults, Android: SharedPreferences） |

**典型使用**：
```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// 儲存
await AsyncStorage.setItem('properties_cache', JSON.stringify(data));

// 讀取
const cached = await AsyncStorage.getItem('properties_cache');
const data = JSON.parse(cached);
```

### Supabase 資料庫 (PostgreSQL + 雲端服務)

| 特性 | 說明 |
| :--- | :--- |
| **物理位置** | 遠程雲端伺服器（Supabase 託管） |
| **存儲大小** | 🔓 幾乎無限（GB 級別） |
| **存取速度** | 📡 慢（網路延遲 100-500ms） |
| **網路需求** | ✅ 必須連接網路 |
| **資料持久化** | ✅ 永久（有備份機制） |
| **跨設備同步** | ✅ 支持（中央資料庫） |
| **加密** | ✅ 支持（SSL/TLS + RLS） |
| **API** | Supabase JavaScript SDK (`from()`, `select()`, `insert()`) |
| **權限控制** | Row Level Security (RLS) 精細控制 |

**典型使用**：
```tsx
import { supabase } from '@/lib/supabase';

// 讀取
const { data, error } = await supabase
  .from('properties')
  .select('*')
  .eq('owner_id', userId);

// 寫入
await supabase
  .from('properties')
  .insert({ name: '新物件', owner_id: userId });
```

---

## 資料分層架構

### 三層分層模型

```
┌─────────────────────────────────────────────────────────────┐
│                    UI 層 (React Components)                  │
│               展示資料、接收用戶操作                            │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│              應用邏輯層 (Custom Hooks / Context)             │
│         - 狀態管理 (useState, Context)                       │
│         - 資料獲取邏輯 (useProperties)                       │
│         - 同步機制 (useSync)                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌────────────────────┐      ┌──────────────────────┐
│   AsyncStorage     │      │  Supabase Database   │
│   (本地緩存層)     │      │  (資料來源層)       │
│                    │      │                      │
│ 用途：             │      │ 用途：               │
│ • 快速顯示資料     │      │ • 持久化存儲        │
│ • 離線工作支持     │      │ • 多設備同步        │
│ • 減少網路請求     │      │ • 權限控制 (RLS)   │
│ • 臨時緩存         │      │ • 審計日誌           │
│                    │      │ • 資料備份           │
└────────────────────┘      └──────────────────────┘
```

### 資料流向圖

```
用戶操作（添加、編輯、刪除物件）
        │
        ▼
   ┌─────────┐
   │ 本地更新 │ ← AsyncStorage 立即更新（快速反饋）
   └────┬────┘
        │
        ▼
  ┌──────────────┐
  │ 上傳到雲端   │ ← Supabase 後臺同步（當有網路時）
  └────┬─────────┘
       │
       ├─ 成功 → AsyncStorage 更新版本號 → 同步完成 ✅
       │
       └─ 失敗 → 記錄衝突 → 人工介入或重試機制 ❌
```

---

## 使用場景分析

### 場景 1：查看物件列表（連網狀態）

```
1. App 啟動
   ↓
2. 檢查 AsyncStorage 是否有快取 + 時間戳
   ├─ 快取存在且新鮮（< 5 分鐘）
   │  ↓
   │  從 AsyncStorage 讀取，立即顯示 ⚡ FAST
   │
   └─ 快取不存在或過期
      ↓
      從 Supabase 查詢最新資料 📡 NETWORK
      ↓
      存入 AsyncStorage（緩存）
      ↓
      顯示給用戶 ✅
```

**對應代碼**：
```tsx
export function useProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProperties = async () => {
      // 1. 先查 AsyncStorage（快速）
      const cached = await AsyncStorage.getItem('properties_cache');
      const cacheTime = await AsyncStorage.getItem('properties_cache_time');

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < 5 * 60 * 1000) {
          // 快取新鮮，直接用
          setProperties(JSON.parse(cached));
          return;
        }
      }

      // 2. 快取過期或不存在，從 Supabase 獲取
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // 3. 存入 AsyncStorage
        await AsyncStorage.setItem('properties_cache', JSON.stringify(data));
        await AsyncStorage.setItem('properties_cache_time', Date.now().toString());
        setProperties(data);
      }

      setLoading(false);
    };

    fetchProperties();
  }, []);

  return { properties, loading };
}
```

### 場景 2：編輯物件資料（斷網狀態）

```
用戶編輯物件名稱（無網路）
        │
        ▼
1. 立即更新 AsyncStorage
   └─ 用戶看到變化，體驗流暢 ⚡
        │
        ▼
2. 記錄待同步隊列（outbox pattern）
   └─ 存入 AsyncStorage: { action: 'update', property_id: '123', changes: {...} }
        │
        ▼
3. 當網路恢復時
   ├─ 檢測網路狀態變化
   │  ↓
   │  從隊列讀取待同步任務
   │  ↓
   │  逐個上傳到 Supabase
   │  ├─ 成功 → 移除隊列項，AsyncStorage 同步版本號
   │  └─ 失敗 → 保留隊列項，待下次重試
        │
        ▼
4. 其他設備同步
   └─ 透過 Supabase Realtime 或定期拉取更新
```

**對應代碼**：
```tsx
export function usePropertyUpdate() {
  const updateProperty = async (propertyId: string, changes: any) => {
    // 1. 立即更新本地快取
    const cached = await AsyncStorage.getItem('properties_cache');
    if (cached) {
      const properties = JSON.parse(cached);
      const updated = properties.map(p =>
        p.id === propertyId ? { ...p, ...changes } : p
      );
      await AsyncStorage.setItem('properties_cache', JSON.stringify(updated));
    }

    // 2. 記錄待同步隊列
    const queue = await AsyncStorage.getItem('sync_queue');
    const syncQueue = queue ? JSON.parse(queue) : [];
    syncQueue.push({
      action: 'update',
      propertyId,
      changes,
      timestamp: Date.now(),
    });
    await AsyncStorage.setItem('sync_queue', JSON.stringify(syncQueue));

    // 3. 嘗試同步到 Supabase（如果有網路）
    if (isNetworkConnected) {
      try {
        await supabase
          .from('properties')
          .update(changes)
          .eq('id', propertyId);

        // 同步成功，移除隊列項
        const remaining = syncQueue.filter(item => item.propertyId !== propertyId);
        await AsyncStorage.setItem('sync_queue', JSON.stringify(remaining));
      } catch (error) {
        // 同步失敗，保留隊列項待下次重試
        console.error('同步失敗，待網路恢復後重試', error);
      }
    }
  };

  return { updateProperty };
}
```

---

## 離線支持策略

### 網路狀態偵測

```tsx
import { useNetInfo } from '@react-native-community/netinfo';

export function useOfflineSync() {
  const netInfo = useNetInfo();

  useEffect(() => {
    if (netInfo.isConnected) {
      // 網路恢復，立即同步待處理隊列
      syncPendingChanges();
    }
  }, [netInfo.isConnected]);

  const syncPendingChanges = async () => {
    const queue = await AsyncStorage.getItem('sync_queue');
    if (!queue) return;

    const syncItems = JSON.parse(queue);
    const failed = [];

    for (const item of syncItems) {
      try {
        if (item.action === 'update') {
          await supabase
            .from('properties')
            .update(item.changes)
            .eq('id', item.propertyId);
        } else if (item.action === 'insert') {
          await supabase.from('properties').insert(item.data);
        }
        // 成功，從隊列移除
      } catch (error) {
        failed.push(item);
      }
    }

    // 只保留失敗的項目
    await AsyncStorage.setItem('sync_queue', JSON.stringify(failed));
  };

  return { isOffline: !netInfo.isConnected, syncPendingChanges };
}
```

### 衝突解決策略

當發生資料衝突時（用戶在不同設備上修改同一資料）：

| 策略 | 說明 | 適用場景 |
| :--- | :--- | :--- |
| **Last-Write-Wins** | 最後修改時間為準 | 簡單文本更新 |
| **User 決策** | 提示用戶選擇 | 重要資料（價格、狀態） |
| **合併策略** | 智能合併欄位 | 複雜資料結構 |
| **版本控制** | 保留版本歷史 | 審計需求 |

```tsx
// 衝突偵測與解決
async function resolveConflict(localData: any, remoteData: any) {
  if (localData.updated_at > remoteData.updated_at) {
    // 本地較新，推送到遠程
    return localData;
  } else if (remoteData.updated_at > localData.updated_at) {
    // 遠程較新，使用遠程版本
    return remoteData;
  } else {
    // 同時修改，需要用戶介入
    return showConflictResolutionUI(localData, remoteData);
  }
}
```

---

## 資料同步機制

### 1. 主動同步（Push）

用戶修改資料時，主動上傳到 Supabase：

```tsx
// 應用層會自動呼叫
await updatePropertyInSupabase(propertyId, changes);
```

### 2. 被動同步（Pull）

定期或手動拉取遠程資料更新：

```tsx
// 下拉刷新
<FlatList
  onRefresh={async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('owner_id', userId);

    if (data) {
      await AsyncStorage.setItem('properties_cache', JSON.stringify(data));
    }
  }}
  refreshing={loading}
/>
```

### 3. 即時同步（Realtime）

使用 Supabase Realtime 訂閱變化：

```tsx
export function usePropertiesRealtime(userId: string) {
  useEffect(() => {
    // 訂閱該用戶的所有物件變化
    const subscription = supabase
      .from(`properties:owner_id=eq.${userId}`)
      .on('*', (payload) => {
        console.log('物件發生變化:', payload);
        // 更新 AsyncStorage
        updateLocalCache(payload);
      })
      .subscribe();

    return () => subscription.unsubscribe();
  }, [userId]);
}
```

---

## 實現指南

### 步驟 1：初始化 Supabase

```tsx
// apps/mobile/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 步驟 2：建立快取管理 Hook

```tsx
// apps/mobile/src/lib/hooks/useCache.ts
export function useCache(key: string, fetcher: () => Promise<any>, ttl = 5 * 60 * 1000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // 檢查快取
      const cached = await AsyncStorage.getItem(key);
      const cacheTime = await AsyncStorage.getItem(`${key}_time`);

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < ttl) {
          setData(JSON.parse(cached));
          setLoading(false);
          return;
        }
      }

      // 快取過期，重新獲取
      const freshData = await fetcher();
      await AsyncStorage.setItem(key, JSON.stringify(freshData));
      await AsyncStorage.setItem(`${key}_time`, Date.now().toString());
      setData(freshData);
      setLoading(false);
    };

    loadData();
  }, [key]);

  return { data, loading };
}
```

### 步驟 3：建立同步隊列管理

```tsx
// apps/mobile/src/lib/hooks/useSyncQueue.ts
export function useSyncQueue() {
  const [queue, setQueue] = useState<any[]>([]);

  // 添加到隊列
  const addToQueue = async (action: string, data: any) => {
    const item = {
      id: Date.now().toString(),
      action,
      data,
      timestamp: Date.now(),
      retries: 0,
    };

    const queue = await AsyncStorage.getItem('sync_queue');
    const items = queue ? JSON.parse(queue) : [];
    items.push(item);

    await AsyncStorage.setItem('sync_queue', JSON.stringify(items));
    setQueue(items);
  };

  // 同步隊列
  const sync = async () => {
    const queue = await AsyncStorage.getItem('sync_queue');
    if (!queue) return;

    const items = JSON.parse(queue);
    const completed = [];

    for (const item of items) {
      try {
        if (item.action === 'insert_property') {
          await supabase.from('properties').insert(item.data);
        } else if (item.action === 'update_property') {
          await supabase
            .from('properties')
            .update(item.data.changes)
            .eq('id', item.data.id);
        }
        completed.push(item.id);
      } catch (error) {
        // 重試邏輯
        item.retries++;
        if (item.retries >= 3) {
          completed.push(item.id); // 放棄
        }
      }
    }

    // 移除已完成項目
    const remaining = items.filter((item: any) => !completed.includes(item.id));
    await AsyncStorage.setItem('sync_queue', JSON.stringify(remaining));
    setQueue(remaining);
  };

  return { queue, addToQueue, sync };
}
```

---

## 最佳實踐

### 1. 緩存策略

```tsx
✅ DO:
- 為常訪問的資料設定快取（列表、詳情）
- 設定合理的 TTL（Time To Live）
- 區分冷數據和熱數據的快取策略

❌ DON'T:
- 快取所有資料（浪費空間）
- 無限期快取（導致資料過時）
- 不清理過期快取（佔用空間）
```

### 2. 同步策略

```tsx
✅ DO:
- 離線時記錄變化，網路恢復時同步
- 實現指數退避重試（exponential backoff）
- 顯示同步狀態（同步中、同步完成、同步失敗）

❌ DON'T:
- 無限重試失敗的請求
- 不通知用戶同步失敗
- 覆蓋用戶的本地修改而不提示
```

### 3. 資料安全

```tsx
✅ DO:
- 敏感資料（密碼、令牌）不存入 AsyncStorage
- 使用 Supabase RLS 限制資料存取
- 記錄資料修改的審計日誌

❌ DON'T:
- 在 AsyncStorage 存儲明文密碼
- 信任客戶端的權限檢查
- 忽略資料加密（傳輸和存儲）
```

### 4. 效能最佳化

```tsx
✅ DO:
- 使用分頁加載大量資料（不是一次全部載入）
- 在後臺執行同步（不阻止 UI）
- 使用 React.memo 避免不必要的重渲染

❌ DON'T:
- 在 UI 執行緒做同步操作
- 一次載入數千筆記錄
- 未經最佳化的頻繁查詢
```

### 5. 空間管理

```tsx
✅ DO:
- 定期清理過期快取
- 監控 AsyncStorage 使用情況（< 5MB）
- 對大型資料使用壓縮

❌ DON'T:
- 無限期累積快取（到達儲存上限）
- 存儲超大文件在本地（應使用 Supabase Storage）
- 忽視儲存配額限制
```

---

## 使用案例：房東 Dashboard 真實場景

### 場景 A：查看物件列表 + 離線模式

```
初次啟動（有網路）
  ├─ 從 Supabase 獲取列表 → AsyncStorage 緩存 ✅
  └─ 用戶看到列表

後續訪問（5 分鐘內，有網路）
  ├─ AsyncStorage 有新鮮快取
  └─ 立即顯示，無網路請求 ⚡

後續訪問（5 分鐘後，有網路）
  ├─ AsyncStorage 快取過期
  ├─ 後臺拉取最新資料
  └─ 更新 AsyncStorage

無網路情況
  ├─ AsyncStorage 緩存存在
  ├─ 正常顯示列表 ✅
  └─ 新增/編輯操作記錄到隊列

網路恢復
  ├─ 自動同步隊列 ✅
  └─ 顯示同步狀態
```

### 場景 B：編輯物件詳情

```
用戶修改「月租金」欄位（無網路）
  ├─ AsyncStorage 立即更新 ⚡
  ├─ UI 顯示新值 ✅
  ├─ 修改記錄加入隊列 📝
  └─ 無延遲，用戶體驗好

網路恢復
  ├─ 自動上傳到 Supabase 📡
  ├─ Supabase 驗證權限 🔐
  ├─ RLS 政策確保只有房東能編輯 ✅
  └─ 其他設備同步更新 🔄
```

### 場景 C：多設備同步

```
iPad 上的 Dashboard A：修改物件狀態
  ├─ AsyncStorage (iPad) 更新
  └─ Supabase 資料庫更新

iPhone 上的 Dashboard B：訂閱 Realtime
  ├─ Realtime 推播通知
  ├─ AsyncStorage (iPhone) 更新
  └─ UI 刷新顯示新狀態 ✅

網頁版 (Next.js)：查詢同一物件
  ├─ Supabase 查詢最新資料
  └─ 顯示與 Mobile 一致的資料 ✅
```

---

## 總結

| 層級 | 技術 | 用途 | 特點 |
| :--- | :--- | :--- | :--- |
| **本地層** | AsyncStorage | 快速存取、離線支持 | 快 ⚡ / 有限 / 本地 |
| **遠程層** | Supabase (PostgreSQL) | 持久化、多設備同步 | 可靠 🔐 / 無限 / 中央 |

通過合理的分層架構和同步機制，房東 Dashboard 可以實現：
- ✅ 流暢的用戶體驗（快速響應）
- ✅ 完整的離線支持（無網路時可用）
- ✅ 資料一致性（多設備同步）
- ✅ 安全可靠（權限控制、備份）

---

## 修改歷史

| 日期 | 版本 | 修改者 | 修改內容 |
|------|------|--------|----------|
| 2026-02-01 | 1.0 | Claude Haiku 4.5 | 初始版本，完整說明 AsyncStorage 與 Supabase 的架構關係 |

---

**相關文檔參考**：
- `database_schema_complete.md` - Supabase 資料庫架構詳細設計
- `.claude/rules/frontend/react-expo.md` - Mobile 應用開發規則
- `docs/progress-reports/2026-02-01_claude_code_environment_technical_report.md` - Claude Code 環境配置
