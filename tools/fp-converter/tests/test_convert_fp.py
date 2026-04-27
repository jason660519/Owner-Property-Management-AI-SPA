import importlib.util
import struct
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / 'convert_fp.py'
SPEC = importlib.util.spec_from_file_location('convert_fp', MODULE_PATH)
convert_fp = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(convert_fp)

# Real legacy FINC sample fixtures shipped in the repo.
# These files use FINC v2 with header_end=60 and per-page zlib raw deflate
# payloads — i.e. the format that this converter supports as of 2026-04-27.
REPO_ROOT = Path(__file__).resolve().parents[3]
LEGACY_FINC_FIXTURE_A = (
    REPO_ROOT
    / 'resources/samples/新謄本/97~100年度/9703/9703-226_忠孝東路4段17巷4號.fp'
)
LEGACY_FINC_FIXTURE_B = (
    REPO_ROOT
    / 'resources/samples/新謄本/97~100年度/星巴克/龍門門市-忠孝東路4段134號.fp'
)
NORMAL_FINC_FIXTURE = (
    REPO_ROOT
    / 'resources/samples/新謄本/10105-001-內江街39號-仁瑋-OK.fp'
)


INDEX_TOKENS = [
    '第 ',
    '1 ',
    '/ ',
    '1 ',
    '頁',
    '臺北市光特版地政電傳資訊系統',
    '列印日期',
    ':',
    '101',
    '年',
    '3',
    '月',
    '22',
    '日 ',
    '17',
    ':',
    '16',
    '異動索引查詢',
    '地段 ',
    ': ',
    '仁愛段六小段                               地',
    '/',
    '建號 ',
    ':',
    '03000',
    '-',
    '000 ',
    '序號 ',
    ': ',
    '0',
    '部別 ',
    ': ',
    'E',
    '建物所有權部                              異動別 ',
    ': ',
    '上線轉檔註記',
    '登記日期 ',
    ': ',
    '民國',
    '076',
    '年',
    '04',
    '月',
    '22',
    '日                      登記次序 ',
    ': ',
    '0001',
    '登記原因 ',
    ': ',
    '買賣                                   收件字號 ',
    ': ',
    '076',
    '年字',
    '171710',
    '號',
    '異動日期 ',
    ': ',
    '民國',
    '000',
    '年',
    '00',
    '月',
    '00',
    '日                      權利人 ',
    ': ',
    '張桂柯',
]


class ConvertFpParsingTests(unittest.TestCase):
    def test_extract_text_from_fp_rejects_truly_unsupported_finc_binary(self) -> None:
        # Synthetic FINC header with no usable payload — no 0x1E records, and
        # no valid zlib-deflate page descriptors — should still raise.
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / 'legacy.fp'
            path.write_bytes(
                b'FINC' +
                bytes.fromhex('02000000040000004c000000') +
                (b'\x00' * 64)
            )

            with self.assertRaisesRegex(ValueError, 'Unsupported FINC'):
                convert_fp.extract_text_from_fp(path)

    def test_extract_text_from_fp_decompresses_legacy_finc_pages(self) -> None:
        # Real legacy FINC v2 fixture with header_end=60 and 3 zlib-compressed
        # pages. The previous parser produced 0 tokens for this file, leaving
        # the web UI's PDF output with only a header line ("only the address").
        # The new parser must decompress each page and surface the standard
        # 標示部 / 所有權部 / 他項權利部 sections with their fields.
        if not LEGACY_FINC_FIXTURE_A.exists():
            self.skipTest(f'Legacy fixture not found: {LEGACY_FINC_FIXTURE_A}')

        tokens = convert_fp.extract_text_from_fp(LEGACY_FINC_FIXTURE_A)
        self.assertGreater(len(tokens), 100, 'legacy FINC should yield rich token list')

        doc = convert_fp._parse_doc_structure(tokens)
        section_names = [s['name'] for s in doc['sections']]
        for required in ('建物標示部', '建物所有權部', '建物他項權利部'):
            self.assertIn(required, section_names, f'missing section {required}')

        # Each section must carry at least one parsed field — otherwise the
        # PDF/HTML/Markdown writers would render an empty section, reproducing
        # the original "only-address" symptom.
        for sec in doc['sections']:
            self.assertGreater(
                len(sec['fields']), 0, f'section {sec["name"]} must have fields',
            )

    def test_build_markdown_for_legacy_finc_includes_all_sections(self) -> None:
        if not LEGACY_FINC_FIXTURE_B.exists():
            self.skipTest(f'Legacy fixture not found: {LEGACY_FINC_FIXTURE_B}')

        tokens = convert_fp.extract_text_from_fp(LEGACY_FINC_FIXTURE_B)
        markdown = convert_fp.build_markdown(LEGACY_FINC_FIXTURE_B.name, tokens)

        for required in ('## 建物標示部', '## 建物所有權部', '## 建物他項權利部'):
            self.assertIn(required, markdown)
        # Sanity: at least a couple of canonical labels surface as bullets.
        self.assertIn('- **登記日期**：', markdown)
        self.assertIn('- **登記原因**：', markdown)

    def test_legacy_finc_with_no_text_records_returns_placeholder(self) -> None:
        # Some legacy FINC files (most often 建物測量成果圖 / vector survey
        # diagrams, plus a long-tail of older "FINE"-nested variants) decompress
        # cleanly but contain no 0x1E text records. Returning [] there would
        # cause the writers to render an empty-bodied PDF, reproducing the
        # original "only the address" symptom. Instead the parser surfaces a
        # single placeholder token so the rendered PDF carries an explicit
        # human-readable note.
        # Build a synthetic 1-page legacy FINC file whose decompressed payload
        # contains zero 0x1E opcodes, only padding bytes.
        import zlib
        empty_payload = b'\x00' * 256
        compressed = zlib.compress(empty_payload, 9)
        # zlib.compress returns wbits=15 (with header) but our parser expects
        # raw deflate (wbits=-15). Strip the 2-byte zlib header and 4-byte
        # adler32 trailer to convert.
        raw_deflate = compressed[2:-4]

        page_count = 1
        header_size = 12 + page_count * 16  # 28 bytes
        descriptor = struct.pack(
            '<IIII',
            header_size,           # offset_in_file
            2,                     # type
            len(raw_deflate),      # compressed size
            len(empty_payload),    # uncompressed size
        )
        payload = (
            b'FINC'
            + struct.pack('<II', 2, page_count)
            + descriptor
            + raw_deflate
        )

        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / 'survey-diagram.fp'
            path.write_bytes(payload)

            tokens = convert_fp.extract_text_from_fp(path)
            self.assertEqual(len(tokens), 1)
            self.assertIn('FinePrint 檔案不含可擷取的文字內容', tokens[0])

            # Markdown / HTML writers must still produce non-empty output and
            # surface the placeholder note, so the user sees an explanation
            # rather than an empty 'only address' page.
            md = convert_fp.build_markdown(path.name, tokens)
            self.assertIn('FinePrint 檔案不含可擷取的文字內容', md)
            html = convert_fp.build_html(path.name, tokens)
            self.assertIn('FinePrint 檔案不含可擷取的文字內容', html)

    def test_normal_finc_files_still_parse_after_legacy_support(self) -> None:
        # Regression guard: adding legacy decompression must not change the
        # output for canonical post-2012 .fp files.
        if not NORMAL_FINC_FIXTURE.exists():
            self.skipTest(f'Normal fixture not found: {NORMAL_FINC_FIXTURE}')

        tokens = convert_fp.extract_text_from_fp(NORMAL_FINC_FIXTURE)
        doc = convert_fp._parse_doc_structure(tokens)
        section_names = [s['name'] for s in doc['sections']]
        self.assertIn('建物標示部', section_names)
        self.assertIn('建物所有權部', section_names)
        # Every section must still carry fields.
        for sec in doc['sections']:
            self.assertGreater(len(sec['fields']), 0)

    def test_parse_doc_structure_falls_back_for_index_style_documents(self) -> None:
        doc = convert_fp._parse_doc_structure(INDEX_TOKENS)

        self.assertGreaterEqual(len(doc['sections']), 1)
        self.assertEqual(doc['sections'][0]['name'], '建物所有權部')
        self.assertIn(('異動別', '上線轉檔註記'), doc['sections'][0]['fields'])
        self.assertIn(('登記日期', '民國076年04月22日'), doc['sections'][0]['fields'])
        self.assertIn(('異動日期', '民國000年00月00日'), doc['sections'][0]['fields'])
        self.assertIn(('權利人', '張桂柯'), doc['sections'][0]['fields'])

    def test_build_markdown_renders_fields_for_index_style_documents(self) -> None:
        markdown = convert_fp.build_markdown('10103-186;敦化南路1段161巷69弄5號-智維-OK.fp', INDEX_TOKENS)

        self.assertIn('## 建物所有權部', markdown)
        self.assertIn('- **異動別**：上線轉檔註記', markdown)
        self.assertIn('- **異動日期**：民國000年00月00日', markdown)
        self.assertIn('- **權利人**：張桂柯', markdown)

    def test_collect_fp_files_is_case_insensitive_and_recursive(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            lower = root / 'a.fp'
            upper = root / 'b.FP'
            nested = root / 'nested' / 'c.Fp'
            deep = root / 'nested' / 'deep' / 'd.fp'
            nested.parent.mkdir()
            deep.parent.mkdir()
            for path in (lower, upper, nested, deep):
                path.write_bytes(b'FINC')

            files = convert_fp.collect_fp_files(root)

            self.assertEqual([path.name for path in files], ['a.fp', 'b.FP', 'c.Fp', 'd.fp'])


if __name__ == '__main__':
    unittest.main()