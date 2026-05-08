import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { FloorPlanAIStudio } from '../FloorPlanAIStudio';
import { useAISettings } from '@/lib/hooks/useAISettings';
import { saveGeneratedFloorPlanReferenceDocument } from '@/lib/actions/properties';

jest.mock('@/lib/hooks/useAISettings', () => ({
  useAISettings: jest.fn(),
}));

jest.mock('@/lib/actions/properties', () => ({
  saveGeneratedFloorPlanReferenceDocument: jest.fn(),
}));

const mockUseAISettings = useAISettings as jest.MockedFunction<typeof useAISettings>;
const mockSaveGeneratedFloorPlanReferenceDocument =
  saveGeneratedFloorPlanReferenceDocument as jest.MockedFunction<typeof saveGeneratedFloorPlanReferenceDocument>;

describe('FloorPlanAIStudio', () => {
  const testModel = jest.fn();
  const onDocumentsChanged = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    testModel.mockResolvedValue({
      success: true,
      message: 'ok',
      output_image_url: 'data:image/png;base64,aW1hZ2U=',
    });
    onDocumentsChanged.mockResolvedValue(undefined);
    mockSaveGeneratedFloorPlanReferenceDocument.mockResolvedValue({ success: true, message: 'AI 格局圖已儲存' });
    mockUseAISettings.mockReturnValue({
      keys: [{
        id: 'key-1',
        provider: 'gemini',
        is_valid: true,
        last_validated_at: null,
        is_active: true,
        created_at: '2026-05-08T00:00:00.000Z',
      }],
      validationCacheByKeyId: {
        'key-1': {
          valid: true,
          message: 'ok',
          availableModels: ['gemini-3.1-flash-image-preview'],
        },
      },
      testModel,
      refreshSilent: jest.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof useAISettings>);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['floor-plan'], { type: 'image/png' }),
    });
  });

  function renderStudio() {
    return render(
      <FloorPlanAIStudio
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        documents={[{
          id: 'doc-source',
          documentType: 'floor_plan',
          documentName: '格局圖-source.png',
          filePath: 'property-1/source.png',
          url: '/api/documents/doc-source/view',
          tags: null,
        }]}
        onDocumentsChanged={onDocumentsChanged}
      />,
    );
  }

  it('splits the UI into the two requested generation sections', () => {
    renderStudio();

    expect(screen.getByText('Prompt + 格局圖')).toBeInTheDocument();
    expect(screen.getByText('Prompt + 格局圖 + 風格參考圖')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成 3 風格 2D+3D' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成風格參考 2D+3D' })).toBeInTheDocument();
  });

  it('generates prompt plus floor plan as 2D and 3D images without a style reference image', async () => {
    const user = userEvent.setup();

    renderStudio();
    const [basicPrompt] = screen.getAllByRole('textbox');
    await user.clear(basicPrompt);
    await user.type(basicPrompt, '我想要更溫暖的住宅展示感');

    await user.click(await screen.findByRole('button', { name: '生成 3 風格 2D+3D' }));

    await waitFor(() => {
      expect(testModel).toHaveBeenCalledTimes(6);
    });
    await waitFor(() => {
      expect(mockSaveGeneratedFloorPlanReferenceDocument).toHaveBeenCalledTimes(6);
    });
    expect(onDocumentsChanged).toHaveBeenCalledTimes(1);
    expect(testModel).toHaveBeenCalledWith(
      'gemini',
      'gemini-3.1-flash-image-preview',
      expect.stringContaining('我想要更溫暖的住宅展示感'),
      expect.any(File),
    );
    for (const call of testModel.mock.calls) {
      expect(Array.isArray(call[3])).toBe(false);
    }
    expect(await screen.findAllByText(/由 Google Gemini \/ Nano Banana 2/)).toHaveLength(6);
    expect(screen.getAllByRole('link', { name: /開啟完整 AI 格局圖/ })).toHaveLength(6);
  });

  it('starts all preset 2D and 3D generations concurrently', async () => {
    const user = userEvent.setup();
    const resolvers: Array<(value: { success: boolean; message: string; output_image_url: string }) => void> = [];
    testModel.mockImplementation(() => new Promise((resolve) => {
      resolvers.push(resolve);
    }));

    renderStudio();

    await user.click(await screen.findByRole('button', { name: '生成 3 風格 2D+3D' }));

    await waitFor(() => {
      expect(testModel).toHaveBeenCalledTimes(6);
    });
    expect(mockSaveGeneratedFloorPlanReferenceDocument).not.toHaveBeenCalled();

    resolvers.forEach((resolve) => resolve({
      success: true,
      message: 'ok',
      output_image_url: 'data:image/png;base64,aW1hZ2U=',
    }));

    await waitFor(() => {
      expect(mockSaveGeneratedFloorPlanReferenceDocument).toHaveBeenCalledTimes(6);
    });
  });

  it('falls back to the next image model and records which model generated the images', async () => {
    const user = userEvent.setup();
    testModel.mockImplementation(async (_provider, modelId) => {
      if (modelId === 'gemini-3.1-flash-image-preview') {
        return { success: false, message: 'primary overloaded' };
      }
      return {
        success: true,
        message: 'ok',
        output_image_url: 'data:image/png;base64,aW1hZ2U=',
      };
    });

    renderStudio();

    const styleInput = screen.getByLabelText('上傳風格參考圖') as HTMLInputElement;
    await user.upload(styleInput, new File(['style'], 'style-reference.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: '生成風格參考 2D+3D' }));

    await waitFor(() => {
      expect(testModel).toHaveBeenCalledTimes(4);
    });
    await waitFor(() => {
      expect(mockSaveGeneratedFloorPlanReferenceDocument).toHaveBeenCalledTimes(2);
    });
    expect(mockSaveGeneratedFloorPlanReferenceDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'gemini',
        modelId: 'gemini-3-pro-image-preview',
      }),
    );
    expect(await screen.findAllByText(/備援成功/)).toHaveLength(2);
    expect(screen.getAllByText(/Fallback：Google Gemini \/ Nano Banana 2/)).toHaveLength(2);
  });

  it('generates prompt plus floor plan plus style reference image as 2D and 3D images', async () => {
    const user = userEvent.setup();

    renderStudio();
    const [, stylePrompt] = screen.getAllByRole('textbox');
    await user.clear(stylePrompt);
    await user.type(stylePrompt, '請參考風格圖的木質色調和家具配置');

    const styleInput = screen.getByLabelText('上傳風格參考圖') as HTMLInputElement;
    await user.upload(styleInput, new File(['style'], 'style-reference.png', { type: 'image/png' }));
    await user.click(screen.getByRole('button', { name: '生成風格參考 2D+3D' }));

    await waitFor(() => {
      expect(testModel).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(mockSaveGeneratedFloorPlanReferenceDocument).toHaveBeenCalledTimes(2);
    });

    for (const call of testModel.mock.calls) {
      expect(call[2]).toEqual(expect.stringContaining('請參考風格圖的木質色調和家具配置'));
      expect(call[2]).toEqual(expect.stringContaining('第二張參考圖只作為配色'));
      expect(Array.isArray(call[3])).toBe(true);
      expect(call[3]).toHaveLength(2);
    }
  });
});
