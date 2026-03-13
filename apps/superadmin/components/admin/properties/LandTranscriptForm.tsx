// filepath: apps/superadmin/components/admin/properties/LandTranscriptForm.tsx
// created: 2026-03-05 | creator: Claude
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { savePropertyTranscriptData } from '@/lib/actions/properties';
import type {
  LandTranscriptData,
  LandDescription,
  TranscriptHeader,
  LandOwnershipRecord,
  EncumbranceRecord,
} from '@/lib/types/properties';

const iCls =
  'w-full border border-border-default rounded-md px-2 py-1.5 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent';
const lCls = 'block text-xs text-text-muted mb-0.5';

function FI({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <p className={lCls}>{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? label} className={iCls} />
    </div>
  );
}

function FTA({ label, value, onChange, rows = 2 }: {
  label: string; value: string; onChange: (v: string) => void; rows?: number;
}) {
  return (
    <div>
      <p className={lCls}>{label}</p>
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} className={`${iCls} resize-y`} />
    </div>
  );
}

function newId() {
  return typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36);
}

function emptyHeader(): TranscriptHeader {
  return {
    transcriptType: '', documentTitle: '', printTime: '', pageInfo: '',
    printer: '', checkNumber: '', documentNumber: '',
    dataJurisdiction: '', issuingAuthority: '', transcriptNotes: '',
  };
}

function emptyDescription(): LandDescription {
  return {
    landNumber: '', regDate: '', regReason: '', landCategory: '',
    grade: '', area: '', useZone: '', useCategory: '',
    announcedValueYear: '', announcedValuePerSqm: '',
    buildingsOnLand: '', notes: '',
  };
}

function emptyOwnership(): LandOwnershipRecord {
  return {
    id: newId(), seq: '', regDate: '', regReason: '', causeDate: '',
    ownerName: '', ownerAddress: '', ownershipRatio: '', titleNumber: '',
    relatedEncumbranceSeq: '', notes: '',
    currentDeclaredLandValueYear: '', currentDeclaredLandValuePerSqm: '',
    prevTransferValueYear: '', prevTransferValuePerSqm: '',
    historicalRatios: '',
  };
}

function emptyEncumbrance(): EncumbranceRecord {
  return {
    id: newId(), seq: '', encumbranceType: '抵押權', receiptDate: '',
    receiptNumber: '', regDate: '', regReason: '設定', creditorName: '',
    creditorAddress: '', debtRatio: '全部 1分之1', totalDebt: '',
    duration: '', repaymentDate: '依照各個契約約定',
    interest: '依照各個契約約定', lateInterest: '依照各個契約約定',
    penalty: '依照各個契約約定', debtorAndRatio: '', rightsSubject: '所有權',
    targetSeq: '', settleRightsRatio: '', certNumber: '', settlor: '',
    jointGuaranteeLandNumbers: '', jointGuaranteeBuildingNumbers: '', notes: '',
    debtScope: '', debtConfirmDate: '', otherGuaranteeScope: '',
  };
}

interface Props {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  initialData?: LandTranscriptData | null;
  /** When set, fill form from this parsed transcript (after user clicks 謄寫). Cleared by parent after apply. */
  fillFromParsedTranscript?: LandTranscriptData | null;
  /** Called after form has applied fillFromParsedTranscript so parent can clear it */
  onTranscribeApplied?: () => void;
}

export function LandTranscriptForm({
  propertyId,
  propertyType,
  initialData,
  fillFromParsedTranscript,
  onTranscribeApplied,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [header, setHeader] = useState<TranscriptHeader>(initialData?.header ?? emptyHeader());
  const [desc, setDesc] = useState<LandDescription>(initialData?.description ?? emptyDescription());
  const [ownership, setOwnership] = useState<LandOwnershipRecord[]>(initialData?.ownership ?? []);
  const [encumbrances, setEncumbrances] = useState<EncumbranceRecord[]>(initialData?.encumbrances ?? []);

  useEffect(() => {
    if (!fillFromParsedTranscript) return;
    try {
      setHeader(fillFromParsedTranscript.header ?? emptyHeader());
      setDesc(fillFromParsedTranscript.description ?? emptyDescription());
      setOwnership(
        (fillFromParsedTranscript.ownership?.length ?? 0) > 0
          ? fillFromParsedTranscript.ownership
          : [emptyOwnership()],
      );
      setEncumbrances(
        (fillFromParsedTranscript.encumbrances?.length ?? 0) > 0
          ? fillFromParsedTranscript.encumbrances
          : encumbrances.length > 0
            ? encumbrances
            : [emptyEncumbrance()],
      );
    } finally {
      onTranscribeApplied?.();
    }
  }, [fillFromParsedTranscript, onTranscribeApplied, encumbrances.length]);

  function uh<K extends keyof TranscriptHeader>(key: K, val: TranscriptHeader[K]) {
    setHeader((h) => ({ ...h, [key]: val }));
  }
  function ud<K extends keyof LandDescription>(key: K, val: LandDescription[K]) {
    setDesc((d) => ({ ...d, [key]: val }));
  }
  function uo(id: string, key: keyof LandOwnershipRecord, val: string) {
    setOwnership((list) => list.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  }
  function ue(id: string, key: keyof EncumbranceRecord, val: string) {
    setEncumbrances((list) => list.map((r) => (r.id === id ? { ...r, [key]: val } : r)));
  }

  function handleSave() {
    setFeedback(null);
    startTransition(async () => {
      const result = await savePropertyTranscriptData(propertyId, propertyType, {
        landTranscript: { header, description: desc, ownership, encumbrances },
      });
      setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    });
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`p-3 rounded-lg text-sm ${
          feedback.type === 'success'
            ? 'bg-green-500/10 text-green-500 border border-green-500/20'
            : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {feedback.message}
        </div>
      )}

      <div className="space-y-8">
        {/* ── 土地謄本詳細資料（封面） ── */}
        <section className="space-y-4">
          <FI
            label="謄本名稱與種類"
            value={header.transcriptType}
            onChange={(v) => uh('transcriptType', v)}
            placeholder="土地登記第二類謄本（土地標示部及所有權部）"
          />
          <FI
            label="地號（完整）"
            value={header.documentTitle}
            onChange={(v) => uh('documentTitle', v)}
            placeholder="大安區 懷生段四小段 003836-0000地號"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FI
              label="列印時間"
              value={header.printTime}
              onChange={(v) => uh('printTime', v)}
              placeholder="民國100年02月18日15時53分"
            />
            <FI
              label="頁字／頁次"
              value={header.pageInfo}
              onChange={(v) => uh('pageInfo', v)}
              placeholder="頁次：1"
            />
          </div>
          <FI
            label="謄本列印人"
            value={header.printer}
            onChange={(v) => uh('printer', v)}
            placeholder="願景不動產仲介股份有限公司"
          />
          <FI
            label="謄本檢查號"
            value={header.checkNumber}
            onChange={(v) => uh('checkNumber', v)}
            placeholder="100AF001281REG..."
          />
          <FI
            label="謄本字第號"
            value={header.documentNumber}
            onChange={(v) => uh('documentNumber', v)}
            placeholder="大安電謄字第001281號"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FI
              label="資料管轄機關"
              value={header.dataJurisdiction}
              onChange={(v) => uh('dataJurisdiction', v)}
              placeholder="臺北市大安地政事務所"
            />
            <FI
              label="謄本核發機關"
              value={header.issuingAuthority}
              onChange={(v) => uh('issuingAuthority', v)}
              placeholder="臺北市大安地政事務所"
            />
          </div>
        </section>

        {/* ── 土地標示部 ── */}
        <section className="space-y-4 border-t border-border-default pt-4">
          <p className="text-sm font-mono text-center text-text-primary mb-2">
            ************** 土地標示部 ****************
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FI
              label="地號"
              value={desc.landNumber}
              onChange={(v) => ud('landNumber', v)}
              placeholder="003836-0000"
            />
            <FI
              label="登記日期"
              value={desc.regDate}
              onChange={(v) => ud('regDate', v)}
              placeholder="民國XXX年XX月XX日"
            />
            <FI
              label="登記原因"
              value={desc.regReason}
              onChange={(v) => ud('regReason', v)}
              placeholder="地籍圖重測"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FI
              label="地目"
              value={desc.landCategory}
              onChange={(v) => ud('landCategory', v)}
              placeholder="建（地）"
            />
            <FI label="等則" value={desc.grade} onChange={(v) => ud('grade', v)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FI
              label="面積 (m²)"
              value={desc.area}
              onChange={(v) => ud('area', v)}
              placeholder="154.24"
            />
            <FI
              label="使用分區"
              value={desc.useZone}
              onChange={(v) => ud('useZone', v)}
              placeholder="住宅區"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FI
              label="使用地類別"
              value={desc.useCategory}
              onChange={(v) => ud('useCategory', v)}
              placeholder="乙種建築用地"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FI
              label="公告土地現值（年期）"
              value={desc.announcedValueYear}
              onChange={(v) => ud('announcedValueYear', v)}
              placeholder="民國112年01月"
            />
            <FI
              label="公告土地現值（元/m²）"
              value={desc.announcedValuePerSqm}
              onChange={(v) => ud('announcedValuePerSqm', v)}
              placeholder="770000"
            />
          </div>
          <FI
            label="地上建物建號"
            value={desc.buildingsOnLand}
            onChange={(v) => ud('buildingsOnLand', v)}
            placeholder="01659-000"
          />
          <FTA
            label="其他登記事項"
            value={desc.notes}
            onChange={(v) => ud('notes', v)}
            rows={3}
          />
        </section>

        {/* ── 土地所有權部 ── */}
        <section className="space-y-4 border-t border-border-default pt-4">
          <p className="text-sm font-mono text-center text-text-primary mb-2">
            ************** 土地所有權部 **************
          </p>
          {ownership.map((owner, i) => (
            <div key={owner.id} className="border border-border-default rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">
                  （{String(i + 1).padStart(4, '0')}）所有權人
                </p>
                <button
                  type="button"
                  onClick={() => setOwnership((list) => list.filter((r) => r.id !== owner.id))}
                  className="p-1 text-text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FI
                  label="登記次序"
                  value={owner.seq}
                  onChange={(v) => uo(owner.id, 'seq', v)}
                  placeholder="0002"
                />
                <FI
                  label="登記日期"
                  value={owner.regDate}
                  onChange={(v) => uo(owner.id, 'regDate', v)}
                  placeholder="民國098年10月28日"
                />
                <FI
                  label="登記原因"
                  value={owner.regReason}
                  onChange={(v) => uo(owner.id, 'regReason', v)}
                  placeholder="買賣"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="原因發生日期"
                  value={owner.causeDate}
                  onChange={(v) => uo(owner.id, 'causeDate', v)}
                  placeholder="民國098年10月02日"
                />
                <FI
                  label="所有權人"
                  value={owner.ownerName}
                  onChange={(v) => uo(owner.id, 'ownerName', v)}
                />
              </div>
              <FI
                label="住址"
                value={owner.ownerAddress}
                onChange={(v) => uo(owner.id, 'ownerAddress', v)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="權利範圍"
                  value={owner.ownershipRatio}
                  onChange={(v) => uo(owner.id, 'ownershipRatio', v)}
                  placeholder="10分之1"
                />
                <FI
                  label="權狀字號"
                  value={owner.titleNumber}
                  onChange={(v) => uo(owner.id, 'titleNumber', v)}
                  placeholder="099北大字第012501號"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="相關他項權利登記次序"
                  value={owner.relatedEncumbranceSeq}
                  onChange={(v) => uo(owner.id, 'relatedEncumbranceSeq', v)}
                  placeholder="0009-000"
                />
                <FI
                  label="歷次取得權利範圍"
                  value={owner.historicalRatios}
                  onChange={(v) => uo(owner.id, 'historicalRatios', v)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="當期申報地價（年期）"
                  value={owner.currentDeclaredLandValueYear}
                  onChange={(v) => uo(owner.id, 'currentDeclaredLandValueYear', v)}
                  placeholder="民國112年"
                />
                <FI
                  label="當期申報地價（元/m²）"
                  value={owner.currentDeclaredLandValuePerSqm}
                  onChange={(v) => uo(owner.id, 'currentDeclaredLandValuePerSqm', v)}
                  placeholder="560000"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="前次移轉現值（年期）"
                  value={owner.prevTransferValueYear}
                  onChange={(v) => uo(owner.id, 'prevTransferValueYear', v)}
                  placeholder="民國098年"
                />
                <FI
                  label="前次移轉現值（元/m²）"
                  value={owner.prevTransferValuePerSqm}
                  onChange={(v) => uo(owner.id, 'prevTransferValuePerSqm', v)}
                  placeholder="560000"
                />
              </div>
              <FTA
                label="其他登記事項"
                value={owner.notes}
                onChange={(v) => uo(owner.id, 'notes', v)}
                rows={2}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setOwnership((list) => [...list, emptyOwnership()])}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border-default rounded-lg text-sm text-text-secondary hover:border-accent hover:text-accent transition-colors"
          >
            <Plus size={14} /> 新增所有權人
          </button>
        </section>

        {/* ── 土地他項權利部 ── */}
        <section className="space-y-4 border-t border-border-default pt-4">
          <p className="text-sm font-mono text-center text-text-primary mb-2">
            ************** 土地他項權利部 *************
          </p>
          {encumbrances.map((enc, i) => (
            <div key={enc.id} className="border border-border-default rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-text-primary">
                  （{String(i + 1).padStart(4, '0')}）他項權利
                </p>
                <button
                  type="button"
                  onClick={() => setEncumbrances((list) => list.filter((r) => r.id !== enc.id))}
                  className="p-1 text-text-muted hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="登記次序"
                  value={enc.seq}
                  onChange={(v) => ue(enc.id, 'seq', v)}
                  placeholder="0009-000"
                />
                <FI
                  label="權利種類"
                  value={enc.encumbranceType}
                  onChange={(v) => ue(enc.id, 'encumbranceType', v)}
                  placeholder="抵押權"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="收件日期"
                  value={enc.receiptDate}
                  onChange={(v) => ue(enc.id, 'receiptDate', v)}
                  placeholder="民國091年07月04日"
                />
                <FI
                  label="字號"
                  value={enc.receiptNumber}
                  onChange={(v) => ue(enc.id, 'receiptNumber', v)}
                  placeholder="大安字第193180號"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="登記日期"
                  value={enc.regDate}
                  onChange={(v) => ue(enc.id, 'regDate', v)}
                  placeholder="民國091年07月04日"
                />
                <FI
                  label="登記原因"
                  value={enc.regReason}
                  onChange={(v) => ue(enc.id, 'regReason', v)}
                  placeholder="設定"
                />
              </div>
              <FI
                label="權利人"
                value={enc.creditorName}
                onChange={(v) => ue(enc.id, 'creditorName', v)}
              />
              <FI
                label="住址"
                value={enc.creditorAddress}
                onChange={(v) => ue(enc.id, 'creditorAddress', v)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="債權額比例"
                  value={enc.debtRatio}
                  onChange={(v) => ue(enc.id, 'debtRatio', v)}
                  placeholder="全部 1分之1"
                />
                <FI
                  label="擔保債權總金額"
                  value={enc.totalDebt}
                  onChange={(v) => ue(enc.id, 'totalDebt', v)}
                  placeholder="新台幣 9,000,000 元正"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="擔保債權種類及範圍"
                  value={enc.debtScope ?? ''}
                  onChange={(v) => ue(enc.id, 'debtScope', v)}
                />
                <FI
                  label="擔保債權確定日"
                  value={enc.debtConfirmDate ?? ''}
                  onChange={(v) => ue(enc.id, 'debtConfirmDate', v)}
                  placeholder="民國XXX年XX月XX日"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="存續期間"
                  value={enc.duration}
                  onChange={(v) => ue(enc.id, 'duration', v)}
                  placeholder="自091年06月26日至141年06月25日"
                />
                <FI
                  label="清償日期"
                  value={enc.repaymentDate}
                  onChange={(v) => ue(enc.id, 'repaymentDate', v)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FI
                  label="利息（率）"
                  value={enc.interest}
                  onChange={(v) => ue(enc.id, 'interest', v)}
                />
                <FI
                  label="遲延利息（率）"
                  value={enc.lateInterest}
                  onChange={(v) => ue(enc.id, 'lateInterest', v)}
                />
                <FI
                  label="違約金"
                  value={enc.penalty}
                  onChange={(v) => ue(enc.id, 'penalty', v)}
                />
              </div>
              <FI
                label="其他擔保範圍約定"
                value={enc.otherGuaranteeScope ?? ''}
                onChange={(v) => ue(enc.id, 'otherGuaranteeScope', v)}
              />
              <FI
                label="債務人及債務額比例"
                value={enc.debtorAndRatio}
                onChange={(v) => ue(enc.id, 'debtorAndRatio', v)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="權利標的"
                  value={enc.rightsSubject}
                  onChange={(v) => ue(enc.id, 'rightsSubject', v)}
                  placeholder="所有權"
                />
                <FI
                  label="標的登記次序"
                  value={enc.targetSeq}
                  onChange={(v) => ue(enc.id, 'targetSeq', v)}
                  placeholder="0002 0003"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FI
                  label="設定權利範圍"
                  value={enc.settleRightsRatio}
                  onChange={(v) => ue(enc.id, 'settleRightsRatio', v)}
                  placeholder="全部 1分之1"
                />
                <FI
                  label="證明書字號"
                  value={enc.certNumber}
                  onChange={(v) => ue(enc.id, 'certNumber', v)}
                  placeholder="091北大字第004524號"
                />
              </div>
              <FI
                label="設定義務人"
                value={enc.settlor}
                onChange={(v) => ue(enc.id, 'settlor', v)}
              />
              <FI
                label="共同擔保地號"
                value={enc.jointGuaranteeLandNumbers}
                onChange={(v) => ue(enc.id, 'jointGuaranteeLandNumbers', v)}
              />
              <FI
                label="共同擔保建號"
                value={enc.jointGuaranteeBuildingNumbers}
                onChange={(v) => ue(enc.id, 'jointGuaranteeBuildingNumbers', v)}
              />
              <FTA
                label="其他登記事項"
                value={enc.notes}
                onChange={(v) => ue(enc.id, 'notes', v)}
                rows={2}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEncumbrances((list) => [...list, emptyEncumbrance()])}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-border-default rounded-lg text-sm text-text-secondary hover:border-accent hover:text-accent transition-colors"
          >
            <Plus size={14} /> 新增他項權利
          </button>
        </section>

        {/* ── 注意事項（頁尾） ── */}
        <section className="space-y-2 border-t border-border-default pt-4">
          <p className="text-sm font-mono text-center text-text-primary mb-2">※ 注意事項</p>
          <FTA
            label="注意事項"
            value={header.transcriptNotes}
            onChange={(v) => uh('transcriptNotes', v)}
            rows={4}
          />
        </section>
      </div>

      <div className="flex justify-end pt-2 border-t border-border-default">
        <button type="button" onClick={handleSave} disabled={isPending} className="px-5 py-2 bg-accent text-white hover:bg-accent-hover rounded-md transition-colors text-sm flex items-center gap-2 disabled:opacity-50">
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {isPending ? '儲存中...' : '儲存土地謄本'}
        </button>
      </div>
    </div>
  );
}
