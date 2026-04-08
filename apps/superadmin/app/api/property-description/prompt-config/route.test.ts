import { GET } from './route';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';

jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('@/lib/resolve-ai-settings-user', () => ({
  resolveUserId: jest.fn(),
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockCreateAdminClient = createAdminClient as jest.MockedFunction<typeof createAdminClient>;
const mockResolveUserId = resolveUserId as jest.MockedFunction<typeof resolveUserId>;

function createAdminMock(options: {
  modulePrompt?: { prompt_content: string; version?: number } | null;
  savedPrompt?: { content: string } | null;
}) {
  const modulePromptQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: options.modulePrompt ?? null }),
  };

  const savedPromptQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: options.savedPrompt ?? null }),
  };

  return {
    from: jest.fn((table: string) => {
      if (table === 'ai_system_prompts') return modulePromptQuery;
      if (table === 'saved_prompts') return savedPromptQuery;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
}

describe('GET /api/property-description/prompt-config', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    mockCreateAdminClient.mockReturnValue(createAdminMock({}) as unknown as ReturnType<typeof createAdminClient>);

    const response = await GET();
    expect(response.status).toBe(401);
  });

  it('prefers ai_system_prompt over saved/default', async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'auth-user' } } }) },
    } as unknown as Awaited<ReturnType<typeof createClient>>);
    mockResolveUserId.mockResolvedValue('effective-user');
    mockCreateAdminClient.mockReturnValue(
      createAdminMock({
        modulePrompt: { prompt_content: 'module prompt', version: 5 },
        savedPrompt: { content: 'saved prompt' },
      }) as unknown as ReturnType<typeof createAdminClient>,
    );

    const response = await GET();
    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload.source).toBe('ai_system_prompt');
    expect(payload.moduleKey).toBe('property_description');
    expect(payload.version).toBe(5);
  });
});
