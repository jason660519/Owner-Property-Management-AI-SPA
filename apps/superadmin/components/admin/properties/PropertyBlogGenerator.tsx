'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Database,
  ExternalLink,
  FileCode,
  Globe,
  Palette,
  Sparkles,
  X,
} from 'lucide-react';

import { AIOperationStatusPill } from '@/components/ui/AIOperationStatusPill';
import { useOperationTimer } from '@/lib/hooks/useOperationTimer';
import type { BlogPost, BlogTargetPlatform, StylePreset } from '@/lib/actions/blog';
import { generatePropertyBlog, getPropertyBlogVariants } from '@/lib/actions/blog';
import { getPlatformPost } from '@/lib/actions/integrations';
import type { PropertyItem } from '@/lib/types/properties';
import type {
  AdvertisementBuilderDraftData,
  AdvertisementBuilderPlatform,
  AdvertisementSectionId,
  AdvertisementStyleMode,
} from '@/lib/types/advertisement';
import {
  buildPropertyAdvertisementReadiness,
  getDefaultSelectedAdvertisementSectionIds,
} from '@/lib/utils/property-advertisement-readiness';
import { wrapForBlogger } from '@/lib/utils/blogger-wrapped-html';
import { loadLatestCloudDraft, saveCloudDraft } from '@/lib/utils/form-draft-cloud';
import {
  PROPERTY_BLOG_UPDATED_EVENT,
  type PropertyBlogUpdatedDetail,
} from '@/lib/utils/property-blog-events';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';

import { AdvertisementPresetGallery } from './AdvertisementPresetGallery';
import { AdvertisementReadinessSummary } from './AdvertisementReadinessSummary';
import { AdvertisementReferenceUrlInput } from './AdvertisementReferenceUrlInput';
import { AdvertisementSectionSelector } from './AdvertisementSectionSelector';
import { AdvertisementStyleModeSwitch } from './AdvertisementStyleModeSwitch';
import { BlogGooglePanel } from './BlogGooglePanel';
import { BlogSupabasePanel } from './BlogSupabasePanel';
import { PropertyAdvertisementBuilder } from './PropertyAdvertisementBuilder';
import { PropertyBlogStyleRowActionCells } from './PropertyBlogStyleRowActionCells';

type Platform = 'supabase' | 'google_blogger';

const BUILDER_DRAFT_STORAGE_PREFIX = 'property-advertisement-builder:';
const BUILDER_DRAFT_SYNC_DEBOUNCE_MS = 900;

interface PropertyBlogGeneratorProps {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  property?: PropertyItem;
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

function isPlatform(value: string | null): value is Platform {
  return value === 'supabase' || value === 'google_blogger';
}

function isStylePreset(value: string | null): value is StylePreset {
  return value === 'luxury_dark'
    || value === 'bright_clean'
    || value === 'corporate'
    || value === 'warm_japanese';
}

function platformToTarget(platform: Platform): BlogTargetPlatform {
  return platform === 'supabase' ? 'local' : 'google_blogger';
}

function toDraftPlatform(value: AdvertisementBuilderPlatform | Platform): Platform {
  return value === 'google_blogger' ? 'google_blogger' : 'supabase';
}

function sanitizeDraftSectionIds(
  sectionIds: AdvertisementSectionId[] | undefined,
  readinessSections: ReturnType<typeof buildPropertyAdvertisementReadiness>,
): AdvertisementSectionId[] {
  if (!sectionIds?.length) {
    return getDefaultSelectedAdvertisementSectionIds(readinessSections);
  }

  const availableSectionIds = new Set(
    readinessSections
      .filter((section) => section.status !== 'unavailable')
      .map((section) => section.id),
  );
  const filtered = sectionIds.filter((sectionId) => availableSectionIds.has(sectionId));

  return filtered.length > 0
    ? filtered
    : getDefaultSelectedAdvertisementSectionIds(readinessSections);
}

function buildBuilderDraftData(params: {
  platform: Platform;
  styleMode: AdvertisementStyleMode;
  stylePreset?: StylePreset;
  referenceUrl: string;
  selectedSectionIds: AdvertisementSectionId[];
}): AdvertisementBuilderDraftData {
  return {
    platform: params.platform,
    styleMode: params.styleMode,
    stylePreset: params.stylePreset,
    referenceUrl: params.referenceUrl,
    selectedSectionIds: params.selectedSectionIds,
  };
}

export function PropertyBlogGenerator({ propertyId, propertyType, ownerId, property }: PropertyBlogGeneratorProps) {
  const builderDraftStorageKey = `${BUILDER_DRAFT_STORAGE_PREFIX}${propertyId}`;
  const readinessSections = useMemo(
    () => buildPropertyAdvertisementReadiness(property),
    [property],
  );
  const readinessSectionMap = useMemo(
    () => new Map(readinessSections.map((section) => [section.id, section])),
    [readinessSections],
  );
  const [platform, setPlatform] = useState<Platform>('supabase');
  const [styleMode, setStyleMode] = useState<AdvertisementStyleMode>('preset');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [referenceUrlInput, setReferenceUrlInput] = useState('');
  const [stylePreset, setStylePreset] = useState<StylePreset | undefined>(undefined);
  const [selectedSectionIds, setSelectedSectionIds] = useState<AdvertisementSectionId[]>(
    getDefaultSelectedAdvertisementSectionIds(readinessSections),
  );
  const [variants, setVariants] = useState<Record<StylePreset, BlogPost | null>>({
    luxury_dark: null,
    bright_clean: null,
    corporate: null,
    warm_japanese: null,
  });
  const [loadingVariants, setLoadingVariants] = useState(true);
  const [establishedLinks, setEstablishedLinks] = useState<{ localUrl: string | null; googleUrl: string | null }>({
    localUrl: null,
    googleUrl: null,
  });
  const [copyPasteKind, setCopyPasteKind] = useState<'wrapped' | 'raw' | null>(null);
  const [draftFeedback, setDraftFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [draftSummary, setDraftSummary] = useState<{ selectedSectionIds: AdvertisementSectionId[] } | null>(null);
  const [isBuilderHydrated, setIsBuilderHydrated] = useState(false);
  const [isGeneratingDraft, startGenerateDraftTransition] = useTransition();
  const [draftOperationStatus, setDraftOperationStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const { elapsedSeconds: draftElapsedSeconds, lastDurationSeconds: draftDurationSeconds, reset: resetDraftTimer } = useOperationTimer(
    isGeneratingDraft,
    { precisionDecimals: 1, tickMs: 100 },
  );
  const hasHydratedBuilderDraftRef = useRef(false);
  const skipBuilderDraftPersistRef = useRef(false);
  const builderDraftCloudIdRef = useRef<string | null>(null);
  const builderDraftSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveStylePreset = styleMode === 'reference'
    ? (stylePreset ?? 'luxury_dark')
    : stylePreset;

  const activeBlog = effectiveStylePreset ? variants[effectiveStylePreset] : null;

  const selectedStyleLabel = stylePreset
    ? STYLE_PRESETS.find((preset) => preset.id === stylePreset)?.label ?? '已選擇樣式'
    : referenceUrl
      ? '參考網址風格'
      : '尚未指定樣式';

  const platformLabel = PLATFORMS.find((item) => item.id === platform)?.label ?? '地端 Supabase';
  const canGenerateDraft = selectedSectionIds.length > 0 && (
    (styleMode === 'preset' && Boolean(stylePreset))
      || (styleMode === 'reference' && Boolean(referenceUrl))
  );
  const builderDraftData = useMemo(
    () => buildBuilderDraftData({
      platform,
      styleMode,
      stylePreset,
      referenceUrl,
      selectedSectionIds,
    }),
    [platform, referenceUrl, selectedSectionIds, styleMode, stylePreset],
  );

  const replaceSearchParams = useCallback((mutate: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(window.location.search);
    mutate(params);
    const query = params.toString();
    window.history.replaceState(null, '', query ? `?${query}` : window.location.pathname);
  }, []);

  const refreshVariants = useCallback(async () => {
    setLoadingVariants(true);
    try {
      const data = await getPropertyBlogVariants(
        propertyId,
        platformToTarget(platform),
        referenceUrl || undefined,
      );
      setVariants(data);
    } finally {
      setLoadingVariants(false);
    }
  }, [platform, propertyId, referenceUrl]);

  const refreshLinks = useCallback(async () => {
    if (!activeBlog) {
      setEstablishedLinks({ localUrl: null, googleUrl: null });
      return;
    }

    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
    const localUrl = `${webUrl}/blog/${activeBlog.slug}`;
    const googlePost = await getPlatformPost(activeBlog.id, 'google_blogger');
    const googleUrl = googlePost?.external_url ?? null;
    setEstablishedLinks({ localUrl, googleUrl });
  }, [activeBlog]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateBuilderDraft() {
      if (hasHydratedBuilderDraftRef.current) {
        setIsBuilderHydrated(true);
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const searchPlatform = params.get('blogPlatform');
      const searchStylePreset = params.get('blogStylePreset');
      const searchReferenceUrl = params.get('blogReferenceUrl');
      const localDraft = readLocalStorage<AdvertisementBuilderDraftData | null>(
        builderDraftStorageKey,
        null,
      );

      let cloudDraft: Awaited<ReturnType<typeof loadLatestCloudDraft<AdvertisementBuilderDraftData>>> = null;

      try {
        cloudDraft = await loadLatestCloudDraft<AdvertisementBuilderDraftData>(builderDraftStorageKey);
      } catch {
        cloudDraft = null;
      }

      if (cancelled) {
        return;
      }

      const savedDraft = cloudDraft?.data ?? localDraft;
      let nextPlatform: Platform = toDraftPlatform(savedDraft?.platform ?? 'supabase');
      let nextStyleMode: AdvertisementStyleMode = savedDraft?.styleMode === 'reference' ? 'reference' : 'preset';
      let nextStylePreset: StylePreset | undefined = isStylePreset(savedDraft?.stylePreset ?? null)
        ? savedDraft?.stylePreset
        : undefined;
      let nextReferenceUrl = savedDraft?.referenceUrl?.trim() ?? '';
      const nextSelectedSectionIds = sanitizeDraftSectionIds(savedDraft?.selectedSectionIds, readinessSections);

      if (isPlatform(searchPlatform)) {
        nextPlatform = searchPlatform;
      }

      if (searchReferenceUrl) {
        nextStyleMode = 'reference';
        nextReferenceUrl = searchReferenceUrl;
        if (isStylePreset(searchStylePreset)) {
          nextStylePreset = searchStylePreset;
        }
      } else if (isStylePreset(searchStylePreset)) {
        nextStyleMode = 'preset';
        nextStylePreset = searchStylePreset;
        nextReferenceUrl = '';
      }

      builderDraftCloudIdRef.current = cloudDraft?.id ?? null;
      skipBuilderDraftPersistRef.current = true;
      hasHydratedBuilderDraftRef.current = true;
      setPlatform(nextPlatform);
      setStyleMode(nextStyleMode);
      setStylePreset(nextStylePreset);
      setReferenceUrl(nextStyleMode === 'reference' ? nextReferenceUrl : '');
      setReferenceUrlInput(nextStyleMode === 'reference' ? nextReferenceUrl : '');
      setSelectedSectionIds(nextSelectedSectionIds);
      setIsBuilderHydrated(true);

      replaceSearchParams((nextParams) => {
        nextParams.set('blogPlatform', nextPlatform);

        if (nextStyleMode === 'reference' && nextReferenceUrl) {
          nextParams.set('blogReferenceUrl', nextReferenceUrl);
          nextParams.delete('blogStylePreset');
          return;
        }

        nextParams.delete('blogReferenceUrl');

        if (nextStyleMode === 'preset' && nextStylePreset) {
          nextParams.set('blogStylePreset', nextStylePreset);
        } else {
          nextParams.delete('blogStylePreset');
        }
      });
    }

    void hydrateBuilderDraft();

    return () => {
      cancelled = true;
    };
  }, [builderDraftStorageKey, readinessSections, replaceSearchParams]);

  useEffect(() => {
    if (!isBuilderHydrated) {
      return;
    }

    void refreshVariants();
  }, [isBuilderHydrated, refreshVariants]);

  useEffect(() => {
    void refreshLinks();
  }, [refreshLinks]);

  useEffect(() => {
    const selectedIds = activeBlog?.generationContext?.selectedSectionIds;

    if (selectedIds?.length) {
      setDraftSummary({ selectedSectionIds: selectedIds });
      return;
    }

    setDraftSummary(null);
  }, [activeBlog]);

  useEffect(() => {
    setSelectedSectionIds((currentValue) => {
      const availableSectionIds = new Set(
        readinessSections
          .filter((section) => section.status !== 'unavailable')
          .map((section) => section.id),
      );
      const preserved = currentValue.filter((sectionId) => availableSectionIds.has(sectionId));

      if (preserved.length > 0) {
        return preserved;
      }

      return getDefaultSelectedAdvertisementSectionIds(readinessSections);
    });
  }, [readinessSections]);

  useEffect(() => {
    if (!isBuilderHydrated) {
      return;
    }

    if (skipBuilderDraftPersistRef.current) {
      skipBuilderDraftPersistRef.current = false;
      return;
    }

    writeLocalStorage(builderDraftStorageKey, builderDraftData);

    if (builderDraftSyncTimeoutRef.current) {
      clearTimeout(builderDraftSyncTimeoutRef.current);
    }

    builderDraftSyncTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          const saved = await saveCloudDraft<AdvertisementBuilderDraftData>({
            formKey: builderDraftStorageKey,
            name: `${property?.title ?? propertyId}-廣告 builder 草稿`,
            data: builderDraftData,
            draftId: builderDraftCloudIdRef.current,
          });

          builderDraftCloudIdRef.current = saved.id;
        } catch {
          // Keep local draft as fallback when cloud sync fails.
        }
      })();
    }, BUILDER_DRAFT_SYNC_DEBOUNCE_MS);

    return () => {
      if (builderDraftSyncTimeoutRef.current) {
        clearTimeout(builderDraftSyncTimeoutRef.current);
        builderDraftSyncTimeoutRef.current = null;
      }
    };
  }, [builderDraftData, builderDraftStorageKey, isBuilderHydrated, property?.title, propertyId]);

  useEffect(() => () => {
    if (builderDraftSyncTimeoutRef.current) {
      clearTimeout(builderDraftSyncTimeoutRef.current);
      builderDraftSyncTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    function onPropertyBlogUpdated(event: Event) {
      const detail = (event as CustomEvent<PropertyBlogUpdatedDetail>).detail;
      if (detail?.propertyId === propertyId) {
        void refreshVariants();
      }
    }

    window.addEventListener(PROPERTY_BLOG_UPDATED_EVENT, onPropertyBlogUpdated);
    return () => window.removeEventListener(PROPERTY_BLOG_UPDATED_EVENT, onPropertyBlogUpdated);
  }, [propertyId, refreshVariants]);

  async function copyBloggerHtml(kind: 'wrapped' | 'raw') {
    if (!activeBlog?.contentHtml) return;

    try {
      const html = kind === 'wrapped'
        ? wrapForBlogger(activeBlog.title, activeBlog.contentHtml)
        : activeBlog.contentHtml;
      await navigator.clipboard.writeText(html);
      setCopyPasteKind(kind);
      setTimeout(() => setCopyPasteKind(null), 2000);
    } catch {
      // Ignore clipboard failures in browser-restricted contexts.
    }
  }

  function applyStyleRow(targetPlatform: Platform, targetStylePreset: StylePreset) {
    setPlatform(targetPlatform);
    setStyleMode('preset');
    setStylePreset(targetStylePreset);
    setReferenceUrl('');
    setReferenceUrlInput('');

    const params = new URLSearchParams(window.location.search);
    params.set('blogPlatform', targetPlatform);
    params.set('blogStylePreset', targetStylePreset);
    params.delete('blogReferenceUrl');
    window.history.replaceState(null, '', `?${params.toString()}`);
  }

  function applyReferenceUrl() {
    const trimmed = referenceUrlInput.trim();
    if (!trimmed) {
      clearReferenceUrl();
      return;
    }

    try {
      new URL(trimmed);
      setStyleMode('reference');
      setReferenceUrl(trimmed);
      setStylePreset(undefined);
      replaceSearchParams((params) => {
        params.set('blogReferenceUrl', trimmed);
        params.delete('blogStylePreset');
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

  function handleStyleModeChange(nextStyleMode: AdvertisementStyleMode) {
    setStyleMode(nextStyleMode);

    if (nextStyleMode === 'preset') {
      clearReferenceUrl();
      return;
    }

    setStylePreset(undefined);
    replaceSearchParams((params) => {
      params.delete('blogStylePreset');
    });
  }

  function handleSelectPreset(nextStylePreset: StylePreset) {
    setStyleMode('preset');
    setStylePreset(nextStylePreset);
    setReferenceUrl('');
    setReferenceUrlInput('');
    replaceSearchParams((params) => {
      params.set('blogPlatform', platform);
      params.set('blogStylePreset', nextStylePreset);
      params.delete('blogReferenceUrl');
    });
  }

  function handleToggleSection(sectionId: AdvertisementSectionId) {
    setSelectedSectionIds((currentValue) => (
      currentValue.includes(sectionId)
        ? currentValue.filter((value) => value !== sectionId)
        : [...currentValue, sectionId]
    ));
  }

  function handleGenerateDraft() {
    if (!canGenerateDraft || !effectiveStylePreset) return;

    setDraftFeedback(null);
    setDraftSummary(null);
    setDraftOperationStatus('idle');
    resetDraftTimer();
    startGenerateDraftTransition(async () => {
      const result = await generatePropertyBlog(propertyId, propertyType, ownerId, {
        referenceUrl: referenceUrl || undefined,
        selectedSectionIds,
        stylePreset: effectiveStylePreset,
        targetPlatform: platformToTarget(platform),
        language,
      });

      if (!result.success) {
        setDraftOperationStatus('error');
        setDraftFeedback({
          type: 'error',
          message: result.message || '生成廣告草稿失敗，請稍後再試。',
        });
        return;
      }

      await refreshVariants();
      setDraftOperationStatus('success');
      setDraftSummary({
        selectedSectionIds: result.generationContext?.selectedSectionIds ?? selectedSectionIds,
      });
      setDraftFeedback({
        type: 'success',
        message: '廣告草稿已生成，請繼續在下方檢查預覽與輸出方式。',
      });
    });
  }

  return (
    <PropertyAdvertisementBuilder
      propertyType={propertyType}
      selectedStyleLabel={selectedStyleLabel}
      platformLabel={platformLabel}
      hasReferenceUrl={Boolean(referenceUrl)}
      selectedSectionCount={selectedSectionIds.length}
      sectionSelectionContent={(
        <div className="space-y-4">
          <AdvertisementReadinessSummary sections={readinessSections} />
          <AdvertisementSectionSelector
            sections={readinessSections}
            selectedSectionIds={selectedSectionIds}
            onToggleSection={handleToggleSection}
          />
        </div>
      )}
      styleSelectionContent={(
        <div className="space-y-5">
          <AdvertisementStyleModeSwitch styleMode={styleMode} onChange={handleStyleModeChange} />

          {styleMode === 'preset' ? (
            <div className="space-y-4">
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-text-muted">
                  <Palette size={13} className="text-accent" />
                  <span>{STYLE_PRESETS.length} 種廣告樣式</span>
                  {stylePreset && (
                    <button
                      onClick={() => {
                        setStylePreset(undefined);
                        replaceSearchParams((params) => {
                          params.delete('blogStylePreset');
                        });
                      }}
                      className="ml-auto flex items-center gap-0.5 text-xs text-text-muted hover:text-text-secondary"
                    >
                      <X size={11} />清除
                    </button>
                  )}
                </p>
                <AdvertisementPresetGallery
                  presets={STYLE_PRESETS}
                  selectedPreset={stylePreset}
                  onSelectPreset={handleSelectPreset}
                />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border-default">
              <table className={`w-full text-xs ${platform === 'google_blogger' ? 'min-w-[1480px]' : 'min-w-[1300px]'}`}>
                <thead className="bg-bg-tertiary text-text-secondary">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">風格選擇</th>
                    <th className="px-3 py-2 text-left font-medium">說明</th>
                    <th className="px-3 py-2 text-left font-medium">狀態</th>
                    <th className="px-3 py-2 text-left font-medium whitespace-normal max-w-[200px]">
                      {platform === 'google_blogger' ? '生成 Google Blogger 頁面' : '生成地端廣告頁面'}
                    </th>
                    <th className="px-3 py-2 text-left font-medium max-w-[260px]">
                      {platform === 'google_blogger' ? '複製貼上（HTML）' : '本站預覽連結'}
                    </th>
                    {platform === 'google_blogger' && <th className="px-3 py-2 text-left font-medium">Blogger 已發佈網址</th>}
                    <th className="max-w-[72px] border-l border-border-default/60 px-2 py-2 text-center font-medium whitespace-normal">編輯</th>
                    <th className="max-w-[72px] px-2 py-2 text-center font-medium whitespace-normal">同步聯絡方式</th>
                    <th className="max-w-[72px] px-2 py-2 text-center font-medium whitespace-normal">重新生成</th>
                    <th className="max-w-[72px] px-2 py-2 text-center font-medium whitespace-normal" title="已發佈時為下架；草稿時為發佈">下架</th>
                    <th className="max-w-[72px] px-2 py-2 text-center font-medium whitespace-normal">刪除</th>
                  </tr>
                </thead>
                <tbody>
                  {STYLE_PRESETS.map((preset, index) => {
                    const isActive = stylePreset === preset.id;
                    const rowBlog = variants[preset.id];
                    const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000';
                    const localUrl = rowBlog ? `${webUrl}/blog/${rowBlog.slug}` : null;
                    const showBloggerPasteUi = platform === 'google_blogger' && isActive && Boolean(activeBlog?.contentHtml);

                    return (
                      <tr key={preset.id} className={`border-t border-border-default ${isActive ? 'bg-accent/10' : 'bg-bg-secondary'}`}>
                        <td className="px-3 py-2 text-text-muted">{index + 1}</td>
                        <td className="px-3 py-2 text-text-primary">
                          <span className="inline-flex items-center gap-1.5">
                            <span>{preset.emoji}</span>
                            <span>{preset.label}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-text-muted">{preset.desc}</td>
                        <td className="px-3 py-2">
                          {loadingVariants ? (
                            <span className="text-text-muted">讀取中...</span>
                          ) : rowBlog ? (
                            <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${rowBlog.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}`}>
                              {rowBlog.status === 'published' ? '已發佈' : '草稿'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted">未建立</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => applyStyleRow(platform, preset.id)}
                            className={`inline-flex items-center rounded border px-2 py-1 transition-colors ${isActive ? 'border-accent bg-accent/10 text-accent' : 'border-border-default text-text-secondary hover:bg-bg-tertiary'}`}
                          >
                            {isActive ? '已套用' : '套用此樣式'}
                          </button>
                        </td>
                        <td className="px-3 py-2 align-top">
                          {platform === 'google_blogger' ? (
                            showBloggerPasteUi ? (
                              <div className="flex max-w-[260px] flex-col gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void copyBloggerHtml('wrapped')}
                                  className="inline-flex items-start gap-1.5 text-left text-xs text-accent underline underline-offset-2 hover:text-accent-hover"
                                >
                                  {copyPasteKind === 'wrapped' ? <Check size={12} className="mt-0.5 shrink-0 text-green-500" /> : <Copy size={12} className="mt-0.5 shrink-0" />}
                                  <span>{copyPasteKind === 'wrapped' ? '已複製（含外層樣式）' : '複製貼上用 HTML（含外層樣式）'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void copyBloggerHtml('raw')}
                                  className="inline-flex items-start gap-1.5 text-left text-xs text-text-secondary hover:text-text-primary"
                                >
                                  {copyPasteKind === 'raw' ? <Check size={12} className="mt-0.5 shrink-0 text-green-500" /> : <FileCode size={12} className="mt-0.5 shrink-0" />}
                                  <span>{copyPasteKind === 'raw' ? '已複製內文' : '僅複製內文 HTML'}</span>
                                </button>
                                <a href="https://www.blogger.com" target="_blank" rel="noopener noreferrer" className="inline-flex w-fit items-center gap-1 text-xs text-accent hover:underline">
                                  開啟 Blogger 後台
                                  <ExternalLink size={10} />
                                </a>
                              </div>
                            ) : rowBlog && !isActive ? (
                              <span className="text-[10px] text-text-muted">套用此樣式後顯示</span>
                            ) : (
                              <span className="text-[10px] text-text-muted">尚未建立</span>
                            )
                          ) : localUrl ? (
                            <a href={localUrl} target="_blank" rel="noopener noreferrer" className="inline-block max-w-[220px] truncate text-accent underline underline-offset-2 hover:text-accent-hover" title={localUrl}>
                              {localUrl}
                            </a>
                          ) : (
                            <span className="text-[10px] text-text-muted">尚未建立</span>
                          )}
                        </td>
                        {platform === 'google_blogger' && (
                          <td className="px-3 py-2 align-top">
                            {isActive && establishedLinks.googleUrl ? (
                              <a href={establishedLinks.googleUrl} target="_blank" rel="noopener noreferrer" className="inline-block max-w-[220px] truncate text-accent underline underline-offset-2 hover:text-accent-hover" title={establishedLinks.googleUrl}>
                                {establishedLinks.googleUrl}
                              </a>
                            ) : rowBlog && !isActive ? (
                              <span className="text-[10px] text-text-muted">套用此樣式後顯示</span>
                            ) : (
                              <span className="text-[10px] text-text-muted">尚未建立</span>
                            )}
                          </td>
                        )}
                        <PropertyBlogStyleRowActionCells
                          rowPlatform={platform}
                          rowStylePreset={preset.id}
                          propertyId={propertyId}
                          propertyType={propertyType}
                          ownerId={ownerId}
                          referenceUrl={referenceUrl || undefined}
                          blog={rowBlog}
                          loading={loadingVariants}
                          onApplyRowStyle={() => applyStyleRow(platform, preset.id)}
                          onMutation={refreshVariants}
                        />
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </div>
          ) : (
            <AdvertisementReferenceUrlInput
              referenceUrl={referenceUrl}
              referenceUrlInput={referenceUrlInput}
              onInputChange={setReferenceUrlInput}
              onApply={applyReferenceUrl}
              onClear={clearReferenceUrl}
            />
          )}
        </div>
      )}
      draftGenerationContent={(
        <div className="rounded-xl border border-dashed border-border-default bg-bg-primary p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">單一 Generate Draft 入口已接上既有生成流程</p>
                <p className="mt-1 text-xs leading-5 text-text-muted">目前會沿用既有 blog variant 生成能力來建立草稿，並同步保存本次內容組合摘要，方便重新整理後延續同一份編輯脈絡。</p>
              </div>

              {draftSummary && (
                <div className="rounded-lg border border-border-default bg-bg-secondary px-3 py-3">
                  <p className="text-xs font-medium text-text-primary">本次草稿帶入內容</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draftSummary.selectedSectionIds.map((sectionId) => {
                      const section = readinessSectionMap.get(sectionId);

                      return (
                        <span
                          key={sectionId}
                          className="inline-flex items-center rounded-full border border-accent/20 bg-accent/10 px-2.5 py-1 text-[11px] text-accent"
                        >
                          {section?.title ?? sectionId}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {draftFeedback && (
                <div className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs ${draftFeedback.type === 'success' ? 'border border-green-500/20 bg-green-500/10 text-green-700' : 'border border-red-500/20 bg-red-500/10 text-red-700'}`}>
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <span>{draftFeedback.message}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col items-stretch gap-3 lg:min-w-[280px]">
              <div className="rounded-lg bg-bg-secondary px-4 py-3 text-xs text-text-secondary">目前焦點：{selectedStyleLabel} / {platformLabel}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted shrink-0">文案語言</span>
                <div className="inline-flex rounded-full border border-border-default bg-bg-secondary p-0.5">
                  {(['zh', 'en'] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${language === lang ? 'bg-accent text-white' : 'text-text-muted hover:text-text-primary'}`}
                    >
                      {lang === 'zh' ? '繁體中文' : 'English'}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateDraft}
                disabled={!canGenerateDraft || isGeneratingDraft}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGeneratingDraft ? <Sparkles size={16} className="animate-pulse" /> : <Sparkles size={16} />}
                {isGeneratingDraft ? '生成中...' : '生成廣告草稿'}
              </button>
              <div className="flex justify-center lg:justify-end">
                <AIOperationStatusPill
                  status={isGeneratingDraft ? 'running' : draftOperationStatus}
                  elapsedSeconds={draftElapsedSeconds}
                  summary={
                    isGeneratingDraft || draftOperationStatus === 'idle'
                      ? null
                      : {
                          durationSeconds: draftDurationSeconds,
                        }
                  }
                  runningLabel="AI 正在生成草稿"
                  successLabel="草稿已生成"
                  errorLabel="草稿生成失敗"
                />
              </div>
              <p className="text-[11px] leading-5 text-text-muted">
                {canGenerateDraft
                  ? `將使用${selectedSectionIds.length}個內容區塊與目前風格設定建立草稿。`
                  : '請先完成內容區塊與風格設定，才能開始生成草稿。'}
              </p>
            </div>
          </div>
        </div>
      )}
      exportContent={(
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">發布平台</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PLATFORMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setPlatform(item.id);
                    replaceSearchParams((params) => {
                      params.set('blogPlatform', item.id);
                    });
                  }}
                  className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all ${platform === item.id ? 'border-accent bg-accent/5 shadow-sm' : 'border-border-default hover:border-border-hover hover:bg-bg-tertiary'}`}
                >
                  <span className={`mt-0.5 shrink-0 ${platform === item.id ? 'text-accent' : 'text-text-muted'}`}>{item.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium leading-tight ${platform === item.id ? 'text-accent' : 'text-text-primary'}`}>{item.label}</p>
                    <p className="mt-0.5 text-xs leading-snug text-text-muted">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-1.5 text-xs text-text-muted">
              {platform === 'supabase' ? (
                <>
                  <span className="inline-flex items-center rounded bg-accent/10 px-2 py-0.5 font-medium text-accent">內容製作</span>
                  <span>— 在此生成、編輯、發佈本站部落格文章</span>
                </>
              ) : (
                <>
                  <span className="inline-flex items-center rounded bg-accent/10 px-2 py-0.5 font-medium text-accent">Google Blogger</span>
                  <span>— 在此生成、同步、發佈至 Blogger</span>
                </>
              )}
            </p>

            {platform === 'supabase' ? (
              <BlogSupabasePanel
                propertyId={propertyId}
                blog={activeBlog}
                loading={loadingVariants}
                onMutation={refreshVariants}
              />
            ) : (
              <BlogGooglePanel
                propertyId={propertyId}
                blog={activeBlog}
                loading={loadingVariants}
                stylePreset={stylePreset}
                referenceUrl={referenceUrl || undefined}
                onMutation={refreshVariants}
              />
            )}
          </div>
        </div>
      )}
    />
  );
}
