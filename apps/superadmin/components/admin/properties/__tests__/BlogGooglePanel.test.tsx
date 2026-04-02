import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BlogGooglePanel } from '../BlogGooglePanel';
import { getIntegration, getPlatformPost } from '@/lib/actions/integrations';
import { publishToBlogger } from '@/lib/actions/google-blogger';
import type { BlogPost } from '@/lib/actions/blog';

jest.mock('@/lib/actions/integrations', () => ({
  getIntegration: jest.fn(),
  getPlatformPost: jest.fn(),
}));

jest.mock('@/lib/actions/google-blogger', () => ({
  publishToBlogger: jest.fn(),
  updateBloggerPost: jest.fn(),
  deleteBloggerPost: jest.fn(),
}));

const mockGetIntegration = getIntegration as jest.MockedFunction<typeof getIntegration>;
const mockGetPlatformPost = getPlatformPost as jest.MockedFunction<typeof getPlatformPost>;
const mockPublishToBlogger = publishToBlogger as jest.MockedFunction<typeof publishToBlogger>;

function makeBlog(overrides: Partial<BlogPost> = {}): BlogPost {
  return {
    id: 'blog-old',
    propertyId: 'property-1',
    authorId: 'owner-1',
    title: '舊版本標題',
    slug: 'old-blog',
    excerpt: null,
    content: 'old-content',
    contentHtml: '<div>old</div>',
    featuredImageUrl: null,
    category: null,
    tags: ['舊標籤'],
    status: 'draft',
    publishedAt: null,
    viewCount: 0,
    likeCount: 0,
    seoTitle: null,
    seoDescription: null,
    seoKeywords: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    blogStylePreset: 'luxury_dark',
    blogTargetPlatform: 'google_blogger',
    referenceUrl: null,
    referenceUrlNormalized: null,
    ...overrides,
  };
}

describe('BlogGooglePanel', () => {
  const onMutation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('publishes blog to Google Blogger when connected', async () => {
    const user = userEvent.setup();
    const blog = makeBlog();

    mockGetIntegration.mockResolvedValue({
      platform: 'google_blogger',
      isConnected: true,
      blogId: 'google-blog-id',
      blogUrl: 'https://example.blogspot.com',
      blogName: 'My Blog',
      tokenExpiresAt: null,
      connectedAt: new Date().toISOString(),
    });
    mockGetPlatformPost.mockResolvedValue(null);
    mockPublishToBlogger.mockResolvedValue({
      success: true,
      message: 'published',
      externalId: 'post-1',
      externalUrl: 'https://example.blogspot.com/post-1',
    });

    render(
      <BlogGooglePanel
        propertyId="property-1"
        blog={blog}
        loading={false}
        stylePreset="luxury_dark"
        referenceUrl="https://example.com/style-ref"
        onMutation={onMutation}
      />
    );

    const publishBtn = await screen.findByRole('button', { name: '發布至 Google Blogger' });
    await user.click(publishBtn);

    await waitFor(() => {
      expect(mockPublishToBlogger).toHaveBeenCalledWith('blog-old', {
        title: '舊版本標題',
        contentHtml: '<div>old</div>',
        tags: ['舊標籤'],
      });
    });
  });

  it('allows user to copy generated content for manual publishing', async () => {
    const user = userEvent.setup();
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    const originalClipboard = { ...navigator.clipboard };

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
    });

    const blog = makeBlog({
      id: 'blog-ex',
      title: '手動文章標題',
      contentHtml: '<div>手動內容 HTML</div>',
      slug: 'manual-blog',
      tags: [],
    });

    // Not connected — triggers manual copy UI
    mockGetIntegration.mockResolvedValue({
      platform: 'google_blogger',
      isConnected: false,
      blogId: null,
      blogUrl: null,
      blogName: null,
      tokenExpiresAt: null,
      connectedAt: null,
    });
    mockGetPlatformPost.mockResolvedValue(null);

    render(
      <BlogGooglePanel
        propertyId="property-1"
        blog={blog}
        loading={false}
        onMutation={onMutation}
      />
    );

    const toggleManualCopyBtn = await screen.findByRole('button', { name: '手動複製貼上（備用）' });
    await user.click(toggleManualCopyBtn);

    const copyTitleBtn = await screen.findByRole('button', { name: '複製標題' });
    const copyContentBtn = await screen.findByRole('button', { name: '複製 HTML' });

    await user.click(copyTitleBtn);
    expect(writeTextMock).toHaveBeenCalledWith('手動文章標題');

    await user.click(copyContentBtn);
    expect(writeTextMock).toHaveBeenCalledWith('<div>手動內容 HTML</div>');

    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    });
  });
});
