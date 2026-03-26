'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Database, Globe, Link2, X, ChevronDown, ChevronUp, Sparkles, Palette,
  ExternalLink, Copy, Check, FileCode,
} from 'lucide-react';
import type { BlogPost, StylePreset } from '@/lib/actions/blog';
import { getPropertyBlog } from '@/lib/actions/blog';
import { getPlatformPost } from '@/lib/actions/integrations';
import { wrapForBlogger } from '@/lib/utils/blogger-wrapped-html';
import {
  PROPERTY_BLOG_UPDATED_EVENT,
  type PropertyBlogUpdatedDetail,
} from '@/lib/utils/property-blog-events';

import { BlogSupabasePanel } from './BlogSupabasePanel';
import { BlogGooglePanel } from './BlogGooglePanel';
import { PropertyBlogStyleRowActionCells } from './PropertyBlogStyleRowActionCells';

type Platform = 'supabase' | 'google_blogger';

interface PropertyBlogGeneratorProps {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
}

const PLATFORMS: { id: Platform; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    id: 'supabase',
    label: '地端 Supabase',
    icon: <Database size={15} />,
    desc: '存於本地資料庫，潛在買家/租客透過本站瀏覽',
  },
  {
    id: 'google_blogger',
    label: 'Google Blogger',
    icon: <Globe size={15} />,
    desc: '發布至你的 Google Blogger，Google SEO 加成',
  },
];

const STYLE_PRESETS: { id: StylePreset; label: string; emoji: string; desc: string }[] = [
  { id: 'luxury_dark', label: '豪宅暗色調', emoji: '🌃', desc: '深色背景、金色點綴、高端奢華感' },
  { id: 'bright_clean', label: '清爽明亮', emoji: '☀️', desc: '白底藍色系、現代感、清晰易讀' },
  { id: 'corporate', label: '商務簡潔', emoji: '🏢', desc: '深藍白色、結構嚴謹、商業不動產' },
  { id: 'warm_japanese', label: '溫馨日系', emoji: '🌿', desc: '米色系、日式極簡、居家溫暖感' },
];

const STYLE_PLATFORM_ROWS: {
  rowId: string;
  platform: Platform;
  platformLabel: string;
  stylePreset: StylePreset;
  styleLabel: string;
  styleEmoji: string;
  desc: string;
}[] = PLATFORMS.flatMap((p) =>
  STYLE_PRESETS.map((s) => ({
    rowId: `${p.id}-${s.id}`,
    platform: p.id,
    platformLabel: p.label,
    stylePreset: s.id,
    styleLabel: s.label,
    styleEmoji: s.emoji,
    desc: s.desc,
  })),
);

function isPlatform(value: string | null): value is Platform {
  return value === 'supabase' || value === 'google_blogger';
}

function isStylePreset(value: string | null): value is StylePreset {
  return value === 'luxury_dark' || value === 'bright_clean' || value === 'corporate' || value === 'warm_japanese';
}

export function PropertyBlogGenerator({ propertyId, propertyType, ownerId }: PropertyBlogGeneratorProps) {
  const [platform, setPlatform] = useState<Platform>('supabase');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceUrlInput, setReferenceUrlInput] = useState('');
  const [showRefInput, setShowRefInput] = useState(false);
  const [stylePreset, setStylePreset] = useState<StylePreset | undefined>(undefined);
  const [loadingEstablishedLinks, setLoadingEstablishedLinks] = useState(true);
  const [establishedLinks, setEstablishedLinks] = useState<{ localUrl: string | null; googleUrl: string | null }>({
    localUrl: null,
    googleUrl: null,
  });
  /** Latest blog row — used for Blogger manual paste (HTML) in the style table */
  const [propertyBlog, setPropertyBlog] = useState<BlogPost | null>(null);
  const [copyPasteKind, setCopyPasteKind] = useState<'wrapped' | 'raw' | null>(null);

  const activeVariant = stylePreset
    ? {
        stylePreset,
        targetPlatform: platform === 'supabase' ? 'local' : 'google_blogger' as const,
        referenceUrl: referenceUrl || undefined,
      }
    : undefined;

  const replaceSearchParams = useCallback((mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }, []);

  const refreshBlogAndLinks = useCallback(async () => {
    setLoadingEstablishedLinks(true);
    try {
      if (!activeVariant) {
        setPropertyBlog(null);
        setEstablishedLinks({ localUrl: null, googleUrl: null });
        return;
      }

      const blog = await getPropertyBlog(propertyId, activeVariant);
      setPropertyBlog(blog);
      if (!blog) {
        setEstablishedLinks({ localUrl: null, googleUrl: null });
        return;
      }
      const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
      const localUrl = `${webUrl}/blog/${blog.slug}`;
      const googlePost = await getPlatformPost(blog.id, 'google_blogger');
      const googleUrl = googlePost?.external_url ?? null;
      setEstablishedLinks({ localUrl, googleUrl });
    } finally {
      setLoadingEstablishedLinks(false);
    }
  }, [activeVariant, propertyId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('blogPlatform');
    const s = params.get('blogStylePreset');
    const ref = params.get('blogReferenceUrl');
    if (isPlatform(p)) {
      setPlatform(p);
    }
    if (isStylePreset(s)) {
      setStylePreset(s);
    }
    if (ref) {
      setReferenceUrl(ref);
      setReferenceUrlInput(ref);
      setShowRefInput(true);
    }
  }, []);

  useEffect(() => {
    void refreshBlogAndLinks();
  }, [refreshBlogAndLinks]);

  useEffect(() => {
    function onPropertyBlogUpdated(e: Event) {
      const detail = (e as CustomEvent<PropertyBlogUpdatedDetail>).detail;
      if (detail?.propertyId === propertyId) {
        void refreshBlogAndLinks();
      }
    }
    window.addEventListener(PROPERTY_BLOG_UPDATED_EVENT, onPropertyBlogUpdated);
    return () => window.removeEventListener(PROPERTY_BLOG_UPDATED_EVENT, onPropertyBlogUpdated);
  }, [propertyId, refreshBlogAndLinks]);

  async function copyBloggerHtml(kind: 'wrapped' | 'raw') {
    if (!propertyBlog?.contentHtml) return;
    try {
      const text =
        kind === 'wrapped'
          ? wrapForBlogger(propertyBlog.title, propertyBlog.contentHtml)
          : propertyBlog.contentHtml;
      await navigator.clipboard.writeText(text);
      setCopyPasteKind(kind);
      setTimeout(() => setCopyPasteKind(null), 2000);
    } catch {
      /* ignore */
    }
  }

  function buildStyleHref(targetPlatform: Platform, targetStylePreset: StylePreset): string {
    const params = new URLSearchParams(window.location.search);
    params.set('blogPlatform', targetPlatform);
    params.set('blogStylePreset', targetStylePreset);
    return `?${params.toString()}`;
  }

  function applyStyleRow(targetPlatform: Platform, targetStylePreset: StylePreset) {
    setPlatform(targetPlatform);
    setStylePreset(targetStylePreset);
    const href = buildStyleHref(targetPlatform, targetStylePreset);
    window.history.replaceState(null, '', href);
  }

  function applyReferenceUrl() {
    const trimmed = referenceUrlInput.trim();
    if (!trimmed) {
      clearReferenceUrl();
      return;
    }
    // Basic URL validation
    try {
      new URL(trimmed);
      setReferenceUrl(trimmed);
      replaceSearchParams((params) => {
        params.set('blogReferenceUrl', trimmed);
      });
    } catch {
      setReferenceUrl('');
      replaceSearchParams((params) => {
        params.delete('blogReferenceUrl');
      });
    }
  }

  function clearReferenceUrl() {
    setReferenceUrl('');
    setReferenceUrlInput('');
    replaceSearchParams((params) => {
      params.delete('blogReferenceUrl');
    });
  }

  const showRefUrlOption = platform === 'supabase' || platform === 'google_blogger';

  return (
    <div className="space-y-5">
      {/* Platform Selector */}
      <div>
        <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wide">發布平台</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPlatform(p.id);
                replaceSearchParams((params) => {
                  params.set('blogPlatform', p.id);
                });
              }}
              className={`flex items-start gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                platform === p.id
                  ? 'border-accent bg-accent/5 shadow-sm'
                  : 'border-border-default hover:border-border-hover hover:bg-bg-tertiary'
              }`}
            >
              <span className={`mt-0.5 shrink-0 ${platform === p.id ? 'text-accent' : 'text-text-muted'}`}>
                {p.icon}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-medium leading-tight ${platform === p.id ? 'text-accent' : 'text-text-primary'}`}>
                  {p.label}
                </p>
                <p className="text-xs text-text-muted mt-0.5 leading-snug">{p.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Style preset table — filtered by currently selected platform */}
      {showRefUrlOption && (
        <div>
          <p className="text-xs text-text-muted mb-2 font-medium flex items-center gap-1.5">
            <Palette size={13} className="text-accent" />
            <span>{STYLE_PRESETS.length} 種廣告樣式（表格快捷）</span>
            {stylePreset && (
              <button
                onClick={() => {
                  setStylePreset(undefined);
                  replaceSearchParams((params) => {
                    params.delete('blogStylePreset');
                  });
                }}
                className="ml-auto text-xs text-text-muted hover:text-text-secondary flex items-center gap-0.5"
              >
                <X size={11} />清除
              </button>
            )}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border-default">
            <table
              className={`w-full text-xs ${
                platform === 'google_blogger' ? 'min-w-[1480px]' : 'min-w-[1300px]'
              }`}
            >
              <thead className="bg-bg-tertiary text-text-secondary">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">#</th>
                  <th className="px-3 py-2 text-left font-medium">風格選擇</th>
                  <th className="px-3 py-2 text-left font-medium">說明</th>
                  <th className="px-3 py-2 text-left font-medium whitespace-normal max-w-[200px]">
                    {platform === 'google_blogger'
                      ? '生成 Google Blogger 頁面語言'
                      : '生成 地端廣告頁面'}
                  </th>
                  <th className="px-3 py-2 text-left font-medium max-w-[260px]">
                    {platform === 'google_blogger' ? '複製貼上（HTML）' : '本站預覽連結'}
                  </th>
                  {platform === 'google_blogger' && (
                    <th className="px-3 py-2 text-left font-medium">Blogger 已發佈網址</th>
                  )}
                  <th className="px-2 py-2 text-center font-medium whitespace-normal max-w-[72px] border-l border-border-default/60">
                    編輯
                  </th>
                  <th className="px-2 py-2 text-center font-medium whitespace-normal max-w-[72px]">同步聯絡方式</th>
                  <th className="px-2 py-2 text-center font-medium whitespace-normal max-w-[72px]">重新生成</th>
                  <th
                    className="px-2 py-2 text-center font-medium whitespace-normal max-w-[72px]"
                    title="已發佈時為下架；草稿時為發佈"
                  >
                    下架
                  </th>
                  <th className="px-2 py-2 text-center font-medium whitespace-normal max-w-[72px]">刪除</th>
                </tr>
              </thead>
              <tbody>
                {STYLE_PLATFORM_ROWS.filter((row) => row.platform === platform).map((row, index) => {
                  const isActive = stylePreset === row.stylePreset;
                  const articleUrl = row.platform === 'supabase' ? establishedLinks.localUrl : establishedLinks.googleUrl;
                  const showBloggerPasteUi =
                    row.platform === 'google_blogger' &&
                    isActive &&
                    Boolean(propertyBlog?.contentHtml) &&
                    stylePreset === row.stylePreset;
                  return (
                    <tr
                      key={row.rowId}
                      className={`border-t border-border-default ${isActive ? 'bg-accent/10' : 'bg-bg-secondary'}`}
                    >
                      <td className="px-3 py-2 text-text-muted">{index + 1}</td>
                      <td className="px-3 py-2 text-text-primary">
                        <span className="inline-flex items-center gap-1.5">
                          <span>{row.styleEmoji}</span>
                          <span>{row.styleLabel}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-text-muted">{row.desc}</td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => applyStyleRow(row.platform, row.stylePreset)}
                          className={`inline-flex items-center px-2 py-1 rounded border transition-colors ${
                            isActive
                              ? 'border-accent text-accent bg-accent/10'
                              : 'border-border-default text-text-secondary hover:bg-bg-tertiary'
                          }`}
                        >
                          {isActive ? '已套用' : '套用此樣式'}
                        </button>
                      </td>
                      <td className="px-3 py-2 align-top">
                        {row.platform === 'google_blogger' ? (
                          loadingEstablishedLinks ? (
                            <span className="text-text-muted">讀取中...</span>
                          ) : showBloggerPasteUi ? (
                            <div className="flex flex-col gap-1.5 max-w-[260px]">
                              <button
                                type="button"
                                onClick={() => void copyBloggerHtml('wrapped')}
                                className="inline-flex items-start gap-1.5 text-left text-accent hover:text-accent-hover underline underline-offset-2 text-xs"
                              >
                                {copyPasteKind === 'wrapped' ? (
                                  <Check size={12} className="shrink-0 mt-0.5 text-green-500" />
                                ) : (
                                  <Copy size={12} className="shrink-0 mt-0.5" />
                                )}
                                <span>
                                  {copyPasteKind === 'wrapped'
                                    ? '已複製（含外層樣式，與 API 發佈相同）'
                                    : '複製貼上用 HTML（與 API 發佈相同）'}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => void copyBloggerHtml('raw')}
                                className="inline-flex items-start gap-1.5 text-left text-text-secondary hover:text-text-primary text-xs"
                              >
                                {copyPasteKind === 'raw' ? (
                                  <Check size={12} className="shrink-0 mt-0.5 text-green-500" />
                                ) : (
                                  <FileCode size={12} className="shrink-0 mt-0.5" />
                                )}
                                <span>{copyPasteKind === 'raw' ? '已複製內文' : '僅複製內文 HTML'}</span>
                              </button>
                              <p className="text-[10px] text-text-muted leading-snug">
                                在 Blogger 編輯器切換「HTML 檢視」後貼上。內容為 HTML+CSS；Blogger 通常會移除 script。
                              </p>
                              <a
                                href="https://www.blogger.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-accent hover:underline w-fit"
                              >
                                開啟 Blogger 後台
                                <ExternalLink size={10} />
                              </a>
                            </div>
                          ) : (
                            <span className="text-text-muted">尚未建立</span>
                          )
                        ) : loadingEstablishedLinks ? (
                          <span className="text-text-muted">讀取中...</span>
                        ) : articleUrl ? (
                          isActive ? (
                          <a
                            href={articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block max-w-[220px] truncate text-accent hover:text-accent-hover underline underline-offset-2"
                            title={articleUrl}
                          >
                            {articleUrl}
                          </a>
                          ) : (
                            <span className="text-text-muted">切換此樣式後顯示</span>
                          )
                        ) : (
                          <span className="text-text-muted">尚未建立</span>
                        )}
                      </td>
                      {platform === 'google_blogger' && (
                        <td className="px-3 py-2 align-top">
                          {loadingEstablishedLinks ? (
                            <span className="text-text-muted">讀取中...</span>
                          ) : isActive && establishedLinks.googleUrl ? (
                            <a
                              href={establishedLinks.googleUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block max-w-[220px] truncate text-accent hover:text-accent-hover underline underline-offset-2"
                              title={establishedLinks.googleUrl}
                            >
                              {establishedLinks.googleUrl}
                            </a>
                          ) : !isActive ? (
                            <span className="text-text-muted">切換此樣式後顯示</span>
                          ) : (
                            <span className="text-text-muted">尚未建立</span>
                          )}
                        </td>
                      )}
                      <PropertyBlogStyleRowActionCells
                        rowPlatform={row.platform}
                        rowStylePreset={row.stylePreset}
                        propertyId={propertyId}
                        propertyType={propertyType}
                        ownerId={ownerId}
                        referenceUrl={referenceUrl || undefined}
                        onApplyRowStyle={() => applyStyleRow(row.platform, row.stylePreset)}
                        onMutation={refreshBlogAndLinks}
                      />
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {stylePreset && referenceUrl && (
            <p className="mt-1.5 text-xs text-amber-500">⚠️ 參考 URL 優先於風格預設，設定兩者時將以參考 URL 為主。</p>
          )}
        </div>
      )}

      {/* Reference Style URL (Supabase + Google Blogger only) */}
      {showRefUrlOption && (
        <div className="border border-border-default rounded-lg overflow-hidden">
          <button
            onClick={() => setShowRefInput(!showRefInput)}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-text-secondary hover:bg-bg-tertiary transition-colors"
          >
            <Sparkles size={14} className="text-accent shrink-0" />
            <span className="font-medium">參考網頁風格（選填）</span>
            {referenceUrl && (
              <span className="ml-2 text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full shrink-0">已設定</span>
            )}
            <span className="ml-auto shrink-0">
              {showRefInput ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </span>
          </button>

          {showRefInput && (
            <div className="px-4 pb-4 pt-1 border-t border-border-default space-y-3">
              <p className="text-xs text-text-muted">
                貼上任何你喜歡的物件廣告網址（如 Wix、591、其他仲介頁面），AI 將分析其設計風格，為你的物件生成相似視覺風格的銷售頁面。
              </p>

              {referenceUrl && (
                <div className="flex items-center gap-2 px-3 py-2 bg-accent/5 border border-accent/20 rounded-lg">
                  <Link2 size={12} className="text-accent shrink-0" />
                  <span className="text-xs text-text-secondary truncate flex-1">{referenceUrl}</span>
                  <button onClick={clearReferenceUrl} className="shrink-0 p-1 rounded hover:bg-bg-tertiary transition-colors">
                    <X size={12} className="text-text-muted" />
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="url"
                  value={referenceUrlInput}
                  onChange={(e) => setReferenceUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && applyReferenceUrl()}
                  placeholder="https://a0405142777.wixsite.com/108-en-lease1"
                  className="flex-1 px-3 py-2 text-sm bg-bg-secondary border border-border-default rounded-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <button
                  onClick={applyReferenceUrl}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors"
                >
                  套用
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <p className="text-xs text-text-muted w-full">範例風格：</p>
                {[
                  { label: '豪宅暗色調（你的 Wix 頁面）', url: 'https://a0405142777.wixsite.com/108-en-lease1' },
                ].map((ex) => (
                  <button
                    key={ex.url}
                    onClick={() => {
                      setReferenceUrlInput(ex.url);
                      setReferenceUrl(ex.url);
                      replaceSearchParams((params) => {
                        params.set('blogReferenceUrl', ex.url);
                      });
                    }}
                    className="inline-flex items-center gap-1 text-xs text-text-secondary border border-border-default px-2 py-1 rounded hover:bg-bg-tertiary transition-colors"
                  >
                    <Sparkles size={10} className="text-accent" />{ex.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Platform Panel */}
      <div>
        {/* Role badge */}
        <p className="text-xs text-text-muted mb-3 flex items-center gap-1.5">
          {platform === 'supabase' ? (
            <>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">內容製作</span>
              <span>— 在此生成、編輯、發佈本站部落格文章</span>
            </>
          ) : (
            <>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-[#ea4335]/10 text-[#ea4335] font-medium">外部同步</span>
              <span>— 將本站內容推送至 Google Blogger，兩者共用同一份廣告頁</span>
            </>
          )}
        </p>

        {platform === 'supabase' && (
          <BlogSupabasePanel
            propertyId={propertyId}
            propertyType={propertyType}
            ownerId={ownerId}
            referenceUrl={referenceUrl || undefined}
            stylePreset={stylePreset}
          />
        )}
        {platform === 'google_blogger' && (
          <BlogGooglePanel
            propertyId={propertyId}
            propertyType={propertyType}
            ownerId={ownerId}
            referenceUrl={referenceUrl || undefined}
            stylePreset={stylePreset}
          />
        )}
      </div>
    </div>
  );
}
