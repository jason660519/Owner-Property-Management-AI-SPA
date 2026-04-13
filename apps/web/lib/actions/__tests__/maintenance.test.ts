import {
  getMyMaintenanceRequests,
  createMaintenanceRequest,
  cancelMaintenanceRequest,
  getLandlordMaintenanceRequests,
  getMaintenanceAssigneeOptions,
  updateMaintenanceRequest,
} from '@/lib/actions/maintenance'

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
  unstable_noStore: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
  })),
}))

// We mock the server supabase client factory
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

import { createClient } from '@/lib/supabase/server'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_USER = { id: 'user-001' }

const MOCK_REQUEST_ROW = {
  id: 'req-001',
  property_id: 'prop-001',
  assigned_to: null,
  assignee: null,
  category: 'plumbing',
  priority: 'medium',
  title: '廚房水龍頭漏水',
  description: '水龍頭持續滴水無法關緊',
  status: 'open',
  estimated_cost: null,
  actual_cost: null,
  scheduled_date: null,
  completed_date: null,
  photo_urls: [],
  notes: null,
  created_at: '2026-04-13T00:00:00.000Z',
  property: { address: '台北市信義區松仁路123號', owner_id: 'owner-001' },
}

function buildMockSupabase(overrides: Record<string, unknown> = {}) {
  const mockEq = jest.fn()
  const mockIn = jest.fn()
  const mockOrder = jest.fn()
  const mockSelect = jest.fn()
  const mockInsert = jest.fn()
  const mockUpdate = jest.fn()

  // Default chain: select -> eq -> order
  mockOrder.mockResolvedValue({ data: [MOCK_REQUEST_ROW], error: null })
  mockEq.mockReturnValue({ order: mockOrder, in: mockIn })
  mockIn.mockResolvedValue({ data: null, error: null })
  mockSelect.mockReturnValue({ eq: mockEq, in: mockIn, order: mockOrder })
  mockInsert.mockResolvedValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })

  const mockFrom = jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
  }))

  const supabase = {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER } }),
    },
    from: mockFrom,
    ...overrides,
  }

  ;(createClient as jest.Mock).mockResolvedValue(supabase)
  return { supabase, mockFrom, mockSelect, mockInsert, mockUpdate, mockEq, mockIn, mockOrder }
}

// ─── getMyMaintenanceRequests ─────────────────────────────────────────────────

describe('getMyMaintenanceRequests', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns mapped requests for authenticated user', async () => {
    buildMockSupabase()
    const result = await getMyMaintenanceRequests()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('req-001')
    expect(result[0].category).toBe('plumbing')
    expect(result[0].propertyAddress).toBe('台北市信義區松仁路123號')
  })

  it('returns empty array when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      from: jest.fn(),
    })
    const result = await getMyMaintenanceRequests()
    expect(result).toEqual([])
  })

  it('returns empty array on db error', async () => {
    const { supabase, mockOrder } = buildMockSupabase()
    mockOrder.mockResolvedValue({ data: null, error: { message: 'DB error' } })
    const result = await getMyMaintenanceRequests()
    expect(result).toEqual([])
  })
})

// ─── createMaintenanceRequest ─────────────────────────────────────────────────

describe('createMaintenanceRequest', () => {
  beforeEach(() => jest.clearAllMocks())

  it('inserts a new request and returns success', async () => {
    const { mockInsert } = buildMockSupabase()
    mockInsert.mockResolvedValue({ error: null })

    const result = await createMaintenanceRequest({
      propertyId: 'prop-001',
      category: 'plumbing',
      priority: 'medium',
      title: '廚房水龍頭漏水',
      description: '水龍頭持續滴水無法關緊',
    })

    expect(result.success).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('includes photoUrls in insert payload (defaults to [])', async () => {
    const { supabase, mockInsert } = buildMockSupabase()
    mockInsert.mockResolvedValue({ error: null })

    const fromSpy = supabase.from as jest.Mock
    await createMaintenanceRequest({
      propertyId: 'prop-001',
      category: 'electrical',
      priority: 'high',
      title: '電燈開關損壞無法使用',
      description: '電燈開關按下後無反應，需要更換',
    })

    const insertCall = fromSpy.mock.results[0].value.insert
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        photo_urls: [],
        status: 'open',
        property_id: 'prop-001',
      })
    )
  })

  it('returns error when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      from: jest.fn(),
    })

    const result = await createMaintenanceRequest({
      propertyId: 'prop-001',
      category: 'plumbing',
      priority: 'low',
      title: '問題標題超過五個字',
      description: '問題描述詳細說明超過十個字',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('請先登入')
  })

  it('returns error on db insert failure', async () => {
    const { mockInsert } = buildMockSupabase()
    mockInsert.mockResolvedValue({ error: { message: 'insert failed' } })

    const result = await createMaintenanceRequest({
      propertyId: 'prop-001',
      category: 'hvac',
      priority: 'urgent',
      title: '冷氣機突然停止運作',
      description: '冷氣機開機後幾分鐘就自動關機',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('提交失敗，請重試')
  })
})

// ─── cancelMaintenanceRequest ─────────────────────────────────────────────────

describe('cancelMaintenanceRequest', () => {
  beforeEach(() => jest.clearAllMocks())

  it('cancels an open request and returns success', async () => {
    const { mockEq, mockIn } = buildMockSupabase()
    // chain: update -> eq(id) -> eq(requested_by) -> in(status)
    const mockEq2 = jest.fn()
    mockIn.mockResolvedValue({ error: null })
    mockEq2.mockReturnValue({ in: mockIn })
    mockEq.mockReturnValueOnce({ eq: mockEq2 })

    const result = await cancelMaintenanceRequest('req-001')
    expect(result.success).toBe(true)
  })

  it('returns error when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      from: jest.fn(),
    })

    const result = await cancelMaintenanceRequest('req-001')
    expect(result.success).toBe(false)
    expect(result.error).toBe('請先登入')
  })

  it('returns error on db failure', async () => {
    const { mockEq, mockIn } = buildMockSupabase()
    const mockEq2 = jest.fn()
    mockIn.mockResolvedValue({ error: { message: 'update failed' } })
    mockEq2.mockReturnValue({ in: mockIn })
    mockEq.mockReturnValueOnce({ eq: mockEq2 })

    const result = await cancelMaintenanceRequest('req-001')
    expect(result.success).toBe(false)
    expect(result.error).toBe('取消失敗，請重試')
  })
})

function buildUpdateFlowSupabase(options: {
  ownerId?: string
  existingRow?: { id: string; property: { owner_id: string } } | null
  updateError?: { message: string } | null
}) {
  const ownerId = options.ownerId ?? MOCK_USER.id
  const existingRow =
    options.existingRow !== undefined
      ? options.existingRow
      : { id: 'req-001', property: { owner_id: ownerId } }

  const mockMaybeSingle = jest.fn().mockResolvedValue({
    data: existingRow,
    error: null,
  })
  const mockUpdateEq = jest.fn().mockResolvedValue({ error: options.updateError ?? null })
  const mockUpdateFn = jest.fn().mockReturnValue({ eq: mockUpdateEq })

  const from = jest.fn((table: string) => {
    if (table === 'Property_Rentals') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [{ id: 'prop-001' }], error: null }),
        }),
      }
    }
    if (table === 'rental_ledger') {
      return {
        select: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }
    }
    if (table === 'maintenance_requests') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ maybeSingle: mockMaybeSingle }),
        }),
        update: mockUpdateFn,
      }
    }
    return {
      select: jest.fn().mockReturnValue({ eq: jest.fn(), in: jest.fn(), order: jest.fn() }),
    }
  })

  const supabase = {
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
    from,
  }
  ;(createClient as jest.Mock).mockResolvedValue(supabase)
  return { supabase, mockMaybeSingle, mockUpdateEq, mockUpdateFn, from }
}

// ─── updateMaintenanceRequest (landlord) ──────────────────────────────────────

describe('updateMaintenanceRequest', () => {
  beforeEach(() => jest.clearAllMocks())

  it('updates status to in_progress successfully', async () => {
    buildUpdateFlowSupabase({})
    const result = await updateMaintenanceRequest('req-001', { status: 'in_progress' })
    expect(result.success).toBe(true)
  })

  it('sets completed_date when status is completed', async () => {
    const { mockUpdateFn } = buildUpdateFlowSupabase({})
    await updateMaintenanceRequest('req-001', {
      status: 'completed',
      notes: '修繕完成，已更換零件',
    })

    const updateArg = mockUpdateFn.mock.calls[0][0]
    expect(updateArg.completed_date).toBeDefined()
    expect(updateArg.status).toBe('completed')
    expect(updateArg.notes).toBe('修繕完成，已更換零件')
  })

  it('includes estimatedCost, scheduledDate, assignedToId, and actualCost when provided', async () => {
    const { mockUpdateFn } = buildUpdateFlowSupabase({})
    await updateMaintenanceRequest('req-001', {
      status: 'in_progress',
      estimatedCost: 1500,
      scheduledDate: '2026-04-20T00:00:00.000Z',
      assignedToId: MOCK_USER.id,
      actualCost: 1200,
    })

    const updateArg = mockUpdateFn.mock.calls[0][0]
    expect(updateArg.estimated_cost).toBe(1500)
    expect(updateArg.scheduled_date).toBe('2026-04-20T00:00:00.000Z')
    expect(updateArg.assigned_to).toBe(MOCK_USER.id)
    expect(updateArg.actual_cost).toBe(1200)
  })

  it('returns error when request not found', async () => {
    buildUpdateFlowSupabase({ existingRow: null })
    const result = await updateMaintenanceRequest('req-404', { status: 'in_progress' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('找不到此維修申請')
  })

  it('returns error when landlord does not own the property', async () => {
    buildUpdateFlowSupabase({ ownerId: 'other-landlord' })
    const result = await updateMaintenanceRequest('req-001', { status: 'in_progress' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('無權限更新此申請')
  })

  it('returns error when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      from: jest.fn(),
    })

    const result = await updateMaintenanceRequest('req-001', { status: 'in_progress' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('請先登入')
  })

  it('returns error on db failure', async () => {
    buildUpdateFlowSupabase({ updateError: { message: 'update failed' } })
    const result = await updateMaintenanceRequest('req-001', { status: 'in_progress' })
    expect(result.success).toBe(false)
    expect(result.error).toBe('更新失敗，請重試')
  })
})

// ─── getMaintenanceAssigneeOptions ────────────────────────────────────────────

describe('getMaintenanceAssigneeOptions', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns empty when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      from: jest.fn(),
    })
    expect(await getMaintenanceAssigneeOptions()).toEqual([])
  })

  it('returns landlord profile when no ledger tenants', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'Property_Rentals') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [{ id: 'prop-001' }], error: null }),
          }),
        }
      }
      if (table === 'rental_ledger') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              not: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }
      }
      if (table === 'users_profile') {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ id: MOCK_USER.id, full_name: '房東測試' }],
              error: null,
            }),
          }),
        }
      }
      return { select: jest.fn() }
    })
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
      from,
    })

    const opts = await getMaintenanceAssigneeOptions()
    expect(opts).toEqual([{ id: MOCK_USER.id, fullName: '房東測試' }])
  })
})

// ─── getLandlordMaintenanceRequests ──────────────────────────────────────────

describe('getLandlordMaintenanceRequests', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns empty array when landlord has no properties', async () => {
    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
      from: jest.fn((table: string) => {
        if (table === 'Property_Rentals') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }
        }
        return { select: jest.fn() }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await getLandlordMaintenanceRequests()
    expect(result).toEqual([])
  })

  it('returns mapped requests for landlord with properties', async () => {
    const MOCK_REQUEST_WITH_REQUESTER = {
      ...MOCK_REQUEST_ROW,
      requester: { full_name: '王小明' },
    }

    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
      from: jest.fn((table: string) => {
        if (table === 'Property_Rentals') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'prop-001' }],
                error: null,
              }),
            }),
          }
        }
        // maintenance_requests
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [MOCK_REQUEST_WITH_REQUESTER],
                error: null,
              }),
            }),
          }),
        }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await getLandlordMaintenanceRequests()
    expect(result).toHaveLength(1)
    expect(result[0].requestedByName).toBe('王小明')
    expect(result[0].id).toBe('req-001')
  })

  it('returns empty array when not authenticated', async () => {
    ;(createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      from: jest.fn(),
    })

    const result = await getLandlordMaintenanceRequests()
    expect(result).toEqual([])
  })

  it('falls back to "租客" name when requester has no full_name', async () => {
    const MOCK_REQUEST_NO_NAME = {
      ...MOCK_REQUEST_ROW,
      requester: null,
    }

    const supabase = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: MOCK_USER } }) },
      from: jest.fn((table: string) => {
        if (table === 'Property_Rentals') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({
                data: [{ id: 'prop-001' }],
                error: null,
              }),
            }),
          }
        }
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [MOCK_REQUEST_NO_NAME],
                error: null,
              }),
            }),
          }),
        }
      }),
    }
    ;(createClient as jest.Mock).mockResolvedValue(supabase)

    const result = await getLandlordMaintenanceRequests()
    expect(result[0].requestedByName).toBe('租客')
  })
})

// ─── Status Transition Tests ──────────────────────────────────────────────────

describe('Maintenance Status Transitions', () => {
  beforeEach(() => jest.clearAllMocks())

  const transitions: Array<{ from: string; to: string }> = [
    { from: 'open', to: 'in_progress' },
    { from: 'in_progress', to: 'completed' },
    { from: 'open', to: 'cancelled' },
  ]

  transitions.forEach(({ from, to }) => {
    it(`allows transition: ${from} → ${to}`, async () => {
      // updateMaintenanceRequest handles landlord transitions
      // cancelMaintenanceRequest handles tenant open→cancelled
      let result
      if (to === 'cancelled') {
        const { mockEq } = buildMockSupabase()
        mockEq.mockResolvedValue({ error: null })
        const mockEq2 = jest.fn()
        const mockIn = jest.fn().mockResolvedValue({ error: null })
        mockEq2.mockReturnValue({ in: mockIn })
        mockEq.mockReturnValueOnce({ eq: mockEq2 })
        result = await cancelMaintenanceRequest('req-001')
      } else {
        buildUpdateFlowSupabase({})
        result = await updateMaintenanceRequest('req-001', {
          status: to as 'in_progress' | 'completed' | 'cancelled' | 'open',
        })
      }

      expect(result.success).toBe(true)
    })
  })
})
