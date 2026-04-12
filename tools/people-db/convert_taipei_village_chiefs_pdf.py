#!/usr/bin/env python3
"""
Convert Taipei village-chief PDF tables into CSV for People Database import.

Expected source format:
- Files similar to resources/samples/台北市里長/*.pdf
- Multi-column pages containing labels: 姓名 / 性別 / 里辦公處電話 / 行動電話 / 電子郵件位址 / 里辦公處地址

Usage:
  python3 tools/people-db/convert_taipei_village_chiefs_pdf.py \
    --input-dir "resources/samples/台北市里長" \
    --output "resources/samples/台北市里長/台北市里長_匯入用.csv"
"""

from __future__ import annotations

import argparse
import csv
import re
from pathlib import Path

import fitz  # PyMuPDF

CSV_COLUMNS = ["姓名", "性別", "電話", "行動電話", "電子郵件位址", "里辦公處地址"]

CONTINUATION_PREFIX_RE = re.compile(r"^(巷|弄|號|之|樓|\d+|[一二三四五六七八九十]+樓)")
EMAIL_RE = re.compile(
    r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(?:gov\.tw|com(?:\.tw)?|net(?:\.tw)?|org(?:\.tw)?|edu\.tw|tw)",
    re.IGNORECASE,
)
ONLY_HEX_OR_DIGITS_RE = re.compile(r"^[0-9a-fA-F]{1,6}$")
ONLY_DIGITS_RE = re.compile(r"^\d+$")
PHONE_RE = re.compile(r"^\d{7,10}$")
MOBILE_RE = re.compile(r"^09\d{8}$")


def normalize_text(text: str) -> str:
    return (
        text.replace("里", "里")
        .replace("行", "行")
        .replace("女", "女")
        .replace("弄", "弄")
        .replace("樓", "樓")
        .replace("路", "路")
        .replace("　", " ")
        .replace("\u00a0", " ")
    )


def find_line_index(lines: list[str], keyword: str) -> int:
    for idx, line in enumerate(lines):
        if keyword in line:
            return idx
    return -1


def detect_record_count(lines: list[str]) -> int:
    code_header_idx = next(
        (idx for idx, line in enumerate(lines) if "編" in line and "號" in line),
        -1,
    )
    if code_header_idx == -1:
        return 0

    count = 0
    for line in lines[code_header_idx + 1 :]:
        raw = line.replace(" ", "")
        if ONLY_DIGITS_RE.fullmatch(raw):
            count += 1
            continue
        if count > 0:
            break
    return count


def collect_values(
    lines: list[str],
    start_idx: int,
    count: int,
    include_predicate,
    stop_predicate,
) -> list[str]:
    if start_idx == -1 or count <= 0:
        return []

    values: list[str] = []
    for line in lines[start_idx + 1 :]:
        compact = line.replace(" ", "")
        if stop_predicate(compact) and values:
            break
        if include_predicate(compact):
            values.append(compact)
            if len(values) >= count:
                break
    return values


def parse_emails(lines: list[str], count: int) -> list[str]:
    start = find_line_index(lines, "電子郵件位址")
    end = find_line_index(lines, "里辦公處網址")
    if start == -1:
        return [""] * count

    if end == -1 or end <= start:
        end = len(lines)

    fragments = [line.replace(" ", "") for line in lines[start + 1 : end] if line.strip()]
    if count > 0 and len(fragments) == count * 2:
        grouped = [fragments[i] + fragments[i + 1] for i in range(0, len(fragments), 2)]
        return grouped

    parsed: list[str] = []
    buffer = ""
    for fragment in fragments:
        buffer += fragment
        match = EMAIL_RE.search(buffer)
        if match and match.start() == 0:
            parsed.append(match.group(0))
            buffer = buffer[match.end() :]
            if len(parsed) >= count:
                break

    while len(parsed) < count:
        parsed.append("")
    return parsed[:count]


def is_url_fragment(text: str) -> bool:
    lowered = text.lower().replace(" ", "")
    if "http" in lowered or "cgi-bin" in lowered or "page=" in lowered:
        return True
    if ONLY_HEX_OR_DIGITS_RE.fullmatch(lowered):
        return True
    return False


def parse_addresses(lines: list[str], count: int) -> list[str]:
    if count <= 0:
        return []
    url_idx = find_line_index(lines, "里辦公處網址")
    address_label_idx = find_line_index(lines, "里辦公處地址")

    before_label: list[str] = []
    if url_idx != -1 and address_label_idx != -1 and address_label_idx > url_idx:
        for line in lines[url_idx + 1 : address_label_idx]:
            compact = line.replace(" ", "")
            if not compact or is_url_fragment(compact):
                continue
            before_label.append(compact)

    after_label: list[str] = []
    if address_label_idx != -1:
        for line in lines[address_label_idx + 1 :]:
            compact = line.replace(" ", "")
            if not compact:
                continue
            if compact.startswith("--"):
                break
            if is_url_fragment(compact):
                continue
            after_label.append(compact)

    source_lines = before_label if before_label else after_label
    if not source_lines:
        return [""] * count

    merged: list[str] = []
    for line in source_lines:
        if not merged:
            merged.append(line)
            continue

        if CONTINUATION_PREFIX_RE.match(line):
            merged[-1] = f"{merged[-1]}{line}"
            continue

        if len(merged) >= count:
            merged[-1] = f"{merged[-1]}{line}"
            continue

        merged.append(line)

    while len(merged) < count:
        merged.append("")
    if len(merged) > count:
        merged = merged[: count - 1] + ["".join(merged[count - 1 :])]

    return merged[:count]


def parse_page_records(page_text: str) -> list[dict[str, str]]:
    lines = [normalize_text(line).strip() for line in page_text.splitlines() if normalize_text(line).strip()]
    if not lines:
        return []
    compact_lines = [line.replace(" ", "") for line in lines]

    count = detect_record_count(compact_lines)
    if count == 0:
        return []

    name_idx = next((idx for idx, line in enumerate(compact_lines) if "姓名" in line), -1)
    gender_idx = next((idx for idx, line in enumerate(compact_lines) if "性別" in line), -1)
    phone_idx = next((idx for idx, line in enumerate(compact_lines) if "辦公處電話" in line), -1)
    mobile_idx = next((idx for idx, line in enumerate(compact_lines) if "行動電話" in line), -1)

    names = collect_values(
        compact_lines,
        name_idx,
        count,
        include_predicate=lambda compact: bool(compact)
        and not PHONE_RE.fullmatch(compact)
        and compact not in {"男", "女", "分", "次", "區", "港"},
        stop_predicate=lambda compact: "性" in compact and "別" in compact,
    )
    genders = collect_values(
        compact_lines,
        gender_idx,
        count,
        include_predicate=lambda compact: compact in {"男", "女"},
        stop_predicate=lambda compact: "電話" in compact,
    )
    phones = collect_values(
        compact_lines,
        phone_idx,
        count,
        include_predicate=lambda compact: bool(PHONE_RE.fullmatch(compact)),
        stop_predicate=lambda compact: "傳真" in compact or ("行" in compact and "電話" in compact),
    )
    mobiles = collect_values(
        compact_lines,
        mobile_idx,
        count,
        include_predicate=lambda compact: bool(MOBILE_RE.fullmatch(compact)),
        stop_predicate=lambda compact: "電子郵件位址" in compact,
    )
    emails = parse_emails(lines, count)
    addresses = parse_addresses(lines, count)

    records: list[dict[str, str]] = []
    for idx in range(count):
        name = names[idx] if idx < len(names) else ""
        if name in {"分", "次", "區", "港", "里"}:
            continue
        records.append({
            "姓名": name,
            "性別": genders[idx] if idx < len(genders) else "",
            "電話": phones[idx] if idx < len(phones) else "",
            "行動電話": mobiles[idx] if idx < len(mobiles) else "",
            "電子郵件位址": emails[idx] if idx < len(emails) else "",
            "里辦公處地址": addresses[idx] if idx < len(addresses) else "",
        })

    return records


def convert_pdf_file(pdf_path: Path) -> list[dict[str, str]]:
    all_records: list[dict[str, str]] = []
    with fitz.open(pdf_path) as doc:
        for page in doc:
            all_records.extend(parse_page_records(page.get_text("text")))
    return all_records


def main() -> int:
    parser = argparse.ArgumentParser(description="Convert 台北市里長 PDF files to CSV")
    parser.add_argument("--input-dir", required=True, help="Directory containing PDF files")
    parser.add_argument("--output", required=True, help="Output CSV path")
    args = parser.parse_args()

    input_dir = Path(args.input_dir)
    output_path = Path(args.output)

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"[ERROR] Input directory not found: {input_dir}")
        return 1

    pdf_files = sorted(input_dir.glob("*.pdf"))
    if not pdf_files:
        print(f"[ERROR] No PDF files found in: {input_dir}")
        return 1

    all_records: list[dict[str, str]] = []
    for pdf_file in pdf_files:
        records = convert_pdf_file(pdf_file)
        all_records.extend(records)
        print(f"[OK] {pdf_file.name}: {len(records)} rows")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writeheader()
        writer.writerows(all_records)

    print(f"[DONE] Wrote {len(all_records)} rows to {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
