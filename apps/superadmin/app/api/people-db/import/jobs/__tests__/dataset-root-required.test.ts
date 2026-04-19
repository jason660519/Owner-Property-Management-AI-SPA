// Row 146 Step 3 — verify the asynchronous /import/jobs route enforces
// dataset_root and returns 400 with a clear message when callers omit it.

import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: async () => ({
    ok: true,
    userId: 'admin-1',
    source: 'session' as const,
    viaSession: true,
  }),
}));

jest.mock('@/lib/people-db/import-jobs', () => ({
  enqueueImportJob: jest.fn().mockResolvedValue({
    id: 'job-1',
    status: 'pending',
    file_name: 'sample.csv',
    file_size_bytes: 11,
    created_at: '2026-04-19T00:00:00Z',
  }),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        order: () => ({ limit: async () => ({ data: [], error: null }) }),
      }),
    }),
  }),
}));

import { POST } from '../route';

function makeRequest(form: FormData) {
  // See submit/__tests__/dataset-root-required.test.ts for why we stub formData().
  const req = new NextRequest('http://localhost:3001/api/people-db/import/jobs', {
    method: 'POST',
  });
  Object.defineProperty(req, 'formData', { value: async () => form });
  return req;
}

function buildForm(extra: Partial<{ dataset_root: string }> = {}) {
  const form = new FormData();
  form.append('file', new File(['name\nAlice'], 'sample.csv', { type: 'text/csv' }));
  form.append('column_mapping', JSON.stringify({ full_name: 0 }));
  if (extra.dataset_root !== undefined) form.append('dataset_root', extra.dataset_root);
  return form;
}

describe('POST /api/people-db/import/jobs — Row 146 dataset_root enforcement', () => {
  it('returns 400 when dataset_root is missing', async () => {
    const res = await POST(makeRequest(buildForm()));
    expect(res.status).toBe(400);
    const json = (await res.json()) as { detail?: string };
    expect(json.detail).toMatch(/dataset_root is required/);
    expect(json.detail).toMatch(/Row 146/);
  });

  it('returns 400 when dataset_root is empty string', async () => {
    const res = await POST(makeRequest(buildForm({ dataset_root: '' })));
    expect(res.status).toBe(400);
  });

  it('returns 202 when dataset_root is provided', async () => {
    const res = await POST(makeRequest(buildForm({ dataset_root: '2026Q1 北市新檔' })));
    expect(res.status).toBe(202);
    const json = (await res.json()) as { job_id?: string };
    expect(json.job_id).toBe('job-1');
  });
});
