import NextImage from 'next/image';
import { Image as ImageIcon } from 'lucide-react';
import type { ImageToImageEvaluationRow } from './image-to-image-evaluation-columns';

type ImageToImageRenderedImageCellProps = {
  row: ImageToImageEvaluationRow;
  url: string;
  label: string;
  emptyText: string;
  onOpenDetail: (row: ImageToImageEvaluationRow) => void;
};

export function ImageToImageRenderedImageCell({
  row,
  url,
  label,
  emptyText,
  onOpenDetail,
}: ImageToImageRenderedImageCellProps) {
  if (url) {
    return (
      <button type="button" onClick={(event) => { event.stopPropagation(); event.preventDefault(); onOpenDetail(row); }} className="relative block h-24 w-full min-w-[180px] overflow-hidden rounded-md border border-emerald-300 bg-bg-secondary">
        <span className="absolute left-1.5 top-1.5 z-10 inline-flex items-center gap-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
          <ImageIcon className="h-3 w-3" />
          {label} 已生成
        </span>
        <NextImage src={url} alt={`${label} 圖生圖輸出`} width={240} height={160} unoptimized className="h-full w-full object-contain" />
      </button>
    );
  }

  return (
    <button type="button" onClick={(event) => { event.stopPropagation(); event.preventDefault(); onOpenDetail(row); }} className="flex h-24 w-full min-w-[220px] items-center gap-2 overflow-auto rounded-md border border-emerald-200 bg-emerald-50/40 p-2 text-left text-[11px] text-emerald-900">
      <ImageIcon className="h-4 w-4 shrink-0 text-emerald-700" />
      <span>{row.runStatus === 'running' ? `${label} 生成中...` : emptyText}</span>
    </button>
  );
}
