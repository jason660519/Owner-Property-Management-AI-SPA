import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PropertyBlogGenerator } from '../PropertyBlogGenerator';
import { generatePropertyBlog, getPropertyBlogVariants } from '@/lib/actions/blog';
import { getPlatformPost } from '@/lib/actions/integrations';
import type { PropertyItem } from '@/lib/types/properties';
import { loadLatestCloudDraft, saveCloudDraft } from '@/lib/utils/form-draft-cloud';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';

jest.mock('@/lib/actions/blog', () => ({
  generatePropertyBlog: jest.fn(),
  getPropertyBlogVariants: jest.fn(),
}));

jest.mock('@/lib/actions/integrations', () => ({
  getPlatformPost: jest.fn(),
}));

jest.mock('@/lib/utils/form-draft-cloud', () => ({
  loadLatestCloudDraft: jest.fn(),
  saveCloudDraft: jest.fn(),
}));

jest.mock('@/lib/utils/storage-state', () => ({
  readLocalStorage: jest.fn(),
  writeLocalStorage: jest.fn(),
}));

jest.mock('../BlogSupabasePanel', () => ({
  BlogSupabasePanel: ({ blog, loading }: { blog: unknown; loading: boolean }) => (
    <div data-testid="supabase-panel">supabase:{loading ? 'loading' : blog ? 'has-blog' : 'no-blog'}</div>
  ),
}));

jest.mock('../BlogGooglePanel', () => ({
  BlogGooglePanel: ({ blog, loading, stylePreset, referenceUrl }: { blog: unknown; loading: boolean; stylePreset?: string; referenceUrl?: string }) => (
    <div data-testid="google-panel">google:{stylePreset ?? 'none'}:{referenceUrl ?? 'none'}</div>
  ),
}));

jest.mock('../PropertyBlogStyleRowActionCells', () => ({
  PropertyBlogStyleRowActionCells: () => <td data-testid="row-actions" colSpan={5}>actions</td>,
}));

const mockGetPropertyBlogVariants = getPropertyBlogVariants as jest.MockedFunction<typeof getPropertyBlogVariants>;
const mockGeneratePropertyBlog = generatePropertyBlog as jest.MockedFunction<typeof generatePropertyBlog>;
const mockGetPlatformPost = getPlatformPost as jest.MockedFunction<typeof getPlatformPost>;
const mockLoadLatestCloudDraft = loadLatestCloudDraft as jest.MockedFunction<typeof loadLatestCloudDraft>;
const mockSaveCloudDraft = saveCloudDraft as jest.MockedFunction<typeof saveCloudDraft>;
const mockReadLocalStorage = readLocalStorage as jest.MockedFunction<typeof readLocalStorage>;
const mockWriteLocalStorage = writeLocalStorage as jest.MockedFunction<typeof writeLocalStorage>;

const emptyVariants = { luxury_dark: null, bright_clean: null, corporate: null, warm_japanese: null };

function makeProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  const createdAt = overrides.createdAt ?? '2026-03-30T00:00:00.000Z';
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    id: 'property-1',
    type: 'sale',
    title: '台北大安區三房',
    address: '台北市大安區仁愛路四段100號',
    description: '近捷運，採光佳。',
    status: 'for_sale',
    price: 32800000,
    monthlyRent: null,
    ownerName: '王小明',
    ownerId: 'owner-1',
    area: 32,
    propertyType: '大樓',
    bedrooms: 3,
    bathrooms: 2,
    livingRooms: 2,
    parkingSpaces: 1,
    photoCount: 3,
    mainPhotoUrl: 'https://example.com/photo.jpg',
    hasTranscript: true,
    hasTitleDoc: true,
    hasFloorPlan: false,
    buildingTranscript: {
      header: {
        transcriptType: '',
        documentTitle: '',
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
        buildingNumber: '123建號',
        regDate: '',
        regReason: '',
        doorAddress: '',
        landParcelNumber: '',
        mainUse: '',
        mainMaterial: '',
        totalFloors: '',
        totalArea: '',
        floorLevel: '5樓',
        floorArea: '25',
        mainBuildings: [],
        annexedBuildings: [],
        commonAreas: [],
        completionDate: '',
        notes: '',
      },
      ownership: [],
      encumbrances: [],
    },
    latitude: null,
    longitude: null,
    ...overrides,
    createdAt,
    updatedAt,
  };
}

describe('PropertyBlogGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, '', '/superadmin/properties/p-1/edit?tab=advertisement_creators');
    mockGetPropertyBlogVariants.mockResolvedValue(emptyVariants);
    mockLoadLatestCloudDraft.mockResolvedValue(null);
    mockGeneratePropertyBlog.mockResolvedValue({
      success: true,
      message: 'ok',
      blog: undefined,
      generationContext: {
        selectedSectionIds: ['basic-info', 'description', 'photos'],
      },
    });
    mockGetPlatformPost.mockResolvedValue(null);
    mockReadLocalStorage.mockReturnValue(null);
    mockSaveCloudDraft.mockResolvedValue({
      id: 'draft-1',
      name: '台北大安區三房-廣告 builder 草稿',
      updatedAt: '2026-03-30T10:00:00.000Z',
      data: {
        platform: 'supabase',
        styleMode: 'preset',
        stylePreset: 'luxury_dark',
        referenceUrl: '',
        selectedSectionIds: ['basic-info', 'description', 'photos'],
      },
    });
  });

  it('renders the new advertisement builder skeleton before legacy platform actions', async () => {
    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    expect(screen.getByRole('heading', { name: '物件廣告 builder' })).toBeInTheDocument();
    expect(screen.getAllByText('Step 1').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: '選擇內容區塊' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '選擇廣告風格' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '生成草稿' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '輸出與發佈' })).toBeInTheDocument();
    expect(screen.getByText('可用內容 6/8')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '基本資料' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '照片亮點' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '謄本連結' })).not.toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '建物與土地面積明細表' })).not.toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '權狀連結' })).not.toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '地段與生活機能' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '格局圖' })).toBeDisabled();

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants).toHaveBeenCalledWith('property-1', 'local', undefined);
    });
  });

  it('renders readiness from property data instead of static defaults', async () => {
    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty({
          description: '',
          photoCount: 0,
          mainPhotoUrl: null,
          hasTranscript: false,
          hasTitleDoc: false,
          hasFloorPlan: false,
          buildingTranscript: null,
          landTranscript: null,
          latitude: 25.033964,
          longitude: 121.564468,
        })}
      />,
    );

    expect(screen.getByText('可用內容 2/8')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '基本資料' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '照片亮點' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '物件介紹' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '謄本連結' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '建物與土地面積明細表' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '權狀連結' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '地段與生活機能' })).not.toBeDisabled();
    expect(screen.getByRole('checkbox', { name: '格局圖' })).toBeDisabled();

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants).toHaveBeenCalledWith('property-1', 'local', undefined);
    });
  });

  it('restores platform, style, and reference URL from search params', async () => {
    window.history.replaceState(
      {},
      '',
      '/superadmin/properties/p-1/edit?tab=advertisement_creators&blogPlatform=google_blogger&blogStylePreset=corporate&blogReferenceUrl=https%3A%2F%2Fexample.com%2Flisting%3Fb%3D2%26a%3D1',
    );

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants).toHaveBeenCalledWith(
        'property-1',
        'google_blogger',
        'https://example.com/listing?b=2&a=1',
      );
    });

    await waitFor(() => {
      expect(screen.getByTestId('google-panel')).toHaveTextContent('google:corporate:https://example.com/listing?b=2&a=1');
    });
    expect(screen.getByDisplayValue('https://example.com/listing?b=2&a=1')).toBeInTheDocument();
  });

  it('switches to reference mode and clears preset query state', async () => {
    const user = userEvent.setup();

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    const applyButtons = screen.getAllByRole('button', { name: '套用此樣式' });
    await user.click(applyButtons[0]);

    const styleRows = screen.getAllByRole('row');
    const luxuryRow = styleRows.find((row) => within(row).queryByText('豪宅暗色調'));
    expect(luxuryRow).toBeTruthy();

    if (!luxuryRow) {
      throw new Error('Expected luxury style row');
    }

    expect(within(luxuryRow).getByRole('button', { name: '已套用' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '參考網址模式' }));

    expect(screen.getByRole('button', { name: '系統模板' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '參考網址模式' })).toHaveAttribute('aria-pressed', 'true');

    const input = screen.getByPlaceholderText('https://a0405142777.wixsite.com/108-en-lease1');
    await user.clear(input);
    await user.type(input, 'https://Example.com/showcase/?utm=1');
    await user.click(screen.getByRole('button', { name: '套用' }));

    await waitFor(() => {
      expect(window.location.search).toContain('blogPlatform=supabase');
      expect(window.location.search).toContain('blogReferenceUrl=https%3A%2F%2FExample.com%2Fshowcase%2F%3Futm%3D1');
      expect(window.location.search).not.toContain('blogStylePreset=');
    });

    await user.click(screen.getByRole('button', { name: '系統模板' }));

    await waitFor(() => {
      expect(window.location.search).toContain('blogPlatform=supabase');
      expect(window.location.search).not.toContain('blogReferenceUrl=');
    });

    const restoredStyleRows = screen.getAllByRole('row');
    const restoredLuxuryRow = restoredStyleRows.find((row) => within(row).queryByText('豪宅暗色調'));
    expect(restoredLuxuryRow).toBeTruthy();

    if (!restoredLuxuryRow) {
      throw new Error('Expected restored luxury style row');
    }

    expect(within(restoredLuxuryRow).getByRole('button', { name: '套用此樣式' })).toBeInTheDocument();

    const restoredApplyButtons = screen.getAllByRole('button', { name: '套用此樣式' });
    await user.click(restoredApplyButtons[1]);

    await waitFor(() => {
      expect(window.location.search).toContain('blogPlatform=supabase');
      expect(window.location.search).toContain('blogStylePreset=bright_clean');
      expect(window.location.search).not.toContain('blogReferenceUrl=');
    });
  });

  it('restores reference style mode from query params without preset mode selected', async () => {
    window.history.replaceState(
      {},
      '',
      '/superadmin/properties/p-1/edit?tab=advertisement_creators&blogPlatform=google_blogger&blogReferenceUrl=https%3A%2F%2Fexample.com%2Flisting%3Fmode%3Dref',
    );

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '參考網址模式' })).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByDisplayValue('https://example.com/listing?mode=ref')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants).toHaveBeenCalledWith(
        'property-1',
        'google_blogger',
        'https://example.com/listing?mode=ref',
      );
    });
  });

  it('restores builder state from the latest saved draft when query params are absent', async () => {
    mockLoadLatestCloudDraft.mockResolvedValue({
      id: 'draft-cloud-1',
      name: '台北大安區三房-廣告 builder 草稿',
      updatedAt: '2026-03-30T09:00:00.000Z',
      data: {
        platform: 'google_blogger',
        styleMode: 'reference',
        stylePreset: 'corporate',
        referenceUrl: 'https://example.com/cloud-style',
        selectedSectionIds: ['basic-info', 'photos', 'transcript-link'],
      },
    });

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    expect(await screen.findByDisplayValue('https://example.com/cloud-style')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '參考網址模式' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: '基本資料' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '照片亮點' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '謄本連結' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '物件介紹' })).not.toBeChecked();

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants.mock.calls.at(-1)).toEqual([
        'property-1',
        'google_blogger',
        'https://example.com/cloud-style',
      ]);
    });
  });

  it('lets query params override saved draft state while keeping saved section selection', async () => {
    window.history.replaceState(
      {},
      '',
      '/superadmin/properties/p-1/edit?tab=advertisement_creators&blogPlatform=supabase&blogStylePreset=bright_clean',
    );

    mockLoadLatestCloudDraft.mockResolvedValue({
      id: 'draft-cloud-1',
      name: '台北大安區三房-廣告 builder 草稿',
      updatedAt: '2026-03-30T09:00:00.000Z',
      data: {
        platform: 'google_blogger',
        styleMode: 'reference',
        stylePreset: 'corporate',
        referenceUrl: 'https://example.com/cloud-style',
        selectedSectionIds: ['basic-info', 'photos', 'transcript-link'],
      },
    });

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants.mock.calls.at(-1)).toEqual([
        'property-1',
        'local',
        undefined,
      ]);
    });

    expect(screen.queryByDisplayValue('https://example.com/cloud-style')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '系統模板' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('checkbox', { name: '謄本連結' })).toBeChecked();
  });

  it('autosaves builder state to local and cloud draft storage', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants).toHaveBeenCalledWith('property-1', 'local', undefined);
    });

    await user.click(screen.getByRole('button', { name: /Google Blogger/ }));
    await user.click(screen.getByRole('button', { name: '參考網址模式' }));

    const input = screen.getByPlaceholderText('https://a0405142777.wixsite.com/108-en-lease1');
    await user.clear(input);
    await user.type(input, 'https://example.com/persist-me');
    await user.click(screen.getByRole('button', { name: '套用' }));
    await user.click(screen.getByRole('checkbox', { name: '謄本連結' }));

    jest.advanceTimersByTime(1000);

    await waitFor(() => {
      expect(mockWriteLocalStorage).toHaveBeenLastCalledWith(
        'property-advertisement-builder:property-1',
        {
          platform: 'google_blogger',
          styleMode: 'reference',
          stylePreset: undefined,
          referenceUrl: 'https://example.com/persist-me',
          selectedSectionIds: ['basic-info', 'description', 'photos', 'transcript-link'],
        },
      );
    });

    await waitFor(() => {
      expect(mockSaveCloudDraft).toHaveBeenLastCalledWith({
        formKey: 'property-advertisement-builder:property-1',
        name: '台北大安區三房-廣告 builder 草稿',
        data: {
          platform: 'google_blogger',
          styleMode: 'reference',
          stylePreset: undefined,
          referenceUrl: 'https://example.com/persist-me',
          selectedSectionIds: ['basic-info', 'description', 'photos', 'transcript-link'],
        },
        draftId: null,
      });
    });

    jest.useRealTimers();
  });

  it('generates a draft from the main CTA with the selected preset', async () => {
    const user = userEvent.setup();

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    const draftButton = screen.getByRole('button', { name: '生成廣告草稿' });
    expect(draftButton).toBeDisabled();

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants).toHaveBeenCalledWith('property-1', 'local', undefined);
    });

    const rows = screen.getAllByRole('row');
    const luxuryRow = rows.find((row) => within(row).queryByText('豪宅暗色調'));

    if (!luxuryRow) {
      throw new Error('Expected luxury style row');
    }

    await user.click(within(luxuryRow).getByRole('button', { name: '套用此樣式' }));
    await user.click(screen.getByRole('checkbox', { name: '謄本連結' }));
    expect(screen.getByRole('button', { name: '生成廣告草稿' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '生成廣告草稿' }));

    await waitFor(() => {
      expect(mockGeneratePropertyBlog).toHaveBeenCalledWith('property-1', 'sale', 'owner-1', {
        selectedSectionIds: ['basic-info', 'description', 'photos', 'transcript-link'],
        stylePreset: 'luxury_dark',
        targetPlatform: 'local',
      });
    });

    expect(await screen.findByText('廣告草稿已生成，請繼續在下方檢查預覽與輸出方式。')).toBeInTheDocument();
    expect(screen.getByText('本次草稿帶入內容')).toBeInTheDocument();
  });

  it('generates a draft from the main CTA with reference mode and active platform', async () => {
    const user = userEvent.setup();

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    await waitFor(() => {
      expect(mockGetPropertyBlogVariants).toHaveBeenCalledWith('property-1', 'local', undefined);
    });

    await user.click(screen.getByRole('button', { name: /Google Blogger/ }));
    await user.click(screen.getByRole('button', { name: '參考網址模式' }));

    const input = screen.getByPlaceholderText('https://a0405142777.wixsite.com/108-en-lease1');
    await user.clear(input);
    await user.type(input, 'https://example.com/ref-style');
    await user.click(screen.getByRole('button', { name: '套用' }));

    await user.click(screen.getByRole('button', { name: '生成廣告草稿' }));

    await waitFor(() => {
      expect(mockGeneratePropertyBlog).toHaveBeenCalledWith('property-1', 'sale', 'owner-1', {
        referenceUrl: 'https://example.com/ref-style',
        selectedSectionIds: ['basic-info', 'description', 'photos'],
        stylePreset: 'luxury_dark',
        targetPlatform: 'google_blogger',
      });
    });
  });

  it('restores draft summary from the fetched active variant generation context', async () => {
    window.history.replaceState(
      {},
      '',
      '/superadmin/properties/p-1/edit?tab=advertisement_creators&blogStylePreset=luxury_dark',
    );

    mockGetPropertyBlogVariants.mockResolvedValue({
      ...emptyVariants,
      luxury_dark: {
        id: 'blog-1',
        propertyId: 'property-1',
        authorId: 'owner-1',
        title: '測試文章',
        slug: 'test-post',
        excerpt: null,
        content: 'content',
        contentHtml: '<div>html</div>',
        featuredImageUrl: null,
        category: null,
        tags: [],
        status: 'draft',
        publishedAt: null,
        viewCount: 0,
        likeCount: 0,
        seoTitle: null,
        seoDescription: null,
        seoKeywords: [],
        createdAt: '2026-03-30T00:00:00.000Z',
        updatedAt: '2026-03-30T00:00:00.000Z',
        blogStylePreset: 'luxury_dark',
        blogTargetPlatform: 'local',
        referenceUrl: null,
        referenceUrlNormalized: null,
        generationContext: {
          selectedSectionIds: ['basic-info', 'photos', 'transcript-link'],
        },
      },
    });

    render(
      <PropertyBlogGenerator
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        property={makeProperty()}
      />,
    );

    const summaryHeading = await screen.findByText('本次草稿帶入內容');
    const summaryCard = summaryHeading.closest('div');

    if (!summaryCard) {
      throw new Error('Expected draft summary card');
    }

    expect(summaryHeading).toBeInTheDocument();
    expect(within(summaryCard).getByText('基本資料')).toBeInTheDocument();
    expect(within(summaryCard).getByText('照片亮點')).toBeInTheDocument();
    expect(within(summaryCard).getByText('謄本連結')).toBeInTheDocument();
  });
});
