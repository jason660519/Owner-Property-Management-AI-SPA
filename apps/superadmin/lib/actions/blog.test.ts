import { generatePropertyBlog, getPropertyBlog } from './blog';
import { createAdminClient } from '@/utils/supabase/admin';

jest.mock('@/lib/utils/blogTemplate', () => ({
  generateBlogContent: jest.fn(() => ({
    title: 'AI 物件文案',
    excerpt: '摘要',
    content: '內文',
    contentHtml: '<div>html</div>',
    category: 'property',
    tags: ['sale'],
    seoTitle: 'SEO 標題',
    seoDescription: 'SEO 摘要',
    seoKeywords: ['房地產'],
  })),
  generateSlug: jest.fn(() => 'ai-property-post'),
  buildCtaSection: jest.fn(() => '<div>CTA</div>'),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('getPropertyBlog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('filters by normalized reference URL when variant includes referenceUrl', async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      is: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({
      data: {
        id: 'blog-1',
        property_id: 'property-1',
        author_id: 'author-1',
        title: '測試文章',
        slug: 'test-post',
        excerpt: null,
        content: 'content',
        content_html: null,
        featured_image_url: null,
        category: null,
        tags: [],
        status: 'draft',
        published_at: null,
        view_count: 0,
        like_count: 0,
        seo_title: null,
        seo_description: null,
        seo_keywords: [],
        created_at: '2026-03-23T00:00:00.000Z',
        updated_at: '2026-03-23T00:00:00.000Z',
        blog_style_preset: 'corporate',
        blog_target_platform: 'google_blogger',
        reference_url: ' https://Example.com/path/?b=2&a=1#hero ',
        reference_url_normalized: 'https://example.com/path?a=1&b=2',
        generation_context: {
          selectedSectionIds: ['basic-info', 'photos'],
        },
      },
      error: null,
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => query),
    });

    const blog = await getPropertyBlog('property-1', {
      stylePreset: 'corporate',
      targetPlatform: 'google_blogger',
      referenceUrl: ' https://Example.com/path/?b=2&a=1#hero ',
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, 'property_id', 'property-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'blog_style_preset', 'corporate');
    expect(query.eq).toHaveBeenNthCalledWith(3, 'blog_target_platform', 'google_blogger');
    expect(query.eq).toHaveBeenNthCalledWith(4, 'reference_url_normalized', 'https://example.com/path?a=1&b=2');
    expect(query.is).not.toHaveBeenCalled();
    expect(blog?.referenceUrlNormalized).toBe('https://example.com/path?a=1&b=2');
    expect(blog?.generationContext?.selectedSectionIds).toEqual(['basic-info', 'photos']);
  });

  it('filters for null normalized reference when variant has no referenceUrl', async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      is: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn(),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.limit.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: null, error: null });

    (createAdminClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => query),
    });

    const blog = await getPropertyBlog('property-1', {
      stylePreset: 'corporate',
      targetPlatform: 'google_blogger',
    });

    expect(query.eq).toHaveBeenNthCalledWith(1, 'property_id', 'property-1');
    expect(query.eq).toHaveBeenNthCalledWith(2, 'blog_style_preset', 'corporate');
    expect(query.eq).toHaveBeenNthCalledWith(3, 'blog_target_platform', 'google_blogger');
    expect(query.is).toHaveBeenCalledWith('reference_url_normalized', null);
    expect(blog).toBeNull();
  });
});

describe('generatePropertyBlog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists generation context into blog_posts and returns it in the result', async () => {
    const propertyQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
    };
    propertyQuery.select.mockReturnValue(propertyQuery);
    propertyQuery.eq.mockReturnValue(propertyQuery);
    propertyQuery.single.mockResolvedValue({
      data: {
        id: 'property-1',
        title: '測試物件',
        address: '台北市大安區仁愛路四段100號',
        address_city: '台北市',
        address_district: '大安區',
        address_street: '仁愛路四段100號',
        price: 32000000,
        area_registered: 30,
        building_type: '大樓',
        layout_rooms: 3,
        layout_bathrooms: 2,
        layout_living_rooms: 2,
        has_parking: true,
        details: {
          description: '近捷運，採光佳',
        },
      },
      error: null,
    });

    const photosQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      order: jest.fn(),
    };
    photosQuery.select.mockReturnValue(photosQuery);
    photosQuery.eq.mockReturnValue(photosQuery);
    photosQuery.order.mockReturnValue(photosQuery);
    photosQuery.then = undefined;
    Object.defineProperty(photosQuery, 'then', {
      value: (resolve: (value: unknown) => void) => resolve({
        data: [
          { storage_path: 'property-1/main.jpg', is_primary: true, photo_type: 'interior' },
        ],
      }),
    });

    const profileQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn(),
    };
    profileQuery.select.mockReturnValue(profileQuery);
    profileQuery.eq.mockReturnValue(profileQuery);
    profileQuery.maybeSingle.mockResolvedValue({
      data: {
        phone: '0912345678',
        line_id: 'line-owner',
        wechat_id: null,
        whatsapp: null,
        facebook_url: null,
        instagram_url: null,
      },
      error: null,
    });

    const existingBlogQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      is: jest.fn(),
      maybeSingle: jest.fn(),
    };
    existingBlogQuery.select.mockReturnValue(existingBlogQuery);
    existingBlogQuery.eq.mockReturnValue(existingBlogQuery);
    existingBlogQuery.is.mockReturnValue(existingBlogQuery);
    existingBlogQuery.maybeSingle.mockResolvedValue({ data: null, error: null });

    const insertBlogQuery = {
      insert: jest.fn(),
      select: jest.fn(),
      single: jest.fn(),
    };
    insertBlogQuery.insert.mockReturnValue(insertBlogQuery);
    insertBlogQuery.select.mockReturnValue(insertBlogQuery);
    insertBlogQuery.single.mockResolvedValue({ data: { id: 'blog-1' }, error: null });

    const fetchBlogQuery = {
      select: jest.fn(),
      eq: jest.fn(),
      is: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      maybeSingle: jest.fn(),
    };
    fetchBlogQuery.select.mockReturnValue(fetchBlogQuery);
    fetchBlogQuery.eq.mockReturnValue(fetchBlogQuery);
    fetchBlogQuery.is.mockReturnValue(fetchBlogQuery);
    fetchBlogQuery.order.mockReturnValue(fetchBlogQuery);
    fetchBlogQuery.limit.mockReturnValue(fetchBlogQuery);
    fetchBlogQuery.maybeSingle.mockResolvedValue({
      data: {
        id: 'blog-1',
        property_id: 'property-1',
        author_id: 'owner-1',
        title: 'AI 物件文案',
        slug: 'ai-property-post',
        excerpt: '摘要',
        content: '內文',
        content_html: '<div>html</div>',
        featured_image_url: 'https://example.com/storage/v1/object/public/property-photos/property-1/main.jpg',
        category: 'property',
        tags: ['sale'],
        status: 'draft',
        published_at: null,
        view_count: 0,
        like_count: 0,
        seo_title: 'SEO 標題',
        seo_description: 'SEO 摘要',
        seo_keywords: ['房地產'],
        created_at: '2026-03-30T00:00:00.000Z',
        updated_at: '2026-03-30T00:00:00.000Z',
        blog_style_preset: 'luxury_dark',
        blog_target_platform: 'local',
        reference_url: null,
        reference_url_normalized: null,
        generation_context: {
          selectedSectionIds: ['basic-info', 'photos'],
        },
      },
      error: null,
    });

    const blogPostsQueries = [existingBlogQuery, insertBlogQuery, fetchBlogQuery];
    const from = jest.fn((table: string) => {
      if (table === 'property_sales') return propertyQuery;
      if (table === 'property_photos') return photosQuery;
      if (table === 'users_profile') return profileQuery;
      if (table === 'blog_posts') {
        const nextQuery = blogPostsQueries.shift();
        if (!nextQuery) {
          throw new Error('Unexpected extra blog_posts query');
        }
        return nextQuery;
      }

      throw new Error(`Unexpected table: ${table}`);
    });

    (createAdminClient as jest.Mock).mockReturnValue({
      from,
      auth: {
        admin: {
          getUserById: jest.fn().mockResolvedValue({
            data: {
              user: {
                email: 'owner@example.com',
              },
            },
          }),
        },
      },
    });

    const result = await generatePropertyBlog('property-1', 'sale', 'owner-1', {
      selectedSectionIds: ['basic-info', 'photos'],
    });

    expect(insertBlogQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        property_id: 'property-1',
        author_id: 'owner-1',
        generation_context: {
          selectedSectionIds: ['basic-info', 'photos'],
        },
      }),
    );
    expect(result.success).toBe(true);
    expect(result.generationContext?.selectedSectionIds).toEqual(['basic-info', 'photos']);
    expect(result.blog?.generationContext?.selectedSectionIds).toEqual(['basic-info', 'photos']);
  });
});