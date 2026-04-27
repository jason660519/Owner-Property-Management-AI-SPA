# Handoff — fp-converter legacy FINC follow-up

> **產出時間**：2026/04/27
> **產出者**：GitHub Copilot GPT-5.4（與 Jason 對話）
> **接手對象**：下一個 AI session
> **承接內容**：延續 FinePrint .fp 批次轉檔收尾，重跑整批輸出並處理 11 份 legacy FINC 不支援樣本
> **如何使用**：複製下方 fenced code block 整段，貼到新 session 的第一則 prompt

---

````markdown
```markdown
你在 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA 工作，請直接接手 FinePrint .fp 謄本轉檔收尾，不要重做前面已確認的調查。

## 身分與硬性規範
- 回覆用繁體中文，程式碼註解用英文。
- TypeScript strict，禁止 any。證據：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/CLAUDE.md
- SQL 只能放在 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/supabase/migrations/，檔名需為 YYYYMMDDHHMMSS_description.sql。證據：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/CLAUDE.md 與 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/.claude/rules/general.md
- Jason 常在平行分支工作，動工前與每次 commit 前都要先看 git status，避免覆寫他人變更。證據：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/.claude/rules/general.md
- 文檔或暫存檔不能堆 repo 根目錄；如果要保留工作產物，請移到 docs、project-process、tools 對應位置。證據：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/CLAUDE.md 與 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/.claude/rules/general.md
- 若你完成新一輪交付或留下明確下一步，session 結尾必須再寫一份 handoff。證據：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/.claude/rules/general.md

## 專案位置
- Repo：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA
- 來源資料夾：/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本
- 目前輸出資料夾：/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-fixed

## 先讀這幾個檔案建立脈絡
1. /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/convert_fp.py
2. /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/tests/test_convert_fp.py
3. /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/apps/superadmin/app/data/roadmap.ts
4. /Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-fixed/conversion-summary-20260427.txt
5. /Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-fixed/sample-audit-followup-20260427.txt

## 當前 repo 狀態
- git status 不是乾淨的；repo 內有大量 apps/superadmin 相關未提交變更，也有 tools/fp-converter 的修改。動工前不要假設只有你要碰的檔案有變更。
- 最近 HEAD commit 是 f205229，訊息為 docs(roadmap): 補強 Row ID 辨識規則並修正 lastUpdated。
- 本次 fp-converter 修補尚未 commit；你會接在未提交工作之上。

## 本次已完成的工作摘要
- 已確認原本大量轉檔流程完成過一次，舊輸出統計寫在 /Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-fixed/conversion-summary-20260427.txt：
  - 掃描到 10782 份 .fp
  - 舊邏輯下顯示 10781 成功、1 失敗（9706-192_復興南路1段43號1F-子芳.fp，File too small）
- 已清掉 macOS 產生的 ._ PDF 假檔，並把唯一已知 File too small 檔案複製到 failed 資料夾。證據：/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-fixed/failed
- 已對 20 份 PDF 做抽樣稽核，其中 11 份被判為疑似解析缺漏，完整清單見 /Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-fixed/sample-audit-followup-20260427.txt
- 已往前追到原始 .fp，確認這 11 份不是 section parser 少抓欄位，而是另一類 FINC 二進位格式：
  - 至少兩份樣本檔案開頭都是 FINC
  - 呼叫 extract_text_from_fp 時 token 數為 0
  - 對 11 份原始 .fp 做驗證後，11/11 都屬於同一路徑
- 已在 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/tests/test_convert_fp.py 新增測試 test_extract_text_from_fp_rejects_unsupported_finc_binary
- 已在 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/convert_fp.py 補上防線：當檔案標頭為 FINC 且最後 token 數為 0，直接 raise ValueError('Unsupported FINC legacy binary format: ...')，避免再產出誤導性的空 PDF
- 已驗證 /opt/homebrew/bin/python3 -m unittest discover -s tools/fp-converter/tests -p 'test_*.py' 目前綠燈，4 tests OK
- 已驗證這 11 份 legacy 樣本在新邏輯下全部會拋出 Unsupported FINC legacy binary format，而不是靜默成功

## 經驗證的技術斷言
- 目前 converter 的核心邏輯在 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/convert_fp.py，extract_text_from_fp 先讀 header，再做 _extract_raw_records / _preprocess，最後對 FINC+0-token 做不支援判斷。
- 目前測試檔只有 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/tests/test_convert_fp.py 這一組 Python unittest，且已包含：
  - legacy FINC unsupported 測試
  - inline section fallback parser 測試
  - markdown rendering 測試
  - recursive/case-insensitive collect_fp_files 測試
- roadmap 的 FinePrint .fp 工具 row 仍標記為 100%，只記錄到 inline-section bugfix，還沒有反映 legacy FINC unsupported 結論。證據：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/apps/superadmin/app/data/roadmap.ts 中「FinePrint .fp 謄本轉檔工具」那一列

## 驗證基線綠的指令
先跑這些確認你接手時環境一致：
1. cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
2. git status --short
3. git log --oneline -5
4. /opt/homebrew/bin/python3 -m unittest discover -s tools/fp-converter/tests -p 'test_*.py'

## 下一步任務拆解
### 任務 A：用新邏輯重跑整批轉檔
目標：讓最終交付反映「11 份 legacy FINC 不支援 + 1 份 File too small」的真實結果，而不是沿用舊邏輯下的 10781 成功。

建議做法：
1. 不要覆蓋目前輸出資料夾；改建一個全新輸出資料夾，例如新日期或加上 rerun 字尾。
2. 用現有 CLI 重跑整批：
   - /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/convert_fp.py
3. 重新統計：
   - 掃描總數
   - 成功數
   - 失敗數
   - 失敗類型分組（Unsupported FINC legacy binary format / File too small）
4. 把新的 failed 資料夾、summary、sample audit 一起重建。

注意：若這 11 份都如預期失敗，而沒有其他新失敗，新的理論值應該是 10782 - 11 - 1 = 10770 成功；這只是基於目前調查的假設，必須以 rerun log 實際結果為準，不要先寫死。

### 任務 B：更新文件與 roadmap
若任務 A 完成，請更新：
1. /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/apps/superadmin/app/data/roadmap.ts
   - FinePrint .fp 謄本轉檔工具那列的 developmentProgress / devLog
   - 明確寫出 legacy FINC 樣本目前被列為 unsupported，而不是成功解析
2. 建議新增一份 dev log 或 test log 到：
   - /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/project-process/dev-logs/
   - /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/project-process/test-logs/
3. 若你建立新文件，記得 session 結尾再做 handoff

### 任務 C：如果要真正支援 legacy FINC，再開新一輪 TDD
只有在使用者明確要求「要把這 11 份也救回來」時才做，因為這不是小修 parser label 能解決的問題。

做法：
1. 先新增失敗測試，鎖住至少一份真實樣本的可觀察行為
2. 對樣本做格式鑑識，不要先假設是 UTF-16LE / Big5 / UTF-8
3. 若需要新 helper，請放在 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/ 之下，不要再在 repo 根目錄堆暫存腳本
4. 只有在你真的確認文字儲存結構後，才改 extract path；不要把 Unsupported FINC 這條防線拿掉，除非有新的綠燈測試覆蓋它

## 這次留下的待清理項目
目前 repo 根目錄有暫存腳本痕跡或曾建立過的調查腳本概念：audit_script.py、followup_audit.py、test_fp.py。若它們還存在於 git status，請判斷是否應刪除、移到 tools/、或正式納入 docs/測試流程；不要讓根目錄繼續堆分析垃圾。

## 關鍵慣例與雷區
- 不要把這 11 份樣本再稱作 parser regression；目前證據支持它們是 format-support gap。證據：新邏輯下 11/11 都是 Unsupported FINC legacy binary format。
- 不要用廣泛 repo 掃描取代局部假設；這題目前控制點就是 /tools/fp-converter/convert_fp.py 的 extract_text_from_fp。
- 不要在 Claude 內起長壽背景程序；批次轉檔可以跑前景命令，但不要自己再開常駐 watcher 或 dev server。證據：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/CLAUDE.md 與 .claude/rules/claude-code-background-shell.md
- 變更前後都要跑最窄的可執行驗證；這題優先驗證是 Python unittest，不是 git diff。
- 若你提到某 API、某 provider、某 helper 已存在，先實際 read 檔再寫；不要把 apps/superadmin 的 transcript intake 功能和這個 Python fp converter 混為一談。
- Pre-commit/品質規則仍有效：不要降級 next/react/typescript；commit message 用 feat/fix/docs/test/chore 前綴。證據：/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/.claude/rules/general.md 與 /Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/CLAUDE.md

## 驗收門檻
你這個接手任務完成時，至少要滿足：
1. 新輸出資料夾與新 summary 能正確反映 legacy FINC unsupported 的失敗數
2. tools/fp-converter/tests 仍然全綠
3. roadmap 或對應 log 已寫明目前不支援的 legacy FINC 樣本事實
4. 根目錄不再殘留沒有去處的臨時分析腳本
5. commit message 若要提交，格式請用：fix: ... 或 test: ... 或 docs: ...

## 動工前確認指令
1. cd "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
2. git status --short
3. git log --oneline -5
4. /opt/homebrew/bin/python3 -m unittest discover -s tools/fp-converter/tests -p 'test_*.py'

動工前先跟我確認 Sprint 拆解，避免悶頭寫錯方向。
```
````

---

## 使用方式

1. 複製上面 fenced code block 內整段內容。
2. 開新 session。
3. 把整段貼成第一則 prompt，讓下一個 AI 直接接手。

## 相關文件

- [tools/fp-converter/convert_fp.py](/Volumes/KLEVV-4T-1/Real%20Estate%20Management%20Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/convert_fp.py)
- [tools/fp-converter/tests/test_convert_fp.py](/Volumes/KLEVV-4T-1/Real%20Estate%20Management%20Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/tests/test_convert_fp.py)
- [apps/superadmin/app/data/roadmap.ts](/Volumes/KLEVV-4T-1/Real%20Estate%20Management%20Projects/Owner-Property-Management-AI-SPA/apps/superadmin/app/data/roadmap.ts)
- [CLAUDE.md](/Volumes/KLEVV-4T-1/Real%20Estate%20Management%20Projects/Owner-Property-Management-AI-SPA/CLAUDE.md)
- [.claude/rules/general.md](/Volumes/KLEVV-4T-1/Real%20Estate%20Management%20Projects/Owner-Property-Management-AI-SPA/.claude/rules/general.md)
- [project-process/handoffs/handoff-row-085-transcript-intake-workbench-20260427.md](/Volumes/KLEVV-4T-1/Real%20Estate%20Management%20Projects/Owner-Property-Management-AI-SPA/project-process/handoffs/handoff-row-085-transcript-intake-workbench-20260427.md)
