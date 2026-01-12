# Redis 必要性分析

## 專案需求分析

根據您的專案架構，以下是可能需要 Redis 的場景：

### 1. **Rasa 對話狀態儲存** ⚠️ **可能需要**

**Rasa 的對話管理需求：**
- Rasa 需要儲存用戶的對話狀態（conversation tracker）
- 支援多輪對話的上下文管理
- 需要快速讀寫對話狀態

**Redis 的優勢：**
- 快速存取對話狀態
- 支援過期時間（自動清理舊對話）
- 適合高並發場景

**替代方案：**
- Rasa 可以使用 SQLite（適合單機/小規模）
- PostgreSQL（如果用戶量不大，效能可接受）

### 2. **Django 快取** ✅ **建議使用**

**使用場景：**
- 快取物件列表查詢結果
- 快取謄本解析結果（避免重複解析）
- 快取生成的廣告頁面內容
- 快取財務報表計算結果

**效能提升：**
- 減少 PostgreSQL 查詢壓力
- 加速重複查詢的響應時間
- 降低 LLM API 調用成本（快取生成內容）

### 3. **Session 儲存** ⚠️ **可能需要**

**使用場景：**
- 用戶登入狀態管理
- 手機驗證碼臨時儲存
- 表單資料暫存

**替代方案：**
- Django 預設使用資料庫 session（PostgreSQL）
- 對於小規模應用，資料庫 session 足夠

### 4. **LLM API 響應快取** ✅ **強烈建議**

**使用場景：**
- 快取相同的謄本解析結果（相同 PDF 不重複調用 LLM）
- 快取生成的廣告文案（相同物件資訊不重複生成）
- 快取合約模板生成結果

**成本效益：**
- LLM API 調用昂貴（GPT-4o, Claude 3.5）
- 快取可以大幅降低 API 成本
- 提升響應速度

### 5. **任務隊列（Celery）** ⚠️ **未來可能需要**

**使用場景：**
- 非同步處理謄本解析（耗時操作）
- 非同步生成廣告頁面
- 非同步發送簡訊/Email
- 批次處理財務報表

**目前階段：**
- 初期可能不需要
- 當需要非同步處理時再引入

## 建議方案

### 方案一：初期不使用 Redis（推薦）✅

**適用情況：**
- 專案還在開發初期
- 用戶量較少（< 100 用戶）
- 預算有限，想先驗證產品概念

**實施方式：**
- Rasa 使用 SQLite 儲存對話狀態
- Django 使用資料庫 session
- LLM 響應暫時不快取（或使用簡單的記憶體快取）

**優點：**
- 減少基礎設施複雜度
- 降低運維成本
- 專注核心功能開發

**缺點：**
- 效能可能較慢
- LLM API 成本較高
- 擴展性較差

### 方案二：使用 Redis（推薦）✅

**適用情況：**
- 需要良好的效能表現
- 需要降低 LLM API 成本
- 準備擴展到更多用戶
- 需要非同步任務處理

**實施方式：**
- Rasa 使用 Redis 儲存對話狀態
- Django 使用 Redis 快取
- LLM 響應快取到 Redis
- 未來可加入 Celery 任務隊列

**優點：**
- 效能優秀
- 降低 API 成本
- 良好的擴展性
- 支援非同步處理

**缺點：**
- 增加基礎設施複雜度
- 需要額外的記憶體資源

## 成本效益分析

### 不使用 Redis 的成本
- **LLM API 成本**：每次查詢都調用 API
  - GPT-4o: ~$0.01-0.03 per request
  - 如果每天 100 次查詢 = $1-3/天 = $30-90/月
- **效能成本**：查詢較慢，用戶體驗較差

### 使用 Redis 的成本
- **記憶體成本**：Redis 約需 100-500MB 記憶體
- **運維成本**：需要維護 Redis 服務
- **節省的 API 成本**：快取命中率 50% = 節省 $15-45/月

## 專案階段建議

### 階段一：MVP 開發（當前階段）
**建議：不使用 Redis**
- 專注核心功能開發
- 使用 SQLite 或 PostgreSQL 儲存對話狀態
- 簡化基礎設施

### 階段二：效能優化
**建議：引入 Redis**
- 當用戶量增加時
- 當 LLM API 成本成為問題時
- 當需要非同步處理時

### 階段三：規模擴展
**建議：Redis + Celery**
- 使用 Redis 作為 Celery broker
- 實現完整的非同步任務處理
- 優化快取策略

## 實作建議

### 如果決定使用 Redis

**Docker Compose 配置（已存在）：**
```yaml
redis:
  image: redis:7-alpine
  container_name: owner_saas_redis
  ports:
    - "6379:6379"
  networks:
    - owner_net
```

**Django 設定範例：**
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://redis:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Session 儲存
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
```

**Rasa 設定範例：**
```yaml
# endpoints.yml
tracker_store:
  type: RedisTrackerStore
  url: redis://redis:6379
  db: 0
  record_exp: 3600  # 對話記錄過期時間（秒）
```

### 如果決定不使用 Redis

**移除 Docker Compose 中的 Redis：**
```yaml
# 註解掉或刪除
# redis:
#   image: redis:7-alpine
#   ...
```

**更新 backend 的 depends_on：**
```yaml
backend:
  depends_on:
    - db
    # - redis  # 移除這行
```

**Rasa 使用 SQLite：**
```yaml
# endpoints.yml
tracker_store:
  type: SQLTrackerStore
  dialect: "postgresql"
  url: postgresql://postgres:postgres@db:5432/ownersaas
```

## 總結建議

### 對於您的專案，我建議：

**初期（MVP 階段）：不使用 Redis** ⚠️
- 專案還在開發階段
- 用戶量較少
- 可以先用 PostgreSQL 或 SQLite
- 降低複雜度，專注核心功能

**後期（優化階段）：引入 Redis** ✅
- 當用戶量增加時
- 當 LLM API 成本成為問題時
- 當需要非同步處理時
- 當需要更好的效能時

**目前建議：**
1. **暫時保留 Redis 在 docker-compose.yml**（註解掉或保留）
2. **後端暫時不依賴 Redis**（移除 depends_on）
3. **Rasa 先使用 PostgreSQL 儲存對話狀態**
4. **當需要時再啟用 Redis**

這樣可以：
- 保持架構的靈活性
- 降低初期複雜度
- 方便未來擴展
