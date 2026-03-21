'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { getIntegrationTokens, savePlatformPost } from './integrations';
import type { ActionResult } from '@/lib/types/properties';

interface FBPostResponse {
  id: string;
  post_id?: string;
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

/**
 * Build a plain-text Facebook post from property info.
 * Facebook posts don't support full HTML, so we produce formatted text + photo links.
 */
function buildFacebookPostText(data: {
  title: string;
  excerpt: string;
  tags: string[];
  blogUrl?: string;
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  ownerLineId?: string | null;
}): string {
  const lines: string[] = [];

  lines.push(`🏠 ${data.title}`);
  lines.push('');
  lines.push(data.excerpt);
  lines.push('');

  if (data.tags.length > 0) {
    lines.push(data.tags.map((t) => `#${t.replace(/\s/g, '')}`).join(' '));
  }

  lines.push('');
  lines.push('📞 聯絡方式：');
  if (data.ownerPhone)  lines.push(`電話：${data.ownerPhone}`);
  if (data.ownerLineId) lines.push(`LINE：${data.ownerLineId}`);
  if (data.ownerEmail)  lines.push(`Email：${data.ownerEmail}`);

  if (data.blogUrl) {
    lines.push('');
    lines.push(`🔗 詳細資訊：${data.blogUrl}`);
  }

  return lines.join('\n');
}

export async function publishToFacebook(
  blogPostId: string,
  data: {
    title: string;
    excerpt: string;
    tags: string[];
    featuredImageUrl?: string | null;
    blogUrl?: string;
    ownerPhone?: string | null;
    ownerEmail?: string | null;
    ownerLineId?: string | null;
  }
): Promise<ActionResult & { externalUrl?: string; externalId?: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const tokens = await getIntegrationTokens(userId, 'facebook_pages');
  if (!tokens?.is_connected || !tokens.facebook_page_id || !tokens.facebook_page_token) {
    return { success: false, message: 'Facebook 粉絲頁尚未連結，請先至設定頁完成設定' };
  }

  const pageId = tokens.facebook_page_id;
  const pageToken = tokens.facebook_page_token;
  const message = buildFacebookPostText(data);

  try {
    let endpoint: string;
    let body: Record<string, string>;

    if (data.featuredImageUrl) {
      // Post with photo
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/photos`;
      body = {
        url: data.featuredImageUrl,
        caption: message,
        access_token: pageToken,
      };
    } else {
      // Text-only post
      endpoint = `https://graph.facebook.com/v19.0/${pageId}/feed`;
      body = {
        message,
        access_token: pageToken,
      };
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return { success: false, message: `Facebook 發布失敗：${res.status} ${errBody.slice(0, 300)}` };
    }

    const created = await res.json() as FBPostResponse;
    const postId = created.post_id ?? created.id;
    const externalUrl = `https://www.facebook.com/${postId.replace('_', '/posts/')}`;

    await savePlatformPost({
      blogPostId,
      platform: 'facebook_pages',
      externalId: postId,
      externalUrl,
    });

    return {
      success: true,
      message: '已成功發布至 Facebook 粉絲頁',
      externalUrl,
      externalId: postId,
    };
  } catch (err) {
    return { success: false, message: `發布失敗：${err instanceof Error ? err.message : '未知錯誤'}` };
  }
}

export async function deleteFacebookPost(
  blogPostId: string,
  externalPostId: string
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const tokens = await getIntegrationTokens(userId, 'facebook_pages');
  if (!tokens?.is_connected || !tokens.facebook_page_token) {
    return { success: false, message: 'Facebook 粉絲頁尚未連結' };
  }

  const pageToken = tokens.facebook_page_token;

  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/${externalPostId}?access_token=${encodeURIComponent(pageToken)}`,
      { method: 'DELETE' }
    );

    if (!res.ok && res.status !== 404) {
      return { success: false, message: `刪除失敗：${res.status}` };
    }

    const admin = createAdminClient();
    await admin
      .from('blog_platform_posts')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('blog_post_id', blogPostId)
      .eq('platform', 'facebook_pages');

    return { success: true, message: '已從 Facebook 粉絲頁刪除貼文' };
  } catch (err) {
    return { success: false, message: `刪除失敗：${err instanceof Error ? err.message : '未知錯誤'}` };
  }
}

/** Verify a Facebook Page Access Token is still valid. */
export async function verifyFacebookToken(pageToken: string): Promise<ActionResult> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${encodeURIComponent(pageToken)}`
    );
    if (!res.ok) return { success: false, message: 'Token 無效或已過期' };
    const data = await res.json() as { id?: string; name?: string; error?: { message: string } };
    if (data.error) return { success: false, message: data.error.message };
    return { success: true, message: `驗證成功：${data.name ?? data.id}` };
  } catch {
    return { success: false, message: '驗證失敗，請檢查網路連線' };
  }
}
