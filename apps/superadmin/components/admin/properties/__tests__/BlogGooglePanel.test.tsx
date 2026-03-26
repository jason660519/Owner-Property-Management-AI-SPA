import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { BlogGooglePanel } from '../BlogGooglePanel';
import { getIntegration, getPlatformPost } from '@/lib/actions/integrations';
import { getPropertyBlog, generatePropertyBlog } from '@/lib/actions/blog';
import { publishToBlogger } from '@/lib/actions/google-blogger';

jest.mock('@/lib/actions/integrations', () => ({
  getIntegration: jest.fn(),
  getPlatformPost: jest.fn(),
}));

jest.mock('@/lib/actions/blog', () => ({
  getPropertyBlog: jest.fn(),
  generatePropertyBlog: jest.fn(),
}));

jest.mock('@/lib/actions/google-blogger', () => ({
  publishToBlogger: jest.fn(),
  updateBloggerPost: jest.fn(),
  deleteBloggerPost: jest.fn(),
}));

const mockGetIntegration = getIntegration as jest.MockedFunction<typeof getIntegration>;
const mockGetPlatformPost = getPlatformPost as jest.MockedFunction<typeof getPlatformPost>;
const mockGetPropertyBlog = getPropertyBlog as jest.MockedFunction<typeof getPropertyBlog>;
const mockGeneratePropertyBlog = generatePropertyBlog as jest.MockedFunction<typeof generatePropertyBlog>;
const mockPublishToBlogger = publishToBlogger as jest.MockedFunction<typeof publishToBlogger>;

describe('BlogGooglePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads and publishes the selected google blogger variant', async () => {
    const user = userEvent.setup();

    const existingBlog = {
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
      status: 'draft' as const,
      publishedAt: null,
      viewCount: 0,
      likeCount: 0,
      seoTitle: null,
      seoDescription: null,
      seoKeywords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blogStylePreset: 'luxury_dark' as const,
      blogTargetPlatform: 'google_blogger' as const,
    };

    mockGetIntegration.mockResolvedValue({
      platform: 'google_blogger',
      isConnected: true,
      blogId: 'google-blog-id',
      blogUrl: 'https://example.blogspot.com',
      blogName: 'My Blog',
      tokenExpiresAt: null,
      connectedAt: new Date().toISOString(),
    });
    mockGetPropertyBlog.mockResolvedValue(existingBlog);
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
        propertyType="sale"
        ownerId="owner-1"
        referenceUrl="https://example.com/style-ref"
        stylePreset="luxury_dark"
      />
    );

    await waitFor(() => {
      expect(mockGetPropertyBlog).toHaveBeenCalledWith('property-1', {
        referenceUrl: 'https://example.com/style-ref',
        stylePreset: 'luxury_dark',
        targetPlatform: 'google_blogger',
      });
    });

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

  it('regenerates with the current style options', async () => {
    const user = userEvent.setup();

    const existingBlog = {
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
      status: 'draft' as const,
      publishedAt: null,
      viewCount: 0,
      likeCount: 0,
      seoTitle: null,
      seoDescription: null,
      seoKeywords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blogStylePreset: 'luxury_dark' as const,
      blogTargetPlatform: 'google_blogger' as const,
    };

    mockGetIntegration.mockResolvedValue({
      platform: 'google_blogger',
      isConnected: true,
      blogId: 'google-blog-id',
      blogUrl: 'https://example.blogspot.com',
      blogName: 'My Blog',
      tokenExpiresAt: null,
      connectedAt: new Date().toISOString(),
    });
    mockGetPropertyBlog.mockResolvedValue(existingBlog);
    mockGetPlatformPost.mockResolvedValue(null);
    mockGeneratePropertyBlog.mockResolvedValue({
      success: true,
      message: 'ok',
      blog: existingBlog,
    });

    render(
      <BlogGooglePanel
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
        referenceUrl="https://example.com/style-ref"
        stylePreset="luxury_dark"
      />
    );

    const regenerateBtn = await screen.findByRole('button', { name: '重新生成（套用目前樣式）' });
    await user.click(regenerateBtn);

    await waitFor(() => {
      expect(mockGeneratePropertyBlog).toHaveBeenCalledWith('property-1', 'sale', 'owner-1', {
        referenceUrl: 'https://example.com/style-ref',
        stylePreset: 'luxury_dark',
        targetPlatform: 'google_blogger',
      });
    });
  });

  it('allows user to copy generated content for manual publishing', async () => {
    const user = userEvent.setup();
    const originalClipboard = { ...navigator.clipboard };
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
    });

    const existingBlog = {
      id: 'blog-ex',
      propertyId: 'property-1',
      authorId: 'owner-1',
      title: '手動文章標題',
      contentHtml: '<div>手動內容 HTML</div>',
      slug: 'manual-blog',
      excerpt: null,
      content: 'text',
      featuredImageUrl: null,
      category: null,
      tags: [],
      status: 'draft' as const,
      publishedAt: null,
      viewCount: 0,
      likeCount: 0,
      seoTitle: null,
      seoDescription: null,
      seoKeywords: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      blogStylePreset: 'luxury_dark' as const,
      blogTargetPlatform: 'google_blogger' as const,
    };

    // Use not connected to trigger the UI easily and see the copy buttons
    mockGetIntegration.mockResolvedValue({
      platform: 'google_blogger',
      isConnected: false,
      blogId: null,
      blogUrl: null,
      blogName: null,
      tokenExpiresAt: null,
      connectedAt: null,
    });
    mockGetPropertyBlog.mockResolvedValue(existingBlog);
    mockGetPlatformPost.mockResolvedValue(null);

    render(
      <BlogGooglePanel
        propertyId="property-1"
        propertyType="sale"
        ownerId="owner-1"
      />
    );

    const toggleManualCopyBtn = await screen.findByRole('button', { name: '手動複製貼上（備用）' });
    await user.click(toggleManualCopyBtn);

    // Wait for the copy title button to appear
    const copyTitleBtn = await screen.findByRole('button', { name: '複製標題' });
    const copyContentBtn = await screen.findByRole('button', { name: '複製 HTML' });

    await user.click(copyTitleBtn);
    expect(writeTextMock).toHaveBeenCalledWith('手動文章標題');

    await user.click(copyContentBtn);
    expect(writeTextMock).toHaveBeenCalledWith('<div>手動內容 HTML</div>');

    // Restore clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      writable: true,
    });
  });
});
