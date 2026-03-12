import textwrap

from src.parser.building_transcript_parser import _parse_meta as parse_building_meta
from src.parser.land_transcript_parser import _parse_meta as parse_land_meta


def test_building_meta_parses_print_operator_and_numbers() -> None:
    header = textwrap.dedent(
        """
        建物登記第二類謄本(建號全部)
        大安區復興段二小段 01696-000建號
        列印時間：民國102年07月08日14時21分      頁次：1/2
        謄本列印人：王小明
        謄本檢查號：102AF007104REG03135F0D8C4F040059A60088EE802831
        大安電謄字第022949號
        資料管轄機關：大安地政事務所    謄本核發機關：大安地政事務所
        """
    )

    meta = parse_building_meta(header)

    assert meta.print_time.startswith("民國102年07月08日")
    assert meta.print_operator == "王小明"
    assert (
        meta.document_check_number
        == "102AF007104REG03135F0D8C4F040059A60088EE802831"
    )
    assert meta.transcript_check_number == "大安電謄字第022949號"


def test_land_meta_parses_print_operator_and_numbers() -> None:
    header = textwrap.dedent(
        """
        土地登記第二類謄本(所有權部)
        大安區大安段三小段 0049-0000地號
        列印時間: 民國112年01月02日09時30分      頁次：1/3
        列印人：李小華
        文件檢查碼：102AF006705REG0A2576B0A7DBC47979B11B77DF4B1E4FE
        大安電謄字第007105號
        資料管轄機關：大安地政事務所    謄本核發機關：大安地政事務所
        """
    )

    meta = parse_land_meta(header)

    assert meta.print_time.startswith("民國112年01月02日")
    assert meta.print_operator == "李小華"
    assert (
        meta.document_check_number
        == "102AF006705REG0A2576B0A7DBC47979B11B77DF4B1E4FE"
    )
    assert meta.transcript_check_number == "大安電謄字第007105號"

