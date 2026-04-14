export type CustomerStatus = 'potential' | 'negotiating' | 'closed' | 'lost'

export type CustomerIntent = 'rent' | 'buy' | 'both' | 'undecided'

export type FollowUpEntry = {
  id: string
  content: string
  createdAt: string
  operator: string
}

export type ViewingRecord = {
  id: string
  propertyLabel: string
  viewedAt: string
  result: string
}

export type CommunicationEntry = {
  id: string
  summary: string
  createdAt: string
  channel: 'system' | 'note' | 'message'
}

export type TenantProfile = {
  creditScore: number | null
  monthlyIncome: number | null
  occupationType: string | null
}

export type CustomerDetailsPayload = {
  summaryNote: string
  intent: CustomerIntent
  followUps: FollowUpEntry[]
  viewingRecords: ViewingRecord[]
  communicationLog: CommunicationEntry[]
  tenantProfile?: TenantProfile
}

const DEFAULT_DETAILS: CustomerDetailsPayload = {
  summaryNote: '',
  intent: 'undecided',
  followUps: [],
  viewingRecords: [],
  communicationLog: [],
}

type PartialDetails = Partial<CustomerDetailsPayload>

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeIntent(value: unknown): CustomerIntent {
  if (value === 'rent' || value === 'buy' || value === 'both' || value === 'undecided') {
    return value
  }
  return 'undecided'
}

function normalizeFollowUps(value: unknown): FollowUpEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((item, index) => {
      const content = typeof item.content === 'string' ? item.content.trim() : ''
      const createdAt = typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString()
      const operator = typeof item.operator === 'string' && item.operator.trim().length > 0 ? item.operator : '房東'
      const id = typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : `follow-up-${index + 1}`
      return { id, content, createdAt, operator }
    })
    .filter((item) => item.content.length > 0)
}

function normalizeViewingRecords(value: unknown): ViewingRecord[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((item, index) => {
      const propertyLabel = typeof item.propertyLabel === 'string' ? item.propertyLabel.trim() : ''
      const viewedAt = typeof item.viewedAt === 'string' ? item.viewedAt : new Date(0).toISOString()
      const result = typeof item.result === 'string' && item.result.trim().length > 0 ? item.result : '未註記'
      const id = typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : `viewing-${index + 1}`
      return { id, propertyLabel, viewedAt, result }
    })
    .filter((item) => item.propertyLabel.length > 0)
}

function normalizeTenantProfile(value: unknown): TenantProfile | undefined {
  if (!isObject(value)) {
    return undefined
  }

  const creditRaw = value.creditScore
  const incomeRaw = value.monthlyIncome
  const occupationRaw = value.occupationType

  const creditScore =
    typeof creditRaw === 'number' && Number.isFinite(creditRaw)
      ? creditRaw
      : typeof creditRaw === 'string' && creditRaw.trim() !== '' && Number.isFinite(Number(creditRaw))
        ? Number(creditRaw)
        : null

  const monthlyIncome =
    typeof incomeRaw === 'number' && Number.isFinite(incomeRaw)
      ? incomeRaw
      : typeof incomeRaw === 'string' && incomeRaw.trim() !== '' && Number.isFinite(Number(incomeRaw))
        ? Number(incomeRaw)
        : null

  const occupationType =
    typeof occupationRaw === 'string' && occupationRaw.trim().length > 0 ? occupationRaw.trim() : null

  if (creditScore === null && monthlyIncome === null && occupationType === null) {
    return undefined
  }

  return { creditScore, monthlyIncome, occupationType }
}

function normalizeCommunicationLog(value: unknown): CommunicationEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter(isObject)
    .map((item, index) => {
      const summary = typeof item.summary === 'string' ? item.summary.trim() : ''
      const createdAt = typeof item.createdAt === 'string' ? item.createdAt : new Date(0).toISOString()
      const channel = item.channel === 'note' || item.channel === 'message' ? item.channel : 'system'
      const id = typeof item.id === 'string' && item.id.trim().length > 0 ? item.id : `communication-${index + 1}`
      return { id, summary, createdAt, channel }
    })
    .filter((item) => item.summary.length > 0)
}

export function normalizeCustomerStatus(status: string | undefined): CustomerStatus {
  if (status === 'potential' || status === 'negotiating' || status === 'closed' || status === 'lost') {
    return status
  }

  if (status === 'active') {
    return 'closed'
  }

  if (status === 'inactive') {
    return 'lost'
  }

  return 'potential'
}

export function parseCustomerDetails(rawNotes: string | null | undefined): CustomerDetailsPayload {
  if (!rawNotes) {
    return { ...DEFAULT_DETAILS }
  }

  try {
    const parsed = JSON.parse(rawNotes) as PartialDetails
    if (!isObject(parsed)) {
      return { ...DEFAULT_DETAILS, summaryNote: rawNotes }
    }

    const summaryNote = typeof parsed.summaryNote === 'string' ? parsed.summaryNote : ''
    const tenantProfile = normalizeTenantProfile(parsed.tenantProfile)

    return {
      summaryNote,
      intent: normalizeIntent(parsed.intent),
      followUps: normalizeFollowUps(parsed.followUps),
      viewingRecords: normalizeViewingRecords(parsed.viewingRecords),
      communicationLog: normalizeCommunicationLog(parsed.communicationLog),
      ...(tenantProfile ? { tenantProfile } : {}),
    }
  } catch {
    return {
      ...DEFAULT_DETAILS,
      summaryNote: rawNotes,
    }
  }
}

export function serializeCustomerDetails(payload: CustomerDetailsPayload): string {
  return JSON.stringify(payload)
}

export function appendCommunication(
  payload: CustomerDetailsPayload,
  entry: Omit<CommunicationEntry, 'id'>,
): CustomerDetailsPayload {
  const nextEntry: CommunicationEntry = {
    ...entry,
    id: `comm-${Date.now()}`,
  }

  return {
    ...payload,
    communicationLog: [nextEntry, ...payload.communicationLog],
  }
}

export function appendFollowUp(
  payload: CustomerDetailsPayload,
  content: string,
  operator: string,
  createdAt: string,
): CustomerDetailsPayload {
  const clean = content.trim()
  if (!clean) {
    return payload
  }

  const followUp: FollowUpEntry = {
    id: `follow-up-${Date.now()}`,
    content: clean,
    operator: operator.trim() || '房東',
    createdAt,
  }

  const next = {
    ...payload,
    followUps: [followUp, ...payload.followUps],
  }

  return appendCommunication(next, {
    summary: `新增跟進備註：${clean}`,
    createdAt,
    channel: 'note',
  })
}

export function getLatestCommunication(
  payload: CustomerDetailsPayload,
  limit: number,
): CommunicationEntry[] {
  return payload.communicationLog.slice(0, Math.max(0, limit))
}

export function getStatusLabel(status: CustomerStatus): string {
  switch (status) {
    case 'potential':
      return '潛在'
    case 'negotiating':
      return '洽談中'
    case 'closed':
      return '已成交'
    case 'lost':
      return '已失效'
    default:
      return '潛在'
  }
}

export function getIntentLabel(intent: CustomerIntent): string {
  switch (intent) {
    case 'rent':
      return '租賃意向'
    case 'buy':
      return '購屋意向'
    case 'both':
      return '租賃＋購屋'
    case 'undecided':
      return '尚未確定'
    default:
      return '尚未確定'
  }
}
