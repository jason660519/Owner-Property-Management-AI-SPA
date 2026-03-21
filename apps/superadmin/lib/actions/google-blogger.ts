'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { getIntegrationTokens, savePlatformPost } from './integrations';
import type { ActionResult } from '@/lib/types/properties';

interface BloggerPost {
  id?: string;
  title: string;
  content: string;
  labels?: string[];
  url?: string;
}

interface BloggerPostResponse {
  id: string;
  url: string;
  title: string;
  status: string;
}

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/** Refresh Google access token using refresh token. Returns new access token or null. */
async function refreshAccessToken(
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_BLOGGER_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_BLOGGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) return null;

    const data = await res.json() as { access_token: string; expires_in: number };
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

    // Update stored access token
    const admin = createAdminClient();
    await admin
      .from('user_integrations')
      .update({
        google_access_token: data.access_token,
        google_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('platform', 'google_blogger');

    return data.access_token;
  } catch {
    return null;
  }
}

/** Get a valid access token (auto-refreshes if expired). */
async function getValidAccessToken(userId: string): Promise<string | null> {
  const row = await getIntegrationTokens(userId, 'google_blogger');
  if (!row?.google_access_token) return null;

  // Check if token is expired (with 5-minute buffer)
  if (row.google_token_expires_at) {
    const expiresAt = new Date(row.google_token_expires_at).getTime();
    const now = Date.now() + 5 * 60 * 1000;
    if (now > expiresAt && row.google_refresh_token) {
      return refreshAccessToken(userId, row.google_refresh_token);
    }
  }

  return row.google_access_token;
}

/** Wrap HTML content in a minimal blog post wrapper for Blogger compatibility. */
function wrapForBlogger(title: string, contentHtml: string): string {
  // Blogger renders raw HTML; inject minimal CSS reset + the content
  return `<div class="property-listing-post">
<style>
.property-listing-post { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; }
.property-listing-post img { max-width: 100%; height: auto; }
.property-listing-post a { color: inherit; }
</style>
${contentHtml}
</div>`;
}

export async function publishToBlogger(
  blogPostId: string,
  data: { title: string; contentHtml: string; tags: string[] }
): Promise<ActionResult & { externalUrl?: string; externalId?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const tokens = await getIntegrationTokens(userId, 'google_blogger');
  if (!tokens?.is_connected || !tokens.google_blog_id) {
    return { success: false, message: 'Google Blogger 尚未連結或未選擇部落格，請先至設定頁完成設定' };
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) {
    return { success: false, message: 'Google Token 無效，請重新連結 Google 帳號' };
  }

  const blogId = tokens.google_blog_id;
  const post: BloggerPost = {
    title: data.title,
    content: wrapForBlogger(data.title, data.contentHtml),
    labels: data.tags.slice(0, 20),
  };

  try {
    const res = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/?isDraft=false`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, message: `Blogger 發布失敗：${res.status} ${errBody.slice(0, 200)}` };
    }

    const created = await res.json() as BloggerPostResponse;

    // Save mapping
    await savePlatformPost({
      blogPostId,
      platform: 'google_blogger',
      externalId: created.id,
      externalUrl: created.url,
    });

    return {
      success: true,
      message: '已成功發布至 Google Blogger',
      externalUrl: created.url,
      externalId: created.id,
    };
  } catch (err) {
    return { success: false, message: `發布失敗：${err instanceof Error ? err.message : '未知錯誤'}` };
  }
}

export async function updateBloggerPost(
  blogPostId: string,
  externalPostId: string,
  data: { title: string; contentHtml: string; tags: string[] }
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const tokens = await getIntegrationTokens(userId, 'google_blogger');
  if (!tokens?.is_connected || !tokens.google_blog_id) {
    return { success: false, message: 'Google Blogger 尚未連結' };
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return { success: false, message: 'Google Token 無效，請重新連結' };

  const blogId = tokens.google_blog_id;

  try {
    const res = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${externalPostId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: data.title,
          content: wrapForBlogger(data.title, data.contentHtml),
          labels: data.tags.slice(0, 20),
        }),
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, message: `更新失敗：${res.status} ${errBody.slice(0, 200)}` };
    }

    // Update mapping
    const admin = createAdminClient();
    await admin
      .from('blog_platform_posts')
      .update({ updated_at: new Date().toISOString() })
      .eq('blog_post_id', blogPostId)
      .eq('platform', 'google_blogger');

    return { success: true, message: '已更新 Google Blogger 文章' };
  } catch (err) {
    return { success: false, message: `更新失敗：${err instanceof Error ? err.message : '未知錯誤'}` };
  }
}

export async function deleteBloggerPost(
  blogPostId: string,
  externalPostId: string
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const tokens = await getIntegrationTokens(userId, 'google_blogger');
  if (!tokens?.is_connected || !tokens.google_blog_id) {
    return { success: false, message: 'Google Blogger 尚未連結' };
  }

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return { success: false, message: 'Google Token 無效，請重新連結' };

  const blogId = tokens.google_blog_id;

  try {
    const res = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/${externalPostId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!res.ok && res.status !== 404) {
      return { success: false, message: `刪除失敗：${res.status}` };
    }

    // Mark as deleted
    const admin = createAdminClient();
    await admin
      .from('blog_platform_posts')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('blog_post_id', blogPostId)
      .eq('platform', 'google_blogger');

    return { success: true, message: '已從 Google Blogger 刪除文章' };
  } catch (err) {
    return { success: false, message: `刪除失敗：${err instanceof Error ? err.message : '未知錯誤'}` };
  }
}

/** List all blogs accessible by the connected Google account. */
export async function listGoogleBlogs(): Promise<
  ActionResult & { blogs?: Array<{ id: string; name: string; url: string }> }
> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const accessToken = await getValidAccessToken(userId);
  if (!accessToken) return { success: false, message: 'Google Token 無效，請重新連結' };

  try {
    const res = await fetch('https://www.googleapis.com/blogger/v3/users/self/blogs', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return { success: false, message: `無法讀取部落格列表：${res.status}` };

    const data = await res.json() as { items?: Array<{ id: string; name: string; url: string }> };
    return { success: true, message: '已取得部落格列表', blogs: data.items ?? [] };
  } catch (err) {
    return { success: false, message: `${err instanceof Error ? err.message : '未知錯誤'}` };
  }
}

/** Update the selected blog for a connected Google account. */
export async function selectGoogleBlog(data: {
  blogId: string;
  blogUrl: string;
  blogName: string;
}): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_integrations')
    .update({
      google_blog_id: data.blogId,
      google_blog_url: data.blogUrl,
      google_blog_name: data.blogName,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('platform', 'google_blogger');

  if (error) return { success: false, message: error.message };
  return { success: true, message: `已選擇部落格：${data.blogName}` };
}
