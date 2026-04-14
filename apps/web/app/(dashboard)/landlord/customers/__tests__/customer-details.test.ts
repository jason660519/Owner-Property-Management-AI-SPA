import {
  appendFollowUp,
  getLatestCommunication,
  isActiveClosedLandlordCustomer,
  normalizeCustomerStatus,
  parseCustomerDetails,
  serializeCustomerDetails,
} from '../customer-details'

describe('customer-details utility', () => {
  it('falls back to plain-text summary when notes are not JSON', () => {
    const details = parseCustomerDetails('一般備註內容')
    expect(details.summaryNote).toBe('一般備註內容')
    expect(details.followUps).toHaveLength(0)
    expect(details.communicationLog).toHaveLength(0)
  })

  it('parses structured notes payload', () => {
    const raw = JSON.stringify({
      summaryNote: '重點客戶',
      intent: 'buy',
      followUps: [
        {
          id: 'n-1',
          content: '安排週五看房',
          createdAt: '2026-04-10T10:00:00.000Z',
          operator: '房東A',
        },
      ],
      viewingRecords: [
        {
          id: 'v-1',
          propertyLabel: '信義區 A 案',
          viewedAt: '2026-04-09T09:00:00.000Z',
          result: '待追蹤',
        },
      ],
      communicationLog: [
        {
          id: 'c-1',
          summary: '已發送 follow-up 訊息',
          createdAt: '2026-04-10T11:00:00.000Z',
          channel: 'message',
        },
      ],
    })

    const details = parseCustomerDetails(raw)
    expect(details.summaryNote).toBe('重點客戶')
    expect(details.intent).toBe('buy')
    expect(details.followUps).toHaveLength(1)
    expect(details.viewingRecords).toHaveLength(1)
    expect(details.communicationLog).toHaveLength(1)
  })

  it('adds follow-up and appends communication summary', () => {
    const now = '2026-04-12T20:30:00.000Z'
    const next = appendFollowUp(parseCustomerDetails(''), '已電話聯繫，等待回覆', '房東', now)

    expect(next.followUps).toHaveLength(1)
    expect(next.followUps[0].content).toContain('已電話聯繫')
    expect(next.communicationLog).toHaveLength(1)
    expect(next.communicationLog[0].summary).toContain('新增跟進備註')
  })

  it('returns only requested latest communication items', () => {
    const payload = parseCustomerDetails(
      JSON.stringify({
        summaryNote: '',
        intent: 'undecided',
        followUps: [],
        viewingRecords: [],
        communicationLog: [
          { id: 'c1', summary: '1', createdAt: '2026-04-12T00:00:00.000Z', channel: 'system' },
          { id: 'c2', summary: '2', createdAt: '2026-04-11T00:00:00.000Z', channel: 'system' },
          { id: 'c3', summary: '3', createdAt: '2026-04-10T00:00:00.000Z', channel: 'system' },
        ],
      }),
    )

    const latest = getLatestCommunication(payload, 2)
    expect(latest).toHaveLength(2)
    expect(latest.map((item) => item.id)).toEqual(['c1', 'c2'])
  })

  it('normalizes legacy statuses', () => {
    expect(normalizeCustomerStatus('active')).toBe('closed')
    expect(normalizeCustomerStatus('inactive')).toBe('lost')
    expect(normalizeCustomerStatus('negotiating')).toBe('negotiating')
    expect(normalizeCustomerStatus('unexpected')).toBe('potential')
  })

  it('serializes payload without dropping fields', () => {
    const payload = parseCustomerDetails(
      JSON.stringify({
        summaryNote: 'A',
        intent: 'rent',
        followUps: [],
        viewingRecords: [],
        communicationLog: [],
      }),
    )

    const serialized = serializeCustomerDetails(payload)
    const reparsed = parseCustomerDetails(serialized)
    expect(reparsed.summaryNote).toBe('A')
    expect(reparsed.intent).toBe('rent')
    expect(reparsed.archived).toBe(false)
    expect(reparsed.closedRoleTag).toBeNull()
    expect(reparsed.closedDeal).toBeNull()
  })

  it('counts active closed customers excluding archived', () => {
    expect(
      isActiveClosedLandlordCustomer({
        status: 'closed',
        notes: JSON.stringify({ archived: true }),
      }),
    ).toBe(false)
    expect(
      isActiveClosedLandlordCustomer({
        status: 'closed',
        notes: JSON.stringify({ archived: false }),
      }),
    ).toBe(true)
    expect(isActiveClosedLandlordCustomer({ status: 'potential', notes: '{}' })).toBe(false)
  })
})
