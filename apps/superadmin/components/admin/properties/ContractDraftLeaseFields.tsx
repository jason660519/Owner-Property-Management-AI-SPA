'use client';

import type { ContractDraftFormState } from './ContractTemplateConfig';
import { NumericInput } from './ContractDraftNumericInput';

const INPUT_CLS = 'w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary';
const LABEL_CLS = 'text-sm font-medium text-text-secondary';

interface Props {
  form: ContractDraftFormState;
  setField: <K extends keyof ContractDraftFormState>(key: K, value: ContractDraftFormState[K]) => void;
}

export function ContractDraftLeaseFields({ form, setField }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-1">
        <label htmlFor="tenantName" className={LABEL_CLS}>承租人姓名</label>
        <input
          id="tenantName"
          value={form.tenantName}
          onChange={(e) => setField('tenantName', e.target.value)}
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="paymentDueDay" className={LABEL_CLS}>每月付款日</label>
        <NumericInput
          id="paymentDueDay"
          min={1}
          max={31}
          value={form.paymentDueDay}
          onChange={(v) => setField('paymentDueDay', typeof v === 'number' ? v : 1)}
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="usePurpose" className={LABEL_CLS}>使用用途</label>
        <select
          id="usePurpose"
          value={form.usePurpose}
          onChange={(e) => setField('usePurpose', e.target.value as ContractDraftFormState['usePurpose'])}
          className={INPUT_CLS}
        >
          <option value="">請選擇</option>
          <option value="residential">住宅</option>
          <option value="office">辦公</option>
          <option value="commercial">商業</option>
          <option value="other">其他</option>
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="contractCopiesCount" className={LABEL_CLS}>契約分存份數</label>
        <NumericInput
          id="contractCopiesCount"
          min={1}
          value={form.contractCopiesCount}
          onChange={(v) => setField('contractCopiesCount', typeof v === 'number' ? v : 1)}
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="holdoverPenaltyMultiple" className={LABEL_CLS}>返還遲延違約金倍數</label>
        <NumericInput
          id="holdoverPenaltyMultiple"
          min={0.1}
          value={form.holdoverPenaltyMultiple}
          onChange={(v) => setField('holdoverPenaltyMultiple', v)}
          allowDecimal
          allowEmpty
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="leaseStartDate" className={LABEL_CLS}>租期起日</label>
        <input
          id="leaseStartDate"
          type="date"
          value={form.leaseStartDate}
          onChange={(e) => setField('leaseStartDate', e.target.value)}
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="leaseEndDate" className={LABEL_CLS}>租期迄日</label>
        <input
          id="leaseEndDate"
          type="date"
          value={form.leaseEndDate}
          onChange={(e) => setField('leaseEndDate', e.target.value)}
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="monthlyRent" className={LABEL_CLS}>月租金</label>
        <NumericInput
          id="monthlyRent"
          min={0}
          value={form.monthlyRent}
          onChange={(v) => setField('monthlyRent', typeof v === 'number' ? v : 0)}
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="depositAmount" className={LABEL_CLS}>押金</label>
        <NumericInput
          id="depositAmount"
          min={0}
          value={form.depositAmount}
          onChange={(v) => setField('depositAmount', typeof v === 'number' ? v : 0)}
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <label htmlFor="includedItems" className={LABEL_CLS}>附屬設備</label>
        <textarea
          id="includedItems"
          value={form.includedItemsInput}
          onChange={(e) => setField('includedItemsInput', e.target.value)}
          rows={3}
          placeholder="例如：冷氣, 冰箱, 熱水器"
          className={INPUT_CLS}
        />
      </div>
      <div className="space-y-1 md:col-span-2">
        <label htmlFor="specialTerms" className={LABEL_CLS}>其他特約</label>
        <textarea
          id="specialTerms"
          value={form.specialTerms}
          onChange={(e) => setField('specialTerms', e.target.value)}
          rows={3}
          className={INPUT_CLS}
        />
      </div>
    </div>
  );
}
