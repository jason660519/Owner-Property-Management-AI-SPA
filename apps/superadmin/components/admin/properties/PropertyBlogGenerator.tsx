'use client';

import { useState } from 'react';
import { Database, Globe, Link2, X, ChevronDown, ChevronUp, Sparkles, Palette } from 'lucide-react';
import type { StylePreset } from '@/lib/actions/blog';

// Inline Facebook SVG to avoid lucide-react deprecation warning
function FbIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
import { BlogSupabasePanel } from './BlogSupabasePanel';
import { BlogGooglePanel } from './BlogGooglePanel';
import { BlogFacebookPanel } from './BlogFacebookPanel';

type Platform = 'supabase' | 'google_blogger' | 'facebook';

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
  {
    id: 'facebook',
    label: 'Facebook 粉絲頁',
    icon: <FbIcon size={15} />,
    desc: '發布至 Facebook 粉絲頁，觸及台灣最大社群流量',
  },
];

const STYLE_PRESETS: { id: StylePreset; label: string; emoji: string; desc: string }[] = [
  { id: 'luxury_dark', label: '豪宅暗色調', emoji: '🌃', desc: '深色背景、金色點綴、高端奢華感' },
  { id: 'bright_clean', label: '清爽明亮', emoji: '☀️', desc: '白底藍色系、現代感、清晰易讀' },
  { id: 'corporate', label: '商務簡潔', emoji: '🏢', desc: '深藍白色、結構嚴謹、商業不動產' },
  { id: 'warm_japanese', label: '溫馨日系', emoji: '🌿', desc: '米色系、日式極簡、居家溫暖感' },
];

export function PropertyBlogGenerator({ propertyId, propertyType, ownerId }: PropertyBlogGeneratorProps) {
  const [platform, setPlatform] = useState<Platform>('supabase');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceUrlInput, setReferenceUrlInput] = useState('');
  const [showRefInput, setShowRefInput] = useState(false);
  const [stylePreset, setStylePreset] = useState<StylePreset | undefined>(undefined);

  function applyReferenceUrl() {
    const trimmed = referenceUrlInput.trim();
    if (!trimmed) { setReferenceUrl(''); return; }
    // Basic URL validation
    try {
      new URL(trimmed);
      setReferenceUrl(trimmed);
    } catch {
      setReferenceUrl('');
    }
  }

  function clearReferenceUrl() {
    setReferenceUrl('');
    setReferenceUrlInput('');
  }

  const showRefUrlOption = platform === 'supabase' || platform === 'google_blogger';

  return (
    <div className="space-y-5">
      {/* Platform Selector */}
      <div>
        <p className="text-xs text-text-muted mb-2 font-medium uppercase tracking-wide">發布平台</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPlatform(p.id)}
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

      {/* Style Preset Selector (Supabase + Google Blogger only) */}
      {showRefUrlOption && (
        <div>
          <p className="text-xs text-text-muted mb-2 font-medium flex items-center gap-1.5">
            <Palette size={13} className="text-accent" />
            <span>風格預設（選填）</span>
            {stylePreset && (
              <button onClick={() => setStylePreset(undefined)} className="ml-auto text-xs text-text-muted hover:text-text-secondary flex items-center gap-0.5">
                <X size={11} />清除
              </button>
            )}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STYLE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setStylePreset(stylePreset === p.id ? undefined : p.id)}
                className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-center transition-all ${
                  stylePreset === p.id
                    ? 'border-accent bg-accent/5 shadow-sm'
                    : 'border-border-default hover:border-border-hover hover:bg-bg-tertiary'
                }`}
              >
                <span className="text-lg leading-none">{p.emoji}</span>
                <span className={`text-xs font-medium leading-tight ${stylePreset === p.id ? 'text-accent' : 'text-text-primary'}`}>{p.label}</span>
                <span className="text-[10px] text-text-muted leading-tight">{p.desc}</span>
              </button>
            ))}
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
                    onClick={() => { setReferenceUrlInput(ex.url); setReferenceUrl(ex.url); }}
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
        {platform === 'facebook' && (
          <BlogFacebookPanel
            propertyId={propertyId}
            propertyType={propertyType}
            ownerId={ownerId}
          />
        )}
      </div>
    </div>
  );
}
