export type CustomerStatus = 'potential' | 'negotiating' | 'closed' | 'lost'

export type CustomerIntent = 'rent' | 'buy' | 'both' | 'undecided'

/** 已成交客戶在房東端的角色標記（對應買家 / 簽約租客儀表板入口） */
export type ClosedRoleTag = 'buyer' | 'signed_tenant'

export type ClosedDealInfo = {
  closedAt: string
  propertyLabel: string
  amountTwd: number | null
}

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
<<<<<<< HEAD
  tenantProfile?: TenantProfile
=======
  /** 已成交客戶封存後仍保留紀錄，預設自清單隱藏 */
  archived: boolean
  /** 已成交客戶標記為買家或已簽約租客，用於導向對應儀表板 */
  closedRoleTag: ClosedRoleTag | null
  closedDeal: ClosedDealInfo | null
>>>>>>> feature/paperclip-row-034
}

const DEFAULT_DETAILS: CustomerDetailsPayload = {
  summaryNote: '',
  intent: 'undecided',
  followUps: [],
  viewingRecords: [],
  communicationLog: [],
  archived: false,
  closedRoleTag: null,
  closedDeal: null,
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

<<<<<<< HEAD
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
=======
function normalizeClosedRoleTag(value: unknown): ClosedRoleTag | null {
  if (value === 'buyer' || value === 'signed_tenant') {
    return value
  }
  return null
}

function normalizeClosedDeal(value: unknown): ClosedDealInfo | null {
  if (!isObject(value)) {
    return null
  }
  const closedAt = typeof value.closedAt === 'string' ? value.closedAt : ''
  const propertyLabel = typeof value.propertyLabel === 'string' ? value.propertyLabel.trim() : ''
  if (!closedAt || !propertyLabel) {
    return null
  }
  let amountTwd: number | null = null
  if (value.amountTwd === null || value.amountTwd === undefined || value.amountTwd === '') {
    amountTwd = null
  } else if (typeof value.amountTwd === 'number' && Number.isFinite(value.amountTwd)) {
    amountTwd = value.amountTwd
  } else if (typeof value.amountTwd === 'string') {
    const n = Number(value.amountTwd.replace(/,/g, ''))
    amountTwd = Number.isFinite(n) ? n : null
  }
  return { closedAt, propertyLabel, amountTwd }
>>>>>>> feature/paperclip-row-034
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
<<<<<<< HEAD
    const tenantProfile = normalizeTenantProfile(parsed.tenantProfile)

=======
    const archived = parsed.archived === true
>>>>>>> feature/paperclip-row-034
    return {
      summaryNote,
      intent: normalizeIntent(parsed.intent),
      followUps: normalizeFollowUps(parsed.followUps),
      viewingRecords: normalizeViewingRecords(parsed.viewingRecords),
      communicationLog: normalizeCommunicationLog(parsed.communicationLog),
<<<<<<< HEAD
      ...(tenantProfile ? { tenantProfile } : {}),
=======
      archived,
      closedRoleTag: normalizeClosedRoleTag(parsed.closedRoleTag),
      closedDeal: normalizeClosedDeal(parsed.closedDeal),
>>>>>>> feature/paperclip-row-034
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

<<<<<<< HEAD
/** Relative label for last activity (shared by grid + list views). */
export function formatCustomerLastContact(input: { created_at: string; updated_at?: string }): string {
  const dateStr = input.updated_at ?? input.created_at
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (diffDays === 0) return '今日'
  if (diffDays === 1) return '昨日'
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}週前`
  return `${Math.floor(diffDays / 30)}個月前`
=======
export function getClosedRoleTagLabel(tag: ClosedRoleTag): string {
  switch (tag) {
    case 'buyer':
      return '買家'
    case 'signed_tenant':
      return '已簽約租客'
    default:
      return ''
  }
}

/** 儀表板統計用：已成交且未封存的客戶 */
export function isActiveClosedLandlordCustomer(row: {
  status?: string | null
  notes?: string | null
}): boolean {
  return normalizeCustomerStatus(row.status ?? undefined) === 'closed' && !parseCustomerDetails(row.notes).archived
>>>>>>> feature/paperclip-row-034
}
