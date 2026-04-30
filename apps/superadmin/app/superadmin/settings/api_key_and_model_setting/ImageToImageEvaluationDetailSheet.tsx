'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/Sheet';
import type { ImageToImageEvaluationRow } from './image-to-image-evaluation-columns';

export type ImageToImageRunHistoryEntry = {
  id: string;
  row_id: string;
  provider: string;
  model_id: string;
  style: string;
  output_mode: string;
  file_name: string;
  success: boolean;
  message: string;
  result_image_url: string;
  result_2d_image_url?: string;
  result_3d_image_url?: string;
  e2e_ms: number | null;
  http_status: number | null;
  created_at: string;
};

type ImageToImageEvaluationDetailSheetProps = {
  detail: ImageToImageEvaluationRow | null;
  historyLoading: boolean;
  historyRuns: ImageToImageRunHistoryEntry[];
  onClose: () => void;
};

function DetailElapsedTimer({ runStartedAtMs }: { runStartedAtMs: number | null }) {
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (runStartedAtMs == null) return;
    const tick = () => setElapsedSec((Date.now() - runStartedAtMs) / 1000);
    tick();
    const timerId = setInterval(tick, 100);
    return () => clearInterval(timerId);
  }, [runStartedAtMs]);

  if (runStartedAtMs == null) return null;
  return <span className="font-mono tabular-nums">生成 {elapsedSec.toFixed(1)} 秒</span>;
}

export function ImageToImageEvaluationDetailSheet({
  detail,
  historyLoading,
  historyRuns,
  onClose,
}: ImageToImageEvaluationDetailSheetProps) {
  return (
    <Sheet open={detail != null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-[min(96vw,42rem)] lg:max-w-[min(96vw,54rem)]">
        {detail && (
          <>
            <SheetHeader>
              <SheetTitle>圖生圖模型評估結果</SheetTitle>
              <SheetDescription>
                {detail.providerId} / <span className="font-mono">{detail.modelId}</span>
                {detail.runStatus === 'running' ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-text-muted">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    評估中 · <DetailElapsedTimer runStartedAtMs={detail.runStartedAtMs} />
                  </span>
                ) : null}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-6 pb-8">
              <div className="rounded-base border border-border-default bg-bg-secondary p-3 text-xs text-text-secondary">
                <p>上傳檔案：<span className="text-text-primary">{detail.fileName || '尚未上傳'}</span></p>
                <p className="mt-1">狀態：<span className="text-text-primary">{detail.message || detail.runStatus}</span></p>
              </div>
              {detail.resultImageUrl && (
                <div className="grid gap-3 md:grid-cols-2">
                  {(detail.resultImage2dUrl || detail.resultImageUrl) && (
                    <a href={detail.resultImage2dUrl || detail.resultImageUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-base border border-emerald-300 bg-bg-secondary" title="開啟 2D 生成大圖預覽">
                      <Image src={detail.resultImage2dUrl || detail.resultImageUrl} alt="2D 圖生圖模型輸出" width={960} height={540} unoptimized className="max-h-[360px] w-full object-contain" />
                    </a>
                  )}
                  {detail.resultImage3dUrl && (
                    <a href={detail.resultImage3dUrl} target="_blank" rel="noopener noreferrer" className="block overflow-hidden rounded-base border border-emerald-300 bg-bg-secondary" title="開啟 3D 生成大圖預覽">
                      <Image src={detail.resultImage3dUrl} alt="3D 圖生圖模型輸出" width={960} height={540} unoptimized className="max-h-[360px] w-full object-contain" />
                    </a>
                  )}
                </div>
              )}
              {detail.runStatus === 'done' && !detail.resultImageUrl && (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  此次模型沒有回傳可預覽的圖片。請查看文字輸出，或換用 Gemini Banana / 支援 image output 的模型再執行。
                </p>
              )}
              <div>
                <h4 className="mb-2 text-xs font-semibold text-text-primary">Prompt</h4>
                <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border-default bg-bg-secondary p-3 text-xs leading-relaxed text-text-secondary">
                  {detail.prompt}
                </pre>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold text-text-primary">文字輸出</h4>
                <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border-default bg-bg-secondary p-3 text-xs leading-relaxed text-text-secondary">
                  {detail.resultText || '尚無文字輸出'}
                </pre>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold text-text-primary">Test history</h4>
                <div className="max-h-56 overflow-auto rounded-md border border-border-default bg-bg-secondary p-2 text-xs text-text-secondary">
                  {historyLoading ? (
                    <p>載入歷史紀錄中...</p>
                  ) : historyRuns.length === 0 ? (
                    <p>尚無 DB 歷史紀錄</p>
                  ) : (
                    <ul className="space-y-2">
                      {historyRuns.map((run) => (
                        <li key={run.id} className="rounded border border-border-subtle bg-bg-primary p-2">
                          <div className="flex items-center justify-between gap-3">
                            <span className={run.success ? 'text-emerald-600' : 'text-rose-600'}>
                              {run.success ? '完成' : '失敗'} · {run.message || '無訊息'}
                            </span>
                            <span className="font-mono tabular-nums text-text-muted">
                              {new Date(run.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] text-text-muted">
                            <span>{run.model_id}</span>
                            <span>E2E {run.e2e_ms ?? '—'} ms</span>
                            <span>HTTP {run.http_status ?? '—'}</span>
                            {run.result_2d_image_url || run.result_image_url ? <span>2D image ready</span> : null}
                            {run.result_3d_image_url ? <span>3D image ready</span> : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
