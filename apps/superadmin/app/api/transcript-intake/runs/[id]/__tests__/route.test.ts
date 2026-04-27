import { NextRequest } from 'next/server';

interface AuthState {
  ok: boolean;
  status?: 401 | 403;
}

const authState: AuthState = { ok: true };
const fromSpy = jest.fn();
const propertyUpdatePayloads: Record<string, unknown>[] = [];
let runRow: Record<string, unknown> | null = {
  id: 'run-1',
  property_id: 'property-1',
  property_type: 'sale',
  requested_by_user_id: 'admin-1',
  status: 'route_selected',
  current_phase: 'route_selected',
  source_document_ids: ['doc-1'],
  route_decision: {},
  detection_result: {},
  parsed_result: {},
  review_result: {},
  confirmed_result: null,
  error_message: null,
  created_at: '2026-04-27T00:00:00Z',
  updated_at: '2026-04-27T00:00:00Z',
  completed_at: null,
};
let propertyRow: Record<string, unknown> | null = {
  details: {
    existing: true,
  },
};

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(async () => {
    if (authState.ok) {
      return { ok: true, userId: 'admin-1', source: 'session' as const, viaSession: true };
    }
    return { ok: false, status: authState.status ?? 401, message: 'denied' };
  }),
}));

jest.mock('@/lib/ai/rate-limit', () => ({
  checkRateLimit: jest.fn(async () => ({
    allowed: true,
    remaining: 9,
    resetAt: new Date('2026-04-27T00:01:00Z'),
  })),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      fromSpy(table);
      if (table === 'property_sales' || table === 'property_rentals') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: propertyRow, error: null }),
            }),
          }),
          update: (payload: Record<string, unknown>) => ({
            eq: () => {
              propertyUpdatePayloads.push(payload);
              return { error: null };
            },
          }),
        };
      }
      if (table === 'property_owners') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: async () => ({ data: null, error: null }),
                  }),
                }),
              }),
            }),
          }),
          insert: jest.fn(async () => ({ error: null })),
          update: () => ({
            eq: () => ({ error: null }),
          }),
        };
      }
      return {
        update: (payload: Record<string, unknown>) => {
          if (runRow) runRow = { ...runRow, ...payload };
          return {
            eq: () => ({
              eq: () => ({
                select: () => ({
                  maybeSingle: async () => {
                    if (runRow?.status !== 'confirmed') return { data: null, error: null };
                    return { data: runRow, error: null };
                  },
                }),
              }),
              select: () => ({
                maybeSingle: async () => ({ data: runRow, error: null }),
              }),
            }),
          };
        },
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: runRow, error: null }),
          }),
        }),
      };
    },
  }),
}));

import { GET, POST } from '../route';

function req(): NextRequest {
  return new NextRequest('http://localhost:3001/api/transcript-intake/runs/run-1', {
    method: 'GET',
  });
}

function postReq(body?: unknown): NextRequest {
  return new NextRequest('http://localhost:3001/api/transcript-intake/runs/run-1', {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  propertyUpdatePayloads.length = 0;
  authState.ok = true;
  authState.status = undefined;
  propertyRow = {
    details: {
      existing: true,
    },
  };
  runRow = {
    id: 'run-1',
    property_id: 'property-1',
    property_type: 'sale',
    requested_by_user_id: 'admin-1',
    status: 'route_selected',
    current_phase: 'route_selected',
    source_document_ids: ['doc-1'],
    route_decision: {},
    detection_result: {},
    parsed_result: {},
    review_result: {},
    confirmed_result: null,
    error_message: null,
    created_at: '2026-04-27T00:00:00Z',
    updated_at: '2026-04-27T00:00:00Z',
    completed_at: null,
  };
});

describe('GET /api/transcript-intake/runs/[id]', () => {
  it('returns 401 before touching Supabase when auth fails', async () => {
    authState.ok = false;
    authState.status = 401;

    const res = await GET(req(), { params: Promise.resolve({ id: 'run-1' }) });

    expect(res.status).toBe(401);
    expect(fromSpy).not.toHaveBeenCalled();
  });

  it('returns a run snapshot', async () => {
    const res = await GET(req(), { params: Promise.resolve({ id: 'run-1' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run.id).toBe('run-1');
    expect(body.run.propertyId).toBe('property-1');
    expect(fromSpy).toHaveBeenCalledWith('transcript_intake_runs');
  });

  it('returns 404 when run is missing', async () => {
    runRow = null;

    const res = await GET(req(), { params: Promise.resolve({ id: 'run-1' }) });

    expect(res.status).toBe(404);
  });

  it('POST confirms a run that needs user confirmation', async () => {
    runRow = {
      ...runRow,
      status: 'needs_user_confirmation',
      current_phase: 'needs_user_confirmation',
      detection_result: { dispositionKind: 'pure_land_sale' },
      parsed_result: { documents: [] },
      review_result: { approved: true },
    } as Record<string, unknown>;

    const res = await POST(postReq(), { params: Promise.resolve({ id: 'run-1' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.run.status).toBe('confirmed');
    expect(body.run.confirmedResult).toMatchObject({
      confirmedByUserId: 'admin-1',
      detection: { dispositionKind: 'pure_land_sale' },
      review: { approved: true },
    });
    expect(fromSpy).toHaveBeenCalledWith('property_sales');
  });

  it('POST syncs confirmed transcript data back to property details for area detail table', async () => {
    const buildingTranscript = {
      header: {},
      description: { buildingNumber: '001建號' },
      ownership: [{ ownerName: '王小明' }],
      encumbrances: [],
    };
    const landTranscript = {
      header: {},
      description: { landNumber: '100地號' },
      ownership: [{ ownerName: '王小明' }],
      encumbrances: [],
    };
    runRow = {
      ...runRow,
      status: 'needs_user_confirmation',
      current_phase: 'needs_user_confirmation',
      detection_result: { dispositionKind: 'unit_building_with_land_share_sale', parkingTitleRights: ['independent'] },
      parsed_result: {
        documents: [
          {
            documentType: 'building_registry_transcript',
            parsedResult: { kind: 'building', buildingTranscript, landTranscript: { header: {}, description: {}, ownership: [], encumbrances: [] } },
          },
          {
            documentType: 'land_registry_transcript',
            parsedResult: { kind: 'land', buildingTranscript: { header: {}, description: {}, ownership: [], encumbrances: [] }, landTranscript },
          },
        ],
      },
      review_result: {
        approved: true,
        dispositionKind: 'unit_building_with_land_share_sale',
        parkingTitleRights: ['independent'],
      },
    } as Record<string, unknown>;

    const res = await POST(postReq({
      areaDetailDraft: {
        version: 1,
        dispositionKind: 'unit_building_with_land_share_sale',
        parkingTitleRights: ['independent', 'shared_facility'],
        buildingAreas: [{
          id: 'building-1',
          label: '五層',
          identifier: '001建號',
          areaSqm: '88.5',
          shareRatio: '全部',
          use: '住家用',
        }],
        landShareAreas: [{
          id: 'land-1',
          label: '住宅區',
          identifier: '100地號',
          areaSqm: '200',
          shareRatio: '10000分之350',
          use: '住宅區',
        }],
        parkingBuildingAreas: [],
        parkingLandShareAreas: [],
      },
    }), { params: Promise.resolve({ id: 'run-1' }) });

    expect(res.status).toBe(200);
    expect(propertyUpdatePayloads[0]).toMatchObject({
      has_independent_parking: true,
      is_pure_land: false,
      land_number: '100地號',
      details: {
        existing: true,
        buildingTranscript,
        landTranscript,
        parkingTitleRights: ['independent', 'shared_facility'],
        transcriptIntakeDispositionKind: 'unit_building_with_land_share_sale',
        transcriptIntakeAreaDetails: expect.objectContaining({
          buildingAreas: [expect.objectContaining({ areaSqm: '88.5' })],
        }),
      },
    });
  });
});
