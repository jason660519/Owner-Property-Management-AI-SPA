"""
Taiwan Building Transcript Parser (建物謄本解析器)

Parses the three major sections of a Taiwan land registry building transcript:
  - 建物標示部 (Building Description Section)
  - 建物所有權部 (Building Ownership Section)
  - 建物他項權利部 (Building Other Rights Section)

Design principle: deterministic regex, zero LLM dependency.
Works on PDFs that have a text layer (電子謄本). For scanned/image PDFs,
call the VLM fallback outside this module.
"""

import re
from dataclasses import dataclass, field
from typing import Optional
from .cjk_normalize import normalize


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class TranscriptMeta:
    """謄本基本資訊 (header)"""
    transcript_name: str = ""         # 謄本名稱與種類 e.g. 建物登記第二類謄本(建號全部)
    building_number: str = ""         # 完整建號 e.g. 大安區復興段二小段 01696-000建號
    print_time: str = ""              # 列印時間 e.g. 民國102年07月08日14時21分
    transcript_check_number: str = "" # 謄本字第號 e.g. 大安電謄字第022949號
    data_authority: str = ""          # 資料管轄機關
    issuing_authority: str = ""       # 謄本核發機關


@dataclass
class BuildingDescription:
    """建物標示部"""
    registration_date: str = ""       # 登記日期
    registration_reason: str = ""     # 登記原因
    door_number: str = ""             # 建物門牌
    land_number: str = ""             # 建物座落地號
    primary_use: str = ""             # 主要用途
    primary_material: str = ""        # 主要建材
    floors: str = ""                  # 層數
    total_area: str = ""              # 總面積 (m²)
    floor_levels: list[dict] = field(default_factory=list)  # [{層次, 面積}]
    completion_date: str = ""         # 建築完成日期
    attached_structures: list[dict] = field(default_factory=list)  # [{用途, 面積}]
    common_areas: list[dict] = field(default_factory=list)   # [{建號, 面積, 權利範圍}]
    other_notes: str = ""             # 其他登記事項


@dataclass
class OwnerRecord:
    """建物所有權部 — 單筆所有權人記錄"""
    sequence: str = ""                # 登記次序
    registration_date: str = ""       # 登記日期
    registration_reason: str = ""     # 登記原因
    reason_date: str = ""             # 原因發生日期
    owner_name: str = ""              # 所有權人
    owner_address: str = ""           # 設籍地地址
    share: str = ""                   # 權利範圍
    certificate_number: str = ""      # 權狀字號
    related_other_rights: str = ""    # 相關他項權利登記次序
    other_notes: str = ""             # 其他登記事項


@dataclass
class OtherRightRecord:
    """建物他項權利部 — 單筆他項權利記錄"""
    sequence: str = ""                # 登記次序
    right_type: str = ""              # 權利種類
    receipt_date: str = ""            # 收件日期
    receipt_number: str = ""          # 字號
    registration_date: str = ""       # 登記日期
    registration_reason: str = ""     # 登記原因
    right_holder: str = ""            # 權利人
    right_holder_address: str = ""    # 權利人住址
    debt_ratio: str = ""              # 債權額比例
    total_secured_debt: str = ""      # 擔保債權總金額
    duration: str = ""                # 存續期間
    repayment_date: str = ""          # 清償日期
    interest_rate: str = ""           # 利息（率）
    default_interest_rate: str = ""   # 延遲利息（率）
    penalty: str = ""                 # 違約金
    debtor_ratio: str = ""            # 債務人及債務額比例
    right_subject: str = ""           # 權利標的
    subject_sequence: str = ""        # 標的登記次序
    right_scope: str = ""             # 設定權利範圍
    certificate_number: str = ""      # 證明書字號
    obligor: str = ""                 # 設定義務人
    common_collateral_land: str = ""  # 共同擔保地號
    common_collateral_building: str = ""  # 共同擔保建號
    other_notes: str = ""             # 其他登記事項


@dataclass
class BuildingTranscript:
    """完整建物謄本解析結果"""
    meta: TranscriptMeta = field(default_factory=TranscriptMeta)
    building_description: Optional[BuildingDescription] = None
    ownership_records: list[OwnerRecord] = field(default_factory=list)
    other_right_records: list[OtherRightRecord] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _first(pattern: str, text: str, flags: int = 0) -> str:
    """Return first capture group of pattern or empty string."""
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else ""


def _clean(value: str) -> str:
    """Strip internal whitespace, asterisks (used as padding), newlines."""
    return re.sub(r"[\s*]+", " ", value).strip()


# ---------------------------------------------------------------------------
# Meta parser
# ---------------------------------------------------------------------------

def _parse_meta(header_text: str) -> TranscriptMeta:
    """Extract transcript header information."""
    meta = TranscriptMeta()

    # 謄本名稱：第一行 e.g. "建物登記第二類謄本(建號全部)"
    m = re.search(r"(建物登記第[^\n（(]+(?:[（(][^）)]+[）)])?)", header_text)
    if m:
        meta.transcript_name = _clean(m.group(1))

    # 完整建號：e.g. "大安區復興段二小段 01696-000建號"
    m = re.search(r"([^\n]*\d{5}-\d{3}建號)", header_text)
    if m:
        meta.building_number = _clean(m.group(1))

    # 列印時間
    meta.print_time = _first(r"列印時間[：:]\s*(.+?)(?:\s{3,}|頁次)", header_text)

    # 謄本字第號
    meta.transcript_check_number = _first(r"([^\s]+電謄字第\S+號)", header_text)

    # 資料管轄機關 / 核發機關
    m = re.search(
        r"資料管轄機關[：:]\s*([^\s]+(?:地政事務所|登記處)).*?謄本核發機關[：:]\s*([^\s]+(?:地政事務所|登記處))",
        header_text,
    )
    if m:
        meta.data_authority = m.group(1).strip()
        meta.issuing_authority = m.group(2).strip()

    return meta


# ---------------------------------------------------------------------------
# 建物標示部 parser
# ---------------------------------------------------------------------------

def _parse_building_description(section: str) -> BuildingDescription:
    desc = BuildingDescription()

    desc.registration_date = _first(r"登記日期[：:]\s*([^\s]+(?:年\s*\d+月\s*\d+日)?)", section)
    desc.registration_reason = _first(r"登記原因[：:]\s*(\S+)", section)
    desc.door_number = _first(r"建物門牌[：:]\s*(.+?)(?:\n|$)", section)
    desc.land_number = _first(r"建物坐落地號[：:]\s*(.+?)(?:\n|$)", section)
    desc.primary_use = _first(r"主要用途[：:]\s*(\S+)", section)
    desc.primary_material = _first(r"主要建材[：:]\s*(\S+)", section)

    m = re.search(r"層\s*數[：:]\s*(\d+)層\s*總面積[：:]\s*[\s*]*([\d.]+)\s*平方公尺", section)
    if m:
        desc.floors = m.group(1)
        desc.total_area = m.group(2) + " 平方公尺"

    desc.completion_date = _first(r"建築完成日期[：:]\s*([^\s]+(?:年\s*\d+月\s*\d+日)?)", section)

    # 層次面積（可能多行）
    for m in re.finditer(
        r"層\s*次[：:]\s*(.+?)\s*層次面積[：:]\s*[\s*]*([\d.]+)\s*平方公尺",
        section,
    ):
        desc.floor_levels.append({
            "層次": _clean(m.group(1)),
            "面積": m.group(2) + " 平方公尺",
        })

    # 附屬建物 — one or more rows: "附屬建物用途：陽台  面積：17.84平方公尺"
    for m in re.finditer(
        r"附屬建物用途[：:]\s*(\S+)\s*面積[：:]\s*[\s*]*([\d.]+)\s*平方公尺",
        section,
    ):
        desc.attached_structures.append({
            "用途": m.group(1),
            "面積": m.group(2) + " 平方公尺",
        })

    # 共有部分 — pattern: "共有部分：復興段二小段01719-000建號**2,424.04平方公尺  權利範圍：****242404分之2249"
    idx = 0
    while True:
        m = re.search(
            r"共有部分[：:]\s*(\S+建號)\s*[\s*]*([\d,.]+)\s*平方公尺\s*"
            r"(?:.*?)權利範圍[：:]\s*[\s*]*([\d/分之]+[\s*]*)",
            section[idx:],
            re.DOTALL,
        )
        if not m:
            break
        desc.common_areas.append({
            "建號": m.group(1),
            "面積": _clean(m.group(2)) + " 平方公尺",
            "權利範圍": _clean(m.group(3)),
        })
        idx += m.end()

    # 其他登記事項 (after 建物標示部 section, before 所有權部)
    desc.other_notes = _first(r"其他登記事項[：:]\s*([\s\S]+?)(?=\n\s*(?:\*{5,}|\Z))", section)

    return desc


# ---------------------------------------------------------------------------
# 建物所有權部 parser
# ---------------------------------------------------------------------------

def _parse_ownership_records(section: str) -> list[OwnerRecord]:
    # Split by individual record markers "(0001)", "(0002)" …
    record_texts = re.split(r"(?=\(\d{4}\)登記次序[：:])", section)
    records: list[OwnerRecord] = []

    for block in record_texts:
        if not re.search(r"\d{4}.{0,5}登記次序", block):
            continue
        rec = OwnerRecord()
        rec.sequence = _first(r"\((\d{4})\)登記次序[：:]\s*(\d+)", block) or \
                       _first(r"登記次序[：:]\s*(\S+)", block)
        # prefer full sequence from "(0001)登記次序：0001" → "0001"
        m = re.search(r"\((\d{4})\)登記次序[：:]\s*(\d+)", block)
        if m:
            rec.sequence = m.group(2)

        rec.registration_date = _first(r"登記日期[：:]\s*([^\s]+(?:年\s*\d+月\s*\d+日)?)", block)
        rec.registration_reason = _first(r"登記原因[：:]\s*(\S+)", block)
        rec.reason_date = _first(r"原因發生日期[：:]\s*([^\s]+(?:年\s*\d+月\s*\d+日)?)", block)
        rec.owner_name = _first(r"所有[權権权]人[：:]\s*(\S+)", block)
        rec.owner_address = _first(r"住\s*址[：:]\s*(.+?)(?:\n|$)", block)
        rec.share = _clean(_first(r"權利範圍[：:]\s*([\d全部/分之\s*]+(?:分之\d+)?)", block))
        rec.certificate_number = _first(r"權狀字號[：:]\s*(\S+)", block)
        rec.related_other_rights = _first(r"相關他項權利登記次序[：:]\s*(.+?)(?:\n|$)", block)
        rec.other_notes = _first(r"其他登記事項[：:]\s*(.+?)(?=\n\s*\(|\Z)", block, re.DOTALL)
        records.append(rec)

    return records


# ---------------------------------------------------------------------------
# 建物他項權利部 parser
# ---------------------------------------------------------------------------

def _parse_other_rights(section: str) -> list[OtherRightRecord]:
    if "無他項權利資料" in section or not section.strip():
        return []

    record_texts = re.split(r"(?=\(\d{4}\)登記次序[：:])", section)
    records: list[OtherRightRecord] = []

    for block in record_texts:
        if not re.search(r"\d{4}.{0,5}登記次序", block):
            continue
        rec = OtherRightRecord()
        m = re.search(r"\((\d{4})\)登記次序[：:]\s*(\d+)", block)
        if m:
            rec.sequence = m.group(2)

        rec.right_type = _first(r"權利種類[：:]\s*(\S+)", block)
        rec.receipt_date = _first(r"收件日期[：:]\s*([^\s\n]+(?:年\s*\d+月\s*\d+日)?)", block)
        rec.receipt_number = _first(r"收件[^：:]*字號[：:]\s*(\S+)", block)
        rec.registration_date = _first(r"登記日期[：:]\s*([^\s]+(?:年\s*\d+月\s*\d+日)?)", block)
        rec.registration_reason = _first(r"登記原因[：:]\s*(\S+)", block)

        m_rh = re.search(r"權利人[：:]\s*(\S+)\s*(?:住\s*址[：:]\s*(.+?))?(?:\n|$)", block)
        if m_rh:
            rec.right_holder = m_rh.group(1)
            rec.right_holder_address = (m_rh.group(2) or "").strip()

        rec.debt_ratio = _first(r"債權額比例[：:]\s*(\S+)", block)
        rec.total_secured_debt = _first(r"擔保債權總金額[：:]\s*(.+?)(?:\n|$)", block)
        rec.duration = _first(r"存續期間[：:]\s*(.+?)(?:\n|$)", block)
        rec.repayment_date = _first(r"清償日期[：:]\s*(.+?)(?:\n|$)", block)
        rec.interest_rate = _first(r"利息[（(]率[）)][：:]\s*(.+?)(?:\n|$)", block)
        rec.default_interest_rate = _first(r"延遲利息[（(]率[）)][：:]\s*(.+?)(?:\n|$)", block)
        rec.penalty = _first(r"違約金[：:]\s*(.+?)(?:\n|$)", block)
        rec.debtor_ratio = _first(r"債務人及債務額比例[：:]\s*(.+?)(?:\n|$)", block)
        rec.right_subject = _first(r"權利標的[：:]\s*(\S+)", block)
        rec.subject_sequence = _first(r"標的登記次序[：:]\s*(\S+)", block)
        rec.right_scope = _first(r"設定權利範圍[：:]\s*(\S+)", block)
        rec.certificate_number = _first(r"證明書字號[：:]\s*(\S+)", block)
        rec.obligor = _first(r"設定義務人[：:]\s*(\S+)", block)
        rec.common_collateral_land = _first(r"共同擔保地號[：:]\s*(.+?)(?:\n|$)", block)
        rec.common_collateral_building = _first(r"共同擔保建號[：:]\s*(.+?)(?:\n|$)", block)
        rec.other_notes = _first(r"其他登記事項[：:]\s*(.+?)(?=\n\s*\(|\Z)", block, re.DOTALL)
        records.append(rec)

    return records


# ---------------------------------------------------------------------------
# Section splitter
# ---------------------------------------------------------------------------

_SECTION_MARKERS = {
    # Allow both Traditional Chinese 權 and Japanese kanji 権 variants
    "標示部": re.compile(r"\*{5,}\s*建物標示部\s*\*{5,}"),
    "所有權部": re.compile(r"\*{5,}\s*建物所有[權権权]部\s*\*{5,}"),
    "他項權利部": re.compile(r"\*{5,}\s*建物他項[權権权]利部\s*\*{5,}"),
}


def _split_sections(full_text: str) -> dict[str, str]:
    """
    Split the full normalized transcript text into major sections.

    Returns a dict with keys: 'header', '標示部', '所有權部', '他項權利部'.
    Missing sections return empty strings.
    """
    positions: dict[str, int] = {}
    for name, pattern in _SECTION_MARKERS.items():
        m = pattern.search(full_text)
        if m:
            positions[name] = m.start()

    sorted_names = sorted(positions, key=lambda k: positions[k])
    sections: dict[str, str] = {
        "header": full_text[: positions[sorted_names[0]]] if sorted_names else full_text,
    }

    for i, name in enumerate(sorted_names):
        start = positions[name]
        end = positions[sorted_names[i + 1]] if i + 1 < len(sorted_names) else len(full_text)
        sections[name] = full_text[start:end]

    for key in ("標示部", "所有權部", "他項權利部"):
        sections.setdefault(key, "")

    return sections


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_building_transcript(raw_text: str) -> BuildingTranscript:
    """
    Parse a full building transcript text into structured data.

    Args:
        raw_text: Raw text extracted from a 建物謄本 PDF (all pages concatenated).

    Returns:
        BuildingTranscript dataclass with meta, building_description,
        ownership_records, and other_right_records.
    """
    text = normalize(raw_text)
    sections = _split_sections(text)

    result = BuildingTranscript()
    result.meta = _parse_meta(sections["header"] + sections.get("標示部", "")[:200])
    result.building_description = _parse_building_description(sections["標示部"])
    result.ownership_records = _parse_ownership_records(sections["所有權部"])
    result.other_right_records = _parse_other_rights(sections["他項權利部"])
    return result
