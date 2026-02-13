/**
 * Integration Test: User Count Synchronization
 * 
 * This test verifies that the superadmin dashboard displays the correct
 * total user count that matches the Supabase Auth control panel.
 * 
 * Test Scenario:
 * 1. Get initial user count from dashboard
 * 2. Create a new user via Supabase Auth
 * 3. Verify dashboard shows updated count
 * 4. Verify count matches auth.users table
 */

import { createAdminClient } from '@/utils/supabase/admin';
import { getAdminDashboardStats } from '@/lib/actions/dashboard';

describe('User Count Synchronization Integration Test', () => {
  let supabaseAdmin: ReturnType<typeof createAdminClient>;
  let testUserEmail: string;
  let testUserId: string | null = null;

  beforeAll(() => {
    supabaseAdmin = createAdminClient();
  });

  afterEach(async () => {
    // Cleanup: Delete test user if created
    if (testUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(testUserId);
        testUserId = null;
      } catch (error) {
        console.error('Failed to cleanup test user:', error);
      }
    }
  });

  it('should sync user count between dashboard and Supabase Auth after creating a new user', async () => {
    // Step 1: Get initial counts
    const initialStats = await getAdminDashboardStats();
    const { data: initialAuthData } = await supabaseAdmin.auth.admin.listUsers();
    const initialAuthCount = initialAuthData.users.length;

    // Verify initial sync
    expect(initialStats.totalUsers).toBe(initialAuthCount);
    console.log(`✓ Initial sync verified: ${initialAuthCount} users`);

    // Step 2: Create a new test user
    testUserEmail = `test-sync-${Date.now()}@example.com`;
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });

    expect(createError).toBeNull();
    expect(newUserData.user).toBeDefined();
    testUserId = newUserData.user?.id || null;
    
    console.log(`✓ Created test user: ${testUserEmail}`);

    // Step 3: Get updated counts
    const updatedStats = await getAdminDashboardStats();
    const { data: updatedAuthData } = await supabaseAdmin.auth.admin.listUsers();
    const updatedAuthCount = updatedAuthData.users.length;

    // Step 4: Verify synchronization
    expect(updatedAuthCount).toBe(initialAuthCount + 1);
    expect(updatedStats.totalUsers).toBe(updatedAuthCount);
    expect(updatedStats.totalUsers).toBe(initialStats.totalUsers + 1);

    console.log(`✓ Sync verified after user creation: ${updatedAuthCount} users`);
    console.log(`  - Dashboard count: ${updatedStats.totalUsers}`);
    console.log(`  - Auth.users count: ${updatedAuthCount}`);
    console.log(`  - Increase: +1 user`);
  });

  it('should sync user count after deleting a user', async () => {
    // Create a test user first
    testUserEmail = `test-delete-${Date.now()}@example.com`;
    const { data: newUserData } = await supabaseAdmin.auth.admin.createUser({
      email: testUserEmail,
      password: 'TestPassword123!',
      email_confirm: true,
    });
    testUserId = newUserData.user?.id || null;

    // Get count with the new user
    const beforeDeleteStats = await getAdminDashboardStats();
    const { data: beforeDeleteAuthData } = await supabaseAdmin.auth.admin.listUsers();
    const beforeDeleteCount = beforeDeleteAuthData.users.length;

    expect(beforeDeleteStats.totalUsers).toBe(beforeDeleteCount);

    // Delete the user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(testUserId!);
    expect(deleteError).toBeNull();
    testUserId = null; // Mark as deleted

    console.log(`✓ Deleted test user: ${testUserEmail}`);

    // Verify count decreased
    const afterDeleteStats = await getAdminDashboardStats();
    const { data: afterDeleteAuthData } = await supabaseAdmin.auth.admin.listUsers();
    const afterDeleteCount = afterDeleteAuthData.users.length;

    expect(afterDeleteCount).toBe(beforeDeleteCount - 1);
    expect(afterDeleteStats.totalUsers).toBe(afterDeleteCount);
    expect(afterDeleteStats.totalUsers).toBe(beforeDeleteStats.totalUsers - 1);

    console.log(`✓ Sync verified after user deletion: ${afterDeleteCount} users`);
  });

  it('should show consistent counts across multiple refreshes', async () => {
    // Fetch stats multiple times
    const stats1 = await getAdminDashboardStats();
    const stats2 = await getAdminDashboardStats();
    const stats3 = await getAdminDashboardStats();

    // Get actual auth count
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const actualCount = authData.users.length;

    // All should be consistent
    expect(stats1.totalUsers).toBe(actualCount);
    expect(stats2.totalUsers).toBe(actualCount);
    expect(stats3.totalUsers).toBe(actualCount);
    expect(stats1.totalUsers).toBe(stats2.totalUsers);
    expect(stats2.totalUsers).toBe(stats3.totalUsers);

    console.log(`✓ Consistency verified: ${actualCount} users across 3 fetches`);
  });

  it('should not count users_profile records that have no corresponding auth.users entry', async () => {
    // This test verifies that we're querying the correct source (auth.users)
    // and not users_profile which might have orphaned or incomplete records
    
    const dashboardStats = await getAdminDashboardStats();
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
    const authCount = authData.users.length;

    // Dashboard should match auth.users exactly
    expect(dashboardStats.totalUsers).toBe(authCount);

    // Query users_profile to see if there's a discrepancy (this was the bug)
    const { count: profileCount } = await supabaseAdmin
      .from('users_profile')
      .select('*', { count: 'exact', head: true });

    console.log(`✓ Auth users count: ${authCount}`);
    console.log(`  Users_profile count: ${profileCount}`);
    console.log(`  Dashboard shows: ${dashboardStats.totalUsers}`);
    
    // The fix ensures dashboard uses auth.users, not users_profile
    expect(dashboardStats.totalUsers).toBe(authCount);
    
    if (profileCount !== authCount) {
      console.log(`  ⚠️  Discrepancy detected: ${Math.abs((profileCount || 0) - authCount)} users difference`);
      console.log(`  ✓ Dashboard correctly uses auth.users count`);
    }
  });
});
