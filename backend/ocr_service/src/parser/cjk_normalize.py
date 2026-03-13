"""
CJK Compatibility Character Normalizer for Taiwan Land Registry Transcripts (謄本).

Taiwan electronic transcripts (電子謄本) use CJK Compatibility Ideographs and
Enclosed CJK Letters/Months/Days extensively. This module maps them to standard
Traditional Chinese characters so regex patterns stay readable.

Reference: Unicode CJK Compatibility block U+3200–U+33FF
"""

# Enclosed / circled CJK characters used heavily in 地政電子謄本
# Full character inventory sourced from real 建物/土地 transcript PDFs.
_CJK_COMPAT_MAP: dict[str, str] = {
    # ── Parenthesized Chinese numerals ──────────────────────────────
    "㈠": "一",  # U+3220
    "㈡": "二",  # U+3221
    "㈢": "三",  # U+3222
    "㈣": "四",  # U+3223
    "㈤": "五",  # U+3224
    "㈥": "六",  # U+3225  (floor numbers e.g. 六樓)
    "㈦": "七",  # U+3226
    "㈧": "八",  # U+3227  (floor numbers e.g. 八樓)
    "㈨": "九",  # U+3228
    "㈩": "十",  # U+3229  (floor numbers e.g. 十一樓)
    # ── Parenthesized CJK ideographs ─────────────────────────────────
    "㈪": "月",  # U+322A  (month)
    "㈫": "火",  # U+322B
    "㈬": "水",  # U+322C
    "㈭": "木",  # U+322D
    "㈮": "金",  # U+322E  (appears in personal names e.g. 施金鳳)
    "㈯": "土",  # U+322F  (building material e.g. 鋼筋混凝土造)
    "㈰": "日",  # U+3230  (day)
    "㈱": "株",  # U+3231
    "㈲": "有",  # U+3232  (有限 in 股份有限公司)
    "㈳": "社",  # U+3233
    "㈴": "名",  # U+3234
    "㈵": "特",  # U+3235
    "㈶": "財",  # U+3236
    "㈷": "祝",  # U+3237
    "㈸": "労",  # U+3238
    "㈹": "代",  # U+3239
    "㈺": "呼",  # U+323A
    "㈻": "學",  # U+323B
    "㈼": "監",  # U+323C
    "㈽": "企",  # U+323D
    "㈾": "資",  # U+323E  (資料)
    "㈿": "合",  # U+323F
    "㉀": "勞",  # U+3240
    "㉁": "代",  # U+3241
    "㉂": "自",  # U+3242  (自行)
    "㉃": "至",  # U+3243  (可至)
    # ── Circled Chinese numerals ─────────────────────────────────────
    "㊀": "一",  # U+3280
    "㊁": "二",  # U+3281
    "㊂": "三",  # U+3282
    "㊃": "四",  # U+3283
    "㊄": "五",  # U+3284
    "㊅": "六",  # U+3285
    "㊆": "七",  # U+3286
    "㊇": "八",  # U+3287
    "㊈": "九",  # U+3288
    "㊉": "十",  # U+3289
    # ── Circled CJK ideographs ───────────────────────────────────────
    "㊊": "月",  # U+328A
    "㊋": "火",  # U+328B
    "㊌": "水",  # U+328C
    "㊍": "木",  # U+328D
    "㊎": "金",  # U+328E
    "㊏": "土",  # U+328F
    "㊐": "日",  # U+3290
    "㊑": "株",  # U+3291
    "㊒": "有",  # U+3292
    "㊓": "社",  # U+3293
    "㊔": "名",  # U+3294
    "㊕": "特",  # U+3295
    "㊖": "財",  # U+3296
    "㊗": "祝",  # U+3297
    "㊘": "労",  # U+3298
    "㊙": "秘",  # U+3299
    "㊚": "男",  # U+329A
    "㊛": "女",  # U+329B
    "㊜": "適",  # U+329C  (appears in personal names)
    "㊝": "優",  # U+329D
    "㊞": "印",  # U+329E  (列印)
    "㊟": "注",  # U+329F  (注意)
    "㊠": "項",  # U+32A0  (登記事項)
    "㊡": "休",  # U+32A1
    "㊢": "寫",  # U+32A2
    "㊣": "正",  # U+32A3
    "㊤": "上",  # U+32A4
    "㊥": "中",  # U+32A5
    "㊦": "下",  # U+32A6
    "㊧": "左",  # U+32A7
    "㊨": "右",  # U+32A8
    "㊩": "醫",  # U+32A9
    "㊪": "宗",  # U+32AA
    "㊫": "學",  # U+32AB
    "㊬": "監",  # U+32AC
    "㊭": "企",  # U+32AD
    "㊮": "資",  # U+32AE
    "㊯": "協",  # U+32AF
    "㊰": "夜",  # U+32B0
    # ── Small/superscript Chinese numerals (Kanbun / annotation) ─────
    "㆒": "一",  # U+3192
    "㆓": "二",  # U+3193
    "㆔": "三",  # U+3194
    "㆕": "四",  # U+3195
    "㆖": "上",  # U+3196
    "㆗": "中",  # U+3197  (台中市)
    "㆘": "下",  # U+3198
    "㆙": "甲",  # U+3199
    "㆚": "乙",  # U+319A
    "㆛": "丙",  # U+319B
    "㆜": "丁",  # U+319C
    "㆝": "天",  # U+319D
    "㆞": "地",  # U+319E  (地政 / 土地)
    "㆟": "人",  # U+319F  (所有權人)
    # ── Fullwidth digits → ASCII ──────────────────────────────────────
    "０": "0", "１": "1", "２": "2", "３": "3", "４": "4",
    "５": "5", "６": "6", "７": "7", "８": "8", "９": "9",
    # ── Fullwidth Latin uppercase ─────────────────────────────────────
    "Ａ": "A", "Ｂ": "B", "Ｃ": "C", "Ｄ": "D", "Ｅ": "E",
    "Ｆ": "F", "Ｇ": "G", "Ｈ": "H", "Ｉ": "I", "Ｊ": "J",
    "Ｋ": "K", "Ｌ": "L", "Ｍ": "M", "Ｎ": "N", "Ｏ": "O",
    "Ｐ": "P", "Ｑ": "Q", "Ｒ": "R", "Ｓ": "S", "Ｔ": "T",
    "Ｕ": "U", "Ｖ": "V", "Ｗ": "W", "Ｘ": "X", "Ｙ": "Y",
    "Ｚ": "Z",
    # ── Fullwidth punctuation / brackets ──────────────────────────────
    "（": "(", "）": ")",   # U+FF08, U+FF09
    "【": "[", "】": "]",   # U+3010, U+3011 (sometimes used around section names)
    "〔": "[", "〕": "]",   # U+3014, U+3015
    "〈": "<", "〉": ">",   # U+3008, U+3009
    "《": "<", "》": ">",   # U+300A, U+300B
    "，": ",",              # U+FF0C  fullwidth comma
    "。": ".",              # U+3002  ideographic full stop
    "、": ",",              # U+3001  ideographic comma
    "；": ";",              # U+FF1B  fullwidth semicolon
    "：": ":",              # U+FF1A  fullwidth colon  (regex already handles ：|: but normalize helps)
    "！": "!",              # U+FF01
    "？": "?",              # U+FF1F
    "‧": "·",              # U+2027  hyphenation point (appears in addresses)
    "—": "-",              # U+2014  em dash → hyphen
    "－": "-",              # U+FF0D  fullwidth hyphen-minus
    "＋": "+",              # U+FF0B
    "／": "/",              # U+FF0F  fullwidth solidus
    "＼": "\\",             # U+FF3C
    # ── Fullwidth Latin lowercase ──────────────────────────────────────
    "ａ": "a", "ｂ": "b", "ｃ": "c", "ｄ": "d", "ｅ": "e",
    "ｆ": "f", "ｇ": "g", "ｈ": "h", "ｉ": "i", "ｊ": "j",
    "ｋ": "k", "ｌ": "l", "ｍ": "m", "ｎ": "n", "ｏ": "o",
    "ｐ": "p", "ｑ": "q", "ｒ": "r", "ｓ": "s", "ｔ": "t",
    "ｕ": "u", "ｖ": "v", "ｗ": "w", "ｘ": "x", "ｙ": "y",
    "ｚ": "z",
    # ── CJK variant / Japanese kanji used in transcripts ─────────────
    # Some electronic transcript generators use Japanese-style CJK chars
    # instead of Traditional Chinese equivalents.
    "権": "權",  # U+6A29  (Japanese 権 → Traditional 權)
    "様": "樣",  # U+69D8  (Japanese 様 → Traditional 樣, appears in owner names)
    "応": "應",  # U+5FDC  (Japanese 応 → Traditional 應)
    "処": "處",  # U+51E6  (Japanese 処 → Traditional 處)
    "証": "證",  # U+8A3C  (Japanese 証 → Traditional 證, in 證明書)
    "覧": "覽",  # U+89A7  (Japanese 覧 → Traditional 覽)
    # Note: U+6743 (权 simplified Chinese) is handled by NFKC; not listed here.
}

# Build a single translation table for str.translate() — O(1) per character
_TRANS_TABLE = str.maketrans(_CJK_COMPAT_MAP)


def normalize(text: str) -> str:
    """
    Normalize CJK compatibility characters in land registry transcript text.

    Converts enclosed numerals, fullwidth digits, and common abbreviated
    Chinese characters back to their standard Traditional Chinese equivalents
    so that downstream regex patterns can be written directly in standard
    Chinese without worrying about variant encodings.

    Args:
        text: Raw text extracted from a 地政電子謄本 PDF.

    Returns:
        Normalized text with standard characters.
    """
    return text.translate(_TRANS_TABLE)
