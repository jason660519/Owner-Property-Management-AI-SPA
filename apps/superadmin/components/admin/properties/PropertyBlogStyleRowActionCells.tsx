'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Contact,
  Globe,
  GlobeLock,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
  X,
} from 'lucide-react';
import {
  deletePropertyBlog,
  generatePropertyBlog,
  getPropertyBlog,
  publishPropertyBlog,
  syncBlogCTA,
  unpublishPropertyBlog,
  type BlogPost,
  type StylePreset,
} from '@/lib/actions/blog';
import {
  PROPERTY_BLOG_UPDATED_EVENT,
  type PropertyBlogUpdatedDetail,
  dispatchPropertyBlogUpdated,
} from '@/lib/utils/property-blog-events';
import { dispatchBlogSupabaseOpenEdit } from '@/lib/utils/blog-supabase-ui-events';

type RowPlatform = 'supabase' | 'google_blogger';

export interface PropertyBlogStyleRowActionCellsProps {
  rowPlatform: RowPlatform;
  rowStylePreset: StylePreset;
  propertyId: string;
  propertyType: 'sale' | 'rental';
  ownerId: string;
  referenceUrl?: string;
  onApplyRowStyle: () => void;
  onMutation: () => void;
}

export function PropertyBlogStyleRowActionCells({
  rowPlatform,
  rowStylePreset,
  propertyId,
  propertyType,
  ownerId,
  referenceUrl,
  onApplyRowStyle,
  onMutation,
}: PropertyBlogStyleRowActionCellsProps) {
  const [blog, setBlog] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const targetPlatform = rowPlatform === 'supabase' ? 'local' : 'google_blogger';

  const loadBlog = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPropertyBlog(propertyId, {
        stylePreset: rowStylePreset,
        targetPlatform,
        referenceUrl,
      });
      setBlog(data);
    } catch {
      console.error('[BlogVariantRowActions] Failed to load blog');
    } finally {
      setLoading(false);
    }
  }, [propertyId, referenceUrl, rowStylePreset, targetPlatform]);

  useEffect(() => {
    void loadBlog();
  }, [loadBlog]);

  useEffect(() => {
    function onUpdated(e: Event) {
      const detail = (e as CustomEvent<PropertyBlogUpdatedDetail>).detail;
      if (detail?.propertyId !== propertyId) return;
      void loadBlog();
    }

    window.addEventListener(PROPERTY_BLOG_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(PROPERTY_BLOG_UPDATED_EVENT, onUpdated);
  }, [loadBlog, propertyId]);

  function notify() {
    dispatchPropertyBlogUpdated(propertyId);
    onMutation();
  }

  function handleEdit() {
    onApplyRowStyle();
    const el = document.getElementById(rowPlatform === 'supabase' ? 'property-blog-supabase-panel' : 'property-blog-google-panel');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (rowPlatform === 'supabase') {
      dispatchBlogSupabaseOpenEdit(propertyId, rowStylePreset);
    }
  }

  function handleSyncContact() {
    if (!blog) return;
    onApplyRowStyle();
    setConfirmRegenerate(false);
    setConfirmDelete(false);
    startSyncTransition(async () => {
      const result = await syncBlogCTA(blog.id);
      if (result.success) notify();
      else {
        window.alert(result.message || '同步失敗');
      }
    });
  }

  function handleRegenerateClick() {
    onApplyRowStyle();
    if (blog?.status === 'published' && !confirmRegenerate) {
      setConfirmRegenerate(true);
      setTimeout(() => setConfirmRegenerate(false), 5000);
      return;
    }
    setConfirmRegenerate(false);
    startTransition(async () => {
      const result = await generatePropertyBlog(propertyId, propertyType, ownerId, {
        referenceUrl,
        stylePreset: rowStylePreset,
        targetPlatform,
      });
      if (result.success) notify();
      else {
        window.alert(result.message || '重新生成失敗');
      }
    });
  }

  function handleUnpublish() {
    if (!blog || blog.status !== 'published') return;
    onApplyRowStyle();
    startTransition(async () => {
      const result = await unpublishPropertyBlog(blog.id);
      if (result.success) notify();
      else {
        window.alert(result.message || '下架失敗');
      }
    });
  }

  function handleDeleteClick() {
    if (!blog) return;
    onApplyRowStyle();
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    setConfirmDelete(false);
    startTransition(async () => {
      const result = await deletePropertyBlog(blog.id);
      if (result.success) notify();
      else {
        window.alert(result.message || '刪除失敗');
      }
    });
  }

  const disabledBase = !blog || loading || isPending || isSyncing;
  const syncDisabled = loading || isPending || isSyncing;
  const regenDisabled = loading || isPending || isSyncing;
  const unpublishDisabled = disabledBase || blog.status !== 'published';
  const deleteDisabled = loading || isPending || isSyncing || !blog;

  const btnBase =
    'inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors disabled:opacity-40 disabled:pointer-events-none leading-tight';
  const btnNeutral = `${btnBase} border border-border-default text-text-secondary hover:bg-bg-tertiary`;
  const btnUnpublish = `${btnBase} text-yellow-600 border border-yellow-500/30 hover:bg-yellow-500/10`;
  const btnDelete = confirmDelete
    ? `${btnBase} bg-red-500 text-white`
    : `${btnBase} text-red-500 border border-red-500/30 hover:bg-red-500/10`;

  return (
    <>
      <td className="px-1 py-2 align-middle text-center border-l border-border-default/60">
        <button
          type="button"
          title="編輯標題／摘要（套用此列風格）"
          disabled={disabledBase}
          onClick={handleEdit}
          className={btnNeutral}
        >
          <Pencil size={12} className="shrink-0" />
          <span className="hidden xl:inline">編輯</span>
        </button>
      </td>
      <td className="px-1 py-2 align-middle text-center">
        <button
          type="button"
          title="同步聯絡方式至內文 CTA（套用此列風格）"
          disabled={!blog || syncDisabled}
          onClick={handleSyncContact}
          className={btnNeutral}
        >
          {isSyncing ? <Loader2 size={12} className="animate-spin shrink-0" /> : <Contact size={12} className="shrink-0" />}
          <span className="hidden xl:inline">同步</span>
        </button>
      </td>
      <td className="px-1 py-2 align-middle text-center min-w-[100px]">
        {confirmRegenerate ? (
          <div className="flex flex-col items-stretch gap-1">
            <span className="text-[9px] text-yellow-600 flex items-center justify-center gap-0.5">
              <AlertTriangle size={10} />
              覆蓋已發佈
            </span>
            <div className="flex items-center justify-center gap-0.5">
              <button
                type="button"
                title="確認重新生成"
                disabled={regenDisabled}
                onClick={handleRegenerateClick}
                className={`${btnBase} bg-yellow-500 text-white hover:bg-yellow-600`}
              >
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              </button>
              <button
                type="button"
                title="取消"
                className="p-1 rounded hover:bg-bg-tertiary text-text-muted"
                onClick={() => setConfirmRegenerate(false)}
              >
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            title="以此風格重新生成頁面"
            disabled={regenDisabled}
            onClick={handleRegenerateClick}
            className={btnNeutral}
          >
            {isPending ? <Loader2 size={12} className="animate-spin shrink-0" /> : <RefreshCw size={12} className="shrink-0" />}
            <span className="hidden xl:inline">重生</span>
          </button>
        )}
      </td>
      <td className="px-1 py-2 align-middle text-center">
        {blog?.status === 'published' ? (
          <button
            type="button"
            title="改為草稿（下架公開頁）"
            disabled={unpublishDisabled}
            onClick={handleUnpublish}
            className={btnUnpublish}
          >
            <GlobeLock size={12} className="shrink-0" />
            <span className="hidden xl:inline">下架</span>
          </button>
        ) : (
          <button
            type="button"
            title="發佈至公開網址"
            disabled={disabledBase}
            onClick={() => {
              if (!blog) return;
              onApplyRowStyle();
              startTransition(async () => {
                const result = await publishPropertyBlog(blog.id);
                if (result.success) notify();
                else {
                  window.alert(result.message || '發佈失敗');
                }
              });
            }}
            className={`${btnBase} text-green-600 border border-green-500/30 hover:bg-green-500/10`}
          >
            <Globe size={12} className="shrink-0" />
            <span className="hidden xl:inline">發佈</span>
          </button>
        )}
      </td>
      <td className="px-1 py-2 align-middle text-center">
        <button
          type="button"
          title={confirmDelete ? '再次點擊確認刪除' : '刪除此物件廣告頁'}
          disabled={deleteDisabled}
          onClick={handleDeleteClick}
          className={btnDelete}
        >
          <Trash2 size={12} className="shrink-0" />
          <span className="hidden xl:inline">{confirmDelete ? '確認' : '刪除'}</span>
        </button>
      </td>
    </>
  );
}
