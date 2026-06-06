# Handoff: CodeGraphContext MCP 整合

**日期**：2026-05-03
**PR**：[#65](https://github.com/jason660519/Owner-Property-Management-AI-SPA/pull/65)（已 squash merge → main）
**分支**：`chore/cgc-integration`（已清除）

---

## 變更摘要

### 安裝 CodeGraphContext (CGC) v0.4.5

- 安裝方式：`pipx install codegraphcontext`（Python 3.14 + Homebrew 限制下唯一可行方式）
- 修復 `tree-sitter-language-pack` 版本衝突：v1.6.3 改模組名稱導致 CGC 無法解析任何檔案，降版至 v0.7.3 解決
- 已索引：869 files、14,359 functions、1,656 classes
- MCP 全域註冊：`claude mcp add --scope user codegraphcontext`

### 視覺化器 Port

- 使用 18781（避開所有現有 port：3000/3001/3002/9200/5601/3187/18789/54323/54324）
- `~/.zshrc` 加入 alias：`cgc-viz='cgc visualize --port 18781'`
- 已確認瀏覽器可正常開啟 http://localhost:18781

### 更新的文件

| 檔案 | 內容 |
|---|---|
| `CLAUDE.md` | 省 Token 章節加 CGC MCP 說明 |
| `docs/operational-guides/token-saving-guide.md` | 新增 §7 CodeGraphContext MCP 詳細說明 |
| `start.sh` | 新增 `start_cgc_viz()` 函式；`start all` 自動啟動；menu item 15 |
| `stop.sh` | `kill_port 18781 "CGC Visualizer"` + log 清理 |

---

## 使用方式

```bash
# Claude Code session 內直接問（最省 token）
「哪些地方呼叫了 useAuth？」
「adapter-config.ts 被哪些檔案 import？」

# CLI
cgc analyze callers <funcName>
cgc analyze callees <funcName>
cgc find pattern "useAuth"
cgc analyze dead-code

# 視覺化
cgc-viz   # 開啟 http://localhost:18781
```

---

## 已知限制

- Worktree 內的新異動需手動 `cgc index .` 才納入（worktree 彼此隔離）
- `cgc doctor` 顯示 tree-sitter-language-pack 未安裝屬於誤報（doctor 檢查舊模組名），實際解析正常

---

## 下一步

無阻塞事項。CGC 已就緒，未來 session 中 Claude 會自動透過 MCP 查詢函式關係圖，減少 grep 全 repo 的 token 消耗。
