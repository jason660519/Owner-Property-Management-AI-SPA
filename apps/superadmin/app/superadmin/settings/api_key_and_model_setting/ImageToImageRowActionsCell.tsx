import { Trash2 } from 'lucide-react';
import type { ImageToImageEvaluationRow } from './image-to-image-evaluation-columns';

type ImageToImageRowActionsCellProps = {
  row: ImageToImageEvaluationRow;
  onDeleteRow: (rowId: string) => void;
};

export function ImageToImageRowActionsCell({ row, onDeleteRow }: ImageToImageRowActionsCellProps) {
  return (
    <button
      type="button"
      title="刪除"
      aria-label="刪除模型列"
      onClick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onDeleteRow(row.id);
      }}
      className="inline-flex h-8 items-center gap-1 rounded border border-rose-400/60 bg-rose-950/10 px-2 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-400"
    >
      <Trash2 className="h-3.5 w-3.5" />
      刪除
    </button>
  );
}
