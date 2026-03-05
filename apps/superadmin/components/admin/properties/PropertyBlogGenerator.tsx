// filepath: apps/superadmin/components/admin/properties/PropertyBlogGenerator.tsx
'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Sparkles,
  Loader2,
  ExternalLink,
  Eye,
  Globe,
  GlobeLock,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  FileText,
  ImageIcon,
  AlertCircle,
} from 'lucide-react';
import {
  getPropertyBlog,
  generatePropertyBlog,
  publishPropertyBlog,
  unpublishPropertyBlog,
  deletePropertyBlog,
  type BlogPost,
} from '@/lib/actions/blog';

interface PropertyBlogGeneratorProps {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
}

export function PropertyBlogGenerator({
  propertyId,
  propertyType,
  ownerId,
}: PropertyBlogGeneratorProps) {
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const loadBlog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPropertyBlog(propertyId);
      setBlog(data);
    } catch {
      console.error('[BlogGenerator] Failed to load blog');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadBlog();
  }, [loadBlog]);

  function handleGenerate() {
    setFeedback(null);
    startTransition(async () => {
      const result = await generatePropertyBlog(propertyId, propertyType, ownerId);
      if (result.success && result.blog) {
        setBlog(result.blog);
        setFeedback({ type: 'success', message: result.message });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  function handlePublish() {
    if (!blog) return;
    setFeedback(null);
    startTransition(async () => {
      const result = blog.status === 'published'
        ? await unpublishPropertyBlog(blog.id)
        : await publishPropertyBlog(blog.id);
      if (result.success) {
        await loadBlog();
        setFeedback({ type: 'success', message: result.message });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  function handleDelete() {
    if (!blog) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setFeedback(null);
    setConfirmDelete(false);
    startTransition(async () => {
      const result = await deletePropertyBlog(blog.id);
      if (result.success) {
        setBlog(null);
        setFeedback({ type: 'success', message: result.message });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  function handleCopyUrl() {
    if (!blog) return;
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
    const url = `${webUrl}/blog/${blog.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted text-sm">載入部落格資料...</span>
      </div>
    );
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
  const blogUrl = blog ? `${webUrl}/blog/${blog.slug}` : '';

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
          }`}
        >
          {feedback.type === 'error' && <AlertCircle size={14} />}
          {feedback.message}
        </div>
      )}

      {!blog ? (
        /* ── No blog yet ── */
        <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">
            一鍵生成銷售部落格
          </h3>
          <p className="text-sm text-text-secondary mb-1">
            系統將根據物件資料與照片，自動生成專業的銷售頁面
          </p>
          <p className="text-xs text-text-muted mb-6">
            包含物件亮點、照片輪播、詳細資訊、SEO 優化
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <FileText size={14} />
              <span>物件基本資料</span>
            </div>
            <span className="text-text-muted">+</span>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <ImageIcon size={14} />
              <span>物件照片</span>
            </div>
            <span className="text-text-muted">=</span>
            <div className="flex items-center gap-2 text-xs text-accent font-medium">
              <Sparkles size={14} />
              <span>銷售部落格</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 font-medium"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                一鍵生成部落格
              </>
            )}
          </button>
        </div>
      ) : (
        /* ── Blog exists ── */
        <div className="space-y-4">
          {/* Status + Actions Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                blog.status === 'published'
                  ? 'bg-green-500/10 text-green-500'
                  : blog.status === 'draft'
                    ? 'bg-yellow-500/10 text-yellow-500'
                    : 'bg-gray-500/10 text-gray-500'
              }`}
            >
              {blog.status === 'published' ? (
                <Globe size={12} />
              ) : (
                <GlobeLock size={12} />
              )}
              {blog.status === 'published' ? '已發佈' : '草稿'}
            </span>

            <span className="text-xs text-text-muted">
              {blog.status === 'published' && blog.publishedAt
                ? `發佈於 ${new Date(blog.publishedAt).toLocaleDateString('zh-TW')}`
                : `建立於 ${new Date(blog.createdAt).toLocaleDateString('zh-TW')}`}
            </span>

            {blog.viewCount > 0 && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Eye size={12} />
                {blog.viewCount} 次瀏覽
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleGenerate}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                title="重新生成"
              >
                {isPending ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <RefreshCw size={12} />
                )}
                重新生成
              </button>

              <button
                onClick={handlePublish}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                  blog.status === 'published'
                    ? 'text-yellow-600 border border-yellow-500/30 hover:bg-yellow-500/10'
                    : 'text-green-600 border border-green-500/30 hover:bg-green-500/10'
                }`}
              >
                {blog.status === 'published' ? (
                  <>
                    <GlobeLock size={12} />
                    下架
                  </>
                ) : (
                  <>
                    <Globe size={12} />
                    發佈
                  </>
                )}
              </button>

              <button
                onClick={handleDelete}
                disabled={isPending}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                  confirmDelete
                    ? 'bg-red-500 text-white'
                    : 'text-red-500 border border-red-500/30 hover:bg-red-500/10'
                }`}
                title={confirmDelete ? '再按一次確認刪除' : '刪除部落格'}
              >
                <Trash2 size={12} />
                {confirmDelete ? '確認刪除？' : '刪除'}
              </button>
            </div>
          </div>

          {/* Blog URL */}
          {blog.status === 'published' && (
            <div className="flex items-center gap-2 px-4 py-3 bg-bg-primary border border-border-default rounded-lg">
              <Globe size={14} className="text-accent shrink-0" />
              <span className="text-xs text-text-muted shrink-0">公開網址：</span>
              <a
                href={blogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-accent hover:underline truncate"
              >
                {blogUrl}
              </a>
              <button
                onClick={handleCopyUrl}
                className="ml-auto shrink-0 p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                title="複製網址"
              >
                {copied ? (
                  <Check size={14} className="text-green-500" />
                ) : (
                  <Copy size={14} className="text-text-muted" />
                )}
              </button>
              <a
                href={blogUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                title="開啟部落格"
              >
                <ExternalLink size={14} className="text-text-muted" />
              </a>
            </div>
          )}

          {/* Blog Info Card */}
          <div className="border border-border-default rounded-lg overflow-hidden">
            {blog.featuredImageUrl && (
              <div className="h-48 overflow-hidden bg-bg-tertiary">
                <img
                  src={blog.featuredImageUrl}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4 space-y-3">
              <h3 className="font-bold text-text-primary text-base leading-snug">
                {blog.title}
              </h3>
              {blog.excerpt && (
                <p className="text-sm text-text-secondary leading-relaxed">
                  {blog.excerpt}
                </p>
              )}
              {blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {blog.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-text-muted pt-1">
                {blog.seoTitle && (
                  <span title="SEO 標題">📝 {blog.seoTitle}</span>
                )}
              </div>
            </div>
          </div>

          {/* Preview Toggle */}
          <div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors"
            >
              <Eye size={12} />
              {showPreview ? '隱藏預覽' : '預覽部落格內容'}
            </button>
          </div>

          {showPreview && blog.contentHtml && (
            <div className="border border-border-default rounded-lg overflow-hidden">
              <div className="bg-bg-tertiary px-4 py-2 border-b border-border-default flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-text-muted ml-2">
                  部落格預覽
                </span>
              </div>
              <div className="bg-white">
                <iframe
                  srcDoc={getBlogPreviewHtml(blog.contentHtml, blog.title)}
                  className="w-full border-0"
                  style={{ height: '600px' }}
                  title="Blog Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getBlogPreviewHtml(contentHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  ${BLOG_STYLES}
</style>
</head>
<body>
${contentHtml}
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
.hero-badge { display: inline-block; padding: .25rem .75rem; background: #6366f1; color: #fff; border-radius: 999px; font-size: .75rem; font-weight: 600; margin-bottom: .75rem; letter-spacing: .05em; }
.hero-title { font-size: 1.75rem; font-weight: 800; line-height: 1.3; margin-bottom: .5rem; text-shadow: 0 2px 8px rgba(0,0,0,.3); }
.hero-location { font-size: .95rem; opacity: .9; }

.blog-section { padding: 2rem 1.5rem; }
.blog-section h2 { font-size: 1.25rem; font-weight: 700; margin-bottom: 1.25rem; color: #1a1a2e; position: relative; padding-bottom: .5rem; }
.blog-section h2::after { content: ''; position: absolute; bottom: 0; left: 0; width: 3rem; height: 3px; background: #6366f1; border-radius: 2px; }

.highlights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 1rem; }
.highlight-card { display: flex; flex-direction: column; align-items: center; padding: 1.25rem 1rem; background: #f8fafc; border-radius: .75rem; text-align: center; border: 1px solid #e2e8f0; transition: transform .2s, box-shadow .2s; }
.highlight-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.08); }
.highlight-icon { font-size: 1.5rem; margin-bottom: .5rem; }
.highlight-label { font-size: .75rem; color: #64748b; margin-bottom: .25rem; }
.highlight-value { font-size: 1rem; font-weight: 700; color: #1e293b; }

.gallery-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }
.gallery-item { border-radius: .5rem; overflow: hidden; aspect-ratio: 4/3; background: #f1f5f9; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform .3s; }
.gallery-item:hover img { transform: scale(1.05); }
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
.cta-btn { display: inline-flex; align-items: center; gap: .5rem; padding: .875rem 2rem; border-radius: .5rem; font-weight: 600; text-decoration: none; font-size: .95rem; transition: transform .2s, box-shadow .2s; }
.cta-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,.12); }
.cta-btn-primary { background: #6366f1; color: #fff; }
.cta-btn-secondary { background: #fff; color: #6366f1; border: 2px solid #6366f1; }

@media (max-width: 640px) {
  .hero-section { height: 300px; }
  .hero-title { font-size: 1.25rem; }
  .gallery-grid { grid-template-columns: repeat(2, 1fr); }
  .gallery-item-featured { grid-column: span 2; grid-row: span 1; }
  .highlights-grid { grid-template-columns: repeat(2, 1fr); }
  .detail-label { flex: 0 0 90px; font-size: .8rem; }
}
`;
