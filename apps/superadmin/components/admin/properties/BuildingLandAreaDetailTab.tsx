// filepath: apps/superadmin/components/admin/properties/BuildingLandAreaDetailTab.tsx
'use client';

import { useState, useMemo, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, MapPin, BarChart3, AlertTriangle,
  Pencil, Save, X, Plus, Trash2, Loader2,
} from 'lucide-react';
import type {
  PropertyItem,
  BuildingTranscriptData,
  LandTranscriptData,
  MainBuildingEntry,
  AnnexedBuilding,
  CommonAreaEntry,
  BuildingDescription,
  LandDescription,
} from '@/lib/types/properties';
import {
  parseAreaNumber,
  formatAreaNumber,
  parseShareRatio,
  getSharedCommonArea,
  formatPing,
} from '@/lib/utils/area-calc';
import { savePropertyTranscriptData } from '@/lib/actions/properties';

interface Props {
  property: PropertyItem;
  propertyId: string;
  propertyType: 'sale' | 'rental';
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------
const thCls = 'px-3 py-2 text-left text-xs font-medium text-text-muted whitespace-nowrap';
const tdCls = 'px-3 py-2 text-sm text-text-primary whitespace-nowrap';
const sectionTitleCls = 'flex items-center gap-2 text-sm font-semibold text-text-primary mb-3';
const cardCls = 'rounded-lg border border-border-default bg-bg-primary p-4';
const tableCls = 'w-full text-left border-collapse';
const inputCls =
  'w-full px-2 py-1 text-sm bg-bg-secondary border border-border-default rounded ' +
  'text-text-primary focus:outline-none focus:ring-1 focus:ring-accent';
const addRowBtnCls =
  'flex items-center gap-1 text-xs text-accent hover:text-accent-hover mt-1.5 transition-colors';
const deleteRowBtnCls =
  'p-0.5 text-text-muted hover:text-red-400 transition-colors';

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className={cardCls}>{children}</div>;
}

function DataWarning({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-xs text-yellow-400">
      <AlertTriangle size={14} className="shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resolveMainBuildings(desc: BuildingDescription): MainBuildingEntry[] {
  const arr = desc.mainBuildings ?? [];
  if (arr.length > 0) return arr;
  const floorArea = desc.floorArea ?? '';
  if (!floorArea || parseAreaNumber(floorArea) <= 0) return [];
  return [{
    totalFloors: desc.totalFloors ?? '',
    totalArea: desc.totalArea ?? '',
    floorLevel: desc.floorLevel ?? '',
    floorArea,
  }];
}

function calcBuildingTotal(data: BuildingTranscriptData): number {
  const desc = data.description;
  const entries = resolveMainBuildings(desc);
  const main = entries.reduce((s, e) => s + parseAreaNumber(e.floorArea), 0);
  const annexed = (desc.annexedBuildings ?? []).reduce((s, e) => s + parseAreaNumber(e.area), 0);
  const common = (desc.commonAreas ?? []).reduce(
    (s, e) => s + getSharedCommonArea(e.area, e.ratio), 0
  );
  return main + annexed + common;
}

function collectBuildingWarnings(data: BuildingTranscriptData): string[] {
  const warnings: string[] = [];
  const desc = data.description;
  if (resolveMainBuildings(desc).length === 0) {
    warnings.push('主建物面積缺漏，請確認建物標示部資料。');
  }
  if ((desc.commonAreas ?? []).length === 0) {
    warnings.push('未包含共有部分（公設）資料。');
  }
  return warnings;
}

function collectLandWarnings(data: LandTranscriptData): string[] {
  if (parseAreaNumber(data.description.area) <= 0) {
    return ['土地面積數值缺漏。'];
  }
  return [];
}

/** Deep clone a BuildingDescription for editing. */
function cloneBuildingDesc(desc: BuildingDescription): BuildingDescription {
  return {
    ...desc,
    mainBuildings: (desc.mainBuildings ?? []).map((e) => ({ ...e })),
    annexedBuildings: (desc.annexedBuildings ?? []).map((e) => ({ ...e })),
    commonAreas: (desc.commonAreas ?? []).map((e) => ({ ...e })),
  };
}

// ---------------------------------------------------------------------------
// BuildingSection
// ---------------------------------------------------------------------------

interface BuildingSectionProps {
  data: BuildingTranscriptData;
  label: string;
  warnings?: string[];
  editing: boolean;
  editDesc: BuildingDescription | null;
  onDescChange: (desc: BuildingDescription) => void;
}

function BuildingSection({ data, label, warnings, editing, editDesc, onDescChange }: BuildingSectionProps) {
  const desc = editing && editDesc ? editDesc : data.description;
  const mainBuildings = editing ? (desc.mainBuildings ?? []) : resolveMainBuildings(desc);
  const annexedBuildings = desc.annexedBuildings ?? [];
  const commonAreas = desc.commonAreas ?? [];

  const mainArea = useMemo(
    () => mainBuildings.reduce((s, e) => s + parseAreaNumber(e.floorArea), 0),
    [mainBuildings]
  );
  const annexedArea = useMemo(
    () => annexedBuildings.reduce((s, e) => s + parseAreaNumber(e.area), 0),
    [annexedBuildings]
  );
  const commonArea = useMemo(
    () => commonAreas.reduce((s, e) => s + getSharedCommonArea(e.area, e.ratio), 0),
    [commonAreas]
  );
  const totalArea = mainArea + annexedArea + commonArea;

  // -- mutation helpers (only used in editing mode) --
  const updateField = useCallback(
    (field: keyof BuildingDescription, value: string) => {
      if (!editDesc) return;
      onDescChange({ ...editDesc, [field]: value });
    },
    [editDesc, onDescChange]
  );

  const updateMainBuilding = useCallback(
    (idx: number, field: keyof MainBuildingEntry, value: string) => {
      if (!editDesc) return;
      const arr = [...(editDesc.mainBuildings ?? [])];
      arr[idx] = { ...arr[idx], [field]: value };
      onDescChange({ ...editDesc, mainBuildings: arr });
    },
    [editDesc, onDescChange]
  );

  const addMainBuilding = useCallback(() => {
    if (!editDesc) return;
    const arr = [...(editDesc.mainBuildings ?? [])];
    arr.push({ totalFloors: '', totalArea: '', floorLevel: '', floorArea: '' });
    onDescChange({ ...editDesc, mainBuildings: arr });
  }, [editDesc, onDescChange]);

  const removeMainBuilding = useCallback(
    (idx: number) => {
      if (!editDesc) return;
      const arr = [...(editDesc.mainBuildings ?? [])];
      arr.splice(idx, 1);
      onDescChange({ ...editDesc, mainBuildings: arr });
    },
    [editDesc, onDescChange]
  );

  const updateAnnexed = useCallback(
    (idx: number, field: keyof AnnexedBuilding, value: string) => {
      if (!editDesc) return;
      const arr = [...(editDesc.annexedBuildings ?? [])];
      arr[idx] = { ...arr[idx], [field]: value };
      onDescChange({ ...editDesc, annexedBuildings: arr });
    },
    [editDesc, onDescChange]
  );

  const addAnnexed = useCallback(() => {
    if (!editDesc) return;
    const arr = [...(editDesc.annexedBuildings ?? [])];
    arr.push({ use: '', area: '' });
    onDescChange({ ...editDesc, annexedBuildings: arr });
  }, [editDesc, onDescChange]);

  const removeAnnexed = useCallback(
    (idx: number) => {
      if (!editDesc) return;
      const arr = [...(editDesc.annexedBuildings ?? [])];
      arr.splice(idx, 1);
      onDescChange({ ...editDesc, annexedBuildings: arr });
    },
    [editDesc, onDescChange]
  );

  const updateCommon = useCallback(
    (idx: number, field: keyof CommonAreaEntry, value: string) => {
      if (!editDesc) return;
      const arr = [...(editDesc.commonAreas ?? [])];
      arr[idx] = { ...arr[idx], [field]: value };
      onDescChange({ ...editDesc, commonAreas: arr });
    },
    [editDesc, onDescChange]
  );

  const addCommon = useCallback(() => {
    if (!editDesc) return;
    const arr = [...(editDesc.commonAreas ?? [])];
    arr.push({ buildingNumber: '', area: '', ratio: '' });
    onDescChange({ ...editDesc, commonAreas: arr });
  }, [editDesc, onDescChange]);

  const removeCommon = useCallback(
    (idx: number) => {
      if (!editDesc) return;
      const arr = [...(editDesc.commonAreas ?? [])];
      arr.splice(idx, 1);
      onDescChange({ ...editDesc, commonAreas: arr });
    },
    [editDesc, onDescChange]
  );

  return (
    <SectionCard>
      <h4 className={sectionTitleCls}>
        <Building2 size={16} className="text-accent" />
        {label}
      </h4>

      {/* Building info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
        {editing ? (
          <>
            <div>
              <label className="text-text-muted block mb-0.5">建號</label>
              <input className={inputCls} value={desc.buildingNumber} onChange={(e) => updateField('buildingNumber', e.target.value)} />
            </div>
            <div>
              <label className="text-text-muted block mb-0.5">門牌</label>
              <input className={inputCls} value={desc.doorAddress} onChange={(e) => updateField('doorAddress', e.target.value)} />
            </div>
            <div>
              <label className="text-text-muted block mb-0.5">主要用途</label>
              <input className={inputCls} value={desc.mainUse} onChange={(e) => updateField('mainUse', e.target.value)} />
            </div>
            <div>
              <label className="text-text-muted block mb-0.5">主要建材</label>
              <input className={inputCls} value={desc.mainMaterial} onChange={(e) => updateField('mainMaterial', e.target.value)} />
            </div>
          </>
        ) : (
          <>
            <div><span className="text-text-muted">建號：</span><span className="text-text-primary">{desc.buildingNumber}</span></div>
            <div><span className="text-text-muted">門牌：</span><span className="text-text-primary">{desc.doorAddress}</span></div>
            <div><span className="text-text-muted">主要用途：</span><span className="text-text-primary">{desc.mainUse}</span></div>
            <div><span className="text-text-muted">主要建材：</span><span className="text-text-primary">{desc.mainMaterial}</span></div>
          </>
        )}
      </div>

      {/* Warnings */}
      {!editing && warnings && warnings.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {warnings.map((w) => <DataWarning key={w} message={w} />)}
        </div>
      )}

      {/* Main buildings table */}
      {(mainBuildings.length > 0 || editing) && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-1.5">主建物面積</p>
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr className="border-b border-border-default">
                  <th className={thCls}>層次</th>
                  <th className={thCls}>面積（㎡）</th>
                  <th className={thCls}>面積（坪）</th>
                  {editing && <th className={thCls} />}
                </tr>
              </thead>
              <tbody>
                {mainBuildings.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50">
                    {editing ? (
                      <>
                        <td className={tdCls}>
                          <input className={inputCls} value={entry.floorLevel} onChange={(e) => updateMainBuilding(i, 'floorLevel', e.target.value)} style={{ width: 80 }} />
                        </td>
                        <td className={tdCls}>
                          <input className={inputCls} value={entry.floorArea} onChange={(e) => updateMainBuilding(i, 'floorArea', e.target.value)} style={{ width: 100 }} />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={tdCls}>{entry.floorLevel}</td>
                        <td className={tdCls}>{entry.floorArea}</td>
                      </>
                    )}
                    <td className={`${tdCls} text-text-muted`}>
                      {formatPing(parseAreaNumber(entry.floorArea))}
                    </td>
                    {editing && (
                      <td className={tdCls}>
                        <button type="button" className={deleteRowBtnCls} onClick={() => removeMainBuilding(i)} title="刪除此列">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {mainBuildings.length > 1 && (
                  <tr className="border-b border-border-default bg-bg-secondary/30">
                    <td className={`${tdCls} font-medium`}>小計</td>
                    <td className={`${tdCls} font-medium`}>{formatAreaNumber(mainArea)}</td>
                    <td className={`${tdCls} text-text-muted`}>{formatPing(mainArea)}</td>
                    {editing && <td />}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {editing && (
            <button type="button" className={addRowBtnCls} onClick={addMainBuilding}>
              <Plus size={14} /> 新增樓層
            </button>
          )}
        </div>
      )}

      {/* Annexed buildings */}
      {(annexedBuildings.length > 0 || editing) && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-1.5">附屬建物面積</p>
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr className="border-b border-border-default">
                  <th className={thCls}>用途</th>
                  <th className={thCls}>面積（㎡）</th>
                  <th className={thCls}>面積（坪）</th>
                  {editing && <th className={thCls} />}
                </tr>
              </thead>
              <tbody>
                {annexedBuildings.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50">
                    {editing ? (
                      <>
                        <td className={tdCls}>
                          <input className={inputCls} value={entry.use} onChange={(e) => updateAnnexed(i, 'use', e.target.value)} style={{ width: 100 }} />
                        </td>
                        <td className={tdCls}>
                          <input className={inputCls} value={entry.area} onChange={(e) => updateAnnexed(i, 'area', e.target.value)} style={{ width: 100 }} />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={tdCls}>{entry.use}</td>
                        <td className={tdCls}>{entry.area}</td>
                      </>
                    )}
                    <td className={`${tdCls} text-text-muted`}>
                      {formatPing(parseAreaNumber(entry.area))}
                    </td>
                    {editing && (
                      <td className={tdCls}>
                        <button type="button" className={deleteRowBtnCls} onClick={() => removeAnnexed(i)} title="刪除此列">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {annexedBuildings.length > 1 && (
                  <tr className="border-b border-border-default bg-bg-secondary/30">
                    <td className={`${tdCls} font-medium`}>小計</td>
                    <td className={`${tdCls} font-medium`}>{formatAreaNumber(annexedArea)}</td>
                    <td className={`${tdCls} text-text-muted`}>{formatPing(annexedArea)}</td>
                    {editing && <td />}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {editing && (
            <button type="button" className={addRowBtnCls} onClick={addAnnexed}>
              <Plus size={14} /> 新增附屬建物
            </button>
          )}
        </div>
      )}

      {/* Common areas */}
      {(commonAreas.length > 0 || editing) && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-1.5">共有部分面積</p>
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr className="border-b border-border-default">
                  <th className={thCls}>共有部分建號</th>
                  <th className={thCls}>總面積（㎡）</th>
                  <th className={thCls}>權利範圍</th>
                  <th className={thCls}>持分面積（㎡）</th>
                  <th className={thCls}>持分面積（坪）</th>
                  {editing && <th className={thCls} />}
                </tr>
              </thead>
              <tbody>
                {commonAreas.map((entry, i) => {
                  const shared = getSharedCommonArea(entry.area, entry.ratio);
                  return (
                    <tr key={i} className="border-b border-border-default/50">
                      {editing ? (
                        <>
                          <td className={tdCls}>
                            <input className={inputCls} value={entry.buildingNumber} onChange={(e) => updateCommon(i, 'buildingNumber', e.target.value)} style={{ width: 120 }} />
                          </td>
                          <td className={tdCls}>
                            <input className={inputCls} value={entry.area} onChange={(e) => updateCommon(i, 'area', e.target.value)} style={{ width: 100 }} />
                          </td>
                          <td className={tdCls}>
                            <input className={inputCls} value={entry.ratio} onChange={(e) => updateCommon(i, 'ratio', e.target.value)} style={{ width: 140 }} />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className={tdCls}>{entry.buildingNumber}</td>
                          <td className={tdCls}>{entry.area}</td>
                          <td className={tdCls}>{entry.ratio}</td>
                        </>
                      )}
                      <td className={tdCls}>{formatAreaNumber(shared)}</td>
                      <td className={`${tdCls} text-text-muted`}>{formatPing(shared)}</td>
                      {editing && (
                        <td className={tdCls}>
                          <button type="button" className={deleteRowBtnCls} onClick={() => removeCommon(i)} title="刪除此列">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                {commonAreas.length > 1 && (
                  <tr className="border-b border-border-default bg-bg-secondary/30">
                    <td className={`${tdCls} font-medium`} colSpan={3}>小計</td>
                    <td className={`${tdCls} font-medium`}>{formatAreaNumber(commonArea)}</td>
                    <td className={`${tdCls} text-text-muted`}>{formatPing(commonArea)}</td>
                    {editing && <td />}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {editing && (
            <button type="button" className={addRowBtnCls} onClick={addCommon}>
              <Plus size={14} /> 新增共有部分
            </button>
          )}
        </div>
      )}

      {/* Building subtotal */}
      <div className="flex items-center gap-4 pt-2 border-t border-border-default text-sm">
        <span className="font-medium text-text-primary">建物合計</span>
        <span className="text-text-primary font-semibold">
          {formatAreaNumber(totalArea)} ㎡
        </span>
        <span className="text-text-muted text-xs">
          （{formatPing(totalArea)} 坪）
        </span>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// LandSection
// ---------------------------------------------------------------------------

interface LandSectionProps {
  data: LandTranscriptData;
  warnings?: string[];
  editing: boolean;
  editLandDesc: LandDescription | null;
  editOwnerRatio: string | null;
  onLandDescChange: (desc: LandDescription) => void;
  onOwnerRatioChange: (ratio: string) => void;
}

function LandSection({
  data, warnings, editing,
  editLandDesc, editOwnerRatio,
  onLandDescChange, onOwnerRatioChange,
}: LandSectionProps) {
  const desc = editing && editLandDesc ? editLandDesc : data.description;
  const ownerRatio = editing && editOwnerRatio !== null
    ? editOwnerRatio
    : (data.ownership[0]?.ownershipRatio ?? '');
  const totalArea = parseAreaNumber(desc.area);
  const ratioDecimal = parseShareRatio(ownerRatio);
  const ownedArea = totalArea * ratioDecimal;

  return (
    <SectionCard>
      <h4 className={sectionTitleCls}>
        <MapPin size={16} className="text-accent" />
        土地面積
      </h4>

      {!editing && warnings && warnings.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {warnings.map((w) => <DataWarning key={w} message={w} />)}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className={tableCls}>
          <thead>
            <tr className="border-b border-border-default">
              <th className={thCls}>地號</th>
              <th className={thCls}>使用分區</th>
              <th className={thCls}>總面積（㎡）</th>
              <th className={thCls}>持分比例</th>
              <th className={thCls}>持分面積（㎡）</th>
              <th className={thCls}>持分面積（坪）</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border-default/50">
              {editing ? (
                <>
                  <td className={tdCls}>
                    <input className={inputCls} value={desc.landNumber}
                      onChange={(e) => onLandDescChange({ ...desc, landNumber: e.target.value })}
                      style={{ width: 120 }} />
                  </td>
                  <td className={tdCls}>
                    <input className={inputCls} value={desc.useZone}
                      onChange={(e) => onLandDescChange({ ...desc, useZone: e.target.value })}
                      style={{ width: 100 }} />
                  </td>
                  <td className={tdCls}>
                    <input className={inputCls} value={desc.area}
                      onChange={(e) => onLandDescChange({ ...desc, area: e.target.value })}
                      style={{ width: 100 }} />
                  </td>
                  <td className={tdCls}>
                    <input className={inputCls} value={ownerRatio}
                      onChange={(e) => onOwnerRatioChange(e.target.value)}
                      style={{ width: 140 }} />
                  </td>
                </>
              ) : (
                <>
                  <td className={tdCls}>{desc.landNumber}</td>
                  <td className={tdCls}>{desc.useZone || '-'}</td>
                  <td className={tdCls}>{totalArea > 0 ? desc.area : '-'}</td>
                  <td className={tdCls}>{ownerRatio || '-'}</td>
                </>
              )}
              <td className={tdCls}>{formatAreaNumber(ownedArea) || '-'}</td>
              <td className={`${tdCls} text-text-muted`}>{formatPing(ownedArea) || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// AreaSummary (read-only, auto-calculated)
// ---------------------------------------------------------------------------

function AreaSummary({
  buildingTranscript,
  landTranscript,
  parkingBuildingTranscript,
}: {
  buildingTranscript?: BuildingTranscriptData | null;
  landTranscript?: LandTranscriptData | null;
  parkingBuildingTranscript?: BuildingTranscriptData | null;
}) {
  const buildingTotal = useMemo(() => {
    if (!buildingTranscript) return 0;
    return calcBuildingTotal(buildingTranscript);
  }, [buildingTranscript]);

  const landOwned = useMemo(() => {
    if (!landTranscript) return 0;
    const area = parseAreaNumber(landTranscript.description.area);
    const ratio = parseShareRatio(landTranscript.ownership[0]?.ownershipRatio ?? '');
    return area * ratio;
  }, [landTranscript]);

  const parkingTotal = useMemo(() => {
    if (!parkingBuildingTranscript) return 0;
    return calcBuildingTotal(parkingBuildingTranscript);
  }, [parkingBuildingTranscript]);

  const rows: { label: string; sqm: number }[] = [];
  if (buildingTotal > 0) rows.push({ label: '建物面積', sqm: buildingTotal });
  if (landOwned > 0) rows.push({ label: '土地持分面積', sqm: landOwned });
  if (parkingTotal > 0) rows.push({ label: '車位面積', sqm: parkingTotal });

  if (rows.length === 0) return null;

  return (
    <SectionCard>
      <div data-testid="area-summary">
        <h4 className={sectionTitleCls}>
          <BarChart3 size={16} className="text-accent" />
          建物與土地面積 匯總
        </h4>
        <div className="overflow-x-auto">
          <table className={tableCls}>
            <thead>
              <tr className="border-b border-border-default">
                <th className={thCls}>項目</th>
                <th className={thCls}>面積（㎡）</th>
                <th className={thCls}>面積（坪）</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border-default/50">
                  <td className={tdCls}>{r.label}</td>
                  <td className={tdCls}>{formatAreaNumber(r.sqm)}</td>
                  <td className={`${tdCls} text-text-muted`}>{formatPing(r.sqm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Editable AreaSummary — computed from edit state in real-time
// ---------------------------------------------------------------------------

function EditableAreaSummary({
  buildingDesc,
  landDesc,
  landOwnerRatio,
  parkingDesc,
  isPureLand,
}: {
  buildingDesc: BuildingDescription | null;
  landDesc: LandDescription | null;
  landOwnerRatio: string;
  parkingDesc: BuildingDescription | null;
  isPureLand: boolean;
}) {
  const buildingTotal = useMemo(() => {
    if (isPureLand || !buildingDesc) return 0;
    const entries = buildingDesc.mainBuildings ?? [];
    const main = entries.reduce((s, e) => s + parseAreaNumber(e.floorArea), 0);
    const annexed = (buildingDesc.annexedBuildings ?? []).reduce((s, e) => s + parseAreaNumber(e.area), 0);
    const common = (buildingDesc.commonAreas ?? []).reduce(
      (s, e) => s + getSharedCommonArea(e.area, e.ratio), 0
    );
    return main + annexed + common;
  }, [buildingDesc, isPureLand]);

  const landOwned = useMemo(() => {
    if (!landDesc) return 0;
    return parseAreaNumber(landDesc.area) * parseShareRatio(landOwnerRatio);
  }, [landDesc, landOwnerRatio]);

  const parkingTotal = useMemo(() => {
    if (!parkingDesc) return 0;
    const entries = parkingDesc.mainBuildings ?? [];
    const main = entries.reduce((s, e) => s + parseAreaNumber(e.floorArea), 0);
    const annexed = (parkingDesc.annexedBuildings ?? []).reduce((s, e) => s + parseAreaNumber(e.area), 0);
    const common = (parkingDesc.commonAreas ?? []).reduce(
      (s, e) => s + getSharedCommonArea(e.area, e.ratio), 0
    );
    return main + annexed + common;
  }, [parkingDesc]);

  const rows: { label: string; sqm: number }[] = [];
  if (buildingTotal > 0) rows.push({ label: '建物面積', sqm: buildingTotal });
  if (landOwned > 0) rows.push({ label: '土地持分面積', sqm: landOwned });
  if (parkingTotal > 0) rows.push({ label: '車位面積', sqm: parkingTotal });

  if (rows.length === 0) return null;

  return (
    <SectionCard>
      <div data-testid="area-summary">
        <h4 className={sectionTitleCls}>
          <BarChart3 size={16} className="text-accent" />
          面積匯總（即時預覽）
        </h4>
        <div className="overflow-x-auto">
          <table className={tableCls}>
            <thead>
              <tr className="border-b border-border-default">
                <th className={thCls}>項目</th>
                <th className={thCls}>面積（㎡）</th>
                <th className={thCls}>面積（坪）</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border-default/50">
                  <td className={tdCls}>{r.label}</td>
                  <td className={tdCls}>{formatAreaNumber(r.sqm)}</td>
                  <td className={`${tdCls} text-text-muted`}>{formatPing(r.sqm)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function BuildingLandAreaDetailTab({ property, propertyId, propertyType }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    buildingTranscript,
    landTranscript,
    parkingBuildingTranscript,
    parkingLandTranscript,
    isPureLand,
  } = property;

  // -- Editable local state (populated on entering edit mode) --
  const [editBuildingDesc, setEditBuildingDesc] = useState<BuildingDescription | null>(null);
  const [editLandDesc, setEditLandDesc] = useState<LandDescription | null>(null);
  const [editLandOwnerRatio, setEditLandOwnerRatio] = useState<string>('');
  const [editParkingBuildingDesc, setEditParkingBuildingDesc] = useState<BuildingDescription | null>(null);
  const [editParkingLandDesc, setEditParkingLandDesc] = useState<LandDescription | null>(null);
  const [editParkingLandOwnerRatio, setEditParkingLandOwnerRatio] = useState<string>('');

  const hasAnyData = !!(
    buildingTranscript || landTranscript ||
    parkingBuildingTranscript || parkingLandTranscript
  );

  const enterEditMode = useCallback(() => {
    // Deep clone current data into local state
    if (buildingTranscript) {
      setEditBuildingDesc(cloneBuildingDesc(buildingTranscript.description));
    }
    if (landTranscript) {
      setEditLandDesc({ ...landTranscript.description });
      setEditLandOwnerRatio(landTranscript.ownership[0]?.ownershipRatio ?? '');
    }
    if (parkingBuildingTranscript) {
      setEditParkingBuildingDesc(cloneBuildingDesc(parkingBuildingTranscript.description));
    }
    if (parkingLandTranscript) {
      setEditParkingLandDesc({ ...parkingLandTranscript.description });
      setEditParkingLandOwnerRatio(parkingLandTranscript.ownership[0]?.ownershipRatio ?? '');
    }
    setFeedback(null);
    setEditing(true);
  }, [buildingTranscript, landTranscript, parkingBuildingTranscript, parkingLandTranscript]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditBuildingDesc(null);
    setEditLandDesc(null);
    setEditLandOwnerRatio('');
    setEditParkingBuildingDesc(null);
    setEditParkingLandDesc(null);
    setEditParkingLandOwnerRatio('');
    setFeedback(null);
  }, []);

  const handleSave = useCallback(() => {
    setFeedback(null);

    // Assemble updated transcript data, preserving header/ownership/encumbrances
    const payload: Parameters<typeof savePropertyTranscriptData>[2] = {};

    if (buildingTranscript && editBuildingDesc) {
      payload.buildingTranscript = {
        ...buildingTranscript,
        description: editBuildingDesc,
      };
    }
    if (landTranscript && editLandDesc) {
      const updatedOwnership = [...landTranscript.ownership];
      if (updatedOwnership.length > 0) {
        updatedOwnership[0] = { ...updatedOwnership[0], ownershipRatio: editLandOwnerRatio };
      }
      payload.landTranscript = {
        ...landTranscript,
        description: editLandDesc,
        ownership: updatedOwnership,
      };
    }
    if (parkingBuildingTranscript && editParkingBuildingDesc) {
      payload.parkingBuildingTranscript = {
        ...parkingBuildingTranscript,
        description: editParkingBuildingDesc,
      };
    }
    if (parkingLandTranscript && editParkingLandDesc) {
      const updatedOwnership = [...parkingLandTranscript.ownership];
      if (updatedOwnership.length > 0) {
        updatedOwnership[0] = { ...updatedOwnership[0], ownershipRatio: editParkingLandOwnerRatio };
      }
      payload.parkingLandTranscript = {
        ...parkingLandTranscript,
        description: editParkingLandDesc,
        ownership: updatedOwnership,
      };
    }

    startTransition(async () => {
      const result = await savePropertyTranscriptData(propertyId, propertyType, payload);
      if (result.success) {
        setFeedback({ type: 'success', message: result.message });
        setEditing(false);
        router.refresh();
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }, [
    propertyId, propertyType, router,
    buildingTranscript, editBuildingDesc,
    landTranscript, editLandDesc, editLandOwnerRatio,
    parkingBuildingTranscript, editParkingBuildingDesc,
    parkingLandTranscript, editParkingLandDesc, editParkingLandOwnerRatio,
  ]);

  if (!hasAnyData) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-primary p-8 text-center">
        <Building2 size={40} className="mx-auto text-text-muted mb-3" />
        <p className="text-sm text-text-muted">
          尚未有謄本資料，請先至「謄本」頁籤上傳並解析謄本。
        </p>
      </div>
    );
  }

  const buildingWarnings = buildingTranscript ? collectBuildingWarnings(buildingTranscript) : [];
  const landWarnings = landTranscript ? collectLandWarnings(landTranscript) : [];

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">建物土地面積明細表</h3>
        <div className="flex items-center gap-2">
          {feedback && (
            <span className={`text-xs ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {feedback.message}
            </span>
          )}
          {editing ? (
            <>
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border-default rounded-md text-text-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
              >
                <X size={14} /> 取消
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent text-white rounded-md hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                {isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                儲存
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={enterEditMode}
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border-default rounded-md text-text-secondary hover:bg-bg-secondary transition-colors"
            >
              <Pencil size={14} /> 編輯
            </button>
          )}
        </div>
      </div>

      {/* Main building */}
      {!isPureLand && buildingTranscript && (
        <BuildingSection
          data={buildingTranscript}
          label="主建物面積明細"
          warnings={buildingWarnings}
          editing={editing}
          editDesc={editBuildingDesc}
          onDescChange={setEditBuildingDesc}
        />
      )}

      {/* Land */}
      {landTranscript && (
        <LandSection
          data={landTranscript}
          warnings={landWarnings}
          editing={editing}
          editLandDesc={editLandDesc}
          editOwnerRatio={editLandOwnerRatio}
          onLandDescChange={setEditLandDesc}
          onOwnerRatioChange={setEditLandOwnerRatio}
        />
      )}

      {/* Parking building */}
      {parkingBuildingTranscript && (
        <BuildingSection
          data={parkingBuildingTranscript}
          label="獨立車位建物面積明細"
          editing={editing}
          editDesc={editParkingBuildingDesc}
          onDescChange={setEditParkingBuildingDesc}
        />
      )}

      {/* Parking land */}
      {parkingLandTranscript && (
        <LandSection
          data={parkingLandTranscript}
          editing={editing}
          editLandDesc={editParkingLandDesc}
          editOwnerRatio={editParkingLandOwnerRatio}
          onLandDescChange={setEditParkingLandDesc}
          onOwnerRatioChange={setEditParkingLandOwnerRatio}
        />
      )}

      {/* Summary */}
      {editing ? (
        <EditableAreaSummary
          buildingDesc={editBuildingDesc}
          landDesc={editLandDesc}
          landOwnerRatio={editLandOwnerRatio}
          parkingDesc={editParkingBuildingDesc}
          isPureLand={!!isPureLand}
        />
      ) : (
        <AreaSummary
          buildingTranscript={buildingTranscript}
          landTranscript={landTranscript}
          parkingBuildingTranscript={parkingBuildingTranscript}
        />
      )}
    </div>
  );
}
