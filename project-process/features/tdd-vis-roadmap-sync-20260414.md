# VIS ↔ Roadmap 雙向同步系統 — TDD-SPEC

**Row ID**: 136 / 137 / 138 / 139
**版本**: 0.1 (審查稿)
**日期**: 2026/04/14
**狀態**: 待審查

---

## 1. 測試策略

### 測試層級

| 層級 | 工具 | 涵蓋範圍 |
|---|---|---|
| 單元測試（純函數 + hooks） | Jest + @testing-library/react | 映射邏輯、衝突偵測、重試算法 |
| 元件測試 | Jest + @testing-library/react | Engineer UI、ExportDialog、ConflictResolver |
| API 路由測試 | Jest（mocked Supabase + Paperclip） | Webhook、Feature CRUD、Sync API |
| 整合測試 | Jest（real Supabase local） | 資料庫 CRUD + RLS 驗證 |
| E2E 測試 | Playwright | 完整 CEO 工作流 |

### 測試目錄

```
apps/superadmin/unit_test/136/   # Phase 1: 基礎設施
apps/superadmin/unit_test/137/   # Phase 2: 批量遷移
apps/superadmin/unit_test/138/   # Phase 3: 雙向同步引擎
apps/superadmin/unit_test/139/   # Phase 4: CEO 工作流
apps/superadmin/e2e/136-139/     # 跨 Phase E2E
```

---

## 2. Phase 1 — 基礎設施測試（Row 136）

### 2.1 `unit_test/136/webhook-endpoint.test.ts`

```
describe('POST /api/webhooks/paperclip')
  - returns 200 for valid HMAC signature
  - returns 401 for invalid HMAC signature
  - returns 401 when X-Paperclip-Signature header missing
  - inserts record to paperclip_webhook_logs with status=pending
  - processes event_type: status_changed correctly
  - processes event_type: assigned correctly
  - processes event_type: updated correctly
  - responds immediately without waiting for background processing
  - handles malformed JSON body with 400
```

### 2.2 `unit_test/136/background-worker.test.ts`

```
describe('processWebhookEvent')
  - processes pending event and marks as completed
  - retries on failure (attempt 1 → wait 30s → attempt 2)
  - retries up to 3 times before marking as failed
  - exponential backoff: delays are 30s, 60s, 120s
  - marks last_error on failure
  - does not process already completed events
  - does not process already failed events

describe('retryScheduler')
  - schedules retry after correct delay
  - stops retrying after max_attempts
```

### 2.3 `unit_test/136/engineer-actions.test.ts`

```
describe('listEngineers')
  - returns all active engineers
  - excludes inactive engineers by default
  - includes inactive when include_inactive=true

describe('createEngineer')
  - creates engineer with required fields
  - rejects duplicate user_id
  - validates role enum ('fullstack' | 'database' | 'sdet' | 'qa' | 'devops' | 'architect' | 'uiux')
  - validates hourly_rate_usd is non-negative

describe('updateEngineer')
  - updates display_name
  - updates max_concurrent_tasks
  - rejects invalid role value

describe('deactivateEngineer')
  - sets is_active=false
  - does not delete the record
```

### 2.4 `unit_test/136/EngineersTable.test.tsx`

```
describe('EngineersTable')
  - renders all engineer rows
  - displays capacity bar (available / max_concurrent_tasks)
  - shows "Edit" button on each row
  - shows "Deactivate" button on active engineers
  - shows "Reactivate" button on inactive engineers
  - clicking "Edit" opens EngineerEditDialog with pre-filled values

describe('EngineerEditDialog')
  - renders role select with all 7 options
  - validates hourly_rate_usd is not negative
  - validates max_concurrent_tasks is 1-10
  - calls onSave with correct values on submit
  - calls onClose on cancel
  - shows loading state during save
```

---

## 3. Phase 2 — 批量遷移測試（Row 137）

### 3.1 `unit_test/137/sync-roadmap-to-vis.test.ts`

```
describe('buildVISIssuePayload')
  - title = "[Category] Feature Name"
  - labels includes category and phase
  - story_points matches feature.points
  - priority = 'low' when percentage < 50 and phase = 'development'
  - priority = 'medium' when percentage >= 50 and phase = 'development'
  - priority = 'high' when phase = 'testing'
  - priority = 'urgent' when deployStatus = 'production' or phase = 'operations'
  - description contains acceptanceCriteria as first section
  - description contains featureSpecDocPath as markdown link
  - description contains locatedPage

describe('syncBatch')
  - skips features with existing vis_issue_id in incremental mode
  - processes all features in batch mode
  - updates roadmap.ts with vis_issue_id after successful creation
  - continues processing other features on single failure
  - respects rate limit (5 req/s)
  - retries on 429 Too Many Requests after 60s
  - generates summary report with success/skipped/failed counts
  - dry-run returns expected payloads without calling API

describe('writeBackToRoadmap')
  - updates vis_issue_id field in RAW_FEATURES
  - updates vis_issue_key field
  - updates vis_sync_status = 'in_sync'
  - updates vis_last_synced_at with ISO timestamp
  - preserves all other fields unchanged
```

### 3.2 `unit_test/137/sync-api-route.test.ts`

```
describe('POST /api/admin/sync-roadmap-to-vis')
  - requires superadmin role
  - returns 403 for non-admin user
  - streams SSE events for batch mode
  - SSE includes progress events with current/total
  - SSE includes done event with success/skipped/failed
  - dry_run=true returns payloads without creating VIS issues
  - incremental mode skips features with vis_issue_id
```

### 3.3 `unit_test/137/ExportProgressDialog.test.tsx`

```
describe('ExportProgressDialog')
  - shows mode selector (batch/incremental)
  - shows dry-run toggle
  - clicking "Export" calls API
  - displays progress bar updating as SSE events arrive
  - displays real-time log messages
  - shows summary on completion (success/skipped/failed counts)
  - "Download Report" button triggers JSON download
  - "Close" is disabled during export
  - shows error state on API failure
```

---

## 4. Phase 3 — 雙向同步引擎測試（Row 138）

### 4.1 `unit_test/138/sync-engine.test.ts`

```
describe('applyVISChangeToRoadmap')
  - status=done sets percentage=100 and phase=deployment
  - status=in_progress sets percentage=max(current, 50)
  - status=failed keeps phase=development, adds error note
  - assigned event updates lastModifiedBy with engineer name
  - skips update if feature not found by vis_issue_id
  - returns SyncResult with updated fields listed

describe('applyRoadmapChangeToVIS')
  - maps percentage change to VIS progress
  - maps phase change to VIS module
  - maps points change to stroy_points
  - maps category change to labels update
  - calls paperclipClient.updateIssue with correct payload
  - returns error if feature has no vis_issue_key

describe('detectConflicts')
  - returns empty array when no conflicts
  - detects conflict when both roadmap and VIS changed same field
  - returns list of conflicting field names
  - does not detect conflict when only one side changed
```

### 4.2 `unit_test/138/webhook-handler.test.ts`

```
describe('handleStatusChanged')
  - calls applyVISChangeToRoadmap with correct args
  - marks webhook_log as completed on success
  - marks webhook_log as failed on applyVISChangeToRoadmap error
  - queues retry on transient network failure

describe('handleAssigned')
  - finds feature by vis_issue_id
  - updates lastModifiedBy with assignee display_name

describe('updateRoadmapFeature')
  - updates correct feature in RAW_FEATURES by name
  - preserves all non-updated fields
  - sets lastModifiedBy = '[VIS-sync]'
  - sets lastModifiedDate = today in YYYY/MM/DD format
  - debounces multiple calls within 5s into one git commit
  - git commit message contains count of updated features
```

### 4.3 `unit_test/138/feature-crud-api.test.ts`

```
describe('PUT /api/admin/features/:featureName')
  - requires authenticated superadmin user
  - returns 404 if featureName not found in RAW_FEATURES
  - updates roadmap.ts with provided changes
  - calls applyRoadmapChangeToVIS if vis_issue_key exists
  - does NOT call VIS API if no vis_issue_key
  - returns 409 with conflict details when diverged state detected
  - sets vis_sync_status=diverged and inserts sync_conflicts row on conflict
  - returns updated RoadmapFeature in response body
```

### 4.4 `unit_test/138/conflict-resolver.test.ts`

```
describe('resolveConflict: strategy = roadmap')
  - applies roadmap_snapshot to VIS via PATCH
  - updates sync_conflicts row with resolution='roadmap', resolved_at, resolved_by
  - sets vis_sync_status='in_sync' on feature

describe('resolveConflict: strategy = vis')
  - applies vis_snapshot fields to roadmap.ts
  - updates sync_conflicts row with resolution='vis'
  - sets vis_sync_status='in_sync'

describe('resolveConflict: strategy = manual')
  - accepts merged_data payload
  - applies merged_data to both roadmap and VIS
  - updates sync_conflicts row with resolution='manual'

describe('auto-resolve logic')
  - resolves to vis when VIS status=done (agent completed)
  - resolves to roadmap when claimed_by is not null
  - marks diverged when both sides changed simultaneously
```

### 4.5 `unit_test/138/ConflictTable.test.tsx`

```
describe('ConflictTable')
  - lists all unresolved conflicts
  - shows feature name, conflicting fields, created_at
  - clicking "Resolve" opens ConflictDetailDialog

describe('ConflictDetailDialog')
  - renders roadmap snapshot on left
  - renders VIS snapshot on right
  - highlights conflicting fields
  - "Use Roadmap" button calls resolveConflict with strategy=roadmap
  - "Use VIS" button calls resolveConflict with strategy=vis
  - "Manual Merge" shows editable merged form
  - shows loading state during resolution
  - closes dialog on successful resolution
```

---

## 5. Phase 4 — CEO 工作流測試（Row 139）

### 5.1 `unit_test/139/auto-assign.test.ts`

```
describe('autoAssignFeature')
  - returns engineer with matching role and lowest assigned_tasks_count
  - returns Paperclip agent when no matching engineer available
  - falls back to 'architect' agent for unrecognized category
  - respects max_concurrent_tasks limit
  - returns null if all engineers and agents are at capacity

describe('getRecommendedAssignee')
  - returns fullstack for category 'Landlord' phase 'development'
  - returns sdet for phase 'testing'
  - returns qa for phase 'testing' with existing testCoverage
  - returns devops for phase 'deployment'
  - returns architect for phase 'operations'
```

### 5.2 E2E — `e2e/136-139/ceo-workflow.spec.ts`

```
describe('CEO task distribution full workflow')
  test 1: Export all features to VIS
    - Navigate to /superadmin/dashboard/project-progress
    - Click "Export to VIS" button
    - Select "Incremental" mode
    - Click "Export"
    - Wait for SSE completion
    - Verify success count > 0, failed = 0
    - Navigate to VIS dashboard (localhost:3187)
    - Verify issues appear with correct labels

  test 2: Assign task to engineer in VIS, verify roadmap sync
    - In VIS dashboard, find a test issue
    - Assign to engineer "Alice"
    - Wait 10s (webhook propagation)
    - In Superadmin, verify feature.lastModifiedBy = "Alice"

  test 3: Edit feature in Superadmin, verify VIS sync
    - In Superadmin, PUT /api/admin/features/TestFeature with percentage=75
    - Poll VIS issue: verify progress = 75

  test 4: Conflict detection and resolution
    - Simultaneously update same feature in both Superadmin and VIS
    - Verify /superadmin/conflicts shows 1 new conflict
    - Resolve conflict using "Use VIS" strategy
    - Verify both sides are in_sync

  test 5: Engineer capacity management
    - Navigate to /superadmin/engineers
    - Create new engineer profile (Alice, fullstack, $50/hr, max 2 tasks)
    - Assign 2 tasks to Alice
    - Verify Alice appears as "at capacity"
    - Assign 3rd task → verify warning or block
```

---

## 6. 覆蓋率目標

| 類別 | 目標 |
|---|---|
| 純函數（映射、衝突偵測、重試算法） | 100% |
| API 路由測試 | 85%+ |
| Hooks / Server Actions | 80%+ |
| 元件（渲染 + 互動） | 75%+ |
| E2E 流程 | 5 個完整路徑 ✅ |

---

## 7. 測試工具與設定

```
- Jest 29+ (@jest/globals)
- @testing-library/react 14+
- @testing-library/user-event 14+
- msw 2+ (API mock for unit tests)
- vi.useFakeTimers() for retry backoff tests
- @supabase/supabase-js mock for DB tests
- Playwright 1.40+ (E2E)
```

**Mock 策略**：

| 依賴 | 單元測試 Mock 方式 |
|---|---|
| Supabase client | `jest.mock('@/utils/supabase/admin')` |
| Paperclip client | `jest.mock('@/lib/paperclip/client')` |
| `git commit` | `jest.mock('child_process')` |
| roadmap.ts 讀/寫 | 測試用 fixture JSON，不依賴實際檔案 |
| HMAC 驗證 | `crypto.subtle.sign()` - Web Crypto mock |

---

## 8. 測試夾具（Test Fixtures）

### 8.1 `unit_test/shared/fixtures/roadmapFeature.ts`

```typescript
export const MOCK_FEATURE_DEVELOPMENT: RoadmapFeature = {
  name: "Test Feature A",
  category: "超級管理員 (Super Admin)",
  percentage: 30,
  phase: "development",
  points: 5,
};

export const MOCK_FEATURE_WITH_VIS: RoadmapFeature = {
  ...MOCK_FEATURE_DEVELOPMENT,
  vis_issue_id: "VIS-200",
  vis_issue_key: "uuid-vis-200",
  vis_sync_status: "in_sync",
  vis_last_synced_at: "2026-04-14T12:00:00.000Z",
};

export const MOCK_FEATURE_DIVERGED: RoadmapFeature = {
  ...MOCK_FEATURE_WITH_VIS,
  vis_sync_status: "diverged",
  percentage: 60,  // roadmap 端更新過
};
```

### 8.2 `unit_test/shared/fixtures/paperclipIssue.ts`

```typescript
export const MOCK_VIS_ISSUE: PaperclipIssue = {
  id: "uuid-vis-200",
  issueRef: "VIS-200",
  title: "[超級管理員 (Super Admin)] Test Feature A",
  status: "todo",
  priority: "low",
  story_points: 5,
  labels: ["超級管理員 (Super Admin)", "development"],
  updated_at: "2026-04-14T12:00:00.000Z",
};

export const MOCK_VIS_ISSUE_DONE: PaperclipIssue = {
  ...MOCK_VIS_ISSUE,
  status: "done",
  updated_at: "2026-04-14T14:00:00.000Z",
};
```

### 8.3 `unit_test/shared/fixtures/webhookPayload.ts`

```typescript
export const MOCK_WEBHOOK_STATUS_CHANGED = {
  event_type: "status_changed",
  issue_id: "uuid-vis-200",
  issue_key: "VIS-200",
  old_status: "in_progress",
  new_status: "done",
  updated_at: "2026-04-14T14:00:00.000Z",
};

export const MOCK_WEBHOOK_ASSIGNED = {
  event_type: "assigned",
  issue_id: "uuid-vis-200",
  issue_key: "VIS-200",
  assignee_display_name: "Alice",
  updated_at: "2026-04-14T14:00:00.000Z",
};
```

---

## 9. CI 整合

完成實作後，在 `apps/superadmin/unit_test/136/README.md`、`137/`、`138/`、`139/` 各別記錄測試執行指令：

```bash
# 單一 Phase 執行
cd apps/superadmin && npx jest unit_test/136 --coverage

# 所有 VIS 同步測試
cd apps/superadmin && npx jest unit_test/136 unit_test/137 unit_test/138 unit_test/139 --coverage

# E2E
cd apps/superadmin && npx playwright test e2e/136-139/
```

**test-manifest.json 新增項目**（實作完成後補充）：

```json
{ "id": "136", "tier": "pr", "testScriptPath": "apps/superadmin/unit_test/136" },
{ "id": "137", "tier": "pr", "testScriptPath": "apps/superadmin/unit_test/137" },
{ "id": "138", "tier": "nightly", "testScriptPath": "apps/superadmin/unit_test/138",
  "nightlyLayer": "regression", "nightlyOrder": 20 },
{ "id": "139", "tier": "nightly", "testScriptPath": "apps/superadmin/e2e/136-139",
  "nightlyLayer": "smoke", "nightlyOrder": 10 }
```

---

## 10. 變更紀錄

| 日期 | 說明 |
|---|---|
| 2026/04/14 | 初版 TDD 規格（Claude Sonnet 4.6） |
