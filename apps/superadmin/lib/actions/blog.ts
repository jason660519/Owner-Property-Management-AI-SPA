// filepath: apps/superadmin/lib/actions/blog.ts
// Server actions for property blog generation and management
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/lib/types/properties';

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

interface PropertyDataForBlog {
  id: string;
  type: 'sale' | 'rental';
  title: string;
  address: string;
  addressCity?: string;
  addressDistrict?: string;
  addressStreet?: string;
  price?: number | null;
  monthlyRent?: number | null;
  area?: number | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  livingRooms?: number | null;
  parkingSpaces?: number | null;
  photos: { url: string; isPrimary: boolean; photoType: string }[];
  description?: string;
}

function generateSlug(data: PropertyDataForBlog): string {
  const parts: string[] = [];
  parts.push(data.type === 'sale' ? 'sale' : 'rental');
  if (data.addressCity) parts.push(data.addressCity);
  if (data.addressDistrict) parts.push(data.addressDistrict);
  if (data.title) parts.push(data.title.slice(0, 20));
  const hash = data.id.slice(0, 8);
  parts.push(hash);
  const slug = parts
    .join('-')
    .replace(/[^\u4e00-\u9fff\w-]/g, '')
    .replace(/-+/g, '-')
    .toLowerCase();
  return slug || `property-${hash}`;
}

function formatPrice(price: number | null | undefined, type: 'sale' | 'rental'): string {
  if (!price) return '洽詢';
  if (type === 'sale') {
    if (price >= 10000) return `${(price / 10000).toFixed(0)} 萬`;
    return `NT$ ${price.toLocaleString()}`;
  }
  return `NT$ ${price.toLocaleString()} / 月`;
}

function generateBlogContent(data: PropertyDataForBlog): {
  title: string;
  excerpt: string;
  content: string;
  contentHtml: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
  category: string;
} {
  const isSale = data.type === 'sale';
  const priceValue = isSale ? data.price : data.monthlyRent;
  const priceLabel = formatPrice(priceValue, data.type);
  const typeLabel = isSale ? '出售' : '出租';
  const areaDisplay = data.area ? `${(data.area * 0.3025).toFixed(1)} 坪` : null;
  const layoutParts: string[] = [];
  if (data.bedrooms) layoutParts.push(`${data.bedrooms}房`);
  if (data.livingRooms) layoutParts.push(`${data.livingRooms}廳`);
  if (data.bathrooms) layoutParts.push(`${data.bathrooms}衛`);
  const layoutStr = layoutParts.join('') || null;
  const locationStr = [data.addressCity, data.addressDistrict].filter(Boolean).join('');

  const primaryPhoto = data.photos.find((p) => p.isPrimary) || data.photos[0];
  const galleryPhotos = data.photos.slice(0, 12);

  const blogTitle = `【${typeLabel}】${data.title || data.address}${locationStr ? ` — ${locationStr}` : ''}`;
  const excerpt = [
    locationStr ? `位於${locationStr}` : null,
    data.propertyType ? `${data.propertyType}物件` : null,
    layoutStr,
    areaDisplay ? `面積約 ${areaDisplay}` : null,
    `${typeLabel}價格 ${priceLabel}`,
  ]
    .filter(Boolean)
    .join('，');

  const highlightItems = [
    { icon: '🏷️', label: isSale ? '售價' : '月租', value: priceLabel },
    areaDisplay ? { icon: '📐', label: '面積', value: areaDisplay } : null,
    layoutStr ? { icon: '🏠', label: '格局', value: layoutStr } : null,
    data.propertyType ? { icon: '🏢', label: '類型', value: data.propertyType } : null,
    data.parkingSpaces ? { icon: '🚗', label: '車位', value: `${data.parkingSpaces} 個` } : null,
    locationStr ? { icon: '📍', label: '地區', value: locationStr } : null,
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  const highlightsHtml = highlightItems
    .map(
      (h) =>
        `<div class="highlight-card"><span class="highlight-icon">${h.icon}</span><span class="highlight-label">${h.label}</span><span class="highlight-value">${h.value}</span></div>`
    )
    .join('\n');

  const galleryHtml =
    galleryPhotos.length > 0
      ? galleryPhotos
          .map(
            (p, i) =>
              `<div class="gallery-item${i === 0 ? ' gallery-item-featured' : ''}"><img src="${p.url}" alt="${data.title || '物件照片'} - 照片${i + 1}" loading="lazy" /></div>`
          )
          .join('\n')
      : '<div class="no-photos"><p>照片準備中</p></div>';

  const addressParts = [
    data.addressCity,
    data.addressDistrict,
    data.addressStreet,
    data.address,
  ].filter(Boolean);
  const fullAddress = addressParts.length > 0 ? addressParts[addressParts.length - 1] : '詳洽仲介';

  const descriptionSection = data.description
    ? `<section class="blog-section"><h2>物件說明</h2><div class="description-content"><p>${data.description.replace(/\n/g, '</p><p>')}</p></div></section>`
    : '';

  const contentHtml = `
<article class="property-blog">
  <!-- Hero -->
  <section class="hero-section">
    ${primaryPhoto ? `<div class="hero-image"><img src="${primaryPhoto.url}" alt="${data.title || '物件主照'}" /></div>` : '<div class="hero-placeholder"><div class="hero-placeholder-inner">📷 照片準備中</div></div>'}
    <div class="hero-overlay">
      <div class="hero-badge">${typeLabel}</div>
      <h1 class="hero-title">${data.title || data.address}</h1>
      <p class="hero-location">📍 ${fullAddress}</p>
    </div>
  </section>

  <!-- Highlights -->
  <section class="blog-section">
    <h2>物件亮點</h2>
    <div class="highlights-grid">
      ${highlightsHtml}
    </div>
  </section>

  <!-- Gallery -->
  <section class="blog-section">
    <h2>物件照片</h2>
    <div class="gallery-grid">
      ${galleryHtml}
    </div>
  </section>

  ${descriptionSection}

  <!-- Details -->
  <section class="blog-section">
    <h2>物件資訊</h2>
    <div class="details-table">
      <div class="detail-row"><span class="detail-label">物件類型</span><span class="detail-value">${data.propertyType || '—'}</span></div>
      <div class="detail-row"><span class="detail-label">${isSale ? '售價' : '月租金'}</span><span class="detail-value price-value">${priceLabel}</span></div>
      ${areaDisplay ? `<div class="detail-row"><span class="detail-label">面積</span><span class="detail-value">${areaDisplay}</span></div>` : ''}
      ${layoutStr ? `<div class="detail-row"><span class="detail-label">格局</span><span class="detail-value">${layoutStr}</span></div>` : ''}
      ${data.parkingSpaces ? `<div class="detail-row"><span class="detail-label">車位</span><span class="detail-value">${data.parkingSpaces} 個</span></div>` : ''}
      <div class="detail-row"><span class="detail-label">地址</span><span class="detail-value">${fullAddress}</span></div>
    </div>
  </section>

  <!-- CTA -->
  <section class="blog-section cta-section">
    <h2>有興趣嗎？</h2>
    <p>歡迎來電或來訊預約看房，我們將為您安排最佳時段。</p>
    <div class="cta-buttons">
      <a href="tel:" class="cta-btn cta-btn-primary">📞 立即來電</a>
      <a href="mailto:" class="cta-btn cta-btn-secondary">✉️ 線上詢問</a>
    </div>
  </section>
</article>`;

  const content = [
    blogTitle,
    '',
    excerpt,
    '',
    '## 物件亮點',
    ...highlightItems.map((h) => `- ${h.icon} ${h.label}：${h.value}`),
    '',
    data.description ? `## 物件說明\n${data.description}\n` : '',
    '## 物件資訊',
    `- 類型：${data.propertyType || '—'}`,
    `- ${isSale ? '售價' : '月租'}：${priceLabel}`,
    areaDisplay ? `- 面積：${areaDisplay}` : '',
    layoutStr ? `- 格局：${layoutStr}` : '',
    data.parkingSpaces ? `- 車位：${data.parkingSpaces} 個` : '',
    `- 地址：${fullAddress}`,
  ]
    .filter(Boolean)
    .join('\n');

  const tags = [
    data.type === 'sale' ? '出售' : '出租',
    data.addressCity,
    data.addressDistrict,
    data.propertyType,
  ].filter(Boolean) as string[];

  return {
    title: blogTitle,
    excerpt,
    content,
    contentHtml,
    seoTitle: `${blogTitle} | 物件${typeLabel}`,
    seoDescription: excerpt.slice(0, 160),
    seoKeywords: tags,
    tags,
    category: isSale ? 'property_sale' : 'property_rental',
  };
}

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

    const blog = await getPropertyBlog(propertyId);

    revalidatePath('/superadmin/properties');
    return {
      success: true,
      message: existing ? '部落格已重新生成' : '部落格已成功生成',
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

export async function publishPropertyBlog(
  blogId: string
): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('blog_posts')
    .update({
      status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', blogId);

  if (error) {
    return { success: false, message: `發佈失敗：${error.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '部落格已發佈' };
}

export async function unpublishPropertyBlog(
  blogId: string
): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('blog_posts')
    .update({
      status: 'draft',
      updated_at: new Date().toISOString(),
    })
    .eq('id', blogId);

  if (error) {
    return { success: false, message: `下架失敗：${error.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '部落格已下架' };
}

export async function deletePropertyBlog(
  blogId: string
): Promise<ActionResult> {
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from('blog_posts')
    .delete()
    .eq('id', blogId);

  if (error) {
    return { success: false, message: `刪除失敗：${error.message}` };
  }

  revalidatePath('/superadmin/properties');
  return { success: true, message: '部落格已刪除' };
}
