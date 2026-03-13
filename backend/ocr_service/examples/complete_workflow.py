"""
Complete OCR Workflow Example

Demonstrates the full pipeline:
1. PDF Preprocessing
2. OCR Text Recognition (mock)
3. Field Parsing
4. Jason JSON Generation
"""

from datetime import datetime
from pathlib import Path

# Preprocessing
from src.preprocessor.pdf_preprocessor import PreprocessingPipeline

# Field Parsing
from src.parser.field_parser import (
    AreaConverter,
    BuildNumberParser,
    DateParser,
    LandNumberParser,
    OwnerInfoParser,
    ShareRatioParser,
)

# Data Models
from src.models.json_schema import (
    AreaSummary,
    AuditInfo,
    BasicInfo,
    BuildingProfile,
    FloorsInfo,
    Metadata,
    OCREngine,
    Ownership,
    Sections,
    TranscriptPayload,
)


def preprocess_pdf(pdf_path: Path, output_dir: Path) -> dict:
    """
    Step 1: Preprocess PDF to high-quality images

    Args:
        pdf_path: Path to input PDF
        output_dir: Directory for intermediate results

    Returns:
        Preprocessing result with image and metadata
    """
    print("=" * 60)
    print("Step 1: PDF Preprocessing")
    print("=" * 60)

    pipeline = PreprocessingPipeline(
        dpi=300, enhance=True, save_intermediate=True, output_dir=output_dir, track_performance=True
    )

    result = pipeline.process_page(pdf_path, page_num=0)

    print(f"✓ PDF rendered at {pipeline.dpi} DPI")
    print(f"✓ Image enhanced (denoise + deskew + contrast)")
    print(f"✓ Quality score: {result['quality_score']:.2f}")
    print(f"✓ Processing time: {result['metadata'].get('processing_time', 0):.2f}s")
    print()

    return result


def mock_ocr_recognition(image) -> str:
    """
    Step 2: OCR Text Recognition (MOCK)

    In production, this would call DeepSeek-OCR or another OCR engine

    Args:
        image: Preprocessed image

    Returns:
        Recognized text
    """
    print("=" * 60)
    print("Step 2: OCR Text Recognition (MOCK)")
    print("=" * 60)

    # Mock OCR text - in production this would be real OCR output
    mock_text = """
    臺北市松山地政事務所
    建物所有權狀謄本

    建號：松山建字第123456號
    坐落地號：松山段一小段0100地號

    建物標示部
    建物坐落：臺北市松山區八德路四段200號
    建物結構：鋼筋混凝土造
    主要用途：住家用
    層數：地上12層、地下0層
    建築完成日期：民國104年7月30日

    建物面積：
    主建物：84.32平方公尺
    附屬建物：6.51平方公尺
    陽台：8.03平方公尺
    共有部分：24.11平方公尺
    合計：122.97平方公尺

    所有權部
    權利人：王大明
    統一編號：A123456789
    住址：臺北市松山區八德路四段200號
    權利範圍：全部
    登記日期：民國112年12月01日
    登記原因：繼承
    """

    print(f"✓ OCR engine: DeepSeek-OCR (mock)")
    print(f"✓ Recognized text: {len(mock_text)} characters")
    print()

    return mock_text


def parse_fields(ocr_text: str) -> dict:
    """
    Step 3: Parse structured fields from OCR text

    Args:
        ocr_text: Raw OCR text

    Returns:
        Parsed fields dictionary
    """
    print("=" * 60)
    print("Step 3: Field Parsing")
    print("=" * 60)

    # Initialize parsers
    land_parser = LandNumberParser()
    build_parser = BuildNumberParser()
    area_converter = AreaConverter()
    date_parser = DateParser()
    owner_parser = OwnerInfoParser()
    share_parser = ShareRatioParser()

    # Parse fields
    parsed = {}

    # Building number
    build_number = build_parser.parse(ocr_text)
    parsed["build_number"] = build_number
    print(f"✓ Building number: {build_number}")

    # Land number
    land_number = land_parser.parse(ocr_text)
    parsed["land_numbers"] = [land_number] if land_number else []
    print(f"✓ Land number: {land_number}")

    # Area summary
    area_summary = area_converter.parse_summary(ocr_text)
    parsed["area_summary"] = area_summary
    if area_summary:
        print(f"✓ Total area: {area_summary.get('total', 0)} sqm")

    # Dates
    completion_date = date_parser.parse("民國104年7月30日")
    registration_date = date_parser.parse("民國112年12月01日")
    parsed["completion_date"] = completion_date
    parsed["registration_date"] = registration_date
    print(f"✓ Completion date: {completion_date}")
    print(f"✓ Registration date: {registration_date}")

    # Owner info
    owner_block = owner_parser.extract_block(ocr_text)
    parsed["owner"] = owner_block
    print(f"✓ Owner: {owner_block.get('name', 'N/A')}")
    print()

    return parsed


def generate_jason_json(parsed_fields: dict, source_file: str) -> TranscriptPayload:
    """
    Step 4: Generate Jason JSON payload

    Args:
        parsed_fields: Parsed field data
        source_file: Source PDF filename

    Returns:
        Complete TranscriptPayload
    """
    print("=" * 60)
    print("Step 4: Jason JSON Generation")
    print("=" * 60)

    # Build TranscriptPayload
    payload = TranscriptPayload(
        metadata=Metadata(
            document_id="123e4567-e89b-12d3-a456-426614174000",
            property_id="123e4567-e89b-12d3-a456-426614174001",
            source_file=source_file,
            processed_at=datetime.now(),
            ocr_engine=OCREngine(
                name="DeepSeek-OCR", version="v2025.12-mock", confidence=0.94
            ),
        ),
        register_office="臺北市松山地政事務所",
        document_type="建物所有權狀謄本",
        sections=Sections(
            basic=BasicInfo(
                build_register_number=parsed_fields.get("build_number", ""),
                land_register_numbers=parsed_fields.get("land_numbers", []),
                survey_date="2023-11-15",
                registration_date=parsed_fields.get("registration_date", "2023-12-01"),
                registration_reason="繼承",
            ),
            ownerships=[
                Ownership(
                    holder={
                        "name": parsed_fields["owner"]["name"],
                        "id_number_masked": parsed_fields["owner"]["id_number_masked"],
                        "address": parsed_fields["owner"]["address"],
                        "contact": None,
                    },
                    share_ratio=parsed_fields["owner"]["share_ratio"],
                    acquisition_reason="繼承",
                    acquisition_date=parsed_fields.get("registration_date", "2023-12-01"),
                )
            ],
            building_profile=BuildingProfile(
                location="臺北市松山區八德路四段200號",
                structure="鋼筋混凝土造",
                main_use="住家用",
                floors=FloorsInfo(above_ground=12, underground=0),
                completion_date=parsed_fields.get("completion_date", "2015-07-30"),
            ),
            area_summary=AreaSummary(
                units="square_meter",
                main_building=parsed_fields["area_summary"]["main_building"],
                accessory_building=parsed_fields["area_summary"]["accessory_building"],
                balcony=parsed_fields["area_summary"]["balcony"],
                public_facilities=parsed_fields["area_summary"]["public_facilities"],
                total=parsed_fields["area_summary"]["total"],
                converted_ping={"total": 37.2, "main_building": 25.5},
            ),
            encumbrances=[],
            raw_text="...",
            confidence_notes=[],
        ),
        audit=AuditInfo(
            processed_by="ocr_pipeline_v1", review_status="pending", checksum="sha256:..."
        ),
    )

    print("✓ Jason JSON payload generated")
    print(f"✓ Document ID: {payload.metadata.document_id}")
    print(f"✓ Property ID: {payload.metadata.property_id}")
    print(f"✓ OCR confidence: {payload.metadata.ocr_engine.confidence}")
    print()

    return payload


def main():
    """Run complete workflow"""
    print()
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 10 + "OCR Service Complete Workflow" + " " * 19 + "║")
    print("╚" + "=" * 58 + "╝")
    print()

    # Setup paths
    project_root = Path(__file__).parent.parent.parent.parent
    sample_pdf_dir = project_root / "resources" / "samples" / "建物謄本PDF範例"
    output_dir = Path(__file__).parent.parent / "data" / "output"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Get first sample PDF
    pdf_files = list(sample_pdf_dir.glob("*.pdf"))
    if not pdf_files:
        print("⚠️  No sample PDFs found in resources/samples/建物謄本PDF範例/")
        print("Please add PDF samples to continue.")
        return

    pdf_path = pdf_files[0]
    print(f"📄 Processing: {pdf_path.name}")
    print()

    # Step 1: Preprocess
    preprocess_result = preprocess_pdf(pdf_path, output_dir)

    # Step 2: OCR (mock)
    ocr_text = mock_ocr_recognition(preprocess_result["image"])

    # Step 3: Parse fields
    parsed_fields = parse_fields(ocr_text)

    # Step 4: Generate Jason JSON
    payload = generate_jason_json(parsed_fields, pdf_path.name)

    # Save result
    output_json = output_dir / f"{pdf_path.stem}_result.json"
    with open(output_json, "w", encoding="utf-8") as f:
        f.write(payload.model_dump_json(indent=2))

    print("=" * 60)
    print("✅ Workflow Complete!")
    print("=" * 60)
    print(f"📁 Preprocessed image: {output_dir / f'{pdf_path.stem}_page0.png'}")
    print(f"📁 Jason JSON result: {output_json}")
    print()


if __name__ == "__main__":
    main()
