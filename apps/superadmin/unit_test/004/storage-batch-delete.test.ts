import { describe, it, expect, vi, beforeEach } from 'vitest';
import { batchDeleteFiles } from '@/app/actions/storage';
import { createAdminClient } from '@/utils/supabase/admin';

vi.mock('@/utils/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

describe('batchDeleteFiles', () => {
  const removeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (createAdminClient as unknown as vi.Mock).mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          remove: removeMock,
        })),
      },
    });
  });

  it('returns early when paths is empty', async () => {
    const result = await batchDeleteFiles('bucket', []);
    expect(result).toEqual({ success: true, deleted: 0, errors: [] });
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('deletes files in chunks of 20 and aggregates deleted count', async () => {
    const paths = Array.from({ length: 45 }, (_, i) => `file-${i}.txt`);

    // First two chunks delete 20 each, last chunk deletes 5
    removeMock
      .mockResolvedValueOnce({ data: new Array(20).fill(null), error: null })
      .mockResolvedValueOnce({ data: new Array(20).fill(null), error: null })
      .mockResolvedValueOnce({ data: new Array(5).fill(null), error: null });

    const result = await batchDeleteFiles('my-bucket', paths);

    expect(removeMock).toHaveBeenCalledTimes(3);
    expect(removeMock).toHaveBeenNthCalledWith(1, paths.slice(0, 20));
    expect(removeMock).toHaveBeenNthCalledWith(2, paths.slice(20, 40));
    expect(removeMock).toHaveBeenNthCalledWith(3, paths.slice(40, 45));

    expect(result.success).toBe(true);
    expect(result.deleted).toBe(45);
    expect(result.errors).toEqual([]);
  });

  it('collects errors when a chunk delete fails', async () => {
    const paths = ['a.txt', 'b.txt'];

    removeMock
      .mockResolvedValueOnce({ data: ['a.txt'], error: null })
      .mockResolvedValueOnce({ data: [], error: { message: 'failed to delete b.txt' } });

    const result = await batchDeleteFiles('my-bucket', paths);

    expect(result.success).toBe(false);
    expect(result.deleted).toBe(1);
    expect(result.errors).toEqual(['failed to delete b.txt']);
  });
});

