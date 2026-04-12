import { describe, expect, it } from '@jest/globals'
import {
  BUYER_ATTACHMENT_LIMIT_BYTES,
  filterMessagesByDateAndKeyword,
  getReadReceiptText,
  validateBuyerAttachment,
} from '@/lib/buyer-communication/utils'
import type { Message } from '@/types/message'

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'message-1',
    from_user_id: 'agent-1',
    to_user_id: 'buyer-1',
    subject: '簽約文件確認',
    content: '請於今天確認 PDF 版本。',
    message_type: 'text',
    is_read: false,
    is_deleted_by_sender: false,
    is_deleted_by_receiver: false,
    created_at: '2026-04-11T10:00:00.000Z',
    from_user: {
      display_name: '王仲介',
    },
    ...overrides,
  }
}

describe('validateBuyerAttachment', () => {
  it('accepts PDF and image attachments under 10MB', () => {
    expect(
      validateBuyerAttachment({
        name: 'contract.pdf',
        size: BUYER_ATTACHMENT_LIMIT_BYTES - 1,
        type: 'application/pdf',
      })
    ).toEqual({ ok: true })

    expect(
      validateBuyerAttachment({
        name: 'house.jpg',
        size: 1024,
        type: 'image/jpeg',
      })
    ).toEqual({ ok: true })
  })

  it('rejects oversize files', () => {
    const result = validateBuyerAttachment({
      name: 'large.pdf',
      size: BUYER_ATTACHMENT_LIMIT_BYTES + 1,
      type: 'application/pdf',
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('10MB')
  })

  it('rejects unsupported mime types', () => {
    const result = validateBuyerAttachment({
      name: 'script.js',
      size: 512,
      type: 'application/javascript',
    })

    expect(result.ok).toBe(false)
    expect(result.reason).toContain('PDF')
  })
})

describe('filterMessagesByDateAndKeyword', () => {
  it('filters by keyword across subject/content/sender', () => {
    const messages = [
      makeMessage({ id: 'a', subject: '簽約提醒' }),
      makeMessage({ id: 'b', content: '本月付款日是 4/20' }),
      makeMessage({ id: 'c', from_user: { display_name: '陳房東' } }),
    ]

    expect(filterMessagesByDateAndKeyword(messages, { keyword: '簽約' }).map((m) => m.id)).toEqual(['a'])
    expect(filterMessagesByDateAndKeyword(messages, { keyword: '4/20' }).map((m) => m.id)).toEqual(['b'])
    expect(filterMessagesByDateAndKeyword(messages, { keyword: '陳房東' }).map((m) => m.id)).toEqual(['c'])
  })

  it('filters by inclusive date range', () => {
    const messages = [
      makeMessage({ id: 'a', created_at: '2026-04-10T09:00:00.000Z' }),
      makeMessage({ id: 'b', created_at: '2026-04-11T09:00:00.000Z' }),
      makeMessage({ id: 'c', created_at: '2026-04-12T09:00:00.000Z' }),
    ]

    const result = filterMessagesByDateAndKeyword(messages, {
      fromDate: '2026-04-11',
      toDate: '2026-04-12',
    }).map((m) => m.id)

    expect(result).toEqual(['b', 'c'])
  })
})

describe('getReadReceiptText', () => {
  it('returns unread text for unread messages', () => {
    expect(getReadReceiptText(makeMessage({ is_read: false }))).toBe('未讀')
  })

  it('returns read label with timestamp when read_at exists', () => {
    const label = getReadReceiptText(
      makeMessage({
        is_read: true,
        read_at: '2026-04-11T11:20:00.000Z',
      })
    )

    expect(label.startsWith('已讀')).toBe(true)
    expect(label).toContain('04/11')
  })
})
