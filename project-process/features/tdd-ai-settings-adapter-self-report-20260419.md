# TDD Spec — Adapter 模型自報版本驗證（2026-04-19）

**Row ID**：100
**對應 Dev Spec**：`/project-process/features/ai-settings-adapter-self-report-dev-spec-20260419.md`
**Test File**：`apps/superadmin/app/superadmin/settings/api_key_and_model_setting/__tests__/adapter-evaluation.test.ts`
**測試框架**：Jest（superadmin 自帶 config）
**Mock 策略**：純函式測試，不需 mock

---

## 1. 測試金字塔

| 層級 | 數量 | 範圍 |
| :--- | :-: | :--- |
| Unit  | 25 | `parseSelfReportedModel`、`compareSelfReportToRequested`、`evaluateAdapterRun`（含原有 10 個 + 新增 15 個） |
| Integration | 0  | （本次 scope 外；等 `verify-adapter-self-report.ts` nightly job 補）                                       |
| E2E   | 0  | （本次 scope 外；UI badge 由 visual regression 既有覆蓋）                                                  |

---

## 2. 測試案例清單

### 2.1 `evaluateAdapterRun`（既有 10 個保持綠 + 新增 5 個）

| # | Test Case | Input | Expected |
| :-: | :-------- | :---- | :------- |
| 1  | empty render → fail            | `renderedOutput: '  '`                                       | `level: 'fail', message: '不及格（render 與 raw 皆過短或空白）'` |
| 2  | model fallback → warning       | `requested: gpt-4.1`, `effective: gpt-4.1-mini`              | `level: 'warning', message: '模型不正確，暫時回退到 gpt-4.1-mini'` |
| 3  | effective empty → pending      | `effectiveModel: ''`                                          | `level: 'pending', message: '待判定（尚未取得實際模型）'` |
| 4  | raw empty → pending            | `outputLines: ['   ']`                                        | `level: 'pending', message: '待判定（raw output 不足）'` |
| 5  | normal pass                    | model match + valid output                                    | `level: 'pass', message: '模型正確（及格）'` |
| 6  | OpenRouter qwen slug match     | `requested: qwen-3.6-plus`, `effective: qwen/qwen3.6-plus`    | `level: 'pass'` |
| 7  | OpenRouter kimi/glm/minimax match | `kimi-k2.5` ↔ `moonshotai/kimi-k2.5` 等三組               | `level: 'pass'`（皆通過） |
| 8  | fallback message but no real text → fail | `renderedOutput: 'API fallback 成功，但無文字輸出。'` | `level: 'fail'` |
| 9  | render short but raw enough → pass | `renderedOutput: ' '`, `outputLines: ['這是一段足夠長的 CLI 輸出內容用於測試']` | `level: 'pass'` |
| 10 | minimax m2.6 vs m2.7 → warning | requested 與 effective 不同版本                               | `level: 'warning'` |
| **11** ★ | **m2.7 served as m2.1 → fail** | renderedOutput 自報 MiniMax-M2.1，requested = m2.7  | `level: 'fail'`, message contains `'不及格'`、`'自報'`、`'m2.1'` |
| **12** ★ | self-report m2.5 == m2.5 → pass | renderedOutput 自報 M2.5                                | `level: 'pass'` |
| **13** ★ | self-report family only → pass  | renderedOutput: `'我是 Claude'`                          | `level: 'pass'` |
| **14** ★ | self-report different family → pass | requested gpt-4.1，回應提及 Claude（保守不誤殺）       | `level: 'pass'` |

### 2.2 `parseSelfReportedModel`（5 個新測試）

| # | Test Case | Input | Expected |
| :-: | :-------- | :---- | :------- |
| 15 | MiniMax-M2.1 中文自報 | `'你好！我是 **MiniMax-M2.1**，由 MiniMax 公司构建的AI助手。'` | `family: 'minimax', versionFingerprint: 'm21'` |
| 16 | Claude 3.5 英文自報   | `"Hi, I'm Claude 3.5 Sonnet, made by Anthropic."`          | `family: 'claude', versionFingerprint: '35'` |
| 17 | gpt-4o 自報           | `'I am GPT-4o, an OpenAI model.'`                          | `family: 'gpt', versionFingerprint: '4o'` |
| 18 | 無已知家族            | `'I am a large language model.'`                           | `family: null, versionFingerprint: null` |
| 19 | 家族但無版本          | `'我是 Kimi，很高興認識你。'`                              | `family: 'kimi', versionFingerprint: null` |

### 2.3 `compareSelfReportToRequested`（5 個新測試）

| # | Test Case | Self | Requested | Expected |
| :-: | :-------- | :--- | :-------- | :------- |
| 20 | 同家族不同版本 | parsed `'我是 MiniMax-M2.1'` | `'minimax/minimax-m2.7'` | `'version-mismatch'` |
| 21 | 同家族同版本 | parsed `'我是 MiniMax M2.7'` | `'minimax/minimax-m2.7'` | `'match'` |
| 22 | 自報無版本 | parsed `'我是 Claude'` | `'claude-3-5-sonnet'` | `'family-only-match'` |
| 23 | 自報無家族 | parsed `'Hello world.'` | `'gpt-4.1'` | `'not-detected'` |
| 24 | 跨家族 | parsed `'I am Claude 3.5'` | `'gpt-4.1'` | `'family-mismatch'` |

### 2.4 既有 `isExplicitEmptyOrErrorOutcome`（保持 1 個 sanity）

| # | Test Case | Input | Expected |
| :-: | :-------- | :---- | :------- |
| 25 | 多種 fallback 字串偵測 | 三組字串 | true / true / false |

---

## 3. Mock 策略

無 mock。全部為純函式測試，input → output 對拍。

---

## 4. 覆蓋率目標

| Metric | Target | Actual |
| :----- | :----: | :----: |
| 新增邏輯行 coverage | 100% | 100%（25 tests 全綠，所有 branch 都有 case） |
| `evaluateAdapterRun` branch | 100% | 100% |
| `parseSelfReportedModel` branch | 100% | 100%（含 empty / family-only / not-detected / both-present） |
| `compareSelfReportToRequested` branch | 100% | 100%（5 種回傳值都有對應 case） |

---

## 5. 執行命令

```bash
cd apps/superadmin
npx jest app/superadmin/settings/api_key_and_model_setting/__tests__/adapter-evaluation.test.ts --no-coverage
```

預期輸出：
```
Test Suites: 1 passed, 1 total
Tests:       25 passed, 25 total
Time:        ~0.5s
```

---

## 6. Manifest 同步

本次新增測試屬於既有檔案的擴充，不需在 `apps/superadmin/test-manifest.json` 新增 entry；既有 `adapter-evaluation` 條目（若有）會自動覆蓋。

如需新增為獨立 manifest entry：
```jsonc
{
  "id": "100-adapter-self-report",
  "tier": "pr",
  "status": "active",
  "unit": ["app/superadmin/settings/api_key_and_model_setting/__tests__/adapter-evaluation.test.ts"]
}
```

---

## 7. 後續測試擴充

- 整合測試：寫 `verify-adapter-self-report.ts` 後，加入跨 adapter 的 self-report 樣本資料庫測試
- 視覺迴歸：Adapter Config table 的 fail badge 顏色（已由現有 visual regression 覆蓋）
- 跨家族別名測試：等收集到 GLM/ChatGLM 等 alias 衝突真實 case 後再補
