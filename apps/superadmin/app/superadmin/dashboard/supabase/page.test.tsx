import { render, screen } from '@testing-library/react';
import SupabasePage from './page';

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: (_columns: string, options?: { count?: 'exact'; head?: boolean }) => {
        if (options?.head) return Promise.resolve({ count: 1, error: null });
        return {
          limit: async () => ({ error: null }),
        };
      },
    }),
    rpc: () => ({
      maybeSingle: async () => ({ data: null, error: null }),
    }),
  }),
}));

jest.mock('./SupabaseDashboardClient', () => ({
  __esModule: true,
  default: ({
    healthy,
    userCount,
    projectRef,
  }: {
    healthy: boolean;
    userCount: number;
    projectRef: string;
  }) => (
    <div data-testid="supabase-dashboard">
      {healthy ? 'healthy' : 'unhealthy'}|{userCount}|{projectRef}
    </div>
  ),
}));

describe('Super Admin Supabase Management Page', () => {
  it('renders dashboard data from server component', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://testref.supabase.co';
    const ui = await SupabasePage();
    render(ui);

    expect(screen.getByTestId('supabase-dashboard')).toHaveTextContent('healthy|1|testref');
  });
});
