"""
Taiwan Land Transcript Parser (土地謄本解析器)

Parses the three major sections of a Taiwan land registry land transcript:
  - 土地標示部 (Land Description Section)
  - 土地所有權部 (Land Ownership Section)
  - 土地他項權利部 (Land Other Rights Section)

Design principle: deterministic regex, zero LLM dependency.
"""

import re
from dataclasses import dataclass, field
from typing import Optional
from .cjk_normalize import normalize


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------

@dataclass
class LandTranscriptMeta:
    """謄本基本資訊 (header)"""
    transcript_name: str = ""         # e.g. 土地登記第二類謄本(所有權部)
    land_number: str = ""             # 完整地號 e.g. 大安區大安段三小段 0049-0000地號
    print_time: str = ""              # 列印時間
    transcript_check_number: str = "" # 謄本字第號
    data_authority: str = ""          # 資料管轄機關
    issuing_authority: str = ""       # 謄本核發機關


@dataclass
class LandDescription:
    """土地標示部"""
    registration_date: str = ""   # 登記日期
    registration_reason: str = "" # 登記原因
    land_section: str = ""        # 地段 (e.g. 大安段三小段)
    land_number: str = ""         # 地號
    land_use_zone: str = ""       # 使用分區 / 地目
    area: str = ""                # 地目面積 (m²)
    other_notes: str = ""         # 其他登記事項


@dataclass
class LandOwnerRecord:
    """土地所有權部 — 單筆所有權人記錄"""
    sequence: str = ""                  # 登記次序
    registration_date: str = ""         # 登記日期
    registration_reason: str = ""       # 登記原因
    reason_date: str = ""               # 原因發生日期
    owner_name: str = ""                # 所有權人
    owner_address: str = ""             # 住址
    share: str = ""                     # 權利範圍
    certificate_number: str = ""        # 權狀字號
    current_declared_price: str = ""    # 當期申報地價
    previous_transfer_value: str = ""   # 前次移轉現值或原規定地價
    historical_shares: str = ""         # 歷次取得權利範圍
    related_other_rights: str = ""      # 相關他項權利登記次序
    other_notes: str = ""               # 其他登記事項


@dataclass
class LandOtherRightRecord:
    """土地他項權利部 — 單筆他項權利記錄"""
    sequence: str = ""
    right_type: str = ""
    receipt_date: str = ""
    receipt_number: str = ""
    registration_date: str = ""
    registration_reason: str = ""
    right_holder: str = ""
    right_holder_address: str = ""
    debt_ratio: str = ""
    total_secured_debt: str = ""
    duration: str = ""
    repayment_date: str = ""
    interest_rate: str = ""
    default_interest_rate: str = ""
    penalty: str = ""
    debtor_ratio: str = ""
    right_subject: str = ""
    subject_sequence: str = ""
    right_scope: str = ""
    certificate_number: str = ""
    obligor: str = ""
    common_collateral_land: str = ""
    common_collateral_building: str = ""
    other_notes: str = ""


@dataclass
class LandTranscript:
    """完整土地謄本解析結果"""
    meta: LandTranscriptMeta = field(default_factory=LandTranscriptMeta)
    land_description: Optional[LandDescription] = None
    ownership_records: list[LandOwnerRecord] = field(default_factory=list)
    other_right_records: list[LandOtherRightRecord] = field(default_factory=list)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _first(pattern: str, text: str, flags: int = 0) -> str:
    m = re.search(pattern, text, flags)
    return m.group(1).strip() if m else ""


def _clean(value: str) -> str:
    return re.sub(r"[\s*]+", " ", value).strip()


# ---------------------------------------------------------------------------
# Meta parser
# ---------------------------------------------------------------------------

def _parse_meta(header_text: str) -> LandTranscriptMeta:
    meta = LandTranscriptMeta()

    m = re.search(r"(土地登記第[^\n（(]+(?:[（(][^）)]+[）)])?)", header_text)
    if m:
        meta.transcript_name = _clean(m.group(1))

    m = re.search(r"([^\n]*\d{4}-\d{4}地號)", header_text)
    if m:
        meta.land_number = _clean(m.group(1))

    meta.print_time = _first(r"列印時間[：:]\s*(.+?)(?:\s{3,}|頁次)", header_text)
    meta.transcript_check_number = _first(r"([^\s]+電謄字第\S+號)", header_text)

    m = re.search(
        r"資料管轄機關[：:]\s*([^\s]+(?:地政事務所|登記處)).*?謄本核發機關[：:]\s*([^\s]+(?:地政事務所|登記處))",
        header_text,
    )
    if m:
        meta.data_authority = m.group(1).strip()
        meta.issuing_authority = m.group(2).strip()

    return meta


# ---------------------------------------------------------------------------
# 土地標示部 parser
# ---------------------------------------------------------------------------

def _parse_land_description(section: str) -> LandDescription:
    desc = LandDescription()

    desc.registration_date = _first(r"登記日期[：:]\s*([^\s]+(?:年\s*\d+月\s*\d+日)?)", section)
    desc.registration_reason = _first(r"登記原因[：:]\s*(\S+)", section)

    m = re.search(r"([^\s]+段(?:[^\s]+段)?)\s*(\d{4}-\d{4})\s*地號", section)
    if m:
        desc.land_section = m.group(1)
        desc.land_number = m.group(2)

    # 使用分區或地目
    desc.land_use_zone = _first(r"(?:使用分區|地目)[：:]\s*(\S+)", section)
    desc.area = _clean(_first(r"(?:地目)?面積[：:]\s*[\s*]*([\d,.]+)\s*平方公尺", section)) + " 平方公尺"
    desc.other_notes = _first(r"其他登記事項[：:]\s*([\s\S]+?)(?=\n\s*(?:\*{5,}|\Z))", section)

    return desc


# ---------------------------------------------------------------------------
# 土地所有權部 parser
# ---------------------------------------------------------------------------

def _parse_ownership_records(section: str) -> list[LandOwnerRecord]:
    record_texts = re.split(r"(?=\(\d{4}\)登記次序[：:])", section)
    records: list[LandOwnerRecord] = []

    for block in record_texts:
        if not re.search(r"\d{4}.{0,5}登記次序", block):
            continue
        rec = LandOwnerRecord()

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

        # Land-specific fields
        rec.current_declared_price = _first(r"當期申報地價[：:]\s*(.+?)(?:\n|$)", block)
        # 前次移轉現值 may span two lines: date on next line then price
        m_prev = re.search(
            r"前次移轉現值或原規定地價[：:]?\s*\n\s*(\S+年\S+月)\s*[\s*]*([\d,.]+元[^\n]*)",
            block,
        )
        if m_prev:
            rec.previous_transfer_value = f"{m_prev.group(1)} {_clean(m_prev.group(2))}"
        rec.historical_shares = _clean(_first(r"歷次取得權利範圍[：:]\s*([\d/分之\s*]+)", block))
        rec.related_other_rights = _first(r"相關他項權利登記次序[：:]\s*(.+?)(?:\n|$)", block)
        rec.other_notes = _first(r"其他登記事項[：:]\s*(.+?)(?=\n\s*\(|\Z)", block, re.DOTALL)

        records.append(rec)

    return records


# ---------------------------------------------------------------------------
# 土地他項權利部 parser  (reuses same pattern as building)
# ---------------------------------------------------------------------------

def _parse_other_rights(section: str) -> list[LandOtherRightRecord]:
    if "無他項權利資料" in section or not section.strip():
        return []

    record_texts = re.split(r"(?=\(\d{4}\)登記次序[：:])", section)
    records: list[LandOtherRightRecord] = []

    for block in record_texts:
        if not re.search(r"\d{4}.{0,5}登記次序", block):
            continue
        rec = LandOtherRightRecord()
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
    # Allow both Traditional Chinese 權 and Japanese kanji 権 variants,
    # plus cases where the section has no 標示部 and goes straight to 所有權部.
    "標示部": re.compile(r"\*{5,}\s*土地標示部\s*\*{5,}"),
    "所有權部": re.compile(r"\*{5,}\s*土地所有[權権权]部\s*\*{5,}"),
    "他項權利部": re.compile(r"\*{5,}\s*土地他項[權権权]利部\s*\*{5,}"),
}


def _split_sections(full_text: str) -> dict[str, str]:
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

def parse_land_transcript(raw_text: str) -> LandTranscript:
    """
    Parse a full land transcript text into structured data.

    Args:
        raw_text: Raw text extracted from a 土地謄本 PDF (all pages concatenated).

    Returns:
        LandTranscript dataclass with meta, land_description,
        ownership_records, and other_right_records.
    """
    text = normalize(raw_text)
    sections = _split_sections(text)

    result = LandTranscript()
    result.meta = _parse_meta(sections["header"] + sections.get("標示部", "")[:200])
    result.land_description = _parse_land_description(sections["標示部"])
    result.ownership_records = _parse_ownership_records(sections["所有權部"])
    result.other_right_records = _parse_other_rights(sections["他項權利部"])
    return result
