import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PropertyMediaSection } from '../PropertyMediaSection';
import {
  getPropertyPhotos,
  getPropertyDocuments,
  uploadPropertyDocument,
  deletePropertyDocument,
  createPhotoUploadUrl,
  deletePropertyPhoto,
  savePhotoMetadata,
  updatePhotoSortOrder,
} from '@/lib/actions/properties';

jest.mock('@/lib/actions/properties', () => ({
  getPropertyPhotos: jest.fn(),
  getPropertyDocuments: jest.fn(),
  createPhotoUploadUrl: jest.fn(),
  savePhotoMetadata: jest.fn(),
  updatePhotoSortOrder: jest.fn(),
  uploadPropertyDocument: jest.fn(),
  deletePropertyPhoto: jest.fn(),
  deletePropertyDocument: jest.fn(),
}));

jest.mock('../TranscriptParseSection', () => ({
  TranscriptParseSection: () => <div data-testid="transcript-parse-section" />,
}));

const mockGetPropertyPhotos = getPropertyPhotos as jest.MockedFunction<typeof getPropertyPhotos>;
const mockGetPropertyDocuments = getPropertyDocuments as jest.MockedFunction<typeof getPropertyDocuments>;
const mockUploadPropertyDocument = uploadPropertyDocument as jest.MockedFunction<typeof uploadPropertyDocument>;
const mockDeletePropertyDocument = deletePropertyDocument as jest.MockedFunction<typeof deletePropertyDocument>;
const mockCreatePhotoUploadUrl = createPhotoUploadUrl as jest.MockedFunction<typeof createPhotoUploadUrl>;
const mockDeletePropertyPhoto = deletePropertyPhoto as jest.MockedFunction<typeof deletePropertyPhoto>;
const mockSavePhotoMetadata = savePhotoMetadata as jest.MockedFunction<typeof savePhotoMetadata>;
const mockUpdatePhotoSortOrder = updatePhotoSortOrder as jest.MockedFunction<typeof updatePhotoSortOrder>;

describe('PropertyMediaSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPropertyPhotos.mockResolvedValue([]);
    mockGetPropertyDocuments.mockResolvedValue([]);
    mockUploadPropertyDocument.mockResolvedValue({ success: true, message: '文件已上傳' });
    mockDeletePropertyDocument.mockResolvedValue({ success: true, message: '文件已刪除' });
    mockCreatePhotoUploadUrl.mockResolvedValue({ success: true, message: 'ok', signedUrl: 'https://example.com', storagePath: 'photo-path' });
    mockDeletePropertyPhoto.mockResolvedValue({ success: true, message: '照片已刪除' });
    mockSavePhotoMetadata.mockResolvedValue({ success: true, message: '照片已儲存' });
    mockUpdatePhotoSortOrder.mockResolvedValue({ success: true, message: '排序已更新' });

    URL.createObjectURL = jest.fn().mockReturnValue('blob:floor-plan-preview');
    URL.revokeObjectURL = jest.fn();
  });

  it('renders an inline preview card for uploaded floor plan images', async () => {
    mockGetPropertyDocuments.mockResolvedValue([
      {
        id: 'doc-1',
        documentType: 'floor_plan',
        documentName: '格局圖-平面圖.png',
        filePath: 'property-1/floor-plan.png',
        url: '/api/documents/doc-1/view',
      },
    ]);

    render(
      <PropertyMediaSection
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        mode="floor_plan"
      />,
    );

    await waitFor(() => {
      expect(mockGetPropertyDocuments).toHaveBeenCalledWith('property-1');
    });

    expect(await screen.findByAltText(/格局圖預覽：格局圖-平面圖\.png/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /開啟/i })).toHaveAttribute('href', '/api/documents/doc-1/view');
    expect(screen.queryByText('上傳成功')).not.toBeInTheDocument();
  });

  it('shows a selected floor plan preview and refreshes to the uploaded preview after upload', async () => {
    const user = userEvent.setup();
    mockGetPropertyDocuments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'doc-2',
          documentType: 'floor_plan',
          documentName: '格局圖-floorplan.png',
          filePath: 'property-1/floorplan.png',
          url: '/api/documents/doc-2/view',
        },
      ]);

    const { container } = render(
      <PropertyMediaSection
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        mode="floor_plan"
      />,
    );

    await waitFor(() => {
      expect(mockGetPropertyDocuments).toHaveBeenCalledWith('property-1');
    });

    await screen.findByRole('button', { name: '上傳格局圖' });

    const input = container.querySelector('input[type="file"]') as HTMLInputElement | null;
    expect(input).not.toBeNull();

    const file = new File(['floor-plan'], 'floorplan.png', { type: 'image/png' });
    await user.upload(input as HTMLInputElement, file);

    expect(screen.getByAltText('待上傳格局圖預覽')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上傳格局圖' }));

    await waitFor(() => {
      expect(mockUploadPropertyDocument).toHaveBeenCalledWith(
        'property-1',
        'sale',
        'owner-1',
        'floor_plan',
        expect.any(FormData),
      );
    });

    await waitFor(() => {
      expect(screen.getByAltText('格局圖預覽：格局圖-floorplan.png')).toBeInTheDocument();
    });

    expect(screen.getByText('上傳成功')).toBeInTheDocument();
    expect(screen.getByText('已完成上傳，這是最新一張格局圖。')).toBeInTheDocument();
  });
});