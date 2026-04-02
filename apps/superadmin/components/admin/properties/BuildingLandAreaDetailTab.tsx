// filepath: apps/superadmin/components/admin/properties/BuildingLandAreaDetailTab.tsx
'use client';

import { useMemo } from 'react';
import { Building2, MapPin, BarChart3, AlertTriangle } from 'lucide-react';
import type {
  PropertyItem,
  BuildingTranscriptData,
  LandTranscriptData,
  MainBuildingEntry,
} from '@/lib/types/properties';
import {
  parseAreaNumber,
  formatAreaNumber,
  parseShareRatio,
  getSharedCommonArea,
  formatPing,
} from '@/lib/utils/area-calc';

interface Props {
  property: PropertyItem;
}

const thCls = 'px-3 py-2 text-left text-xs font-medium text-text-muted whitespace-nowrap';
const tdCls = 'px-3 py-2 text-sm text-text-primary whitespace-nowrap';
const sectionTitleCls = 'flex items-center gap-2 text-sm font-semibold text-text-primary mb-3';
const cardCls = 'rounded-lg border border-border-default bg-bg-primary p-4';
const tableCls = 'w-full text-left border-collapse';

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

/**
 * Resolve effective main building entries.
 * If the `mainBuildings` array is populated, use it directly.
 * Otherwise fall back to the flat `floorLevel` / `floorArea` fields
 * that some older transcript parses store.
 */
function resolveMainBuildings(desc: BuildingTranscriptData['description']): MainBuildingEntry[] {
  const arr = desc.mainBuildings ?? [];
  if (arr.length > 0) return arr;

  // Fallback: build a single entry from flat fields
  const floorArea = desc.floorArea ?? '';
  if (!floorArea || parseAreaNumber(floorArea) <= 0) return [];

  return [{
    totalFloors: desc.totalFloors ?? '',
    totalArea: desc.totalArea ?? '',
    floorLevel: desc.floorLevel ?? '',
    floorArea,
  }];
}

/** Calculate total building area from a BuildingTranscriptData (with fallback). */
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

function BuildingSection({ data, label, warnings }: {
  data: BuildingTranscriptData;
  label: string;
  warnings?: string[];
}) {
  const desc = data.description;
  const mainBuildings = resolveMainBuildings(desc);
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

  return (
    <SectionCard>
      <h4 className={sectionTitleCls}>
        <Building2 size={16} className="text-accent" />
        {label}
      </h4>

      {/* Building info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-xs">
        <div>
          <span className="text-text-muted">建號：</span>
          <span className="text-text-primary">{desc.buildingNumber}</span>
        </div>
        <div>
          <span className="text-text-muted">門牌：</span>
          <span className="text-text-primary">{desc.doorAddress}</span>
        </div>
        <div>
          <span className="text-text-muted">主要用途：</span>
          <span className="text-text-primary">{desc.mainUse}</span>
        </div>
        <div>
          <span className="text-text-muted">主要建材：</span>
          <span className="text-text-primary">{desc.mainMaterial}</span>
        </div>
      </div>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {warnings.map((w) => <DataWarning key={w} message={w} />)}
        </div>
      )}

      {/* Main buildings table */}
      {mainBuildings.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-1.5">主建物面積</p>
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr className="border-b border-border-default">
                  <th className={thCls}>層次</th>
                  <th className={thCls}>面積（㎡）</th>
                  <th className={thCls}>面積（坪）</th>
                </tr>
              </thead>
              <tbody>
                {mainBuildings.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50">
                    <td className={tdCls}>{entry.floorLevel}</td>
                    <td className={tdCls}>{entry.floorArea}</td>
                    <td className={`${tdCls} text-text-muted`}>
                      {formatPing(parseAreaNumber(entry.floorArea))}
                    </td>
                  </tr>
                ))}
                {mainBuildings.length > 1 && (
                  <tr className="border-b border-border-default bg-bg-secondary/30">
                    <td className={`${tdCls} font-medium`}>小計</td>
                    <td className={`${tdCls} font-medium`}>{formatAreaNumber(mainArea)}</td>
                    <td className={`${tdCls} text-text-muted`}>{formatPing(mainArea)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Annexed buildings */}
      {annexedBuildings.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-1.5">附屬建物面積</p>
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr className="border-b border-border-default">
                  <th className={thCls}>用途</th>
                  <th className={thCls}>面積（㎡）</th>
                  <th className={thCls}>面積（坪）</th>
                </tr>
              </thead>
              <tbody>
                {annexedBuildings.map((entry, i) => (
                  <tr key={i} className="border-b border-border-default/50">
                    <td className={tdCls}>{entry.use}</td>
                    <td className={tdCls}>{entry.area}</td>
                    <td className={`${tdCls} text-text-muted`}>
                      {formatPing(parseAreaNumber(entry.area))}
                    </td>
                  </tr>
                ))}
                {annexedBuildings.length > 1 && (
                  <tr className="border-b border-border-default bg-bg-secondary/30">
                    <td className={`${tdCls} font-medium`}>小計</td>
                    <td className={`${tdCls} font-medium`}>{formatAreaNumber(annexedArea)}</td>
                    <td className={`${tdCls} text-text-muted`}>{formatPing(annexedArea)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Common areas */}
      {commonAreas.length > 0 && (
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
                </tr>
              </thead>
              <tbody>
                {commonAreas.map((entry, i) => {
                  const shared = getSharedCommonArea(entry.area, entry.ratio);
                  return (
                    <tr key={i} className="border-b border-border-default/50">
                      <td className={tdCls}>{entry.buildingNumber}</td>
                      <td className={tdCls}>{entry.area}</td>
                      <td className={tdCls}>{entry.ratio}</td>
                      <td className={tdCls}>{formatAreaNumber(shared)}</td>
                      <td className={`${tdCls} text-text-muted`}>{formatPing(shared)}</td>
                    </tr>
                  );
                })}
                {commonAreas.length > 1 && (
                  <tr className="border-b border-border-default bg-bg-secondary/30">
                    <td className={`${tdCls} font-medium`} colSpan={3}>小計</td>
                    <td className={`${tdCls} font-medium`}>{formatAreaNumber(commonArea)}</td>
                    <td className={`${tdCls} text-text-muted`}>{formatPing(commonArea)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

function LandSection({ data, warnings }: { data: LandTranscriptData; warnings?: string[] }) {
  const desc = data.description;
  const ownerRatio = data.ownership[0]?.ownershipRatio ?? '';
  const totalArea = parseAreaNumber(desc.area);
  const ratioDecimal = parseShareRatio(ownerRatio);
  const ownedArea = totalArea * ratioDecimal;

  return (
    <SectionCard>
      <h4 className={sectionTitleCls}>
        <MapPin size={16} className="text-accent" />
        土地面積
      </h4>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
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
              <td className={tdCls}>{desc.landNumber}</td>
              <td className={tdCls}>{desc.useZone || '-'}</td>
              <td className={tdCls}>{totalArea > 0 ? desc.area : '-'}</td>
              <td className={tdCls}>{ownerRatio || '-'}</td>
              <td className={tdCls}>{formatAreaNumber(ownedArea) || '-'}</td>
              <td className={`${tdCls} text-text-muted`}>{formatPing(ownedArea) || '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

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

  const grandTotal = buildingTotal + (parkingTotal > 0 ? parkingTotal : 0);

  if (rows.length === 0) return null;

  return (
    <SectionCard>
      <div data-testid="area-summary">
        <h4 className={sectionTitleCls}>
          <BarChart3 size={16} className="text-accent" />
          面積匯總
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
              {grandTotal > 0 && (
                <tr className="border-t-2 border-accent/50 bg-bg-secondary/30">
                  <td className={`${tdCls} font-semibold`}>建物總面積合計</td>
                  <td className={`${tdCls} font-semibold text-accent`}>
                    {formatAreaNumber(grandTotal)}
                  </td>
                  <td className={`${tdCls} font-semibold text-accent`}>
                    {formatPing(grandTotal)} 坪
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SectionCard>
  );
}

/** Collect data quality warnings for a building transcript. */
function collectBuildingWarnings(data: BuildingTranscriptData): string[] {
  const warnings: string[] = [];
  const desc = data.description;
  const resolved = resolveMainBuildings(desc);
  if (resolved.length === 0) {
    warnings.push('主建物面積缺漏，請至「謄本」頁籤確認建物標示部資料。');
  }
  if ((desc.commonAreas ?? []).length === 0) {
    warnings.push('未包含共有部分（公設）資料，請至「謄本」頁籤確認或補充。');
  }
  return warnings;
}

/** Collect data quality warnings for a land transcript. */
function collectLandWarnings(data: LandTranscriptData): string[] {
  const warnings: string[] = [];
  const area = parseAreaNumber(data.description.area);
  if (area <= 0) {
    warnings.push('土地面積數值缺漏，請至「謄本」頁籤確認土地標示部面積欄位。');
  }
  return warnings;
}

export function BuildingLandAreaDetailTab({ property }: Props) {
  const {
    buildingTranscript,
    landTranscript,
    parkingBuildingTranscript,
    parkingLandTranscript,
    isPureLand,
  } = property;

  const hasAnyData = !!(
    buildingTranscript || landTranscript ||
    parkingBuildingTranscript || parkingLandTranscript
  );

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
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">建物土地面積明細表</h3>
      </div>

      {/* Main building */}
      {!isPureLand && buildingTranscript && (
        <BuildingSection
          data={buildingTranscript}
          label="主建物面積明細"
          warnings={buildingWarnings}
        />
      )}

      {/* Land */}
      {landTranscript && (
        <LandSection data={landTranscript} warnings={landWarnings} />
      )}

      {/* Parking building */}
      {parkingBuildingTranscript && (
        <BuildingSection data={parkingBuildingTranscript} label="獨立車位建物面積明細" />
      )}

      {/* Parking land */}
      {parkingLandTranscript && (
        <LandSection data={parkingLandTranscript} />
      )}

      {/* Summary */}
      <AreaSummary
        buildingTranscript={buildingTranscript}
        landTranscript={landTranscript}
        parkingBuildingTranscript={parkingBuildingTranscript}
      />
    </div>
  );
}
