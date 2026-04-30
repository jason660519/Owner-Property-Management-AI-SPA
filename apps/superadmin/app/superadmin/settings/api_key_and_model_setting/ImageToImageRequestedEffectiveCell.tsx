import { AI_PROVIDERS } from '@/lib/ai-providers';
import { getModelDisplayName } from '@/components/ai-settings/model-evaluator/utils';
import { imageToImageModelDisplayName } from './image-to-image-model-capabilities';
import type { ImageModelOption, ImageToImageEvaluationRow } from './image-to-image-evaluation-columns';

type ImageToImageRequestedEffectiveCellProps = {
  row: ImageToImageEvaluationRow;
  modelOptions: ImageModelOption[];
};

function providerLabel(providerId: string): string {
  return AI_PROVIDERS.find((provider) => provider.id === providerId)?.name ?? providerId;
}

function requestedModelLabel(row: ImageToImageEvaluationRow, modelOptions: ImageModelOption[]): string {
  const option = modelOptions.find((item) => item.providerId === row.providerId && item.modelId === row.modelId);
  if (option) return `${option.providerName} / ${option.modelName}`;
  const modelName = imageToImageModelDisplayName(row.providerId, row.modelId)
    ?? getModelDisplayName(row.providerId, row.modelId);
  return `${providerLabel(row.providerId)} / ${modelName}`;
}

export function ImageToImageRequestedEffectiveCell({ row, modelOptions }: ImageToImageRequestedEffectiveCellProps) {
  const requested = requestedModelLabel(row, modelOptions);
  const effective = row.runStatus === 'idle' ? '—' : row.modelId;

  return (
    <div className="min-w-0 space-y-0.5 text-[11px]">
      <p className="truncate text-text-muted" title={`${requested} (${row.modelId})`}>
        指定：<span className="text-text-primary">{requested}</span>
      </p>
      <p className="truncate text-text-muted" title={effective === '—' ? '' : row.modelId}>
        實際：<span className="font-mono text-text-primary">{effective}</span>
      </p>
    </div>
  );
}
