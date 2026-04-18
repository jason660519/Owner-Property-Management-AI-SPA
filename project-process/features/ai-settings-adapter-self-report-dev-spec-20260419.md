# Dev Spec — Adapter 模型自報版本驗證（2026-04-19）

**Row ID**：100
**功能**：超級管理員-AI 服務設定（API 金鑰與模型費用） — 子模組「Adapter Config 評估邏輯」
**頁面**：`/superadmin/settings/api_key_and_model_setting#adapter-config`
**狀態**：✅ Implemented & Verified
**作者**：Claude Opus 4.7
**最後更新**：2026-04-19

---

## 1. 背景與動機

Adapter Config 表格在每次跑完測試 prompt（預設「你是哪一家的模型？型號是？」）後，會自動產生 evaluation badge（pass / warning / fail / pending）。原本的 evaluation 流程只比對 `requestedModel` vs `effectiveModel` 兩個 config 端字串，沒有驗證模型實際自報的內容。

當聚合 router（如 OpenRouter）把「不存在的版本」silently route 到「實際存在的版本」時（例：`minimax/minimax-m2.7` → 實際 `minimax/minimax-m2.1`），原本的 evaluation 會誤判為 pass，使用者看到綠燈卻拿到錯版本的回應，造成測試結論不可信。

---

## 2. 範圍

| 範圍內 | 範圍外 |
| :--- | :--- |
| `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-evaluation.ts` 的純函式擴充 | adapter-runs API 路徑、CLI spawn 邏輯 |
| Evaluation 訊息文案（`不及格（模型自報為 ...）`）             | UI badge 顏色 / 樣式（已由現有 `level` 對應） |
| `apps/superadmin/lib/adapter-config.ts` 兩列 MiniMax adapter id 修正 | 其他 adapter 的 id 命名（待後續 lint 任務）   |
| 25 個單元測試（含 5 個 family/version 解析、5 個比對、其餘為 e2e 評估） | 整合測試 / E2E（既有 CI 不變）                |

---

## 3. 架構

### 3.1 資料流

```
adapter test prompt
   ↓
CLI spawn (opencode/kilo/...)
   ↓
streaming stdout / API fallback
   ↓
deriveResultFromLogs → renderedOutput + outputLines
   ↓
evaluateAdapterRun({
  requestedModel,
  effectiveModel,    ← echo from request payload
  renderedOutput,    ← model's actual self-introduction
  outputLines,
})
   ↓
{ level, message } → AdapterRunNotice + badge
```

### 3.2 Evaluation 判定優先序（含本次新增的第三道）

```
1. !outputMeaningfulEnough          → fail   '不及格（render 與 raw 皆過短或空白）'
2. hasNoActualModelReply            → fail   '不及格（API／fallback 無可讀模型輸出）'
3. !effectiveModel                  → pending '待判定（尚未取得實際模型）'
4. !modelMatched (config-side)      → warning '模型不正確，暫時回退到 ${effectiveModel}'
5. !rawOk                           → pending '待判定（raw output 不足）'
6. ★ self-report version-mismatch   → fail   '不及格（模型自報為 ${self}，與請求的 ${requested} 不一致）'
   ★ otherwise                      → pass   '模型正確（及格）'
```

### 3.3 核心元件

| 函式                              | 純度   | 說明                                                                                             |
| :-------------------------------- | :----- | :----------------------------------------------------------------------------------------------- |
| `parseSelfReportedModel(text)`    | Pure   | 從文字抽家族（minimax/kimi/glm/gpt/claude/gemini/qwen/deepseek/llama/mistral/grok）+ 版本指紋   |
| `compareSelfReportToRequested(self, requested)` | Pure | 回傳 `match` / `version-mismatch` / `family-mismatch` / `family-only-match` / `not-detected` |
| `detectFamilyHit(text)`           | Pure   | 內部 helper：找最早出現的家族別名                                                                |
| `extractVersionFingerprint(text, anchor?)` | Pure | 抽版本指紋（alphanumeric only）                                                                  |
| `evaluateAdapterRun(input)`       | Pure   | 主入口（含上述新檢查）                                                                           |

---

## 4. 檔案清單

### 4.1 新增

無新檔（純函式擴充在既有檔案內）。

### 4.2 修改

| 檔案 | 變更類型 | 變更摘要 |
| :--- | :------- | :------- |
| `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/adapter-evaluation.ts` | 擴充 | +122 行：family detector + version fingerprint + 比對函式 + 第三道檢查 |
| `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/__tests__/adapter-evaluation.test.ts` | 擴充 | +114 行：15 個新測試案例 |
| `apps/superadmin/lib/adapter-config.ts` | 設定變更 | Kilo / OpenCode 兩列 MiniMax adapter `model` 改為 `openrouter/minimax/minimax-m2.5`；label 加註「（實際 M2.5）」 |

---

## 5. API / 介面變更

### 5.1 公開 API（從 adapter-evaluation.ts 匯出）

```typescript
export interface SelfReportedModel {
  family: string | null;
  versionFingerprint: string | null;
  raw: string | null;
}

export type SelfReportComparison =
  | 'not-detected'
  | 'family-mismatch'
  | 'version-mismatch'
  | 'family-only-match'
  | 'match';

export function parseSelfReportedModel(text: string): SelfReportedModel;
export function compareSelfReportToRequested(self: SelfReportedModel, requestedModel: string): SelfReportComparison;
```

`evaluateAdapterRun` 簽名不變（向後相容），但 `level` 在新場景下會回 `fail`。

### 5.2 訊息變更

新增 fail 訊息：

```
不及格（模型自報為 MiniMax-M2.1，與請求的 minimax/minimax-m2.7 不一致，provider 可能未誠實回傳實際版本）
```

---

## 6. 設計決策（保守策略）

| 比對結果              | 處理方式                | 理由                                                                            |
| :-------------------- | :---------------------- | :------------------------------------------------------------------------------ |
| `match`               | pass                    | 自報與請求一致，最高信心                                                        |
| `family-only-match`   | pass                    | 模型沒講版本（如「我是 Claude」），不能反證錯誤                                 |
| `not-detected`        | pass                    | 模型沒提任何家族（如「I am a large language model」），無從比對                |
| `family-mismatch`     | pass（不降級）          | 模型可能在回答中提及其他競品（「我跟 Claude 不一樣」），保守不誤殺              |
| `version-mismatch` ★ | **fail**                | 同家族但版本指紋明確不一致 → provider 偷換版本之強訊號                          |

**家族別名表**（以「最早出現」原則挑選 family hit）：

```
minimax  → ['minimax']
kimi     → ['moonshot', 'kimi']
glm      → ['chatglm', 'glm', 'z-ai']
gpt      → ['chatgpt', 'gpt', 'openai']
claude   → ['claude']
gemini   → ['gemini']
qwen     → ['qwen', 'tongyi', 'qianwen']
deepseek → ['deepseek']
llama    → ['llama']
mistral  → ['mistral']
grok     → ['grok']
```

**版本指紋抽取**：以家族別名為 anchor，往後 40 字元找 `[a-z]?\d+(?:[.\-]\d+)+[a-z]?|\d+[a-z]`，去除非英數字後得到 `m27` / `35` / `4o` 等 fingerprint。

---

## 7. 擴充指南

### 7.1 新增模型家族

編輯 `adapter-evaluation.ts` 的 `KNOWN_MODEL_FAMILIES` 陣列，加入 `{ family, aliases }`。注意：

- 別名要小寫
- 較長且專屬的別名（如 `moonshot` 之於 kimi）放前面，避免被通用詞（如 `kimi`）搶先 match
- 加完同步補測試

### 7.2 處理白名單例外

若某個模型自稱會跟內部代號錯位（例如 GLM 自稱 ChatGLM），可在家族別名中同時納入兩個別名（同 family，不同 alias），讓兩者都會 hit 到同一個 family。

### 7.3 將 fail 改回 warning

只需修改 `evaluateAdapterRun` 中 `comparison === 'version-mismatch'` 分支的 `level` 欄位。

---

## 8. 風險與已知限制

| 風險 | 嚴重度 | 緩解 |
| :--- | :----- | :--- |
| 模型在自報時用內部代號（如 Sonnet 4.7 → Sonnet 4） | 中     | 保守策略：版本不一致才 fail；可透過家族別名表收斂                              |
| 模型完全不回答自報問題（fallback 純解釋專長）       | 低     | `not-detected` → 維持 pass；不影響原有評估                                    |
| 解析正則漏 corner case（如 `gpt-5.4-pro-2026-03-05`） | 低 | 已測 `4o`、`m2.7`、`3.5`、`5.1` 等；可逐步擴充                                |
| Family alias 重疊造成誤判（gpt 跟 chatgpt）         | 低     | 用「最早出現位置 + 最長別名」打破 tie；已在 `detectFamilyHit` 處理            |

---

## 9. 驗收標準

1. ✅ 25 個 unit tests 全綠（`npx jest adapter-evaluation.test.ts`）
2. ✅ 截圖回歸 case：`requested = m2.7`、`renderedOutput = "我是 MiniMax-M2.1"` → `level: 'fail'`
3. ✅ 一致 case：`requested = m2.5`、`renderedOutput = "我是 MiniMax-M2.5"` → `level: 'pass'`
4. ✅ 實機驗證：OpenCode CLI 跑「OpenCode CLI + MiniMax M2.7（實際 M2.5）」回報 pass，模型自報 M2.5
5. ✅ TypeScript 嚴格模式無錯
6. ✅ 既有 10 個測試全部維持綠

---

## 10. 後續工作（見開發日誌 §5）

- 加 `tools/testing/lint-adapter-model-ids.sh`（pre-commit）
- 寫 `scripts/verify-adapter-self-report.ts`（nightly）
- 對其餘 adapter 跑基準自報測試
