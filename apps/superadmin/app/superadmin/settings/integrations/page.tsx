'use client';

import { useState, useEffect, useTransition } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import {
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  Unlink,
  RefreshCw,
  Globe,
  ChevronDown,
  ChevronUp,
  Info,
  HardDrive,
  Cloud,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';

function FbIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
import {
  getIntegration,
  disconnectIntegration,
  saveFacebookPagesIntegration,
  type GoogleBloggerIntegration,
  type FacebookPagesIntegration,
} from '@/lib/actions/integrations';
import { verifyFacebookToken } from '@/lib/actions/facebook-pages';
import { listGoogleBlogs, selectGoogleBlog } from '@/lib/actions/google-blogger';

export default function IntegrationsPage() {
  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="第三方平台整合"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '超級管理員專區', href: '/superadmin' },
        { label: '設定', href: '/superadmin/settings' },
        { label: '第三方平台整合' },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Social Publishing */}
        <section>
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-text-primary">第三方平台整合</h1>
            <p className="text-sm text-text-muted mt-1">
              連結外部平台後，AI 可自動將物件部落格發布至對應平台。
            </p>
          </div>
          <div className="space-y-4">
            <GoogleBloggerCard />
            <FacebookPagesCard />
          </div>
        </section>

        {/* Cloud Backup */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <HardDrive size={18} />
              雲端備份整合
            </h2>
            <p className="text-sm text-text-muted mt-1">
              設定後可在「資料備份管理」頁面啟用雲端備份，每次備份時自動同步至雲端。
            </p>
          </div>
          <div className="space-y-4">
            <GoogleDriveBackupCard />
            <AWSS3BackupCard />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

/* ─── Google Blogger Card ─── */
function GoogleBloggerCard() {
  const [integration, setIntegration] = useState<GoogleBloggerIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [blogs, setBlogs] = useState<Array<{ id: string; name: string; url: string }>>([]);
  const [showBlogList, setShowBlogList] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    // Check URL params for OAuth result
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'google_connected') {
      setFeedback({ type: 'success', message: 'Google 帳號已成功連結！' });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('error')) {
      const err = params.get('error');
      setFeedback({ type: 'error', message: `Google 連結失敗：${err}` });
      window.history.replaceState({}, '', window.location.pathname);
    }

    getIntegration('google_blogger').then((data) => {
      setIntegration(data as GoogleBloggerIntegration | null);
      setLoading(false);
    });
  }, []);

  function handleConnect() {
    window.location.href = '/api/auth/google';
  }

  function handleDisconnect() {
    setFeedback(null);
    startTransition(async () => {
      const result = await disconnectIntegration('google_blogger');
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setIntegration((prev) => prev ? { ...prev, isConnected: false, blogId: null, blogName: null, blogUrl: null } : null);
      }
    });
  }

  function handleListBlogs() {
    setFeedback(null);
    startTransition(async () => {
      const result = await listGoogleBlogs();
      if (result.success && result.blogs) {
        setBlogs(result.blogs);
        setShowBlogList(true);
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  function handleSelectBlog(blog: { id: string; name: string; url: string }) {
    setFeedback(null);
    startTransition(async () => {
      const result = await selectGoogleBlog({ blogId: blog.id, blogUrl: blog.url, blogName: blog.name });
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setIntegration((prev) => prev ? { ...prev, blogId: blog.id, blogName: blog.name, blogUrl: blog.url } : null);
        setShowBlogList(false);
      }
    });
  }

  const isConnected = integration?.isConnected;

  return (
    <div className="border border-border-default rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 bg-bg-secondary border-b border-border-default">
        <div className="w-10 h-10 rounded-lg bg-[#ea4335]/10 flex items-center justify-center shrink-0">
          <Globe size={20} className="text-[#ea4335]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary">Google Blogger</h3>
          <p className="text-xs text-text-muted">透過 OAuth2 授權，AI 可直接在你的 Blogger 部落格建立物件文章</p>
        </div>
        <div className="shrink-0">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-text-muted" />
          ) : isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
              <CheckCircle size={12} />
              已連結
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-text-muted/10 text-text-muted text-xs font-medium rounded-full">
              <XCircle size={12} />
              未連結
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {feedback && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}>
            {feedback.message}
          </div>
        )}

        {isConnected ? (
          <>
            {integration?.blogName && (
              <div className="flex items-start gap-3 p-3 bg-bg-tertiary rounded-lg text-sm">
                <Globe size={14} className="text-text-muted mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-text-primary font-medium truncate">{integration.blogName}</p>
                  {integration.blogUrl && (
                    <a href={integration.blogUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline flex items-center gap-1 mt-0.5">
                      {integration.blogUrl}
                      <ExternalLink size={10} />
                    </a>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleListBlogs}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default text-text-secondary rounded-md hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                切換部落格
              </button>

              <button
                onClick={handleDisconnect}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-500/30 text-red-500 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <Unlink size={12} />
                解除連結
              </button>
            </div>

            {showBlogList && blogs.length > 0 && (
              <div className="border border-border-default rounded-lg overflow-hidden">
                <p className="px-3 py-2 text-xs text-text-muted bg-bg-tertiary border-b border-border-default">
                  選擇要使用的部落格：
                </p>
                {blogs.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBlog(b)}
                    disabled={isPending}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-tertiary transition-colors text-left border-b border-border-default last:border-0 disabled:opacity-50"
                  >
                    <Globe size={14} className="text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary font-medium truncate">{b.name}</p>
                      <p className="text-xs text-text-muted truncate">{b.url}</p>
                    </div>
                    {integration?.blogId === b.id && (
                      <CheckCircle size={14} className="text-green-500 shrink-0 ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleConnect}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#ea4335] text-white text-sm font-medium rounded-lg hover:bg-[#c5221f] transition-colors disabled:opacity-50"
            >
              <Globe size={14} />
              連結 Google 帳號
            </button>

            <button
              onClick={() => setShowSetup(!showSetup)}
              className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              <Info size={12} />
              需要先設定 Google Cloud 專案嗎？
              {showSetup ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {showSetup && (
              <div className="p-4 bg-bg-tertiary rounded-lg text-xs text-text-secondary space-y-2 border border-border-default">
                <p className="font-medium text-text-primary">設定步驟：</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>前往 <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Google Cloud Console</a> 建立專案</li>
                  <li>啟用 Blogger API v3</li>
                  <li>建立 OAuth 2.0 憑證，類型選「Web Application」</li>
                  <li>在授權重新導向 URI 加入：<code className="bg-bg-primary px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001'}/api/auth/google/callback</code></li>
                  <li>將 Client ID 和 Client Secret 設定到 <code className="bg-bg-primary px-1 rounded">.env.local</code> 的 <code className="bg-bg-primary px-1 rounded">GOOGLE_BLOGGER_CLIENT_ID</code> 和 <code className="bg-bg-primary px-1 rounded">GOOGLE_BLOGGER_CLIENT_SECRET</code></li>
                </ol>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Facebook Pages Card ─── */
function FacebookPagesCard() {
  const [integration, setIntegration] = useState<FacebookPagesIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [pageId, setPageId] = useState('');
  const [pageName, setPageName] = useState('');
  const [pageToken, setPageToken] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    getIntegration('facebook_pages').then((data) => {
      setIntegration(data as FacebookPagesIntegration | null);
      setLoading(false);
    });
  }, []);

  function handleVerifyAndSave() {
    if (!pageId.trim() || !pageToken.trim()) {
      setFeedback({ type: 'error', message: '請填入粉絲頁 ID 和 Access Token' });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      // Verify token first
      const verify = await verifyFacebookToken(pageToken.trim());
      if (!verify.success) {
        setFeedback({ type: 'error', message: `Token 驗證失敗：${verify.message}` });
        return;
      }

      const result = await saveFacebookPagesIntegration({
        pageId: pageId.trim(),
        pageName: pageName.trim() || verify.message.replace('驗證成功：', ''),
        pageToken: pageToken.trim(),
      });

      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setIntegration((prev) => prev
          ? { ...prev, isConnected: true, pageId: pageId.trim(), pageName: pageName.trim() }
          : null
        );
        setShowForm(false);
        setPageToken('');
      }
    });
  }

  function handleDisconnect() {
    setFeedback(null);
    startTransition(async () => {
      const result = await disconnectIntegration('facebook_pages');
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
      if (result.success) {
        setIntegration((prev) => prev ? { ...prev, isConnected: false, pageId: null, pageName: null } : null);
      }
    });
  }

  const isConnected = integration?.isConnected;

  return (
    <div className="border border-border-default rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 bg-bg-secondary border-b border-border-default">
        <div className="w-10 h-10 rounded-lg bg-[#1877f2]/10 flex items-center justify-center shrink-0">
          <FbIcon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary">Facebook 粉絲頁</h3>
          <p className="text-xs text-text-muted">透過 Page Access Token，AI 可將物件資訊直接發布至你的 Facebook 粉絲頁</p>
        </div>
        <div className="shrink-0">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-text-muted" />
          ) : isConnected ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
              <CheckCircle size={12} />
              已連結
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-text-muted/10 text-text-muted text-xs font-medium rounded-full">
              <XCircle size={12} />
              未連結
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {feedback && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}>
            {feedback.message}
          </div>
        )}

        {isConnected ? (
          <>
            {integration?.pageName && (
              <div className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg text-sm">
                <FbIcon size={14} />
                <p className="text-text-primary font-medium">{integration.pageName}</p>
                {integration.pageId && (
                  <span className="text-xs text-text-muted ml-auto">ID: {integration.pageId}</span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowForm(!showForm)}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default text-text-secondary rounded-md hover:bg-bg-tertiary transition-colors"
              >
                更新 Token
              </button>
              <button
                onClick={handleDisconnect}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-500/30 text-red-500 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                <Unlink size={12} />
                解除連結
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1877f2] text-white text-sm font-medium rounded-lg hover:bg-[#1565c0] transition-colors"
          >
            <FbIcon size={14} />
            連結 Facebook 粉絲頁
          </button>
        )}

        {showForm && (
          <div className="border border-border-default rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">粉絲頁名稱（選填）</label>
              <input
                type="text"
                value={pageName}
                onChange={(e) => setPageName(e.target.value)}
                placeholder="我的房地產粉絲頁"
                className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">粉絲頁 ID <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="123456789012345"
                className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Page Access Token <span className="text-red-500">*</span></label>
              <textarea
                value={pageToken}
                onChange={(e) => setPageToken(e.target.value)}
                rows={3}
                placeholder="EAAxxxxxxxxxxxxx..."
                className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none font-mono"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleVerifyAndSave}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#1877f2] text-white rounded-md hover:bg-[#1565c0] transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                驗證並儲存
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors">
                取消
              </button>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <Info size={12} />
          如何取得 Page Access Token？
          {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showGuide && (
          <div className="p-4 bg-bg-tertiary rounded-lg text-xs text-text-secondary space-y-2 border border-border-default">
            <p className="font-medium text-text-primary">取得長效 Page Access Token：</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>前往 <a href="https://developers.facebook.com/tools/explorer" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Graph API Explorer</a></li>
              <li>選擇你的 Facebook App，點選「Generate Access Token」</li>
              <li>勾選權限：<code className="bg-bg-primary px-1 rounded">pages_manage_posts</code>、<code className="bg-bg-primary px-1 rounded">pages_read_engagement</code></li>
              <li>產生 Token 後，點選「Page Access Token」分頁取得粉絲頁專屬 Token</li>
              <li>建議使用 <a href="https://developers.facebook.com/tools/accesstoken" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Token Debugger</a> 延長效期至長效 Token（60 天）</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Google Drive Backup Card ─── */
function GoogleDriveBackupCard() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [folderId, setFolderId] = useState('');
  const [saJson, setSaJson] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/backup/cloud-settings')
      .then((r) => r.json())
      .then((data: { gdrive: { configured: boolean; folder_id: string } }) => {
        setConfigured(data.gdrive.configured);
        setFolderId(data.gdrive.folder_id);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSave() {
    if (!saJson.trim()) {
      setFeedback({ type: 'error', message: '請貼上 Service Account JSON 金鑰內容' });
      return;
    }
    // Validate JSON
    try {
      const parsed = JSON.parse(saJson.trim()) as Record<string, unknown>;
      if (!parsed.client_email || !parsed.private_key) {
        setFeedback({ type: 'error', message: 'JSON 缺少 client_email 或 private_key 欄位，請確認是否為正確的 Service Account JSON' });
        return;
      }
    } catch {
      setFeedback({ type: 'error', message: 'JSON 格式無效，請確認是否正確貼上完整內容' });
      return;
    }

    setFeedback(null);
    startTransition(async () => {
      const res = await fetch('/api/backup/cloud-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gdrive: { service_account_json: saJson.trim(), folder_id: folderId } }),
      });
      const data = await res.json() as { success: boolean };
      if (data.success) {
        setConfigured(true);
        setShowForm(false);
        setSaJson('');
        setFeedback({ type: 'success', message: 'Google Drive Service Account 已儲存！請到備份管理頁面啟用雲端備份。' });
      } else {
        setFeedback({ type: 'error', message: '儲存失敗' });
      }
    });
  }

  function handleDisconnect() {
    if (!confirm('確定清除 Google Drive 備份設定？')) return;
    startTransition(async () => {
      await fetch('/api/backup/cloud-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gdrive: { enabled: false, service_account_json: '', folder_id: '' } }),
      });
      setConfigured(false);
      setFolderId('');
      setFeedback({ type: 'success', message: '已清除 Google Drive 設定' });
    });
  }

  return (
    <div className="border border-border-default rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 bg-bg-secondary border-b border-border-default">
        <div className="w-10 h-10 rounded-lg bg-[#4285f4]/10 flex items-center justify-center shrink-0">
          <Cloud size={20} className="text-[#4285f4]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary">Google Drive 備份</h3>
          <p className="text-xs text-text-muted">使用 Service Account 自動上傳備份至指定 Google Drive 資料夾</p>
        </div>
        <div className="shrink-0">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-text-muted" />
          ) : configured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
              <CheckCircle size={12} />
              已設定
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-text-muted/10 text-text-muted text-xs font-medium rounded-full">
              <XCircle size={12} />
              未設定
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {feedback && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}>
            {feedback.message}
          </div>
        )}

        {configured ? (
          <div className="flex flex-wrap gap-2">
            {folderId && (
              <div className="flex items-center gap-2 p-3 bg-bg-tertiary rounded-lg text-sm w-full">
                <Cloud size={14} className="text-text-muted shrink-0" />
                <span className="text-xs text-text-secondary">Folder ID: <code className="font-mono">{folderId}</code></span>
              </div>
            )}
            <button onClick={() => setShowForm(!showForm)} disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default text-text-secondary rounded-md hover:bg-bg-tertiary transition-colors">
              <KeyRound size={12} />
              更新金鑰
            </button>
            <button onClick={handleDisconnect} disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-500/30 text-red-500 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50">
              <Unlink size={12} />
              清除設定
            </button>
          </div>
        ) : (
          <button onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#4285f4] text-white text-sm font-medium rounded-lg hover:bg-[#3367d6] transition-colors">
            <KeyRound size={14} />
            設定 Service Account
          </button>
        )}

        {showForm && (
          <div className="border border-border-default rounded-lg p-4 space-y-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Google Drive 資料夾 ID（選填）</label>
              <input type="text" value={folderId} onChange={(e) => setFolderId(e.target.value)}
                placeholder="例如：1AbCdEfGhIjKlMnOpQrStUvWxYz（資料夾 URL 最後一段）"
                className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono" />
              <p className="text-[11px] text-text-muted mt-1">留空則上傳至 Service Account 的根目錄。記得將該資料夾共享給 Service Account 的 email。</p>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Service Account JSON 金鑰 <span className="text-red-500">*</span></label>
              <textarea value={saJson} onChange={(e) => setSaJson(e.target.value)} rows={6}
                placeholder='{ "type": "service_account", "project_id": "...", "client_email": "...", "private_key": "..." }'
                className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent resize-none font-mono" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#4285f4] text-white rounded-md hover:bg-[#3367d6] transition-colors disabled:opacity-50">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                驗證並儲存
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors">
                取消
              </button>
            </div>
          </div>
        )}

        <button onClick={() => setShowGuide(!showGuide)}
          className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors">
          <Info size={12} />
          如何建立 Service Account？
          {showGuide ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {showGuide && (
          <div className="p-4 bg-bg-tertiary rounded-lg text-xs text-text-secondary space-y-2 border border-border-default">
            <p className="font-medium text-text-primary">建立 Google Service Account：</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>前往 <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GCP IAM Service Accounts</a></li>
              <li>建立新的 Service Account，名稱可設為「Property Backup」</li>
              <li>在該 Service Account 頁面點選「Keys」→「Add Key」→「Create new key」→ 選 JSON</li>
              <li>下載的 JSON 即為金鑰，將其完整內容貼到上方欄位</li>
              <li>前往 Google Drive 建立備份資料夾，右鍵「共用」→ 新增 Service Account 的 email（<code className="bg-bg-primary px-1 rounded">xxx@xxx.iam.gserviceaccount.com</code>）為「編輯者」</li>
              <li>複製資料夾 URL 最後一段 ID 貼到「資料夾 ID」欄位</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── AWS S3 Backup Card ─── */
function AWSS3BackupCard() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [bucket, setBucket] = useState('');
  const [region, setRegion] = useState('ap-northeast-1');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [prefix, setPrefix] = useState('property-backups/');
  const [showForm, setShowForm] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    fetch('/api/backup/cloud-settings')
      .then((r) => r.json())
      .then((data: { s3: { configured: boolean; bucket: string; region: string; access_key_id: string; prefix: string } }) => {
        setConfigured(data.s3.configured);
        setBucket(data.s3.bucket);
        setRegion(data.s3.region);
        setAccessKeyId(data.s3.access_key_id);
        setPrefix(data.s3.prefix);
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSave() {
    if (!bucket.trim() || !accessKeyId.trim() || !secretKey.trim()) {
      setFeedback({ type: 'error', message: '請填入 Bucket、Access Key ID 和 Secret Access Key' });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await fetch('/api/backup/cloud-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          s3: {
            bucket: bucket.trim(),
            region: region.trim(),
            access_key_id: accessKeyId.trim(),
            secret_access_key: secretKey.trim(),
            prefix: prefix.trim(),
          },
        }),
      });
      const data = await res.json() as { success: boolean };
      if (data.success) {
        setConfigured(true);
        setShowForm(false);
        setSecretKey('');
        setFeedback({ type: 'success', message: 'AWS S3 設定已儲存！請到備份管理頁面啟用雲端備份。' });
      } else {
        setFeedback({ type: 'error', message: '儲存失敗' });
      }
    });
  }

  function handleDisconnect() {
    if (!confirm('確定清除 AWS S3 備份設定？')) return;
    startTransition(async () => {
      await fetch('/api/backup/cloud-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3: { enabled: false, bucket: '', region: 'ap-northeast-1', access_key_id: '', secret_access_key: '', prefix: 'property-backups/' } }),
      });
      setConfigured(false);
      setBucket('');
      setAccessKeyId('');
      setPrefix('property-backups/');
      setFeedback({ type: 'success', message: '已清除 AWS S3 設定' });
    });
  }

  return (
    <div className="border border-border-default rounded-xl overflow-hidden">
      <div className="flex items-center gap-4 px-5 py-4 bg-bg-secondary border-b border-border-default">
        <div className="w-10 h-10 rounded-lg bg-[#ff9900]/10 flex items-center justify-center shrink-0">
          <HardDrive size={20} className="text-[#ff9900]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-text-primary">AWS S3 備份</h3>
          <p className="text-xs text-text-muted">使用 Access Key 自動上傳備份至 S3 Bucket</p>
        </div>
        <div className="shrink-0">
          {loading ? (
            <Loader2 size={16} className="animate-spin text-text-muted" />
          ) : configured ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
              <CheckCircle size={12} />
              已設定
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-text-muted/10 text-text-muted text-xs font-medium rounded-full">
              <XCircle size={12} />
              未設定
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {feedback && (
          <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
            feedback.type === 'success' ? 'bg-green-500/10 text-green-600 border border-green-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'
          }`}>
            {feedback.message}
          </div>
        )}

        {configured && !showForm ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-bg-tertiary rounded-lg text-xs text-text-secondary">
              <HardDrive size={14} className="text-text-muted shrink-0" />
              <span>Bucket: <code className="font-mono">{bucket}</code></span>
              <span className="text-text-muted">|</span>
              <span>Region: <code className="font-mono">{region}</code></span>
              {prefix && <>
                <span className="text-text-muted">|</span>
                <span>Prefix: <code className="font-mono">{prefix}</code></span>
              </>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setShowForm(true)} disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border-default text-text-secondary rounded-md hover:bg-bg-tertiary transition-colors">
                <KeyRound size={12} />
                更新金鑰
              </button>
              <button onClick={handleDisconnect} disabled={isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-red-500/30 text-red-500 rounded-md hover:bg-red-500/10 transition-colors disabled:opacity-50">
                <Unlink size={12} />
                清除設定
              </button>
            </div>
          </div>
        ) : !configured && !showForm ? (
          <button onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#ff9900] text-white text-sm font-medium rounded-lg hover:bg-[#e68a00] transition-colors">
            <KeyRound size={14} />
            設定 AWS 憑證
          </button>
        ) : null}

        {showForm && (
          <div className="border border-border-default rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Bucket Name <span className="text-red-500">*</span></label>
                <input type="text" value={bucket} onChange={(e) => setBucket(e.target.value)}
                  placeholder="my-backup-bucket"
                  className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Region</label>
                <input type="text" value={region} onChange={(e) => setRegion(e.target.value)}
                  placeholder="ap-northeast-1"
                  className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Access Key ID <span className="text-red-500">*</span></label>
              <input type="text" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono" />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Secret Access Key <span className="text-red-500">*</span></label>
              <div className="relative">
                <input type={showSecret ? 'text' : 'password'} value={secretKey} onChange={(e) => setSecretKey(e.target.value)}
                  placeholder={configured ? '（已儲存，留空則不更新）' : 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'}
                  className="w-full px-3 py-2 pr-10 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono" />
                <button type="button" onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-secondary">
                  {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Key Prefix（選填）</label>
              <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)}
                placeholder="property-backups/"
                className="w-full px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono" />
              <p className="text-[11px] text-text-muted mt-1">備份檔將存於 s3://bucket/prefix/backup_YYYYMMDD_HHmmss.json</p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#ff9900] text-white rounded-md hover:bg-[#e68a00] transition-colors disabled:opacity-50">
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                儲存設定
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-text-secondary border border-border-default rounded-md hover:bg-bg-tertiary transition-colors">
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
