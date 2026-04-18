# Row 100 測試說明（Adapter model id prefix lint）

## 目的

驗證 `tools/testing/lint-adapter-model-ids.sh` 對 `apps/superadmin/lib/adapter-config.ts` 的 `provider` / `model` 前綴規則稽核邏輯：

1. `provider='opencode' | 'kilo'` 時，`model` 必須以 `opencode/` 或 `openrouter/` 開頭；否則 OpenRouter 會 fallback 至 `openrouter/auto` 導致版本偷換與計費錯亂。
2. `provider='claude' | 'codex' | 'gemini'` 不受限制。
3. 預存於 `LEGACY_EXEMPTIONS` 的 id（待 Row 100 P1 baseline 盤點後修正）允許違規但會印 warning；**新加入的違規仍會擋 commit**。

背景：[project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md](../../../../project-process/dev-logs/dev-ai-settings-adapter-self-report-2026-04-19.md) §2 困難 B、§5 P0。

## 對應測試

- `apps/superadmin/unit_test/100/lint-adapter-model-ids.test.js` — 含 6 組 fixture：
  - 合法（Claude/opencode-prefixed/openrouter-prefixed/opencode-native）
  - 違規（opencode bare vendor / kilo bare vendor）
  - 不受限 provider（claude/codex/gemini）
  - Legacy exemption（warn + exit 0）
  - Mixed exempt + new violation（exit 1 with both messages）

## 執行方式

```bash
# 獨立執行（無 jest/vitest 依賴）
node apps/superadmin/unit_test/100/lint-adapter-model-ids.test.js

# 手動對真實 config 跑一次 lint
bash tools/testing/lint-adapter-model-ids.sh
```

## 相關檔案

- Lint 腳本：[tools/testing/lint-adapter-model-ids.sh](../../../../tools/testing/lint-adapter-model-ids.sh)
- Pre-commit hook（step 4）：[.husky/pre-commit](../../../../.husky/pre-commit)
- 規則：[.claude/rules/backend/ai-adapter.md](../../../../.claude/rules/backend/ai-adapter.md)
