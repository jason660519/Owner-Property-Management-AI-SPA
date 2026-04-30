import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ImageToImageEvaluationPanel } from '../ImageToImageEvaluationPanel';
import { buildImageModelOptions } from '../image-to-image-evaluation-columns';
import { loadSharedFloorPlanFile, saveSharedFloorPlanFile } from '../image-to-image-shared-file-store';

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

const baseProps = {
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
      availableModels: ['gemini-3.1-flash-image-preview', 'gemini-2.0-flash'],
    },
  },
};

const multiProviderProps = {
  savedKeys: [
    ...baseProps.savedKeys,
    {
      id: 'key-openai',
      provider: 'openai' as const,
      is_valid: true,
      last_validated_at: null,
      is_active: true,
      created_at: '2026-04-30T00:00:00.000Z',
    },
    {
      id: 'key-qwen',
      provider: 'qwen' as const,
      is_valid: true,
      last_validated_at: null,
      is_active: true,
      created_at: '2026-04-30T00:00:00.000Z',
    },
  ],
  validateAllResultsByKeyId: {
    ...baseProps.validateAllResultsByKeyId,
    'key-openai': {
      valid: true,
      message: 'ok',
      availableModels: ['gpt-image-1', 'gpt-5.5'],
    },
    'key-qwen': {
      valid: true,
      message: 'ok',
      availableModels: ['qwen-image-2.0-pro', 'qwen3.6-plus'],
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

async function flushTablePreferences() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('ImageToImageEvaluationPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.mocked(loadSharedFloorPlanFile).mockResolvedValue(null);
    jest.mocked(saveSharedFloorPlanFile).mockResolvedValue(undefined);
    global.URL.createObjectURL = jest.fn(() => 'blob:floor-plan-preview');
    global.URL.revokeObjectURL = jest.fn();
    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('image-to-image-evaluation-runs') && url.includes('?')) {
        return Response.json({ runs: [], total: 0 });
      }
      return Response.json({
        success: true,
        run: {
          id: 'run-1',
          row_id: 'baseline-gemini-banana',
          provider: 'gemini',
          model_id: 'gemini-3.1-flash-image-preview',
          style: 'modern',
          output_mode: '2d',
          file_name: 'shared-floor-plan.png',
          success: true,
          message: '測試完成。',
          result_image_url: 'data:image/png;base64,abc',
          result_2d_image_url: 'data:image/png;base64,abc',
          result_3d_image_url: '',
          e2e_ms: 1200,
          http_status: 200,
          created_at: '2026-04-30T00:00:00.000Z',
        },
      });
    }) as jest.Mock;
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-30T00:00:00.000Z'));
    Object.defineProperty(global, 'performance', {
      configurable: true,
      value: { now: jest.fn(() => Date.now()) },
    });
  });

  it('offers only official image-output models for image-to-image evaluation', () => {
    const options = buildImageModelOptions([
      { id: 'key-gemini', provider: 'gemini', is_valid: true, last_validated_at: null, is_active: true, created_at: '' },
      { id: 'key-openai', provider: 'openai', is_valid: true, last_validated_at: null, is_active: true, created_at: '' },
      { id: 'key-qwen', provider: 'qwen', is_valid: true, last_validated_at: null, is_active: true, created_at: '' },
      { id: 'key-anthropic', provider: 'anthropic', is_valid: true, last_validated_at: null, is_active: true, created_at: '' },
      { id: 'key-kimi', provider: 'kimi', is_valid: true, last_validated_at: null, is_active: true, created_at: '' },
      { id: 'key-zhipu', provider: 'zhipu', is_valid: true, last_validated_at: null, is_active: true, created_at: '' },
    ], {
      'key-openai': { valid: true, message: 'ok', availableModels: ['gpt-5.5', 'gpt-image-1'] },
      'key-qwen': { valid: true, message: 'ok', availableModels: ['qwen3.6-plus', 'qwen-image-2.0-pro'] },
      'key-anthropic': { valid: true, message: 'ok', availableModels: ['claude-opus-4-5-20251101'] },
      'key-kimi': { valid: true, message: 'ok', availableModels: ['kimi-k2.6'] },
      'key-zhipu': { valid: true, message: 'ok', availableModels: ['glm-image', 'glm-4v-plus'] },
    });

    expect(options.map((option) => option.modelId)).toEqual(expect.arrayContaining([
      'gemini-3.1-flash-image-preview',
      'gpt-image-1',
      'qwen-image-2.0-pro',
    ]));
    expect(options.map((option) => option.providerId)).not.toEqual(expect.arrayContaining([
      'anthropic',
      'kimi',
      'zhipu',
    ]));
    expect(options.map((option) => option.modelId)).not.toEqual(expect.arrayContaining([
      'gpt-5.5',
      'qwen3.6-plus',
      'glm-image',
    ]));
  });

  it('seeds cross-company benchmark rows instead of only Google rows', async () => {
    render(<ImageToImageEvaluationPanel {...multiProviderProps} onTestModel={jest.fn()} />);
    await flushTablePreferences();

    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Qwen (通義千問)')).toBeInTheDocument();
      expect(screen.getAllByText('預設跨公司圖生圖評估模型。')).toHaveLength(2);
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
    jest.mocked(loadSharedFloorPlanFile).mockReset();
    jest.mocked(saveSharedFloorPlanFile).mockReset();
    jest.restoreAllMocks();
  });

  it('applies one shared floor plan file to all current and newly added model rows', async () => {
    render(<ImageToImageEvaluationPanel {...baseProps} onTestModel={jest.fn()} />);
    await flushTablePreferences();

    fireEvent.click(screen.getByRole('button', { name: /新增 Row/i }));
    const sharedInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['floor-plan'], 'shared-floor-plan.png', { type: 'image/png' });

    fireEvent.change(sharedInput, { target: { files: [file] } });

    expect(saveSharedFloorPlanFile).toHaveBeenCalledWith(file);
    expect(screen.getAllByText('shared-floor-plan.png').length).toBeGreaterThanOrEqual(2);
    await waitFor(() => {
      expect(screen.getAllByAltText('上傳格局圖預覽').length).toBeGreaterThanOrEqual(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /新增 Row/i }));
    expect(screen.getAllByText('shared-floor-plan.png').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByAltText('上傳格局圖預覽').length).toBeGreaterThanOrEqual(3);
  });

  it('restores the shared floor plan from local browser memory after reload', async () => {
    const restoredFile = new File(['remembered-floor-plan'], 'remembered-floor-plan.png', { type: 'image/png' });
    jest.mocked(loadSharedFloorPlanFile).mockResolvedValue(restoredFile);

    render(<ImageToImageEvaluationPanel {...baseProps} onTestModel={jest.fn()} />);
    await flushTablePreferences();

    await waitFor(() => {
      expect(screen.getAllByText('remembered-floor-plan.png').length).toBeGreaterThanOrEqual(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /新增 Row/i }));
    expect(screen.getAllByText('remembered-floor-plan.png').length).toBeGreaterThanOrEqual(3);
    expect(saveSharedFloorPlanFile).not.toHaveBeenCalled();
  });

  it('defaults every loaded row output mode to 2D plus 3D evaluation', async () => {
    localStorage.setItem('ai-settings:image-to-image:rows', JSON.stringify([
      {
        id: 'legacy-row',
        no: 1,
        isBaseline: false,
        providerId: 'gemini',
        modelId: 'gemini-3.1-flash-image-preview',
        style: 'modern',
        outputMode: '2d',
        prompt: 'legacy 2d prompt',
        fileName: '',
        runStatus: 'idle',
        resultText: '',
        resultImageUrl: '',
        resultImage2dUrl: '',
        resultImage3dUrl: '',
        message: '',
        runStartedAtMs: null,
        e2eMs: null,
        httpStatus: null,
        lastRunAt: null,
      },
    ]));

    render(<ImageToImageEvaluationPanel {...baseProps} onTestModel={jest.fn()} />);
    await flushTablePreferences();

    expect(screen.getAllByDisplayValue('2D + 3D 同時評估').length).toBeGreaterThanOrEqual(1);
    fireEvent.click(screen.getByRole('button', { name: /新增 Row/i }));
    expect(screen.getAllByDisplayValue('2D + 3D 同時評估').length).toBeGreaterThanOrEqual(2);
  });

  it('shows a running timer immediately after a row run starts', async () => {
    const run2d = deferred<{ success: boolean; message: string; output: string; output_image_url: string }>();
    const run3d = deferred<{ success: boolean; message: string; output: string; output_image_url: string }>();
    const pendingRuns = [run2d, run3d];
    let runIndex = 0;
    const onTestModel = jest.fn(() => pendingRuns[runIndex++].promise);
    render(<ImageToImageEvaluationPanel {...baseProps} onTestModel={onTestModel} />);
    await flushTablePreferences();

    const sharedInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(sharedInput, {
      target: { files: [new File(['floor-plan'], 'shared-floor-plan.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByTitle('開始評估'));

    expect(screen.getAllByText('模型測試中').length).toBeGreaterThan(0);
    await waitFor(() => {
      expect(screen.getAllByText(/生成 \d+\.\d 秒/).length).toBeGreaterThan(0);
    });

    act(() => {
      jest.advanceTimersByTime(1200);
    });
    await waitFor(() => {
      const timerText = screen.getAllByText(/生成 \d+\.\d 秒/).map((element) => element.textContent ?? '').join('\n');
      expect(timerText).toContain('生成 ');
    });

    await act(async () => {
      run2d.resolve({
        success: true,
        message: 'ok',
        output: '2d done',
        output_image_url: 'data:image/png;base64,2d',
      });
      run3d.resolve({
        success: true,
        message: 'ok',
        output: '3d done',
        output_image_url: 'data:image/png;base64,3d',
      });
      await Promise.all([run2d.promise, run3d.promise]);
    });

    expect(onTestModel).toHaveBeenCalledTimes(2);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai-settings/image-to-image-evaluation-runs', expect.objectContaining({
        method: 'POST',
      }));
    });
    await waitFor(() => {
      expect(screen.getByText('2D image ready')).toBeInTheDocument();
    });
  });

  it('renders separate 2D and 3D output columns for generated images', async () => {
    const run2d = deferred<{ success: boolean; message: string; output: string; output_image_url: string }>();
    const run3d = deferred<{ success: boolean; message: string; output: string; output_image_url: string }>();
    const pendingRuns = [run2d, run3d];
    let runIndex = 0;
    const onTestModel = jest.fn(() => pendingRuns[runIndex++].promise);
    render(<ImageToImageEvaluationPanel {...baseProps} onTestModel={onTestModel} />);
    await flushTablePreferences();

    const sharedInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(sharedInput, {
      target: { files: [new File(['floor-plan'], 'shared-floor-plan.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByTitle('開始評估'));

    await act(async () => {
      run2d.resolve({
        success: true,
        message: 'ok',
        output: '2d generated',
        output_image_url: 'data:image/png;base64,2d',
      });
      run3d.resolve({
        success: true,
        message: 'ok',
        output: '3d generated',
        output_image_url: 'data:image/png;base64,3d',
      });
      await Promise.all([run2d.promise, run3d.promise]);
    });

    await waitFor(() => {
      expect(screen.getByText('2D 已生成')).toBeInTheDocument();
      expect(screen.getByText('3D 已生成')).toBeInTheDocument();
    });
    expect(onTestModel).toHaveBeenNthCalledWith(1, 'gemini', 'gemini-3.1-flash-image-preview', expect.stringContaining('2D 彩繪平面圖'), expect.any(File));
    expect(onTestModel).toHaveBeenNthCalledWith(2, 'gemini', 'gemini-3.1-flash-image-preview', expect.stringContaining('3D 鳥瞰彩繪圖'), expect.any(File));
  });

  it('runs all rows in parallel without opening the result sheet', async () => {
    const runs = Array.from({ length: 4 }, () => deferred<{ success: boolean; message: string; output: string; output_image_url: string }>());
    let runIndex = 0;
    const onTestModel = jest.fn(() => runs[runIndex++].promise);
    render(<ImageToImageEvaluationPanel {...baseProps} onTestModel={onTestModel} />);
    await flushTablePreferences();

    fireEvent.click(screen.getByRole('button', { name: /新增 Row/i }));
    const sharedInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(sharedInput, {
      target: { files: [new File(['floor-plan'], 'shared-floor-plan.png', { type: 'image/png' })] },
    });

    fireEvent.click(screen.getByRole('button', { name: '全測' }));

    await waitFor(() => {
      expect(onTestModel).toHaveBeenCalledTimes(4);
    });
    expect(screen.queryByText('圖生圖模型評估結果')).not.toBeInTheDocument();
    expect(screen.getAllByText('模型測試中').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/生成 \d+\.\d 秒/).length).toBeGreaterThanOrEqual(2);

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

  it('runs the seeded Google, OpenAI, and Qwen rows in one parallel batch', async () => {
    const runs = Array.from({ length: 6 }, () => deferred<{ success: boolean; message: string; output: string; output_image_url: string }>());
    let runIndex = 0;
    const onTestModel = jest.fn(() => runs[runIndex++].promise);
    render(<ImageToImageEvaluationPanel {...multiProviderProps} onTestModel={onTestModel} />);
    await flushTablePreferences();
    await waitFor(() => {
      expect(screen.getByText('OpenAI')).toBeInTheDocument();
      expect(screen.getByText('Qwen (通義千問)')).toBeInTheDocument();
    });

    const sharedInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(sharedInput, {
      target: { files: [new File(['floor-plan'], 'shared-floor-plan.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: '全測' }));

    await waitFor(() => {
      expect(onTestModel).toHaveBeenCalledTimes(6);
    });
    const calledProviders = (onTestModel.mock.calls as unknown as Array<[string, string, string?, File?]>)
      .map(([provider]) => provider);
    expect(calledProviders).toEqual(expect.arrayContaining([
      'gemini',
      'openai',
      'qwen',
    ]));

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

  it('coerces legacy vision-only rows before running the batch', async () => {
    localStorage.setItem('ai-settings:image-to-image:rows', JSON.stringify([
      {
        id: 'legacy-anthropic-row',
        no: 1,
        isBaseline: false,
        providerId: 'anthropic',
        modelId: 'claude-opus-4-5-20251101',
        style: 'modern',
        outputMode: 'both',
        prompt: 'legacy prompt',
        fileName: '',
        runStatus: 'idle',
        resultText: '',
        resultImageUrl: '',
        resultImage2dUrl: '',
        resultImage3dUrl: '',
        message: '',
        runStartedAtMs: null,
        e2eMs: null,
        httpStatus: null,
        lastRunAt: null,
      },
    ]));
    const runs = Array.from({ length: 2 }, () => deferred<{ success: boolean; message: string; output: string; output_image_url: string }>());
    let runIndex = 0;
    const onTestModel = jest.fn(() => runs[runIndex++].promise);

    render(<ImageToImageEvaluationPanel {...baseProps} onTestModel={onTestModel} />);
    await flushTablePreferences();
    await waitFor(() => {
      expect(screen.getByText('已改用支援圖生圖輸出的模型。')).toBeInTheDocument();
    });

    const sharedInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(sharedInput, {
      target: { files: [new File(['floor-plan'], 'shared-floor-plan.png', { type: 'image/png' })] },
    });
    fireEvent.click(screen.getByRole('button', { name: '全測' }));

    await waitFor(() => {
      expect(onTestModel).toHaveBeenCalledTimes(2);
    });
    expect(onTestModel).not.toHaveBeenCalledWith('anthropic', expect.any(String), expect.any(String), expect.any(File));

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
