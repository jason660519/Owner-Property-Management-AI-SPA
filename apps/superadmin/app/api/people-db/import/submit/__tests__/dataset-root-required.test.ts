// Row 146 Step 3 — verify the synchronous /import/submit route enforces
// dataset_root and returns a 400 with a clear message when callers omit it.

import { NextRequest } from 'next/server';

// Auth: pass through as a super_admin so the route reaches the validation logic.
jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: async () => ({
    ok: true,
    userId: 'admin-1',
    source: 'session' as const,
    viaSession: true,
  }),
}));

// Stub the heavy file-parser + ES indexer; they should never be invoked when
// validation fails, but we still mock so a regression that bypasses the guard
// doesn't try to hit a real ES instance during tests.
jest.mock('@/lib/people-db/parse-dispatch', () => ({
  dispatchParse: jest.fn(),
  extOf: (name: string) => name.toLowerCase().slice(name.lastIndexOf('.')),
  isSupportedExt: (ext: string) => ['.csv', '.txt', '.xlsx', '.pdf'].includes(ext),
  UnsupportedFormatError: class extends Error {},
}));
jest.mock('@/lib/people-db/es-gateway', () => ({
  esBulkIndex: jest.fn().mockResolvedValue({ indexed: 0, failed: 0, failures: [] }),
}));
jest.mock('@/lib/people-db/import-mapper', () => ({
  mapRowsToDocuments: jest.fn(() => []),
}));

import { POST } from '../route';

function makeRequest(form: FormData) {
  // Build a NextRequest without a real multipart body — multipart FormData
  // requires TransformStream which isn't polyfilled in our jest env. The
  // route only reads via req.formData(), so we override that one method.
  const req = new NextRequest('http://localhost:3001/api/people-db/import/submit', {
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

describe('POST /api/people-db/import/submit — Row 146 dataset_root enforcement', () => {
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

  it('returns 400 when dataset_root is whitespace-only', async () => {
    const res = await POST(makeRequest(buildForm({ dataset_root: '   ' })));
    expect(res.status).toBe(400);
  });
});
