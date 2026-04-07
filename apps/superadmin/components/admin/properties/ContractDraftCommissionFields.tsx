import type { ContractDraftFormState } from './ContractTemplateConfig';
import { NumericInput } from './ContractDraftNumericInput';

interface Props {
  form: ContractDraftFormState;
  setField: <K extends keyof ContractDraftFormState>(key: K, value: ContractDraftFormState[K]) => void;
  /** Whether this commission is for lease or sale */
  commissionFor: 'lease' | 'sale';
}

export function ContractDraftCommissionFields({ form, setField, commissionFor }: Props) {
  const isLease = commissionFor === 'lease';

  return (
    <div className="space-y-4">
      <h5 className="text-sm font-semibold text-text-primary">
        {isLease ? '委託租賃' : '委託銷售'}合約資訊
      </h5>

      {/* Principal & Brokerage */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-secondary">委託人（屋主）</label>
          <input
            type="text"
            value={form.commissionPrincipalName}
            onChange={(e) => setField('commissionPrincipalName', e.target.value)}
            placeholder="委託人姓名"
            className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-secondary">受託仲介公司</label>
          <input
            type="text"
            value={form.commissionBrokerageName}
            onChange={(e) => setField('commissionBrokerageName', e.target.value)}
            placeholder="仲介公司名稱"
            className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>
      </div>

      {/* Commission type */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-secondary">委託方式</label>
        <select
          value={form.commissionType}
          onChange={(e) => setField('commissionType', e.target.value as ContractDraftFormState['commissionType'])}
          className="w-full max-w-xs rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        >
          <option value="">請選擇</option>
          <option value="exclusive">專任委託（限由本仲介銷售/出租）</option>
          <option value="general">一般委託（可同時委託多家仲介）</option>
        </select>
      </div>

      {/* Commission period */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-secondary">委託起始日</label>
          <input
            type="date"
            value={form.commissionStartDate}
            onChange={(e) => setField('commissionStartDate', e.target.value)}
            className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-secondary">委託到期日</label>
          <input
            type="date"
            value={form.commissionEndDate}
            onChange={(e) => setField('commissionEndDate', e.target.value)}
            className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-secondary">
            {isLease ? '委託租金（月）' : '委託售價'}
          </label>
          <NumericInput
            value={form.commissionListingPrice}
            onChange={(v: number | '') => setField('commissionListingPrice', typeof v === 'number' ? v : 0)}
            min={0}
            placeholder={isLease ? '月租金' : '委託售價'}
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-text-secondary">
            {isLease ? '最低可接受租金（月）' : '底價（最低可接受價格）'}
          </label>
          <NumericInput
            value={form.commissionFloorPrice}
            onChange={(v: number | '') => setField('commissionFloorPrice', typeof v === 'number' ? v : 0)}
            min={0}
            placeholder={isLease ? '最低月租金' : '底價'}
          />
        </div>
      </div>

      {/* Commission fee */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-text-secondary">服務報酬</label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <span className="text-xs text-text-muted">
              按成交價 %（{isLease ? '通常為 0.5~1 個月租金' : '通常為 1%~4%'}）
            </span>
            <NumericInput
              value={form.commissionRatePercent}
              onChange={(v: number | '') => setField('commissionRatePercent', typeof v === 'number' ? v : 0)}
              min={0}
              max={100}
              allowDecimal
              placeholder="佣金比例 %"
            />
          </div>
          <div className="space-y-1">
            <span className="text-xs text-text-muted">或固定金額（新台幣）</span>
            <NumericInput
              value={form.commissionFixedFee}
              onChange={(v: number | '') => setField('commissionFixedFee', typeof v === 'number' ? v : 0)}
              min={0}
              placeholder="固定金額"
            />
          </div>
        </div>
      </div>

      {/* Marketing methods */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-secondary">
          授權行銷方式
        </label>
        <textarea
          value={form.commissionMarketingMethods}
          onChange={(e) => setField('commissionMarketingMethods', e.target.value)}
          placeholder="例如：實體看板、網路平台刊登（591/信義房屋/樂屋網）、社群媒體廣告、開放看屋日等"
          rows={3}
          className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        />
      </div>

      {/* Special terms */}
      <div className="space-y-1">
        <label className="text-sm font-medium text-text-secondary">
          委託特約事項
        </label>
        <textarea
          value={form.commissionSpecialTerms}
          onChange={(e) => setField('commissionSpecialTerms', e.target.value)}
          placeholder="例如：限定帶看時段、不得擅自降價、鑰匙管理方式等"
          rows={3}
          className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
        />
      </div>
    </div>
  );
}
