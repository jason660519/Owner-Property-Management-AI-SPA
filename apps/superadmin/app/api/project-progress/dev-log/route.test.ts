import { NextRequest } from 'next/server';

jest.mock('fs', () => ({
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readFileSync: jest.fn(),
}));

jest.mock('@/app/data/roadmap', () => ({
  normalizeRoadmapFeatureId: (raw: string) => raw.trim().padStart(3, '0'),
  findRoadmapFeatureById: (id: string) => {
    const features = [
      {
        id: '001',
        name: 'Feature 1',
        category: '測試',
        percentage: 10,
        devLogDocPath: '/docs/operational-guides/transcript-parsing-guide.md',
      },
      {
        id: '002',
        name: 'Feature 2',
        category: '測試',
        percentage: 10,
        devLogDocPath: '/project-process/dev-logs/not-markdown.txt',
      },
    ];
    return features.find((feature) => feature.id === id);
  },
}));

jest.mock('@/lib/docs-config', () => ({
  getProjectRoot: jest.fn(() => '/repo'),
}));

jest.mock('@/lib/auth/require-superadmin', () => ({
  requireSuperadmin: jest.fn(),
}));

import fs from 'fs';
import { requireSuperadmin } from '@/lib/auth/require-superadmin';
import { GET } from './route';

const mockFs = fs as jest.Mocked<typeof fs>;
const mockRequireSuperadmin = requireSuperadmin as jest.MockedFunction<typeof requireSuperadmin>;

function createStatMock() {
  return {
    isFile: () => true,
    mtime: new Date('2026-04-17T00:00:00.000Z'),
    size: 123,
  } as ReturnType<typeof fs.statSync>;
}

describe('GET /api/project-progress/dev-log', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireSuperadmin.mockResolvedValue({
      ok: true,
      userId: 'superadmin-user',
      source: 'session',
      viaSession: true,
    });
  });

  it('returns configured markdown content for valid roadmap devLogDocPath', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue(createStatMock());
    mockFs.readFileSync.mockReturnValue('# transcript parsing');

    const request = new NextRequest('http://localhost/api/project-progress/dev-log?rowId=001');
    const response = await GET(request);
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.path).toBe('docs/operational-guides/transcript-parsing-guide.md');
    expect(payload.docPathState).toBe('configured');
    expect(payload.content).toBe('# transcript parsing');
  });

  it('returns auth errors before reading files', async () => {
    mockRequireSuperadmin.mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Unauthorized: missing session or header identity',
    });

    const request = new NextRequest('http://localhost/api/project-progress/dev-log?rowId=001');
    const response = await GET(request);
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(401);
    expect(payload.error).toBe('Unauthorized: missing session or header identity');
    expect(mockFs.existsSync).not.toHaveBeenCalled();
  });

  it('falls back when roadmap devLogDocPath is invalid', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.statSync.mockReturnValue(createStatMock());
    mockFs.readFileSync.mockReturnValue('# fallback content');

    const request = new NextRequest('http://localhost/api/project-progress/dev-log?rowId=002');
    const response = await GET(request);
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload.path).toBe('project-process/dev-logs/002-development-log-summary.md');
    expect(payload.docPathState).toBe('invalid');
    expect(payload.configuredValue).toBe('/project-process/dev-logs/not-markdown.txt');
  });

  it('sanitizes non-numeric row IDs before checking fallback files', async () => {
    mockFs.existsSync.mockReturnValue(false);

    const request = new NextRequest(
      'http://localhost/api/project-progress/dev-log?rowId=custom%20row%2F..%2F133',
    );
    const response = await GET(request);
    const payload = (await response.json()) as Record<string, unknown>;

    expect(response.status).toBe(404);
    expect(payload.path).toBe('project-process/dev-logs/custom-row-133-development-log-summary.md');
    expect(payload.docPathState).toBe('missing');
  });
});
