import type { Message } from '@/types/message'

export const BUYER_ATTACHMENT_LIMIT_BYTES = 10 * 1024 * 1024

const SUPPORTED_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export interface BuyerAttachmentLike {
  name: string
  size: number
  type: string
}

export interface MessageSearchFilters {
  keyword?: string
  fromDate?: string
  toDate?: string
}

export interface AttachmentValidationResult {
  ok: boolean
  reason?: string
}

export function validateBuyerAttachment(file: BuyerAttachmentLike): AttachmentValidationResult {
  if (file.size > BUYER_ATTACHMENT_LIMIT_BYTES) {
    return {
      ok: false,
      reason: '附件超過 10MB 上限，請壓縮後再上傳。',
    }
  }

  if (!SUPPORTED_ATTACHMENT_MIME_TYPES.has(file.type)) {
    return {
      ok: false,
      reason: '僅支援 PDF、JPG、PNG、WEBP 檔案。',
    }
  }

  return { ok: true }
}

export function filterMessagesByDateAndKeyword(
  messages: Message[],
  filters: MessageSearchFilters
): Message[] {
  const keyword = filters.keyword?.trim().toLowerCase()
  const fromDate = filters.fromDate ? new Date(filters.fromDate) : null
  const toDate = filters.toDate ? new Date(filters.toDate) : null

  if (toDate) {
    toDate.setHours(23, 59, 59, 999)
  }

  return messages.filter((message) => {
    const createdAt = new Date(message.created_at)

    if (fromDate && createdAt < fromDate) {
      return false
    }

    if (toDate && createdAt > toDate) {
      return false
    }

    if (!keyword) {
      return true
    }

    const subject = message.subject?.toLowerCase() ?? ''
    const content = message.content.toLowerCase()
    const sender = message.from_user?.display_name.toLowerCase() ?? ''

    return subject.includes(keyword) || content.includes(keyword) || sender.includes(keyword)
  })
}

export function getReadReceiptText(message: Message): string {
  if (!message.is_read) {
    return '未讀'
  }

  if (!message.read_at) {
    return '已讀'
  }

  return `已讀 ${new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(message.read_at))}`
}
