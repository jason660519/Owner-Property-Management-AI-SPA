import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { PropertyEditForm } from '../PropertyEditForm';
import { updateProperty } from '@/lib/actions/properties';
import { fetchCadastralMap } from '@/lib/actions/cadastral-maps';
import type { PropertyItem } from '@/lib/types/properties';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh,
  }),
  useSearchParams: () => new URLSearchParams('tab=edit'),
}));

jest.mock('@/lib/actions/properties', () => ({
  updateProperty: jest.fn(),
}));

jest.mock('@/lib/actions/cadastral-maps', () => ({
  fetchCadastralMap: jest.fn(),
}));

jest.mock('../TranscriptTabContent', () => ({
  TranscriptTabContent: () => <div data-testid="transcript-tab-content" />,
}));

const mockUpdateProperty = updateProperty as jest.MockedFunction<typeof updateProperty>;
const mockFetchCadastralMap = fetchCadastralMap as jest.MockedFunction<typeof fetchCadastralMap>;

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
  });

  it('automatically generates the three GIS documents after saving basic info', async () => {
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
    expect(await screen.findByText('基本資料已儲存，3 份 GIS 圖資已自動產出。')).toBeInTheDocument();
  });
});
