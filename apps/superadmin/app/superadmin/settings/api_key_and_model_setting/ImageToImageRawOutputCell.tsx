import type { ImageToImageEvaluationRow } from './image-to-image-evaluation-columns';

type ImageToImageRawOutputCellProps = {
  row: ImageToImageEvaluationRow;
  onOpenDetail: (row: ImageToImageEvaluationRow) => void;
};

export function ImageToImageRawOutputCell({ row, onOpenDetail }: ImageToImageRawOutputCellProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onOpenDetail(row);
      }}
      className="h-24 w-full min-w-[220px] overflow-auto rounded-md border border-border-default bg-bg-secondary p-2 text-left font-mono text-[11px] leading-4 text-text-secondary"
    >
      <span className="block whitespace-pre-wrap">
        {row.message || row.resultText || '尚無輸出，執行後會顯示 raw output。'}
      </span>
    </button>
  );
}
