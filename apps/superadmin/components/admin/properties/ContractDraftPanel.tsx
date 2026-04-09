'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronDown, ChevronUp, FileText, FileUp, Loader2 } from 'lucide-react';
import { AIOperationStatusPill } from '@/components/ui/AIOperationStatusPill';
import { useOperationTimer } from '@/lib/hooks/useOperationTimer';
import type { ContractDraft, SalePaymentMilestone } from '@/lib/types/contracts';
import type { PropertyItem } from '@/lib/types/properties';
import { readLocalStorage, writeLocalStorage } from '@/lib/utils/storage-state';
import { deleteCloudDraft, deleteCloudDraftById, listCloudDrafts, saveCloudDraft } from '@/lib/utils/form-draft-cloud';
import { renderContractDocumentHtml } from '@/lib/utils/contract-document-renderer';
import type { ContractTemplateId, ContractDraftFormState, DraftVersionOption, PersistedContractDraftState } from './ContractTemplateConfig';
import { ContractDraftCommissionFields } from './ContractDraftCommissionFields';
import { ContractDraftLeaseFields } from './ContractDraftLeaseFields';
import { ContractDraftSaleFields } from './ContractDraftSaleFields';
import { ContractDraftUploadPanel } from './ContractDraftUploadPanel';
import { ContractPreviewToggle } from './ContractPreviewToggle';

type PanelMode = 'ai-generate' | 'upload';

interface ContractDraftPanelProps {
  property: PropertyItem;
  templateId: ContractTemplateId;
  templateLabel: string;
  contractType: 'lease' | 'sale';
  /** Whether AI draft generation is implemented for this template (default: true) */
  aiGenerateAvailable?: boolean;
}

const STORAGE_PREFIX = 'contract-draft-preview:';
const SYNC_DEBOUNCE_MS = 900;

function formatSavedAt(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' }).format(d);
}

function buildDefaultPaymentSchedule(amount: number): SalePaymentMilestone[] {
  const earnest = Math.round(amount * 0.1);
  return [{ label: '簽約款', amount: earnest, dueDate: '' }, { label: '尾款', amount: Math.max(amount - earnest, 0), dueDate: '' }];
}

function buildInitialForm(property: PropertyItem, contractType: 'lease' | 'sale'): ContractDraftFormState {
  void contractType;
  return {
    tenantName: '', buyerName: '', agentName: '', brokerName: '', scrivenerName: '',
    deliveryCondition: '', taxAllocation: '', registrationFeeAllocation: '', brokerFeeAllocation: '',
    escrowMethod: '', occupiedByOthersCondition: '', encroachmentCondition: '', leaseBorrowCondition: '',
    copyRetentionHolder: '', defaultClauseSummary: '', contractDate: '',
    leaseStartDate: '', leaseEndDate: '',
    depositAmount: property.monthlyRent ? property.monthlyRent * 2 : 0,
    contractCopiesCount: 2, holdoverPenaltyMultiple: '', usePurpose: '',
    includedItemsInput: '', specialTerms: '',
    monthlyRent: property.monthlyRent ?? 0, paymentDueDay: 5,
    salePriceTotal: property.price ?? 0, landPrice: 0, buildingPrice: 0,
    parkingLandPrice: 0, parkingBuildingPrice: 0, handoverDate: '', ownershipTransferDate: '',
    paymentSchedule: buildDefaultPaymentSchedule(property.price ?? 0),
    // Commission fields
    commissionPrincipalName: '', commissionBrokerageName: '',
    commissionType: '', commissionRatePercent: 0, commissionFixedFee: 0,
    commissionStartDate: '', commissionEndDate: '',
    commissionListingPrice: property.price ?? 0, commissionFloorPrice: 0,
    commissionMarketingMethods: '', commissionSpecialTerms: '',
  };
}

export function ContractDraftPanel({ property, templateId, templateLabel, contractType, aiGenerateAvailable = true }: ContractDraftPanelProps) {
  const storageKey = `${STORAGE_PREFIX}${property.id}:${templateId}`;
  const cloudFormKey = storageKey;
  const initialForm = useMemo(() => buildInitialForm(property, contractType), [property, contractType]);

  const hasHydratedRef = useRef(false);
  const skipPersistRef = useRef(false);
  const cloudDraftIdRef = useRef<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPropertyIdRef = useRef(property.id);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>(aiGenerateAvailable ? 'ai-generate' : 'upload');
  const [form, setForm] = useState<ContractDraftFormState>(initialForm);
  const [draft, setDraft] = useState<ContractDraft | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<'idle' | 'loading' | 'saved' | 'error'>('loading');
  const [cloudSyncMessage, setCloudSyncMessage] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [draftVersions, setDraftVersions] = useState<DraftVersionOption[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [newVersionName, setNewVersionName] = useState('');
  const [editedHtml, setEditedHtml] = useState<string | null>(null);

  const {
    elapsedSeconds: generateElapsedSeconds,
    lastDurationSeconds: generateDurationSeconds,
    reset: resetGenerateTimer,
  } = useOperationTimer(status === 'loading', { precisionDecimals: 1, tickMs: 100 });

  const previewHtml = useMemo(() => (draft ? renderContractDocumentHtml(draft) : ''), [draft]);

  function setField<K extends keyof ContractDraftFormState>(key: K, value: ContractDraftFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSalePriceTotalChange(value: number) {
    setForm(prev => ({ ...prev, salePriceTotal: value, paymentSchedule: buildDefaultPaymentSchedule(value) }));
  }

  function updatePaymentSchedule(index: number, field: keyof SalePaymentMilestone, value: string) {
    setForm(prev => ({
      ...prev,
      paymentSchedule: prev.paymentSchedule.map((item, i) =>
        i !== index ? item : field === 'amount' ? { ...item, amount: Number(value || 0) } : { ...item, [field]: value },
      ),
    }));
  }

  // Hydrate from cloud/local on mount or property change
  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (lastPropertyIdRef.current !== property.id) { hasHydratedRef.current = false; lastPropertyIdRef.current = property.id; }
      if (hasHydratedRef.current) return;
      try {
        const local = readLocalStorage<PersistedContractDraftState | null>(storageKey, null);
        const localForm: ContractDraftFormState = { ...initialForm, ...(local?.form ?? {}), paymentSchedule: Array.isArray(local?.form?.paymentSchedule) ? local!.form.paymentSchedule : initialForm.paymentSchedule };
        const cloudDrafts = await listCloudDrafts<PersistedContractDraftState>({ formKey: cloudFormKey, limit: 20 });
        if (cancelled) return;
        setDraftVersions(cloudDrafts.map(d => ({ id: d.id, name: d.name, updatedAt: d.updatedAt })));
        const latest = cloudDrafts[0];
        if (latest) {
          const cloudForm: ContractDraftFormState = { ...initialForm, ...(latest.data.form ?? {}), paymentSchedule: Array.isArray(latest.data.form?.paymentSchedule) ? latest.data.form.paymentSchedule : initialForm.paymentSchedule };
          skipPersistRef.current = true;
          cloudDraftIdRef.current = latest.id;
          setForm(cloudForm); setDraft(latest.data.generatedDraft as ContractDraft ?? null);
          setEditedHtml((latest.data.editedHtml as string) ?? null);
          setStatus(latest.data.generatedDraft ? 'success' : 'idle');
          setLastSavedAt(latest.updatedAt); setSelectedVersionId(latest.id); setCloudSyncState('saved');
        } else if (local?.form) {
          skipPersistRef.current = true;
          setForm(localForm);
          setDraft(local.generatedDraft as ContractDraft ?? null);
          setEditedHtml((local as PersistedContractDraftState).editedHtml ?? null);
          setStatus(local.generatedDraft ? 'success' : 'idle');
          const saved = await saveCloudDraft({ formKey: cloudFormKey, name: `${property.title}-${templateLabel}草稿`, data: { form: localForm, generatedDraft: local.generatedDraft ?? null, editedHtml: (local as PersistedContractDraftState).editedHtml ?? null } });
          if (cancelled) return;
          cloudDraftIdRef.current = saved.id; setLastSavedAt(saved.updatedAt); setSelectedVersionId(saved.id);
          setDraftVersions([{ id: saved.id, name: saved.name, updatedAt: saved.updatedAt }]);
          setCloudSyncState('saved'); setCloudSyncMessage('已將本機草稿同步到雲端帳號。');
        } else { setCloudSyncState('idle'); }
      } catch { if (!cancelled) { setCloudSyncState('error'); setCloudSyncMessage('雲端草稿載入失敗，使用本機備援。'); } }
      finally { if (!cancelled) hasHydratedRef.current = true; }
    }
    void hydrate();
    return () => { cancelled = true; };
  }, [cloudFormKey, initialForm, property.id, storageKey, property.title, templateLabel]);

  // Persist to local + debounced cloud sync on form/draft change
  useEffect(() => {
    if (!hasHydratedRef.current) return;
    if (skipPersistRef.current) { skipPersistRef.current = false; return; }
    writeLocalStorage(storageKey, { form, generatedDraft: draft, editedHtml });
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    setCloudSyncState('loading'); setCloudSyncMessage(null);
    syncTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          const saved = await saveCloudDraft({ formKey: cloudFormKey, name: `${property.title}-${templateLabel}草稿`, data: { form, generatedDraft: draft, editedHtml }, draftId: cloudDraftIdRef.current });
          cloudDraftIdRef.current = saved.id; setLastSavedAt(saved.updatedAt); setSelectedVersionId(saved.id);
          setDraftVersions(prev => [{ id: saved.id, name: saved.name, updatedAt: saved.updatedAt }, ...prev.filter(v => v.id !== saved.id)]);
          setCloudSyncState('saved');
        } catch { setCloudSyncState('error'); setCloudSyncMessage('雲端同步失敗，已備援至本機快取。'); }
      })();
    }, SYNC_DEBOUNCE_MS);
    return () => { if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; } };
  }, [cloudFormKey, draft, editedHtml, form, property.title, storageKey, templateLabel]);

  useEffect(() => () => { if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); }, []);

  async function handleClearDraft() {
    skipPersistRef.current = true;
    if (syncTimeoutRef.current) { clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = null; }
    setForm(initialForm); setDraft(null); setEditedHtml(null); setStatus('idle'); setErrorMessage(null); setCloudSyncMessage(null); setLastSavedAt(null);
    if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey);
    try {
      await deleteCloudDraft({ formKey: cloudFormKey, draftId: cloudDraftIdRef.current });
      cloudDraftIdRef.current = null; setDraftVersions([]); setSelectedVersionId(''); setCloudSyncState('idle');
    } catch (e) { setCloudSyncState('error'); setCloudSyncMessage(e instanceof Error ? e.message : '清除失敗'); }
  }

  async function handleGenerateDraft() {
    resetGenerateTimer();
    setStatus('loading'); setErrorMessage(null);
    const parsedIncludedItems = form.includedItemsInput.split(/[\n,，]/).map(s => s.trim()).filter(Boolean);
    const payload = contractType === 'lease'
      ? { contractType, propertyId: property.id, tenantName: form.tenantName, leaseStartDate: form.leaseStartDate, leaseEndDate: form.leaseEndDate, depositAmount: form.depositAmount, contractCopiesCount: form.contractCopiesCount, holdoverPenaltyMultiple: form.holdoverPenaltyMultiple === '' ? undefined : form.holdoverPenaltyMultiple, monthlyRent: form.monthlyRent, paymentDueDay: form.paymentDueDay, contractDate: form.contractDate, usePurpose: form.usePurpose === '' ? undefined : form.usePurpose, includedItems: parsedIncludedItems.length > 0 ? parsedIncludedItems : undefined, specialTerms: form.specialTerms }
      : { contractType, propertyId: property.id, buyerName: form.buyerName, agentName: form.agentName, brokerName: form.brokerName, scrivenerName: form.scrivenerName, deliveryCondition: form.deliveryCondition, taxAllocation: form.taxAllocation, registrationFeeAllocation: form.registrationFeeAllocation, brokerFeeAllocation: form.brokerFeeAllocation, escrowMethod: form.escrowMethod, occupiedByOthersCondition: form.occupiedByOthersCondition, encroachmentCondition: form.encroachmentCondition, leaseBorrowCondition: form.leaseBorrowCondition, copyRetentionHolder: form.copyRetentionHolder, defaultClauseSummary: form.defaultClauseSummary, salePriceTotal: form.salePriceTotal, landPrice: form.landPrice, buildingPrice: form.buildingPrice, parkingLandPrice: form.parkingLandPrice, parkingBuildingPrice: form.parkingBuildingPrice, paymentSchedule: form.paymentSchedule, handoverDate: form.handoverDate, ownershipTransferDate: form.ownershipTransferDate, contractDate: form.contractDate };
    try {
      const res = await fetch('/api/contracts/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body.error || '產生失敗');
      setDraft(body.draft as ContractDraft); setEditedHtml(null); setStatus('success');
      writeLocalStorage(storageKey, { form, generatedDraft: body.draft, editedHtml: null });
    } catch (e) { setStatus('error'); setErrorMessage(e instanceof Error ? e.message : '產生契約草稿失敗'); }
  }

  async function handleCreateVersionSnapshot() {
    setCloudSyncState('loading'); setCloudSyncMessage(null);
    try {
      const ts = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
      const name = newVersionName.trim() || `${property.title}-${templateLabel}（${ts}）`;
      const saved = await saveCloudDraft({ formKey: cloudFormKey, name, data: { form, generatedDraft: draft } });
      cloudDraftIdRef.current = saved.id; setLastSavedAt(saved.updatedAt); setSelectedVersionId(saved.id);
      setDraftVersions(prev => [{ id: saved.id, name: saved.name, updatedAt: saved.updatedAt }, ...prev.filter(v => v.id !== saved.id)]);
      setCloudSyncState('saved'); setCloudSyncMessage('已建立新版本。'); setNewVersionName('');
    } catch (e) { setCloudSyncState('error'); setCloudSyncMessage(e instanceof Error ? e.message : '建立版本失敗'); }
  }

  async function handleSwitchVersion(versionId: string) {
    if (!versionId) return;
    setSelectedVersionId(versionId); setCloudSyncState('loading'); setCloudSyncMessage(null);
    try {
      const list = await listCloudDrafts<PersistedContractDraftState>({ formKey: cloudFormKey, limit: 20 });
      const target = list.find(d => d.id === versionId);
      if (!target) throw new Error('找不到指定版本');
      const nextForm: ContractDraftFormState = { ...initialForm, ...(target.data.form ?? {}), paymentSchedule: Array.isArray(target.data.form?.paymentSchedule) ? target.data.form.paymentSchedule : initialForm.paymentSchedule };
      skipPersistRef.current = true; cloudDraftIdRef.current = target.id;
      setForm(nextForm); setDraft(target.data.generatedDraft as ContractDraft ?? null);
      setEditedHtml((target.data.editedHtml as string) ?? null);
      setStatus(target.data.generatedDraft ? 'success' : 'idle'); setLastSavedAt(target.updatedAt);
      writeLocalStorage(storageKey, { form: nextForm, generatedDraft: target.data.generatedDraft ?? null, editedHtml: (target.data.editedHtml as string) ?? null });
      setCloudSyncState('saved');
    } catch (e) { setCloudSyncState('error'); setCloudSyncMessage(e instanceof Error ? e.message : '切換版本失敗'); }
  }

  async function handleDeleteVersion() {
    if (!selectedVersionId) return;
    setCloudSyncState('loading'); setCloudSyncMessage(null);
    try {
      await deleteCloudDraftById(selectedVersionId);
      const next = draftVersions.filter(v => v.id !== selectedVersionId);
      setDraftVersions(next);
      if (next.length === 0) { cloudDraftIdRef.current = null; setSelectedVersionId(''); setCloudSyncState('idle'); setCloudSyncMessage('已刪除，雲端目前無可用版本。'); }
      else { await handleSwitchVersion(next[0].id); setCloudSyncMessage('已刪除，並切換至最新版本。'); }
    } catch (e) { setCloudSyncState('error'); setCloudSyncMessage(e instanceof Error ? e.message : '刪除版本失敗'); }
  }

  const syncLabel = cloudSyncState === 'loading' ? '同步中...' : cloudSyncState === 'saved' ? `已儲存${formatSavedAt(lastSavedAt) ? `：${formatSavedAt(lastSavedAt)}` : ''}` : cloudSyncState === 'idle' ? '尚未建立雲端草稿' : `同步失敗${cloudSyncMessage ? `：${cloudSyncMessage}` : ''}`;
  const canGenerate = status !== 'loading' && !(contractType === 'sale' && !property.buildingTranscript && !property.landTranscript);

  return (
    <section className="rounded-2xl border border-border-default bg-bg-primary overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-5 cursor-pointer select-none" onClick={() => setIsCollapsed(c => !c)}>
        <div>
          <div className="flex items-center gap-2 text-text-primary">
            <FileText className="h-5 w-5 text-accent" />
            <h4 className="text-base font-semibold">{templateLabel}</h4>
            {status === 'success' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">已產生草稿</span>}
          </div>
          <p className="mt-0.5 text-xs text-text-muted">{syncLabel}</p>
          {cloudSyncMessage && cloudSyncState !== 'error' && <p className="text-xs text-accent mt-0.5">{cloudSyncMessage}</p>}
        </div>
        {isCollapsed ? <ChevronDown className="h-5 w-5 text-text-muted shrink-0" /> : <ChevronUp className="h-5 w-5 text-text-muted shrink-0" />}
      </div>

      {!isCollapsed && (
        <div className="border-t border-border-default p-5 space-y-5">
          {/* Mode selector */}
          <div className="flex gap-2 rounded-xl bg-bg-secondary/50 p-1.5">
            <button
              type="button"
              onClick={() => aiGenerateAvailable && setPanelMode('ai-generate')}
              disabled={!aiGenerateAvailable}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                !aiGenerateAvailable
                  ? 'opacity-50 cursor-not-allowed text-text-muted'
                  : panelMode === 'ai-generate'
                    ? 'bg-bg-primary text-accent shadow-sm'
                    : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              <Bot className="h-4 w-4" />
              AI 套版生成
              {!aiGenerateAvailable && <span className="text-xs">（開發中）</span>}
            </button>
            <button
              type="button"
              onClick={() => setPanelMode('upload')}
              className={[
                'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                panelMode === 'upload'
                  ? 'bg-bg-primary text-accent shadow-sm'
                  : 'text-text-secondary hover:text-text-primary',
              ].join(' ')}
            >
              <FileUp className="h-4 w-4" />
              自行上傳合約
            </button>
          </div>

          {/* Upload mode */}
          {panelMode === 'upload' && (
            <ContractDraftUploadPanel
              property={property}
              contractType={contractType}
              templateId={templateId}
              templateLabel={templateLabel}
            />
          )}

          {/* AI generate mode */}
          {panelMode === 'ai-generate' && (
            <>
          {/* Contract date (shared for both types) */}
          <div className="max-w-xs space-y-1">
            <label htmlFor={`contractDate-${templateId}`} className="text-sm font-medium text-text-secondary">契約日期</label>
            <input id={`contractDate-${templateId}`} type="date" value={form.contractDate} onChange={(e) => setField('contractDate', e.target.value)} className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
          </div>

          {/* Commission fields for commission templates */}
          {(templateId === 'commission-lease' || templateId === 'commission-sale') && (
            <ContractDraftCommissionFields form={form} setField={setField} commissionFor={contractType} />
          )}

          {/* Standard lease/sale fields */}
          {templateId !== 'commission-lease' && templateId !== 'commission-sale' && (
            contractType === 'lease'
              ? <ContractDraftLeaseFields form={form} setField={setField} />
              : <ContractDraftSaleFields form={form} setField={setField} onSalePriceTotalChange={handleSalePriceTotalChange} onUpdatePaymentSchedule={updatePaymentSchedule} />
          )}

          {contractType === 'sale' && !property.buildingTranscript && !property.landTranscript && (
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 p-3 text-sm text-amber-700">⚠ 此物件尚未上傳謄本，買賣契約草稿無法產生。請先至「謄本資料」標籤上傳。</div>
          )}

          {/* Generate / Clear */}
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={() => { void handleGenerateDraft(); }} disabled={!canGenerate} className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
              {status === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              產生草稿預覽
            </button>
            <button type="button" onClick={() => { void handleClearDraft(); }} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-4 py-2 text-sm font-medium text-text-primary">清除草稿</button>
            <AIOperationStatusPill
              status={status === 'loading' ? 'running' : status === 'success' ? 'success' : status === 'error' ? 'error' : 'idle'}
              elapsedSeconds={generateElapsedSeconds}
              summary={
                status === 'loading' || status === 'idle'
                  ? null
                  : {
                      durationSeconds: generateDurationSeconds,
                    }
              }
              runningLabel="AI 正在生成草稿"
              successLabel="草稿已生成"
              errorLabel="草稿生成失敗"
            />
            {errorMessage && <span className="text-sm text-red-500">{errorMessage}</span>}
          </div>

          {/* Version selector */}
          <div className="rounded-xl border border-border-default bg-bg-secondary/30 p-4 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="space-y-1">
                <label htmlFor={`draftVersion-${templateId}`} className="text-sm font-medium text-text-secondary">草稿版本</label>
                <select id={`draftVersion-${templateId}`} value={selectedVersionId} onChange={(e) => { void handleSwitchVersion(e.target.value); }} className="min-w-[260px] rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary">
                  <option value="" disabled>{draftVersions.length > 0 ? '選擇版本' : '尚無雲端版本'}</option>
                  {draftVersions.map(v => <option key={v.id} value={v.id}>{v.name} · {formatSavedAt(v.updatedAt) ?? v.updatedAt}</option>)}
                </select>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" value={newVersionName} onChange={(e) => setNewVersionName(e.target.value)} placeholder="可選：版本名稱" aria-label="版本名稱" className="min-w-[180px] rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary" />
                <button type="button" onClick={() => { void handleCreateVersionSnapshot(); }} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary">另存新版本</button>
                <button type="button" onClick={() => { void handleDeleteVersion(); }} disabled={!selectedVersionId} className="inline-flex items-center gap-2 rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm font-medium text-text-primary disabled:opacity-60">刪除版本</button>
              </div>
            </div>
          </div>

          {/* Preview / Edit */}
          {draft && (
            <ContractPreviewToggle
              draft={draft}
              previewHtml={previewHtml}
              editedHtml={editedHtml}
              onEditedHtmlChange={setEditedHtml}
              onError={setErrorMessage}
            />
          )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
