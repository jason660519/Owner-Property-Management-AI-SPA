// filepath: apps/web/app/blog/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/utils/supabase/admin';
import { BlogContentRenderer } from './BlogContentRenderer';

interface BlogPageProps {
  params: Promise<{ slug: string }>;
}

async function getBlogBySlug(slug: string) {
  const supabase = createAdminClient();
  // Next may provide the dynamic segment in an encoded form depending on the URL.
  // Normalize to the original slug stored in Supabase.
  let normalizedSlug = slug;
  try {
    normalizedSlug = decodeURIComponent(slug);
  } catch {
    // If it's already decoded (or contains malformed escape sequences), keep as-is.
  }

  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', normalizedSlug)
    .eq('status', 'published')
    .single();

  if (error || !data) return null;

  await supabase
    .from('blog_posts')
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq('id', data.id);

  return data;
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);
  if (!blog) return { title: '找不到頁面' };

  return {
    title: blog.seo_title || blog.title,
    description: blog.seo_description || blog.excerpt || '',
    keywords: blog.seo_keywords?.join(', ') || '',
    openGraph: {
      title: blog.seo_title || blog.title,
      description: blog.seo_description || blog.excerpt || '',
      type: 'article',
      publishedTime: blog.published_at || undefined,
      images: blog.featured_image_url ? [{ url: blog.featured_image_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.seo_title || blog.title,
      description: blog.seo_description || blog.excerpt || '',
      images: blog.featured_image_url ? [blog.featured_image_url] : [],
    },
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { slug } = await params;
  const blog = await getBlogBySlug(slug);

  if (!blog) notFound();

  return (
    <div className="min-h-screen bg-white">
      <BlogStyles />

      {blog.content_html ? (
        <BlogContentRenderer html={blog.content_html} />
      ) : (
        <article className="max-w-3xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-4">{blog.title}</h1>
          {blog.excerpt && (
            <p className="text-lg text-gray-500 mb-8">{blog.excerpt}</p>
          )}
          <div className="prose prose-lg max-w-none whitespace-pre-wrap">
            {blog.content}
          </div>
        </article>
      )}

      <footer className="blog-footer">
        <div className="blog-footer-inner">
          <p>&copy; {new Date().getFullYear()} 房東管理系統 &mdash; AI 驅動的物業管理平台</p>
        </div>
      </footer>
    </div>
  );
}

function BlogStyles() {
  return (
    <style>{`
      /* ── Base ──────────────────────────────────────────────────── */
      .property-blog { max-width: 860px; margin: 0 auto; font-family: -apple-system, 'PingFang TC', 'Microsoft JhengHei', sans-serif; color: #1e293b; }

      /* ── Hero ──────────────────────────────────────────────────── */
      .hero-section { position: relative; height: 520px; overflow: hidden; background: #1a1a2e; }
      .hero-image { width: 100%; height: 100%; }
      .hero-image img { width: 100%; height: 100%; object-fit: cover; transition: transform 8s ease; }
      .hero-image:hover img { transform: scale(1.04); }
      .hero-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); }
      .hero-placeholder-inner { color: #fff; font-size: 1.5rem; opacity: .6; }
      .hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 3.5rem 2rem 2rem; background: linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.35) 60%, transparent 100%); color: #fff; }
      .hero-badge { display: inline-flex; align-items: center; gap: .375rem; padding: .3rem 1rem; background: rgba(99,102,241,.82); backdrop-filter: blur(8px); color: #fff; border-radius: 999px; font-size: .78rem; font-weight: 700; margin-bottom: .875rem; letter-spacing: .06em; border: 1px solid rgba(255,255,255,.2); }
      .hero-title { font-size: 2rem; font-weight: 800; line-height: 1.3; margin-bottom: .5rem; text-shadow: 0 2px 14px rgba(0,0,0,.55); }
      .hero-location { font-size: .95rem; opacity: .85; }

      /* ── Sections ────────────────────────────────────────────── */
      .blog-section { padding: 2.5rem 2rem; border-bottom: 1px solid #f1f5f9; }
      .blog-section:last-of-type { border-bottom: none; }
      .blog-section h2 { font-size: 1.2rem; font-weight: 700; margin-bottom: 1.375rem; color: #0f172a; display: flex; align-items: center; gap: .625rem; flex-wrap: wrap; }
      .blog-section h2::before { content: ''; display: block; width: 4px; height: 1.1em; background: linear-gradient(to bottom, #6366f1, #8b5cf6); border-radius: 2px; flex-shrink: 0; }

      /* ── Highlights ──────────────────────────────────────────── */
      .highlights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: .875rem; }
      .highlight-card { display: flex; flex-direction: column; align-items: center; padding: 1.25rem .875rem; background: #f8fafc; border-radius: 1rem; text-align: center; border: 1px solid #e2e8f0; transition: transform .2s, box-shadow .2s, border-color .2s; }
      a.highlight-card { text-decoration: none; color: inherit; }
      .highlight-card:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(99,102,241,.12); border-color: #c7d2fe; }
      .highlight-icon { font-size: 1.625rem; margin-bottom: .5rem; }
      .highlight-label { font-size: .73rem; color: #94a3b8; margin-bottom: .25rem; font-weight: 500; }
      .highlight-value { font-size: 1rem; font-weight: 700; color: #1e293b; }

      /* ── Gallery ─────────────────────────────────────────────── */
      .photo-count-badge { font-size: .7rem; font-weight: 500; color: #6366f1; background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 999px; padding: .15rem .625rem; }
      .gallery-tap-hint { font-size: .78rem; color: #94a3b8; text-align: center; margin-top: .75rem; }
      .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .625rem; }
      .gallery-item { border-radius: .75rem; overflow: hidden; aspect-ratio: 4/3; background: #f1f5f9; position: relative; }
      .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s; cursor: zoom-in; display: block; }
      .gallery-item:hover img { transform: scale(1.07); }
      .gallery-item-featured { grid-column: span 2; grid-row: span 2; }
      .gallery-item::after { content: ''; position: absolute; inset: 0; background: rgba(99,102,241,0); transition: background .25s; pointer-events: none; border-radius: .75rem; }
      .gallery-item:hover::after { background: rgba(99,102,241,.12); }
      .no-photos { grid-column: 1 / -1; padding: 3rem; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: .75rem; border: 2px dashed #e2e8f0; }

      /* ── Description ─────────────────────────────────────────── */
      .description-section { background: #fafbff; }
      .description-content { color: #334155; line-height: 1.9; font-size: 1.05rem; }
      .description-content p { margin-bottom: 1.125rem; }
      .description-content p:last-child { margin-bottom: 0; }
      .description-content p:first-child { font-size: 1.1rem; font-weight: 500; color: #1e293b; }

      /* ── Details Table ───────────────────────────────────────── */
      .details-table { border: 1px solid #e2e8f0; border-radius: .875rem; overflow: hidden; }
      .detail-row { display: flex; border-bottom: 1px solid #f1f5f9; }
      .detail-row:last-child { border-bottom: none; }
      .detail-label { flex: 0 0 120px; padding: .875rem 1.25rem; background: #f8fafc; font-size: .85rem; color: #64748b; font-weight: 600; align-self: center; }
      .detail-value { flex: 1; padding: .875rem 1.25rem; font-size: .9rem; color: #1e293b; }
      .price-value { color: #6366f1; font-weight: 800; font-size: 1.125rem; }

      /* ── Map Card ────────────────────────────────────────────── */
      .map-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 1rem; text-decoration: none; color: inherit; transition: transform .2s, box-shadow .2s, background .2s; }
      .map-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(14,165,233,.12); background: #e0f2fe; }
      .map-card-icon { font-size: 2rem; flex-shrink: 0; }
      .map-card-body { display: flex; flex-direction: column; gap: .25rem; }
      .map-card-addr { font-size: 1rem; font-weight: 600; color: #1e293b; }
      .map-card-cta { font-size: .85rem; color: #0ea5e9; }

      /* ── CTA Section ─────────────────────────────────────────── */
      .cta-section { text-align: center; background: linear-gradient(135deg, #f0f3ff 0%, #faf5ff 100%); border-radius: 1.25rem; margin: 0 1.5rem 2.5rem; padding: 3rem 2rem; border: 1px solid #e0e7ff; border-bottom: 1px solid #e0e7ff !important; }
      .cta-section h2 { justify-content: center; }
      .cta-section h2::before { background: linear-gradient(to bottom, #6366f1, #8b5cf6); }
      .cta-section p { color: #64748b; margin-bottom: 2rem; font-size: 1rem; }
      .cta-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
      .cta-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .875rem 2.25rem; border-radius: .75rem; font-weight: 700; text-decoration: none; font-size: 1rem; transition: transform .2s, box-shadow .2s; }
      .cta-btn:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(0,0,0,.15); }
      .cta-btn-primary { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
      .cta-btn-secondary { background: #fff; color: #6366f1; border: 2px solid #e0e7ff; }
      .cta-btn-social { background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; }

      /* ── Mobile Sticky CTA ───────────────────────────────────── */
      .mobile-sticky-cta { display: none; }
      @media (max-width: 768px) {
        .mobile-sticky-cta { display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 999; background: rgba(255,255,255,.95); backdrop-filter: blur(12px); border-top: 1px solid #e2e8f0; box-shadow: 0 -4px 24px rgba(0,0,0,.08); padding: .75rem 1rem; gap: .75rem; padding-bottom: max(.75rem, env(safe-area-inset-bottom)); }
        .sticky-btn { flex: 1; display: flex; align-items: center; justify-content: center; gap: .5rem; padding: .75rem 1rem; border-radius: .75rem; font-weight: 700; font-size: .9rem; text-decoration: none; transition: opacity .15s; }
        .sticky-btn:active { opacity: .72; }
        .sticky-btn-call { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff; }
        .sticky-btn-email { background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0; }
        .property-blog { padding-bottom: 80px; }
      }

      /* ── Lightbox ────────────────────────────────────────────── */
      .blog-lightbox-overlay { display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.93); align-items: center; justify-content: center; }
      .blog-lightbox-overlay.active { display: flex; }
      .blog-lightbox-img { max-width: min(90vw, 1200px); max-height: 85vh; object-fit: contain; border-radius: .5rem; user-select: none; }
      .blog-lightbox-close { position: absolute; top: 1.25rem; right: 1.25rem; background: rgba(255,255,255,.14); color: #fff; border: none; border-radius: 50%; width: 2.5rem; height: 2.5rem; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; }
      .blog-lightbox-close:hover { background: rgba(255,255,255,.28); }
      .blog-lightbox-prev, .blog-lightbox-next { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,.14); color: #fff; border: none; border-radius: 50%; width: 3rem; height: 3rem; font-size: 1.8rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background .2s; line-height: 1; }
      .blog-lightbox-prev:hover, .blog-lightbox-next:hover { background: rgba(255,255,255,.28); }
      .blog-lightbox-prev { left: 1.25rem; }
      .blog-lightbox-next { right: 1.25rem; }
      .blog-lightbox-counter { position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,.5); color: #fff; font-size: .82rem; padding: .3rem .875rem; border-radius: 999px; }

      /* ── Footer ──────────────────────────────────────────────── */
      .blog-footer { padding: 2rem; text-align: center; border-top: 1px solid #f1f5f9; }
      .blog-footer-inner { max-width: 860px; margin: 0 auto; }
      .blog-footer p { color: #cbd5e1; font-size: .82rem; }

      /* ── Responsive ──────────────────────────────────────────── */
      @media (max-width: 640px) {
        .hero-section { height: 300px; }
        .hero-title { font-size: 1.3rem; }
        .hero-overlay { padding: 1.5rem 1rem 1rem; }
        .gallery-grid { grid-template-columns: repeat(2, 1fr); }
        .gallery-item-featured { grid-column: span 2; grid-row: span 1; }
        .highlights-grid { grid-template-columns: repeat(2, 1fr); }
        .detail-label { flex: 0 0 88px; font-size: .78rem; padding: .75rem .875rem; }
        .detail-value { font-size: .82rem; padding: .75rem .875rem; }
        .blog-section { padding: 2rem 1rem; }
        .cta-section { margin: 0 .75rem 1.5rem; padding: 2rem 1.25rem; }
        .cta-btn { padding: .75rem 1.5rem; font-size: .9rem; }
        .blog-lightbox-prev { left: .5rem; }
        .blog-lightbox-next { right: .5rem; }
        .blog-lightbox-close { top: .75rem; right: .75rem; }
      }
    `}</style>
  );
}
