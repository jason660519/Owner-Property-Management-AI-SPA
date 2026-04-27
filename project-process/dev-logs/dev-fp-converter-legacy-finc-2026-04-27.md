# dev-fp-converter-legacy-finc-2026-04-27

## TL;DR

`/superadmin/settings/fp-converter` 之前轉出來「只有地址、沒有內容」的根因不是 PDF
渲染或 fpdf2 字型，而是約 **50% 的來源 .fp 檔屬於 pre-2012 legacy FINC v2 格式**，
舊 parser 抓不到 0x1E 文字記錄就空轉，下游 `build_markdown` 只剩 header（包含
查詢日期、地段、建號這類「看起來像地址」的字串）。本 sprint 逆向工程 legacy 格式、
加上 zlib decompression 路徑、補強相關 preprocessing，並把 8 個 unit test 全部
扛綠。抽樣驗證從之前 ~50% reject → 99.42% 完整 sections。

## Sprint 背景

- 接手點：[handoff-fp-converter-legacy-finc-20260427.md](../handoffs/handoff-fp-converter-legacy-finc-20260427.md)
  上一棒已驗證 11 份 audit-flag 的 .fp 不是 parser regression，是另一類 FINC binary
  格式；補了 `Unsupported FINC legacy binary format` 防線避免靜默產出空 PDF。
- 接手後使用者實機回報：web UI 上轉出來的 PDF「只有地址沒有內容」。第一直覺以為是
  PDF 渲染或字型問題，實際開分析才發現是來源檔的格式分布比 handoff 想像的更糟。

## 證據與根因

### 樣本掃描

對 `resources/samples/新謄本/` 隨機抽 200 份：

| 類別 | 計數 | 比例 |
| :--- | :--- | :--- |
| 0x1E parser 抓得到欄位（modern FINC v2） | 97 | 48.5% |
| 0x1E parser 抓不到 → 觸發 Unsupported FINC | 103 | 51.5% |
| 其他例外 | 0 | 0% |

handoff 提到的「11 份 legacy」其實是稽核腳本透過 PDF 關鍵字分類後挑出來的子集，
真正受影響的母體是約一半的 corpus。

### 二進位逆向工程

兩份代表性 legacy 檔案開頭：

```
9703-226_忠孝東路4段17巷4號.fp
00000000: 4649 4e43 0200 0000 0300 0000 3c00 0000  FINC........<...
                FINC ver=2     pages=3   header_end=60
00000010: 0200 0000 e905 0000 070f 0000 2906 0000  page1 desc...
00000020: 0200 0000 e404 0000 da0b 0000 110b 0000  page2 desc
00000030: 0200 0000 a407 0000 4a15 0000 ...        page3 desc
```

對 byte 60 起切片用 `zlib.decompress(..., wbits=-15)`（raw deflate）一次成功，
3847 bytes 解壓內容裡可以看到 `'光特版'` / `'查詢日期'` / `'建號'` 等可讀文字，
而且 0x1E text record 結構與 modern FINC 完全相同。逐頁解後再把 page 1 ~ page 3
的解壓結果串接成 380 records，丟進 `_preprocess` / `_parse_doc_structure`，得到
標準的「建物標示部 / 建物所有權部 / 建物他項權利部」三 section + 53 fields。

關鍵格式 schema（reverse-engineered 2026-04-27）：

| Offset | Size | Field | Notes |
| :--- | :--- | :--- | :--- |
| 0 | 4 | magic | `b'FINC'` |
| 4 | 4 | version | uint32-LE，觀察值 = 2 |
| 8 | 4 | page_count | uint32-LE |
| 12 | 16 × N | page descriptors | (file_offset, type, compressed, uncompressed) all uint32-LE |
| 12 + 16×N | … | per-page payload | 每頁一段 raw deflate (`wbits=-15`)，解壓後格式 = modern FINC 的 0x1E 序列 |

modern FINC v2 也是 magic + version + page_count 開頭，只是 header_end 通常是 92
而非 60，且後面接的不是壓縮頁、是直接的 0x1E records。**舊 parser 只走 modern
路徑，碰到 legacy 就 0 token。**

## 實作

### 主要變更

`tools/fp-converter/convert_fp.py`：

1. 新增 `_extract_raw_records_from_bytes(data: bytes)`：把原本 `_extract_raw_records`
   的核心邏輯抽出來，讓「對檔案路徑」與「對解壓 buffer」共用同一份掃描器；
   `_extract_raw_records(filepath)` 變成薄殼。
2. 新增 `_decompress_legacy_finc_pages(data: bytes) -> list[bytes]`：解析 12-byte
   file header + N×16-byte descriptor、逐頁 `zlib.decompress(chunk, -15)`；任何
   一頁解壓失敗 / descriptor 範圍越界就回傳 `[]`，由呼叫端 fallback 到
   `Unsupported FINC` 防線。從不 raise。
3. `extract_text_from_fp` 改成兩段式：先試 modern 0x1E 掃整檔，0 token 且檔頭是
   `FINC` 才進 legacy decompress；解壓後逐頁掃 0x1E 再串成完整 record 序列。
4. `_NON_TEXT_FINC_PLACEHOLDER` sentinel：legacy decompress 成功但 0 個 0x1E
   records（純向量繪圖檔，例：建物測量成果圖、FINE-nested 舊舊格式），回傳一個
   人類可讀的提示 token 而非 `[]`，避免下游又 render 出「空 PDF」。
5. `_remove_page_footers` 加 legacy 版頁尾 pattern：`第 N 頁 / 共 N 頁`（斜線分隔，
   數字可帶全形/ASCII 空白），跟 modern 的「第 N 頁，共 N 頁」並存。
6. `_SYSTEM_NAMES` 加入 `地籍地價地籍圖資料電傳資訊服務系統`（pre-2010 站名），
   `_remove_header_repeats` 才會跨頁正確去重。
7. `build_html` 加 fallback「內文」section：如果整份 doc 沒有任何 sections，把
   header_tokens 直接 inline 渲染成提示段，避免 `_build_header_html` 對 placeholder
   token 只生空 div。

### 測試

`tools/fp-converter/tests/test_convert_fp.py` 從 4 cases → 8 cases：

- `test_extract_text_from_fp_rejects_truly_unsupported_finc_binary` —— 完全沒有
  0x1E records 也無法 zlib decompress 的合成檔仍會 raise（保留舊防線）。
- `test_extract_text_from_fp_decompresses_legacy_finc_pages` —— 真實 fixture
  `9703-226_忠孝東路4段17巷4號.fp` 必須解出三 section + 每 section 至少 1 field。
- `test_build_markdown_for_legacy_finc_includes_all_sections` —— 真實 fixture
  `龍門門市-忠孝東路4段134號.fp` 的 markdown 一定要含三段 `## ...` 標題與
  `- **登記日期**：` / `- **登記原因**：` 欄位。
- `test_legacy_finc_with_no_text_records_returns_placeholder` —— 合成一個 1-page
  legacy FINC（payload 是純 NUL，沒有 0x1E）；確認 `extract_text_from_fp` 回傳
  恰好 1 個 placeholder token、且 markdown / html 都會把提示句帶出來。
- `test_normal_finc_files_still_parse_after_legacy_support` —— `10105-001-內江街
  39號-仁瑋-OK.fp` regression 不變：每個 section 都有欄位。

紅燈基線（測試先寫）→ 實作 →
全部 8 cases 綠。沒有為了綠燈放寬任何斷言。

```
$ python3 -m unittest discover -s tools/fp-converter/tests -p 'test_*.py'
Ran 8 tests in 0.018s
OK
```

### 抽樣驗證

時間 35 秒 timeout 下處理 1907 / 2000 隨機檔（每秒 ~55 份）：

| 桶 | 計數 | 比例 |
| :--- | :--- | :--- |
| OK（modern + legacy 都算） | 1896 | 99.42% |
| Placeholder（純向量繪圖 / FINE-nested） | 11 | 0.58% |
| Unsupported FINC | 0 | 0% |
| File too small | 0 | 0% |
| Other | 0 | 0% |

對照舊邏輯，同一批 unsupported 比例會是 ~50%。

## 仍然 placeholder 的 11 份 deep-dive

`9907-024;忠孝東路4段170巷31號-丫義-OK.fp`、`9907-037;...`、`9712-068_阿義-麗水街
26-2號4F.fp` 等這類檔案：legacy zlib decompress 成功（多達 17 頁、~1.5 MB 解壓
內容），但解壓後 buffer 開頭是 `46494e45 ...` (`FINE`，少一個 C)。0x1E 密度雖然有
213/50KB，但配合 0x40 marker 卻沒有任何能 decode 成合法 UTF-16-LE 的字段。

推測這是更早期的 FinePrint「FINE」內嵌容器，需要再一輪逆向。本 sprint 不啃，只把
behavior 鎖在「回傳明確 placeholder、不再產出空 PDF」。如果後續使用者點到這 11 份
就會看到：

> 【此 FinePrint 檔案不含可擷取的文字內容（可能為建物測量成果圖、向量圖件或空白頁），無法產出文字版 PDF。】

而不是只有地址的空白文件。

## 整批重跑指引

來源資料夾 (`/Volumes/KLEVV-4T-2/...`) 不在這個 session 的 sandbox 視野內，所以
重跑要在實機 Mac 執行。腳本已落地：

```bash
bash "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/tools/fp-converter/rerun_batch_2026_04_27.sh"
```

腳本邏輯：

- 來源：`/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本/`
- 目標：`/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-rerun/`（新建，
  不覆蓋舊 `-fixed` 資料夾）
- 對每份 .fp 都產 md / html / pdf / json 四種輸出
- 失敗 / placeholder 的原檔會 copy 到 `failed/`，summary 與 failures TSV 一起寫
  到輸出資料夾根目錄

## 風險與後續

- **不啃的 FINE 子格式**：再追要做完整逆向，可能要寫第二條 fallback path。建議
  在 next sprint 啟一個 P3 issue。
- **PDF 字型仍依賴 Arial Unicode**：本 sprint 沒改動，因為使用者要求維持 PDF。如果
  之後 Mac 端字型不見，PDF 會跳 `ERROR: Arial Unicode.ttf not found`；HTML / MD
  / JSON 不受影響。
- **API route 沒動**：依使用者選項，不另外動 `apps/superadmin/app/api/fp-converter/
  route.ts`。原本 0-token 會回 500 的問題已在 Python 層自動消除（legacy 解壓後不會
  再產生 0 token，最差也是 placeholder 1 token → 正常產 PDF）。

## 相關檔案

- 主程式：[tools/fp-converter/convert_fp.py](../../tools/fp-converter/convert_fp.py)
- 測試：[tools/fp-converter/tests/test_convert_fp.py](../../tools/fp-converter/tests/test_convert_fp.py)
- 重跑腳本：[tools/fp-converter/rerun_batch_2026_04_27.sh](../../tools/fp-converter/rerun_batch_2026_04_27.sh)
- 接手 handoff：[project-process/handoffs/handoff-fp-converter-legacy-finc-20260427.md](../handoffs/handoff-fp-converter-legacy-finc-20260427.md)
- Roadmap：[apps/superadmin/app/data/roadmap.ts](../../apps/superadmin/app/data/roadmap.ts) 的 `FinePrint .fp 謄本轉檔工具` 列
