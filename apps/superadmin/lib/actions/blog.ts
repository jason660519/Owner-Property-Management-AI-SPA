// Server actions for property blog generation and management
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/lib/types/properties';
import {
  generateBlogContent,
  generateSlug,
  buildCtaSection,
  type PropertyDataForBlog,
} from '@/lib/utils/blogTemplate';

export interface BlogPost {
  id: string;
  propertyId: string | null;
  authorId: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  contentHtml: string | null;
  featuredImageUrl: string | null;
  category: string | null;
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt: string | null;
  viewCount: number;
  likeCount: number;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

interface OwnerContact {
  phone: string | null;
  email: string | null;
  lineId: string | null;
  wechatId: string | null;
  whatsapp: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
}

/** Get contact info for the currently logged-in session user. */
async function getSessionUserContact(): Promise<OwnerContact> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { phone: null, email: null, lineId: null, wechatId: null, whatsapp: null, facebookUrl: null, instagramUrl: null };
    return getOwnerContact(user.id);
  } catch {
    return { phone: null, email: null, lineId: null, wechatId: null, whatsapp: null, facebookUrl: null, instagramUrl: null };
  }
}

async function getOwnerContact(ownerId: string): Promise<OwnerContact> {
  try {
    const adminClient = createAdminClient();
    const [profileResult, authResult] = await Promise.all([
      adminClient
        .from('users_profile')
        .select('phone, line_id, wechat_id, whatsapp, facebook_url, instagram_url')
        .eq('id', ownerId)
        .maybeSingle(),
      adminClient.auth.admin.getUserById(ownerId),
    ]);
    const p = profileResult.data;
    return {
      phone:        p?.phone        ?? null,
      email:        authResult.data?.user?.email ?? null,
      lineId:       p?.line_id      ?? null,
      wechatId:     p?.wechat_id    ?? null,
      whatsapp:     p?.whatsapp     ?? null,
      facebookUrl:  p?.facebook_url  ?? null,
      instagramUrl: p?.instagram_url ?? null,
    };
  } catch {
    return { phone: null, email: null, lineId: null, wechatId: null, whatsapp: null, facebookUrl: null, instagramUrl: null };
  }
}

async function generateDescriptionWithAI(data: PropertyDataForBlog): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const isSale = data.type === 'sale';
  const typeLabel = isSale ? '出售' : '出租';
  const locationStr = [data.addressCity, data.addressDistrict].filter(Boolean).join('');
  const areaDisplay = data.area ? `${(data.area * 0.3025).toFixed(1)} 坪` : '未提供';
  const layoutParts = [
    data.bedrooms && `${data.bedrooms}房`,
    data.livingRooms && `${data.livingRooms}廳`,
    data.bathrooms && `${data.bathrooms}衛`,
  ].filter(Boolean).join('');

  const prompt = `你是一位專業的台灣房地產銷售文案師。請根據以下物件資料，撰寫一篇分段的物件介紹（共 4 段，段落之間空一行）。

【物件資料】
- 交易類型：${typeLabel}
- 物件類型：${data.propertyType || '住宅'}
- 地點：${locationStr || data.address}
- 格局：${layoutParts || '未提供'}
- 面積：${areaDisplay}
${data.description ? `- 補充說明：${data.description}` : ''}

【請依照以下四段結構，段落間換行，不要加任何標題或編號】

第一段（30-50 字）：以一句觸動人心的情境描述開場，讓讀者能想像在此居住的美好感受。

第二段（60-80 字）：聚焦本物件 2-3 個具體賣點，例如地段優勢、採光、格局實用性或交通便利，使用真實且具體的描述，不要浮誇。

第三段（40-60 字）：描述此地段的周邊日常生活機能（例如超市、公園、捷運、學校等），讓潛在買家感受到生活的便利性。

第四段（25-40 字）：點出最適合這個物件的買家輪廓，例如首購族、換屋家庭、投資客或退休人士。

【要求】使用流暢繁體中文，語氣真誠專業，嚴禁誇大不實用語（如「夢幻」「一生難得」「最頂級」），不要加聯絡資訊、前言或後記，只輸出四段正文本身。`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) return null;
    const json = await response.json() as { content?: Array<{ text?: string }> };
    return json.content?.[0]?.text?.trim() ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public server actions
// ---------------------------------------------------------------------------

export async function getPropertyBlog(propertyId: string): Promise<BlogPost | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('blog_posts')
    .select('*')
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    propertyId: data.property_id,
    authorId: data.author_id,
    title: data.title,
    slug: data.slug,
    excerpt: data.excerpt,
    content: data.content,
    contentHtml: data.content_html,
    featuredImageUrl: data.featured_image_url,
    category: data.category,
    tags: data.tags || [],
    status: data.status,
    publishedAt: data.published_at,
    viewCount: data.view_count ?? 0,
    likeCount: data.like_count ?? 0,
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    seoKeywords: data.seo_keywords || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function generatePropertyBlog(
  propertyId: string,
  propertyType: 'sale' | 'rental',
  ownerId: string
): Promise<ActionResult & { blog?: BlogPost }> {
  const adminClient = createAdminClient();

  try {
    const table = propertyType === 'sale' ? 'property_sales' : 'property_rentals';
    const { data: property, error: propError } = await adminClient
      .from(table)
      .select('*')
      .eq('id', propertyId)
      .single();

    if (propError || !property) {
      return { success: false, message: `找不到物件：${propError?.message || 'not found'}` };
    }

    const { data: photoRows } = await adminClient
      .from('property_photos')
      .select('id, storage_path, is_primary, photo_type')
      .eq('property_id', propertyId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
    const photos = (photoRows || []).map((r) => ({
      url: `${baseUrl}/storage/v1/object/public/property-photos/${r.storage_path}`,
      isPrimary: !!r.is_primary,
      photoType: r.photo_type ?? 'interior',
    }));

    const details = (property.details || {}) as Record<string, unknown>;

    const blogData: PropertyDataForBlog = {
      id: propertyId,
      type: propertyType,
      title: property.title || (details.title as string) || property.address,
      address: property.address,
      addressCity: property.address_city || (details.addressCity as string),
      addressDistrict: property.address_district || (details.addressDistrict as string),
      addressStreet: property.address_street || (details.addressStreet as string),
      price: propertyType === 'sale' ? property.price : null,
      monthlyRent: propertyType === 'rental' ? property.monthly_rent : null,
      area: property.area_registered || (details.area as number | null),
      propertyType: property.building_type || (details.type as string | null),
      bedrooms: property.layout_rooms || (details.bedrooms as number | null),
      bathrooms: property.layout_bathrooms || (details.bathrooms as number | null),
      livingRooms: property.layout_living_rooms || (details.livingRooms as number | null),
      parkingSpaces: property.has_parking ? 1 : (details.parkingSpaces as number | null),
      photos,
      description: details.description as string | undefined,
    };

    // Fetch session user contact info and generate AI description in parallel
    // Contact info comes from the logged-in agent/admin, not the property owner
    const [ownerContact, aiDescription] = await Promise.all([
      getSessionUserContact(),
      generateDescriptionWithAI(blogData),
    ]);

    blogData.ownerPhone       = ownerContact.phone;
    blogData.ownerEmail       = ownerContact.email;
    blogData.ownerLineId      = ownerContact.lineId;
    blogData.ownerWechatId    = ownerContact.wechatId;
    blogData.ownerWhatsapp    = ownerContact.whatsapp;
    blogData.ownerFacebookUrl = ownerContact.facebookUrl;
    blogData.ownerInstagramUrl = ownerContact.instagramUrl;
    blogData.aiDescription    = aiDescription ?? undefined;

    const generated = generateBlogContent(blogData);
    const slug = generateSlug(blogData);

    const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0];

    const { data: existing } = await adminClient
      .from('blog_posts')
      .select('id')
      .eq('property_id', propertyId)
      .limit(1)
      .maybeSingle();

    let blogId: string;

    if (existing) {
      const { error: updateError } = await adminClient
        .from('blog_posts')
        .update({
          title: generated.title,
          slug,
          excerpt: generated.excerpt,
          content: generated.content,
          content_html: generated.contentHtml,
          featured_image_url: primaryPhoto?.url || null,
          category: generated.category,
          tags: generated.tags,
          seo_title: generated.seoTitle,
          seo_description: generated.seoDescription,
          seo_keywords: generated.seoKeywords,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        return { success: false, message: `更新部落格失敗：${updateError.message}` };
      }
      blogId = existing.id;
    } else {
      const { data: inserted, error: insertError } = await adminClient
        .from('blog_posts')
        .insert({
          property_id: propertyId,
          author_id: ownerId,
          title: generated.title,
          slug,
          excerpt: generated.excerpt,
          content: generated.content,
          content_html: generated.contentHtml,
          featured_image_url: primaryPhoto?.url || null,
          category: generated.category,
          tags: generated.tags,
          status: 'draft',
          seo_title: generated.seoTitle,
          seo_description: generated.seoDescription,
          seo_keywords: generated.seoKeywords,
        })
        .select('id')
        .single();

      if (insertError) {
        if (insertError.message.includes('unique') || insertError.message.includes('duplicate')) {
          const newSlug = `${slug}-${Date.now().toString(36)}`;
          const { data: retry, error: retryError } = await adminClient
            .from('blog_posts')
            .insert({
              property_id: propertyId,
              author_id: ownerId,
              title: generated.title,
              slug: newSlug,
              excerpt: generated.excerpt,
              content: generated.content,
              content_html: generated.contentHtml,
              featured_image_url: primaryPhoto?.url || null,
              category: generated.category,
              tags: generated.tags,
              status: 'draft',
              seo_title: generated.seoTitle,
              seo_description: generated.seoDescription,
              seo_keywords: generated.seoKeywords,
            })
            .select('id')
            .single();

          if (retryError) {
            return { success: false, message: `建立部落格失敗：${retryError.message}` };
          }
          blogId = retry!.id;
        } else {
          return { success: false, message: `建立部落格失敗：${insertError.message}` };
        }
      } else {
        blogId = inserted!.id;
      }
    }

    void blogId; // used implicitly via getPropertyBlog
    const blog = await getPropertyBlog(propertyId);

    revalidatePath('/superadmin/properties');
    return {
      success: true,
      message: existing
        ? `部落格已重新生成${aiDescription ? '（含 AI 文案）' : ''}`
        : `部落格已成功生成${aiDescription ? '（含 AI 文案）' : ''}`,
      blog: blog || undefined,
    };
  } catch (error) {
    console.error('[Blog] generatePropertyBlog error:', error);
    return {
      success: false,
      message: `生成失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
    };
  }
}

export async function updatePropertyBlog(
  blogId: string,
  data: { title: string; excerpt: string }
): Promise<ActionResult> {
  const adminClient = createAdminClient();

  // Also update hero title in contentHtml for consistency
  const { data: existing } = await adminClient
    .from('blog_posts')
    .select('content_html')
    .eq('id', blogId)
    .maybeSingle();

  let updatedContentHtml: string | undefined;
  if (existing?.content_html) {
    updatedContentHtml = existing.content_html.replace(
      /<h1 class="hero-title">[^<]*<\/h1>/,
      `<h1 class="hero-title">${data.title}</h1>`
    );
  }

  const { error } = await adminClient
    .from('blog_posts')
    .update({
      title: data.title,
      excerpt: data.excerpt,
      ...(updatedContentHtml ? { content_html: updatedContentHtml } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', blogId);

  if (error) return { success: false, message: `儲存失敗：${error.message}` };

  revalidatePath('/superadmin/properties');
  return { success: true, message: '已儲存變更' };
}

export async function publishPropertyBlog(blogId: string): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('blog_posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', blogId);

  if (error) return { success: false, message: `發佈失敗：${error.message}` };

  revalidatePath('/superadmin/properties');
  return { success: true, message: '部落格已發佈' };
}

export async function unpublishPropertyBlog(blogId: string): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('blog_posts')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', blogId);

  if (error) return { success: false, message: `下架失敗：${error.message}` };

  revalidatePath('/superadmin/properties');
  return { success: true, message: '部落格已下架' };
}

/**
 * Re-sync only the CTA section of a blog's content_html with the latest
 * owner contact info. Preserves AI copy, photos, and all other sections.
 */
export async function syncBlogCTA(
  blogId: string
): Promise<ActionResult> {
  const adminClient = createAdminClient();

  // Contact info from the logged-in session user (the agent), not the property owner
  const [{ data: existing }, ownerContact] = await Promise.all([
    adminClient.from('blog_posts').select('content_html').eq('id', blogId).maybeSingle(),
    getSessionUserContact(),
  ]);

  if (!existing?.content_html) {
    return { success: false, message: '找不到部落格內容' };
  }

  const newCtaSection = buildCtaSection({
    phone:        ownerContact.phone,
    email:        ownerContact.email,
    lineId:       ownerContact.lineId,
    wechatId:     ownerContact.wechatId,
    whatsapp:     ownerContact.whatsapp,
    facebookUrl:  ownerContact.facebookUrl,
    instagramUrl: ownerContact.instagramUrl,
  });

  // Replace the entire CTA section (from <!-- CTA --> comment to its closing </section>)
  const updatedHtml = existing.content_html.replace(
    /<!--\s*CTA\s*-->[\s\S]*?<\/section>/,
    newCtaSection
  );

  const { error } = await adminClient
    .from('blog_posts')
    .update({ content_html: updatedHtml, updated_at: new Date().toISOString() })
    .eq('id', blogId);

  if (error) return { success: false, message: `同步失敗：${error.message}` };

  revalidatePath('/superadmin/properties');
  return { success: true, message: '聯絡方式已同步至部落格 CTA' };
}

export async function deletePropertyBlog(blogId: string): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const { error } = await adminClient.from('blog_posts').delete().eq('id', blogId);

  if (error) return { success: false, message: `刪除失敗：${error.message}` };

  revalidatePath('/superadmin/properties');
  return { success: true, message: '部落格已刪除' };
}
