import importlib.util
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / 'convert_fp.py'
SPEC = importlib.util.spec_from_file_location('convert_fp', MODULE_PATH)
convert_fp = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
SPEC.loader.exec_module(convert_fp)


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
    def test_extract_text_from_fp_rejects_unsupported_finc_binary(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / 'legacy.fp'
            path.write_bytes(
                b'FINC' +
                bytes.fromhex('02000000040000004c000000') +
                (b'\x00' * 64)
            )

            with self.assertRaisesRegex(ValueError, 'Unsupported FINC'):
                convert_fp.extract_text_from_fp(path)

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