'use client';

import { useState, useEffect, useTransition } from 'react';
import { Globe, Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import { getIntegration, getPlatformPost, type GoogleBloggerIntegration } from '@/lib/actions/integrations';
import { getPropertyBlog, generatePropertyBlog, type StylePreset } from '@/lib/actions/blog';
import type { BlogPost } from '@/lib/actions/blog';
import { publishToBlogger, updateBloggerPost, deleteBloggerPost } from '@/lib/actions/google-blogger';

interface BlogGooglePanelProps {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  referenceUrl?: string;
  stylePreset?: StylePreset;
}

export function BlogGooglePanel({ propertyId, propertyType, ownerId, referenceUrl, stylePreset }: BlogGooglePanelProps) {
  const [integration, setIntegration] = useState<GoogleBloggerIntegration | null>(null);
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [platformPost, setPlatformPost] = useState<{ external_id: string; external_url: string | null; status: string } | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    Promise.all([
      getIntegration('google_blogger'),
      getPropertyBlog(propertyId),
    ]).then(async ([intData, blogData]) => {
      setIntegration(intData as GoogleBloggerIntegration | null);
      setBlog(blogData);
      if (blogData) {
        const pp = await getPlatformPost(blogData.id, 'google_blogger');
        setPlatformPost(pp);
      }
      setLoadingInit(false);
    });
  }, [propertyId]);

  function handleGenerateAndPublish() {
    setFeedback(null);
    startTransition(async () => {
      // Generate Supabase blog first (or reuse if exists)
      let currentBlog = blog;
      if (!currentBlog) {
        const genResult = await generatePropertyBlog(propertyId, propertyType, ownerId, { referenceUrl, stylePreset });
        if (!genResult.success || !genResult.blog) {
          setFeedback({ type: 'error', message: genResult.message });
          return;
        }
        currentBlog = genResult.blog;
        setBlog(currentBlog);
      }

      const pubResult = await publishToBlogger(currentBlog.id, {
        title: currentBlog.title,
        contentHtml: currentBlog.contentHtml ?? '',
        tags: currentBlog.tags,
      });

      setFeedback({ type: pubResult.success ? 'success' : 'error', message: pubResult.message });
      if (pubResult.success) {
        setPlatformPost({
          external_id: pubResult.externalId ?? '',
          external_url: pubResult.externalUrl ?? null,
          status: 'published',
        });
      }
    });
  }

  function handleUpdate() {
    if (!blog || !platformPost) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await updateBloggerPost(blog.id, platformPost.external_id, {
        title: blog.title,
        contentHtml: blog.contentHtml ?? '',
        tags: blog.tags,
      });
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    });
  }

  function handleDelete() {
    if (!blog || !platformPost) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteBloggerPost(blog.id, platformPost.external_id);
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) setPlatformPost(null);
    });
  }

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted text-sm">載入整合狀態...</span>
      </div>
    );
  }

  const accountConnected = integration?.isConnected === true;
  const blogSelected = accountConnected && !!integration?.blogId;

  if (!accountConnected) {
    return (
      <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#ea4335]/10 flex items-center justify-center">
          <Globe size={28} className="text-[#ea4335]" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary mb-1">尚未連結 Google 帳號</h3>
          <p className="text-sm text-text-secondary">請先至設定頁面完成 Google 帳號授權</p>
        </div>
        <a href="/superadmin/settings/integrations" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea4335] text-white text-sm font-medium rounded-lg hover:bg-[#c5221f] transition-colors">
          <Globe size={14} />前往設定<ExternalLink size={12} />
        </a>
      </div>
    );
  }

  if (!blogSelected) {
    return (
      <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
          <AlertCircle size={28} className="text-amber-500" />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary mb-1">Google 帳號已連結，但尚未選擇部落格</h3>
          <p className="text-sm text-text-secondary">你目前還沒有 Blogger 部落格，或尚未在設定頁選擇部落格。</p>
          <p className="text-xs text-text-muted mt-1">請先至 blogger.com 建立一個部落格，再回設定頁重新選擇。</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <a href="https://www.blogger.com" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 border border-[#ea4335] text-[#ea4335] text-sm font-medium rounded-lg hover:bg-[#ea4335]/10 transition-colors">
            <Globe size={14} />建立 Blogger 部落格<ExternalLink size={12} />
          </a>
          <a href="/superadmin/settings/integrations" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea4335] text-white text-sm font-medium rounded-lg hover:bg-[#c5221f] transition-colors">
            <Globe size={14} />前往設定選擇部落格<ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          feedback.type === 'success' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {feedback.type === 'error' && <AlertCircle size={14} />}
          {feedback.message}
        </div>
      )}

      {/* Connected Blog Info */}
      <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
        <Globe size={14} className="text-[#ea4335] shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{integration.blogName ?? 'Google Blogger'}</p>
          {integration.blogUrl && (
            <a href={integration.blogUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-accent hover:underline flex items-center gap-1">
              {integration.blogUrl}<ExternalLink size={10} />
            </a>
          )}
        </div>
        <span className="ml-auto text-xs text-green-500 flex items-center gap-1 shrink-0">
          <CheckCircle size={12} />已連結
        </span>
      </div>

      {/* Platform Post Status */}
      {platformPost && platformPost.status !== 'deleted' ? (
        <div className="border border-border-default rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={14} className="text-green-500" />
            <span className="text-sm font-medium text-text-primary">已發布至 Google Blogger</span>
          </div>
          {platformPost.external_url && (
            <a href={platformPost.external_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline">
              <ExternalLink size={13} />{platformPost.external_url}
            </a>
          )}
          <div className="flex gap-2 flex-wrap pt-1">
            <button onClick={handleUpdate} disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default text-text-secondary rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50">
              {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}同步最新內容
            </button>
            <button onClick={handleDelete} disabled={isPending}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                confirmDelete ? 'bg-red-500 text-white' : 'text-red-500 border border-red-500/30 hover:bg-red-500/10'
              }`}>
              <Trash2 size={12} />{confirmDelete ? '確認刪除？' : '從 Blogger 刪除'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border-default rounded-xl p-6 text-center">
          <XCircle size={24} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">尚未發布至 Google Blogger</p>
          <p className="text-xs text-text-muted mb-4">
            {blog ? '點擊下方按鈕，AI 將以現有物件資料發布至 Blogger' : '點擊下方按鈕，AI 將先生成部落格內容再發布至 Blogger'}
          </p>
          <button onClick={handleGenerateAndPublish} disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ea4335] text-white text-sm font-medium rounded-lg hover:bg-[#c5221f] transition-colors disabled:opacity-50">
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {blog ? 'AI 發布至 Google Blogger' : 'AI 生成並發布至 Blogger'}
          </button>
        </div>
      )}
    </div>
  );
}
