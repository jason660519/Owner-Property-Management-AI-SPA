'use client';

import { ExternalLink, ImageIcon, Loader2 } from 'lucide-react';
import { OUTPUT_MODE_OPTIONS } from '@/app/superadmin/settings/api_key_and_model_setting/image-to-image-evaluation-columns';
import type { GeneratedTile } from './FloorPlanAIStudio';

function outputLabel(mode: GeneratedTile['mode']): string {
  return OUTPUT_MODE_OPTIONS.find((option) => option.id === mode)?.label ?? mode.toUpperCase();
}

function statusLabel(status: GeneratedTile['status']): string {
  if (status === 'done') return '完成';
  if (status === 'failed') return '失敗';
  if (status === 'running') return '生成中';
  return '等待';
}

function statusClass(status: GeneratedTile['status']): string {
  if (status === 'done') return 'bg-green-500/12 text-green-600';
  if (status === 'failed') return 'bg-red-500/12 text-red-500';
  if (status === 'running') return 'bg-accent/12 text-accent';
  return 'bg-bg-tertiary text-text-muted';
}

export function FloorPlanAIResultTable({
  tiles,
  emptyText,
}: {
  tiles: GeneratedTile[];
  emptyText: string;
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border-default bg-bg-primary">
      {tiles.length === 0 ? (
        <div className="flex min-h-[88px] items-center justify-center px-4 text-center text-xs text-text-muted">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-xs">
            <thead className="bg-bg-secondary text-[11px] text-text-muted">
              <tr>
                <th className="w-20 px-2 py-2 font-medium">縮圖</th>
                <th className="px-2 py-2 font-medium">風格</th>
                <th className="w-28 px-2 py-2 font-medium">類型</th>
                <th className="px-2 py-2 font-medium">模型</th>
                <th className="w-24 px-2 py-2 font-medium">狀態</th>
                <th className="px-2 py-2 font-medium">訊息</th>
                <th className="w-20 px-2 py-2 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default">
              {tiles.map((tile) => {
                const fullMessage = tile.fallbackTrail.length > 0
                  ? `${tile.message}｜Fallback：${tile.fallbackTrail.join('；')}`
                  : tile.message;
                return (
                  <tr key={tile.id} className="align-middle">
                    <td className="px-2 py-2">
                      <div className="flex h-12 w-16 items-center justify-center rounded border border-border-default bg-bg-secondary">
                        {tile.imageUrl ? (
                          <a
                            href={tile.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex h-full w-full items-center justify-center"
                            aria-label={`開啟完整 AI 格局圖：${tile.styleLabel} ${tile.mode.toUpperCase()}`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={tile.imageUrl} alt={`${tile.styleLabel} ${tile.mode.toUpperCase()} AI 格局圖`} className="h-full w-full object-contain" />
                          </a>
                        ) : tile.status === 'running' ? (
                          <Loader2 size={16} className="animate-spin text-accent" />
                        ) : (
                          <ImageIcon size={16} className="text-text-muted" />
                        )}
                      </div>
                    </td>
                    <td className="max-w-[140px] px-2 py-2 font-medium text-text-primary">
                      <span className="block truncate" title={tile.styleLabel}>{tile.styleLabel}</span>
                    </td>
                    <td className="px-2 py-2 text-text-secondary">{outputLabel(tile.mode)}</td>
                    <td className="max-w-[180px] px-2 py-2 text-text-secondary">
                      <span className="block truncate" title={tile.modelLabel}>{tile.modelLabel || '—'}</span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(tile.status)}`}>
                        {statusLabel(tile.status)}
                      </span>
                    </td>
                    <td className="max-w-[240px] px-2 py-2 text-text-muted">
                      <span className="block truncate" title={fullMessage}>{fullMessage}</span>
                    </td>
                    <td className="px-2 py-2 text-right">
                      {tile.imageUrl ? (
                        <a
                          href={tile.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-border-default px-2 py-1 text-[11px] text-text-secondary transition-colors hover:text-accent"
                        >
                          <ExternalLink size={11} /> 開啟
                        </a>
                      ) : (
                        <span className="text-[11px] text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
