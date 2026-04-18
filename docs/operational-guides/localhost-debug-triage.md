# 本機服務連不上 — 三步 Triage

> **建立日期**: 2026-04-19 | **位置**: `docs/operational-guides/localhost-debug-triage.md`
> **適用情境**: 某個 `localhost:<port>` 的服務在瀏覽器打不開，但你不確定是瀏覽器、macOS、還是服務本身的問題
> **目的**: 在 1 分鐘內定位到正確的層級，避免盲目重開機 / 重啟服務

---

## 為什麼需要這篇

「瀏覽器打不開 localhost」可能的根因散落在四層：

1. **服務本身沒跑 / 崩了**（Next dev server 死掉、port 沒人聽）
2. **Middleware / auth redirect** 把你踢去別的地方（看起來像「打不開」但其實是 3xx）
3. **macOS 系統網路層**（loopback interface、`mDNSResponder` DNS cache、TCP socket 卡住）
4. **瀏覽器本身卡住**（Chrome render process zombie、service worker 卡死、壞 cookie、extension 干擾）

直接重開機會「順便」修好多數狀況，但你不會知道**到底哪一層壞了**，下次還會再踩。

---

## 三步法（順序照做，從便宜到貴）

### Step 1 — 換個瀏覽器或開無痕

打 `http://localhost:<port>` 試一下：

- ✅ **其他瀏覽器能打開** → **99% 是原本那個瀏覽器自己的鍋**（cookie / service worker / extension / render process 卡住）
  - 處理：清該網域的 cookie + Application → Service Workers 全部 Unregister，或直接關掉整個瀏覽器重開
  - **不要**重開機
- ❌ **全部瀏覽器都打不開** → 進 Step 2

### Step 2 — 在 Terminal 用 curl

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" http://localhost:<port>/
curl -sS -I http://localhost:<port>/<實際路徑>   # 看 Location header，判斷有無 redirect
```

- ✅ **curl 有回應（200 / 3xx / 4xx 都算）** → 服務活著，問題在**瀏覽器到 GUI 網路層**之間
  - 3xx redirect 到 `/login` 之類 → 是**認證問題**，不是「打不開」（檢查 middleware、cookie、session）
  - 2xx/4xx 但瀏覽器打不開 → 偏向瀏覽器或系統 GUI 網路層
- ❌ **`Failed to connect to localhost port <port>`** → 進 Step 3

### Step 3 — 檢查 port 有沒有人聽

```bash
lsof -iTCP:<port> -sTCP:LISTEN -n -P
```

判斷：

| curl | lsof | 根因 | 處理 |
|:-----|:-----|:-----|:-----|
| ❌ 連不上 | 沒 LISTEN | **服務沒跑** | 啟動服務（`./start.sh` 等）。看 `logs/dev/` 的對應 log 找上次為什麼死 |
| ❌ 連不上 | 有 LISTEN | **macOS loopback / 網路層異常** | 這才是真正「系統問題」的訊號。可試 `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder`；還不行再考慮重開機 |
| ✅ 有回應 | 有 LISTEN | 瀏覽器層問題 | 回 Step 1 |

---

## 反向線索：如果重開機修好了，原本是哪一層？

**Cookie / localStorage 會跨越重開機保留**，所以：

- 重開機修好 → **不太可能是 cookie / session 問題**
- 比較可能是：瀏覽器進程 zombie、mDNSResponder 壞掉、TCP socket 殘留、kernel 層網路卡住

反過來說，如果你**登出再登入一次**就好了（沒重開機）→ 才是 cookie / session 問題。

---

## 本專案常見的「假打不開」

### Superadmin (`localhost:3001/superadmin/*`) 被 307 redirect 到 `/login`

- 檔案：`apps/superadmin/middleware.ts`（未登入時 redirect 至 `/login?returnUrl=...`）
- 症狀：curl 看到 `location: /login?returnUrl=...`，Chrome 一瞬間跳 /login，看起來像「沒進 dashboard」
- 處理：去登入，或檢查 Supabase session cookie（`sb-localhost-auth-token`）是否過期

### Next dev server 被 Ctrl+C 掉但 log 沒錯誤

- 症狀：`logs/dev/superadmin.log` 最後是 `[?25h`（terminal cursor reset）沒 stack trace，port 3001 沒 LISTEN
- 處理：`./start.sh` 重新拉起即可，不是真的 bug

---

## 相關檔案

- 啟動腳本：`./start.sh` / `./stop.sh`（見 `CLAUDE.md`）
- 本機服務 URL 對照：`CLAUDE.local.md`
- Superadmin middleware：`apps/superadmin/middleware.ts`
- Dev log 目錄：`logs/dev/`
