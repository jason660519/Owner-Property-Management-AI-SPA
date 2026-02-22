import { render, screen } from '@testing-library/react';
import SuperadminIndexPage from './page';
import { getAdminDashboardStats } from '@/lib/actions/dashboard';

// Mock the server action (export FALLBACK_STATS so page can use it when stats fail)
jest.mock('@/lib/actions/dashboard', () => ({
  getAdminDashboardStats: jest.fn(),
  FALLBACK_STATS: {
    totalUsers: 0,
    totalGroups: 0,
    totalRoles: 0,
    superadminCount: 0,
    activeUsersCount: 0,
    onlineUsersCount: 0,
    totalProperties: 0,
    totalSales: 0,
    totalRentals: 0,
    overdueSalesCount: 0,
    overdueRentalsCount: 0,
    soldSalesCount: 0,
    totalBlogs: 0,
    surveyReportCountForSales: 0,
    salesContractsCount: 0,
    salesBlogCount: 0,
    surveyReportCountForRentals: 0,
    leaseContractsCount: 0,
    rentalBlogCount: 0,
    salesWithoutPhotoCount: 0,
    rentalsWithoutPhotoCount: 0,
    salesWithoutBlogCount: 0,
    rentalsWithoutBlogCount: 0,
    activeRentals: 0,
    activeListings: 0,
    totalRevenue: 0,
    pendingVerifications: 0,
  },
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
    loadError,
  }: {
    stats: { totalUsers: number };
    userName?: string;
    loadError?: string;
  }) {
    return (
      <div data-testid="dashboard-client">
        {loadError && <p>資料暫時無法完整載入</p>}
        Dashboard Client Loaded with {stats.totalUsers} users
        {userName != null && ` (${userName})`}
      </div>
    );
  };
});

const mockStats = {
  totalUsers: 100,
  totalProperties: 50,
  activeRentals: 20,
  pendingVerifications: 5,
};

describe('SuperadminIndexPage', () => {
  beforeEach(() => {
    (getAdminDashboardStats as jest.Mock).mockResolvedValue(mockStats);
    const { createClient } = require('@/utils/supabase/server');
    (createClient as jest.Mock).mockImplementation(() =>
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
    );
  });

  it('renders dashboard client with stats when data loads successfully', async () => {
    (getAdminDashboardStats as jest.Mock).mockResolvedValue(mockStats);

    const ui = await SuperadminIndexPage();
    render(ui);

    expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
    expect(screen.getByText(/Dashboard Client Loaded with 100 users/)).toBeInTheDocument();
    expect(screen.getByText(/\(admin\)/)).toBeInTheDocument();
  });

  it('renders dashboard with fallback stats when getAdminDashboardStats fails (no error boundary)', async () => {
    (getAdminDashboardStats as jest.Mock).mockRejectedValue(new Error('Missing Supabase credentials'));

    const ui = await SuperadminIndexPage();
    render(ui);

    expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
    expect(screen.getByText(/Dashboard Client Loaded with 0 users/)).toBeInTheDocument();
    expect(screen.getByText(/資料暫時無法完整載入/)).toBeInTheDocument();
  });

  it('renders dashboard with fallback when createClient fails (no error boundary)', async () => {
    const { createClient } = require('@/utils/supabase/server');
    (createClient as jest.Mock).mockRejectedValue(new Error('Failed to create client'));

    const ui = await SuperadminIndexPage();
    render(ui);

    expect(screen.getByTestId('dashboard-client')).toBeInTheDocument();
    expect(screen.getByText(/Dashboard Client Loaded with 100 users/)).toBeInTheDocument();
  });
});
