'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Sparkles, Loader2, ExternalLink, Eye, Globe, GlobeLock, RefreshCw,
  Trash2, Copy, Check, FileText, ImageIcon, AlertCircle, Pencil, X,
  Save, Search, ChevronDown, ChevronUp, AlertTriangle, Contact,
} from 'lucide-react';
import {
  getPropertyBlog, generatePropertyBlog, publishPropertyBlog,
  unpublishPropertyBlog, deletePropertyBlog, updatePropertyBlog,
  syncBlogCTA, type BlogPost, type StylePreset,
} from '@/lib/actions/blog';
import { getBlogPreviewHtml } from './blog-preview-html';

interface BlogSupabasePanelProps {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  referenceUrl?: string;
  stylePreset?: StylePreset;
}

export function BlogSupabasePanel({
  propertyId, propertyType, ownerId, referenceUrl, stylePreset,
}: BlogSupabasePanelProps) {
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showSeo, setShowSeo] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editExcerpt, setEditExcerpt] = useState('');

  const loadBlog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPropertyBlog(propertyId);
      setBlog(data);
    } catch {
      console.error('[BlogSupabasePanel] Failed to load blog');
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => { loadBlog(); }, [loadBlog]);

  function startEditing() {
    if (!blog) return;
    setEditTitle(blog.title);
    setEditExcerpt(blog.excerpt ?? '');
    setIsEditing(true);
  }

  function handleSave() {
    if (!blog) return;
    setFeedback(null);
    startSaveTransition(async () => {
      const result = await updatePropertyBlog(blog.id, { title: editTitle.trim(), excerpt: editExcerpt.trim() });
      if (result.success) { await loadBlog(); setIsEditing(false); }
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    });
  }

  function handleGenerateClick() {
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
      const result = await generatePropertyBlog(propertyId, propertyType, ownerId, { referenceUrl, stylePreset });
      if (result.success && result.blog) { setBlog(result.blog); }
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    });
  }

  function handlePublish() {
    if (!blog) return;
    setFeedback(null);
    startTransition(async () => {
      const result = blog.status === 'published'
        ? await unpublishPropertyBlog(blog.id)
        : await publishPropertyBlog(blog.id);
      if (result.success) { await loadBlog(); }
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
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
      if (result.success) { setBlog(null); }
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    });
  }

  function handleSyncCTA() {
    if (!blog) return;
    setFeedback(null);
    startSyncTransition(async () => {
      const result = await syncBlogCTA(blog.id);
      if (result.success) { await loadBlog(); }
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

  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
  const blogUrl = blog ? `${webUrl}/blog/${blog.slug}` : '';

  if (!blog) {
    return (
      <div className="space-y-4">
        {feedback && <FeedbackBanner feedback={feedback} />}
        <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-accent" />
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-2">AI 一鍵生成銷售部落格</h3>
          <p className="text-sm text-text-secondary mb-1">
            {referenceUrl ? '系統將參考你提供的網頁風格，生成相似設計的物件頁面' : '系統將呼叫 Claude AI，根據物件資料與照片，自動生成專業銷售文案'}
          </p>
          <p className="text-xs text-text-muted mb-6">包含 AI 撰寫的物件介紹、照片輪播、詳細資訊、SEO 優化</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-2 text-xs text-text-muted"><FileText size={14} /><span>物件基本資料</span></div>
            <span className="text-text-muted">+</span>
            <div className="flex items-center gap-2 text-xs text-text-muted"><ImageIcon size={14} /><span>物件照片</span></div>
            {referenceUrl && (<><span className="text-text-muted">+</span><div className="flex items-center gap-2 text-xs text-text-muted"><Globe size={14} /><span>參考風格</span></div></>)}
            <span className="text-text-muted">+</span>
            <div className="flex items-center gap-2 text-xs text-text-muted"><Sparkles size={14} /><span>Claude AI</span></div>
          </div>
          <button onClick={handleGenerateClick} disabled={isPending}
            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 font-medium">
            {isPending ? <><Loader2 size={18} className="animate-spin" />AI 生成中...</> : <><Sparkles size={18} />AI 一鍵生成部落格</>}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && <FeedbackBanner feedback={feedback} />}

      {/* Status + Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          blog.status === 'published' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
        }`}>
          {blog.status === 'published' ? <Globe size={12} /> : <GlobeLock size={12} />}
          {blog.status === 'published' ? '已發佈' : '草稿'}
        </span>
        <span className="text-xs text-text-muted">
          {blog.status === 'published' && blog.publishedAt
            ? `發佈於 ${new Date(blog.publishedAt).toLocaleDateString('zh-TW')}`
            : `建立於 ${new Date(blog.createdAt).toLocaleDateString('zh-TW')}`}
        </span>
        {blog.viewCount > 0 && (
          <span className="text-xs text-text-muted flex items-center gap-1"><Eye size={12} />{blog.viewCount} 次瀏覽</span>
        )}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {!isEditing && (
            <button onClick={startEditing} disabled={isPending || isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50">
              <Pencil size={12} />編輯
            </button>
          )}
          <button onClick={handleSyncCTA} disabled={isPending || isSaving || isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50">
            {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <Contact size={12} />}
            同步聯絡方式
          </button>

          {confirmRegenerate ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-yellow-600 flex items-center gap-1"><AlertTriangle size={12} />將覆蓋已發佈內容</span>
              <button onClick={doGenerate} disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors disabled:opacity-50">
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}確認重新生成
              </button>
              <button onClick={() => setConfirmRegenerate(false)} className="p-1.5 rounded hover:bg-bg-tertiary">
                <X size={12} className="text-text-muted" />
              </button>
            </div>
          ) : (
            <button onClick={handleGenerateClick} disabled={isPending || isSaving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50">
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}重新生成
            </button>
          )}

          <button onClick={handlePublish} disabled={isPending || isSaving}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
              blog.status === 'published' ? 'text-yellow-600 border border-yellow-500/30 hover:bg-yellow-500/10' : 'text-green-600 border border-green-500/30 hover:bg-green-500/10'
            }`}>
            {blog.status === 'published' ? <><GlobeLock size={12} />下架</> : <><Globe size={12} />發佈</>}
          </button>

          <button onClick={handleDelete} disabled={isPending || isSaving}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
              confirmDelete ? 'bg-red-500 text-white' : 'text-red-500 border border-red-500/30 hover:bg-red-500/10'
            }`}>
            <Trash2 size={12} />{confirmDelete ? '確認刪除？' : '刪除'}
          </button>
        </div>
      </div>

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
