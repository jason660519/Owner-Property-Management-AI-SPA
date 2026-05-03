針對難以復現的 bug 與效能回歸，執行紀律性診斷迴圈。
流程：建立回饋迴圈 → 復現 → 假設 → 儀器化 → 修復 → 回歸測試。
當使用者說「diagnose this」、「debug this」、回報某功能壞掉/拋錯/失敗，或描述效能下降時啟動。

---

## Phase 1 — 建立回饋迴圈（最重要）

**這是整個技能的核心。** 有了快速、確定性、可自動執行的 pass/fail 信號，bug 就解決了 90%。沒有就算再看程式碼也無濟於事。

在這個 phase 上花不成比例的時間。**積極嘗試，不要放棄。**

### 本專案可用的回饋迴圈工具（依優先序）

1. **失敗的測試** — unit test (`apps/superadmin/unit_test/{ID}/`) 或 E2E (`apps/superadmin/e2e/{ID}/`)
2. **Playwright CLI** — `bash tools/testing/playwright-cli.sh <cmd>`（比 MCP 省 3–5× token）
3. **curl / HTTP script** — 打 local API (`localhost:3001/api/...`) 並 diff 回應
4. **最小復現腳本** — 在 `tools/` 下建 throwaway harness，隔離問題路徑
5. **屬性 / Fuzz loop** — 輸出「有時不對」時跑 1000 筆隨機輸入找失敗模式
6. **Bisect harness** — bug 在兩個已知狀態之間出現時用 `git bisect run`
7. **差異比對** — 舊版 vs 新版（或兩種設定）對同輸入 diff 輸出

迴圈建好後繼續優化它：更快？信號更精確？更確定？一個 2 秒確定性迴圈 >> 一個 30 秒 flaky 迴圈。

**非確定性 bug：** 目標是提高復現率，不是完美復現。並行觸發 100 次、加壓力測試、縮小時機視窗，直到 flake rate 夠高才能 debug。

**若真的無法建迴圈：** 停下來明說。列出試過的方法。請使用者提供：(a) 能復現的環境存取、(b) HAR/log dump/core dump、(c) 允許加暫時生產日誌。**不能在沒有迴圈的情況下進入 Phase 2。**

---

## Phase 2 — 復現

執行迴圈，確認 bug 出現。

確認清單：
- [ ] 迴圈產生的是**使用者描述的**失敗模式（不是旁邊另一個失敗）
- [ ] 失敗可在多次執行中復現（或對非確定性 bug 達到夠高的復現率）
- [ ] 已記錄精確症狀（錯誤訊息、錯誤輸出、慢速時機），供後續 phase 驗證修復有效

復現成功才繼續。

---

## Phase 3 — 假設

**先列出 3–5 個排序假設，再測試任何一個。** 只想到一個就去測 = 錨定效應。

每個假設必須可被證偽：

> 格式：「如果 \<X\> 是原因，那麼 \<改動 Y\> 會讓 bug 消失 / \<改動 Z\> 會讓它更嚴重。」

無法寫出預測 = 這是直覺不是假設，捨棄或強化它。

**開始測試前把排序清單給使用者看。** 便宜的 checkpoint，可能直接排除幾個（「#3 我們剛部署過改動」）。使用者沒反應就按自己的排序繼續。

---

## Phase 4 — 儀器化

每個探針必須對應 Phase 3 的某個預測。**一次只改一個變數。**

工具優先序：
1. **Debugger / REPL** — 一個 breakpoint 勝過十條 log
2. **精準 log** — 只在區分假設的邊界上加
3. 絕不「全部 log 再 grep」

**每條 debug log 加唯一前綴**，例如 `[DEBUG-a4f2]`。清理時一個 grep 搞定。未加標籤的 log 會留下，加了標籤的才會死得乾淨。

**效能回歸特別處理：** log 通常沒用。先建 baseline 測量（`performance.now()`、query plan、profiler），再做 bisect。先量再修。

---

## Phase 5 — 修復 + 回歸測試

**先寫回歸測試，再修 bug** — 但前提是有**正確的測試 seam**。

正確 seam = 測試在 bug 真正發生的呼叫點上重現 bug 模式。太淺的 seam（單一呼叫端測試、無法複製觸發鏈的 unit test）只給假安全感。

**若不存在正確 seam，這本身就是發現。** 記錄下來，架構阻止了這個 bug 被鎖定，帶到 Phase 6。

若 seam 存在：
1. 把最小復現轉成那個 seam 的失敗測試（路徑：`apps/superadmin/unit_test/{ID}/` 或 `e2e/{ID}/`）
2. 看它失敗
3. 施加修復
4. 看它通過
5. 在原始（非最小化）場景上重跑 Phase 1 迴圈

測試登記：確認 `apps/superadmin/test-manifest.json` 有對應項目。

---

## Phase 6 — 清理 + 事後分析

宣告完成前必須確認：

- [ ] 原始復現不再復現（重跑 Phase 1 迴圈）
- [ ] 回歸測試通過（或 seam 不存在已記錄）
- [ ] 所有 `[DEBUG-...]` 儀器已移除（`grep` 前綴確認）
- [ ] Throwaway harness 已刪除或移至明確的 debug 位置
- [ ] commit / PR 訊息說明**哪個假設是正確的** — 讓下一個 debugger 學到東西

**最後問：什麼能預防這個 bug？**
若答案涉及架構改動（沒有好的 test seam、caller 耦合太深），修復合入後帶到 `/improve-codebase-architecture`（不是修復前，現在資訊更多）。
