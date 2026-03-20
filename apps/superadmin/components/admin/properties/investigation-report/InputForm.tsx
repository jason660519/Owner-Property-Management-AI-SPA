// filepath: apps/superadmin/components/admin/properties/investigation-report/InputForm.tsx
// 物件調查報告書 — 資料輸入表單 (matching Excel 秘書-input)
'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { InvestigationReport, LandParcel, BuildingAreas, ParkingInfo } from './types';
import { sqmToPing, calcShareArea, calcBuildingTotal } from './types';
import {
  CURRENT_CONDITIONS,
  ORIENTATIONS,
  MAIN_MATERIALS,
  GAS_TYPES,
  SECURITY_OPTIONS,
  PARKING_METHODS,
  PARKING_USAGE,
} from './constants';

// ── Reusable Field Components ──

function Field({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span ? `col-span-${span}` : ''} style={span ? { gridColumn: `span ${span}` } : undefined}>
      <label className="block text-xs text-text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = 'w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-primary text-text-primary text-xs focus:outline-none focus:border-accent placeholder-text-muted';
const selectCls = inputCls;
const readonlyCls = 'w-full border border-border-default rounded-md px-2.5 py-1.5 bg-bg-tertiary text-text-primary text-xs';

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border-default rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-bg-tertiary hover:bg-bg-tertiary/80 transition-colors"
      >
        <span className="text-sm font-medium text-text-primary">{title}</span>
        <ChevronDown size={16} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 py-3 space-y-3">{children}</div>}
    </div>
  );
}

// ── Main Component ──

interface Props {
  report: InvestigationReport;
  onChange: (r: InvestigationReport) => void;
  photos?: import('@/lib/types/properties').PropertyPhotoItem[];
}

export function InputForm({ report, onChange, photos = [] }: Props) {
  function set<K extends keyof InvestigationReport>(key: K, value: InvestigationReport[K]) {
    onChange({ ...report, [key]: value });
  }

  function setLand(index: number, patch: Partial<LandParcel>) {
    const parcels = [...report.landParcels] as [LandParcel, LandParcel, LandParcel];
    parcels[index] = { ...parcels[index], ...patch };
    onChange({ ...report, landParcels: parcels });
  }

  function setBldg(patch: Partial<BuildingAreas>) {
    onChange({ ...report, buildingAreas: { ...report.buildingAreas, ...patch } });
  }

  function setPark(patch: Partial<ParkingInfo>) {
    onChange({ ...report, parking: { ...report.parking, ...patch } });
  }

  function setFeature(index: number, value: string) {
    const features = [...report.features] as [string, string, string, string];
    features[index] = value;
    onChange({ ...report, features });
  }

  const bldgTotal = calcBuildingTotal(report.buildingAreas);

  return (
    <div className="space-y-3">
      {/* ── 1. 案件基本資料 ── */}
      <Section title="一、案件基本資料" defaultOpen>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="案名" span={2}>
            <input className={inputCls} value={report.caseName} onChange={(e) => set('caseName', e.target.value)} placeholder="如：信義住辦" />
          </Field>
          <Field label="租/售">
            <select className={selectCls} value={report.transactionType} onChange={(e) => set('transactionType', e.target.value as 'sale' | 'rental')}>
              <option value="sale">售</option>
              <option value="rental">租</option>
            </select>
          </Field>
          <Field label="總價（萬）">
            <input type="number" className={inputCls} value={report.totalPrice || ''} onChange={(e) => set('totalPrice', Number(e.target.value))} placeholder="0" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="區域（縣市區）">
            <input className={inputCls} value={report.region} onChange={(e) => set('region', e.target.value)} placeholder="台北市信義區" />
          </Field>
          <Field label="路/段/巷/弄">
            <input className={inputCls} value={report.addressStreet} onChange={(e) => set('addressStreet', e.target.value)} placeholder="基隆路二段" />
          </Field>
          <Field label="號樓之幾">
            <input className={inputCls} value={report.addressNumber} onChange={(e) => set('addressNumber', e.target.value)} placeholder="149之49號9樓之1" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="製作單位">
            <input className={inputCls} value={report.agency} onChange={(e) => set('agency', e.target.value)} placeholder="公司全稱" />
          </Field>
          <Field label="經紀營業員">
            <input className={inputCls} value={report.agentName} onChange={(e) => set('agentName', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="製作人員">
            <input className={inputCls} value={report.createdBy} onChange={(e) => set('createdBy', e.target.value)} />
          </Field>
          <Field label="製作日期">
            <input type="date" className={inputCls} value={report.createdDate} onChange={(e) => set('createdDate', e.target.value)} />
          </Field>
          <Field label="審查人員">
            <input className={inputCls} value={report.reviewer} onChange={(e) => set('reviewer', e.target.value)} />
          </Field>
          <Field label="物件編號">
            <input className={inputCls} value={report.propertyNumber} onChange={(e) => set('propertyNumber', e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* ── 2. 建物資訊 ── */}
      <Section title="二、建物資訊">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="建物名稱" span={2}>
            <input className={inputCls} value={report.buildingName} onChange={(e) => set('buildingName', e.target.value)} placeholder="如：都會名園" />
          </Field>
          <Field label="主要用途">
            <input className={inputCls} value={report.mainPurpose} onChange={(e) => set('mainPurpose', e.target.value)} placeholder="見使用執照" />
          </Field>
          <Field label="房屋現況">
            <select className={selectCls} value={report.currentCondition} onChange={(e) => set('currentCondition', e.target.value)}>
              <option value="">請選擇</option>
              {CURRENT_CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="建築完成日">
            <input type="date" className={inputCls} value={report.completionDate} onChange={(e) => set('completionDate', e.target.value)} />
          </Field>
          <Field label="屋齡（年）">
            <input type="number" className={inputCls} value={report.buildingAge || ''} onChange={(e) => set('buildingAge', Number(e.target.value))} />
          </Field>
          <Field label="主要建材">
            <select className={selectCls} value={report.mainMaterial} onChange={(e) => set('mainMaterial', e.target.value)}>
              <option value="">請選擇</option>
              {MAIN_MATERIALS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="格局（房/廳/衛）">
            <input className={inputCls} value={report.layout} onChange={(e) => set('layout', e.target.value)} placeholder="3/2/1" />
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="樓層資訊" span={2}>
            <input className={inputCls} value={report.floorInfo} onChange={(e) => set('floorInfo', e.target.value)} placeholder="地上共12層/地下共1層;本建物在第9層" />
          </Field>
          <Field label="樓層簡寫">
            <input className={inputCls} value={report.floorShort} onChange={(e) => set('floorShort', e.target.value)} placeholder="9/12F" />
          </Field>
          <Field label="座向">
            <select className={selectCls} value={report.orientation} onChange={(e) => set('orientation', e.target.value)}>
              <option value="">請選擇</option>
              {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="同層戶數">
            <input type="number" className={inputCls} value={report.unitsPerFloor || ''} onChange={(e) => set('unitsPerFloor', Number(e.target.value))} />
          </Field>
          <Field label="邊間">
            <select className={selectCls} value={report.isCornerUnit} onChange={(e) => set('isCornerUnit', e.target.value)}>
              <option value="是">是</option>
              <option value="否">否</option>
            </select>
          </Field>
          <Field label="中庭">
            <select className={selectCls} value={report.hasCourt} onChange={(e) => set('hasCourt', e.target.value)}>
              <option value="有">有</option>
              <option value="無">無</option>
            </select>
          </Field>
          <Field label="電梯數">
            <input type="number" className={inputCls} value={report.elevatorCount || ''} onChange={(e) => set('elevatorCount', Number(e.target.value))} />
          </Field>
        </div>
      </Section>

      {/* ── 3. 管理與環境 ── */}
      <Section title="三、管理與環境">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="管理費">
            <select className={selectCls} value={report.hasManagementFee ? '有' : '無'} onChange={(e) => set('hasManagementFee', e.target.value === '有')}>
              <option value="有">有</option>
              <option value="無">無</option>
            </select>
          </Field>
          {report.hasManagementFee && (
            <Field label="管理費（元/月）">
              <input type="number" className={inputCls} value={report.managementFeeAmount || ''} onChange={(e) => set('managementFeeAmount', Number(e.target.value))} />
            </Field>
          )}
          <Field label="警衛管理">
            <select className={selectCls} value={report.security} onChange={(e) => set('security', e.target.value)}>
              <option value="">請選擇</option>
              {SECURITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="瓦斯">
            <select className={selectCls} value={report.gasType} onChange={(e) => set('gasType', e.target.value)}>
              <option value="">請選擇</option>
              {GAS_TYPES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="學區">
            <input className={inputCls} value={report.schoolDistrict} onChange={(e) => set('schoolDistrict', e.target.value)} placeholder="如：三興國小/信義國中" />
          </Field>
          <Field label="看屋方式">
            <input className={inputCls} value={report.viewingMethod} onChange={(e) => set('viewingMethod', e.target.value)} placeholder="如：請洽 02-XXXX-XXXX" />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="空調">
            <input className={inputCls} value={report.airConditioning} onChange={(e) => set('airConditioning', e.target.value)} placeholder="如：獨立冷氣" />
          </Field>
          <Field label="增建部份">
            <input className={inputCls} value={report.additions} onChange={(e) => set('additions', e.target.value)} placeholder="如：陽台外推" />
          </Field>
        </div>
        <Field label="交通條件說明">
          <input className={inputCls} value={report.transportation} onChange={(e) => set('transportation', e.target.value)} placeholder="如：近捷運六張犁站" />
        </Field>
      </Section>

      {/* ── 4. 土地資料（最多 3 筆） ── */}
      <Section title="四、土地資料（最多 3 筆）">
        {report.landParcels.map((parcel, i) => {
          const shareArea = calcShareArea(parcel);
          const isEmpty = !parcel.lotNumber && !parcel.baseArea;
          return (
            <div key={i} className={`space-y-2 ${i > 0 ? 'pt-3 border-t border-border-default/50' : ''}`}>
              <span className="text-xs font-medium text-text-secondary">
                第 {i + 1} 筆{isEmpty && i > 0 ? ' （空白可略）' : ''}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="地號" span={2}>
                  <input className={inputCls} value={parcel.lotNumber} onChange={(e) => setLand(i, { lotNumber: e.target.value })} placeholder="三興段三小段420地號" />
                </Field>
                <Field label="基地面積（㎡）">
                  <input type="number" className={inputCls} value={parcel.baseArea || ''} onChange={(e) => setLand(i, { baseArea: Number(e.target.value) })} />
                </Field>
                <Field label="基地面積（坪）">
                  <div className={readonlyCls}>{sqmToPing(parcel.baseArea)} 坪</div>
                </Field>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="權利範圍-分母">
                  <input type="number" className={inputCls} value={parcel.ownershipDenom || ''} onChange={(e) => setLand(i, { ownershipDenom: Number(e.target.value) })} placeholder="10000" />
                </Field>
                <Field label="權利範圍-分子">
                  <input type="number" className={inputCls} value={parcel.ownershipNumer || ''} onChange={(e) => setLand(i, { ownershipNumer: Number(e.target.value) })} placeholder="57" />
                </Field>
                <Field label="持分面積（㎡）">
                  <div className={readonlyCls}>{shareArea.toFixed(4)}</div>
                </Field>
                <Field label="持分面積（坪）">
                  <div className={readonlyCls}>{sqmToPing(shareArea)} 坪</div>
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="使用分區">
                  <input className={inputCls} value={parcel.zoningType} onChange={(e) => setLand(i, { zoningType: e.target.value })} placeholder="商二" />
                </Field>
                <Field label="建蔽率">
                  <input className={inputCls} value={parcel.buildingCoverage} onChange={(e) => setLand(i, { buildingCoverage: e.target.value })} placeholder="0.65" />
                </Field>
                <Field label="容積率">
                  <input className={inputCls} value={parcel.floorAreaRatio} onChange={(e) => setLand(i, { floorAreaRatio: e.target.value })} placeholder="6.3" />
                </Field>
              </div>
            </div>
          );
        })}
        {/* 土地持分合計 */}
        <div className="pt-3 border-t border-border-default flex items-center gap-4 text-xs">
          <span className="font-medium text-text-secondary">土地持分合計：</span>
          <span className="text-text-primary">
            {report.landParcels.reduce((sum, p) => sum + calcShareArea(p), 0).toFixed(4)} ㎡ ＝{' '}
            {sqmToPing(report.landParcels.reduce((sum, p) => sum + calcShareArea(p), 0))} 坪
          </span>
        </div>
      </Section>

      {/* ── 5. 建物面積 ── */}
      <Section title="五、建物面積">
        <Field label="建號">
          <input className={inputCls} value={report.buildingAreas.buildingNumber} onChange={(e) => setBldg({ buildingNumber: e.target.value })} placeholder="三興段三小段2375,2261建號" />
        </Field>
        {([
          ['主建物', 'mainBuilding'],
          ['陽台/平台/露臺', 'balcony'],
          ['雨遮/花台', 'rainCover'],
          ['公設', 'commonArea'],
          ['地下室公設', 'basementCommon'],
          ['其他(1)', 'other1'],
          ['其他(2)', 'other2'],
        ] as const).map(([label, key]) => (
          <div key={key} className="grid grid-cols-3 gap-3 items-end">
            <Field label={`${label}（㎡）`}>
              <input
                type="number"
                className={inputCls}
                value={report.buildingAreas[key] || ''}
                onChange={(e) => setBldg({ [key]: Number(e.target.value) })}
              />
            </Field>
            <Field label={`${label}（坪）`}>
              <div className={readonlyCls}>{sqmToPing(report.buildingAreas[key])} 坪</div>
            </Field>
            <div />
          </div>
        ))}
        <div className="pt-3 border-t border-border-default grid grid-cols-3 gap-3">
          <Field label="合計（㎡）">
            <div className={`${readonlyCls} font-medium`}>{bldgTotal.toFixed(2)}</div>
          </Field>
          <Field label="合計（坪）">
            <div className={`${readonlyCls} font-medium`}>{sqmToPing(bldgTotal)} 坪</div>
          </Field>
        </div>
      </Section>

      {/* ── 6. 他項限制 + 車位 ── */}
      <Section title="六、他項限制登記 + 車位">
        <Field label="他項限制登記情形">
          <input className={inputCls} value={report.restrictionRegistration} onChange={(e) => set('restrictionRegistration', e.target.value)} placeholder="無" />
        </Field>
        <div className="pt-3 border-t border-border-default/50 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="有無車位">
              <select className={selectCls} value={report.parking.hasParking ? '有' : '無'} onChange={(e) => setPark({ hasParking: e.target.value === '有' })}>
                <option value="有">有</option>
                <option value="無">無</option>
              </select>
            </Field>
            {report.parking.hasParking && (
              <>
                <Field label="車位價（萬）">
                  <input className={inputCls} value={report.parking.parkingPrice} onChange={(e) => setPark({ parkingPrice: e.target.value })} />
                </Field>
                <Field label="車位編號">
                  <input className={inputCls} value={report.parking.spotNumber} onChange={(e) => setPark({ spotNumber: e.target.value })} />
                </Field>
                <Field label="停車管理費（元/月）">
                  <input className={inputCls} value={report.parking.managementFee} onChange={(e) => setPark({ managementFee: e.target.value })} />
                </Field>
              </>
            )}
          </div>
          {report.parking.hasParking && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="可否另租">
                <select className={selectCls} value={report.parking.canRent} onChange={(e) => setPark({ canRent: e.target.value })}>
                  <option value="">請選擇</option>
                  <option value="可">可</option>
                  <option value="不可">不可</option>
                </select>
              </Field>
              <Field label="租金約（元/月）">
                <input className={inputCls} value={report.parking.rentPrice} onChange={(e) => setPark({ rentPrice: e.target.value })} />
              </Field>
              <Field label="使用方式">
                <select className={selectCls} value={report.parking.usageType} onChange={(e) => setPark({ usageType: e.target.value })}>
                  <option value="">請選擇</option>
                  {PARKING_USAGE.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
              <Field label="停車方式">
                <select className={selectCls} value={report.parking.parkingMethod} onChange={(e) => setPark({ parkingMethod: e.target.value })}>
                  <option value="">請選擇</option>
                  {PARKING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>
          )}
        </div>
      </Section>

      {/* ── 7. 特色 ── */}
      <Section title="七、物件特色（最多 4 條）">
        {report.features.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-text-muted w-4 shrink-0">{i + 1}.</span>
            <input className={inputCls} value={f} onChange={(e) => setFeature(i, e.target.value)} placeholder={`特色 ${i + 1}`} />
          </div>
        ))}
      </Section>

      {/* ── 8. 格局圖（從已上傳照片選取） ── */}
      {photos.length > 0 && (
        <Section title="八、格局圖（選擇一張作為報告附圖）">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {/* Clear option */}
            <button
              type="button"
              onClick={() => set('floorPlanPhotoUrl', undefined)}
              className={`aspect-square rounded-md border-2 flex items-center justify-center text-xs transition-colors ${
                !report.floorPlanPhotoUrl
                  ? 'border-accent bg-accent/5 text-accent'
                  : 'border-border-default text-text-muted hover:border-text-muted'
              }`}
            >
              不附
            </button>
            {photos.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set('floorPlanPhotoUrl', p.url)}
                className={`aspect-square rounded-md border-2 overflow-hidden transition-colors ${
                  report.floorPlanPhotoUrl === p.url
                    ? 'border-accent ring-1 ring-accent'
                    : 'border-border-default hover:border-text-muted'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
          {report.floorPlanPhotoUrl && (
            <div className="mt-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={report.floorPlanPhotoUrl}
                alt="格局圖"
                className="max-h-48 rounded-md border border-border-default object-contain"
              />
            </div>
          )}
        </Section>
      )}

      {/* ── 9. 交易條件 ── */}
      <Section title="八、交易條件">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Field label="簽約款比例">
            <input type="number" step="0.01" className={inputCls} value={report.paymentSchedule.firstRatio} onChange={(e) => onChange({ ...report, paymentSchedule: { ...report.paymentSchedule, firstRatio: Number(e.target.value) } })} />
          </Field>
          <Field label="備證用印款比例">
            <input type="number" step="0.01" className={inputCls} value={report.paymentSchedule.secondRatio} onChange={(e) => onChange({ ...report, paymentSchedule: { ...report.paymentSchedule, secondRatio: Number(e.target.value) } })} />
          </Field>
          <Field label="完稅款比例">
            <input type="number" step="0.01" className={inputCls} value={report.paymentSchedule.thirdRatio} onChange={(e) => onChange({ ...report, paymentSchedule: { ...report.paymentSchedule, thirdRatio: Number(e.target.value) } })} />
          </Field>
          <Field label="交屋款比例（含貸款）">
            <input type="number" step="0.01" className={inputCls} value={report.paymentSchedule.fourthRatio} onChange={(e) => onChange({ ...report, paymentSchedule: { ...report.paymentSchedule, fourthRatio: Number(e.target.value) } })} />
          </Field>
        </div>
        {report.totalPrice > 0 && (
          <div className="text-xs text-text-muted space-y-0.5 pt-1">
            <p>簽約款：{(report.totalPrice * report.paymentSchedule.firstRatio).toFixed(1)} 萬</p>
            <p>備證用印款：{(report.totalPrice * report.paymentSchedule.secondRatio).toFixed(1)} 萬</p>
            <p>完稅款：{(report.totalPrice * report.paymentSchedule.thirdRatio).toFixed(1)} 萬</p>
            <p>交屋款：{(report.totalPrice * report.paymentSchedule.fourthRatio).toFixed(1)} 萬</p>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Field label="賣方附贈設備">
            <input className={inputCls} value={report.sellerEquipment} onChange={(e) => set('sellerEquipment', e.target.value)} placeholder="如：無。依固定物交屋" />
          </Field>
          <Field label="交屋情形">
            <input className={inputCls} value={report.deliveryCondition} onChange={(e) => set('deliveryCondition', e.target.value)} placeholder="如：立即" />
          </Field>
        </div>
      </Section>
    </div>
  );
}
