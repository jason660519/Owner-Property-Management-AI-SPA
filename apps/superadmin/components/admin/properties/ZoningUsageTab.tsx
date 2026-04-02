'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MapPin, FileText, DollarSign, Shield, Save, Loader2,
  ExternalLink, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import type { PropertyItem, LandTranscriptData, LandOwnershipRecord } from '@/lib/types/properties';
import {
  getPropertyZoningEnv,
  savePropertyZoningEnv,
  type ZoningEnvData,
} from '@/lib/actions/properties';
import { parseAreaNumber, formatPing } from '@/lib/utils/area-calc';

// ── Shared styles ────────────────────────────────────────────────────────
const cardCls = 'rounded-lg border border-border-default bg-bg-primary overflow-hidden';
const sectionTitleCls = 'flex items-center gap-2 text-sm font-semibold text-text-primary';
const dlRowCls = 'grid grid-cols-[140px_minmax(0,1fr)] gap-x-4 px-4 py-2.5 text-sm';
const dtCls = 'text-text-secondary';
const ddCls = 'text-text-primary';
const inputCls =
  'w-full rounded-md border border-border-default bg-bg-primary px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';
const checkboxCls =
  'rounded border-border-default text-accent focus:ring-accent focus:ring-offset-0';

// ── Taiwan zoning regulation reference ───────────────────────────────────
interface ZoningRegulation {
  zone: string;
  buildingCoverage: string;
  floorAreaRatio: string;
  note: string;
}

const ZONING_REGULATIONS: ZoningRegulation[] = [
  { zone: '第一種住宅區', buildingCoverage: '60%', floorAreaRatio: '225%', note: '僅供住宅使用' },
  { zone: '第二種住宅區', buildingCoverage: '60%', floorAreaRatio: '300%', note: '住宅為主，允許小型商店' },
  { zone: '第三種住宅區', buildingCoverage: '55%', floorAreaRatio: '400%', note: '住商混合' },
  { zone: '第四種住宅區', buildingCoverage: '50%', floorAreaRatio: '300%', note: '住宅區（都計外）' },
  { zone: '第一種商業區', buildingCoverage: '80%', floorAreaRatio: '360%', note: '鄰里性日用品零售商業' },
  { zone: '第二種商業區', buildingCoverage: '80%', floorAreaRatio: '630%', note: '一般商業區' },
  { zone: '第三種商業區', buildingCoverage: '80%', floorAreaRatio: '560%', note: '地區性商業中心' },
  { zone: '第四種商業區', buildingCoverage: '80%', floorAreaRatio: '800%', note: '都會中心商業' },
  { zone: '第二種工業區', buildingCoverage: '70%', floorAreaRatio: '210%', note: '公害輕微工業' },
  { zone: '第三種工業區', buildingCoverage: '70%', floorAreaRatio: '300%', note: '特種及危險工業' },
  { zone: '行政區', buildingCoverage: '50%', floorAreaRatio: '400%', note: '政府機關' },
  { zone: '農業區', buildingCoverage: '60%', floorAreaRatio: '240%', note: '農作使用為主' },
];

function matchZoningRegulation(useZone: string): ZoningRegulation | null {
  if (!useZone) return null;
  return ZONING_REGULATIONS.find((r) => useZone.includes(r.zone)) ?? null;
}

// ── Sub-components ───────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="space-y-0.5">
      <h4 className={sectionTitleCls}>
        <Icon size={16} className="text-accent" />
        {title}
      </h4>
      {subtitle && <p className="text-xs text-text-muted pl-6">{subtitle}</p>}
    </div>
  );
}

function DlRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={dlRowCls}>
      <dt className={dtCls}>{label}</dt>
      <dd className={ddCls}>{value || '—'}</dd>
    </div>
  );
}

/** Full land description section from transcript */
function LandDescriptionSection({ land }: { land: LandTranscriptData }) {
  const desc = land.description;
  const area = parseAreaNumber(desc.area);

  return (
    <div className={cardCls}>
      <SectionHeader icon={MapPin} title="土地標示部" subtitle="來自土地謄本解析結果" />
      <dl className="divide-y divide-border-default/50">
        <DlRow label="土地地號" value={desc.landNumber} />
        <DlRow label="登記日期" value={desc.regDate} />
        <DlRow label="登記原因" value={desc.regReason} />
        <DlRow label="地目" value={desc.landCategory} />
        <DlRow label="等則" value={desc.grade} />
        <DlRow
          label="面積"
          value={area > 0 ? `${desc.area}（${formatPing(area)} 坪）` : desc.area}
        />
        <DlRow label="使用分區" value={desc.useZone} />
        <DlRow label="使用地類別" value={desc.useCategory} />
        <DlRow label="公告地價年" value={desc.announcedValueYear} />
        <DlRow label="公告地價/㎡" value={desc.announcedValuePerSqm} />
        <DlRow label="地上建物建號" value={desc.buildingsOnLand} />
        {desc.notes && <DlRow label="備註" value={desc.notes} />}
      </dl>
    </div>
  );
}

/** Land value & ownership section */
function LandValueSection({ ownership }: { ownership: LandOwnershipRecord[] }) {
  if (ownership.length === 0) return null;

  const primary = ownership[0];

  return (
    <div className={cardCls}>
      <SectionHeader icon={DollarSign} title="地價與所有權資訊" />
      <dl className="divide-y divide-border-default/50">
        <DlRow label="所有權人" value={primary.ownerName} />
        <DlRow label="權利範圍" value={primary.ownershipRatio} />
        <DlRow label="登記日期" value={primary.regDate} />
        <DlRow label="登記原因" value={primary.regReason} />
        <DlRow label="當期申報地價年" value={primary.currentDeclaredLandValueYear} />
        <DlRow label="當期申報地價/㎡" value={primary.currentDeclaredLandValuePerSqm} />
        <DlRow label="前次移轉年" value={primary.prevTransferValueYear} />
        <DlRow label="前次移轉現值/㎡" value={primary.prevTransferValuePerSqm} />
        {primary.historicalRatios && (
          <DlRow label="歷次持分變動" value={primary.historicalRatios} />
        )}
      </dl>
      {ownership.length > 1 && (
        <div className="px-4 py-2 text-xs text-text-muted border-t border-border-default">
          另有 {ownership.length - 1} 筆共有人資料（略）
        </div>
      )}
    </div>
  );
}

/** Encumbrance summary from land transcript */
function EncumbranceSummarySection({ land }: { land: LandTranscriptData }) {
  const items = land.encumbrances;
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) {
    return (
      <div className={cardCls}>
        <SectionHeader icon={Shield} title="他項權利摘要" />
        <div className="px-4 py-3 text-xs text-text-muted">
          本筆土地目前無他項權利（抵押權、地上權等）設定。
        </div>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between px-4 pt-3">
        <SectionHeader icon={Shield} title={`他項權利摘要（${items.length} 筆）`} />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? '收合' : '展開'}
        </button>
      </div>

      {/* Always show summary row */}
      <div className="px-4 py-2 text-xs text-text-muted">
        {items.map((e, i) => (
          <span key={e.id || i}>
            {i > 0 && '、'}
            {e.encumbranceType || '抵押權'}
            {e.creditorName ? `（${e.creditorName}）` : ''}
          </span>
        ))}
      </div>

      {expanded && (
        <div className="border-t border-border-default divide-y divide-border-default/50">
          {items.map((e, i) => (
            <div key={e.id || i} className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                <span className="text-xs text-text-muted">#{i + 1}</span>
                {e.encumbranceType || '抵押權'}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                {e.creditorName && (
                  <div><span className="text-text-muted">權利人：</span>{e.creditorName}</div>
                )}
                {e.totalDebt && (
                  <div><span className="text-text-muted">擔保債權總金額：</span>{e.totalDebt}</div>
                )}
                {e.regDate && (
                  <div><span className="text-text-muted">登記日期：</span>{e.regDate}</div>
                )}
                {e.duration && (
                  <div><span className="text-text-muted">存續期間：</span>{e.duration}</div>
                )}
                {e.interest && (
                  <div><span className="text-text-muted">利息：</span>{e.interest}</div>
                )}
                {e.settleRightsRatio && (
                  <div><span className="text-text-muted">權利範圍：</span>{e.settleRightsRatio}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Zoning regulation match card */
function ZoningRegulationCard({ useZone }: { useZone: string }) {
  const reg = matchZoningRegulation(useZone);
  const [showAll, setShowAll] = useState(false);

  return (
    <div className={cardCls}>
      <div className="px-4 pt-3 pb-2">
        <SectionHeader
          icon={Info}
          title="使用分區法規參考"
          subtitle="台北市都市計畫常見使用分區之建蔽率/容積率（僅供參考，以各縣市公告為準）"
        />
      </div>

      {reg && (
        <div className="mx-4 mb-3 rounded-md bg-accent/10 border border-accent/20 px-3 py-2.5">
          <p className="text-xs text-accent font-medium mb-1">
            符合分區：{reg.zone}
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <span className="text-text-muted text-xs">建蔽率</span>
              <p className="font-semibold text-text-primary">{reg.buildingCoverage}</p>
            </div>
            <div>
              <span className="text-text-muted text-xs">容積率</span>
              <p className="font-semibold text-text-primary">{reg.floorAreaRatio}</p>
            </div>
            <div>
              <span className="text-text-muted text-xs">說明</span>
              <p className="text-text-primary">{reg.note}</p>
            </div>
          </div>
        </div>
      )}

      {!reg && useZone && (
        <div className="mx-4 mb-3 rounded-md bg-bg-secondary px-3 py-2 text-xs text-text-muted">
          未能自動匹配「{useZone}」對應的法規資料，請參考下方完整列表或至官方網站查詢。
        </div>
      )}

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-accent hover:text-accent-hover flex items-center gap-1"
        >
          {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAll ? '收合完整列表' : '查看常見分區法規列表'}
        </button>
      </div>

      {showAll && (
        <div className="border-t border-border-default overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border-default bg-bg-secondary/50">
                <th className="px-3 py-2 font-medium text-text-muted">使用分區</th>
                <th className="px-3 py-2 font-medium text-text-muted">建蔽率</th>
                <th className="px-3 py-2 font-medium text-text-muted">容積率</th>
                <th className="px-3 py-2 font-medium text-text-muted">說明</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50">
              {ZONING_REGULATIONS.map((r) => (
                <tr
                  key={r.zone}
                  className={
                    reg?.zone === r.zone
                      ? 'bg-accent/5 text-text-primary'
                      : 'text-text-secondary'
                  }
                >
                  <td className="px-3 py-1.5 whitespace-nowrap">{r.zone}</td>
                  <td className="px-3 py-1.5">{r.buildingCoverage}</td>
                  <td className="px-3 py-1.5">{r.floorAreaRatio}</td>
                  <td className="px-3 py-1.5">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Manual zoning data edit form (saves to property_environment_conditions) */
function ZoningEditForm({
  propertyId,
  propertyType,
  initial,
  transcriptUseZone,
}: {
  propertyId: string;
  propertyType: 'sale' | 'rental';
  initial: ZoningEnvData | null;
  transcriptUseZone: string;
}) {
  const [form, setForm] = useState<ZoningEnvData>({
    landUseZone: initial?.landUseZone || transcriptUseZone || '',
    extensionLocation: initial?.extensionLocation || '',
    hasGroundVegetation: initial?.hasGroundVegetation ?? false,
    hasGroundBuilding: initial?.hasGroundBuilding ?? false,
    announcedLandValue: initial?.announcedLandValue ?? null,
    roadWidthMeters: initial?.roadWidthMeters ?? null,
    frontageMeter: initial?.frontageMeter ?? null,
    depthMeters: initial?.depthMeters ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    const result = await savePropertyZoningEnv(propertyId, propertyType, form);
    setMessage({ type: result.success ? 'success' : 'error', text: result.message });
    setSaving(false);
  }, [propertyId, propertyType, form]);

  const setField = useCallback(<K extends keyof ZoningEnvData>(key: K, val: ZoningEnvData[K]) => {
    setForm((prev) => ({ ...prev, [key]: val }));
    setMessage(null);
  }, []);

  return (
    <div className={cardCls}>
      <div className="px-4 pt-3 pb-2">
        <SectionHeader
          icon={FileText}
          title="手動使用分區設定"
          subtitle="可手動補充或覆寫謄本解析結果，儲存至環境條件資料表"
        />
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Use zone */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">使用分區</label>
            <input
              type="text"
              className={inputCls}
              placeholder="例：第三種住宅區"
              value={form.landUseZone}
              onChange={(e) => setField('landUseZone', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">增建位置</label>
            <input
              type="text"
              className={inputCls}
              placeholder="例：頂樓加蓋、後院搭建"
              value={form.extensionLocation}
              onChange={(e) => setField('extensionLocation', e.target.value)}
            />
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">公告土地現值（元/㎡）</label>
            <input
              type="number"
              className={inputCls}
              placeholder="0"
              value={form.announcedLandValue ?? ''}
              onChange={(e) => setField('announcedLandValue', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">臨路寬度（公尺）</label>
            <input
              type="number"
              className={inputCls}
              placeholder="0"
              value={form.roadWidthMeters ?? ''}
              onChange={(e) => setField('roadWidthMeters', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">面寬（公尺）</label>
            <input
              type="number"
              className={inputCls}
              placeholder="0"
              value={form.frontageMeter ?? ''}
              onChange={(e) => setField('frontageMeter', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">進深（公尺）</label>
            <input
              type="number"
              className={inputCls}
              placeholder="0"
              value={form.depthMeters ?? ''}
              onChange={(e) => setField('depthMeters', e.target.value ? Number(e.target.value) : null)}
            />
          </div>
        </div>

        {/* Boolean flags */}
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              className={checkboxCls}
              checked={form.hasGroundVegetation}
              onChange={(e) => setField('hasGroundVegetation', e.target.checked)}
            />
            地上有植栽
          </label>
          <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
            <input
              type="checkbox"
              className={checkboxCls}
              checked={form.hasGroundBuilding}
              onChange={(e) => setField('hasGroundBuilding', e.target.checked)}
            />
            地上有建物
          </label>
        </div>

        {/* Save button & message */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? '儲存中…' : '儲存使用分區設定'}
          </button>
          {message && (
            <span className={`text-xs ${message.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {message.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────

interface ZoningUsageTabProps {
  property: PropertyItem;
}

export function ZoningUsageTab({ property }: ZoningUsageTabProps) {
  const land = property.landTranscript;
  const landDesc = land?.description;
  const useZone = landDesc?.useZone ?? '';

  // Fetch environment conditions for the editable form
  const [envData, setEnvData] = useState<ZoningEnvData | null>(null);
  const [envLoading, setEnvLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getPropertyZoningEnv(property.id, property.type).then((data) => {
      if (!cancelled) {
        setEnvData(data);
        setEnvLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [property.id, property.type]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-text-primary">使用分區與土地資訊</h3>
        <p className="text-xs text-text-muted">
          整合土地謄本解析與手動補充的使用分區資料，包含地價、他項權利及分區法規參考。
        </p>
      </div>

      {/* No transcript fallback */}
      {!land && (
        <div className="rounded-lg border border-dashed border-border-default bg-bg-secondary/60 px-4 py-3 text-xs text-text-muted">
          目前尚未儲存土地謄本解析資料。請先在「謄本」分頁上傳土地謄本並完成解析後，再回到本分頁查看完整土地資訊。
          <br />
          下方仍可手動填寫使用分區設定。
        </div>
      )}

      {/* Section 1: Full land description */}
      {land && <LandDescriptionSection land={land} />}

      {/* Section 2: Land value & ownership */}
      {land && <LandValueSection ownership={land.ownership} />}

      {/* Section 3: Encumbrance summary */}
      {land && <EncumbranceSummarySection land={land} />}

      {/* Section 4: Zoning regulation reference */}
      <ZoningRegulationCard useZone={envData?.landUseZone || useZone} />

      {/* Section 5: Editable form */}
      {envLoading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-sm text-text-muted">
          <Loader2 size={16} className="animate-spin" />
          載入環境條件資料…
        </div>
      ) : (
        <ZoningEditForm
          propertyId={property.id}
          propertyType={property.type}
          initial={envData}
          transcriptUseZone={useZone}
        />
      )}

      {/* Section 6: External reference */}
      <div className="rounded-lg border border-border-default bg-bg-secondary px-4 py-3 space-y-2 text-xs">
        <p className="font-medium text-text-secondary">官方使用分區查詢</p>
        <p className="text-text-muted">
          若需官方最新的使用分區與相關規定，請使用各縣市地政局「使用分區查詢」系統查詢。
        </p>
        <div className="flex flex-wrap gap-2 mt-1">
          <a
            href="https://zone.udd.gov.taipei/ZoneSearch.aspx"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-colors"
          >
            臺北市使用分區查詢
            <ExternalLink size={12} />
          </a>
          <a
            href="https://urbanzone.tainan.gov.tw/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border-default bg-bg-primary text-text-primary text-xs font-medium hover:bg-bg-secondary transition-colors"
          >
            臺南市
            <ExternalLink size={12} />
          </a>
          <a
            href="https://luz.tcd.gov.tw/WEB/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-border-default bg-bg-primary text-text-primary text-xs font-medium hover:bg-bg-secondary transition-colors"
          >
            新北市
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </div>
  );
}
