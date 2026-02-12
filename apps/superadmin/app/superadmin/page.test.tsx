import { render, screen } from '@testing-library/react';
import SuperadminIndexPage from './page';
import { getAdminDashboardStats } from '@/lib/actions/dashboard';

// Mock the server action
jest.mock('@/lib/actions/dashboard', () => ({
  getAdminDashboardStats: jest.fn(),
}));

// Mock the client component
jest.mock('@/components/dashboard/SuperadminDashboardClient', () => {
  return function MockClient({ stats }: { stats: any }) {
    return <div data-testid="dashboard-client">Dashboard Client Loaded with {stats.totalUsers} users</div>;
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
    expect(screen.getByText('Dashboard Client Loaded with 100 users')).toBeInTheDocument();
  });
});
