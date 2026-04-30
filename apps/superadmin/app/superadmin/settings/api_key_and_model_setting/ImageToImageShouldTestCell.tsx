import type { ImageToImageEvaluationRow } from './image-to-image-evaluation-columns';

type ImageToImageShouldTestCellProps = {
  row: ImageToImageEvaluationRow;
  onPatchRow: (rowId: string, patch: Partial<ImageToImageEvaluationRow>) => void;
};

export function ImageToImageShouldTestCell({ row, onPatchRow }: ImageToImageShouldTestCellProps) {
  return (
    <label
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-2 rounded border border-border-subtle bg-bg-secondary px-2 py-1 text-xs text-text-primary"
    >
      <input
        type="checkbox"
        aria-label={`是否測試 ${row.no}`}
        checked={row.shouldTest}
        onChange={(event) => onPatchRow(row.id, { shouldTest: event.target.checked })}
        className="h-4 w-4 accent-emerald-600"
      />
      <span>{row.shouldTest ? '測試' : '跳過'}</span>
    </label>
  );
}
