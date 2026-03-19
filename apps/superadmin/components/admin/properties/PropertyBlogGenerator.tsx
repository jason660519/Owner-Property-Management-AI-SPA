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
  Pencil,
  X,
  Save,
  Search,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Contact,
} from 'lucide-react';
import {
  getPropertyBlog,
  generatePropertyBlog,
  publishPropertyBlog,
  unpublishPropertyBlog,
  deletePropertyBlog,
  updatePropertyBlog,
  syncBlogCTA,
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
  const [isSaving, startSaveTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');

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

  function startEditing() {
    if (!blog) return;
    setEditTitle(blog.title);
    setEditExcerpt(blog.excerpt ?? '');
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  function handleSave() {
    if (!blog) return;
    setFeedback(null);
    startSaveTransition(async () => {
      const result = await updatePropertyBlog(blog.id, {
        title: editTitle.trim(),
        excerpt: editExcerpt.trim(),
      });
      if (result.success) {
        await loadBlog();
        setIsEditing(false);
        setFeedback({ type: 'success', message: result.message });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  function handleGenerateClick() {
    // If already published, ask for confirmation first
    if (blog?.status === 'published' && !confirmRegenerate) {
      setConfirmRegenerate(true);
      setTimeout(() => setConfirmRegenerate(false), 5000);
      return;
    }
    setConfirmRegenerate(false);
    doGenerate();
  }

  function doGenerate() {
    setFeedback(null);
    setIsEditing(false);
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
      const result =
        blog.status === 'published'
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

  function handleSyncCTA() {
    if (!blog) return;
    setFeedback(null);
    startSyncTransition(async () => {
      const result = await syncBlogCTA(blog.id);
      if (result.success) {
        await loadBlog();
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
            AI 一鍵生成銷售部落格
          </h3>
          <p className="text-sm text-text-secondary mb-1">
            系統將呼叫 Claude AI，根據物件資料與照片，自動生成專業銷售文案
          </p>
          <p className="text-xs text-text-muted mb-6">
            包含 AI 撰寫的物件介紹、照片輪播、詳細資訊、SEO 優化
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
            <span className="text-text-muted">+</span>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Sparkles size={14} />
              <span>Claude AI</span>
            </div>
            <span className="text-text-muted">=</span>
            <div className="flex items-center gap-2 text-xs text-accent font-medium">
              <Globe size={14} />
              <span>銷售部落格</span>
            </div>
          </div>

          <button
            onClick={handleGenerateClick}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 font-medium"
          >
            {isPending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                AI 生成中...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                AI 一鍵生成部落格
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
              {blog.status === 'published' ? <Globe size={12} /> : <GlobeLock size={12} />}
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
              {!isEditing && (
                <button
                  onClick={startEditing}
                  disabled={isPending || isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                  title="編輯標題與摘要"
                >
                  <Pencil size={12} />
                  編輯
                </button>
              )}

              {/* Sync CTA contact info */}
              <button
                onClick={handleSyncCTA}
                disabled={isPending || isSaving || isSyncing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                title="從 IAM 使用者管理同步最新聯絡方式至 CTA，不影響部落格文案"
              >
                {isSyncing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Contact size={12} />
                )}
                同步聯絡方式
              </button>

              {/* Regenerate button — shows warning if already published */}
              {confirmRegenerate ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-yellow-600 flex items-center gap-1">
                    <AlertTriangle size={12} />
                    將覆蓋已發佈內容
                  </span>
                  <button
                    onClick={doGenerate}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50"
                  >
                    {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    確認重新生成
                  </button>
                  <button
                    onClick={() => setConfirmRegenerate(false)}
                    className="p-1.5 rounded hover:bg-bg-tertiary transition-colors"
                  >
                    <X size={12} className="text-text-muted" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleGenerateClick}
                  disabled={isPending || isSaving}
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
              )}

              <button
                onClick={handlePublish}
                disabled={isPending || isSaving}
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
                disabled={isPending || isSaving}
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

          {/* Blog URL — show for both published and draft */}
          <div className="flex items-center gap-2 px-4 py-3 bg-bg-primary border border-border-default rounded-lg">
            {blog.status === 'published' ? (
              <Globe size={14} className="text-accent shrink-0" />
            ) : (
              <GlobeLock size={14} className="text-text-muted shrink-0" />
            )}
            <span className="text-xs text-text-muted shrink-0">
              {blog.status === 'published' ? '公開網址：' : '草稿預覽：'}
            </span>
            <a
              href={blogUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-sm truncate hover:underline ${
                blog.status === 'published' ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              {blogUrl}
            </a>
            {blog.status === 'draft' && (
              <span className="text-xs text-text-muted shrink-0">（草稿，需登入）</span>
            )}
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

          {/* Blog Info Card — with inline edit mode */}
          <div className="border border-border-default rounded-lg overflow-hidden">
            {blog.featuredImageUrl && !isEditing && (
              <div className="h-48 overflow-hidden bg-bg-tertiary">
                <img
                  src={blog.featuredImageUrl}
                  alt={blog.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4 space-y-3">
              {isEditing ? (
                /* Edit mode */
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-text-muted mb-1">文章標題</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                      placeholder="文章標題"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-muted mb-1">摘要</label>
                    <textarea
                      value={editExcerpt}
                      onChange={(e) => setEditExcerpt(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                      placeholder="文章摘要"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editTitle.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                      {isSaving ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Save size={12} />
                      )}
                      儲存
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                    >
                      <X size={12} />
                      取消
                    </button>
                    <span className="text-xs text-text-muted">
                      * 僅更新標題與摘要，不影響正文
                    </span>
                  </div>
                </div>
              ) : (
                /* Display mode */
                <>
                  <h3 className="font-bold text-text-primary text-base leading-snug">
                    {blog.title}
                  </h3>
                  {blog.excerpt && (
                    <p className="text-sm text-text-secondary leading-relaxed">{blog.excerpt}</p>
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
                </>
              )}
            </div>
          </div>

          {/* SEO Preview Panel */}
          <div>
            <button
              onClick={() => setShowSeo(!showSeo)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors"
            >
              <Search size={12} />
              SEO 預覽
              {showSeo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>

          {showSeo && (
            <div className="border border-border-default rounded-lg p-4 space-y-3">
              <p className="text-xs text-text-muted font-medium uppercase tracking-wide">
                搜尋結果預覽
              </p>
              <div className="bg-white rounded-lg p-4 border border-gray-200 font-sans max-w-xl">
                <p className="text-xs text-green-700 mb-0.5 truncate">
                  {webUrl} › blog › {blog.slug}
                </p>
                <p className="text-[#1a0dab] text-lg leading-snug hover:underline cursor-pointer truncate">
                  {blog.seoTitle || blog.title}
                </p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {blog.seoDescription || blog.excerpt || '（無摘要）'}
                </p>
              </div>
              {blog.seoKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-text-muted">關鍵字：</span>
                  {blog.seoKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded border border-border-default"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
                <span className="text-xs text-text-muted ml-2">部落格預覽</span>
              </div>
              <div className="bg-white">
                <iframe
                  srcDoc={getBlogPreviewHtml(blog.contentHtml, blog.title)}
                  className="w-full border-0"
                  style={{ height: '600px' }}
                  title="Blog Preview"
                  sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
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
  let normalizedContentHtml = contentHtml.replaceAll('物件說明', '物件介紹');

  const heroLocationMatch = normalizedContentHtml.match(
    /<p class="hero-location">\s*📍\s*([^<]+)\s*<\/p>/,
  );
  const fullAddressForMap = heroLocationMatch?.[1]?.trim() || null;

  normalizedContentHtml = normalizedContentHtml.replace(
    /<div class="highlight-card">\s*<span class="highlight-icon">📍<\/span>\s*<span class="highlight-label">地區<\/span>\s*<span class="highlight-value">([^<]+)<\/span>\s*<\/div>/g,
    (_match: string, location: string) => {
      const query = location.trim();
      const hrefQuery = fullAddressForMap || query;
      const href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hrefQuery)}`;
      return `<a class="highlight-card" href="${href}" target="_blank" rel="noopener noreferrer"><span class="highlight-icon">📍</span><span class="highlight-label">物件位址</span><span class="highlight-value">${location}</span></a>`;
    },
  );

  normalizedContentHtml = normalizedContentHtml.replaceAll(
    '<span class="highlight-label">地區</span>',
    '<span class="highlight-label">物件位址</span>',
  );

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
${normalizedContentHtml}
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
.highlight-card:visited { color: inherit; }
a.highlight-card { text-decoration: none; color: inherit; }
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
.cta-btn-social { background: #f8fafc; color: #334155; border: 2px solid #e2e8f0; }

@media (max-width: 640px) {
  .hero-section { height: 300px; }
  .hero-title { font-size: 1.25rem; }
  .gallery-grid { grid-template-columns: repeat(2, 1fr); }
  .gallery-item-featured { grid-column: span 2; grid-row: span 1; }
  .highlights-grid { grid-template-columns: repeat(2, 1fr); }
  .detail-label { flex: 0 0 90px; font-size: .8rem; }
}
`;
