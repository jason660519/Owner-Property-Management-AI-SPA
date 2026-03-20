// Blog HTML template generation utilities (pure functions, no server deps)

export interface PropertyDataForBlog {
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
  aiDescription?: string;   // AI-generated copy (overrides description)
  ownerPhone?: string | null;
  ownerEmail?: string | null;
  ownerLineId?: string | null;
  ownerWechatId?: string | null;
  ownerWhatsapp?: string | null;
  ownerFacebookUrl?: string | null;
  ownerInstagramUrl?: string | null;
}

export function formatPrice(price: number | null | undefined, type: 'sale' | 'rental'): string {
  if (!price) return '洽詢';
  if (type === 'sale') {
    if (price >= 10000) return `${(price / 10000).toFixed(0)} 萬`;
    return `NT$ ${price.toLocaleString()}`;
  }
  return `NT$ ${price.toLocaleString()} / 月`;
}

export function generateSlug(data: Pick<PropertyDataForBlog, 'id' | 'type' | 'addressCity' | 'addressDistrict' | 'title'>): string {
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

export interface BlogGeneratedContent {
  title: string;
  excerpt: string;
  content: string;
  contentHtml: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string[];
  tags: string[];
  category: string;
}

export interface OwnerContactForCta {
  phone?: string | null;
  email?: string | null;
  lineId?: string | null;
  wechatId?: string | null;
  whatsapp?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
}

/** Builds just the CTA <section> HTML from owner contact info. */
export function buildCtaSection(c: OwnerContactForCta): string {
  const phoneHref    = c.phone    ? `tel:${c.phone.replace(/\s/g, '')}` : null;
  const emailHref    = c.email    ? `mailto:${c.email}` : null;
  const whatsappHref = c.whatsapp ? `https://wa.me/${c.whatsapp.replace(/[^0-9]/g, '')}` : null;
  const lineHref     = c.lineId   ? `https://line.me/ti/p/~${encodeURIComponent(c.lineId)}` : null;
  const wechatHref   = c.wechatId ? `weixin://dl/chat?${c.wechatId}` : null;
  const facebookHref = c.facebookUrl  ?? null;
  const instagramHref = c.instagramUrl ?? null;

  const buttons = [
    phoneHref     && `<a href="${phoneHref}" class="cta-btn cta-btn-primary">📞 立即來電</a>`,
    emailHref     && `<a href="${emailHref}" class="cta-btn cta-btn-secondary">✉️ 線上詢問</a>`,
    whatsappHref  && `<a href="${whatsappHref}" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-social">💬 WhatsApp</a>`,
    lineHref      && `<a href="${lineHref}" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-social">💬 LINE</a>`,
    wechatHref    && `<a href="${wechatHref}" class="cta-btn cta-btn-social">💚 WeChat</a>`,
    facebookHref  && `<a href="${facebookHref}" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-social">👤 Facebook</a>`,
    instagramHref && `<a href="${instagramHref}" target="_blank" rel="noopener noreferrer" class="cta-btn cta-btn-social">📸 Instagram</a>`,
    !phoneHref && !emailHref && `<a href="tel:" class="cta-btn cta-btn-primary">📞 立即來電</a>`,
    !phoneHref && !emailHref && `<a href="mailto:" class="cta-btn cta-btn-secondary">✉️ 線上詢問</a>`,
  ].filter(Boolean).join('\n      ');

  return `<!-- CTA -->
  <section class="blog-section cta-section">
    <h2>有興趣嗎？</h2>
    <p>歡迎透過以下方式聯繫，預約看房或取得更多資訊。</p>
    <div class="cta-buttons">
      ${buttons}
    </div>
  </section>`;
}

export function generateBlogContent(data: PropertyDataForBlog): BlogGeneratedContent {
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
  const locationStr = [data.addressCity, data.addressDistrict].filter((x): x is string => Boolean(x)).join('');

  const primaryPhoto = data.photos.find((p) => p.isPrimary) || data.photos[0];
  const galleryPhotos = data.photos.slice(0, 12);

  const addressParts = [data.addressCity, data.addressDistrict, data.addressStreet, data.address].filter((x): x is string => Boolean(x));
  const fullAddress = addressParts.length > 0 ? (addressParts[addressParts.length - 1] ?? '詳洽仲介') : '詳洽仲介';

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

  const locationMapUrl = locationStr
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : null;

  const highlightItems = [
    { icon: '🏷️', label: isSale ? '售價' : '月租', value: priceLabel },
    areaDisplay ? { icon: '📐', label: '面積', value: areaDisplay } : null,
    layoutStr ? { icon: '🏠', label: '格局', value: layoutStr } : null,
    data.propertyType ? { icon: '🏢', label: '類型', value: data.propertyType } : null,
    data.parkingSpaces ? { icon: '🚗', label: '車位', value: `${data.parkingSpaces} 個` } : null,
    locationStr
      ? { icon: '📍', label: '物件位址', value: locationStr, href: locationMapUrl ?? undefined }
      : null,
  ].filter(Boolean) as Array<{ icon: string; label: string; value: string; href?: string }>;

  const highlightsHtml = highlightItems
    .map((h) =>
      h.href
        ? `<a class="highlight-card" href="${h.href}" target="_blank" rel="noopener noreferrer"><span class="highlight-icon">${h.icon}</span><span class="highlight-label">${h.label}</span><span class="highlight-value">${h.value}</span></a>`
        : `<div class="highlight-card"><span class="highlight-icon">${h.icon}</span><span class="highlight-label">${h.label}</span><span class="highlight-value">${h.value}</span></div>`
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

  // Prefer AI-generated description, then manual description
  const descriptionText = data.aiDescription || data.description;
  const descriptionSection = descriptionText
    ? `<section class="blog-section description-section"><h2>物件介紹</h2><div class="description-content"><p>${descriptionText.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br />')}</p></div></section>`
    : '';

  const ctaSection = buildCtaSection({
    phone:        data.ownerPhone,
    email:        data.ownerEmail,
    lineId:       data.ownerLineId,
    wechatId:     data.ownerWechatId,
    whatsapp:     data.ownerWhatsapp,
    facebookUrl:  data.ownerFacebookUrl,
    instagramUrl: data.ownerInstagramUrl,
  });

  const callHref = data.ownerPhone ? 'tel:' + data.ownerPhone.replace(/\s/g, '') : null;
  const emailHref = data.ownerEmail ? 'mailto:' + data.ownerEmail : null;
  const stickyCtaHtml = (callHref || emailHref)
    ? '<div class="mobile-sticky-cta">'
      + (callHref ? '<a href="' + callHref + '" class="sticky-btn sticky-btn-call">📞 立即來電</a>' : '')
      + (emailHref ? '<a href="' + emailHref + '" class="sticky-btn sticky-btn-email">✉️ 發送詢問</a>' : '')
      + '</div>'
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
    <h2>物件照片 ${galleryPhotos.length > 0 ? `<span class="photo-count-badge">${galleryPhotos.length} 張</span>` : ''}</h2>
    <div class="gallery-grid blog-gallery-wrapper">
      ${galleryHtml}
    </div>
    ${galleryPhotos.length > 0 ? '<p class="gallery-tap-hint">點擊照片可放大瀏覽</p>' : ''}
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

  ${locationMapUrl ? `<!-- Map -->
  <section class="blog-section">
    <h2>物件位置</h2>
    <a href="${locationMapUrl}" target="_blank" rel="noopener noreferrer" class="map-card">
      <span class="map-card-icon">📍</span>
      <span class="map-card-body">
        <span class="map-card-addr">${fullAddress}</span>
        <span class="map-card-cta">在 Google Maps 開啟 →</span>
      </span>
    </a>
  </section>` : ''}

  ${ctaSection}
</article>${stickyCtaHtml}`;

  const content = [
    blogTitle,
    '',
    excerpt,
    '',
    '## 物件亮點',
    ...highlightItems.map((h) => `- ${h.icon} ${h.label}：${h.value}`),
    '',
    descriptionText ? `## 物件介紹\n${descriptionText}\n` : '',
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
