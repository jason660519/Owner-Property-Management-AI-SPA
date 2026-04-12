import Link from 'next/link'
import { CalendarDays, Mail, MessageSquare, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  getIntentLabel,
  getLatestCommunication,
  getStatusLabel,
  type CustomerIntent,
  type CustomerStatus,
} from './customer-details'
import { type Customer } from './customer-types'
import { parseCustomerDetails } from './customer-details'

export function CustomerStatusBadge({ status }: { status: CustomerStatus }) {
  const styles: Record<CustomerStatus, string> = {
    potential: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    negotiating: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    closed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    lost: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  }

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
      {getStatusLabel(status)}
    </span>
  )
}

export function CustomerDetailsPanel({
  customer,
  followUpDraft,
  onFollowUpDraftChange,
  onAddFollowUp,
  onQuickStatusChange,
  onIntentChange,
}: {
  customer: Customer | null
  followUpDraft: string
  onFollowUpDraftChange: (value: string) => void
  onAddFollowUp: () => void
  onQuickStatusChange: (status: CustomerStatus) => void
  onIntentChange: (intent: CustomerIntent) => void
}) {
  if (!customer) {
    return (
      <div className="text-sm text-[#999999]">請先在左側清單選擇一位客戶查看 Details 模式。</div>
    )
  }

  const details = parseCustomerDetails(customer.notes)
  const latestCommunication = getLatestCommunication(details, 5)

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">{customer.name}</p>
            <p className="text-xs text-[#999999] mt-1">{customer.email}</p>
          </div>
          <CustomerStatusBadge status={customer.status} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['potential', 'negotiating', 'closed', 'lost'] as CustomerStatus[]).map((status) => (
            <Button
              key={status}
              variant={customer.status === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => onQuickStatusChange(status)}
            >
              {getStatusLabel(status)}
            </Button>
          ))}
        </div>
      </div>

      <section className="space-y-2">
        <p className="text-xs uppercase text-[#999999] tracking-wide">客戶完整資料</p>
        <div className="rounded-md border border-[#333333] p-3 text-sm space-y-2">
          <div className="flex items-center gap-2 text-[#cccccc]"><Phone className="w-3 h-3" />{customer.phone}</div>
          <div className="flex items-center gap-2 text-[#cccccc]"><Mail className="w-3 h-3" />{customer.email}</div>
          <p className="text-[#999999]">緊急聯絡人：{customer.emergency_contact || '未設定'}</p>
          <p className="text-[#999999]">摘要：{details.summaryNote || '尚未填寫'}</p>
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase text-[#999999] tracking-wide">租賃 / 購屋意向</p>
        <select
          value={details.intent}
          onChange={(e) => onIntentChange(e.target.value as CustomerIntent)}
          className="flex h-10 w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white"
        >
          <option value="undecided">尚未確定</option>
          <option value="rent">租賃意向</option>
          <option value="buy">購屋意向</option>
          <option value="both">租賃＋購屋</option>
        </select>
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase text-[#999999] tracking-wide">看房紀錄</p>
        <div className="rounded-md border border-[#333333] p-3 space-y-2">
          {details.viewingRecords.length === 0 ? (
            <p className="text-xs text-[#999999]">目前沒有看房紀錄。</p>
          ) : (
            details.viewingRecords.map((record) => (
              <div key={record.id} className="text-xs text-[#cccccc] flex items-start gap-2">
                <CalendarDays className="w-3.5 h-3.5 mt-0.5" />
                <div>
                  <p>{record.propertyLabel}</p>
                  <p className="text-[#999999]">{new Date(record.viewedAt).toLocaleString('zh-TW')} ・ {record.result}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase text-[#999999] tracking-wide">跟進備註（含時間戳與操作者）</p>
        <div className="space-y-2">
          <textarea
            value={followUpDraft}
            onChange={(e) => onFollowUpDraftChange(e.target.value)}
            className="w-full rounded-md border border-[#333333] bg-[#1A1A1A] px-3 py-2 text-sm text-white"
            placeholder="輸入新的跟進備註..."
          />
          <Button size="sm" onClick={onAddFollowUp}>新增跟進備註</Button>
        </div>
        <div className="rounded-md border border-[#333333] p-3 space-y-2 max-h-40 overflow-y-auto">
          {details.followUps.length === 0 ? (
            <p className="text-xs text-[#999999]">尚無跟進備註。</p>
          ) : (
            details.followUps.map((note) => (
              <div key={note.id} className="text-xs text-[#cccccc]">
                <p>{note.content}</p>
                <p className="text-[#999999] mt-1">{new Date(note.createdAt).toLocaleString('zh-TW')} ・ {note.operator}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-2">
        <p className="text-xs uppercase text-[#999999] tracking-wide">最新 5 筆溝通紀錄摘要</p>
        <div className="rounded-md border border-[#333333] p-3 space-y-2">
          {latestCommunication.length === 0 ? (
            <p className="text-xs text-[#999999]">尚無溝通紀錄。</p>
          ) : (
            latestCommunication.map((entry) => (
              <div key={entry.id} className="text-xs text-[#cccccc]">
                <p>{entry.summary}</p>
                <p className="text-[#999999] mt-1">{new Date(entry.createdAt).toLocaleString('zh-TW')}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <Link href={`/landlord/messages?customerId=${customer.id}&customerName=${encodeURIComponent(customer.name)}`}>
        <Button className="w-full" variant="outline">
          <MessageSquare className="w-4 h-4 mr-2" />
          發送訊息
        </Button>
      </Link>

      <p className="text-[11px] text-[#666666]">目前意向：{getIntentLabel(details.intent)}</p>
    </>
  )
}
