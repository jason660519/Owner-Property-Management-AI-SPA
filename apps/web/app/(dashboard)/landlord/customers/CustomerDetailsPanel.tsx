'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Mail, MessageSquare, PackageOpen, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  appendCommunication,
  getClosedRoleTagLabel,
  getIntentLabel,
  getLatestCommunication,
  getStatusLabel,
  serializeCustomerDetails,
  type ClosedRoleTag,
  type CustomerIntent,
  type CustomerStatus,
  parseCustomerDetails,
} from './customer-details'
import { type Customer } from './customer-types'

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
  onSaveCustomerNotes,
}: {
  customer: Customer | null
  followUpDraft: string
  onFollowUpDraftChange: (value: string) => void
  onAddFollowUp: () => void
  onQuickStatusChange: (status: CustomerStatus) => void
  onIntentChange: (intent: CustomerIntent) => void
  onSaveCustomerNotes: (nextNotes: string) => Promise<void>
}) {
  const [closedRoleChoice, setClosedRoleChoice] = useState<ClosedRoleTag | ''>('')
  const [dealDate, setDealDate] = useState('')
  const [dealProperty, setDealProperty] = useState('')
  const [dealAmount, setDealAmount] = useState('')
  const [closedSavePending, setClosedSavePending] = useState(false)

  useEffect(() => {
    if (!customer) {
      setClosedRoleChoice('')
      setDealDate('')
      setDealProperty('')
      setDealAmount('')
      return
    }
    const d = parseCustomerDetails(customer.notes)
    setClosedRoleChoice(d.closedRoleTag ?? '')
    if (d.closedDeal) {
      setDealDate(d.closedDeal.closedAt.slice(0, 10))
      setDealProperty(d.closedDeal.propertyLabel)
      setDealAmount(
        d.closedDeal.amountTwd === null || d.closedDeal.amountTwd === undefined
          ? ''
          : String(d.closedDeal.amountTwd),
      )
    } else {
      setDealDate('')
      setDealProperty('')
      setDealAmount('')
    }
  }, [customer])

  const persistDetails = useCallback(
    async (next: ReturnType<typeof parseCustomerDetails>, comm?: { summary: string; channel: 'system' | 'note' }) => {
      const now = new Date().toISOString()
      let payload = next
      if (comm) {
        payload = appendCommunication(next, { ...comm, createdAt: now, channel: comm.channel })
      }
      await onSaveCustomerNotes(serializeCustomerDetails(payload))
    },
    [onSaveCustomerNotes],
  )

  const handleSaveClosedSection = async () => {
    if (!customer || !closedRoleChoice) {
      return
    }
    const amountTrim = dealAmount.trim()
    const amountNum = amountTrim === '' ? null : Number(amountTrim.replace(/,/g, ''))
    if (amountTrim !== '' && (amountNum === null || !Number.isFinite(amountNum))) {
      return
    }
    if (!dealDate || !dealProperty.trim()) {
      return
    }

    setClosedSavePending(true)
    try {
      const base = parseCustomerDetails(customer.notes)
      const next = {
        ...base,
        closedRoleTag: closedRoleChoice,
        closedDeal: {
          closedAt: new Date(dealDate).toISOString(),
          propertyLabel: dealProperty.trim(),
          amountTwd: amountNum,
        },
      }
      await persistDetails(next, {
        summary: `已標記為「${getClosedRoleTagLabel(closedRoleChoice)}」並儲存成交資訊`,
        channel: 'system',
      })
    } finally {
      setClosedSavePending(false)
    }
  }

  const handleArchive = async (archived: boolean) => {
    if (!customer) return
    setClosedSavePending(true)
    try {
      const base = parseCustomerDetails(customer.notes)
      const next = { ...base, archived }
      await persistDetails(next, {
        summary: archived ? '客戶已封存（保留歷史紀錄）' : '已取消封存客戶',
        channel: 'system',
      })
    } finally {
      setClosedSavePending(false)
    }
  }

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
            <p className="text-lg font-semibold text-text-primary">{customer.name}</p>
            <p className="text-xs text-text-secondary mt-1">{customer.email}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <CustomerStatusBadge status={customer.status} />
            {details.archived && (
              <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded border border-border-default text-text-secondary bg-bg-secondary">
                已封存
              </span>
            )}
          </div>
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

      {customer.status === 'closed' && (
        <section className="space-y-3 rounded-lg border border-border-default bg-bg-secondary p-3">
          <p className="text-xs uppercase text-text-secondary tracking-wide">已成交客戶</p>
          <p className="text-xs text-text-secondary">
            標記為買家或已簽約租客後，可由此進入對應角色的儀表板（系統會保留客戶與成交紀錄）。
          </p>

          <div className="space-y-2">
            <p className="text-xs text-text-secondary">角色標記</p>
            <div className="flex flex-col gap-2">
              {(['buyer', 'signed_tenant'] as const).map((tag) => (
                <label
                  key={tag}
                  className="flex items-center gap-2 text-sm text-text-primary cursor-pointer"
                >
                  <input
                    type="radio"
                    name="closed-role"
                    checked={closedRoleChoice === tag}
                    onChange={() => setClosedRoleChoice(tag)}
                    className="accent-[#7C3AED]"
                  />
                  {getClosedRoleTagLabel(tag)}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <label className="text-xs text-text-secondary block space-y-1">
              <span>成交日期</span>
              <input
                type="date"
                value={dealDate}
                onChange={(e) => setDealDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
              />
            </label>
            <label className="text-xs text-text-secondary block space-y-1">
              <span>成交物件</span>
              <input
                type="text"
                value={dealProperty}
                onChange={(e) => setDealProperty(e.target.value)}
                placeholder="例如：台北市大安區〇〇路一段"
                className="flex h-10 w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
              />
            </label>
            <label className="text-xs text-text-secondary block space-y-1">
              <span>成交金額（NTD，可留空）</span>
              <input
                type="text"
                inputMode="decimal"
                value={dealAmount}
                onChange={(e) => setDealAmount(e.target.value)}
                placeholder="例如：18500000"
                className="flex h-10 w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary"
              />
            </label>
          </div>

          <Button
            size="sm"
            className="w-full"
            disabled={closedSavePending || !closedRoleChoice || !dealDate || !dealProperty.trim()}
            onClick={() => void handleSaveClosedSection()}
          >
            儲存成交資訊與角色標記
          </Button>

          {details.closedRoleTag && (
            <div className="space-y-2 pt-1 border-t border-border-default">
              <p className="text-xs text-text-secondary">對應角色儀表板</p>
              {details.closedRoleTag === 'buyer' && (
                <Link
                  href={`/buyer/contracted/dashboard?fromLandlordCustomer=${encodeURIComponent(customer.id)}`}
                  className="block"
                >
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    <PackageOpen className="w-4 h-4 mr-2" />
                    前往買家簽約儀表板
                  </Button>
                </Link>
              )}
              {details.closedRoleTag === 'signed_tenant' && (
                <Link
                  href={`/tenant/contracted/dashboard?fromLandlordCustomer=${encodeURIComponent(customer.id)}`}
                  className="block"
                >
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    <PackageOpen className="w-4 h-4 mr-2" />
                    前往簽約租客儀表板
                  </Button>
                </Link>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1 border-t border-border-default">
            {!details.archived ? (
              <Button
                variant="outline"
                size="sm"
                disabled={closedSavePending}
                onClick={() => void handleArchive(true)}
              >
                封存客戶（保留紀錄）
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={closedSavePending}
                onClick={() => void handleArchive(false)}
              >
                取消封存
              </Button>
            )}
          </div>
        </section>
      )}

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
