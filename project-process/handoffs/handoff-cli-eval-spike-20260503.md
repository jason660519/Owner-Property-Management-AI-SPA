# Handoff — CLI 能力評測 Spike（2026-05-03）

## 狀態

✅ Merged via PR [#63](https://github.com/jason660519/Owner-Property-Management-AI-SPA/pull/63) — squash commit `2670a27`
✅ Remote branch `claude/loving-williams-e385ca` 已 deleted（user 在 GitHub UI 上完成）
⏳ Worktree 尚未 remove（需從主 repo path 跑 `git worktree remove`，見「未完成」）

## 變更摘要

在 `Settings → API 金鑰管理` 右邊新增 sheet tab「各家 CLI 能力評測 / CLI Eval」，可比較 4 家 coding-tool CLI（Claude Code / Codex / Copilot / OpenCode）配上 ollama cloud 模型在同一 prompt 下的真實輸出。

### 新檔

- `apps/superadmin/app/api/ai-settings/cli-eval-runs/route.ts` — POST endpoint，spawn CLI 並抓 stdout/stderr，含 codex stderr ANSI 抽取邏輯
- `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/CliCapabilityEvaluationPanel.tsx` — Panel + DetailSheet
- `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/cli-capability-evaluation-columns.tsx` — 表格欄位
- `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/cli-capability-row-state.ts` — 列狀態 / localStorage schema
- `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/cli-eval-tool-config.ts` — tool 對照表（command preview / status / models）

### 修改

- `apps/superadmin/app/superadmin/settings/api_key_and_model_setting/page.tsx` — sheet tab + `TABS` / `TAB_IDS` / `SHEET_TABS` / `renderContent` 加入新分頁

## 測試結果（端到端 TDD 驗證，4/4 通過）

| Tool     | 命令                                                                                            | E2E   | 結果 stdout 範例                                |
| -------- | ----------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------- |
| claude   | `ollama launch claude --model X --yes -- -p "..."`                                              | 13s   | 「我是 Anthropic 的 Claude 模型...」            |
| codex    | `ollama launch codex --model X --yes -- exec --oss --local-provider ollama-chat -m X "..."`     | 6.5s  | 「我是一個在 Codex CLI 中運行的 AI 程式設計助理...」 |
| copilot  | `ollama launch copilot --model X --yes -- -p "..." --allow-all-tools`                            | 12.6s | 「我是 GitHub Copilot CLI...」                  |
| opencode | `OPENCODE_CONFIG_CONTENT=… opencode run -m ollama/X "..."`（**繞過 ollama launch**）            | 34s   | 「我是 Sisyphus，來自 OhMyOpenCode...」         |

驗證層級：terminal 直接跑 → 透過 `/api/ai-settings/cli-eval-runs` API → UI 點 Run 按鈕。

## 關鍵 fix

1. **OpenCode bypass `ollama launch` wrapper**：headless mode 下 `ollama launch opencode` 會 hang（OPENCODE_CONFIG_CONTENT 注入未生效）。直接 spawn `opencode` 自己注入 `OPENCODE_CONFIG_CONTENT` env，定義 ollama provider for `@ai-sdk/openai-compatible`。
2. **codex stderr ANSI 抽取**：codex 在 spawn pipe 下把 thinking + final answer 都寫到 stderr（含 ANSI escape）。`extractCodexAnswerFromStderr` 過濾 `thinking|user|deprecated:|mcp:` 等 header，保留 `codex` 段。
3. **codex 必須走 OSS 路徑**：`--oss --local-provider ollama-chat -m <model>`，不然 ChatGPT account auth 擋住所有非 OpenAI cloud model（回 400）。
4. **copilot 必須加 `--allow-all-tools`**：不然 `-p` 模式仍會等使用者授權。
5. **OLLAMA_CLOUD_MODELS 改成 ollama 真實有的 cloud 列表**（`/api/tags` 抓出來的）。

## 阻塞 / 已知問題

- **OpenCode 走的是 user 自己的 `~/.config/opencode/opencode.json`**（含 `oh-my-openagent` plugin、Sisyphus agent prompt），所以模型自介可能被 plugin 改寫。要做公平模型比較，後續可加 `--pure` flag 跳過外部 plugin。
- **本 worktree（`.claude/worktrees/loving-williams-e385ca/`）尚未 remove**：因為流程結束時 cwd 還在 worktree 內，無法自我刪除。
- 主 repo 有自己的 uncommitted 變更（`.claude/settings.json`、`apps/superadmin/app/superadmin/settings/people-database/page.tsx` 等），未動。

## 未完成 / 下一步

### 立即（user 要在主 repo 跑）

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
# 同步 main
git fetch origin main
git checkout main && git pull --ff-only
# 移除 worktree（會把 dir + branch 一併清掉）
git worktree remove --force .claude/worktrees/loving-williams-e385ca
```

主 repo 自己的 working tree 變更（settings.json / people-database / .husky/_）由 user 自行決定要不要 commit。

### Skill 已更新（含今天踩的雷）

`.claude/commands/commit-push-pr-merge-cleanup-handoff.md` 已加入：

- husky shim 缺失預檢（步驟 5）
- worktree 不能 `git checkout main` 的 cleanup 變體（步驟 13）
- CI 紅了 → 抓 log 修錯後 push 同 branch 而非開新 PR（步驟 10）
- 不動主 repo working tree 的注意事項

更新後檔案路徑：`.claude/commands/commit-push-pr-merge-cleanup-handoff.md`（**主 repo path**，已 Edit 但**未 commit**，由 user 自行 commit）。

### 後續可加的功能（不在這個 PR）

1. opencode 加 `--pure` flag 跳過外部 plugin，做更乾淨的模型比較
2. 加 `LLM-as-judge` 自動評分欄（用一個固定 baseline 例如 Claude Opus 直連 API 幫每行打分）
3. Model dropdown 改成從 `http://127.0.0.1:11434/api/tags` 動態抓，避免硬編 model 名與 ollama 實際清單漂移
4. opencode 走 `opencode serve` HTTP server 模式（user 提供的 docs：https://opencode.ai/docs/server/），重複用同一個 process 省 cold start

## 文件參考

- ollama integrations docs: `https://docs.ollama.com/integrations/{claude-code,codex,opencode,copilot-cli}.md`
- opencode 主站: `https://opencode.ai/docs/`

## Co-author

🤖 Generated with [Claude Code](https://claude.com/claude-code) — Claude Opus 4.7 (1M context)
