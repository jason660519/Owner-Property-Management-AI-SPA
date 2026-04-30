import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ImageToImageEvaluationPanel } from '../ImageToImageEvaluationPanel';
import { loadSharedFloorPlanFile } from '../image-to-image-shared-file-store';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    void unoptimized;
    // eslint-disable-next-line @next/next/no-img-element
    return <img alt={props.alt ?? ''} {...props} />;
  },
}));

jest.mock('@/lib/actions/table-settings', () => ({
  getTableSettings: jest.fn(async () => ({ data: null })),
  saveTableSettings: jest.fn(async () => ({ success: true })),
}));

jest.mock('../image-to-image-shared-file-store', () => ({
  loadSharedFloorPlanFile: jest.fn(async () => null),
  saveSharedFloorPlanFile: jest.fn(async () => undefined),
  clearSharedFloorPlanFile: jest.fn(async () => undefined),
}));

const props = {
  savedKeys: [
    {
      id: 'key-gemini',
      provider: 'gemini' as const,
      is_valid: true,
      last_validated_at: null,
      is_active: true,
      created_at: '2026-04-30T00:00:00.000Z',
    },
  ],
  validateAllResultsByKeyId: {
    'key-gemini': {
      valid: true,
      message: 'ok',
      availableModels: ['gemini-3.1-flash-image-preview'],
    },
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('ImageToImageEvaluationPanel should-test selection', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.mocked(loadSharedFloorPlanFile).mockResolvedValue(null);
    global.URL.createObjectURL = jest.fn(() => 'blob:floor-plan-preview');
    global.URL.revokeObjectURL = jest.fn();
    global.fetch = jest.fn(async () => Response.json({ runs: [], total: 0 }));
  });

  it('skips unchecked rows when running the full batch', async () => {
    const runs = Array.from({ length: 2 }, () => deferred<{ success: boolean; message: string; output: string; output_image_url: string }>());
    let runIndex = 0;
    const onTestModel = jest.fn(() => runs[runIndex++].promise);
    render(<ImageToImageEvaluationPanel {...props} onTestModel={onTestModel} />);
    await flushEffects();

    fireEvent.click(screen.getByRole('button', { name: /新增 Row/i }));
    fireEvent.click(screen.getByLabelText('是否測試 2'));
    const sharedInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(sharedInput, {
      target: { files: [new File(['floor-plan'], 'shared-floor-plan.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: '全測' }));

    await waitFor(() => {
      expect(onTestModel).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      runs.forEach((run, index) => run.resolve({
        success: true,
        message: 'ok',
        output: `result-${index}`,
        output_image_url: `data:image/png;base64,${index}`,
      }));
      await Promise.all(runs.map((run) => run.promise));
    });
  });
});
