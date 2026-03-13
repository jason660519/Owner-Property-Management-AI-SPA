"""
Converts BuildingTranscript / LandTranscript dataclasses to the
TranscriptParseOutput JSON schema consumed by the TypeScript frontend.

Output shape mirrors TranscriptParseOutput (apps/superadmin/lib/types/transcript.ts):
{
  "kind": "building" | "land",
  "buildingTranscript": { header, description, ownership, encumbrances },
  "landTranscript": { header, description, ownership, encumbrances },
  "field_confidences": { "dot.path": 0.0–1.0, ... }
}

field_confidences: 1.0 = regex matched non-empty value, 0.0 = empty (unmatched).
"""

import uuid
from typing import Union

from .building_transcript_parser import BuildingTranscript
from .land_transcript_parser import LandTranscript


def _uid() -> str:
    return str(uuid.uuid4())


def _conf(value: str) -> float:
    """Return 1.0 if value is non-empty, else 0.0."""
    return 1.0 if value.strip() else 0.0


# ---------------------------------------------------------------------------
# Empty schema stubs (used for the "other" kind in a mixed output)
# ---------------------------------------------------------------------------

_EMPTY_HEADER = {
    "transcriptType": "", "documentTitle": "", "printTime": "",
    "pageInfo": "", "printer": "", "checkNumber": "",
    "documentNumber": "", "dataJurisdiction": "", "issuingAuthority": "",
    "transcriptNotes": "",
}

_EMPTY_BUILDING_DESC = {
    "buildingNumber": "", "regDate": "", "regReason": "", "doorAddress": "",
    "landParcelNumber": "", "mainUse": "", "mainMaterial": "", "totalFloors": "",
    "totalArea": "", "floorLevel": "", "floorArea": "", "completionDate": "",
    "annexedBuildings": [], "commonAreas": [], "notes": "",
}

_EMPTY_LAND_DESC = {
    "landNumber": "", "regDate": "", "regReason": "", "landCategory": "",
    "grade": "", "area": "", "useZone": "", "useCategory": "",
    "announcedValueYear": "", "announcedValuePerSqm": "",
    "buildingsOnLand": "", "notes": "",
}

_EMPTY_BUILDING = {
    "header": _EMPTY_HEADER,
    "description": _EMPTY_BUILDING_DESC,
    "ownership": [],
    "encumbrances": [],
}

_EMPTY_LAND = {
    "header": _EMPTY_HEADER,
    "description": _EMPTY_LAND_DESC,
    "ownership": [],
    "encumbrances": [],
}


# ---------------------------------------------------------------------------
# Shared encumbrance converter (building and land use the same TS type)
# ---------------------------------------------------------------------------

def _encumbrance_from_right_record(rec) -> dict:
    return {
        "id": _uid(),
        "seq": rec.sequence,
        "encumbranceType": rec.right_type or "抵押權",
        "receiptDate": rec.receipt_date,
        "receiptNumber": rec.receipt_number,
        "regDate": rec.registration_date,
        "regReason": rec.registration_reason or "設定",
        "creditorName": rec.right_holder,
        "creditorAddress": rec.right_holder_address,
        "debtRatio": rec.debt_ratio,
        "totalDebt": rec.total_secured_debt,
        "duration": rec.duration,
        "repaymentDate": rec.repayment_date,
        "interest": rec.interest_rate,
        "lateInterest": rec.default_interest_rate,
        "penalty": rec.penalty,
        "debtorAndRatio": rec.debtor_ratio,
        "rightsSubject": rec.right_subject,
        "targetSeq": rec.subject_sequence,
        "settleRightsRatio": rec.right_scope,
        "certNumber": rec.certificate_number,
        "settlor": rec.obligor,
        "jointGuaranteeLandNumbers": rec.common_collateral_land,
        "jointGuaranteeBuildingNumbers": rec.common_collateral_building,
        "notes": rec.other_notes,
        "debtScope": "",
        "debtConfirmDate": "",
        "otherGuaranteeScope": "",
    }


# ---------------------------------------------------------------------------
# Building transcript → unified schema
# ---------------------------------------------------------------------------

def _building_to_unified(t: BuildingTranscript) -> tuple[dict, dict[str, float]]:
    """Returns (buildingTranscript schema dict, field_confidences)."""
    confidences: dict[str, float] = {}
    meta = t.meta
    desc = t.building_description

    def c(path: str, val: str) -> str:
        confidences[path] = _conf(val)
        return val

    header = {
        "transcriptType":   c("buildingTranscript.header.transcriptType",   meta.transcript_name),
        "documentTitle":    c("buildingTranscript.header.documentTitle",    meta.building_number),
        "printTime":        c("buildingTranscript.header.printTime",        meta.print_time),
        "pageInfo": "",
        "printer": "",
        "checkNumber": "",
        "documentNumber":   c("buildingTranscript.header.documentNumber",   meta.transcript_check_number),
        "dataJurisdiction": c("buildingTranscript.header.dataJurisdiction", meta.data_authority),
        "issuingAuthority": c("buildingTranscript.header.issuingAuthority", meta.issuing_authority),
        "transcriptNotes": "",
    }

    if desc:
        first_floor = desc.floor_levels[0] if desc.floor_levels else {}
        description = {
            "buildingNumber":  c("buildingTranscript.description.buildingNumber",  meta.building_number),
            "regDate":         c("buildingTranscript.description.regDate",         desc.registration_date),
            "regReason":       c("buildingTranscript.description.regReason",       desc.registration_reason),
            "doorAddress":     c("buildingTranscript.description.doorAddress",     desc.door_number),
            "landParcelNumber":c("buildingTranscript.description.landParcelNumber",desc.land_number),
            "mainUse":         c("buildingTranscript.description.mainUse",         desc.primary_use),
            "mainMaterial":    c("buildingTranscript.description.mainMaterial",    desc.primary_material),
            "totalFloors":     c("buildingTranscript.description.totalFloors",     desc.floors),
            "totalArea":       c("buildingTranscript.description.totalArea",       desc.total_area),
            "floorLevel":      c("buildingTranscript.description.floorLevel",      str(first_floor.get("層次", ""))),
            "floorArea":       c("buildingTranscript.description.floorArea",       str(first_floor.get("面積", ""))),
            "completionDate":  c("buildingTranscript.description.completionDate",  desc.completion_date),
            "annexedBuildings": [
                {"use": s.get("用途", ""), "area": s.get("面積", "")}
                for s in desc.attached_structures
            ],
            "commonAreas": [
                {
                    "buildingNumber": s.get("建號", ""),
                    "area": s.get("面積", ""),
                    "ratio": s.get("權利範圍", ""),
                }
                for s in desc.common_areas
            ],
            "notes": c("buildingTranscript.description.notes", desc.other_notes),
        }
    else:
        description = dict(_EMPTY_BUILDING_DESC)

    ownership = [
        {
            "id": _uid(),
            "seq": rec.sequence,
            "regDate": rec.registration_date,
            "regReason": rec.registration_reason,
            "causeDate": rec.reason_date,
            "ownerName": rec.owner_name,
            "ownerAddress": rec.owner_address,
            "ownershipRatio": rec.share,
            "titleNumber": rec.certificate_number,
            "relatedEncumbranceSeq": rec.related_other_rights,
            "notes": rec.other_notes,
        }
        for rec in t.ownership_records
    ]
    confidences["buildingTranscript.ownership"] = 1.0 if ownership else 0.0

    encumbrances = [_encumbrance_from_right_record(r) for r in t.other_right_records]
    confidences["buildingTranscript.encumbrances"] = 1.0 if encumbrances else 0.5

    schema = {
        "header": header,
        "description": description,
        "ownership": ownership,
        "encumbrances": encumbrances,
    }
    return schema, confidences


# ---------------------------------------------------------------------------
# Land transcript → unified schema
# ---------------------------------------------------------------------------

def _land_to_unified(t: LandTranscript) -> tuple[dict, dict[str, float]]:
    """Returns (landTranscript schema dict, field_confidences)."""
    confidences: dict[str, float] = {}
    meta = t.meta
    desc = t.land_description

    def c(path: str, val: str) -> str:
        confidences[path] = _conf(val)
        return val

    header = {
        "transcriptType":   c("landTranscript.header.transcriptType",   meta.transcript_name),
        "documentTitle":    c("landTranscript.header.documentTitle",    meta.land_number),
        "printTime":        c("landTranscript.header.printTime",        meta.print_time),
        "pageInfo": "",
        "printer": "",
        "checkNumber": "",
        "documentNumber":   c("landTranscript.header.documentNumber",   meta.transcript_check_number),
        "dataJurisdiction": c("landTranscript.header.dataJurisdiction", meta.data_authority),
        "issuingAuthority": c("landTranscript.header.issuingAuthority", meta.issuing_authority),
        "transcriptNotes": "",
    }

    if desc:
        description = {
            "landNumber":           c("landTranscript.description.landNumber",           desc.land_number or meta.land_number),
            "regDate":              c("landTranscript.description.regDate",              desc.registration_date),
            "regReason":            c("landTranscript.description.regReason",            desc.registration_reason),
            "landCategory": "",
            "grade": "",
            "area":                 c("landTranscript.description.area",                 desc.area),
            "useZone":              c("landTranscript.description.useZone",              desc.land_use_zone),
            "useCategory": "",
            "announcedValueYear": "",
            "announcedValuePerSqm": "",
            "buildingsOnLand": "",
            "notes":                c("landTranscript.description.notes",                desc.other_notes),
        }
    else:
        description = dict(_EMPTY_LAND_DESC)

    # LandOwnershipRecord extends OwnershipRecord with extra land-value fields
    ownership = [
        {
            "id": _uid(),
            "seq": rec.sequence,
            "regDate": rec.registration_date,
            "regReason": rec.registration_reason,
            "causeDate": rec.reason_date,
            "ownerName": rec.owner_name,
            "ownerAddress": rec.owner_address,
            "ownershipRatio": rec.share,
            "titleNumber": rec.certificate_number,
            "relatedEncumbranceSeq": rec.related_other_rights,
            "notes": rec.other_notes,
            "currentDeclaredLandValueYear": "",
            "currentDeclaredLandValuePerSqm": rec.current_declared_price,
            "prevTransferValueYear": "",
            "prevTransferValuePerSqm": rec.previous_transfer_value,
            "historicalRatios": rec.historical_shares,
        }
        for rec in t.ownership_records
    ]
    confidences["landTranscript.ownership"] = 1.0 if ownership else 0.0

    encumbrances = [_encumbrance_from_right_record(r) for r in t.other_right_records]
    confidences["landTranscript.encumbrances"] = 1.0 if encumbrances else 0.5

    schema = {
        "header": header,
        "description": description,
        "ownership": ownership,
        "encumbrances": encumbrances,
    }
    return schema, confidences


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def to_unified_output(parsed: Union[BuildingTranscript, LandTranscript]) -> dict:
    """
    Convert a BuildingTranscript or LandTranscript dataclass into the
    TranscriptParseOutput JSON format expected by the TypeScript frontend,
    including per-field confidence scores (P1.2).

    Returns a dict with keys:
      kind              - "building" | "land"
      buildingTranscript - BuildingTranscriptData-shaped dict
      landTranscript    - LandTranscriptData-shaped dict
      field_confidences - { "dot.path": 0.0–1.0, ... }
    """
    if isinstance(parsed, BuildingTranscript):
        building_schema, field_confidences = _building_to_unified(parsed)
        return {
            "kind": "building",
            "buildingTranscript": building_schema,
            "landTranscript": dict(_EMPTY_LAND),
            "field_confidences": field_confidences,
        }
    else:
        land_schema, field_confidences = _land_to_unified(parsed)
        return {
            "kind": "land",
            "buildingTranscript": dict(_EMPTY_BUILDING),
            "landTranscript": land_schema,
            "field_confidences": field_confidences,
        }
