// filepath: apps/superadmin/lib/actions/__tests__/cadastral-maps.test.ts
import { fetchCadastralMap } from '../cadastral-maps';

// ── Mocks ─────────────────────────────────────────────────────────────────

const mockUpload = jest.fn();
const mockRemove = jest.fn();
const mockCreateSignedUrl = jest.fn();

// Supabase chaining: .insert(data).select('id').single()
let insertResult: { data: { id: string } | null; error: { message: string } | null } = {
  data: { id: 'doc-001' },
  error: null,
};

const mockInsertPayload = jest.fn();

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
    from: () => ({
      insert: (payload: unknown) => {
        mockInsertPayload(payload);
        return {
          select: () => ({
            single: () => Promise.resolve(insertResult),
          }),
        };
      },
    }),
  }),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

const mockExportMapByWgs84 = jest.fn();
const mockExportMapByAddress = jest.fn();

jest.mock('@/lib/utils/cadastral-map-fetcher', () => ({
  ...jest.requireActual('@/lib/utils/cadastral-map-fetcher'),
  exportMapByWgs84: (...args: unknown[]) => mockExportMapByWgs84(...args),
  exportMapByAddress: (...args: unknown[]) => mockExportMapByAddress(...args),
}));

// ── Tests ─────────────────────────────────────────────────────────────────

describe('fetchCadastralMap', () => {
  const fakeImageBuffer = Buffer.from('fake-jpg-data');

  beforeEach(() => {
    jest.clearAllMocks();
    insertResult = { data: { id: 'doc-001' }, error: null };

    mockExportMapByWgs84.mockResolvedValue({
      imageBuffer: fakeImageBuffer,
      mimeType: 'image/jpeg',
      label: '地籍圖+建物套繪圖',
    });

    mockUpload.mockResolvedValue({ error: null });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://supabase.local/storage/v1/object/sign/property-documents/test.jpg?token=abc' },
      error: null,
    });
  });

  it('returns signed URL, documentId, source, and fetchedAt on success', async () => {
    const result = await fetchCadastralMap(
      'prop-123', 'sale', 'owner-456', 'both',
      { latitude: 25.039907, longitude: 121.553673 },
      null,
      { source: 'historygis' },
    );

    expect(result.success).toBe(true);
    expect(mockCreateSignedUrl).toHaveBeenCalledWith(
      expect.stringContaining('gis-cadastral-building-'),
      3600,
    );
    expect(result.url).toContain('sign');
    expect(result.documentId).toBe('doc-001');
    expect(result.source).toBe('historygis');
    expect(result.fetchedAt).toBeDefined();
  });

  it('uploads with correct content type', async () => {
    await fetchCadastralMap(
      'prop-123', 'sale', 'owner-456', 'cadastral',
      { latitude: 25.039907, longitude: 121.553673 },
    );

    expect(mockUpload).toHaveBeenCalledWith(
      expect.stringContaining('gis-cadastral-'),
      fakeImageBuffer,
      expect.objectContaining({ contentType: 'image/jpeg' }),
    );
  });

  it('tags document with source system', async () => {
    await fetchCadastralMap(
      'prop-123', 'sale', 'owner-456', 'building',
      { latitude: 25, longitude: 121 },
      null,
      { source: 'epoint' },
    );

    expect(mockInsertPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: expect.arrayContaining(['source:epoint']),
        document_name: expect.stringContaining('地理資訊e點通'),
      }),
    );
  });

  it('cleans up storage on document insert failure', async () => {
    insertResult = { data: null, error: { message: 'insert failed' } };

    const result = await fetchCadastralMap(
      'prop-123', 'sale', 'owner-456', 'both',
      { latitude: 25, longitude: 121 },
    );

    expect(result.success).toBe(false);
    expect(mockRemove).toHaveBeenCalled();
  });

  it('returns error when no coords or address provided', async () => {
    const result = await fetchCadastralMap(
      'prop-123', 'sale', 'owner-456', 'both',
      null, null,
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain('缺少座標或地址');
  });

  it('calls exportMapByWgs84 with source for every layer preset (historygis + epoint matrix)', async () => {
    const presets = ['cadastral', 'building', 'both'] as const;
    const sources = ['historygis', 'epoint'] as const;

    for (const layers of presets) {
      for (const source of sources) {
        jest.clearAllMocks();
        await fetchCadastralMap(
          'prop-123',
          'sale',
          'owner-456',
          layers,
          { latitude: 25.033, longitude: 121.5654 },
          null,
          { source },
        );
        expect(mockExportMapByWgs84).toHaveBeenCalledTimes(1);
        expect(mockExportMapByWgs84).toHaveBeenCalledWith(
          { latitude: 25.033, longitude: 121.5654 },
          expect.objectContaining({ layers, source }),
        );
        expect(mockExportMapByAddress).not.toHaveBeenCalled();
      }
    }
  });
});
