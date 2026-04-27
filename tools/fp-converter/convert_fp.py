#!/usr/bin/env python3
"""
convert_fp.py — FinePrint .fp to HTML / Markdown / PDF converter (macOS)

Extracts UTF-16LE text directly from FinePrint binary files and outputs
a properly laid-out document without requiring Windows or FinePrint.

Usage:
    # Convert a single file (outputs .html by default)
    python3 convert_fp.py input.fp

    # Convert entire folder to HTML
    python3 convert_fp.py --input ./新謄本/ --output ./output/

    # Convert to PDF
    python3 convert_fp.py --input ./新謄本/ --output ./output/ --format pdf

Dependencies:
    pip3 install fpdf2   (only needed for --format pdf)
"""

import argparse
import json
import re
import struct
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Binary extraction — FinePrint .fp record format
# ---------------------------------------------------------------------------
#
# Text record layout (reverse-engineered):
#   Byte 0:  0x1E          — text record opcode
#   Byte 1:  XX            — XX = 8 + char_count * 4
#   Byte 2:  0x40          — constant flag
#   Byte 3:  char_count    — number of UTF-16LE characters
#   Bytes 4 .. 4+char_count*2-1 : UTF-16LE text
#   Bytes 4+char_count*2  ..    : per-glyph advance widths
#
# Position record (0x13 opcode):
#   Byte 0:  0x13          — position opcode
#   Byte 1:  LL            — payload byte count (≥ 4)
#   Bytes 2..3 (int16-LE)  — X class value:
#       ≈ 2688/2752 = numeric/alphanumeric value token
#       ≈ 4736/4800/4840 = CJK text token
#       > 30000 = page-number footer token → discard
# ---------------------------------------------------------------------------

# Single-char CJK tokens that appear as VALUE UNITS (unit after a number)
# e.g. '002層', '10坪' — these are NOT label components
_VALUE_UNIT_CHARS = frozenset('層頁年月日元坪倍期間數量')

# Single-char CJK tokens that serve as VALUE UNITS after a number.
# e.g. '002層' — the '層' here is a unit, NOT the start of a label.
# Used in _merge_label_singles to avoid incorrectly stopping the scan.
_VALUE_UNIT_CHARS = frozenset('層頁年月日元坪倍期數量')

# Known system/authority names used in the page header
_SYSTEM_NAMES = frozenset({
    '光特版地政電傳資訊系統',
    '光特版地政電子閘門資訊系統',
    '地政電傳資訊系統',
    '地政電子閘門資訊系統',
    '地政電子謄本',
})

# Comprehensive set of known field-label tokens in Taiwan land registry documents
_ALL_KNOWN_LABELS = frozenset({
    # 標示部
    '登記日期', '登記原因', '建物門牌', '建物坐落地號',
    '主要用途', '主要建材', '層數', '總面積', '層次', '層次面積',
    '建築完成日期', '其他登記事項', '建物平面圖冊頁數',
    # 所有權部
    '登記次序', '原因發生日期', '所有權人', '住址', '住',
    '權利範圍', '權狀字號', '相關他項權利登記次序',
    # 他項權利部
    '權利種類', '收件年期', '字號', '設定義務人', '設定權利人',
    '設定權利範圍', '擔保債權總金額', '擔保債權種類及範圍',
    '清償日期', '利息', '遲延利息', '違約金', '存續期間',
    '債務人及債務額比例', '標的登記次序', '共同擔保地號',
    '共同擔保建號', '債權額比例', '證明書字號', '權利標的',
    '相關設定目的', '設定',
    # 土地謄本
    '地號', '面積', '地目', '使用分區', '使用地類別',
    '公告土地現值', '公告地價', '辦竣地籍測量面積',
    # Merged-form single-char compounds
    '層數', '總面積', '層次', '住址',
    # Header labels
    '查詢日期',
})

# Section header tokens
_SECTION_HEADERS = frozenset({
    '建物標示部', '建物所有權部', '建物他項權利部',
    '土地標示部', '土地所有權部', '土地他項權利部',
})

_FALLBACK_FIELD_LABELS = tuple(sorted(
    _ALL_KNOWN_LABELS | {
        '序號', '部別', '異動別', '異動日期', '權利人', '收件字號', '列印日期', '查詢日期',
        '地段', '地 / 建號', '地/建號',
    },
    key=len,
    reverse=True,
))

_SECTION_HEADER_PATTERN = re.compile(
    '|'.join(sorted((re.escape(name) for name in _SECTION_HEADERS), key=len, reverse=True))
)

_FALLBACK_FIELD_PATTERN = re.compile(
    rf'(?P<label>{"|".join(re.escape(label) for label in _FALLBACK_FIELD_LABELS)})：'
    rf'(?P<value>.*?)(?=(?:{"|".join(re.escape(label) for label in _FALLBACK_FIELD_LABELS)})：|$)'
)


# ---------------------------------------------------------------------------
# Step 1: raw binary extraction (x-aware, no dedup)
# ---------------------------------------------------------------------------

def _extract_raw_records(filepath: Path) -> list[tuple[str, int]]:
    """
    Return (text, x_val) for every valid text record in byte-offset order.
    x_val comes from the nearest preceding 0x13 position record (within 300 bytes).
    No deduplication.
    """
    data = filepath.read_bytes()
    n = len(data)

    # Collect 0x13 position records: offset → x_value
    pos_records: dict[int, int] = {}
    i = 0
    while i < n - 2:
        if data[i] == 0x13:
            ll = data[i + 1]
            if ll >= 4 and i + 2 + ll <= n:
                x = struct.unpack_from('<H', data, i + 2)[0]
                pos_records[i] = x
        i += 1
    pos_offsets = sorted(pos_records.keys())

    # Extract text records
    results: list[tuple[int, str, int]] = []
    i = 0
    while i < n - 4:
        if data[i] == 0x1E and data[i + 2] == 0x40:
            char_count = data[i + 3]
            expected_xx = 8 + char_count * 4
            if (
                char_count >= 1
                and data[i + 1] == expected_xx
                and i + 4 + char_count * 2 <= n
            ):
                text_bytes = data[i + 4: i + 4 + char_count * 2]
                try:
                    text = text_bytes.decode('utf-16-le')
                    if text.strip() and all(_is_valid_char(c) for c in text):
                        nearby = [p for p in pos_offsets if i - 300 <= p < i]
                        x = pos_records[max(nearby)] if nearby else 0
                        results.append((i, text, x))
                except UnicodeDecodeError:
                    pass
        i += 1

    results.sort(key=lambda r: r[0])
    return [(text, x) for _, text, x in results]


# ---------------------------------------------------------------------------
# Step 2: preprocessing pipeline
# ---------------------------------------------------------------------------

def _remove_page_footers(raw: list[tuple[str, int]]) -> list[tuple[str, int]]:
    """
    Remove page-number footer runs by detecting the sequence:
        第  [digit-only token]  頁  ，  共  [digit-only token]  頁
    This is more reliable than an x-value threshold because some
    right-margin content tokens (e.g., '號', '建物坐落地號') have very
    large x values and must NOT be discarded.
    """
    import re as _re
    texts = [t for t, _ in raw]
    n = len(texts)
    skip: set[int] = set()

    i = 0
    while i < n:
        # Look for pattern: '第' [N] '頁' '，' '共' [N] '頁'
        if texts[i] == '第' and i + 6 < n:
            n1, y1, comma, gong, n2, y2 = texts[i+1:i+7]
            if (y1 == '頁' and comma == '，' and gong == '共' and y2 == '頁'
                    and _re.match(r'^\s*\d+\s*$', n1)
                    and _re.match(r'^\s*\d+\s*$', n2)):
                for k in range(i, i + 7):
                    skip.add(k)
                i += 7
                continue
        i += 1

    return [(t, x) for i, (t, x) in enumerate(raw) if i not in skip]


def _remove_header_repeats(raw: list[tuple[str, int]]) -> list[tuple[str, int]]:
    """
    Keep only the FIRST occurrence of the repeating page header block.
    The header is detected when a SYSTEM_NAME token appears; the block
    extends from the preceding county token back one position to the
    '建號' / '地號' token that ends the location bar.
    """
    texts = [t for t, _ in raw]
    system_positions = [i for i, t in enumerate(texts) if t in _SYSTEM_NAMES]
    if len(system_positions) <= 1:
        return raw  # nothing to deduplicate

    skip: set[int] = set()
    for sys_pos in system_positions[1:]:   # 2nd, 3rd … occurrence
        # Include the county name one slot before the system name
        start = max(0, sys_pos - 1)
        end = sys_pos
        j = sys_pos + 1
        while j < len(texts) and texts[j] not in ('建號', '地號'):
            end = j
            j += 1
        if j < len(texts):
            end = j   # include '建號' / '地號'
        for k in range(start, end + 1):
            skip.add(k)

    return [(t, x) for i, (t, x) in enumerate(raw) if i not in skip]


def _merge_date_sequences(tokens: list[str]) -> list[str]:
    """Merge Republic-era date fragments: 民國 NNN 年 NN 月 NN 日 → single string."""
    result: list[str] = []
    i = 0
    while i < len(tokens):
        if (
            tokens[i] == '民國'
            and i + 6 < len(tokens)
            and tokens[i + 2] == '年'
            and tokens[i + 4] == '月'
            and tokens[i + 6] == '日'
        ):
            y, m, d = tokens[i + 1], tokens[i + 3], tokens[i + 5]
            result.append(f'民國{y}年{m}月{d}日')
            i += 7
        else:
            result.append(tokens[i])
            i += 1
    return result


def _is_cjk_char(c: str) -> bool:
    cp = ord(c)
    return (
        0x4E00 <= cp <= 0x9FFF
        or 0xF900 <= cp <= 0xFAFF
        or 0x3000 <= cp <= 0x303F
    )


def _is_cjk_only(s: str) -> bool:
    """Return True if every character in s is a CJK character (no ASCII, no digits)."""
    return bool(s) and all(_is_cjk_char(c) for c in s)


def _merge_label_singles(tokens: list[str]) -> list[str]:
    """
    Merge consecutive single-CJK-char tokens that appear immediately before '：'.

    E.g. ['層', '數', '：'] → ['層數', '：']
         ['住', '址', '：'] → ['住址', '：']

    Guard: do NOT merge if the token immediately before the run is a value
    token (alphanumeric), which would mean the CJK char is a unit, not a label.
    E.g. ['002', '層', '總', '面', '積', '：'] → '層' is a unit for '002',
    stop before it; only merge '總', '面', '積' → '總面積'.
    """
    result: list[str] = []
    for tok in tokens:
        if tok.strip('　').endswith('：') or tok == '：':
            # Normalize: treat '　　：' style tokens as plain ：
            colon_tok = tok if tok == '：' else '：'

            # Find the run of single-CJK-char tokens at the tail of result
            j = len(result)
            while j > 0 and len(result[j - 1]) == 1 and _is_cjk_char(result[j - 1]):
                # Stop if the token before the run is non-CJK AND this CJK char
                # is a value unit (e.g. '層' after '002', '頁' after a number).
                # If the CJK char is NOT a unit, keep scanning because it starts
                # the next label token (e.g. '權' in '權狀字號' after '1分之1').
                if j >= 2 and not _is_cjk_only(result[j - 2]):
                    if result[j - 1] in _VALUE_UNIT_CHARS:
                        break
                j -= 1

            run = result[j:]
            if len(run) >= 2 and all(len(c) == 1 and _is_cjk_char(c) for c in run):
                result = result[:j] + [''.join(run)]

            result.append(colon_tok)
        else:
            result.append(tok)
    return result


def _preprocess(raw: list[tuple[str, int]]) -> list[str]:
    """Full preprocessing pipeline → clean, ordered token list."""
    raw = _remove_page_footers(raw)
    raw = _remove_header_repeats(raw)
    tokens = [t for t, _ in raw]
    tokens = _merge_date_sequences(tokens)
    tokens = _merge_label_singles(tokens)
    return tokens


def extract_text_from_fp(filepath: Path) -> list[str]:
    """
    Parse a .fp file and return a clean, ordered list of text tokens.

    Uses the full preprocessing pipeline:
      • removes page-footer tokens (page-number rows with large X values)
      • removes repeated page-header blocks (keeps only the first)
      • merges Republic-era date fragments (民國 NNN 年 NN 月 NN 日)
      • merges consecutive single-CJK-char label tokens before ：
    """
    if filepath.stat().st_size < 4:
        raise ValueError(f'File too small: {filepath.name}')
    header = filepath.read_bytes()[:4]
    raw = _extract_raw_records(filepath)
    tokens = _preprocess(raw)
    if not tokens and header == b'FINC':
        raise ValueError(f'Unsupported FINC legacy binary format: {filepath.name}')
    return tokens


def _is_valid_char(c: str) -> bool:
    """Return True if character is plausible in a land-registry document."""
    cp = ord(c)
    # Printable ASCII
    if 0x0020 <= cp <= 0x007E:
        return True
    # CJK Unified Ideographs (core Traditional Chinese block)
    if 0x4E00 <= cp <= 0x9FFF:
        return True
    # CJK Compatibility Ideographs
    if 0xF900 <= cp <= 0xFAFF:
        return True
    # Full-width ASCII variants (common in TW government documents)
    if 0xFF01 <= cp <= 0xFF60:
        return True
    # CJK Symbols and Punctuation (包含　、。「」etc.)
    if 0x3000 <= cp <= 0x303F:
        return True
    return False


# ---------------------------------------------------------------------------
# Document structure parser — turns flat token list into header + sections
# ---------------------------------------------------------------------------

def _parse_doc_structure(tokens: list[str]) -> dict:
    """
    Parse a flat token list into:
        {
            'header_tokens': list[str],
            'sections': [{'name': str, 'fields': [(label, value), ...]}, ...]
        }
    Sections are delimited by the ＊＊＊ SECTION_NAME ＊＊＊ pattern.
    """
    structure: dict = {'header_tokens': [], 'sections': []}
    i = 0
    n = len(tokens)

    # Collect header (everything before the first ＊ section marker)
    while i < n:
        t = tokens[i]
        if '＊' in t and i + 1 < n and tokens[i + 1] in _SECTION_HEADERS:
            break
        structure['header_tokens'].append(t)
        i += 1

    # Collect sections
    while i < n:
        t = tokens[i]
        if '＊' in t:
            i += 1  # skip opening ＊＊＊
            if i < n and tokens[i] in _SECTION_HEADERS:
                section_name = tokens[i]
                i += 1
                if i < n and '＊' in tokens[i]:
                    i += 1  # skip closing ＊＊＊
                # Gather section tokens until the next section marker
                sec_tokens: list[str] = []
                while i < n:
                    if '＊' in tokens[i] and i + 1 < n and tokens[i + 1] in _SECTION_HEADERS:
                        break
                    if '＊' in tokens[i]:
                        break
                    sec_tokens.append(tokens[i])
                    i += 1
                fields = _parse_section_fields(sec_tokens)
                structure['sections'].append({'name': section_name, 'fields': fields})
            else:
                i += 1
        else:
            i += 1

    if structure['sections']:
        return structure

    return _parse_doc_structure_without_markers(tokens)


def _normalize_inline_field_text(text: str) -> str:
    text = re.sub(r'\s*[:：]\s*', '：', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return re.sub(r'民國\s*(\d+)\s*年\s*(\d+)\s*月\s*(\d+)\s*日', r'民國\1年\2月\3日', text)


def _parse_fields_from_inline_text(text: str) -> list[tuple[str, str]]:
    normalized = _normalize_inline_field_text(text)
    fields: list[tuple[str, str]] = []
    for match in _FALLBACK_FIELD_PATTERN.finditer(normalized):
        label = match.group('label').strip()
        value = _normalize_inline_field_text(match.group('value'))
        if label or value:
            fields.append((label, value))
    return fields


def _parse_doc_structure_without_markers(tokens: list[str]) -> dict:
    structure: dict = {'header_tokens': [], 'sections': []}
    cleaned = [re.sub(r'\s+', ' ', token).strip() for token in tokens if token.strip()]
    if not cleaned:
        return structure

    first_section_index = next(
        (index for index, token in enumerate(cleaned) if _SECTION_HEADER_PATTERN.search(token)),
        None,
    )
    if first_section_index is None:
        structure['header_tokens'] = cleaned
        return structure

    structure['header_tokens'] = cleaned[:first_section_index]

    current_name: str | None = None
    current_tokens: list[str] = []

    def flush_current_section() -> None:
        if current_name is None:
            return
        fields = _parse_fields_from_inline_text(' '.join(current_tokens))
        if fields:
            structure['sections'].append({'name': current_name, 'fields': fields})

    for token in cleaned[first_section_index:]:
        match = _SECTION_HEADER_PATTERN.search(token)
        if match:
            flush_current_section()
            current_name = match.group(0)
            trailing = token[match.end():].strip()
            current_tokens = [trailing] if trailing else []
            continue
        current_tokens.append(token)

    flush_current_section()
    return structure


def _parse_section_fields(tokens: list[str]) -> list[tuple[str, str]]:
    """
    Convert a section's token list into (label, value) pairs using ：as delimiter.

    Between consecutive ：tokens, the tokens are split into:
        [value of previous field]  +  [label of next field]

    The split point is found by _find_label_start_in().
    """
    if not tokens:
        return []

    colon_pos = [j for j, t in enumerate(tokens) if t == '：']
    if not colon_pos:
        return [('', ''.join(tokens))]

    fields: list[tuple[str, str]] = []
    prev_boundary = 0

    for ci, cp in enumerate(colon_pos):
        # Label = tokens from prev_boundary up to (but not including) this ：
        label = ''.join(tokens[prev_boundary:cp]).strip('　 \u3000')

        if ci + 1 < len(colon_pos):
            next_cp = colon_pos[ci + 1]
            between = tokens[cp + 1:next_cp]
            split = _find_label_start_in(between)
            value = ''.join(between[:split]).strip('　 \u3000')
            prev_boundary = cp + 1 + split
        else:
            value = ''.join(tokens[cp + 1:]).strip('　 \u3000')
            prev_boundary = len(tokens)

        if label or value:
            fields.append((label, value))

    return fields


def _find_label_start_in(between: list[str]) -> int:
    """
    Determine where the label for the NEXT field begins inside `between`
    (the tokens that sit between two consecutive ：separators).

    Strategy 1 (fast): return the index of the first token that is a
    known field label.
    Strategy 2 (fallback): return the start of the LAST run of
    pure-CJK tokens that is not immediately preceded by a non-CJK
    value token (e.g. a number/unit like '002層').
    """
    # Strategy 1 — known label lookup
    for j, t in enumerate(between):
        if t in _ALL_KNOWN_LABELS:
            return j

    # Strategy 2 — trailing pure-CJK run with guard
    k = len(between)
    while k > 0:
        t = between[k - 1]
        if not _is_cjk_only(t):
            break
        if k >= 2 and not _is_cjk_only(between[k - 2]):
            break  # CJK token immediately after a non-CJK = unit, not label
        k -= 1

    return k


# ---------------------------------------------------------------------------
# Markdown builder
# ---------------------------------------------------------------------------

def build_markdown(filename: str, texts: list[str]) -> str:
    """Build a Markdown document from the preprocessed token list."""
    stem = Path(filename).stem
    title = re.sub(r'-[OK]+$', '', re.sub(r'^[\d\-]+[;；]?\s*', '', stem), flags=re.IGNORECASE).strip() or stem

    lines: list[str] = [f'# 謄本：{title}', f'> 來源：`{filename}`', '']

    doc = _parse_doc_structure(texts)

    # --- header ---
    header = ' '.join(t for t in doc['header_tokens'] if t.strip('　 ：，（）') and '＊' not in t)
    if header:
        lines += [f'> {header}', '']

    # --- sections ---
    for sec in doc['sections']:
        lines += ['', f'## {sec["name"]}', '']
        for label, value in sec['fields']:
            if label and value:
                lines.append(f'- **{label}**：{value}')
            elif label:
                lines.append(f'- **{label}**')
            elif value:
                lines.append(f'- {value}')

    lines += ['', '---', '*由 fp-converter 自動轉換自 FinePrint .fp 格式*']
    return '\n'.join(lines)


# ---------------------------------------------------------------------------
# Markdown writer
# ---------------------------------------------------------------------------

def write_markdown(texts: list[str], input_path: Path, output_dir: Path) -> Path:
    md = build_markdown(input_path.name, texts)
    out_path = output_dir / (input_path.stem + '.md')
    out_path.write_text(md, encoding='utf-8')
    return out_path


# ---------------------------------------------------------------------------
# JSON writer — structured output for downstream consumers (e.g. people-db
# ingestion pipeline). Shape:
#   { "source_file": str, "header": [str, ...],
#     "sections": [{"name": str, "fields": [{"label": str, "value": str}, ...]}] }
# Emitted either to disk (--output dir) or to stdout when input is a single
# file and --output is literally "-".
# ---------------------------------------------------------------------------

def build_json(filename: str, texts: list[str]) -> dict:
    doc = _parse_doc_structure(texts)
    header = [t for t in doc['header_tokens'] if t.strip('　 ') and '＊' not in t]
    return {
        'source_file': filename,
        'header': header,
        'sections': [
            {
                'name': sec['name'],
                'fields': [{'label': lbl, 'value': val} for lbl, val in sec['fields']],
            }
            for sec in doc['sections']
        ],
    }


def write_json(texts: list[str], input_path: Path, output_dir: Path) -> Path:
    payload = build_json(input_path.name, texts)
    out_path = output_dir / (input_path.stem + '.json')
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
    return out_path


# ---------------------------------------------------------------------------
# HTML builder — table-based 謄本 form layout
# ---------------------------------------------------------------------------

_HTML_TEMPLATE = '''\
<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<style>
* {{ box-sizing: border-box; }}
body {{
  font-family: "PingFang TC", "微軟正黑體", "Heiti TC", serif;
  font-size: 13px; color: #111;
  max-width: 960px; margin: 30px auto; padding: 0 16px;
  background: #fafafa;
}}
h1 {{
  font-size: 19px; font-weight: bold;
  background: #1e3a8a; color: #fff;
  padding: 8px 14px; margin: 0 0 0 0;
  letter-spacing: 1px;
}}
.doc-meta {{
  font-size: 11px; color: #666; padding: 2px 14px 6px;
  border: 1px solid #1e3a8a; border-top: none;
  background: #f0f4ff;
}}
/* ---- page header ---- */
.page-header {{
  border: 1px solid #666; margin: 10px 0;
  background: #fff;
}}
.phdr-top {{
  display: flex; gap: 2em; align-items: center;
  padding: 5px 10px;
  border-bottom: 1px solid #bbb;
  font-size: 12px;
}}
.phdr-top .authority {{ font-weight: bold; font-size: 14px; }}
.phdr-top .system    {{ color: #444; }}
.phdr-top .qdate     {{ margin-left: auto; }}
.phdr-note {{
  font-size: 11px; color: #666;
  padding: 2px 10px;
  border-bottom: 1px solid #bbb;
}}
.phdr-loc {{
  display: flex; gap: 1em; flex-wrap: wrap;
  padding: 4px 10px; font-size: 12px;
  background: #f5f7ff;
}}
.phdr-loc span {{ padding: 1px 6px; }}
/* ---- section ---- */
.section {{
  margin: 12px 0;
  border: 1px solid #555;
}}
.section-title {{
  background: #334155; color: #fff;
  font-weight: bold; font-size: 13px;
  padding: 5px 12px;
  letter-spacing: 2px;
  text-align: center;
}}
/* ---- fields table ---- */
.ftable {{
  width: 100%; border-collapse: collapse;
  font-size: 13px;
}}
.ftable th, .ftable td {{
  border: 1px solid #bbb;
  padding: 4px 8px;
  vertical-align: top;
  line-height: 1.6;
}}
.ftable th {{
  background: #eef2ff;
  font-weight: bold;
  width: 28%;
  white-space: nowrap;
  color: #1e3a8a;
}}
.ftable td {{
  background: #fff;
  word-break: break-word;
}}
.footer {{
  font-size: 10px; color: #bbb;
  text-align: right; margin-top: 16px;
}}
@media print {{
  body {{ max-width: 100%; margin: 0; padding: 0 10mm; background: #fff; }}
  .section {{ page-break-inside: avoid; }}
}}
</style>
</head>
<body>
{body}
</body>
</html>'''


def _build_header_html(header_tokens: list[str]) -> str:
    """Render the document page-header tokens as a styled HTML block."""
    htoks = [t for t in header_tokens if t.strip('　 ')]

    # Extract key components from the header token list
    authority = ''
    system = ''
    query_date = ''
    query_time = ''
    note_parts: list[str] = []
    loc_parts: list[str] = []

    i = 0
    n = len(htoks)
    while i < n:
        t = htoks[i]
        if t in _SYSTEM_NAMES:
            system = t
            if i > 0:
                authority = ''.join(htoks[max(0, i - 1):i])
            i += 1
        elif t == '查詢日期' and i + 2 < n and htoks[i + 1] == '：':
            query_date = htoks[i + 2]
            if i + 3 < n and re.match(r'^\d{1,2}:\d{2}$', htoks[i + 3]):
                query_time = htoks[i + 3]
                i += 4
            else:
                i += 3
        elif '如需登記謄本' in t or '如需申請' in t:
            # Collect bracketed note (the opening '（' precedes this token)
            # Include the '（' from loc_parts if it's the last item there
            if loc_parts and loc_parts[-1] == '（':
                note_parts = [loc_parts.pop()]
            else:
                note_parts = []
            note_parts.append(t)
            i += 1
            while i < n and '）' not in note_parts[-1] and ')' not in note_parts[-1]:
                note_parts.append(htoks[i])
                i += 1
        elif t in ('建號', '地號'):
            # Location line ends at 建號 / 地號, note everything before in loc_parts
            loc_parts.append(t)
            i += 1
        else:
            # If we already have the system name, remaining tokens form location bar
            if system and t not in ('查詢日期', '：') and '如需' not in t:
                loc_parts.append(t)
            i += 1

    parts: list[str] = ['<div class="page-header">']

    # Top row
    top_items: list[str] = []
    if authority:
        top_items.append(f'<span class="authority">{_esc(authority)}</span>')
    if system:
        top_items.append(f'<span class="system">{_esc(system)}</span>')
    if query_date:
        dt = f'{_esc(query_date)} {_esc(query_time)}'.strip()
        top_items.append(f'<span class="qdate">查詢日期：{dt}</span>')
    if top_items:
        parts.append(f'<div class="phdr-top">{"".join(top_items)}</div>')

    # Note row
    if note_parts:
        parts.append(f'<div class="phdr-note">{_esc("".join(note_parts))}</div>')

    # Location row (remove lone ：tokens)
    loc_clean = [t for t in loc_parts if t not in ('：', '，')]
    if loc_clean:
        spans = ''.join(f'<span>{_esc(t)}</span>' for t in loc_clean)
        parts.append(f'<div class="phdr-loc">{spans}</div>')

    parts.append('</div>')
    return '\n'.join(parts)


def build_html(filename: str, texts: list[str]) -> str:
    """Build a table-based HTML page mimicking the original 謄本 form layout."""
    stem = Path(filename).stem
    title = (
        re.sub(r'-[OK]+$', '', re.sub(r'^[\d\-]+[;；]?\s*', '', stem), flags=re.IGNORECASE).strip()
        or stem
    )

    doc = _parse_doc_structure(texts)
    body_parts: list[str] = [
        f'<h1>謄本：{_esc(title)}</h1>',
        f'<p class="doc-meta">來源檔案：{_esc(filename)}</p>',
    ]

    # Page header block
    if doc['header_tokens']:
        body_parts.append(_build_header_html(doc['header_tokens']))

    # Sections
    for sec in doc['sections']:
        body_parts.append('<div class="section">')
        body_parts.append(f'<div class="section-title">{_esc(sec["name"])}</div>')
        body_parts.append('<table class="ftable">')
        for label, value in sec['fields']:
            lh = _esc(label) if label else '&nbsp;'
            vh = _esc(value).replace('\n', '<br>') if value else '&nbsp;'
            body_parts.append(f'<tr><th>{lh}</th><td>{vh}</td></tr>')
        body_parts.append('</table>')
        body_parts.append('</div>')

    body_parts.append('<p class="footer">由 fp-converter 自動轉換自 FinePrint .fp 格式</p>')
    return _HTML_TEMPLATE.format(title=_esc(title), body='\n'.join(body_parts))



def _esc(text: str) -> str:
    """Minimal HTML escaping."""
    return text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def write_html(texts: list[str], input_path: Path, output_dir: Path) -> Path:
    html = build_html(input_path.name, texts)
    out_path = output_dir / (input_path.stem + '.html')
    out_path.write_text(html, encoding='utf-8')
    return out_path


# ---------------------------------------------------------------------------
# PDF writer — uses fpdf2 with system Arial Unicode font
# ---------------------------------------------------------------------------

# Candidate font paths — checked in order
_FONT_CANDIDATES = [
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '/Library/Fonts/Arial Unicode.ttf',
]


def _find_unicode_font() -> str | None:
    for path in _FONT_CANDIDATES:
        if Path(path).exists():
            return path
    return None


def write_pdf(texts: list[str], input_path: Path, output_dir: Path) -> Path:
    try:
        from fpdf import FPDF
    except ImportError:
        print('ERROR: fpdf2 not installed. Run: pip3 install fpdf2', file=sys.stderr)
        sys.exit(1)

    font_path = _find_unicode_font()
    if font_path is None:
        print(
            'ERROR: Arial Unicode.ttf not found at:\n'
            '  /System/Library/Fonts/Supplemental/Arial Unicode.ttf\n'
            'Try --format html instead (no font required).',
            file=sys.stderr,
        )
        sys.exit(1)

    md_text = build_markdown(input_path.name, texts)

    pdf = FPDF(unit='mm', format='A4')
    pdf.set_margins(left=20, top=20, right=20)
    pdf.add_page()

    # fpdf2 v2.5.1+: add_font() without uni=True — pass regular path
    pdf.add_font('CJK', '', font_path)
    pdf.add_font('CJK', 'B', font_path)

    pdf.set_auto_page_break(auto=True, margin=20)
    usable_w = pdf.w - pdf.l_margin - pdf.r_margin  # ≈ 170 mm on A4

    for line in md_text.splitlines():
        stripped = line.strip()
        if not stripped:
            pdf.ln(2)
            continue

        if stripped.startswith('# '):
            pdf.set_font('CJK', 'B', 15)
            pdf.set_fill_color(232, 240, 254)
            pdf.multi_cell(usable_w, 10, stripped[2:], fill=True, new_x='LMARGIN', new_y='NEXT')
            pdf.ln(2)
        elif stripped.startswith('## '):
            pdf.set_font('CJK', 'B', 12)
            pdf.set_text_color(30, 80, 160)
            pdf.multi_cell(usable_w, 8, stripped[3:], new_x='LMARGIN', new_y='NEXT')
            pdf.set_text_color(0, 0, 0)
            pdf.ln(1)
        elif stripped.startswith('> '):
            pdf.set_font('CJK', '', 9)
            pdf.set_text_color(100, 100, 100)
            pdf.multi_cell(usable_w, 6, stripped[2:], new_x='LMARGIN', new_y='NEXT')
            pdf.set_text_color(0, 0, 0)
        elif stripped.startswith('- '):
            pdf.set_font('CJK', '', 10)
            content = stripped[2:]
            if content.startswith('**') and '**：' in content:
                key, _, val = content[2:].partition('**：')
                pdf.set_font('CJK', 'B', 10)
                pdf.multi_cell(usable_w, 7, f'{key}：{val}', new_x='LMARGIN', new_y='NEXT')
            else:
                pdf.multi_cell(usable_w, 7, content, new_x='LMARGIN', new_y='NEXT')
        elif stripped.startswith('---'):
            pdf.set_draw_color(180, 180, 180)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(4)
        elif stripped:
            pdf.set_font('CJK', '', 9)
            pdf.set_text_color(120, 120, 120)
            pdf.multi_cell(usable_w, 6, stripped, new_x='LMARGIN', new_y='NEXT')
            pdf.set_text_color(0, 0, 0)

    out_path = output_dir / (input_path.stem + '.pdf')
    pdf.output(str(out_path))
    return out_path


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def collect_fp_files(path: Path) -> list[Path]:
    """Collect all .fp files from a file or directory."""
    if path.is_file():
        return [path]
    if path.is_dir():
        return sorted(candidate for candidate in path.rglob('*') if candidate.is_file() and candidate.suffix.lower() == '.fp')
    raise FileNotFoundError(f'Path not found: {path}')


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Convert FinePrint .fp files to Markdown / HTML / PDF (macOS)',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument('positional', nargs='?', help='Single .fp file to convert')
    parser.add_argument('--input', '-i', help='Input .fp file or folder')
    parser.add_argument(
        '--output', '-o', default='./fp-output',
        help='Output folder (default: ./fp-output)',
    )
    parser.add_argument(
        '--format', '-f',
        choices=['md', 'html', 'pdf', 'json', 'all'],
        default='html',
        help='Output format: html (default/recommended), md, pdf, json, or all',
    )
    parser.add_argument('--verbose', '-v', action='store_true')
    args = parser.parse_args()

    # Resolve input path
    input_arg = args.positional or args.input
    if not input_arg:
        parser.print_help()
        sys.exit(1)

    input_path = Path(input_arg).expanduser().resolve()
    output_dir = Path(args.output).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    try:
        fp_files = collect_fp_files(input_path)
    except FileNotFoundError as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        sys.exit(1)

    if not fp_files:
        print('No .fp files found.', file=sys.stderr)
        sys.exit(1)

    fmt = args.format
    print(f'Found {len(fp_files)} .fp file(s). Format: {fmt}. Output → {output_dir}')
    print()

    success = 0
    errors = 0

    for fp_file in fp_files:
        try:
            texts = extract_text_from_fp(fp_file)

            if args.verbose:
                print(f'  Extracted {len(texts)} text segments from {fp_file.name}')

            outputs: list[Path] = []

            if fmt in ('md', 'all'):
                outputs.append(write_markdown(texts, fp_file, output_dir))

            if fmt in ('html', 'all'):
                outputs.append(write_html(texts, fp_file, output_dir))

            if fmt in ('pdf', 'all'):
                outputs.append(write_pdf(texts, fp_file, output_dir))

            if fmt in ('json', 'all'):
                outputs.append(write_json(texts, fp_file, output_dir))

            out_names = ', '.join(p.name for p in outputs)
            print(f'  ✓  {fp_file.name}  →  {out_names}')
            success += 1

        except Exception as exc:  # noqa: BLE001
            print(f'  ✗  {fp_file.name}  — ERROR: {exc}', file=sys.stderr)
            if args.verbose:
                import traceback
                traceback.print_exc()
            errors += 1

    print()
    print(f'Done. {success} converted, {errors} failed.')
    if success > 0:
        print(f'\n在 Finder 中開啟：  open "{output_dir}"')
        if fmt in ('html', 'all'):
            first_html = next((output_dir / (f.stem + '.html') for f in fp_files), None)
            if first_html and first_html.exists():
                print(f'在瀏覽器中預覽：    open "{first_html}"')


if __name__ == '__main__':
    main()
