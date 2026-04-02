'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  Loader2, ExternalLink, Eye, Globe, GlobeLock,
  Copy, Check, AlertCircle, X,
  Save, Search, ChevronDown, ChevronUp,
} from 'lucide-react';
import {
  updatePropertyBlog,
  type BlogPost,
  type StylePreset,
} from '@/lib/actions/blog';
import { getBlogPreviewHtml } from './blog-preview-html';
import {
  type BlogSupabaseOpenEditDetail,
  BLOG_SUPABASE_OPEN_EDIT_EVENT,
} from '@/lib/utils/blog-supabase-ui-events';
import { dispatchPropertyBlogUpdated } from '@/lib/utils/property-blog-events';

interface BlogSupabasePanelProps {
  propertyId: string;
  /** Blog data passed from parent (batch-loaded). null = no blog for this variant. */
  blog: BlogPost | null;
  /** Whether the parent is still loading */
  loading: boolean;
  /** Called after any mutation so parent can refresh variants */
  onMutation: () => void;
}

export function BlogSupabasePanel({
  propertyId, blog, loading, onMutation,
}: BlogSupabasePanelProps) {
  const [isSaving, startSaveTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');

  // Listen for open-edit events from table row action
  useEffect(() => {
    function onOpenEdit(e: Event) {
      const detail = (e as CustomEvent<BlogSupabaseOpenEditDetail>).detail;
      if (detail?.propertyId !== propertyId || !blog) return;
      setEditTitle(blog.title);
      setEditExcerpt(blog.excerpt ?? '');
      setIsEditing(true);
    }
    window.addEventListener(BLOG_SUPABASE_OPEN_EDIT_EVENT, onOpenEdit);
    return () => window.removeEventListener(BLOG_SUPABASE_OPEN_EDIT_EVENT, onOpenEdit);
  }, [propertyId, blog]);

  function handleSave() {
    if (!blog) return;
    setFeedback(null);
    startSaveTransition(async () => {
      const result = await updatePropertyBlog(blog.id, { title: editTitle.trim(), excerpt: editExcerpt.trim() });
      if (result.success) {
        setIsEditing(false);
        dispatchPropertyBlogUpdated(propertyId);
        onMutation();
      }
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    });
  }

  function handleCopyUrl() {
    if (!blog) return;
    const url = `${process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'}/blog/${blog.slug}`;
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

  if (!blog) {
    return (
      <div className="space-y-4">
        {feedback && <FeedbackBanner feedback={feedback} />}
        <div className="border border-dashed border-border-default rounded-lg px-4 py-5 text-center space-y-2">
          <p className="text-sm text-text-secondary">尚未建立地端廣告頁</p>
          <p className="text-xs text-text-muted leading-relaxed">
            請在上方廣告樣式表格中，選擇風格後點擊該列右側「重生」按鈕來生成內容。
          </p>
        </div>
      </div>
    );
  }

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
  const blogUrl = `${webUrl}/blog/${blog.slug}`;

  return (
    <div id="property-blog-supabase-panel" className="space-y-4">
      {feedback && <FeedbackBanner feedback={feedback} />}

      {blog.viewCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {blog.viewCount} 次瀏覽
          </span>
        </div>
      )}

      {/* Blog URL */}
      <div className="flex items-center gap-2 px-4 py-3 bg-bg-primary border border-border-default rounded-lg">
        {blog.status === 'published' ? <Globe size={14} className="text-accent shrink-0" /> : <GlobeLock size={14} className="text-text-muted shrink-0" />}
        <span className="text-xs text-text-muted shrink-0">{blog.status === 'published' ? '公開網址：' : '草稿預覽：'}</span>
        <a href={blogUrl} target="_blank" rel="noopener noreferrer"
          className={`text-sm truncate hover:underline ${blog.status === 'published' ? 'text-accent' : 'text-text-secondary'}`}>
          {blogUrl}
        </a>
        {blog.status === 'draft' && <span className="text-xs text-text-muted shrink-0">（草稿，需登入）</span>}
        <button onClick={handleCopyUrl} className="ml-auto shrink-0 p-1.5 rounded hover:bg-bg-tertiary transition-colors">
          {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="text-text-muted" />}
        </button>
        <a href={blogUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 p-1.5 rounded hover:bg-bg-tertiary transition-colors">
          <ExternalLink size={14} className="text-text-muted" />
        </a>
      </div>

      {/* Blog Info Card */}
      <div className="border border-border-default rounded-lg overflow-hidden">
        {blog.featuredImageUrl && !isEditing && (
          <div className="h-48 overflow-hidden bg-bg-tertiary">
            <img src={blog.featuredImageUrl} alt={blog.title} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="p-4 space-y-3">
          {isEditing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">文章標題</label>
                <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">摘要</label>
                <textarea value={editExcerpt} onChange={(e) => setEditExcerpt(e.target.value)} rows={3}
                  className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button onClick={handleSave} disabled={isSaving || !editTitle.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50">
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}儲存
                </button>
                <button onClick={() => setIsEditing(false)} disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50">
                  <X size={12} />取消
                </button>
                <span className="text-xs text-text-muted">* 僅更新標題與摘要，不影響正文</span>
              </div>
            </div>
          ) : (
            <>
              <h3 className="font-bold text-text-primary text-base leading-snug">{blog.title}</h3>
              {blog.excerpt && <p className="text-sm text-text-secondary leading-relaxed">{blog.excerpt}</p>}
              {blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {blog.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded">#{tag}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* SEO Preview */}
      <div>
        <button onClick={() => setShowSeo(!showSeo)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors">
          <Search size={12} />SEO 預覽{showSeo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
      </div>

      {showSeo && (
        <div className="border border-border-default rounded-lg p-4 space-y-3">
          <p className="text-xs text-text-muted font-medium uppercase tracking-wide">搜尋結果預覽</p>
          <div className="bg-white rounded-lg p-4 border border-gray-200 font-sans max-w-xl">
            <p className="text-xs text-green-700 mb-0.5 truncate">{webUrl} › blog › {blog.slug}</p>
            <p className="text-[#1a0dab] text-lg leading-snug hover:underline cursor-pointer truncate">{blog.seoTitle || blog.title}</p>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{blog.seoDescription || blog.excerpt || '（無摘要）'}</p>
          </div>
          {blog.seoKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-text-muted">關鍵字：</span>
              {blog.seoKeywords.map((kw) => (
                <span key={kw} className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded border border-border-default">{kw}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Preview */}
      <div>
        <button onClick={() => setShowPreview(!showPreview)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors">
          <Eye size={12} />{showPreview ? '隱藏預覽' : '預覽部落格內容'}
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
            <iframe srcDoc={getBlogPreviewHtml(blog.contentHtml, blog.title)}
              className="w-full border-0" style={{ height: '600px' }} title="Blog Preview"
              sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox" />
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackBanner({ feedback }: { feedback: { type: 'success' | 'error'; message: string } }) {
  return (
    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
      feedback.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
    }`}>
      {feedback.type === 'error' && <AlertCircle size={14} />}
      {feedback.message}
    </div>
  );
}
