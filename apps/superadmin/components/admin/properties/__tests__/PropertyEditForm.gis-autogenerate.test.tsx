import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PropertyEditForm } from '../PropertyEditForm';
import { updateProperty } from '@/lib/actions/properties';
import { fetchCadastralMap, type FetchResult } from '@/lib/actions/cadastral-maps';
import { generateTransactionComparableDocuments } from '@/lib/actions/transaction-comparables';
import type { PropertyItem } from '@/lib/types/properties';
import { transactionComparablesFeedbackStorageKey } from '../transaction-comparables-pending-storage';

const refresh = jest.fn();
let searchParamsValue = 'tab=edit';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh,
  }),
  useSearchParams: () => new URLSearchParams(searchParamsValue),
}));

jest.mock('@/lib/actions/properties', () => ({
  updateProperty: jest.fn(),
}));

jest.mock('@/lib/actions/cadastral-maps', () => ({
  fetchCadastralMap: jest.fn(),
}));

jest.mock('@/lib/actions/transaction-comparables', () => ({
  generateTransactionComparableDocuments: jest.fn(),
}));

jest.mock('../TranscriptTabContent', () => ({
  TranscriptTabContent: () => <div data-testid="transcript-tab-content" />,
}));

jest.mock('../PropertyIntroductionTab', () => ({
  PropertyIntroductionTab: () => <div data-testid="property-introduction-tab" />,
}));

const mockUpdateProperty = updateProperty as jest.MockedFunction<typeof updateProperty>;
const mockFetchCadastralMap = fetchCadastralMap as jest.MockedFunction<typeof fetchCadastralMap>;
const mockGenerateTransactionComparableDocuments =
  generateTransactionComparableDocuments as jest.MockedFunction<typeof generateTransactionComparableDocuments>;

function makeProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  const createdAt = overrides.createdAt ?? new Date().toISOString();
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    id: 'prop-1',
    type: 'sale',
    title: '測試物件',
    address: '台北市大安區測試路1號',
    addressCity: '台北市',
    addressDistrict: '大安區',
    addressStreet: '測試路',
    addressNumber: '1號',
    addressFloor: '',
    addressUnit: '',
    status: 'for_sale',
    price: 1000,
    monthlyRent: null,
    creatorName: 'tester',
    ownerName: '王小明',
    ownerId: 'owner-1',
    area: 30,
    propertyType: '套房',
    bedrooms: 1,
    bathrooms: 1,
    livingRooms: 1,
    parkingSpaces: 0,
    latitude: 25.033,
    longitude: 121.5654,
    delistedAt: null,
    mainPhotoUrl: null,
    buildingTranscript: null,
    landTranscript: null,
    ...overrides,
    createdAt,
    updatedAt,
  };
}

describe('PropertyEditForm GIS auto generation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    searchParamsValue = 'tab=edit';
    mockUpdateProperty.mockResolvedValue({ success: true, message: '已儲存' });
    mockFetchCadastralMap.mockImplementation(async (_propertyId, _propertyType, _ownerId, layers) => ({
      success: true,
      message: 'ok',
      url: `https://signed.example/${layers}.jpg`,
      storagePath: `prop-1/${layers}.jpg`,
      documentId: `doc-${layers}`,
      source: 'historygis',
      fetchedAt: new Date().toISOString(),
    }));
    mockGenerateTransactionComparableDocuments.mockResolvedValue({
      success: true,
      message: '已產出並儲存成交行情 PDF（附近／同街段）。',
      generated: ['nearby', 'street_section'],
    });
  });

  it('automatically generates GIS documents and transaction comparables after saving basic info', async () => {
    const user = userEvent.setup();
    render(<PropertyEditForm property={makeProperty()} />);

    await user.click(screen.getByRole('button', { name: '儲存變更' }));

    await waitFor(() => {
      expect(mockUpdateProperty).toHaveBeenCalledWith(
        'prop-1',
        'sale',
        expect.objectContaining({
          title: '測試物件',
          latitude: 25.033,
          longitude: 121.5654,
        }),
      );
    });

    await waitFor(() => {
      expect(mockFetchCadastralMap).toHaveBeenCalledTimes(3);
    });
    expect(mockGenerateTransactionComparableDocuments).toHaveBeenCalledWith('prop-1');

    expect(mockFetchCadastralMap).toHaveBeenNthCalledWith(
      1,
      'prop-1',
      'sale',
      'owner-1',
      'cadastral',
      { latitude: 25.033, longitude: 121.5654 },
      null,
      { source: 'historygis', replaceExisting: true },
    );
    expect(mockFetchCadastralMap).toHaveBeenNthCalledWith(
      2,
      'prop-1',
      'sale',
      'owner-1',
      'building',
      { latitude: 25.033, longitude: 121.5654 },
      null,
      { source: 'historygis', replaceExisting: true },
    );
    expect(mockFetchCadastralMap).toHaveBeenNthCalledWith(
      3,
      'prop-1',
      'sale',
      'owner-1',
      'both',
      { latitude: 25.033, longitude: 121.5654 },
      null,
      { source: 'historygis', replaceExisting: true },
    );
    expect(
      await screen.findByText(
        '基本資料已儲存；3 份 GIS 圖資已自動產出；2 份成交行情表已自動產出，請到「成交行情表」預覽及下載。',
      ),
    ).toBeInTheDocument();
    expect(sessionStorage.getItem(transactionComparablesFeedbackStorageKey('prop-1'))).toContain(
      '2 份成交行情表已自動產出，已儲存到資料庫，重新整理後仍會保留。',
    );
  });

  it('shows page guidance while post-save documents are being generated', async () => {
    let resolveFetch: (result: FetchResult) => void = () => {};
    const fetchPromise = new Promise<FetchResult>((resolve) => {
      resolveFetch = resolve;
    });
    mockFetchCadastralMap.mockReturnValue(fetchPromise);
    const user = userEvent.setup();
    render(<PropertyEditForm property={makeProperty()} />);

    await user.click(screen.getByRole('button', { name: '儲存變更' }));

    expect(
      await screen.findByText(
        '基本資料已儲存，正在地理資訊頁面自動產出地籍圖、建物套繪圖與合併圖，並在成交行情表頁面自動產出附近成交價與同街段成交價。您亦可前往各頁面觀察、預覽及下載結果。',
      ),
    ).toBeInTheDocument();

    resolveFetch({
      success: true,
      message: 'ok',
      url: 'https://signed.example/gis.jpg',
      storagePath: 'prop-1/gis.jpg',
      documentId: 'doc-gis',
      source: 'historygis',
      fetchedAt: new Date().toISOString(),
    });
    await waitFor(() => {
      expect(
        screen.getByText(
          '基本資料已儲存；3 份 GIS 圖資已自動產出；2 份成交行情表已自動產出，請到「成交行情表」預覽及下載。',
        ),
      ).toBeInTheDocument();
    });
  });

  it('does not generate GIS documents when saving from non-basic-info tabs', async () => {
    searchParamsValue = 'tab=introduction';
    const user = userEvent.setup();
    render(<PropertyEditForm property={makeProperty()} />);

    await user.click(screen.getByRole('button', { name: '儲存變更' }));

    await waitFor(() => {
      expect(mockUpdateProperty).toHaveBeenCalledTimes(1);
    });
    expect(mockFetchCadastralMap).not.toHaveBeenCalled();
    expect(mockGenerateTransactionComparableDocuments).not.toHaveBeenCalled();
    expect(await screen.findByText('已儲存')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
