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
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
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
      .property-blog { max-width: 900px; margin: 0 auto; }

      .hero-section { position: relative; height: 480px; overflow: hidden; background: #f0f0f0; }
      .hero-image { width: 100%; height: 100%; }
      .hero-image img { width: 100%; height: 100%; object-fit: cover; }
      .hero-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
      .hero-placeholder-inner { color: #fff; font-size: 1.5rem; opacity: .7; }
      .hero-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 2.5rem; background: linear-gradient(transparent, rgba(0,0,0,.8)); color: #fff; }
      .hero-badge { display: inline-block; padding: .3rem .875rem; background: #6366f1; color: #fff; border-radius: 999px; font-size: .8rem; font-weight: 600; margin-bottom: .875rem; letter-spacing: .05em; }
      .hero-title { font-size: 2rem; font-weight: 800; line-height: 1.3; margin-bottom: .5rem; text-shadow: 0 2px 8px rgba(0,0,0,.3); }
      .hero-location { font-size: 1rem; opacity: .9; }

      .blog-section { padding: 2.5rem 1.5rem; }
      .blog-section h2 { font-size: 1.35rem; font-weight: 700; margin-bottom: 1.5rem; color: #1a1a2e; position: relative; padding-bottom: .5rem; }
      .blog-section h2::after { content: ''; position: absolute; bottom: 0; left: 0; width: 3rem; height: 3px; background: #6366f1; border-radius: 2px; }

      .highlights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 1rem; }
      .highlight-card { display: flex; flex-direction: column; align-items: center; padding: 1.5rem 1rem; background: #f8fafc; border-radius: .75rem; text-align: center; border: 1px solid #e2e8f0; transition: transform .2s, box-shadow .2s; }
      .highlight-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.08); }
      .highlight-icon { font-size: 1.75rem; margin-bottom: .5rem; }
      .highlight-label { font-size: .8rem; color: #64748b; margin-bottom: .25rem; }
      .highlight-value { font-size: 1.1rem; font-weight: 700; color: #1e293b; }

      .gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }
      .gallery-item { border-radius: .75rem; overflow: hidden; aspect-ratio: 4/3; background: #f1f5f9; }
      .gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; cursor: pointer; }
      .gallery-item:hover img { transform: scale(1.05); }
      .gallery-item-featured { grid-column: span 2; grid-row: span 2; }
      .no-photos { grid-column: 1 / -1; padding: 3rem; text-align: center; color: #94a3b8; background: #f8fafc; border-radius: .75rem; border: 2px dashed #e2e8f0; }

      .description-content { color: #475569; line-height: 1.8; font-size: 1.05rem; }
      .description-content p { margin-bottom: 1rem; }

      .details-table { border: 1px solid #e2e8f0; border-radius: .75rem; overflow: hidden; }
      .detail-row { display: flex; border-bottom: 1px solid #f1f5f9; }
      .detail-row:last-child { border-bottom: none; }
      .detail-label { flex: 0 0 130px; padding: 1rem 1.25rem; background: #f8fafc; font-size: .9rem; color: #64748b; font-weight: 500; }
      .detail-value { flex: 1; padding: 1rem 1.25rem; font-size: .9rem; color: #1e293b; }
      .price-value { color: #6366f1; font-weight: 700; font-size: 1.1rem; }

      .cta-section { text-align: center; background: linear-gradient(135deg, #f8fafc, #eef2ff); border-radius: 1rem; margin: 2rem 1.5rem; }
      .cta-section h2::after { left: 50%; transform: translateX(-50%); }
      .cta-section p { color: #64748b; margin-bottom: 1.5rem; font-size: 1.05rem; }
      .cta-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
      .cta-btn { display: inline-flex; align-items: center; gap: .5rem; padding: 1rem 2.5rem; border-radius: .625rem; font-weight: 600; text-decoration: none; font-size: 1rem; transition: transform .2s, box-shadow .2s; }
      .cta-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.15); }
      .cta-btn-primary { background: #6366f1; color: #fff; }
      .cta-btn-secondary { background: #fff; color: #6366f1; border: 2px solid #6366f1; }

      .blog-footer { padding: 2rem 1.5rem; text-align: center; border-top: 1px solid #e2e8f0; margin-top: 2rem; }
      .blog-footer-inner { max-width: 900px; margin: 0 auto; }
      .blog-footer p { color: #94a3b8; font-size: .85rem; }

      @media (max-width: 640px) {
        .hero-section { height: 320px; }
        .hero-title { font-size: 1.35rem; }
        .hero-overlay { padding: 1.5rem; }
        .gallery-grid { grid-template-columns: repeat(2, 1fr); }
        .gallery-item-featured { grid-column: span 2; grid-row: span 1; }
        .highlights-grid { grid-template-columns: repeat(2, 1fr); }
        .detail-label { flex: 0 0 100px; font-size: .8rem; }
        .blog-section { padding: 2rem 1rem; }
      }
    `}</style>
  );
}
