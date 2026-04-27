#!/usr/bin/env bash
# rerun_batch_2026_04_27.sh
#
# Re-converts every .fp file under the FinePrint source archive after the
# 2026-04-27 legacy-FINC zlib decompression patch was added. Targets a brand
# new output folder so the previous (-fixed) snapshot remains intact for
# comparison.
#
# Run this on the Mac where /Volumes/KLEVV-4T-2 is mounted. The script is
# *self-contained* — it does not depend on any helper scripts outside the
# repository.
#
# Outputs into: /Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-rerun/
#   ├── md/   ├── html/   ├── pdf/   ├── json/
#   ├── failed/                            (copies of files that errored)
#   ├── conversion-summary-20260427-rerun.txt
#   └── conversion-failures-20260427-rerun.tsv

set -uo pipefail

REPO_ROOT="/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA"
SRC="/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本"
OUT="/Volumes/KLEVV-4T-2/公司電腦資料備份/新謄本-pdf-20260427-rerun"
PYTHON="${PYTHON:-/opt/homebrew/bin/python3}"
SCRIPT="$REPO_ROOT/tools/fp-converter/convert_fp.py"

if [[ ! -d "$SRC" ]]; then
    echo "ERROR: source folder not found: $SRC" >&2
    exit 1
fi
if [[ ! -x "$PYTHON" ]]; then
    echo "ERROR: python3 not executable at $PYTHON (override with PYTHON=...)" >&2
    exit 1
fi
if [[ ! -f "$SCRIPT" ]]; then
    echo "ERROR: converter script missing: $SCRIPT" >&2
    exit 1
fi

mkdir -p "$OUT/md" "$OUT/html" "$OUT/pdf" "$OUT/json" "$OUT/failed"

SUMMARY="$OUT/conversion-summary-20260427-rerun.txt"
FAILURES="$OUT/conversion-failures-20260427-rerun.tsv"
: > "$SUMMARY"
: > "$FAILURES"

echo "[$(date '+%F %T')] starting rerun"            | tee -a "$SUMMARY"
echo "  source : $SRC"                              | tee -a "$SUMMARY"
echo "  output : $OUT"                              | tee -a "$SUMMARY"
echo "  python : $PYTHON"                           | tee -a "$SUMMARY"
echo "  script : $SCRIPT"                           | tee -a "$SUMMARY"
echo                                                 | tee -a "$SUMMARY"

# Single Python child handles the whole run so we get fast process startup +
# in-memory error categorisation. The inline script writes per-format outputs
# directly into $OUT/{md,html,pdf,json}.
"$PYTHON" - "$SRC" "$OUT" "$SCRIPT" "$SUMMARY" "$FAILURES" <<'PY'
import importlib.util, shutil, sys, time, traceback
from pathlib import Path

src_root, out_root, script_path, summary_path, failures_path = (Path(p) for p in sys.argv[1:6])

spec = importlib.util.spec_from_file_location('convert_fp', script_path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

files = sorted(src_root.rglob('*.fp'))
total = len(files)
buckets = {'ok': 0, 'placeholder': 0, 'unsupported_finc': 0, 'too_small': 0, 'other': 0}
fail_rows = []
ok_examples = []

t0 = time.time()
out_md   = out_root / 'md'
out_html = out_root / 'html'
out_pdf  = out_root / 'pdf'
out_json = out_root / 'json'
out_fail = out_root / 'failed'

PLACEHOLDER_PREFIX = '【此 FinePrint 檔案'

def progress(i: int) -> None:
    if i % 200 == 0 or i == total:
        elapsed = time.time() - t0
        rate = i / elapsed if elapsed else 0
        eta  = (total - i) / rate if rate else 0
        print(f'  [{i:5d}/{total}] elapsed={elapsed:6.1f}s rate={rate:5.1f}/s eta={eta:6.1f}s', flush=True)

for i, fp in enumerate(files, 1):
    progress(i)
    try:
        tokens = mod.extract_text_from_fp(fp)
    except ValueError as e:
        msg = str(e)
        if 'Unsupported FINC' in msg:
            kind = 'unsupported_finc'
        elif 'too small' in msg.lower() or 'File too small' in msg:
            kind = 'too_small'
        else:
            kind = 'other'
        buckets[kind] += 1
        try:
            shutil.copy2(fp, out_fail / fp.name)
        except Exception:
            pass
        fail_rows.append(f'{kind}\t{fp.name}\t{msg[:200]}')
        continue
    except Exception as e:  # noqa: BLE001
        buckets['other'] += 1
        try:
            shutil.copy2(fp, out_fail / fp.name)
        except Exception:
            pass
        fail_rows.append(f'exception\t{fp.name}\t{traceback.format_exception_only(type(e), e)[-1].strip()[:200]}')
        continue

    if len(tokens) == 1 and tokens[0].startswith(PLACEHOLDER_PREFIX):
        buckets['placeholder'] += 1
    else:
        buckets['ok'] += 1
        if len(ok_examples) < 5:
            ok_examples.append(fp.name)

    try:
        mod.write_markdown(tokens, fp, out_md)
        mod.write_html(tokens, fp, out_html)
        mod.write_json(tokens, fp, out_json)
        mod.write_pdf(tokens, fp, out_pdf)
    except Exception as e:  # noqa: BLE001
        buckets['other'] += 1
        fail_rows.append(f'render\t{fp.name}\t{traceback.format_exception_only(type(e), e)[-1].strip()[:200]}')

elapsed = time.time() - t0

with summary_path.open('a', encoding='utf-8') as f:
    f.write(f'\nfinished in {elapsed:.1f}s\n')
    f.write(f'total: {total}\n')
    for k in ('ok', 'placeholder', 'unsupported_finc', 'too_small', 'other'):
        v = buckets[k]
        pct = (v * 100 / total) if total else 0.0
        f.write(f'  {k:24s}: {v:6d}  ({pct:5.2f}%)\n')
    f.write('\nok examples:\n')
    for n in ok_examples:
        f.write(f'  - {n}\n')

with failures_path.open('w', encoding='utf-8') as f:
    f.write('kind\tfilename\tmessage\n')
    for row in fail_rows:
        f.write(row + '\n')

print('\n=== summary ===')
print(open(summary_path, encoding='utf-8').read())
PY
RC=$?

echo
echo "[$(date '+%F %T')] done (rc=$RC)"  | tee -a "$SUMMARY"
echo "summary : $SUMMARY"                | tee -a "$SUMMARY"
echo "failures: $FAILURES"               | tee -a "$SUMMARY"

exit $RC
