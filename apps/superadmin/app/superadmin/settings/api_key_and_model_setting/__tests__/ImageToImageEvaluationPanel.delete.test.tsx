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
    {
      id: 'key-openai',
      provider: 'openai' as const,
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
    'key-openai': {
      valid: true,
      message: 'ok',
      availableModels: ['gpt-image-1'],
    },
  },
};

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('ImageToImageEvaluationPanel delete controls', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.mocked(loadSharedFloorPlanFile).mockResolvedValue(null);
    global.URL.createObjectURL = jest.fn(() => 'blob:floor-plan-preview');
    global.URL.revokeObjectURL = jest.fn();
    global.fetch = jest.fn(async () => Response.json({ runs: [], total: 0 }));
  });

  it('lets users delete the default model row and keeps the deletion in saved row state', async () => {
    render(<ImageToImageEvaluationPanel {...props} onTestModel={jest.fn()} />);
    await flushEffects();

    expect(screen.getByTitle('Google Gemini / Gemini Banana / Nano Banana 2 (gemini-3.1-flash-image-preview)')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTitle('預設列不可刪除')).not.toBeInTheDocument());
    const deleteButtons = screen.getAllByTitle('刪除');
    expect(deleteButtons[0]).toBeEnabled();

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(screen.queryByText('預設 Gemini Banana')).not.toBeInTheDocument());
    const storedRows = JSON.parse(localStorage.getItem('ai-settings:image-to-image:rows') ?? '[]') as Array<{ id: string }>;
    expect(storedRows.some((row) => row.id === 'baseline-gemini-banana')).toBe(false);
  });

  it('shows the uploaded floor plan thumbnail in the input floor plan column', async () => {
    render(<ImageToImageEvaluationPanel {...props} onTestModel={jest.fn()} />);
    await flushEffects();

    const sharedInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(sharedInput, {
      target: { files: [new File(['floor-plan'], 'shared-floor-plan.png', { type: 'image/png' })] },
    });

    await waitFor(() => expect(screen.getAllByAltText('上傳格局圖預覽').length).toBeGreaterThan(0));
    expect(screen.queryByAltText('套用的格局圖預覽')).not.toBeInTheDocument();
  });
});
