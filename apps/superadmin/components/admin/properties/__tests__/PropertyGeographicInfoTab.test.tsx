import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PropertyGeographicInfoTab } from '../PropertyGeographicInfoTab';
import { fetchCadastralMap, deleteCadastralMap } from '@/lib/actions/cadastral-maps';

jest.mock('@/lib/actions/cadastral-maps', () => ({
  fetchCadastralMap: jest.fn(),
  deleteCadastralMap: jest.fn(),
}));

jest.mock('@/lib/actions/properties', () => ({
  updateProperty: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

const mockFetch = fetchCadastralMap as jest.MockedFunction<typeof fetchCadastralMap>;
const mockDelete = deleteCadastralMap as jest.MockedFunction<typeof deleteCadastralMap>;

function baseProperty(overrides: Partial<import('@/lib/types/properties').PropertyItem> = {}) {
  const p: import('@/lib/types/properties').PropertyItem = {
    id: 'prop-1',
    type: 'sale',
    title: '測試物件',
    address: '台北市大安區測試路1號',
    addressDistrict: '大安區',
    addressStreet: '測試路',
    addressNumber: '1號',
    status: 'active',
    price: 1000,
    monthlyRent: null,
    ownerName: 'Owner',
    ownerId: 'owner-1',
    area: 30,
    propertyType: 'suite',
    bedrooms: 1,
    bathrooms: 1,
    livingRooms: 1,
    parkingSpaces: 0,
    createdAt: new Date().toISOString(),
    latitude: 25.033,
    longitude: 121.5654,
    ...overrides,
  };
  return p;
}

describe('PropertyGeographicInfoTab', () => {
  let fetchSeq = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchSeq = 0;
    mockFetch.mockImplementation(async () => {
      fetchSeq += 1;
      return {
        success: true,
        message: 'ok',
        url: `https://signed.example/map-${fetchSeq}.jpg`,
        storagePath: `prop-1/gis-${fetchSeq}.jpg`,
        documentId: `doc-${fetchSeq}`,
        source: 'historygis',
        fetchedAt: new Date(1_700_000_000_000 + fetchSeq).toISOString(),
      };
    });
    mockDelete.mockResolvedValue({ success: true, message: '已刪除' });
  });

  it('invokes fetchCadastralMap with historygis and cadastral preset when 地籍圖 is clicked', async () => {
    const user = userEvent.setup();
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    await user.click(screen.getByRole('button', { name: /^擷取地籍圖$/ }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'prop-1',
        'sale',
        'owner-1',
        'cadastral',
        { latitude: 25.033, longitude: 121.5654 },
        null,
        { source: 'historygis' },
      );
    });
  });

  it('invokes fetchCadastralMap with epoint when e點通 source is selected (all three presets)', async () => {
    const user = userEvent.setup();
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    await user.click(screen.getByRole('button', { name: /地理資訊e點通/ }));

    await user.click(screen.getByRole('button', { name: /^擷取地籍圖$/ }));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith(
        'prop-1',
        'sale',
        'owner-1',
        'cadastral',
        { latitude: 25.033, longitude: 121.5654 },
        null,
        { source: 'epoint' },
      ),
    );

    await user.click(screen.getByRole('button', { name: /^擷取建物套繪圖$/ }));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith(
        'prop-1',
        'sale',
        'owner-1',
        'building',
        { latitude: 25.033, longitude: 121.5654 },
        null,
        { source: 'epoint' },
      ),
    );

    await user.click(screen.getByRole('button', { name: /^擷取地籍圖 \+ 建物套繪圖$/ }));
    await waitFor(() =>
      expect(mockFetch).toHaveBeenLastCalledWith(
        'prop-1',
        'sale',
        'owner-1',
        'both',
        { latitude: 25.033, longitude: 121.5654 },
        null,
        { source: 'epoint' },
      ),
    );
  });

  it('only the clicked preset shows spinner; double-click does not fire twice', async () => {
    const user = userEvent.setup();
    let resolveFetch: (v: Awaited<ReturnType<typeof mockFetch>>) => void;
    const fetchPromise = new Promise<Awaited<ReturnType<typeof mockFetch>>>((r) => {
      resolveFetch = r;
    });
    mockFetch.mockReturnValueOnce(fetchPromise as never);

    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    const cadastralBtn = screen.getByRole('button', { name: /^擷取地籍圖$/ });
    const buildingBtn = screen.getByRole('button', { name: /^擷取建物套繪圖$/ });

    await user.click(cadastralBtn);
    expect(cadastralBtn).toBeDisabled();
    expect(buildingBtn).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /^擷取/ })).toHaveLength(3);

    await user.click(cadastralBtn);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    resolveFetch!({
      success: true,
      message: 'ok',
      url: 'https://signed.example/done.jpg',
      storagePath: 'prop-1/gis-done.jpg',
      documentId: 'doc-done',
      source: 'historygis',
      fetchedAt: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(cadastralBtn).not.toBeDisabled();
      expect(buildingBtn).not.toBeDisabled();
    });
  });

  it('clears spinner and shows error when fetchCadastralMap throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    await user.click(screen.getByRole('button', { name: /^擷取地籍圖$/ }));

    await waitFor(() => {
      expect(screen.getByText(/擷取失敗：network down/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^擷取地籍圖$/ })).not.toBeDisabled();
  });

  it('shows result card with 刪除 and calls deleteCadastralMap', async () => {
    const user = userEvent.setup();
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    await user.click(screen.getByRole('button', { name: /^擷取建物套繪圖$/ }));

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const deleteBtn = await screen.findByRole('button', { name: /刪除此筆[:：]建物套繪圖/ });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('doc-1', 'prop-1/gis-1.jpg');
    });
  });
});
