// filepath: apps/superadmin/lib/actions/dashboard.test.ts
// created: 2026-02-14 | creator: Claude Opus 4.6
// last-modified: 2026-02-14 | modifier: Claude Opus 4.6
// All superadmin dashboard queries use adminClient (service_role) to bypass RLS
import { getAdminDashboardStats } from './dashboard';
import { createAdminClient } from '@/utils/supabase/admin';

jest.mock('@/utils/supabase/admin', () => ({
  createAdminClient: jest.fn(),
}));

describe('getAdminDashboardStats', () => {
  let mockAdminClient: ReturnType<typeof createMockAdminClient>;

  function createMockAdminClient() {
    return {
      auth: {
        admin: {
          listUsers: jest.fn(),
        },
      },
      from: jest.fn(),
      rpc: jest.fn().mockResolvedValue({ data: {}, error: null }),
    };
  }

  /** Helper: set up mockAdminClient.from to return specified counts */
  function mockPropertyCounts(counts: {
    salesCount?: number | null;
    rentalsCount?: number | null;
    activeRentals?: number | null;
    activeListings?: number | null;
    salesError?: object | null;
    rentalsError?: object | null;
    activeRentalsError?: object | null;
    activeListingsError?: object | null;
  }) {
    const {
      salesCount = 0,
      rentalsCount = 0,
      activeRentals = 0,
      activeListings = 0,
      salesError = null,
      rentalsError = null,
      activeRentalsError = null,
      activeListingsError = null,
    } = counts;

    // Track call order for each table to differentiate between
    // the "total count" call and the ".eq(status)" call
    const callCounts: Record<string, number> = {};

    mockAdminClient.from.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1;
      const callNum = callCounts[table];

      const chainable = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        count: 0,
        error: null,
        data: null,
        then: function(resolve: any) {
          resolve({ count: this.count, error: this.error, data: this.data });
        }
      };

      if (table === 'property_sales') {
        if (callNum === 1) chainable.count = salesCount || 0;
        else if (callNum === 2) chainable.count = activeListings || 0;
        else chainable.count = 0;
        if (callNum === 1) chainable.error = salesError as any;
        else if (callNum === 2) chainable.error = activeListingsError as any;
        return chainable;
      }

      if (table === 'property_rentals') {
        if (callNum === 1) chainable.count = rentalsCount || 0;
        else if (callNum === 2) chainable.count = activeRentals || 0;
        else chainable.count = 0;
        if (callNum === 1) chainable.error = rentalsError as any;
        else if (callNum === 2) chainable.error = activeRentalsError as any;
        return chainable;
      }

      return chainable;
    });
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockAdminClient = createMockAdminClient();
    (createAdminClient as jest.Mock).mockReturnValue(mockAdminClient);
  });

  it('should use adminClient (service_role) for ALL queries to bypass RLS', async () => {
    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: '1', email: 'user@example.com' }] },
      error: null,
    });
    mockPropertyCounts({ salesCount: 3, rentalsCount: 3 });

    const stats = await getAdminDashboardStats();

    // Auth query uses adminClient
    expect(mockAdminClient.auth.admin.listUsers).toHaveBeenCalledTimes(1);
    // Property queries also use adminClient (same mock)
    expect(mockAdminClient.from).toHaveBeenCalledWith('property_sales');
    expect(mockAdminClient.from).toHaveBeenCalledWith('property_rentals');
    expect(stats.totalUsers).toBe(1);
    expect(stats.totalProperties).toBe(6);
  });

  it('should fetch correct total properties from both tables', async () => {
    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    mockPropertyCounts({ salesCount: 10, rentalsCount: 8, activeRentals: 3, activeListings: 5 });

    const stats = await getAdminDashboardStats();

    expect(stats.totalProperties).toBe(18); // 10 + 8
    expect(stats.activeRentals).toBe(3);
    expect(stats.activeListings).toBe(5);
  });

  it('should return 0 users when auth.admin.listUsers returns empty', async () => {
    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
    mockPropertyCounts({});

    const stats = await getAdminDashboardStats();
    expect(stats.totalUsers).toBe(0);
  });

  it('should handle auth.admin.listUsers errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: null,
      error: { message: 'Auth service unavailable' },
    });

    const stats = await getAdminDashboardStats();

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(stats.totalUsers).toBe(0);
    expect(stats.totalProperties).toBe(0);

    consoleErrorSpy.mockRestore();
  });

  it('should log successful fetch with all stat details', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: '1', email: 'test@example.com' }] },
      error: null,
    });
    mockPropertyCounts({ salesCount: 3, rentalsCount: 2, activeRentals: 1, activeListings: 2 });

    await getAdminDashboardStats();

    expect(consoleLogSpy).toHaveBeenCalledWith(
      '[Dashboard Stats] Fetched successfully:',
      expect.objectContaining({
        totalUsers: 1,
        totalProperties: 5,
        salesCount: 3,
        rentalsCount: 2,
        source: 'adminClient (service_role, bypasses RLS)',
        timestamp: expect.any(String),
      })
    );

    consoleLogSpy.mockRestore();
  });

  it('should sync property counts with Supabase console (bypassing RLS)', async () => {
    // Scenario: DB has 5 sales (2 available, 3 sold) and 4 rentals (1 rented, 3 vacant)
    // Without service_role, RLS would only show available/vacant to public:
    //   - property_sales: 2 (only available) instead of 5
    //   - property_rentals: 3 (only vacant) instead of 4
    // With service_role, we see ALL: 5 + 4 = 9
    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: '1' }] },
      error: null,
    });
    mockPropertyCounts({
      salesCount: 5,
      rentalsCount: 4,
      activeRentals: 1,
      activeListings: 2,
    });

    const stats = await getAdminDashboardStats();

    expect(stats.totalProperties).toBe(9);
    expect(stats.activeRentals).toBe(1);
    expect(stats.activeListings).toBe(2);
  });

  it('should paginate when there are more users than perPage', async () => {
    const page1Users = Array.from({ length: 1000 }, (_, i) => ({
      id: `user-${i}`,
      email: `user${i}@example.com`,
    }));
    const page2Users = Array.from({ length: 50 }, (_, i) => ({
      id: `user-${1000 + i}`,
      email: `user${1000 + i}@example.com`,
    }));

    mockAdminClient.auth.admin.listUsers
      .mockResolvedValueOnce({ data: { users: page1Users }, error: null })
      .mockResolvedValueOnce({ data: { users: page2Users }, error: null });

    mockPropertyCounts({});

    const stats = await getAdminDashboardStats();

    expect(mockAdminClient.auth.admin.listUsers).toHaveBeenCalledTimes(2);
    expect(mockAdminClient.auth.admin.listUsers).toHaveBeenNthCalledWith(1, {
      page: 1,
      perPage: 1000,
    });
    expect(mockAdminClient.auth.admin.listUsers).toHaveBeenNthCalledWith(2, {
      page: 2,
      perPage: 1000,
    });
    expect(stats.totalUsers).toBe(1050);
  });

  it('should handle property query errors without crashing', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockAdminClient.auth.admin.listUsers.mockResolvedValue({
      data: { users: [{ id: '1' }] },
      error: null,
    });
    mockPropertyCounts({
      salesCount: null,
      salesError: { message: 'Table not found' },
      rentalsCount: 3,
    });

    const stats = await getAdminDashboardStats();

    // Should log the error but not crash
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Dashboard Stats] Error counting property_sales:',
      expect.objectContaining({ message: 'Table not found' })
    );
    // salesCount falls back to 0, rentalsCount is 3
    expect(stats.totalProperties).toBe(3);
    expect(stats.totalUsers).toBe(1);

    consoleErrorSpy.mockRestore();
  });
});
