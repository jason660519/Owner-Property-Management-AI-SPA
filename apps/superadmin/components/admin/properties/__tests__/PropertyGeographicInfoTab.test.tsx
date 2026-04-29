import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { PropertyGeographicInfoTab } from '../PropertyGeographicInfoTab';
import {
  deleteCadastralMap,
  listCadastralMapFiles,
  getGisFileUrl,
  uploadManualCadastralMapFile,
} from '@/lib/actions/cadastral-maps';

jest.mock('@/lib/actions/cadastral-maps', () => ({
  deleteCadastralMap: jest.fn(),
  listCadastralMapFiles: jest.fn(),
  getGisFileUrl: jest.fn(),
  uploadManualCadastralMapFile: jest.fn(),
}));

const mockDelete = deleteCadastralMap as jest.MockedFunction<typeof deleteCadastralMap>;
const mockListFiles = listCadastralMapFiles as jest.MockedFunction<typeof listCadastralMapFiles>;
const mockGetGisUrl = getGisFileUrl as jest.MockedFunction<typeof getGisFileUrl>;
const mockUploadManual = uploadManualCadastralMapFile as jest.MockedFunction<typeof uploadManualCadastralMapFile>;

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
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    mockDelete.mockResolvedValue({ success: true, message: '已刪除' });
    mockListFiles.mockResolvedValue({ data: [], error: null });
    mockGetGisUrl.mockResolvedValue({ url: null, error: 'not used' });
    mockUploadManual.mockResolvedValue({
      success: true,
      message: 'GIS 圖資已上傳',
      documentId: 'doc-manual',
      storagePath: 'prop-1/gis-manual-cadastral.pdf',
    });
  });

  it('restores automatic generation loading state from sessionStorage', async () => {
    sessionStorage.setItem(
      'gis-fetch-pending:prop-1',
      JSON.stringify({ cadastral: Date.now() - 8000 }),
    );
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    expect(await screen.findByText(/產出中 · 已/)).toBeInTheDocument();
    expect(screen.getAllByText('建物套繪圖').length).toBeGreaterThan(0);
    expect(screen.getAllByText('地籍圖 + 建物套繪圖').length).toBeGreaterThan(0);
  });

  it('shows official GIS links and the manual upload area at the bottom', async () => {
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    expect(await screen.findByText('GIS 圖資查詢與檔案')).toBeInTheDocument();
    expect(screen.getAllByText('地址').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/大安區\s+測試路1號/)).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: /歷史圖資展示系統/ })).toHaveAttribute(
      'href',
      'https://historygis.udd.gov.taipei',
    );
    expect(screen.getByRole('link', { name: /地理資訊e點通/ })).toHaveAttribute(
      'href',
      'https://addr.gov.taipei',
    );
    expect(screen.getByRole('button', { name: '上傳 GIS 圖資' })).toBeDisabled();
  });

  it('groups address and three GIS files into one row with preview and delete actions', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    mockGetGisUrl.mockResolvedValue({ url: 'https://signed.example/gis.jpg', error: null });
    mockListFiles.mockResolvedValue({
      data: [
        {
          id: 'doc-cadastral',
          name: '地籍圖-歷史圖資展示系統',
          filePath: 'prop-1/gis-cadastral.jpg',
          createdAt: '2026-04-30T00:00:00.000Z',
          tags: ['gis:cadastral', 'source:historygis'],
        },
        {
          id: 'doc-building',
          name: '建物套繪圖-歷史圖資展示系統',
          filePath: 'prop-1/gis-building.jpg',
          createdAt: '2026-04-30T00:01:00.000Z',
          tags: ['gis:building', 'source:historygis'],
        },
        {
          id: 'doc-both',
          name: '地籍圖+建物套繪圖-歷史圖資展示系統',
          filePath: 'prop-1/gis-both.jpg',
          createdAt: '2026-04-30T00:02:00.000Z',
          tags: ['gis:both', 'source:historygis'],
        },
      ],
      error: null,
    });
    const user = userEvent.setup();
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    expect(await screen.findByText('地籍圖-歷史圖資展示系統')).toBeInTheDocument();
    expect(screen.getByText('建物套繪圖-歷史圖資展示系統')).toBeInTheDocument();
    expect(screen.getByText('地籍圖+建物套繪圖-歷史圖資展示系統')).toBeInTheDocument();
    expect(screen.getAllByTitle('預覽')).toHaveLength(3);
    expect(screen.getAllByTitle('刪除')).toHaveLength(3);

    await user.click(screen.getAllByTitle('預覽')[0]);

    await waitFor(() => {
      expect(mockGetGisUrl).toHaveBeenCalledWith('prop-1/gis-cadastral.jpg');
    });
    expect(openSpy).toHaveBeenCalledWith('https://signed.example/gis.jpg', '_blank');
    openSpy.mockRestore();
  });

  it('uploads a manual GIS file as cadastral_map metadata', async () => {
    const user = userEvent.setup();
    render(<PropertyGeographicInfoTab property={baseProperty()} />);

    await user.selectOptions(screen.getByLabelText('GIS 圖資類型'), 'both');
    await user.upload(
      screen.getByLabelText('上傳 GIS 圖資檔案'),
      new File(['gis'], 'manual-gis.pdf', { type: 'application/pdf' }),
    );
    await user.click(screen.getByRole('button', { name: '上傳 GIS 圖資' }));

    await waitFor(() => {
      expect(mockUploadManual).toHaveBeenCalledWith(
        'prop-1',
        'sale',
        'owner-1',
        'both',
        expect.any(FormData),
      );
    });
    expect(await screen.findByText('GIS 圖資已上傳')).toBeInTheDocument();
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
