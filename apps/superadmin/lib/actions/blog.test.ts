import { getPropertyBlog } from './blog';
import { createAdminClient } from '@/utils/supabase/admin';

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