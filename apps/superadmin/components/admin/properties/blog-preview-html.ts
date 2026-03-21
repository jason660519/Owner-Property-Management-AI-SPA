// Utility: generate standalone HTML for the blog iframe preview

export function getBlogPreviewHtml(contentHtml: string, title: string): string {
  let html = contentHtml.replaceAll('物件說明', '物件介紹');

  const heroLocationMatch = html.match(/<p class="hero-location">\s*📍\s*([^<]+)\s*<\/p>/);
  const fullAddressForMap = heroLocationMatch?.[1]?.trim() || null;

  html = html.replace(
    /<div class="highlight-card">\s*<span class="highlight-icon">📍<\/span>\s*<span class="highlight-label">地區<\/span>\s*<span class="highlight-value">([^<]+)<\/span>\s*<\/div>/g,
    (_match: string, location: string) => {
      const hrefQuery = fullAddressForMap || location.trim();
      const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hrefQuery)}`;
      return `<a class="highlight-card" href="${href}" target="_blank" rel="noopener noreferrer"><span class="highlight-icon">📍</span><span class="highlight-label">物件位址</span><span class="highlight-value">${location}</span></a>`;
    },
  );

  html = html.replaceAll('<span class="highlight-label">地區</span>', '<span class="highlight-label">物件位址</span>');

  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>${BLOG_STYLES}</style>
</head>
<body>
${html}
</body>
</html>`;
}

const BLOG_STYLES = `
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #fff; line-height: 1.6; }
.property-blog { max-width: 900px; margin: 0 auto; }
.hero-section { position: relative; height: 420px; overflow: hidden; background: #f0f0f0; }
.hero-image { width: 100%; height: 100%; }
.hero-image img { width: 100%; height: 100%; object-fit: cover; }
.hero-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.hero-placeholder-inner { color: #fff; font-size: 1.5rem; opacity: .7; }
.hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 2rem; background: linear-gradient(transparent, rgba(0,0,0,.75)); color: #fff; }
.hero-badge { display: inline-block; padding: .25rem .75rem; background: #6366f1; color: #fff; border-radius: 999px; font-size: .75rem; font-weight: 600; margin-bottom: .75rem; }
.hero-title { font-size: 1.75rem; font-weight: 800; line-height: 1.3; margin-bottom: .5rem; text-shadow: 0 2px 8px rgba(0,0,0,.3); }
.hero-location { font-size: .95rem; opacity: .9; }
.blog-section { padding: 2rem 1.5rem; }
.blog-section h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: #1a1a2e; position: relative; padding-bottom: .5rem; }
.blog-section h2::after { content: ''; position: absolute; bottom: 0; left: 0; width: 3rem; height: 3px; background: #6366f1; border-radius: 2px; }
.highlights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
.highlight-card { display: flex; flex-direction: column; align-items: center; padding: 1.25rem 1rem; background: #f8fafc; border-radius: .75rem; text-align: center; border: 1px solid #e2e8f0; }
a.highlight-card { text-decoration: none; color: inherit; }
.highlight-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
.highlight-icon { font-size: 1.5rem; margin-bottom: .5rem; }
.highlight-label { font-size: .75rem; color: #64748b; margin-bottom: .25rem; }
.highlight-value { font-size: 1rem; font-weight: 700; color: #1e293b; }
.gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }
.gallery-item { border-radius: .5rem; overflow: hidden; aspect-ratio: 4/3; background: #f1f5f9; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; }
.gallery-item-featured { grid-column: span 2; grid-row: span 2; }
.no-photos { grid-column: 1 / -1; padding: 3rem; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: .5rem; border: 2px dashed #e2e8f0; }
.description-content { color: #475569; line-height: 1.8; }
.description-content p { margin-bottom: 1rem; }
.details-table { border: 1px solid #e2e8f0; border-radius: .75rem; overflow: hidden; }
.detail-row { display: flex; border-bottom: 1px solid #f1f5f9; }
.detail-row:last-child { border-bottom: none; }
.detail-label { flex: 0 0 120px; padding: .875rem 1rem; background: #f8fafc; font-size: .875rem; color: #64748b; font-weight: 500; }
.detail-value { flex: 1; padding: .875rem 1rem; font-size: .875rem; color: #1e293b; }
.price-value { color: #6366f1; font-weight: 700; font-size: 1rem; }
.cta-section { text-align: center; background: linear-gradient(135deg, #f8fafc, #eef2ff); border-radius: .75rem; margin: 1.5rem; }
.cta-section h2::after { left: 50%; transform: translateX(-50%); }
.cta-section p { color: #64748b; margin-bottom: 1.5rem; }
.cta-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
.cta-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .875rem 2rem; border-radius: .5rem; font-weight: 600; text-decoration: none; font-size: .95rem; }
.cta-btn-primary { background: #6366f1; color: #fff; }
.cta-btn-secondary { background: #fff; color: #6366f1; border: 2px solid #6366f1; }
.cta-btn-social { background: #f8fafc; color: #334155; border: 2px solid #e2e8f0; }
@media (max-width: 640px) {
  .hero-section { height: 300px; }
  .hero-title { font-size: 1.25rem; }
  .gallery-grid { grid-template-columns: repeat(2, 1fr); }
  .highlights-grid { grid-template-columns: repeat(2, 1fr); }
}
`;
