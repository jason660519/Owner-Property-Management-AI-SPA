'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import type { ActionResult } from '@/lib/types/properties';

export interface GoogleBloggerIntegration {
  platform: 'google_blogger';
  isConnected: boolean;
  blogId: string | null;
  blogUrl: string | null;
  blogName: string | null;
  tokenExpiresAt: string | null;
  connectedAt: string | null;
}

export interface FacebookPagesIntegration {
  platform: 'facebook_pages';
  isConnected: boolean;
  pageId: string | null;
  pageName: string | null;
  tokenExpiresAt: string | null;
  connectedAt: string | null;
}

export type PlatformIntegration = GoogleBloggerIntegration | FacebookPagesIntegration;

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export async function getIntegration(
  platform: 'google_blogger' | 'facebook_pages'
): Promise<PlatformIntegration | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .maybeSingle();

  if (!data) {
    if (platform === 'google_blogger') {
      return { platform, isConnected: false, blogId: null, blogUrl: null, blogName: null, tokenExpiresAt: null, connectedAt: null };
    }
    return { platform, isConnected: false, pageId: null, pageName: null, tokenExpiresAt: null, connectedAt: null };
  }

  if (platform === 'google_blogger') {
    return {
      platform,
      isConnected: data.is_connected,
      blogId: data.google_blog_id,
      blogUrl: data.google_blog_url,
      blogName: data.google_blog_name,
      tokenExpiresAt: data.google_token_expires_at,
      connectedAt: data.connected_at,
    };
  }

  return {
    platform,
    isConnected: data.is_connected,
    pageId: data.facebook_page_id,
    pageName: data.facebook_page_name,
    tokenExpiresAt: data.facebook_token_expires_at,
    connectedAt: data.connected_at,
  };
}

export async function saveGoogleBloggerIntegration(data: {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  blogId: string;
  blogUrl: string;
  blogName: string;
}): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_integrations')
    .upsert({
      user_id: userId,
      platform: 'google_blogger',
      google_access_token: data.accessToken,
      google_refresh_token: data.refreshToken,
      google_token_expires_at: data.expiresAt,
      google_blog_id: data.blogId,
      google_blog_url: data.blogUrl,
      google_blog_name: data.blogName,
      is_connected: true,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

  if (error) return { success: false, message: `儲存失敗：${error.message}` };
  return { success: true, message: 'Google Blogger 已連結' };
}

export async function saveFacebookPagesIntegration(data: {
  pageId: string;
  pageName: string;
  pageToken: string;
  expiresAt?: string;
}): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_integrations')
    .upsert({
      user_id: userId,
      platform: 'facebook_pages',
      facebook_page_id: data.pageId,
      facebook_page_name: data.pageName,
      facebook_page_token: data.pageToken,
      facebook_token_expires_at: data.expiresAt ?? null,
      is_connected: true,
      connected_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

  if (error) return { success: false, message: `儲存失敗：${error.message}` };
  return { success: true, message: 'Facebook 粉絲頁已連結' };
}

export async function disconnectIntegration(
  platform: 'google_blogger' | 'facebook_pages'
): Promise<ActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, message: '未登入' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('user_integrations')
    .update({
      is_connected: false,
      google_access_token: null,
      google_refresh_token: null,
      facebook_page_token: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('platform', platform);

  if (error) return { success: false, message: `解除連結失敗：${error.message}` };
  return { success: true, message: '已解除連結' };
}

/** Get raw tokens for server-side API calls (admin only). */
export async function getIntegrationTokens(
  userId: string,
  platform: 'google_blogger' | 'facebook_pages'
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('platform', platform)
    .eq('is_connected', true)
    .maybeSingle();
  return data;
}

/** Save a platform post mapping (blog_post_id ↔ external platform ID). */
export async function savePlatformPost(data: {
  blogPostId: string;
  platform: 'google_blogger' | 'facebook_pages';
  externalId: string;
  externalUrl?: string;
}): Promise<ActionResult> {
  const admin = createAdminClient();
  const { error } = await admin
    .from('blog_platform_posts')
    .upsert({
      blog_post_id: data.blogPostId,
      platform: data.platform,
      external_id: data.externalId,
      external_url: data.externalUrl ?? null,
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'blog_post_id,platform' });

  if (error) return { success: false, message: error.message };
  return { success: true, message: '已儲存平台貼文記錄' };
}

export async function getPlatformPost(
  blogPostId: string,
  platform: 'google_blogger' | 'facebook_pages'
) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('blog_platform_posts')
    .select('*')
    .eq('blog_post_id', blogPostId)
    .eq('platform', platform)
    .maybeSingle();
  return data;
}
