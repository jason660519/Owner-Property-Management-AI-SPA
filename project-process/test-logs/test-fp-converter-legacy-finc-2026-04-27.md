# test-fp-converter-legacy-finc-2026-04-27

## 範圍

驗證 `tools/fp-converter/convert_fp.py` 的 legacy FINC zlib decompression 路徑：
- modern FINC v2 不退步
- legacy FINC v2 解出標準三 sections + 欄位
- 純向量繪圖 / 不可解析 FINE-nested 檔案改回傳 placeholder 而不是 0 token
- 完全不合法的 FINC 檔仍 raise

## 單元測試

`tools/fp-converter/tests/test_convert_fp.py`：

| Case | 結果 |
| :--- | :--- |
| `test_extract_text_from_fp_rejects_truly_unsupported_finc_binary` | OK |
| `test_extract_text_from_fp_decompresses_legacy_finc_pages` | OK（fixture: 9703-226_忠孝東路4段17巷4號.fp，3 sections） |
| `test_build_markdown_for_legacy_finc_includes_all_sections` | OK（fixture: 龍門門市-忠孝東路4段134號.fp，三段 `## ...`） |
| `test_legacy_finc_with_no_text_records_returns_placeholder` | OK（合成檔，1 token + md/html 都含提示句） |
| `test_normal_finc_files_still_parse_after_legacy_support` | OK（fixture: 10105-001-內江街39號-仁瑋-OK.fp 不退步） |
| `test_parse_doc_structure_falls_back_for_index_style_documents` | OK（既有 cases 不變） |
| `test_build_markdown_renders_fields_for_index_style_documents` | OK |
| `test_collect_fp_files_is_case_insensitive_and_recursive` | OK |

```
$ python3 -m unittest discover -s tools/fp-converter/tests -p 'test_*.py' -v
Ran 8 tests in 0.018s
OK
```

## 抽樣驗證

`resources/samples/新謄本/` 隨機 2000 檔（seed=7），35 秒 timeout 內處理 1907 份：

| 桶 | 計數 | 比例 |
| :--- | :--- | :--- |
| OK | 1896 | 99.42% |
| Placeholder | 11 | 0.58% |
| Unsupported FINC | 0 | 0% |
| File too small | 0 | 0% |
| Other | 0 | 0% |

對照舊版同一份抽樣集，103/200 (51.5%) 屬 unsupported。本次 unsupported 直接歸 0；
剩下 0.58% 是 FINE-nested 子格式（不是 parser regression，是更早期容器格式）。

Placeholder 範例：
- `9907-024;忠孝東路4段170巷31號-丫義-OK.fp`
- `9908-089;基隆路1段380巷32號8F-阿義-OK.fp`
- `9907-134;復興南路1段342號7F-2-阿義-OK.fp`

## 後續驗證（待使用者實機執行）

`tools/fp-converter/rerun_batch_2026_04_27.sh` 在 Mac 端跑完後，以
`新謄本-pdf-20260427-rerun/conversion-summary-20260427-rerun.txt` 為準補上實際
全 corpus 的桶分布。預期：unsupported_finc = 0，placeholder ≈ 0.5–1%，其餘為 OK。

## 相關檔案

- [tools/fp-converter/convert_fp.py](../../tools/fp-converter/convert_fp.py)
- [tools/fp-converter/tests/test_convert_fp.py](../../tools/fp-converter/tests/test_convert_fp.py)
- [tools/fp-converter/rerun_batch_2026_04_27.sh](../../tools/fp-converter/rerun_batch_2026_04_27.sh)
- [project-process/dev-logs/dev-fp-converter-legacy-finc-2026-04-27.md](../dev-logs/dev-fp-converter-legacy-finc-2026-04-27.md)
