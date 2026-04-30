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
import {
  generateManualTransactionComparableDocument,
} from '@/lib/actions/transaction-comparables';
import {
  transactionComparablesFeedbackStorageKey,
  transactionComparablesPendingStorageKey,
} from '../transaction-comparables-pending-storage';

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

jest.mock('@/lib/actions/transaction-comparables', () => ({
  generateManualTransactionComparableDocument: jest.fn(),
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
const mockGenerateManualTransactionComparableDocument =
  generateManualTransactionComparableDocument as jest.MockedFunction<typeof generateManualTransactionComparableDocument>;

describe('PropertyMediaSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockGetPropertyPhotos.mockResolvedValue([]);
    mockGetPropertyDocuments.mockResolvedValue([]);
    mockUploadPropertyDocument.mockResolvedValue({ success: true, message: '文件已上傳' });
    mockDeletePropertyDocument.mockResolvedValue({ success: true, message: '文件已刪除' });
    mockCreatePhotoUploadUrl.mockResolvedValue({ success: true, message: 'ok', signedUrl: 'https://example.com', storagePath: 'photo-path' });
    mockDeletePropertyPhoto.mockResolvedValue({ success: true, message: '照片已刪除' });
    mockSavePhotoMetadata.mockResolvedValue({ success: true, message: '照片已儲存' });
    mockUpdatePhotoSortOrder.mockResolvedValue({ success: true, message: '排序已更新' });
    mockGenerateManualTransactionComparableDocument.mockResolvedValue({ success: true, message: '手動查詢附近成交價產出成功' });

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

  it('shows elapsed time when transaction comparable generation is pending', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(10_000);
    sessionStorage.setItem(
      transactionComparablesPendingStorageKey('property-1'),
      JSON.stringify({ nearby: 5_000, street_section: 7_000 }),
    );

    render(
      <PropertyMediaSection
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        mode="transaction_comparables"
      />,
    );

    expect(await screen.findByText('產出中 · 已 5 秒')).toBeInTheDocument();
    expect(
      await screen.findByText('成交行情表產出中，已花費 5 秒。完成後會自動儲存到資料庫，重新整理頁面後仍會保留。'),
    ).toBeInTheDocument();

    jest.restoreAllMocks();
  });

  it('refreshes persisted transaction comparable documents after manual search', async () => {
    const user = userEvent.setup();
    mockGetPropertyDocuments
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 'doc-nearby',
          documentType: 'transaction_comparables_nearby',
          documentName: '附近成交價-2026-05-01',
          filePath: 'property-1/comparable-nearby.pdf',
          url: '/api/documents/doc-nearby/view',
        },
      ]);

    render(
      <PropertyMediaSection
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        mode="transaction_comparables"
      />,
    );

    await user.click(await screen.findByRole('button', { name: '搜尋' }));

    await waitFor(() => {
      expect(mockGenerateManualTransactionComparableDocument).toHaveBeenCalledWith(
        'property-1',
        expect.objectContaining({
          mode: 'nearby',
          radiusKm: 1,
        }),
      );
    });
    await waitFor(() => {
      expect(mockGetPropertyDocuments).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByText(/手動查詢附近成交價產出成功，已儲存到資料庫，重新整理後仍會保留。/)).toBeInTheDocument();
    expect(await screen.findByTitle('成交行情表 PDF 預覽：附近成交價-2026-05-01')).toBeInTheDocument();
    const generatedDocumentName = await screen.findByText('附近成交價-2026-05-01');
    const manualQueryHeading = screen.getByText('手動查詢成交行情');
    expect(
      generatedDocumentName.compareDocumentPosition(manualQueryHeading) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders LVR-style manual query fields and submits selected filters', async () => {
    const user = userEvent.setup();
    render(
      <PropertyMediaSection
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        mode="transaction_comparables"
      />,
    );

    expect(await screen.findByText('手動查詢成交行情')).toBeInTheDocument();
    expect(screen.getByText('類型')).toBeInTheDocument();
    expect(screen.getByText('搜尋模式')).toBeInTheDocument();
    expect(screen.getByText('區段位置或門牌')).toBeInTheDocument();
    expect(screen.getByText('街道')).toBeInTheDocument();
    expect(screen.getByText('地段')).toBeInTheDocument();
    expect(screen.getByText('交易期間')).toBeInTheDocument();
    expect(screen.queryByText('上傳成交行情表')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByDisplayValue('1 km'), '3');
    await user.type(screen.getByPlaceholderText('例：敦化南路、仁愛段、門牌關鍵字'), '敦化南路');
    await user.type(screen.getByPlaceholderText('例：敦化南路四段'), '敦化南路四段');
    await user.click(screen.getByRole('button', { name: '搜尋' }));

    await waitFor(() => {
      expect(mockGenerateManualTransactionComparableDocument).toHaveBeenCalledWith(
        'property-1',
        expect.objectContaining({
          mode: 'nearby',
          radiusKm: 3,
          addressKeyword: '敦化南路',
          street: '敦化南路四段',
        }),
      );
    });
  });

  it('restores transaction comparable completion feedback until dismissed', async () => {
    const user = userEvent.setup();
    sessionStorage.setItem(
      transactionComparablesFeedbackStorageKey('property-1'),
      JSON.stringify({
        type: 'success',
        message: '2 份成交行情表已自動產出，已儲存到資料庫，重新整理後仍會保留。',
        at: 10_000,
      }),
    );

    render(
      <PropertyMediaSection
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        mode="transaction_comparables"
      />,
    );

    expect(
      await screen.findByText('2 份成交行情表已自動產出，已儲存到資料庫，重新整理後仍會保留。'),
    ).toBeInTheDocument();

    await user.click(screen.getByTitle('關閉提示'));

    expect(
      screen.queryByText('2 份成交行情表已自動產出，已儲存到資料庫，重新整理後仍會保留。'),
    ).not.toBeInTheDocument();
    expect(sessionStorage.getItem(transactionComparablesFeedbackStorageKey('property-1'))).toBeNull();
  });
});
