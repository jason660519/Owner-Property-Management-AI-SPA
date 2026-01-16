"""
Unit tests for field parsing rules

Testing pattern matching and extraction for:
- 地號 (Land register number)
- 建號 (Building register number)
- 面積 (Area with unit conversion)
- 權利人 (Owner information)
- 權利範圍 (Share ratio)

Following TDD approach:
1. Write failing tests first (Red)
2. Implement minimum code to pass (Green)
3. Refactor (Refactor)
"""

import pytest

# Will be implemented
from src.parser.field_parser import (
    AreaConverter,
    BuildNumberParser,
    DateParser,
    LandNumberParser,
    OwnerInfoParser,
    ShareRatioParser,
)


class TestLandNumberParser:
    """Test land register number parsing (地號)"""

    def test_parse_simple_land_number(self):
        """Parse simple land number format"""
        parser = LandNumberParser()

        text = "松山段一小段0000地號"
        result = parser.parse(text)

        assert result is not None
        assert "松山段一小段" in result
        assert "0000" in result

    def test_parse_land_number_with_dash(self):
        """Parse land number with dash separator (e.g., 0000-0000)"""
        parser = LandNumberParser()

        text = "大安段二小段1234-5678地號"
        result = parser.parse(text)

        assert result is not None
        assert "1234-5678" in result

    def test_parse_multiple_land_numbers(self):
        """Parse multiple land numbers from text"""
        parser = LandNumberParser()

        text = "坐落：松山段一小段0001地號、松山段一小段0002地號"
        results = parser.parse_multiple(text)

        assert len(results) >= 2
        assert any("0001" in r for r in results)
        assert any("0002" in r for r in results)

    def test_invalid_land_number(self):
        """Return None for invalid land number format"""
        parser = LandNumberParser()

        text = "這不是地號"
        result = parser.parse(text)

        assert result is None

    def test_extract_land_section(self):
        """Extract land section name (段名)"""
        parser = LandNumberParser()

        text = "松山段一小段0000地號"
        section = parser.extract_section(text)

        assert section == "松山段一小段"


class TestBuildNumberParser:
    """Test building register number parsing (建號)"""

    def test_parse_simple_build_number(self):
        """Parse simple building number format"""
        parser = BuildNumberParser()

        text = "松山建字第000000號"
        result = parser.parse(text)

        assert result is not None
        assert "松山建字第000000號" in result

    def test_parse_build_number_variants(self):
        """Parse different building number format variants"""
        parser = BuildNumberParser()

        # Format 1: 松山建字第000000號
        text1 = "松山建字第123456號"
        assert parser.parse(text1) is not None

        # Format 2: 大安建字第00000號 (shorter number)
        text2 = "大安建字第12345號"
        assert parser.parse(text2) is not None

    def test_extract_district_from_build_number(self):
        """Extract district name from building number"""
        parser = BuildNumberParser()

        text = "松山建字第000000號"
        district = parser.extract_district(text)

        assert district == "松山"

    def test_invalid_build_number(self):
        """Return None for invalid building number format"""
        parser = BuildNumberParser()

        text = "這不是建號"
        result = parser.parse(text)

        assert result is None


class TestAreaConverter:
    """Test area parsing and unit conversion"""

    def test_parse_square_meter(self):
        """Parse area in square meters"""
        converter = AreaConverter()

        text = "面積：84.32平方公尺"
        result = converter.parse(text)

        assert result is not None
        assert result["value"] == 84.32
        assert result["unit"] == "square_meter"

    def test_parse_ping(self):
        """Parse area in ping (坪)"""
        converter = AreaConverter()

        text = "面積：25.5坪"
        result = converter.parse(text)

        assert result is not None
        assert result["value"] == 25.5
        assert result["unit"] == "ping"

    def test_convert_square_meter_to_ping(self):
        """Convert square meters to ping"""
        converter = AreaConverter()

        # 1 坪 = 3.30579 平方公尺
        square_meters = 100.0
        ping = converter.to_ping(square_meters)

        assert abs(ping - 30.25) < 0.01  # 100 / 3.30579 ≈ 30.25

    def test_convert_ping_to_square_meter(self):
        """Convert ping to square meters"""
        converter = AreaConverter()

        # 1 坪 = 3.30579 平方公尺
        ping = 30.0
        square_meters = converter.to_square_meter(ping)

        assert abs(square_meters - 99.17) < 0.01  # 30 * 3.30579 ≈ 99.17

    def test_parse_area_with_parts(self):
        """Parse area summary with multiple parts"""
        converter = AreaConverter()

        text = """
        主建物面積：84.32平方公尺
        附屬建物：6.51平方公尺
        陽台：8.03平方公尺
        共有部分：24.11平方公尺
        合計：122.97平方公尺
        """

        result = converter.parse_summary(text)

        assert result is not None
        assert result["main_building"] == 84.32
        assert result["accessory_building"] == 6.51
        assert result["balcony"] == 8.03
        assert result["public_facilities"] == 24.11
        assert result["total"] == 122.97


class TestShareRatioParser:
    """Test share ratio parsing (權利範圍)"""

    def test_parse_full_ownership(self):
        """Parse full ownership (1/1)"""
        parser = ShareRatioParser()

        text = "權利範圍：全部"
        result = parser.parse(text)

        assert result == "1/1"

    def test_parse_fractional_ownership(self):
        """Parse fractional ownership"""
        parser = ShareRatioParser()

        # Format 1: 1/2
        text1 = "權利範圍：二分之一"
        result1 = parser.parse(text1)
        assert result1 == "1/2"

        # Format 2: 3/10
        text2 = "權利範圍：十分之三"
        result2 = parser.parse(text2)
        assert result2 == "3/10"

    def test_parse_numeric_ratio(self):
        """Parse numeric ratio format"""
        parser = ShareRatioParser()

        text = "權利範圍：1/2"
        result = parser.parse(text)

        assert result == "1/2"

    def test_validate_ratio_sum(self):
        """Validate that multiple ratios sum to 1"""
        parser = ShareRatioParser()

        ratios = ["1/2", "1/4", "1/4"]
        is_valid = parser.validate_sum(ratios)

        assert is_valid is True

    def test_invalid_ratio_sum(self):
        """Detect invalid ratio sum"""
        parser = ShareRatioParser()

        ratios = ["1/2", "1/2", "1/2"]  # Sums to 3/2
        is_valid = parser.validate_sum(ratios)

        assert is_valid is False


class TestOwnerInfoParser:
    """Test owner information parsing (權利人資訊)"""

    def test_parse_owner_name(self):
        """Parse owner name"""
        parser = OwnerInfoParser()

        text = "權利人：王大明"
        name = parser.parse_name(text)

        assert name == "王大明"

    def test_parse_id_number(self):
        """Parse and mask ID number"""
        parser = OwnerInfoParser()

        text = "統一編號：A123456789"
        masked = parser.parse_id_number(text, mask=True)

        assert "A123***789" in masked
        assert "456" not in masked

    def test_parse_address(self):
        """Parse owner address"""
        parser = OwnerInfoParser()

        text = "住址：臺北市松山區八德路四段200號"
        address = parser.parse_address(text)

        assert "臺北市" in address
        assert "松山區" in address

    def test_extract_owner_block(self):
        """Extract complete owner information block"""
        parser = OwnerInfoParser()

        text = """
        權利人：王大明
        統一編號：A123456789
        住址：臺北市松山區八德路四段200號
        權利範圍：全部
        登記日期：民國112年12月01日
        登記原因：繼承
        """

        result = parser.extract_block(text)

        assert result["name"] == "王大明"
        assert "A123***789" in result["id_number_masked"]
        assert "臺北市" in result["address"]
        assert result["share_ratio"] == "1/1"


class TestDateParser:
    """Test date parsing and format conversion"""

    def test_parse_roc_date(self):
        """Parse ROC (Taiwan) date format (民國年)"""
        parser = DateParser()

        text = "民國112年12月01日"
        result = parser.parse_roc(text)

        assert result == "2023-12-01"

    def test_parse_ad_date(self):
        """Parse AD (Western) date format"""
        parser = DateParser()

        text = "2023年12月01日"
        result = parser.parse_ad(text)

        assert result == "2023-12-01"

    def test_convert_roc_to_ad(self):
        """Convert ROC year to AD year"""
        parser = DateParser()

        roc_year = 112
        ad_year = parser.roc_to_ad(roc_year)

        assert ad_year == 2023  # 112 + 1911 = 2023

    def test_parse_date_variants(self):
        """Parse different date format variants"""
        parser = DateParser()

        # Format 1: 民國112年12月01日
        date1 = parser.parse("民國112年12月01日")
        assert date1 == "2023-12-01"

        # Format 2: 112.12.01
        date2 = parser.parse("112.12.01")
        assert date2 == "2023-12-01"

        # Format 3: 2023-12-01 (already standard)
        date3 = parser.parse("2023-12-01")
        assert date3 == "2023-12-01"


class TestFieldParserIntegration:
    """Integration tests for multiple field parsers"""

    def test_parse_complete_transcript_section(self):
        """Parse a complete section from transcript"""
        land_parser = LandNumberParser()
        build_parser = BuildNumberParser()
        area_parser = AreaConverter()

        text = """
        建物標示部
        建號：松山建字第000000號
        坐落地號：松山段一小段0000地號
        建物面積：
          主建物：84.32平方公尺
          附屬建物：6.51平方公尺
          陽台：8.03平方公尺
        """

        build_number = build_parser.parse(text)
        land_number = land_parser.parse(text)
        area = area_parser.parse_summary(text)

        assert build_number is not None
        assert land_number is not None
        assert area["main_building"] == 84.32

    def test_error_handling_for_malformed_text(self):
        """Gracefully handle malformed or missing data"""
        parser = LandNumberParser()

        # Empty text
        assert parser.parse("") is None

        # Malformed text
        assert parser.parse("亂碼文字 @#$%") is None

        # Partial match
        result = parser.parse("松山段")  # Missing lot number
        # Should either return None or partial result
        assert result is None or "松山段" in result
