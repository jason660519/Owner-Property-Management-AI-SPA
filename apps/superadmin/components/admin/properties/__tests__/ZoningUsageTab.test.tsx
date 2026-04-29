import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ZoningUsageTab } from '../ZoningUsageTab';
import type { LandTranscriptData, PropertyItem } from '@/lib/types/properties';
import type { TranscriptIntakeAreaDetailDraft } from '@/lib/transcript-parse/intake-types';
import {
  deletePropertyDocument,
  getDocumentParseResult,
  getPropertyDocuments,
  uploadPropertyDocument,
} from '@/lib/actions/properties';
import {
  getTaipeiZoningDistrictOptions,
  getTaipeiZoningLotOptions,
  getTaipeiZoningSectionOptions,
  getTaipeiZoningSubsectionOptions,
  queryTaipeiZoning,
  queryTaipeiZoningOfficialInput,
} from '@/lib/actions/taipei-zoning';
import { saveZoningQueryDocument } from '@/lib/actions/zoning-documents';

jest.mock('@/lib/actions/properties', () => ({
  getDocumentParseResult: jest.fn(),
  getPropertyDocuments: jest.fn(),
  uploadPropertyDocument: jest.fn(),
  deletePropertyDocument: jest.fn(),
}));

jest.mock('@/lib/actions/taipei-zoning', () => ({
  getTaipeiZoningDistrictOptions: jest.fn(),
  getTaipeiZoningLotOptions: jest.fn(),
  getTaipeiZoningSectionOptions: jest.fn(),
  getTaipeiZoningSubsectionOptions: jest.fn(),
  queryTaipeiZoning: jest.fn(),
  queryTaipeiZoningOfficialInput: jest.fn(),
}));

jest.mock('@/lib/actions/zoning-documents', () => ({
  saveZoningQueryDocument: jest.fn(),
}));

const mockGetPropertyDocuments = getPropertyDocuments as jest.MockedFunction<typeof getPropertyDocuments>;
const mockGetDocumentParseResult = getDocumentParseResult as jest.MockedFunction<typeof getDocumentParseResult>;
const mockUploadPropertyDocument = uploadPropertyDocument as jest.MockedFunction<typeof uploadPropertyDocument>;
const mockDeletePropertyDocument = deletePropertyDocument as jest.MockedFunction<typeof deletePropertyDocument>;
const mockGetTaipeiZoningDistrictOptions = getTaipeiZoningDistrictOptions as jest.MockedFunction<typeof getTaipeiZoningDistrictOptions>;
const mockGetTaipeiZoningLotOptions = getTaipeiZoningLotOptions as jest.MockedFunction<typeof getTaipeiZoningLotOptions>;
const mockGetTaipeiZoningSectionOptions = getTaipeiZoningSectionOptions as jest.MockedFunction<typeof getTaipeiZoningSectionOptions>;
const mockGetTaipeiZoningSubsectionOptions = getTaipeiZoningSubsectionOptions as jest.MockedFunction<typeof getTaipeiZoningSubsectionOptions>;
const mockQueryTaipeiZoning = queryTaipeiZoning as jest.MockedFunction<typeof queryTaipeiZoning>;
const mockQueryTaipeiZoningOfficialInput = queryTaipeiZoningOfficialInput as jest.MockedFunction<typeof queryTaipeiZoningOfficialInput>;
const mockSaveZoningQueryDocument = saveZoningQueryDocument as jest.MockedFunction<typeof saveZoningQueryDocument>;

function makeAreaDetails(): TranscriptIntakeAreaDetailDraft {
  return {
    version: 1,
    dispositionKind: 'unit_building_with_land_share_sale',
    parkingTitleRights: [],
    buildingAreas: [],
    landShareAreas: [
      {
        id: 'land-1',
        label: '基地持分',
        identifier: '仁愛段一小段 0091-0000地號',
        areaSqm: '1640',
        shareRatio: '20000分之157',
        use: '',
      },
      {
        id: 'land-2',
        label: '基地持分',
        identifier: '仁愛段一小段 0091-0002地號',
        areaSqm: '446',
        shareRatio: '20000分之157',
        use: '',
      },
    ],
    parkingBuildingAreas: [],
    parkingLandShareAreas: [],
  };
}

function makeLandTranscript(): LandTranscriptData {
  return {
    header: {
      transcriptType: '',
      documentTitle: '附中顛峰',
      printTime: '',
      pageInfo: '',
      printer: '',
      checkNumber: '',
      documentNumber: '',
      dataJurisdiction: '',
      issuingAuthority: '',
      transcriptNotes: '',
    },
    description: {
      landNumber: '懷生段二小段378地號',
      regDate: '',
      regReason: '',
      landCategory: '',
      grade: '',
      area: '',
      useZone: '',
      useCategory: '',
      announcedValueYear: '',
      announcedValuePerSqm: '',
      buildingsOnLand: '',
      notes: '',
    },
    ownership: [],
    encumbrances: [],
  };
}

function makeProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  const createdAt = '2026-04-30T00:00:00.000Z';
  return {
    id: 'property-1',
    type: 'sale',
    title: '測試物件',
    address: '台北市大安區仁愛路一段1號',
    addressDistrict: '大安區',
    status: 'draft',
    price: null,
    monthlyRent: null,
    ownerName: 'Owner',
    ownerId: 'owner-1',
    area: null,
    propertyType: null,
    bedrooms: null,
    bathrooms: null,
    livingRooms: null,
    parkingSpaces: null,
    landTranscript: makeLandTranscript(),
    transcriptIntakeAreaDetails: makeAreaDetails(),
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe('ZoningUsageTab', () => {
  let openSpy: jest.SpyInstance;
  let createObjectUrlSpy: jest.SpyInstance;
  let revokeObjectUrlSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: jest.fn(),
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: jest.fn(),
      });
    }
    openSpy = jest.spyOn(window, 'open').mockImplementation(() => ({}) as Window);
    createObjectUrlSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/zoning-preview');
    revokeObjectUrlSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    mockGetPropertyDocuments.mockResolvedValue([]);
    mockGetDocumentParseResult.mockResolvedValue(null);
    mockUploadPropertyDocument.mockResolvedValue({ success: true, message: '文件已上傳' });
    mockDeletePropertyDocument.mockResolvedValue({ success: true, message: '文件已刪除' });
    mockSaveZoningQueryDocument.mockResolvedValue({
      success: true,
      message: '使用分區查詢結果已儲存',
      document: {
        id: 'doc-auto-zoning',
        documentType: 'zoning_usage_certificate',
        documentName: '使用分區查詢-仁愛段一小段 0091-0000地號',
        filePath: 'property-1/zoning/auto.html',
        url: '/api/documents/doc-auto-zoning/view',
        createdAt: '2026-04-30T00:00:00.000Z',
        tags: ['zoning:auto'],
      },
    });
    mockGetTaipeiZoningDistrictOptions.mockResolvedValue([
      { id: '5', label: '大安區' },
      { id: '9', label: '信義區' },
    ]);
    mockGetTaipeiZoningSectionOptions.mockResolvedValue([
      { id: '2', label: '仁愛' },
      { id: '10', label: '懷生' },
      { id: '99', label: '信義' },
    ]);
    mockGetTaipeiZoningSubsectionOptions.mockResolvedValue([
      { id: '1', label: '一' },
      { id: '2', label: '二' },
    ]);
    mockGetTaipeiZoningLotOptions.mockResolvedValue([
      { id: '100-0', label: '100', motherNo: '100', childNo: '0' },
      { id: '100-1', label: '100-1', motherNo: '100', childNo: '1' },
    ]);
    mockQueryTaipeiZoningOfficialInput.mockImplementation(async (input) => ({
      success: true,
      message: input.mode === 'range' ? '查詢成功，共 2 筆資料' : '查詢成功',
      data: {
        zone: input.mode === 'range' ? '道路用地、第四種住宅區' : '第二種住宅區',
        note: '',
        raw: input.mode === 'range' ? [
          {
            行政區: '大安區',
            地段名稱: '信義',
            客製化小段名稱: '一',
            客製化地號: '21',
            AREMNO: '21',
            AREPNO: '0',
            使用分區: '道路用地',
            其他規定: '無',
          },
          {
            行政區: '大安區',
            地段名稱: '信義',
            客製化小段名稱: '一',
            客製化地號: '22',
            AREMNO: '22',
            AREPNO: '0',
            使用分區: '第四種住宅區',
            其他規定: '無',
          },
        ] : [{ 使用分區: '第二種住宅區', 其他規定: '無' }],
      },
    }));
    mockQueryTaipeiZoning.mockImplementation(async (landNumber) => ({
      success: true,
      message: '查詢成功',
      data: {
        zone: landNumber.includes('0002') ? '第三種住宅區' : '第二種住宅區',
        note: '',
        raw: [{ 使用分區: landNumber.includes('0002') ? '第三種住宅區' : '第二種住宅區' }],
      },
    }));
  });

  afterEach(() => {
    openSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it('uses confirmed transcript land parcels and queries each parcel separately', async () => {
    render(<ZoningUsageTab property={makeProperty()} />);

    expect((await screen.findAllByText('行政區')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText('查詢筆數')).toHaveValue('3');
    expect(screen.getAllByText('編號').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('地段').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('小段').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('地號').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('查詢方式').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('單筆地號(母號-子號)').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('查詢結果與預覽').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByLabelText('新增地號')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('單筆土地地號')).not.toBeInTheDocument();
    expect(screen.queryByText('單筆土地地號（含行政區、段、小段、號碼）')).not.toBeInTheDocument();
    expect(screen.getAllByText('尚未查詢')).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: '查詢' })).toHaveLength(3);
    expect(screen.queryByText('附中顛峰')).not.toBeInTheDocument();
    expect(screen.queryByText('編輯使用分區')).not.toBeInTheDocument();
    expect(screen.getByText('手動查詢並上傳使用分區檔案')).toBeInTheDocument();
    expect(screen.getByText('上傳使用分區證明／查詢結果')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /查詢全部地號/ }));

    await waitFor(() => {
      expect(mockQueryTaipeiZoning).toHaveBeenCalledTimes(3);
    });
    await waitFor(() => {
      expect(mockSaveZoningQueryDocument).toHaveBeenCalledTimes(3);
    });

    expect(mockQueryTaipeiZoning).toHaveBeenNthCalledWith(
      1,
      '仁愛段一小段 0091-0000地號',
      '大安區',
    );
    expect(mockQueryTaipeiZoning).toHaveBeenNthCalledWith(
      2,
      '仁愛段一小段 0091-0002地號',
      '大安區',
    );
    expect(mockQueryTaipeiZoning).toHaveBeenNthCalledWith(3, '懷生段二小段378地號', '大安區');
    expect(mockSaveZoningQueryDocument).toHaveBeenNthCalledWith(1, {
      propertyId: 'property-1',
      propertyType: 'sale',
      ownerId: 'owner-1',
      landNumber: '仁愛段一小段 0091-0000地號',
      html: expect.stringContaining('查詢來源'),
    });
    expect(screen.getAllByDisplayValue('仁愛段').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('一小段').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('0091').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('0000').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/第二種住宅區/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByDisplayValue('0002').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/第三種住宅區/).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText('使用分區查詢-仁愛段一小段 0091-0000地號.html')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '預覽檔案' })).toHaveLength(3);
    fireEvent.click(screen.getAllByRole('button', { name: '預覽檔案' })[0]);
    expect(createObjectUrlSpy).toHaveBeenCalledWith(expect.any(Blob));
    expect(openSpy).toHaveBeenCalledWith('blob:http://localhost/zoning-preview', '_blank');
    expect(screen.getAllByRole('button', { name: '刪除' })).toHaveLength(3);

    fireEvent.click(screen.getAllByRole('button', { name: '刪除' })[0]);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '預覽檔案' })).toHaveLength(2);
    });
  });

  it('builds preview HTML with source and query date', async () => {
    render(<ZoningUsageTab property={makeProperty()} />);

    fireEvent.click(screen.getByRole('button', { name: /查詢全部地號/ }));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: '預覽檔案' })).toHaveLength(3);
    });
    fireEvent.click(screen.getAllByRole('button', { name: '預覽檔案' })[0]);

    const blob = createObjectUrlSpy.mock.calls[0][0] as Blob;
    const html = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(html).toContain('查詢來源');
    expect(html).toContain('臺北市政府都市發展局使用分區查詢系統');
    expect(html).toContain('查詢日期');
  });

  it('lets users key in a missing land parcel and query it as a row', async () => {
    render(<ZoningUsageTab property={makeProperty()} />);

    fireEvent.change(await screen.findByLabelText('查詢筆數'), {
      target: { value: '4' },
    });

    await waitFor(() => {
      expect(mockGetTaipeiZoningDistrictOptions).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockGetTaipeiZoningSectionOptions).toHaveBeenCalledWith('5');
    });
    fireEvent.change(await screen.findByLabelText('新增地號地段'), {
      target: { value: '99' },
    });
    await waitFor(() => {
      expect(mockGetTaipeiZoningSubsectionOptions).toHaveBeenCalledWith('5', '99');
    });
    fireEvent.change(await screen.findByLabelText('新增地號小段'), {
      target: { value: '1' },
    });
    await waitFor(() => {
      expect(mockGetTaipeiZoningLotOptions).toHaveBeenCalledWith('5', '99', '1');
    });
    fireEvent.change(await screen.findByLabelText('新增地號地號'), {
      target: { value: '100-0' },
    });

    const queryButtons = screen.getAllByRole('button', { name: '查詢' });
    fireEvent.click(queryButtons[queryButtons.length - 1]);

    await waitFor(() => {
      expect(mockQueryTaipeiZoningOfficialInput).toHaveBeenCalledWith({
        label: '大安區信義段一小段 0100-0000地號',
        mode: 'single',
        secId: '5',
        sectionId: '99',
        subsectionId: '1',
        motherNo: '100',
        childNo: '0',
        rangeStartNo: undefined,
        rangeEndNo: undefined,
      });
    });
    expect(mockSaveZoningQueryDocument).toHaveBeenCalledWith({
      propertyId: 'property-1',
      propertyType: 'sale',
      ownerId: 'owner-1',
      landNumber: '大安區信義段一小段 0100-0000地號',
      html: expect.stringContaining('臺北市政府都市發展局使用分區查詢系統'),
    });
    expect(await screen.findByRole('button', { name: '預覽檔案' })).toBeInTheDocument();
    expect(screen.getByText('第二種住宅區')).toBeInTheDocument();
  });

  it('lets users type a range and query with the official range endpoint', async () => {
    render(<ZoningUsageTab property={makeProperty()} />);

    fireEvent.change(await screen.findByLabelText('查詢筆數'), {
      target: { value: '4' },
    });
    await waitFor(() => {
      expect(mockGetTaipeiZoningSectionOptions).toHaveBeenCalledWith('5');
    });
    fireEvent.change(await screen.findByLabelText('新增地號地段'), {
      target: { value: '99' },
    });
    await waitFor(() => {
      expect(mockGetTaipeiZoningSubsectionOptions).toHaveBeenCalledWith('5', '99');
    });
    fireEvent.change(await screen.findByLabelText('新增地號小段'), {
      target: { value: '1' },
    });
    fireEvent.change(await screen.findByLabelText('新增地號查詢方式'), {
      target: { value: 'range' },
    });
    fireEvent.change(await screen.findByLabelText('新增地號起號'), {
      target: { value: '21' },
    });
    fireEvent.change(await screen.findByLabelText('新增地號迄號'), {
      target: { value: '22' },
    });

    const queryButtons = screen.getAllByRole('button', { name: '查詢' });
    fireEvent.click(queryButtons[queryButtons.length - 1]);

    await waitFor(() => {
      expect(mockQueryTaipeiZoningOfficialInput).toHaveBeenCalledWith({
        label: '大安區信義段一小段 21~22地號',
        mode: 'range',
        secId: '5',
        sectionId: '99',
        subsectionId: '1',
        rangeStartNo: '21',
        rangeEndNo: '22',
      });
    });
    expect(mockSaveZoningQueryDocument).toHaveBeenCalledWith({
      propertyId: 'property-1',
      propertyType: 'sale',
      ownerId: 'owner-1',
      landNumber: '大安區信義段一小段 21~22地號',
      html: expect.stringContaining('查詢日期'),
    });
    expect(await screen.findByText('道路用地、第四種住宅區')).toBeInTheDocument();
    expect(screen.getByLabelText('新增地號起號')).toHaveValue('21');
    expect(screen.getByLabelText('新增地號起號')).not.toBeDisabled();
    fireEvent.change(screen.getByLabelText('新增地號起號'), {
      target: { value: '23' },
    });
    expect(screen.queryByText('道路用地、第四種住宅區')).not.toBeInTheDocument();
  });

  it('uploads manual zoning usage certificate files', async () => {
    render(<ZoningUsageTab property={makeProperty()} />);

    const file = new File(['zoning certificate'], '使用分區證明.pdf', { type: 'application/pdf' });
    const input = await screen.findByLabelText(/上傳使用分區證明檔案/);

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /^上傳$/ }));

    await waitFor(() => {
      expect(mockUploadPropertyDocument).toHaveBeenCalledWith(
        'property-1',
        'sale',
        'owner-1',
        'zoning_usage_certificate',
        expect.any(FormData),
      );
    });
    expect(await screen.findByText('文件已上傳')).toBeInTheDocument();
  });

  it('previews uploaded zoning usage certificate files inline', async () => {
    mockGetPropertyDocuments.mockResolvedValue([
      {
        id: 'doc-zoning',
        documentType: 'zoning_usage_certificate',
        documentName: '使用分區證明-官方查詢結果.pdf',
        filePath: 'property-1/zoning.pdf',
        url: '/api/documents/doc-zoning/view',
        createdAt: '2026-04-30T00:00:00.000Z',
        tags: null,
      },
    ]);
    render(<ZoningUsageTab property={makeProperty()} />);

    expect(await screen.findByText('使用分區證明-官方查詢結果.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '預覽' }));

    const preview = screen.getByTitle('使用分區上傳檔案預覽');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveAttribute('src', '/api/documents/doc-zoning/view');
  });
});
