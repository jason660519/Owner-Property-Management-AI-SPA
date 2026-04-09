import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PropertyGeographicInfoTab } from '../PropertyGeographicInfoTab';
import {
  fetchCadastralMap,
  deleteCadastralMap,
  listCadastralMapFiles,
  getGisFileUrl,
} from '@/lib/actions/cadastral-maps';

jest.mock('@/lib/actions/cadastral-maps', () => ({
  fetchCadastralMap: jest.fn(),
  deleteCadastralMap: jest.fn(),
  listCadastralMapFiles: jest.fn(),
  getGisFileUrl: jest.fn(),
}));

const mockFetch = fetchCadastralMap as jest.MockedFunction<typeof fetchCadastralMap>;
const mockDelete = deleteCadastralMap as jest.MockedFunction<typeof deleteCadastralMap>;
const mockListFiles = listCadastralMapFiles as jest.MockedFunction<typeof listCadastralMapFiles>;
const mockGetGisUrl = getGisFileUrl as jest.MockedFunction<typeof getGisFileUrl>;

function baseProperty(overrides: Partial<import('@/lib/types/properties').PropertyItem> = {}) {
  const createdAt = overrides.createdAt ?? new Date().toISOString();
  const updatedAt = overrides.updatedAt ?? createdAt;
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
    latitude: 25.033,
    longitude: 121.5654,
    ...overrides,
    createdAt,
    updatedAt,
  };
  return p;
}

describe('PropertyGeographicInfoTab', () => {
  let fetchSeq = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
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
    mockListFiles.mockResolvedValue({ data: [], error: null });
    mockGetGisUrl.mockResolvedValue({ url: null, error: 'not used' });
  });

  it('restores loading state from sessionStorage (e.g. returning to this tab)', async () => {
    sessionStorage.setItem(
      'gis-fetch-pending:prop-1',
      JSON.stringify({ cadastral: Date.now() - 8000 }),
    );
    render(<PropertyGeographicInfoTab property={baseProperty()} />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^擷取地籍圖$/ })).toBeDisabled();
    });
    expect(screen.getByText(/進行中 · 已/)).toBeInTheDocument();
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

  it('supports parallel fetches across presets while blocking duplicate clicks per preset', async () => {
    const user = userEvent.setup();
    let resolveFirstFetch: (v: Awaited<ReturnType<typeof mockFetch>>) => void;
    let resolveSecondFetch: (v: Awaited<ReturnType<typeof mockFetch>>) => void;
    const firstFetchPromise = new Promise<Awaited<ReturnType<typeof mockFetch>>>((r) => {
      resolveFirstFetch = r;
    });
    const secondFetchPromise = new Promise<Awaited<ReturnType<typeof mockFetch>>>((r) => {
      resolveSecondFetch = r;
    });
    mockFetch
      .mockReturnValueOnce(firstFetchPromise as never)
      .mockReturnValueOnce(secondFetchPromise as never);

    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    const cadastralBtn = screen.getByRole('button', { name: /^擷取地籍圖$/ });
    const buildingBtn = screen.getByRole('button', { name: /^擷取建物套繪圖$/ });

    await user.click(cadastralBtn);
    expect(cadastralBtn).toBeDisabled();
    expect(buildingBtn).not.toBeDisabled();
    expect(screen.getAllByRole('button', { name: /^擷取/ })).toHaveLength(3);

    await user.click(cadastralBtn);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    await user.click(buildingBtn);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(buildingBtn).toBeDisabled();

    resolveFirstFetch!({
      success: true,
      message: 'ok',
      url: 'https://signed.example/done-cadastral.jpg',
      storagePath: 'prop-1/gis-done-cadastral.jpg',
      documentId: 'doc-done-cadastral',
      source: 'historygis',
      fetchedAt: new Date().toISOString(),
    });
    resolveSecondFetch!({
      success: true,
      message: 'ok',
      url: 'https://signed.example/done-building.jpg',
      storagePath: 'prop-1/gis-done-building.jpg',
      documentId: 'doc-done-building',
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

  it('clears per-layer outcome when 清除擷取紀錄 is clicked', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    const user = userEvent.setup();
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    await user.click(screen.getByRole('button', { name: /^擷取地籍圖$/ }));

    await waitFor(() => {
      expect(screen.getByText(/擷取失敗：network down/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /^清除擷取紀錄$/ }));

    expect(screen.queryByText(/擷取失敗：network down/)).not.toBeInTheDocument();
  });

  it('cloud list 刪除 calls deleteCadastralMap', async () => {
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
    mockListFiles.mockResolvedValue({
      data: [
        {
          id: 'doc-1',
          name: '建物套繪圖-測試',
          filePath: 'prop-1/gis-1.jpg',
          createdAt: new Date().toISOString(),
          tags: [],
        },
      ],
      error: null,
    });
    const user = userEvent.setup();
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    const deleteBtn = await screen.findByTitle('刪除');
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('doc-1', 'prop-1/gis-1.jpg');
    });
    confirmSpy.mockRestore();
  });
});
