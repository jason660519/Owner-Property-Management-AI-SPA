import { render, screen } from '@testing-library/react';
import SuperadminIndexPage from './page';
import { getAdminDashboardStats } from '@/lib/actions/dashboard';

// Mock the server action
jest.mock('@/lib/actions/dashboard', () => ({
  getAdminDashboardStats: jest.fn(),
}));

// Mock supabase server client (auth + profile)
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn(() =>
    Promise.resolve({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'admin@test.com', user_metadata: {} } },
          error: null,
        }),
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { display_name: null }, error: null }),
      })),
    })
  ),
}));

// Mock the client component
jest.mock('@/components/dashboard/SuperadminDashboardClient', () => {
  return function MockClient({
    stats,
    userName,
  }: {
    stats: { totalUsers: number };
    userName?: string;
  }) {
    return (
      <div data-testid="dashboard-client">
        Dashboard Client Loaded with {stats.totalUsers} users
        {userName != null && ` (${userName})`}
      </div>
    );
  };
});

describe('SuperadminIndexPage', () => {
  it('renders dashboard client with stats', async () => {
    const mockStats = {
      totalUsers: 100,
      totalProperties: 50,
      activeRentals: 20,
      pendingVerifications: 5,
    };
    
    (getAdminDashboardStats as jest.Mock).mockResolvedValue(mockStats);

    const ui = await SuperadminIndexPage();
    render(ui);

    expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
    expect(screen.getByText(/Dashboard Client Loaded with 100 users/)).toBeInTheDocument();
    expect(screen.getByText(/\(admin\)/)).toBeInTheDocument();
  });
});
