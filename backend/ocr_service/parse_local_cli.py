"""
CLI entry point for local transcript parsing.
Called by the Next.js API route via child_process — no HTTP service required.

Usage (two modes):
  python3 parse_local_cli.py <document_id>
      Fetches the file from Supabase Storage (needs SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).

  python3 parse_local_cli.py --file <path>
      Parses a local file directly — no Supabase access needed.
      The caller (Next.js) is responsible for downloading the file beforehand.

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

from parser import extract_transcript, to_unified_output  # noqa: E402 (added after sys.path insert)


def _parse_file_and_output(file_path: str, document_id: str = '') -> None:
    """Parse a local PDF file and print the unified JSON result to stdout."""
    try:
        parsed = extract_transcript(file_path)
    except Exception as exc:
        print(json.dumps({'error': f'本地解析失敗：{exc}'}), flush=True)
        sys.exit(1)

    if parsed is None:
        print(json.dumps({'error': 'PDF 無可提取的文字層（可能是掃描影像），請改用雲端解析。'}), flush=True)
        sys.exit(2)

    unified = to_unified_output(parsed)
    output: dict = {'local_parse': True, **unified}
    if document_id:
        output['document_id'] = document_id
    print(json.dumps(output, ensure_ascii=False), flush=True)


def main() -> None:
    # ── Mode A: --file <path>  (no Supabase needed) ──────────────────────────
    if len(sys.argv) >= 3 and sys.argv[1] == '--file':
        _parse_file_and_output(sys.argv[2])
        return

    if len(sys.argv) < 2:
        print(json.dumps({'error': 'Usage: parse_local_cli.py <document_id>  OR  parse_local_cli.py --file <path>'}), flush=True)
        sys.exit(1)

    # ── Mode B: <document_id>  (downloads from Supabase) ────────────────────
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

    storage_path: str = result.data[0]['file_path']

    # 2. Download from Supabase Storage
    try:
        file_bytes: bytes = supabase.storage.from_('property-documents').download(storage_path)
    except Exception as exc:
        print(json.dumps({'error': f'無法從儲存空間下載文件：{exc}'}), flush=True)
        sys.exit(1)

    # 3. Write to temp file and parse via shared helper
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name
        _parse_file_and_output(tmp_path, document_id)
    finally:
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except Exception:
                pass


if __name__ == '__main__':
    main()
