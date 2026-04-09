import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runAnomalyDetection } from '@/app/superadmin/dashboard/behavior-monitoring/actions';
import { createAdminClient } from '@/utils/supabase/admin';

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Anomaly Detection Admin Actions', () => {
  const rpcMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (createAdminClient as unknown as jest.Mock).mockReturnValue({
      rpc: rpcMock,
    });
  });

  it('calls detect_behavior_anomalies RPC and returns success on no error', async () => {
    rpcMock.mockResolvedValue({ error: null });

    const result = await runAnomalyDetection();

    expect(rpcMock).toHaveBeenCalledWith('detect_behavior_anomalies');
    expect(result).toEqual({
      success: true,
      message: 'Anomaly detection completed',
    });
  });

  it('returns failure message when RPC returns error', async () => {
    rpcMock.mockResolvedValue({ error: { message: 'RPC failed' } });

    const result = await runAnomalyDetection();

    expect(rpcMock).toHaveBeenCalledWith('detect_behavior_anomalies');
    expect(result.success).toBe(false);
    expect(result.message).toContain('RPC failed');
  });
});

