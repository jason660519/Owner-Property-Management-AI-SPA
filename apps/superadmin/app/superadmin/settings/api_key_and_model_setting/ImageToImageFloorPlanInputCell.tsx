'use client';

import React, { useEffect, useMemo } from 'react';
import NextImage from 'next/image';
import { FileImage, Upload } from 'lucide-react';
import type { ImageToImageEvaluationRow } from './image-to-image-evaluation-columns';

type ImageToImageFloorPlanInputCellProps = {
  row: ImageToImageEvaluationRow;
  onUploadFile: (rowId: string, file: File | null) => void;
};

function stopTablePointerEvent(event: React.SyntheticEvent) {
  event.stopPropagation();
}

const IMAGE_EXT_RE = /\.(png|jpe?g|webp|gif)$/i;

export function ImageToImageFloorPlanInputCell({ row, onUploadFile }: ImageToImageFloorPlanInputCellProps) {
  // File.type can be empty for files restored from IndexedDB or some upload paths;
  // fall back to extension so we still render a thumbnail when the file is clearly an image.
  const isImage =
    row.file?.type.toLowerCase().startsWith('image/') === true ||
    (row.file != null && IMAGE_EXT_RE.test(row.file.name)) ||
    (row.file != null && IMAGE_EXT_RE.test(row.fileName));
  const previewUrl = useMemo(() => {
    if (!row.file || !isImage || typeof URL.createObjectURL !== 'function') return '';
    return URL.createObjectURL(row.file);
  }, [row.file, isImage]);

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <div className="flex min-w-[220px] items-center gap-2">
      <label onMouseDown={stopTablePointerEvent} onPointerDown={stopTablePointerEvent} onClick={stopTablePointerEvent} className="inline-flex h-8 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md border border-border-default bg-bg-secondary px-2 text-xs text-text-secondary hover:text-text-primary">
        <Upload className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{row.fileName || '上傳格局圖'}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => onUploadFile(row.id, event.target.files?.[0] ?? null)} />
      </label>
      {row.fileName ? (
        previewUrl ? (
          <span className="block h-12 w-16 shrink-0 overflow-hidden rounded border border-emerald-300 bg-bg-primary" title={row.fileName}>
            <NextImage
              src={previewUrl}
              alt="上傳格局圖預覽"
              width={96}
              height={72}
              unoptimized
              className="h-full w-full object-cover"
            />
          </span>
        ) : (
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded border border-border-subtle bg-bg-primary text-emerald-600" title={row.fileName}>
            <FileImage className="h-4 w-4" aria-hidden />
          </span>
        )
      ) : null}
    </div>
  );
}
