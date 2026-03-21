'use client';

import { useState, useEffect, useTransition } from 'react';
import { Loader2, ExternalLink, CheckCircle, XCircle, AlertCircle, Sparkles, Trash2 } from 'lucide-react';

function FbIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
import { getIntegration, getPlatformPost, type FacebookPagesIntegration } from '@/lib/actions/integrations';
import { getPropertyBlog, generatePropertyBlog } from '@/lib/actions/blog';
import { publishToFacebook, deleteFacebookPost } from '@/lib/actions/facebook-pages';
import type { BlogPost } from '@/lib/actions/blog';

interface BlogFacebookPanelProps {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
}

export function BlogFacebookPanel({ propertyId, propertyType, ownerId }: BlogFacebookPanelProps) {
  const [integration, setIntegration] = useState<FacebookPagesIntegration | null>(null);
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [platformPost, setPlatformPost] = useState<{ external_id: string; external_url: string | null; status: string } | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    Promise.all([
      getIntegration('facebook_pages'),
      getPropertyBlog(propertyId),
    ]).then(async ([intData, blogData]) => {
      setIntegration(intData as FacebookPagesIntegration | null);
      setBlog(blogData);
      if (blogData) {
        const pp = await getPlatformPost(blogData.id, 'facebook_pages');
        setPlatformPost(pp);
      }
      setLoadingInit(false);
    });
  }, [propertyId]);

  function handlePost() {
    setFeedback(null);
    startTransition(async () => {
      // Ensure we have a blog to base the post on
      let currentBlog = blog;
      if (!currentBlog) {
        const genResult = await generatePropertyBlog(propertyId, propertyType, ownerId);
        if (!genResult.success || !genResult.blog) {
          setFeedback({ type: 'error', message: genResult.message });
          return;
        }
        currentBlog = genResult.blog;
        setBlog(currentBlog);
      }

      const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
      const result = await publishToFacebook(currentBlog.id, {
        title: currentBlog.title,
        excerpt: currentBlog.excerpt ?? '',
        tags: currentBlog.tags,
        featuredImageUrl: currentBlog.featuredImageUrl,
        blogUrl: currentBlog.status === 'published' ? `${webUrl}/blog/${currentBlog.slug}` : undefined,
      });

      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setPlatformPost({
          external_id: result.externalId ?? '',
          external_url: result.externalUrl ?? null,
          status: 'published',
        });
      }
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
      const result = await deleteFacebookPost(blog.id, platformPost.external_id);
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

  const isConnected = integration?.isConnected && integration.pageId;

  if (!isConnected) {
    return (
      <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-full bg-[#1877f2]/10 flex items-center justify-center">
          <FbIcon size={28} />
        </div>
        <div>
          <h3 className="text-base font-bold text-text-primary mb-1">尚未連結 Facebook 粉絲頁</h3>
          <p className="text-sm text-text-secondary">請先至設定頁面填入 Page Access Token 完成連結</p>
        </div>
        <a href="/superadmin/settings/integrations" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877f2] text-white text-sm font-medium rounded-lg hover:bg-[#1565c0] transition-colors">
          <FbIcon size={14} />前往設定<ExternalLink size={12} />
        </a>
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

      {/* Connected Page Info */}
      <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg">
        <FbIcon size={14} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{integration.pageName ?? 'Facebook 粉絲頁'}</p>
          {integration.pageId && <p className="text-xs text-text-muted">Page ID: {integration.pageId}</p>}
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
            <span className="text-sm font-medium text-text-primary">已發布至 Facebook 粉絲頁</span>
          </div>
          {platformPost.external_url && (
            <a href={platformPost.external_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-accent hover:underline">
              <ExternalLink size={13} />{platformPost.external_url}
            </a>
          )}
          <div className="p-3 bg-bg-tertiary rounded-lg text-xs text-text-muted">
            Facebook 貼文發布後只能刪除，無法直接更新內容。如需修改請刪除後重新發布。
          </div>
          <button onClick={handleDelete} disabled={isPending}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
              confirmDelete ? 'bg-red-500 text-white' : 'text-red-500 border border-red-500/30 hover:bg-red-500/10'
            }`}>
            <Trash2 size={12} />{confirmDelete ? '確認刪除？' : '從 Facebook 刪除'}
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-border-default rounded-xl p-6 text-center">
          <XCircle size={24} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-1">尚未發布至 Facebook 粉絲頁</p>
          <p className="text-xs text-text-muted mb-4">
            系統將把物件資訊（標題、摘要、照片、聯絡方式）整理成貼文格式發布至你的粉絲頁
          </p>

          <div className="mb-4 p-3 bg-bg-tertiary rounded-lg text-xs text-text-secondary text-left space-y-1 max-w-xs mx-auto">
            <p className="font-medium text-text-primary">發布內容包含：</p>
            <p>✓ 物件標題與摘要</p>
            <p>✓ 主照片</p>
            <p>✓ 物件標籤（#出售 #台北 等）</p>
            <p>✓ 聯絡方式（電話/LINE/Email）</p>
            <p>✓ 地端部落格連結（已發布時）</p>
          </div>

          <button onClick={handlePost} disabled={isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1877f2] text-white text-sm font-medium rounded-lg hover:bg-[#1565c0] transition-colors disabled:opacity-50">
            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            發布至 Facebook 粉絲頁
          </button>
        </div>
      )}
    </div>
  );
}
