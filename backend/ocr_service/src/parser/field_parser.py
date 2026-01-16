"""
Field Parser Module

Extracts and validates key fields from building title transcript OCR text:
- Land register numbers (地號)
- Building register numbers (建號)
- Area information with unit conversion (面積)
- Owner information (權利人)
- Share ratios (權利範圍)
- Dates (日期)
"""

import re
from fractions import Fraction
from typing import Dict, List, Optional


class LandNumberParser:
    """Parser for land register numbers (地號)"""

    # Pattern: [段名][數字-數字]地號
    PATTERN = r"([^\d\s]+段(?:[^\d\s]+段)?)\s*(\d+(?:-\d+)?)\s*地號"

    def parse(self, text: str) -> Optional[str]:
        """
        Parse single land register number from text

        Args:
            text: Text containing land number

        Returns:
            Formatted land number or None if not found
        """
        if not text:
            return None

        match = re.search(self.PATTERN, text)
        if match:
            section = match.group(1)
            number = match.group(2)
            return f"{section}{number}地號"

        return None

    def parse_multiple(self, text: str) -> List[str]:
        """
        Parse multiple land register numbers from text

        Args:
            text: Text containing multiple land numbers

        Returns:
            List of formatted land numbers
        """
        if not text:
            return []

        matches = re.finditer(self.PATTERN, text)
        results = []

        for match in matches:
            section = match.group(1)
            number = match.group(2)
            results.append(f"{section}{number}地號")

        return results

    def extract_section(self, text: str) -> Optional[str]:
        """
        Extract land section name (段名)

        Args:
            text: Text containing land number

        Returns:
            Section name or None
        """
        if not text:
            return None

        match = re.search(self.PATTERN, text)
        if match:
            return match.group(1)

        return None


class BuildNumberParser:
    """Parser for building register numbers (建號)"""

    # Pattern: [地區名]建字第[數字]號
    PATTERN = r"([^\d\s]+)建字第(\d+)號"

    def parse(self, text: str) -> Optional[str]:
        """
        Parse building register number from text

        Args:
            text: Text containing building number

        Returns:
            Formatted building number or None if not found
        """
        if not text:
            return None

        match = re.search(self.PATTERN, text)
        if match:
            district = match.group(1)
            number = match.group(2)
            return f"{district}建字第{number}號"

        return None

    def extract_district(self, text: str) -> Optional[str]:
        """
        Extract district name from building number

        Args:
            text: Text containing building number

        Returns:
            District name or None
        """
        if not text:
            return None

        match = re.search(self.PATTERN, text)
        if match:
            return match.group(1)

        return None


class AreaConverter:
    """Parser and converter for area measurements"""

    # Conversion constant: 1 坪 = 3.30579 平方公尺
    PING_TO_SQM = 3.30579

    # Patterns for different area mentions
    SQM_PATTERN = r"([\d.]+)\s*平方公[尺寸]"
    PING_PATTERN = r"([\d.]+)\s*坪"

    # Area parts patterns (flexible to match different variants)
    MAIN_BUILDING_PATTERN = r"主建物(?:面積)?[：:]\s*([\d.]+)"
    ACCESSORY_PATTERN = r"附屬建物[：:]\s*([\d.]+)"
    BALCONY_PATTERN = r"陽台[：:]\s*([\d.]+)"
    PUBLIC_PATTERN = r"共有部分[：:]\s*([\d.]+)"
    TOTAL_PATTERN = r"合計[：:]\s*([\d.]+)"

    def parse(self, text: str) -> Optional[Dict[str, any]]:
        """
        Parse area value and unit from text

        Args:
            text: Text containing area measurement

        Returns:
            Dict with 'value' and 'unit' or None
        """
        if not text:
            return None

        # Try square meters first
        sqm_match = re.search(self.SQM_PATTERN, text)
        if sqm_match:
            return {"value": float(sqm_match.group(1)), "unit": "square_meter"}

        # Try ping
        ping_match = re.search(self.PING_PATTERN, text)
        if ping_match:
            return {"value": float(ping_match.group(1)), "unit": "ping"}

        return None

    def to_ping(self, square_meters: float) -> float:
        """
        Convert square meters to ping

        Args:
            square_meters: Area in square meters

        Returns:
            Area in ping (坪)
        """
        return round(square_meters / self.PING_TO_SQM, 2)

    def to_square_meter(self, ping: float) -> float:
        """
        Convert ping to square meters

        Args:
            ping: Area in ping (坪)

        Returns:
            Area in square meters
        """
        return round(ping * self.PING_TO_SQM, 2)

    def parse_summary(self, text: str) -> Optional[Dict[str, float]]:
        """
        Parse area summary with multiple parts

        Args:
            text: Text containing area breakdown

        Returns:
            Dict with area parts or None
        """
        if not text:
            return None

        result = {}

        # Parse main building
        main_match = re.search(self.MAIN_BUILDING_PATTERN, text)
        if main_match:
            result["main_building"] = float(main_match.group(1))

        # Parse accessory building
        accessory_match = re.search(self.ACCESSORY_PATTERN, text)
        if accessory_match:
            result["accessory_building"] = float(accessory_match.group(1))

        # Parse balcony
        balcony_match = re.search(self.BALCONY_PATTERN, text)
        if balcony_match:
            result["balcony"] = float(balcony_match.group(1))

        # Parse public facilities
        public_match = re.search(self.PUBLIC_PATTERN, text)
        if public_match:
            result["public_facilities"] = float(public_match.group(1))

        # Parse total
        total_match = re.search(self.TOTAL_PATTERN, text)
        if total_match:
            result["total"] = float(total_match.group(1))

        return result if result else None


class ShareRatioParser:
    """Parser for ownership share ratios (權利範圍)"""

    # Pattern for numeric ratio: 1/2, 3/10, etc.
    NUMERIC_PATTERN = r"(\d+)\s*/\s*(\d+)"

    # Chinese fraction patterns
    CHINESE_FRACTIONS = {
        "全部": "1/1",
        "二分之一": "1/2",
        "三分之一": "1/3",
        "三分之二": "2/3",
        "四分之一": "1/4",
        "四分之三": "3/4",
        "五分之一": "1/5",
        "十分之一": "1/10",
        "十分之三": "3/10",
    }

    def parse(self, text: str) -> Optional[str]:
        """
        Parse share ratio from text

        Args:
            text: Text containing share ratio

        Returns:
            Ratio in format "numerator/denominator" or None
        """
        if not text:
            return None

        # Check for "全部" (full ownership)
        if "全部" in text:
            return "1/1"

        # Check Chinese fractions
        for chinese, ratio in self.CHINESE_FRACTIONS.items():
            if chinese in text:
                return ratio

        # Check numeric pattern
        match = re.search(self.NUMERIC_PATTERN, text)
        if match:
            numerator = match.group(1)
            denominator = match.group(2)
            return f"{numerator}/{denominator}"

        return None

    def validate_sum(self, ratios: List[str]) -> bool:
        """
        Validate that multiple ratios sum to 1

        Args:
            ratios: List of ratios in format "numerator/denominator"

        Returns:
            True if sum equals 1, False otherwise
        """
        try:
            total = sum(Fraction(ratio) for ratio in ratios)
            return total == 1
        except (ValueError, ZeroDivisionError):
            return False


class OwnerInfoParser:
    """Parser for owner information (權利人資訊)"""

    NAME_PATTERN = r"權利人[：:]\s*([^\n\s]+)"
    ID_PATTERN = r"統一編號[：:]\s*([A-Z0-9]+)"
    ADDRESS_PATTERN = r"住址[：:]\s*([^\n]+)"

    def parse_name(self, text: str) -> Optional[str]:
        """
        Parse owner name

        Args:
            text: Text containing owner name

        Returns:
            Owner name or None
        """
        if not text:
            return None

        match = re.search(self.NAME_PATTERN, text)
        if match:
            return match.group(1).strip()

        return None

    def parse_id_number(self, text: str, mask: bool = True) -> Optional[str]:
        """
        Parse and optionally mask ID number

        Args:
            text: Text containing ID number
            mask: Whether to mask middle digits

        Returns:
            ID number (masked if requested) or None
        """
        if not text:
            return None

        match = re.search(self.ID_PATTERN, text)
        if match:
            id_number = match.group(1)

            if mask and len(id_number) >= 10:
                # Mask middle digits: A123456789 -> A123***789
                return f"{id_number[:4]}***{id_number[-3:]}"

            return id_number

        return None

    def parse_address(self, text: str) -> Optional[str]:
        """
        Parse owner address

        Args:
            text: Text containing address

        Returns:
            Address or None
        """
        if not text:
            return None

        match = re.search(self.ADDRESS_PATTERN, text)
        if match:
            return match.group(1).strip()

        return None

    def extract_block(self, text: str) -> Dict[str, Optional[str]]:
        """
        Extract complete owner information block

        Args:
            text: Text containing owner information

        Returns:
            Dict with owner details
        """
        ratio_parser = ShareRatioParser()

        return {
            "name": self.parse_name(text),
            "id_number_masked": self.parse_id_number(text, mask=True),
            "address": self.parse_address(text),
            "share_ratio": ratio_parser.parse(text),
        }


class DateParser:
    """Parser for date formats including ROC (Taiwan) dates"""

    # ROC date pattern: 民國112年12月01日
    ROC_PATTERN = r"民國(\d+)年(\d+)月(\d+)日"

    # AD date pattern: 2023年12月01日
    AD_PATTERN = r"(\d{4})年(\d+)月(\d+)日"

    # Dot format: 112.12.01
    DOT_PATTERN = r"(\d{2,3})\.(\d{1,2})\.(\d{1,2})"

    # Standard format: 2023-12-01
    ISO_PATTERN = r"(\d{4})-(\d{2})-(\d{2})"

    def parse_roc(self, text: str) -> Optional[str]:
        """
        Parse ROC (Taiwan) date format

        Args:
            text: Text containing ROC date

        Returns:
            Date in ISO format (YYYY-MM-DD) or None
        """
        if not text:
            return None

        match = re.search(self.ROC_PATTERN, text)
        if match:
            roc_year = int(match.group(1))
            month = int(match.group(2))
            day = int(match.group(3))

            ad_year = self.roc_to_ad(roc_year)
            return f"{ad_year:04d}-{month:02d}-{day:02d}"

        return None

    def parse_ad(self, text: str) -> Optional[str]:
        """
        Parse AD (Western) date format

        Args:
            text: Text containing AD date

        Returns:
            Date in ISO format (YYYY-MM-DD) or None
        """
        if not text:
            return None

        match = re.search(self.AD_PATTERN, text)
        if match:
            year = int(match.group(1))
            month = int(match.group(2))
            day = int(match.group(3))

            return f"{year:04d}-{month:02d}-{day:02d}"

        return None

    def roc_to_ad(self, roc_year: int) -> int:
        """
        Convert ROC year to AD year

        Args:
            roc_year: ROC (Taiwan) year

        Returns:
            AD year
        """
        return roc_year + 1911

    def parse(self, text: str) -> Optional[str]:
        """
        Parse date in any supported format

        Args:
            text: Text containing date

        Returns:
            Date in ISO format (YYYY-MM-DD) or None
        """
        if not text:
            return None

        # Try ISO format first
        iso_match = re.search(self.ISO_PATTERN, text)
        if iso_match:
            return text

        # Try ROC format
        roc_date = self.parse_roc(text)
        if roc_date:
            return roc_date

        # Try AD format
        ad_date = self.parse_ad(text)
        if ad_date:
            return ad_date

        # Try dot format (assume ROC)
        dot_match = re.search(self.DOT_PATTERN, text)
        if dot_match:
            year = int(dot_match.group(1))
            month = int(dot_match.group(2))
            day = int(dot_match.group(3))

            # If year is 2-3 digits, assume ROC
            if year < 200:
                ad_year = self.roc_to_ad(year)
                return f"{ad_year:04d}-{month:02d}-{day:02d}"

        return None
