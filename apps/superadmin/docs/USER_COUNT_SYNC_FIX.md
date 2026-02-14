# User Count Synchronization Fix

## Problem Description

The superadmin dashboard at `http://localhost:3001/superadmin` was displaying a different total user count than the Supabase Auth control panel at `http://localhost:54323/project/default/auth/users`.

### Root Cause

The dashboard was querying the `users_profile` table (an application-layer user configuration table) instead of the `auth.users` table (Supabase Auth's core user table).

```typescript
// ❌ BEFORE: Incorrect query
const { count: totalUsers } = await supabase
  .from('users_profile')
  .select('*', { count: 'exact', head: true });
```

**Issue**: Not all users registered in `auth.users` automatically have a corresponding record in `users_profile`, leading to count discrepancies.

## Solution

Changed the query to use Supabase Auth Admin API's `listUsers()` method, which directly queries the `auth.users` table:

```typescript
// ✅ AFTER: Correct query
const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
const totalUsers = authUsersData.users?.length || 0;
```

## Changes Made

### 1. Updated Dashboard Stats Function
**File**: `apps/superadmin/lib/actions/dashboard.ts`

- Replaced `users_profile` table query with `auth.admin.listUsers()`
- Added enhanced error logging with timestamps
- Added debug logging to trace data source

### 2. Added Unit Tests
**File**: `apps/superadmin/lib/actions/dashboard.test.ts`

Tests verify:
- Correct fetching from `auth.users` via `auth.admin.listUsers()`
- Handling of empty user lists
- Error handling and logging
- Synchronization with Supabase Auth control panel

### 3. Added Integration Tests
**File**: `apps/superadmin/lib/actions/dashboard.integration.test.ts`

Tests verify:
- Real-time synchronization after user creation
- Real-time synchronization after user deletion
- Consistency across multiple refreshes
- Independence from `users_profile` table count

## Technical Details

### Data Flow

```
┌─────────────────────┐
│  Supabase Auth      │
│  Control Panel      │
│  (Port 54323)       │
└──────────┬──────────┘
           │
           │ Both query the same source
           ▼
    ┌──────────────┐
    │ auth.users   │ ◄── Authoritative source
    │   table      │
    └──────────────┘
           ▲
           │
           │
┌──────────┴──────────┐
│  Superadmin         │
│  Dashboard          │
│  (Port 3001)        │
└─────────────────────┘
```

### Why This Fix Works

1. **Single Source of Truth**: Both the dashboard and Supabase Auth console now query the same `auth.users` table
2. **No Caching**: Page uses `dynamic = 'force-dynamic'` to prevent Next.js caching
3. **Admin Access**: Using `auth.admin.listUsers()` bypasses RLS policies
4. **Real-time Sync**: No intermediary tables that could become out of sync

## Verification Steps

### 1. Check Current User Counts

```bash
# In Supabase SQL Editor
SELECT COUNT(*) as auth_users_count FROM auth.users;
SELECT COUNT(*) as profile_users_count FROM public.users_profile;
```

### 2. Access Dashboard
Navigate to `http://localhost:3001/superadmin` and verify the user count matches the `auth.users` count.

### 3. Create a Test User

Via Supabase Auth Dashboard or API:
```typescript
await supabase.auth.admin.createUser({
  email: 'test@example.com',
  password: 'password123',
  email_confirm: true
});
```

Refresh the dashboard and verify count increased by 1.

### 4. Run Tests

```bash
cd apps/superadmin

# Unit tests
npm test -- dashboard.test.ts

# Integration tests  
npm test -- dashboard.integration.test.ts
```

## Monitoring & Debugging

### Check Logs

The updated code logs all fetch operations:

```javascript
// Success log
[Dashboard Stats] Fetched successfully: {
  totalUsers: 15,
  timestamp: '2026-02-14T10:30:00.000Z',
  source: 'auth.admin.listUsers'
}

// Error log
[Dashboard Stats] Error fetching admin stats: {
  error: 'Auth service unavailable',
  stack: '...',
  timestamp: '2026-02-14T10:30:00.000Z'
}
```

### Verify Sync

Run this query periodically to ensure sync:

```sql
-- Compare counts
SELECT 
  (SELECT COUNT(*) FROM auth.users) as auth_count,
  (SELECT COUNT(*) FROM public.users_profile) as profile_count;
```

## Potential Issues & Solutions

### Issue 1: Permission Denied

**Symptom**: `auth.admin.listUsers()` returns permission error

**Solution**: Ensure using server-side client with proper credentials:
```typescript
const supabase = await createClient(); // Server-side with session
```

### Issue 2: Count Still Not Matching

**Symptom**: Dashboard count still differs from Auth console

**Solution**:
1. Check browser console for errors
2. Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL`
3. Clear browser cache and hard refresh (Cmd+Shift+R)
4. Check server logs for auth errors

### Issue 3: Slow Performance

**Symptom**: Dashboard loads slowly with many users

**Solution**: Consider pagination for large user bases:
```typescript
const { data, error } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000
});
```

## Future Considerations

1. **Caching Strategy**: For very large user bases (>10,000), consider:
   - Redis caching with 1-minute TTL
   - Incremental updates via webhooks

2. **Real-time Updates**: Implement Supabase Realtime for instant updates:
   ```typescript
   supabase
     .channel('auth-users')
     .on('postgres_changes', 
       { event: '*', schema: 'auth', table: 'users' },
       () => revalidatePath('/superadmin')
     )
   ```

3. **Metrics Dashboard**: Track sync accuracy over time

## Related Files

- `apps/superadmin/lib/actions/dashboard.ts` - Main stats function
- `apps/superadmin/app/superadmin/page.tsx` - Dashboard page
- `apps/superadmin/components/dashboard/SuperadminDashboardClient.tsx` - UI component
- `apps/superadmin/utils/supabase/server.ts` - Supabase client factory
- `supabase/migrations/20260122000000_full_schema.sql` - Schema definition

## Testing Checklist

- [x] Unit tests pass
- [x] Integration tests pass
- [x] Manual verification with test user creation
- [x] Manual verification with test user deletion
- [x] Count matches across dashboard and Supabase console
- [x] No console errors
- [x] Proper error logging
- [x] Documentation updated

## Deployment Notes

1. No database migrations required
2. No environment variable changes needed
3. Zero downtime deployment safe
4. Backward compatible (only changes data source)

## Support

If issues persist after applying this fix:

1. Check server logs: `tail -f logs/system/*.log`
2. Verify Supabase connection: Test in Supabase SQL editor
3. Review test results: Failing tests indicate specific issues
4. Check IAM permissions: User must have admin access

---

**Fixed by**: GitHub Copilot  
**Date**: 2026-02-14  
**Version**: 1.0  
**Status**: ✅ Resolved
