'use client'

import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  FileText,
  Image,
  Loader2,
  MessageSquare,
  Paperclip,
  Search,
  Send,
  X,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard'
import { messageService } from '@/services/messageService'
import type { Message } from '@/types/message'
import {
  filterMessagesByDateAndKeyword,
  getReadReceiptText,
  validateBuyerAttachment,
} from '@/lib/buyer-communication/utils'

const SYSTEM_NOTICES = [
  '系統通知：您剛上傳的合約附件已同步到成交流程。',
  '系統通知：仲介已回覆「交屋流程確認」對話。',
]

export default function BuyerCommunicationCenterPage() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string>()
  const [keyword, setKeyword] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [composeText, setComposeText] = useState('')
  const [attachmentNames, setAttachmentNames] = useState<string[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['buyer-communication-messages'],
    queryFn: () => messageService.getMessages({ type: 'all' }),
    refetchInterval: 10000,
  })

  const filteredMessages = useMemo(
    () => filterMessagesByDateAndKeyword(messages, { keyword, fromDate, toDate }),
    [messages, keyword, fromDate, toDate]
  )

  const selectedMessage = useMemo(
    () => filteredMessages.find((message) => message.id === selectedMessageId) ?? filteredMessages[0] ?? null,
    [filteredMessages, selectedMessageId]
  )

  const markAsReadMutation = useMutation({
    mutationFn: (messageId: string) => messageService.markAsRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyer-communication-messages'] })
    },
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMessage) {
        throw new Error('No selected thread')
      }

      const content = composeText.trim()
      if (!content && attachmentNames.length === 0) {
        return null
      }

      return messageService.sendMessage({
        to_user_id: selectedMessage.from_user_id,
        subject: `Re: ${selectedMessage.subject ?? '買家溝通中心'}`,
        content: content || '已傳送附件，請查收。',
        message_type: attachmentNames.length > 0 ? 'file' : 'text',
        attachment_urls: attachmentNames.map((name) => `mock://buyer-attachments/${name}`),
      })
    },
    onSuccess: () => {
      setComposeText('')
      setAttachmentNames([])
      setUploadError(null)
      queryClient.invalidateQueries({ queryKey: ['buyer-communication-messages'] })
    },
  })

  const unreadCount = filteredMessages.filter((message) => !message.is_read).length

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessageId(message.id)

    if (!message.is_read) {
      await markAsReadMutation.mutateAsync(message.id)
    }
  }

  const handleChooseAttachment = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = event.target.files

    if (!files || files.length === 0) {
      return
    }

    const nextNames: string[] = []
    let nextError: string | null = null

    for (const file of Array.from(files)) {
      const validation = validateBuyerAttachment({
        name: file.name,
        size: file.size,
        type: file.type,
      })
      if (!validation.ok) {
        nextError = `${file.name}：${validation.reason ?? '附件驗證失敗'}`
        break
      }
      nextNames.push(file.name)
    }

    if (nextError) {
      setUploadError(nextError)
      event.target.value = ''
      return
    }

    setUploadError(null)
    setAttachmentNames((current) => [...current, ...nextNames])
    event.target.value = ''
  }

  const removeAttachment = (name: string) => {
    setAttachmentNames((current) => current.filter((item) => item !== name))
  }

  return (
    <DashboardLayout
      currentRole="contracted_buyer"
      pageTitle="買家的溝通中心"
      breadcrumbs={[
        { label: '首頁', href: '/' },
        { label: '買家專區', href: '/buyer' },
        { label: '簽約儀表板', href: '/buyer/contracted/dashboard' },
        { label: '溝通中心' },
      ]}
      greeting="與房東、仲介即時溝通，並追蹤已讀回條。"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border border-border-default bg-bg-secondary p-4 lg:col-span-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">訊息列表</h2>
            <span className="rounded-full bg-accent-subtle px-3 py-1 text-xs text-accent">
              未讀 {unreadCount}
            </span>
          </div>

          <div className="space-y-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜尋訊息、主旨、聯絡人"
                className="w-full rounded-lg border border-border-default bg-bg-primary py-2 pl-9 pr-3 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="rounded-lg border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-4 max-h-[480px] space-y-2 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-text-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : filteredMessages.length === 0 ? (
              <p className="rounded-lg border border-border-default bg-bg-primary p-4 text-sm text-text-muted">
                查無符合條件的歷史訊息。
              </p>
            ) : (
              filteredMessages.map((message) => (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => void handleSelectMessage(message)}
                  className={`w-full rounded-lg border p-3 text-left transition-colors ${
                    selectedMessage?.id === message.id
                      ? 'border-accent bg-accent-subtle'
                      : 'border-border-default bg-bg-primary hover:border-accent'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-1 text-sm font-medium text-text-primary">
                      {message.subject || '（無主旨）'}
                    </p>
                    <span className="text-xs text-text-muted">{getReadReceiptText(message)}</span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-text-secondary">
                    {message.from_user?.display_name || '未知聯絡人'}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs text-text-muted">{message.content}</p>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-border-default bg-bg-secondary p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between border-b border-border-default pb-4">
            <div>
              <h2 className="text-lg font-semibold text-text-primary">
                {selectedMessage?.subject || '請先選擇對話'}
              </h2>
              <p className="text-sm text-text-secondary">
                {selectedMessage?.from_user?.display_name || '尚未選擇聯絡人'}
              </p>
            </div>
            {selectedMessage && (
              <span className="rounded-full bg-bg-primary px-3 py-1 text-xs text-text-secondary">
                {getReadReceiptText(selectedMessage)}
              </span>
            )}
          </div>

          <div className="min-h-[220px] rounded-xl border border-border-default bg-bg-primary p-4">
            {selectedMessage ? (
              <>
                <p className="whitespace-pre-wrap text-sm leading-6 text-text-primary">
                  {selectedMessage.content}
                </p>
                {selectedMessage.attachment_urls && selectedMessage.attachment_urls.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-text-muted">附件</p>
                    {selectedMessage.attachment_urls.map((url) => (
                      <div key={url} className="flex items-center gap-2 text-sm text-accent">
                        {url.endsWith('.pdf') ? <FileText className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                        <span>{url.split('/').pop()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-text-muted">
                <MessageSquare className="mr-2 h-5 w-5" />
                選擇訊息後即可查看內容與已讀狀態。
              </div>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-border-default bg-bg-primary p-3">
            <textarea
              value={composeText}
              onChange={(event) => setComposeText(event.target.value)}
              placeholder="輸入回覆內容，或上傳 PDF / 圖片附件。"
              className="min-h-[110px] w-full resize-none bg-transparent text-sm text-text-primary focus:outline-none"
            />

            {attachmentNames.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachmentNames.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1 rounded-full border border-border-default bg-bg-secondary px-2 py-1 text-xs text-text-secondary"
                  >
                    {name}
                    <button type="button" onClick={() => removeAttachment(name)} aria-label={`remove-${name}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {uploadError && <p className="mb-2 text-xs text-error">{uploadError}</p>}

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  type="button"
                  onClick={handleChooseAttachment}
                  className="inline-flex items-center gap-1 rounded-lg border border-border-default px-3 py-2 text-xs text-text-secondary hover:border-accent"
                >
                  <Paperclip className="h-4 w-4" />
                  上傳附件
                </button>
                <span className="text-xs text-text-muted">支援 PDF / 圖片，單檔上限 10MB</span>
              </div>

              <button
                type="button"
                onClick={() => void sendMutation.mutateAsync()}
                disabled={sendMutation.isPending || (!composeText.trim() && attachmentNames.length === 0)}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                送出
              </button>
            </div>
          </div>

          <aside className="mt-4 rounded-xl border border-border-default bg-bg-primary p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
              <Bell className="h-4 w-4 text-accent" />
              系統通知
            </div>
            <ul className="space-y-2 text-xs text-text-secondary">
              {SYSTEM_NOTICES.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          </aside>
        </section>
      </div>
    </DashboardLayout>
  )
}
