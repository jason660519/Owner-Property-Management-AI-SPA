from src.parser.building_transcript_parser import parse_building_transcript
from src.parser.land_transcript_parser import parse_land_transcript


def test_building_transcript_without_other_rights_section_has_empty_other_right_records() -> None:
  raw = """
建物登記第二類謄本(建號全部)
大安區復興段二小段 01696-000建號
列印時間：民國102年07月08日14時21分      頁次：1/1
謄本列印人：願景不動產仲介股份有限公司
謄本檢查號：102AF007115REG03135F0D8C4F040059A60088EE8028AB
大安電謄字第007115號
資料管轄機關：大安地政事務所    謄本核發機關：大安地政事務所

************** 建物標示部 ****************
登記日期：民國102年07月08日
登記原因：買賣
建物門牌：臺北市大安區仁愛路四段345巷4弄25號
建物坐落地號：大安段二小段 0367-0000
主要用途：住家用
主要建材：鋼筋混凝土造
層數：007層 總面積：108.31平方公尺

************** 建物所有權部 **************
（0001）登記次序：0001
登記日期：民國102年07月08日
登記原因：買賣
原因發生日期：民國102年07月01日
所有權人：王小明
住址：臺北市大安區仁愛路四段XXX號
權利範圍：全部
權狀字號：102北大字第000001號
相關他項權利登記次序：無
其他登記事項：本件房屋無設定抵押權
"""

  result = parse_building_transcript(raw)

  assert result.other_right_records == []


def test_building_transcript_with_explicit_no_other_rights_text_returns_empty_list() -> None:
  raw = """
建物登記第二類謄本(建號全部)
大安區復興段二小段 01696-000建號

************** 建物標示部 ****************
（略）

************** 建物所有權部 **************
（略）

************** 建物他項權利部 *************
無他項權利資料
"""

  result = parse_building_transcript(raw)

  assert result.other_right_records == []


def test_land_transcript_without_other_rights_section_has_empty_other_right_records() -> None:
  raw = """
土地登記第二類謄本(所有權部)
大安區大安段三小段 0049-0000地號

************** 土地標示部 ****************
登記日期：民國112年01月02日
登記原因：第一次登記
地目：建(地)
面積：155.40平方公尺

************** 土地所有權部 **************
（0001）登記次序：0001
登記日期：民國112年01月02日
登記原因：買賣
原因發生日期：民國112年01月01日
所有權人：王小明
住址：臺北市大安區仁愛路四段XXX號
權利範圍：全部
權狀字號：112北大字第000001號
相關他項權利登記次序：無
其他登記事項：本件土地無設定任何他項權利
"""

  result = parse_land_transcript(raw)

  assert result.other_right_records == []


def test_land_transcript_with_explicit_no_other_rights_text_returns_empty_list() -> None:
  raw = """
土地登記第二類謄本(所有權部)
大安區大安段三小段 0049-0000地號

************** 土地標示部 ****************
（略）

************** 土地所有權部 **************
（略）

************** 土地他項權利部 *************
無他項權利資料
"""

  result = parse_land_transcript(raw)

  assert result.other_right_records == []

