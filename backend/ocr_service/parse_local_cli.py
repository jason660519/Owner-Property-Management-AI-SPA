"""
CLI entry point for local transcript parsing.
Called by the Next.js API route via child_process — no HTTP service required.

Usage:
  python3 parse_local_cli.py <document_id>

Output:
  Prints a single-line JSON to stdout.
  Exits 0 on success, 1 on error, 2 if the PDF has no text layer.
"""

import json
import os
import sys
import tempfile

# Allow imports from src/ regardless of cwd
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from supabase import create_client
from parser import extract_transcript, to_unified_output  # noqa: E402 (added after sys.path insert)


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Missing document_id argument'}), flush=True)
        sys.exit(1)

    document_id = sys.argv[1]

    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    if not supabase_url or not supabase_key:
        print(json.dumps({'error': 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 環境變數未設定'}), flush=True)
        sys.exit(1)

    supabase = create_client(supabase_url, supabase_key)

    # 1. Fetch document record (no is_active filter — compatible with all table schemas)
    result = supabase.table('property_documents').select('id, file_path').eq('id', document_id).execute()
    if not result.data:
        print(json.dumps({'error': '找不到該文件（document_id 無效或文件已刪除）'}), flush=True)
        sys.exit(1)

    file_path: str = result.data[0]['file_path']

    # 2. Download from Supabase Storage
    try:
        file_bytes: bytes = supabase.storage.from_('property-documents').download(file_path)
    except Exception as exc:
        print(json.dumps({'error': f'無法從儲存空間下載文件：{exc}'}), flush=True)
        sys.exit(1)

    # 3. Write to temp file and parse
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        parsed = extract_transcript(tmp_path)
    except Exception as exc:
        print(json.dumps({'error': f'本地解析失敗：{exc}'}), flush=True)
        sys.exit(1)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass

    if parsed is None:
        print(json.dumps({'error': 'PDF 無可提取的文字層（可能是掃描影像），請改用雲端解析。'}), flush=True)
        sys.exit(2)

    # Convert to the TranscriptParseOutput unified schema (mirrors TS interface).
    # field_confidences is included so the caller can join the consensus pipeline.
    unified = to_unified_output(parsed)
    output = {
        'document_id': document_id,
        'local_parse': True,   # sentinel so callers know this is a local-regex result
        **unified,
    }
    print(json.dumps(output, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    main()
