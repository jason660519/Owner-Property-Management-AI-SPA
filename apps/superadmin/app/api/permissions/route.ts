import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  
  try {
    const body = await request.json();
    const { roleId, permissionIds } = body;

    if (!roleId || !Array.isArray(permissionIds) || permissionIds.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // Check if user is admin (skipped for now, relying on middleware)

    // Prepare batch insert
    const records = permissionIds.map((pid: string) => ({
      role_id: roleId,
      permission_id: pid
    }));

    // Perform batch insert
    const { data, error } = await supabase
      .from('roles_permissions')
      .insert(records)
      .select();

    if (error) {
      console.error('Batch insert failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data.length });

  } catch (err: any) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
    const supabase = await createClient();
    try {
        const body = await request.json();
        const { roleId, permissionIds } = body;

        if (!roleId || !Array.isArray(permissionIds) || permissionIds.length === 0) {
            return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
        }

        const { error } = await supabase
            .from('roles_permissions')
            .delete()
            .eq('role_id', roleId)
            .in('permission_id', permissionIds);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
