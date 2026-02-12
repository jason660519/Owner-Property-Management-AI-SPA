import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    // 1. Fetch Real IAM Snapshot Data
    const [
      { data: { users }, error: userError },
      { data: groups, error: groupError },
      { data: roles, error: roleError },
      { data: members, error: memberError },
      { data: groupRoles, error: groupRoleError }
    ] = await Promise.all([
      supabase.auth.admin.listUsers(),
      supabase.from('iam_groups').select('*'),
      supabase.from('iam_roles').select('*'),
      supabase.from('iam_group_members').select('*'),
      supabase.from('iam_group_roles').select('*')
    ]);

    if (userError || groupError || roleError || memberError || groupRoleError) {
      console.error('Error fetching IAM data', { userError, groupError, roleError });
      return NextResponse.json({ error: 'Failed to fetch IAM data' }, { status: 500 });
    }

    // 2. Calculate Statistics (Real Snapshot Stats)
    
    // Deduplicate logic for unique people (by email) and active users
    const uniqueEmails = new Set(users.map(u => u.email));
    
    // Active users logic: Deduplicate by email to count 'people'
    const activeThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const activeAccounts = users.filter(u => u.last_sign_in_at && new Date(u.last_sign_in_at) > activeThreshold);
    const activeUniqueEmails = new Set(activeAccounts.map(u => u.email));

    const stats = {
      totalAccounts: users.length,
      totalPeople: uniqueEmails.size,
      activeUsers: activeUniqueEmails.size,
      totalGroups: groups?.length || 0,
      totalRoles: roles?.length || 0,
      // These changes would ideally come from a real audit table. 
      // We will mock them for the demonstration as per requirements if no table exists.
      addedToday: 2, 
      modifiedToday: 5,
      deletedToday: 1
    };

    // 3. Generate Mock Audit Logs (simulating history based on real users)
    // In a real production system, this would query an 'audit_logs' table.
    const auditLogs = users.slice(0, 10).map((user, index) => ({
      id: `log-${index}`,
      timestamp: new Date(Date.now() - index * 1000 * 60 * 60 * 2).toISOString(), // Spread over time
      actor: 'system_admin',
      target: user.email,
      targetType: 'USER',
      action: index % 3 === 0 ? 'UPDATE_ROLE' : (index % 3 === 1 ? 'ADD_TO_GROUP' : 'LOGIN'),
      details: index % 3 === 0 
        ? `Role changed to ${user.user_metadata?.role || 'user'}`
        : (index % 3 === 1 ? 'Added to group "Users"' : 'User logged in'),
      status: 'SUCCESS'
    }));

    // Add some role/group changes
    groups?.slice(0, 3).forEach((group, index) => {
      auditLogs.push({
        id: `log-group-${index}`,
        timestamp: new Date(Date.now() - index * 1000 * 60 * 60 * 5).toISOString(),
        actor: 'super_admin',
        target: group.name,
        targetType: 'GROUP',
        action: 'UPDATE_PERMISSION',
        details: 'Modified permissions for group',
        status: 'SUCCESS'
      });
    });

    // Sort logs by time
    auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      snapshot: {
        users: users.map(u => ({
            id: u.id,
            email: u.email,
            role: u.user_metadata?.role || 'N/A',
            lastSignIn: u.last_sign_in_at
        })),
        groups,
        roles
      },
      stats,
      logs: auditLogs
    });

  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
