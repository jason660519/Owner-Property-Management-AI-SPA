// filepath: apps/superadmin/components/admin/properties/investigation-report/ReportPreview.tsx
// 物件調查報告書 — 預覽 + 列印 (matching Excel output sheets 1~7)
'use client';

import { useRef, useCallback } from 'react';
import { Printer } from 'lucide-react';
import type { InvestigationReport } from './types';
import { sqmToPing, calcShareArea, calcBuildingTotal } from './types';
import { PREDEFINED_NOTES } from './constants';

interface Props {
  report: InvestigationReport;
}

const fullAddress = (r: InvestigationReport) =>
  [r.region, r.addressStreet, r.addressNumber].filter(Boolean).join(' ');

const tLabel = (r: InvestigationReport) => (r.transactionType === 'sale' ? '售' : '租');

function PageBreak() {
  return <div className="border-t-2 border-dashed border-border-default my-6" />;
}

function PrintRow({ label, value, className }: { label: string; value: string | number; className?: string }) {
  return (
    <div className={`flex gap-2 py-1 ${className ?? ''}`}>
      <span className="text-xs text-text-muted shrink-0 w-28">{label}</span>
      <span className="text-xs text-text-primary">{value || '—'}</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-text-primary border-b border-border-default pb-1 mb-3">
      {children}
    </h3>
  );
}

const PRINT_CSS = `
@page { size: A4; margin: 15mm; }
body { font-family: "PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif; font-size: 11px; color: #111; line-height: 1.6; }
h2 { font-size: 18px; text-align: center; margin: 24px 0 8px; }
h3 { font-size: 13px; border-bottom: 1px solid #333; padding-bottom: 4px; margin: 16px 0 8px; }
.row { display: flex; gap: 8px; padding: 2px 0; }
.row .lbl { width: 110px; flex-shrink: 0; color: #555; }
table { width: 100%; border-collapse: collapse; margin: 8px 0; }
th, td { border: 1px solid #999; padding: 3px 6px; text-align: left; font-size: 10px; }
th { background: #f0f0f0; font-weight: 600; }
.page-break { page-break-before: always; }
`;

export function ReportPreview({ report }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const bldgTotal = calcBuildingTotal(report.buildingAreas);
  const b = report.buildingAreas;

  const handlePrint = useCallback(() => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const htmlDoc = [
      '<!DOCTYPE html><html><head><meta charset="utf-8"/>',
      `<title>物件調查報告書 - ${report.caseName || '未命名'}</title>`,
      `<style>${PRINT_CSS}</style>`,
      '</head><body>',
      content,
      '</body></html>',
    ].join('');
    const blob = new Blob([htmlDoc], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        URL.revokeObjectURL(url);
      };
    }
  }, [report.caseName]);

  const selectedNoteTexts = report.selectedNotes
    .map((id) => PREDEFINED_NOTES.find((n) => n.id === id)?.text)
    .filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-text-primary">報告書預覽</h4>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white text-sm rounded-md hover:bg-accent-hover transition-colors"
        >
          <Printer size={14} />
          列印報告書
        </button>
      </div>

      <div
        ref={printRef}
        className="bg-bg-primary border border-border-default rounded-lg p-6 space-y-6 text-text-primary"
      >
        {/* ── Page 1: 封面 ── */}
        <div>
          <h2 className="text-lg font-bold text-center mb-8">不動產說明書</h2>
          <div className="text-center space-y-4 py-12">
            <div>
              <span className="text-xs text-text-muted">物件名稱</span>
              <p className="text-xl font-bold mt-1">{report.caseName || '—'}</p>
            </div>
            <div>
              <span className="text-xs text-text-muted">地址</span>
              <p className="text-base mt-1">{fullAddress(report) || '—'}</p>
            </div>
          </div>
        </div>

        <PageBreak />

        {/* ── Page 2: 物件個案調查表（第1頁） ── */}
        <div>
          <SectionTitle>物件個案調查表 — {tLabel(report)}</SectionTitle>
          <div className="grid grid-cols-2 gap-x-6">
            <div>
              <PrintRow label="案名" value={report.caseName} />
              <PrintRow label="路段" value={`${report.region} ${report.addressStreet}`} />
              <PrintRow label="建物名稱" value={report.buildingName} />
              <PrintRow label="建築完成日" value={report.completionDate} />
              <PrintRow label="屋齡" value={report.buildingAge ? `${report.buildingAge} 年` : ''} />
              <PrintRow label="樓層" value={report.floorInfo} />
              <PrintRow label="格局" value={report.layout} />
              <PrintRow label="主要用途" value={report.mainPurpose} />
              <PrintRow label="主要建材" value={report.mainMaterial} />
              <PrintRow label="座向" value={report.orientation} />
              <PrintRow label="同層戶數" value={report.unitsPerFloor ? `${report.unitsPerFloor} 戶` : ''} />
              <PrintRow label="邊間" value={report.isCornerUnit} />
              <PrintRow label="中庭" value={report.hasCourt} />
              <PrintRow label="電梯數" value={report.elevatorCount || ''} />
              <PrintRow label="管理費" value={report.hasManagementFee ? `有，約 ${report.managementFeeAmount} 元/月` : '無'} />
              <PrintRow label="警衛管理" value={report.security} />
              <PrintRow label="瓦斯" value={report.gasType} />
              <PrintRow label="增建部份" value={report.additions} />
              <PrintRow label="學區" value={report.schoolDistrict} />
              <PrintRow label="看屋方式" value={report.viewingMethod} />
            </div>
            <div>
              <PrintRow label="坪數" value={`${sqmToPing(bldgTotal)} 坪`} />
              <PrintRow label={report.transactionType === 'sale' ? '售價' : '租金'} value={`${report.totalPrice} 萬`} />
              <div className="mt-3 border-t border-border-default/50 pt-2">
                <span className="text-xs font-medium text-text-secondary">建物面積</span>
                <PrintRow label="主建物" value={`${sqmToPing(b.mainBuilding)} 坪`} />
                <PrintRow label="陽台" value={`${sqmToPing(b.balcony)} 坪`} />
                <PrintRow label="雨遮" value={`${sqmToPing(b.rainCover)} 坪`} />
                <PrintRow label="公設" value={`${sqmToPing(b.commonArea)} 坪`} />
                <PrintRow label="地下室公設" value={`${sqmToPing(b.basementCommon)} 坪`} />
                {b.other1 > 0 && <PrintRow label="其他" value={`${sqmToPing(b.other1)} 坪`} />}
                {b.other2 > 0 && <PrintRow label="其他" value={`${sqmToPing(b.other2)} 坪`} />}
                <PrintRow label="合計" value={`${sqmToPing(bldgTotal)} 坪`} className="font-medium" />
              </div>
              <div className="mt-3 border-t border-border-default/50 pt-2">
                <span className="text-xs font-medium text-text-secondary">土地</span>
                {report.landParcels.filter((p) => p.lotNumber).map((p, i) => (
                  <div key={i} className="ml-2">
                    <PrintRow label="地號" value={p.lotNumber} />
                    <PrintRow label="分區" value={p.zoningType} />
                    <PrintRow label="基地面積" value={`${sqmToPing(p.baseArea)} 坪`} />
                    <PrintRow label="持分" value={`${sqmToPing(calcShareArea(p))} 坪`} />
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-border-default/50 pt-2">
                <span className="text-xs font-medium text-text-secondary">車位</span>
                <PrintRow label="有無車位" value={report.parking.hasParking ? '有' : '無'} />
                {report.parking.hasParking && (
                  <>
                    <PrintRow label="車位價" value={`${report.parking.parkingPrice} 萬`} />
                    <PrintRow label="車位編號" value={report.parking.spotNumber} />
                    <PrintRow label="停車方式" value={report.parking.parkingMethod} />
                  </>
                )}
              </div>
            </div>
          </div>
          {report.features.some(Boolean) && (
            <div className="mt-3 pt-2 border-t border-border-default/50">
              <span className="text-xs font-medium text-text-secondary">特色</span>
              {report.features.filter(Boolean).map((f, i) => (
                <p key={i} className="text-xs text-text-primary ml-2">{i + 1}. {f}</p>
              ))}
            </div>
          )}
          {selectedNoteTexts.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border-default/50">
              <span className="text-xs font-medium text-red-500">注意事項</span>
              {selectedNoteTexts.map((t, i) => (
                <p key={i} className="text-xs text-text-primary ml-2 leading-relaxed">* {t}</p>
              ))}
            </div>
          )}
        </div>

        <PageBreak />

        {/* ── Page 3: 簽名頁 ── */}
        <div>
          <SectionTitle>不動產說明書 — 簽名頁</SectionTitle>
          <PrintRow label="一、銷售案名" value={report.caseName} />
          <PrintRow label="二、建物門牌" value={fullAddress(report)} />
          <PrintRow label="三、製作單位" value={report.agency} />
          <p className="text-xs text-text-secondary mt-3 mb-2">
            四、本說明書係依地政事務所核發之謄本為準，內容及附件如下：
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary ml-4">
            <div>
              <p className="font-medium mb-1">主要內容</p>
              <p>產權調查篇</p>
              <p>物件現況調查篇</p>
              <p>位置與格間圖</p>
              <p>圖片說明書</p>
            </div>
            <div>
              <p className="font-medium mb-1">附件內容</p>
              <p>土地權狀影本</p>
              <p>建物權狀影本</p>
              <p>土地謄本</p>
              <p>建物謄本</p>
              <p>都市使用分區證明</p>
              <p>建築改良物使用執照</p>
            </div>
            <div>
              <p className="font-medium mb-1">其他</p>
              <p>地籍圖</p>
              <p>建物平面圖</p>
              <p>海砂檢測報告</p>
              <p>輻射檢測報告</p>
              <p>住戶規約</p>
              <p>車位平面圖</p>
            </div>
          </div>
          <div className="mt-6 space-y-4 text-xs">
            <div className="flex items-end gap-4">
              <span className="text-text-muted w-32">所有權人(賣方)：</span>
              <span className="flex-1 border-b border-border-default h-8" />
              <span className="text-text-muted">（簽章）</span>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-text-muted w-32">買　　　方：</span>
              <span className="flex-1 border-b border-border-default h-8" />
              <span className="text-text-muted">（簽章）</span>
            </div>
            <div className="flex items-end gap-4">
              <span className="text-text-muted w-32">經　紀　人：</span>
              <span className="flex-1 border-b border-border-default h-8" />
              <span className="text-text-muted w-24">營業員：</span>
              <span className="flex-1 border-b border-border-default h-8" />
            </div>
          </div>
        </div>

        <PageBreak />

        {/* ── Page 4: 建物+車位 ── */}
        <div>
          <SectionTitle>二、建物標示</SectionTitle>
          <PrintRow label="地址" value={fullAddress(report)} />
          <PrintRow label="建號" value={b.buildingNumber} />
          <table className="mt-2 text-xs">
            <thead>
              <tr><th>項目</th><th>面積（㎡）</th><th>面積（坪）</th></tr>
            </thead>
            <tbody>
              {[
                ['主建物', b.mainBuilding],
                ['陽台', b.balcony],
                ['雨遮', b.rainCover],
                ['公設', b.commonArea],
                ['地下室公設', b.basementCommon],
                ...(b.other1 > 0 ? [['其他', b.other1]] : []),
                ...(b.other2 > 0 ? [['其他', b.other2]] : []),
              ].map(([name, area], i) => (
                <tr key={i}>
                  <td>{name}</td>
                  <td>{(area as number).toFixed(2)}</td>
                  <td>{sqmToPing(area as number)}</td>
                </tr>
              ))}
              <tr className="font-medium">
                <td>合計</td>
                <td>{bldgTotal.toFixed(2)}</td>
                <td>{sqmToPing(bldgTotal)}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-4">
            <SectionTitle>車位</SectionTitle>
            <PrintRow label="有無車位" value={report.parking.hasParking ? '有' : '無'} />
            {report.parking.hasParking && (
              <>
                <PrintRow label="車位價" value={`${report.parking.parkingPrice} 萬`} />
                <PrintRow label="可否另租" value={report.parking.canRent} />
                <PrintRow label="車位編號" value={report.parking.spotNumber} />
                <PrintRow label="使用方式" value={report.parking.usageType} />
                <PrintRow label="停車方式" value={report.parking.parkingMethod} />
                <PrintRow label="停車管理費" value={`${report.parking.managementFee} 元/月`} />
              </>
            )}
          </div>
          <PrintRow label="限制登記情形" value={report.restrictionRegistration} className="mt-3" />
        </div>

        <PageBreak />

        {/* ── Page 5: 土地 ── */}
        <div>
          <SectionTitle>一、土地標示</SectionTitle>
          {report.landParcels.filter((p) => p.lotNumber).map((p, i) => (
            <div key={i} className={i > 0 ? 'mt-4 pt-3 border-t border-border-default/50' : ''}>
              <PrintRow label="座落" value={`${report.region} ${p.lotNumber}`} />
              <PrintRow label="基地面積" value={`${p.baseArea} ㎡，約 ${sqmToPing(p.baseArea)} 坪`} />
              <PrintRow label="權利範圍" value={`${p.ownershipDenom} 分之 ${p.ownershipNumer}`} />
              <PrintRow label="持分面積" value={`${calcShareArea(p).toFixed(4)} ㎡，約 ${sqmToPing(calcShareArea(p))} 坪`} />
              <PrintRow label="使用分區" value={p.zoningType} />
              <PrintRow label="建蔽率" value={p.buildingCoverage} />
              <PrintRow label="容積率" value={p.floorAreaRatio} />
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-border-default font-medium">
            <PrintRow
              label="土地持分合計"
              value={`${sqmToPing(report.landParcels.reduce((s, p) => s + calcShareArea(p), 0))} 坪`}
            />
          </div>
          <PrintRow label="限制登記情形" value={report.restrictionRegistration} className="mt-3" />
        </div>

        <PageBreak />

        {/* ── Page 6: 其他交易條件 ── */}
        <div>
          <SectionTitle>其他交易條件</SectionTitle>
          <PrintRow label="交易種類" value={tLabel(report)} />
          <PrintRow label="委託總價金" value={`${report.totalPrice} 萬`} />
          <div className="mt-3">
            <span className="text-xs font-medium text-text-secondary">付款方式</span>
            <table className="mt-1 text-xs">
              <thead>
                <tr><th>期別</th><th>比例</th><th>金額（萬）</th></tr>
              </thead>
              <tbody>
                {[
                  ['第一期款（簽約款）', report.paymentSchedule.firstRatio],
                  ['第二期款（備證用印款）', report.paymentSchedule.secondRatio],
                  ['第三期款（完稅款）', report.paymentSchedule.thirdRatio],
                  ['第四期款（交屋款，含貸款）', report.paymentSchedule.fourthRatio],
                ].map(([label, ratio], i) => (
                  <tr key={i}>
                    <td>{label}</td>
                    <td>{((ratio as number) * 100).toFixed(0)}%</td>
                    <td>{(report.totalPrice * (ratio as number)).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <PrintRow label="賣方附贈設備" value={report.sellerEquipment || '無。依固定物交屋'} />
            <PrintRow label="交屋情形" value={report.deliveryCondition} />
            <PrintRow label="主要用途" value={report.mainPurpose} />
            <PrintRow label="交通條件說明" value={report.transportation} />
          </div>
        </div>

        <PageBreak />

        {/* ── Page 7: 相關費用 ── */}
        <div>
          <SectionTitle>相關費用說明</SectionTitle>
          <div className="space-y-3 text-xs">
            <div>
              <p className="font-medium text-text-secondary mb-1">【賣方支付項目】</p>
              <ol className="list-decimal ml-4 space-y-0.5 text-text-primary">
                <li>土地增值稅：依稅捐機關核定</li>
                <li>工程受益費：簽約日前已開徵者由賣方負擔</li>
                <li>地價稅：交屋日依實際使用比例分算</li>
                <li>房屋稅：交屋日依實際使用比例分算</li>
                <li>水、電、瓦斯費、管理費等雜項費用（依實際使用比例分算）</li>
                <li>抵押權塗銷代書費</li>
                <li>財產交易所得稅（併入綜合所得申報）</li>
                <li>仲介服務費：按實際成交價格的百分之四</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-text-secondary mb-1">【買方支付項目】</p>
              <ol className="list-decimal ml-4 space-y-0.5 text-text-primary">
                <li>契稅：按核定契價 × 6%</li>
                <li>印花稅：按核定契價 + (土地公告現值 × 面積 × 持份) × 0.1%</li>
                <li>過戶代書費：約新台幣 18,000 元</li>
                <li>地價稅：交屋日依實際使用比例分算</li>
                <li>房屋稅：交屋日依實際使用比例分算</li>
                <li>水、電、瓦斯費、管理費等雜項費用（依實際使用比例分算）</li>
                <li>工程受益費：視公告狀況由雙方分擔</li>
                <li>登記規費：依核定</li>
                <li>仲介服務費：按實際成交價格的百分之二</li>
              </ol>
            </div>
            <p className="text-text-muted text-[10px]">
              附註：以上買賣雙方支付項目為一般原則，若雙方另以契約約定從其約定。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
