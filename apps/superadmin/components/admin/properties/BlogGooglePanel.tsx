'use client';

import { useState, useEffect, useTransition, useCallback } from 'react';
import {
  Globe, Loader2, ExternalLink, CheckCircle, AlertCircle,
  Trash2, RefreshCw, Copy, Check, FileCode, Eye, EyeOff,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { getIntegration, getPlatformPost, type GoogleBloggerIntegration } from '@/lib/actions/integrations';
import type { BlogPost, StylePreset } from '@/lib/actions/blog';
import { publishToBlogger, updateBloggerPost, deleteBloggerPost } from '@/lib/actions/google-blogger';
import { getBlogPreviewHtml } from './blog-preview-html';
import { dispatchPropertyBlogUpdated } from '@/lib/utils/property-blog-events';

interface BlogGooglePanelProps {
  propertyId: string;
  /** Blog data passed from parent (batch-loaded). null = no blog for this variant. */
  blog: BlogPost | null;
  /** Whether the parent is still loading */
  loading: boolean;
  stylePreset?: StylePreset;
  referenceUrl?: string;
  /** Called after any mutation so parent can refresh variants */
  onMutation: () => void;
}

export function BlogGooglePanel({
  propertyId, blog, loading, stylePreset, referenceUrl, onMutation,
}: BlogGooglePanelProps) {
  const [integration, setIntegration] = useState<GoogleBloggerIntegration | null>(null);
  const [platformPost, setPlatformPost] = useState<{ external_id: string; external_url: string | null; status: string } | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  const [isSyncing, startSyncTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'title' | 'content' | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showManualCopy, setShowManualCopy] = useState(false);

  // Load integration status and platform post mapping (not blog content — that comes from props)
  const loadIntegrationState = useCallback(async () => {
    setLoadingInit(true);
    try {
      const intData = await getIntegration('google_blogger');
      setIntegration(intData as GoogleBloggerIntegration | null);

      if (blog) {
        const pp = await getPlatformPost(blog.id, 'google_blogger');
        setPlatformPost(pp);
      } else {
        setPlatformPost(null);
      }
    } catch {
      setFeedback({ type: 'error', message: '載入 Google Blogger 狀態失敗，請重新整理後再試。' });
      setPlatformPost(null);
    } finally {
      setLoadingInit(false);
    }
  }, [blog]);

  useEffect(() => {
    void loadIntegrationState();
  }, [loadIntegrationState]);

  function handlePublish() {
    if (!blog) return;
    setFeedback(null);
    startSyncTransition(async () => {
      const result = await publishToBlogger(blog.id, {
        title: blog.title,
        contentHtml: blog.contentHtml ?? '',
        tags: blog.tags,
      });
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setPlatformPost({
          external_id: result.externalId ?? '',
          external_url: result.externalUrl ?? null,
          status: 'published',
        });
        dispatchPropertyBlogUpdated(propertyId);
        onMutation();
      }
    });
  }

  function handleSync() {
    if (!blog || !platformPost) return;
    setFeedback(null);
    startSyncTransition(async () => {
      const result = await updateBloggerPost(blog.id, platformPost.external_id, {
        title: blog.title,
        contentHtml: blog.contentHtml ?? '',
        tags: blog.tags,
      });
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        dispatchPropertyBlogUpdated(propertyId);
        onMutation();
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
    startSyncTransition(async () => {
      const result = await deleteBloggerPost(blog.id, platformPost.external_id);
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setPlatformPost(null);
        dispatchPropertyBlogUpdated(propertyId);
        onMutation();
      }
    });
  }

  const handleCopy = async (type: 'title' | 'content', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(type);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch { /* ignore */ }
  };

  if (loading || loadingInit) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        <span className="ml-2 text-text-muted text-sm">載入整合狀態...</span>
      </div>
    );
  }

  const accountConnected = integration?.isConnected === true;
  const blogSelected = accountConnected && !!integration?.blogId;
  const isPending = isSyncing;

  // Not connected
  if (!accountConnected) {
    return (
      <div id="property-blog-google-panel" className="space-y-4">
        <SetupGate
          icon={<Globe size={28} className="text-[#ea4335]" />}
          iconBg="bg-[#ea4335]/10"
          title="尚未連結 Google 帳號"
          desc="請先至設定頁面完成 Google 帳號授權，再回此頁發布。"
          actions={
            <a href="/superadmin/settings/integrations" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea4335] text-white text-sm font-medium rounded-lg hover:bg-[#c5221f] transition-colors">
              <Globe size={14} />前往整合設定<ExternalLink size={12} />
            </a>
          }
        />
        <ManualCopySection blog={blog} copyStatus={copyStatus} onCopy={handleCopy}
          show={showManualCopy} onToggle={() => setShowManualCopy((v) => !v)}
          blogPostUrl="https://www.blogger.com" />
      </div>
    );
  }

  // Connected but no blog selected
  if (!blogSelected) {
    return (
      <div id="property-blog-google-panel" className="space-y-4">
        <SetupGate
          icon={<AlertCircle size={28} className="text-amber-500" />}
          iconBg="bg-amber-500/10"
          title="Google 帳號已連結，但尚未選擇部落格"
          desc="請先至 blogger.com 建立部落格，再回整合設定頁選擇。"
          actions={
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
          }
        />
        <ManualCopySection blog={blog} copyStatus={copyStatus} onCopy={handleCopy}
          show={showManualCopy} onToggle={() => setShowManualCopy((v) => !v)}
          blogPostUrl="https://www.blogger.com" />
      </div>
    );
  }

  // Fully connected
  const isPublished = !!platformPost && platformPost.status !== 'deleted';

  return (
    <div id="property-blog-google-panel" className="space-y-4">
      {feedback && (
        <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
          feedback.type === 'success'
            ? 'bg-green-500/10 text-green-600 border border-green-500/20'
            : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {feedback.type === 'error' && <AlertCircle size={14} className="shrink-0 mt-0.5" />}
          <span className="break-all">{feedback.message}</span>
        </div>
      )}

      {/* Integration status */}
      <div className="flex items-center gap-3 px-3 py-2.5 bg-bg-tertiary rounded-lg border border-border-default">
        <Globe size={14} className="text-[#ea4335] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">{integration.blogName ?? 'Google Blogger'}</p>
          {integration.blogUrl && (
            <a href={integration.blogUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-accent hover:underline flex items-center gap-1">
              {integration.blogUrl}<ExternalLink size={10} />
            </a>
          )}
        </div>
        <span className="text-xs text-green-500 flex items-center gap-1 shrink-0">
          <CheckCircle size={12} />已連結
        </span>
      </div>

      {/* Content source section */}
      <section className="border border-border-default rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-tertiary border-b border-border-default">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">內容來源（本站部落格）</span>
          <span className="ml-auto text-xs text-text-muted">發布到 Blogger 將使用此內容</span>
        </div>

        <div className="p-4 space-y-3">
          {blog ? (
            <>
              <div className="space-y-1">
                <p className="text-sm font-medium text-text-primary leading-snug">{blog.title}</p>
                <p className="text-xs text-text-muted">
                  內容更新於 {new Date(blog.updatedAt).toLocaleString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-border-default text-text-secondary rounded-md hover:bg-bg-tertiary transition-colors"
                >
                  {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
                  {showPreview ? '隱藏預覽' : '預覽內容'}
                </button>
              </div>

              {showPreview && blog.contentHtml && (
                <div className="border border-border-default rounded-lg overflow-hidden mt-2">
                  <div className="bg-bg-tertiary px-4 py-1.5 border-b border-border-default flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-xs text-text-muted ml-1">Blogger 預覽</span>
                  </div>
                  <div className="bg-white">
                    <iframe
                      srcDoc={getBlogPreviewHtml(blog.contentHtml, blog.title)}
                      className="w-full border-0"
                      style={{ height: '500px' }}
                      title="Blogger 預覽"
                      sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-text-secondary">尚未生成廣告內容。</p>
              <p className="text-xs text-text-muted">
                請在上方廣告樣式表格中，選擇風格後點擊該列右側「重生」按鈕來生成內容。
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Blogger publish status */}
      <section className="border border-border-default rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 bg-bg-tertiary border-b border-border-default">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Google Blogger 發布狀態</span>
        </div>

        <div className="p-4">
          {isPublished ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle size={14} className="text-green-500 shrink-0" />
                <span className="text-sm font-medium text-text-primary">已發布至 Google Blogger</span>
              </div>
              {platformPost.external_url && (
                <a href={platformPost.external_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-accent hover:underline break-all">
                  <ExternalLink size={13} className="shrink-0" />
                  {platformPost.external_url}
                </a>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  onClick={handleSync}
                  disabled={isPending || !blog}
                  title="將本站目前的廣告內容同步到 Blogger，不重新生成"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default text-text-secondary rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                >
                  {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  同步現有內容到 Blogger
                </button>

                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
                    confirmDelete ? 'bg-red-500 text-white' : 'text-red-500 border border-red-500/30 hover:bg-red-500/10'
                  }`}
                >
                  <Trash2 size={12} />
                  {confirmDelete ? '確認從 Blogger 刪除？' : '從 Blogger 刪除'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">
                {blog ? '內容已生成，可發布至 Blogger。' : '請先在上方生成廣告內容。'}
              </p>
              <button
                onClick={handlePublish}
                disabled={isPending || !blog}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#ea4335] text-white text-sm font-medium rounded-lg hover:bg-[#c5221f] transition-colors disabled:opacity-50"
              >
                {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
                發布至 Google Blogger
              </button>
              <p className="text-xs text-text-muted">發布後可隨時同步內容或從 Blogger 刪除。</p>
            </div>
          )}
        </div>
      </section>

      {/* Manual copy (fallback) */}
      <ManualCopySection blog={blog} copyStatus={copyStatus} onCopy={handleCopy}
        show={showManualCopy} onToggle={() => setShowManualCopy((v) => !v)}
        blogPostUrl={
          integration.blogId
            ? `https://www.blogger.com/blog/post/create/${integration.blogId}`
            : 'https://www.blogger.com'
        } />
    </div>
  );
}

function SetupGate({
  icon, iconBg, title, desc, actions,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  desc: string;
  actions: React.ReactNode;
}) {
  return (
    <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center space-y-4">
      <div className={`mx-auto w-16 h-16 rounded-full ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <h3 className="text-base font-bold text-text-primary mb-1">{title}</h3>
        <p className="text-sm text-text-secondary">{desc}</p>
      </div>
      {actions}
    </div>
  );
}

function ManualCopySection({
  blog, copyStatus, onCopy, show, onToggle, blogPostUrl,
}: {
  blog: BlogPost | null;
  copyStatus: 'title' | 'content' | null;
  onCopy: (type: 'title' | 'content', text: string) => void;
  show: boolean;
  onToggle: () => void;
  blogPostUrl: string;
}) {
  if (!blog || (!blog.contentHtml && !blog.title)) return null;

  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
      >
        <FileCode size={13} className="text-text-muted shrink-0" />
        <span className="font-medium text-xs">手動複製貼上（備用）</span>
        <span className="ml-auto shrink-0">
          {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </span>
      </button>

      {show && (
        <div className="px-4 pb-4 pt-1 border-t border-border-default space-y-2">
          <p className="text-xs text-text-muted">複製內容後貼至 Blogger 編輯器手動發布。</p>
          <div className="flex flex-wrap gap-2">
            {blog.title && (
              <button
                onClick={() => onCopy('title', blog.title)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default rounded-md text-xs text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                {copyStatus === 'title' ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                {copyStatus === 'title' ? '已複製標題' : '複製標題'}
              </button>
            )}
            {blog.contentHtml && (
              <button
                onClick={() => onCopy('content', blog.contentHtml!)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-default rounded-md text-xs text-text-secondary hover:bg-bg-tertiary transition-colors"
              >
                {copyStatus === 'content' ? <Check size={13} className="text-green-500" /> : <FileCode size={13} />}
                {copyStatus === 'content' ? '已複製 HTML' : '複製 HTML'}
              </button>
            )}
            <a
              href={blogPostUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#ea4335]/40 text-[#ea4335] rounded-md text-xs hover:bg-[#ea4335]/10 transition-colors"
            >
              <ExternalLink size={13} />前往 Blogger
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
