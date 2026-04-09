import type { ContractDraftFormState } from './ContractTemplateConfig';
import { NumericInput } from './ContractDraftNumericInput';

const INPUT_CLS = 'w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary';
const LABEL_CLS = 'text-sm font-medium text-text-secondary';

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
          <label htmlFor="commissionPrincipalName" className={LABEL_CLS}>委託人（屋主）</label>
          <input
            id="commissionPrincipalName"
            type="text"
            value={form.commissionPrincipalName}
            onChange={(e) => setField('commissionPrincipalName', e.target.value)}
            placeholder="委託人姓名"
            className={INPUT_CLS}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="commissionBrokerageName" className={LABEL_CLS}>受託仲介公司</label>
          <input
            id="commissionBrokerageName"
            type="text"
            value={form.commissionBrokerageName}
            onChange={(e) => setField('commissionBrokerageName', e.target.value)}
            placeholder="仲介公司名稱"
            className={INPUT_CLS}
          />
        </div>
      </div>

      {/* Commission type */}
      <div className="space-y-1">
        <label htmlFor="commissionType" className={LABEL_CLS}>委託方式</label>
        <select
          id="commissionType"
          value={form.commissionType}
          onChange={(e) => setField('commissionType', e.target.value as ContractDraftFormState['commissionType'])}
          className={`${INPUT_CLS} max-w-xs`}
        >
          <option value="">請選擇</option>
          <option value="exclusive">專任委託（限由本仲介銷售/出租）</option>
          <option value="general">一般委託（可同時委託多家仲介）</option>
        </select>
      </div>

      {/* Commission period */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="commissionStartDate" className={LABEL_CLS}>委託起始日</label>
          <input
            id="commissionStartDate"
            type="date"
            value={form.commissionStartDate}
            onChange={(e) => setField('commissionStartDate', e.target.value)}
            className={INPUT_CLS}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="commissionEndDate" className={LABEL_CLS}>委託到期日</label>
          <input
            id="commissionEndDate"
            type="date"
            value={form.commissionEndDate}
            onChange={(e) => setField('commissionEndDate', e.target.value)}
            className={INPUT_CLS}
          />
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="commissionListingPrice" className={LABEL_CLS}>
            {isLease ? '委託租金（月）' : '委託售價'}
          </label>
          <NumericInput
            id="commissionListingPrice"
            value={form.commissionListingPrice}
            onChange={(v: number | '') => setField('commissionListingPrice', typeof v === 'number' ? v : 0)}
            min={0}
            placeholder={isLease ? '月租金' : '委託售價'}
            className={INPUT_CLS}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="commissionFloorPrice" className={LABEL_CLS}>
            {isLease ? '最低可接受租金（月）' : '底價（最低可接受價格）'}
          </label>
          <NumericInput
            id="commissionFloorPrice"
            value={form.commissionFloorPrice}
            onChange={(v: number | '') => setField('commissionFloorPrice', typeof v === 'number' ? v : 0)}
            min={0}
            placeholder={isLease ? '最低月租金' : '底價'}
            className={INPUT_CLS}
          />
        </div>
      </div>

      {/* Commission fee */}
      <div className="space-y-2">
        <span className={LABEL_CLS}>服務報酬</span>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor="commissionRatePercent" className="text-xs text-text-muted">
              按成交價 %（{isLease ? '通常為 0.5~1 個月租金' : '通常為 1%~4%'}）
            </label>
            <NumericInput
              id="commissionRatePercent"
              value={form.commissionRatePercent}
              onChange={(v: number | '') => setField('commissionRatePercent', typeof v === 'number' ? v : 0)}
              min={0}
              max={100}
              allowDecimal
              placeholder="佣金比例 %"
              className={INPUT_CLS}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="commissionFixedFee" className="text-xs text-text-muted">或固定金額（新台幣）</label>
            <NumericInput
              id="commissionFixedFee"
              value={form.commissionFixedFee}
              onChange={(v: number | '') => setField('commissionFixedFee', typeof v === 'number' ? v : 0)}
              min={0}
              placeholder="固定金額"
              className={INPUT_CLS}
            />
          </div>
        </div>
      </div>

      {/* Marketing methods */}
      <div className="space-y-1">
        <label htmlFor="commissionMarketingMethods" className={LABEL_CLS}>
          授權行銷方式
        </label>
        <textarea
          id="commissionMarketingMethods"
          value={form.commissionMarketingMethods}
          onChange={(e) => setField('commissionMarketingMethods', e.target.value)}
          placeholder="例如：實體看板、網路平台刊登（591/信義房屋/樂屋網）、社群媒體廣告、開放看屋日等"
          rows={3}
          className={INPUT_CLS}
        />
      </div>

      {/* Special terms */}
      <div className="space-y-1">
        <label htmlFor="commissionSpecialTerms" className={LABEL_CLS}>
          委託特約事項
        </label>
        <textarea
          id="commissionSpecialTerms"
          value={form.commissionSpecialTerms}
          onChange={(e) => setField('commissionSpecialTerms', e.target.value)}
          placeholder="例如：限定帶看時段、不得擅自降價、鑰匙管理方式等"
          rows={3}
          className={INPUT_CLS}
        />
      </div>
    </div>
  );
}
