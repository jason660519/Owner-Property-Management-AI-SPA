# handoff-fp-converter-legacy-finc-rerun-20260427

## 你（接手 session）要完成的事

1. **整批重跑 .fp → md/html/pdf/json 並產生新 summary**（這個 session 因為
   sandbox 看不到 `/Volumes/KLEVV-4T-2`，沒辦法在這邊跑）。
2. **`rm` 掉根目錄殘留的 4 份分析腳本**：`audit_script.py` / `followup_audit.py` /
   `scanner.py` / `test_fp.py`。它們是上一棒留下的 one-off 探勘腳本，產出已被
   `tools/fp-converter/convert_fp.py` 與 unit tests 取代；此 session 因 sandbox
   權限無法刪。
3. **commit + push**。

## 動工前先做

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
git status --short
git log --oneline -5
/opt/homebrew/bin/python3 -m unittest discover -s tools/fp-converter/tests -p 'test_*.py'
```

你應該看到：
- 8 cases all OK
- modified: `tools/fp-converter/convert_fp.py`、`tools/fp-converter/tests/test_convert_fp.py`、`apps/superadmin/app/data/roadmap.ts`
- 新檔：`project-process/dev-logs/dev-fp-converter-legacy-finc-2026-04-27.md`、`project-process/test-logs/test-fp-converter-legacy-finc-2026-04-27.md`、`tools/fp-converter/rerun_batch_2026_04_27.sh`、本 handoff
- 仍殘留（要刪）：`audit_script.py`、`followup_audit.py`、`scanner.py`、`test_fp.py`

## 任務 A：整批重跑

腳本已落地在 `tools/fp-converter/rerun_batch_2026_04_27.sh`，**直接跑就好**，不要
另外發明新流程：

```bash
bash "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/rerun_batch_2026_04_27.sh"
```

預期行為：

- 來源：`/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本/`（10782+ .fp）
- 輸出：`/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-rerun/`（**新建**，
  不覆蓋現有 `-fixed`）
- 內含子目錄：`md/` / `html/` / `pdf/` / `json/` / `failed/`
- summary：`conversion-summary-20260427-rerun.txt`
- 失敗清單：`conversion-failures-20260427-rerun.tsv`
- 預設 Python：`/opt/homebrew/bin/python3`，可用 `PYTHON=...` 環境變數覆蓋

預期統計（基於 200 + 2000 兩波抽樣外推）：

| 桶 | 預期 |
| :--- | :--- |
| OK | ≈ 99% |
| Placeholder（純向量繪圖 / FINE-nested） | ≈ 0.5–1% |
| Unsupported FINC | 0 |
| File too small | 0–1 |
| Other | 0 |

跑完之後：

1. 檢查 `conversion-summary-20260427-rerun.txt`，把實際桶分布貼回到
   [project-process/test-logs/test-fp-converter-legacy-finc-2026-04-27.md](../test-logs/test-fp-converter-legacy-finc-2026-04-27.md)
   的「後續驗證」段。
2. 把 `failed/` 目錄裡如果出現非 placeholder 類型的檔案（unsupported / other / 
   render error），開一筆新的 dev log 條目記錄症狀，**不要**自作主張改 parser，
   要先確認是不是新發現的格式或檔案損毀。

## 任務 B：清根目錄

```bash
cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
rm audit_script.py followup_audit.py scanner.py test_fp.py
```

確認 `git status --short` 後不再列出這四份。**它們 一律不應該被 commit**——
是上一棒沒清掉的探勘垃圾，內容已經被 `convert_fp.py` + `tests/test_convert_fp.py`
取代。

## 任務 C：commit & push

確保 unit test 仍綠燈再 commit：

```bash
/opt/homebrew/bin/python3 -m unittest discover -s tools/fp-converter/tests -p 'test_*.py'
```

建議拆成兩個 commit：

```bash
git add tools/fp-converter/convert_fp.py tools/fp-converter/tests/test_convert_fp.py tools/fp-converter/rerun_batch_2026_04_27.sh
git commit -m "fix(fp-converter): 支援 legacy FINC v2 zlib 壓縮格式

- 新增 _decompress_legacy_finc_pages 處理 pre-2012 .fp 檔
- 解壓後逐頁丟進現有 0x1E parser，~50% reject → 99%+ OK
- 對純向量繪圖檔（建物測量成果圖）回傳明確 placeholder
- _remove_page_footers 補 legacy 「第 N 頁 / 共 N 頁」slash dialect
- _SYSTEM_NAMES 加入 pre-2010 站名
- tests/test_convert_fp.py 4 → 8 cases，含真實 fixture 與合成 placeholder
- 新增 tools/fp-converter/rerun_batch_2026_04_27.sh 整批重跑腳本

Web UI /superadmin/settings/fp-converter「PDF 只剩地址」根因。"

git add apps/superadmin/app/data/roadmap.ts project-process/dev-logs/dev-fp-converter-legacy-finc-2026-04-27.md project-process/test-logs/test-fp-converter-legacy-finc-2026-04-27.md project-process/handoffs/handoff-fp-converter-legacy-finc-rerun-20260427.md
git commit -m "docs(fp-converter): 補 legacy FINC zlib 支援的 dev/test log + handoff"

git push
```

## 不要做的事

- 不要刪 `_NON_TEXT_FINC_PLACEHOLDER` 防線——這是 web UI 給使用者看的明確提示，
  抽掉會讓純向量繪圖檔回到「空 PDF / 只有地址」的舊狀態。
- 不要把 11 份「FINE-nested 子格式」當成 parser regression 自行 hack——它們是更
  早期的容器格式，需要再一輪逆向，超過本 sprint 範圍。
- 不要動 `apps/superadmin/app/api/fp-converter/route.ts`——使用者已選擇不另外動
  API route。
- 不要在 Claude / Codex 這類 CLI 內 background 起 dev server 看 web UI；如果你
  要肉眼 verify web UI，請開新 Terminal 跑 `./start.sh`，背景進程攔截規則見
  `.claude/rules/claude-code-background-shell.md`。

## 完成檢查清單

- [ ] `tools/fp-converter/rerun_batch_2026_04_27.sh` 跑完，rc = 0
- [ ] `/Volumes/KLEVV-4T-2/.../新謄本-pdf-20260427-rerun/conversion-summary-20260427-rerun.txt` 存在且 OK ≥ 99%
- [ ] `failed/` 目錄沒有非 placeholder 的新檔案類型
- [ ] 根目錄 `audit_script.py` / `followup_audit.py` / `scanner.py` / `test_fp.py` 已刪
- [ ] `python3 -m unittest discover -s tools/fp-converter/tests` 仍 8 cases all OK
- [ ] `test-fp-converter-legacy-finc-2026-04-27.md` 「後續驗證」段已用實機統計補完
- [ ] commit 已 push

## 相關檔案

- [tools/fp-converter/convert_fp.py](../../tools/fp-converter/convert_fp.py)
- [tools/fp-converter/tests/test_convert_fp.py](../../tools/fp-converter/tests/test_convert_fp.py)
- [tools/fp-converter/rerun_batch_2026_04_27.sh](../../tools/fp-converter/rerun_batch_2026_04_27.sh)
- [project-process/dev-logs/dev-fp-converter-legacy-finc-2026-04-27.md](../dev-logs/dev-fp-converter-legacy-finc-2026-04-27.md)
- [project-process/test-logs/test-fp-converter-legacy-finc-2026-04-27.md](../test-logs/test-fp-converter-legacy-finc-2026-04-27.md)
- 上一棒接手紀錄：[project-process/handoffs/handoff-fp-converter-legacy-finc-20260427.md](handoff-fp-converter-legacy-finc-20260427.md)
