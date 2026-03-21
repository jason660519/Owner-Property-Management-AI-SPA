'use client';

import type { SalePaymentMilestone } from '@/lib/types/contracts';
import type { ContractDraftFormState } from './ContractTemplateConfig';
import { NumericInput } from './ContractDraftNumericInput';

const INPUT_CLS = 'w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary';
const LABEL_CLS = 'text-sm font-medium text-text-secondary';

interface Props {
  form: ContractDraftFormState;
  setField: <K extends keyof ContractDraftFormState>(key: K, value: ContractDraftFormState[K]) => void;
  onSalePriceTotalChange: (value: number) => void;
  onUpdatePaymentSchedule: (index: number, field: keyof SalePaymentMilestone, value: string) => void;
}

export function ContractDraftSaleFields({ form, setField, onSalePriceTotalChange, onUpdatePaymentSchedule }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="buyerName" className={LABEL_CLS}>買方姓名</label>
          <input id="buyerName" value={form.buyerName} onChange={(e) => setField('buyerName', e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="agentName" className={LABEL_CLS}>仲介經紀人</label>
          <input id="agentName" value={form.agentName} onChange={(e) => setField('agentName', e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="brokerName" className={LABEL_CLS}>仲介公司</label>
          <input id="brokerName" value={form.brokerName} onChange={(e) => setField('brokerName', e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="scrivenerName" className={LABEL_CLS}>代書／地政士</label>
          <input id="scrivenerName" value={form.scrivenerName} onChange={(e) => setField('scrivenerName', e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="salePriceTotal" className={LABEL_CLS}>買賣總價</label>
          <NumericInput
            id="salePriceTotal"
            min={0}
            value={form.salePriceTotal}
            onChange={(v) => onSalePriceTotalChange(typeof v === 'number' ? v : 0)}
            className={INPUT_CLS}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="ownershipTransferDate" className={LABEL_CLS}>過戶日</label>
          <input id="ownershipTransferDate" type="date" value={form.ownershipTransferDate} onChange={(e) => setField('ownershipTransferDate', e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="handoverDate" className={LABEL_CLS}>交屋日</label>
          <input id="handoverDate" type="date" value={form.handoverDate} onChange={(e) => setField('handoverDate', e.target.value)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="landPrice" className={LABEL_CLS}>土地價款</label>
          <NumericInput id="landPrice" min={0} value={form.landPrice} onChange={(v) => setField('landPrice', typeof v === 'number' ? v : 0)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="buildingPrice" className={LABEL_CLS}>建物價款</label>
          <NumericInput id="buildingPrice" min={0} value={form.buildingPrice} onChange={(v) => setField('buildingPrice', typeof v === 'number' ? v : 0)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="parkingLandPrice" className={LABEL_CLS}>車位土地價款</label>
          <NumericInput id="parkingLandPrice" min={0} value={form.parkingLandPrice} onChange={(v) => setField('parkingLandPrice', typeof v === 'number' ? v : 0)} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="parkingBuildingPrice" className={LABEL_CLS}>車位建物價款</label>
          <NumericInput id="parkingBuildingPrice" min={0} value={form.parkingBuildingPrice} onChange={(v) => setField('parkingBuildingPrice', typeof v === 'number' ? v : 0)} className={INPUT_CLS} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="deliveryCondition" className={LABEL_CLS}>交屋現況</label>
        <textarea id="deliveryCondition" value={form.deliveryCondition} onChange={(e) => setField('deliveryCondition', e.target.value)} rows={3} className={INPUT_CLS} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="taxAllocation" className={LABEL_CLS}>稅費負擔</label>
          <textarea id="taxAllocation" value={form.taxAllocation} onChange={(e) => setField('taxAllocation', e.target.value)} rows={3} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="registrationFeeAllocation" className={LABEL_CLS}>登記規費分擔</label>
          <textarea id="registrationFeeAllocation" value={form.registrationFeeAllocation} onChange={(e) => setField('registrationFeeAllocation', e.target.value)} rows={3} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="brokerFeeAllocation" className={LABEL_CLS}>仲介費分擔</label>
          <textarea id="brokerFeeAllocation" value={form.brokerFeeAllocation} onChange={(e) => setField('brokerFeeAllocation', e.target.value)} rows={3} className={INPUT_CLS} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="escrowMethod" className={LABEL_CLS}>履約保證／價金保管方式</label>
          <textarea id="escrowMethod" value={form.escrowMethod} onChange={(e) => setField('escrowMethod', e.target.value)} rows={3} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="defaultClauseSummary" className={LABEL_CLS}>特約條款摘要</label>
          <textarea id="defaultClauseSummary" value={form.defaultClauseSummary} onChange={(e) => setField('defaultClauseSummary', e.target.value)} rows={3} className={INPUT_CLS} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <label htmlFor="occupiedByOthersCondition" className={LABEL_CLS}>建物被他人占用情形</label>
          <textarea id="occupiedByOthersCondition" value={form.occupiedByOthersCondition} onChange={(e) => setField('occupiedByOthersCondition', e.target.value)} rows={3} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="encroachmentCondition" className={LABEL_CLS}>占用他人土地情形</label>
          <textarea id="encroachmentCondition" value={form.encroachmentCondition} onChange={(e) => setField('encroachmentCondition', e.target.value)} rows={3} className={INPUT_CLS} />
        </div>
        <div className="space-y-1">
          <label htmlFor="leaseBorrowCondition" className={LABEL_CLS}>出租或出借情形</label>
          <textarea id="leaseBorrowCondition" value={form.leaseBorrowCondition} onChange={(e) => setField('leaseBorrowCondition', e.target.value)} rows={3} className={INPUT_CLS} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="copyRetentionHolder" className={LABEL_CLS}>副本留存人</label>
        <input id="copyRetentionHolder" value={form.copyRetentionHolder} onChange={(e) => setField('copyRetentionHolder', e.target.value)} className={INPUT_CLS} />
      </div>

      <div className="rounded-xl border border-border-default bg-bg-secondary/40 p-4 space-y-3">
        <div className="text-sm font-medium text-text-primary">付款節點</div>
        {form.paymentSchedule.map((item, index) => (
          <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr]">
            <input
              aria-label={`付款節點名稱-${index + 1}`}
              value={item.label}
              onChange={(e) => onUpdatePaymentSchedule(index, 'label', e.target.value)}
              className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            />
            <NumericInput
              aria-label={`付款節點金額-${index + 1}`}
              min={0}
              value={item.amount}
              onChange={(v) => onUpdatePaymentSchedule(index, 'amount', String(typeof v === 'number' ? v : 0))}
              className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            />
            <input
              aria-label={`付款節點日期-${index + 1}`}
              type="date"
              value={item.dueDate}
              onChange={(e) => onUpdatePaymentSchedule(index, 'dueDate', e.target.value)}
              className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
