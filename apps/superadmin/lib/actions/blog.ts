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
import { luxuryDarkBloggerTemplate } from '@/lib/blog-style-templates/blogger/luxuryDarkTemplate';
import { brightCleanBloggerTemplate } from '@/lib/blog-style-templates/blogger/brightCleanTemplate';
import { corporateBloggerTemplate } from '@/lib/blog-style-templates/blogger/corporateTemplate';
import { warmJapaneseBloggerTemplate } from '@/lib/blog-style-templates/blogger/warmJapaneseTemplate';
import { luxuryDarkLocalTemplate } from '@/lib/blog-style-templates/local/luxuryDarkTemplate';
import { brightCleanLocalTemplate } from '@/lib/blog-style-templates/local/brightCleanTemplate';
import { corporateLocalTemplate } from '@/lib/blog-style-templates/local/corporateTemplate';
import { warmJapaneseLocalTemplate } from '@/lib/blog-style-templates/local/warmJapaneseTemplate';

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
  blogStylePreset: StylePreset | null;
  blogTargetPlatform: BlogTargetPlatform | null;
  referenceUrl: string | null;
  referenceUrlNormalized: string | null;
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

export type StylePreset = 'luxury_dark' | 'bright_clean' | 'corporate' | 'warm_japanese';

export type BlogTargetPlatform = 'local' | 'google_blogger';

export interface BlogVariant {
  stylePreset: StylePreset;
  targetPlatform: BlogTargetPlatform;
  referenceUrl?: string;
}

function normalizeReferenceUrl(referenceUrl?: string): string | null {
  const trimmed = referenceUrl?.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    const sortedSearchParams = new URLSearchParams(
      Array.from(parsed.searchParams.entries()).sort(([leftKey, leftValue], [rightKey, rightValue]) => {
        const keyCompare = leftKey.localeCompare(rightKey);
        if (keyCompare !== 0) return keyCompare;
        return leftValue.localeCompare(rightValue);
      }),
    );

    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.hash = '';
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    parsed.search = sortedSearchParams.toString() ? `?${sortedSearchParams.toString()}` : '';

    return parsed.toString();
  } catch {
    return null;
  }
}

function mapBlogRow(data: Record<string, unknown>): BlogPost {
  const preset = data.blog_style_preset;
  const platform = data.blog_target_platform;

  return {
    id: data.id as string,
    propertyId: (data.property_id as string | null) ?? null,
    authorId: data.author_id as string,
    title: data.title as string,
    slug: data.slug as string,
    excerpt: (data.excerpt as string | null) ?? null,
    content: data.content as string,
    contentHtml: (data.content_html as string | null) ?? null,
    featuredImageUrl: (data.featured_image_url as string | null) ?? null,
    category: (data.category as string | null) ?? null,
    tags: (data.tags as string[] | null) ?? [],
    status: data.status as 'draft' | 'published' | 'archived',
    publishedAt: (data.published_at as string | null) ?? null,
    viewCount: (data.view_count as number | null) ?? 0,
    likeCount: (data.like_count as number | null) ?? 0,
    seoTitle: (data.seo_title as string | null) ?? null,
    seoDescription: (data.seo_description as string | null) ?? null,
    seoKeywords: (data.seo_keywords as string[] | null) ?? [],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    blogStylePreset: typeof preset === 'string' ? (preset as StylePreset) : null,
    blogTargetPlatform: platform === 'local' || platform === 'google_blogger' ? platform : null,
    referenceUrl: (data.reference_url as string | null) ?? null,
    referenceUrlNormalized: (data.reference_url_normalized as string | null) ?? null,
  };
}

export async function getPropertyBlog(
  propertyId: string,
  variant?: BlogVariant,
): Promise<BlogPost | null> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from('blog_posts')
    .select('*')
    .eq('property_id', propertyId);

  if (variant) {
    const normalizedReferenceUrl = normalizeReferenceUrl(variant.referenceUrl);

    query = query
      .eq('blog_style_preset', variant.stylePreset)
      .eq('blog_target_platform', variant.targetPlatform);

    query = normalizedReferenceUrl
      ? query.eq('reference_url_normalized', normalizedReferenceUrl)
      : query.is('reference_url_normalized', null);
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  return mapBlogRow(data as Record<string, unknown>);
}

const BLOGGER_STYLE_PRESET_DESCRIPTIONS: Record<StylePreset, string> = {
  luxury_dark: luxuryDarkBloggerTemplate,
  bright_clean: brightCleanBloggerTemplate,
  corporate: corporateBloggerTemplate,
  warm_japanese: warmJapaneseBloggerTemplate,
};

const LOCAL_STYLE_PRESET_DESCRIPTIONS: Record<StylePreset, string> = {
  luxury_dark: luxuryDarkLocalTemplate,
  bright_clean: brightCleanLocalTemplate,
  corporate: corporateLocalTemplate,
  warm_japanese: warmJapaneseLocalTemplate,
};

/** Generate HTML from a style preset using Claude (no reference URL needed). */
async function generatePresetStyleHtml(
  preset: StylePreset,
  data: PropertyDataForBlog,
  contact: OwnerContact,
  targetPlatform: BlogTargetPlatform,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const isSale = data.type === 'sale';
  const typeLabel = isSale ? '出售' : '出租';
  const priceLabel = isSale
    ? data.price ? `${(data.price / 10000).toFixed(0)} 萬` : '洽詢'
    : data.monthlyRent ? `NT$ ${data.monthlyRent.toLocaleString()} / 月` : '洽詢';
  const areaDisplay = data.area ? `${(data.area * 0.3025).toFixed(1)} 坪` : null;
  const layoutParts = [
    data.bedrooms    && `${data.bedrooms}房`,
    data.livingRooms && `${data.livingRooms}廳`,
    data.bathrooms   && `${data.bathrooms}衛`,
  ].filter(Boolean).join('');
  const locationStr = [data.addressCity, data.addressDistrict].filter(Boolean).join('');
  const photosList = data.photos.slice(0, 12).map((p, i) => `  - Photo ${i + 1}: ${p.url}`).join('\n');
  const ctaLines = [
    contact.phone    && `Phone: ${contact.phone} (Link as tel:${contact.phone})`,
    contact.email    && `Email: ${contact.email} (Link as mailto:${contact.email})`,
    contact.lineId   && `LINE ID: ${contact.lineId} (Link to https://line.me/ti/p/~${contact.lineId})`,
    contact.whatsapp && `WhatsApp: ${contact.whatsapp} (Link to https://wa.me/${contact.whatsapp.replace(/\D/g,'')})`,
    contact.wechatId && `WeChat: ${contact.wechatId}`,
  ].filter(Boolean).join('\n');

  const styleDesc = targetPlatform === 'google_blogger'
    ? BLOGGER_STYLE_PRESET_DESCRIPTIONS[preset]
    : LOCAL_STYLE_PRESET_DESCRIPTIONS[preset];

  const prompt = `You are a world-class Web UI/UX Engineer and Real Estate Copywriter.
Your task is to generate a STANDALONE, high-converting, fully responsive HTML property listing page tailored specifically and safely for Google Blogger.

===== DESIGN STYLE TO APPLY =====
${styleDesc}

===== PROPERTY DATA =====
- Title: ${data.title || data.address}
- Type: ${typeLabel}
- Location: ${locationStr || data.address}
- Price: ${priceLabel}
${areaDisplay ? `- Area: ${areaDisplay}` : ''}
${layoutParts ? `- Layout: ${layoutParts}` : ''}
${data.propertyType ? `- Building type: ${data.propertyType}` : ''}
${data.description || data.aiDescription ? `- Description: ${data.aiDescription || data.description}` : ''}

===== PHOTOS =====
Generate a beautifully styled gallery. You MUST use EXACTLY these image URLs in <img> tags.
Set 'alt' attributes descriptively. Use CSS 'object-fit: cover' and 'width: 100%' so they don't break the layout.
${photosList || '  (No photos provided, please omit gallery)'}

===== CONTACT / CALL TO ACTION =====
Create a highly visible, sticky or styled CTA section at the bottom or floating.
Every contact method MUST be an actual clickable <a> tag with 'target="_blank"' where applicable.
${ctaLines || '  (No contact info)'}

===== STRICT GENERATION RULES =====
1. STRUCTURE: Output ONLY valid HTML wrapped in a single <div class="property-listing-container">. DO NOT include <!DOCTYPE html>, <html>, <head>, or <body> tags. Blogger will inject this inside its own body.
2. CSS: ALL CSS MUST be scoped. Put all CSS inside a <style> block at the very top of your output. Prefix all your CSS selectors with '.property-listing-container' so it does not infect the rest of the Blogger page. Ensure z-index is set high enough (e.g. z-index: 50) for buttons and links so Blogger's native elements don't block clicks.
3. IMAGES: Every photo must be loaded via <img src="..." alt="..." style="width: 100%; height: auto; object-fit: cover; border-radius: ...">. Do not use background-images for property photos because users cannot click/expand them easily.
4. LINKS: All <a> tags must have valid 'href' attributes based on the contact info (tel:, mailto:, https://line.me...). Use target="_blank" rel="noopener noreferrer" for external links. Anchor links (e.g. #gallery) must match valid IDs within the container. Make sure links have position: relative and z-index: 100 so they are clickable.
5. RESPONSIVENESS: Use CSS Flexbox or CSS Grid. The design MUST format perfectly on mobile (e.g., flex-direction: column) and desktop (grid-template-columns).
6. CONTENT: Use Traditional Chinese (繁體中文) for all visible text. Structure the data nicely into sections (Highlights, Details, Description, Gallery, CTA). Make it look polished, not just raw text.
7. ABSOLUTELY NO markdown wrapping (e.g. no \`\`\`html). Output the raw HTML string directly.`;

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
        max_tokens: 8000,
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

/** Fetch a reference URL and extract its HTML for style analysis (strips scripts/styles). */
async function fetchReferenceHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PropertyBlogBot/1.0)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const raw = await res.text();

    // Strip <script>, <style> blocks and data URIs to keep the prompt lean
    const stripped = raw
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/data:[^"';\s]{0,200}/gi, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 12_000); // keep at most 12k chars

    return stripped;
  } catch {
    return null;
  }
}

/**
 * Use Claude to analyse a reference page's design and generate custom-styled blog HTML.
 * Falls back to undefined on failure so the caller can use the default template.
 */
async function generateCustomStyleHtml(
  referenceHtml: string,
  data: PropertyDataForBlog,
  contact: OwnerContact,
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const isSale = data.type === 'sale';
  const typeLabel = isSale ? '出售' : '出租';
  const priceLabel = isSale
    ? data.price ? `${(data.price / 10000).toFixed(0)} 萬` : '洽詢'
    : data.monthlyRent ? `NT$ ${data.monthlyRent.toLocaleString()} / 月` : '洽詢';
  const areaDisplay = data.area ? `${(data.area * 0.3025).toFixed(1)} 坪` : null;
  const layoutParts = [
    data.bedrooms    && `${data.bedrooms}房`,
    data.livingRooms && `${data.livingRooms}廳`,
    data.bathrooms   && `${data.bathrooms}衛`,
  ].filter(Boolean).join('');
  const locationStr = [data.addressCity, data.addressDistrict].filter(Boolean).join('');
  const photosList = data.photos.slice(0, 12).map((p, i) => `  - Photo ${i + 1}: ${p.url}`).join('\n');

  const ctaLines = [
    contact.phone    && `Phone: ${contact.phone} (Link as tel:${contact.phone})`,
    contact.email    && `Email: ${contact.email} (Link as mailto:${contact.email})`,
    contact.lineId   && `LINE ID: ${contact.lineId} (Link to https://line.me/ti/p/~${contact.lineId})`,
    contact.whatsapp && `WhatsApp: ${contact.whatsapp} (Link to https://wa.me/${contact.whatsapp.replace(/\D/g,'')})`,
    contact.wechatId && `WeChat: ${contact.wechatId}`,
  ].filter(Boolean).join('\n');

  const prompt = `You are a world-class Web UI/UX Engineer and Real Estate Copywriter.

Below is the HTML source of a reference property listing website that the owner likes.
Carefully analyze its visual design language: color palette, typography, layout structure, hero style, card styles, section arrangements, and overall mood (luxury, modern, minimalist, warm, etc.).

--- REFERENCE WEBSITE HTML (truncated) ---
${referenceHtml}
--- END REFERENCE HTML ---

Now generate a COMPLETE, STANDALONE single-page HTML property listing tailored specifically and safely for Google Blogger that:
1. Faithfully replicates the visual design language of the reference site
2. Uses the following property data (in Traditional Chinese where appropriate):
   - Title: ${data.title || data.address}
   - Type: ${typeLabel}
   - Location: ${locationStr || data.address}
   - Price: ${priceLabel}
   ${areaDisplay ? `- Area: ${areaDisplay}` : ''}
   ${layoutParts ? `- Layout: ${layoutParts}` : ''}
   ${data.propertyType ? `- Building type: ${data.propertyType}` : ''}
   ${data.description ? `- Description: ${data.description}` : ''}
3. Embeds these property photos:
   You MUST use EXACTLY these image URLs in <img> tags. Set 'alt' attributes descriptively. Use CSS 'object-fit: cover'.
${photosList || '  (No photos available, please omit gallery)'}
4. Includes a contact CTA section with:
   Every contact method MUST be an actual clickable <a> tag with 'target="_blank"' where applicable.
${ctaLines || '  (No contact info provided)'}

===== STRICT GENERATION RULES =====
1. STRUCTURE: Output ONLY valid HTML wrapped in a single <div class="property-listing-container">. DO NOT include <!DOCTYPE html>, <html>, <head>, or <body> tags. Blogger will inject this inside its own body.
2. CSS: ALL CSS MUST be scoped. Put all CSS inside a <style> block at the very top of your output. Prefix all your CSS selectors with '.property-listing-container' so it does not infect the rest of the Blogger page. Ensure z-index is set high enough (e.g. z-index: 50) for buttons and links so Blogger's native elements don't block clicks.
3. IMAGES: Every photo must be loaded via <img src="..." alt="..." style="width: 100%; height: auto; object-fit: cover; border-radius: ...">. Do not use background-images for property photos because users cannot click/expand them easily.
4. LINKS: All <a> tags must have valid 'href' attributes based on the contact info. Use target="_blank" rel="noopener noreferrer" for external links. Anchor links (e.g. #gallery) must match valid IDs within the container. Make sure links have position: relative and z-index: 100 so they are clickable.
5. RESPONSIVENESS: Use CSS Flexbox or CSS Grid. The design MUST format parfaitement on mobile (e.g., flex-direction: column) and desktop.
6. CONTENT: Use Traditional Chinese (繁體中文) for all visible text. Structure the data nicely into sections. Make it look polished.
7. ABSOLUTELY NO markdown wrapping (e.g. no \`\`\`html). Output the raw HTML string directly.`;

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
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return null;
    const json = await response.json() as { content?: Array<{ text?: string }> };
    const text = json.content?.[0]?.text?.trim();
    return text ?? null;
  } catch {
    return null;
  }
}

export async function generatePropertyBlog(
  propertyId: string,
  propertyType: 'sale' | 'rental',
  ownerId: string,
  options?: { referenceUrl?: string; stylePreset?: StylePreset; targetPlatform?: BlogTargetPlatform }
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

    // Fetch session user contact info; optionally fetch reference URL HTML
    const [ownerContact, referenceHtml] = await Promise.all([
      getOwnerContact(ownerId),
      options?.referenceUrl ? fetchReferenceHtml(options.referenceUrl) : Promise.resolve(null),
    ]);

    blogData.ownerPhone        = ownerContact.phone;
    blogData.ownerEmail        = ownerContact.email;
    blogData.ownerLineId       = ownerContact.lineId;
    blogData.ownerWechatId     = ownerContact.wechatId;
    blogData.ownerWhatsapp     = ownerContact.whatsapp;
    blogData.ownerFacebookUrl  = ownerContact.facebookUrl;
    blogData.ownerInstagramUrl = ownerContact.instagramUrl;

    // Generation priority: referenceUrl > stylePreset > default template
    let generated = generateBlogContent(blogData);
    let usedReferenceStyle = false;
    let usedPresetStyle = false;

    const targetPlatform = options?.targetPlatform ?? 'local';
    const variantPreset = options?.stylePreset ?? 'luxury_dark';
    const normalizedReferenceUrl = normalizeReferenceUrl(options?.referenceUrl);
    const trimmedReferenceUrl = options?.referenceUrl?.trim() || null;

    if (referenceHtml) {
      const customHtml = await generateCustomStyleHtml(referenceHtml, blogData, ownerContact);
      if (customHtml) {
        generated = { ...generated, contentHtml: customHtml };
        usedReferenceStyle = true;
      }
    } else if (options?.stylePreset) {
      const presetHtml = await generatePresetStyleHtml(options.stylePreset, blogData, ownerContact, targetPlatform);
      if (presetHtml) {
        generated = { ...generated, contentHtml: presetHtml };
        usedPresetStyle = true;
      }
    } else {
      const aiDescription = await generateDescriptionWithAI(blogData);
      blogData.aiDescription = aiDescription ?? undefined;
      generated = generateBlogContent(blogData);
    }
    const slug = generateSlug(blogData);

    const primaryPhoto = photos.find((p) => p.isPrimary) || photos[0];

    let existingQuery = adminClient
      .from('blog_posts')
      .select('id')
      .eq('property_id', propertyId)
      .eq('blog_style_preset', variantPreset)
      .eq('blog_target_platform', targetPlatform);

    existingQuery = normalizedReferenceUrl
      ? existingQuery.eq('reference_url_normalized', normalizedReferenceUrl)
      : existingQuery.is('reference_url_normalized', null);

    const { data: existing } = await existingQuery.maybeSingle();

    let blogId: string;
    const variantColumns = {
      blog_style_preset: variantPreset,
      blog_target_platform: targetPlatform,
      reference_url: trimmedReferenceUrl,
      reference_url_normalized: normalizedReferenceUrl,
    };

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
          ...variantColumns,
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
          ...variantColumns,
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
              ...variantColumns,
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

    void blogId;
    const blog = await getPropertyBlog(propertyId, {
      stylePreset: variantPreset,
      targetPlatform,
      referenceUrl: trimmedReferenceUrl ?? undefined,
    });

    revalidatePath('/superadmin/properties');
    const suffix = usedReferenceStyle
      ? '（已套用參考網頁風格）'
      : usedPresetStyle
        ? '（已套用預設風格）'
        : blogData.aiDescription ? '（含 AI 文案）' : '';
    return {
      success: true,
      message: existing ? `部落格已重新生成${suffix}` : `部落格已成功生成${suffix}`,
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
