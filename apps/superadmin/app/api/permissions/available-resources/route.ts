import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const roleId = searchParams.get('roleId');

  if (!roleId) {
    return NextResponse.json({ error: 'roleId is required' }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    // 1. Get all permission IDs assigned to this role
    const { data: assignedData, error: assignedError } = await supabase
      .from('roles_permissions')
      .select('permission_id')
      .eq('role_id', roleId);

    if (assignedError) {
      throw assignedError;
    }

    const assignedIds = assignedData.map((p: { permission_id: string }) => p.permission_id);

    // 2. Get all permissions that are NOT in the assigned list
    let query = supabase
      .from('permissions')
      .select(`
        id,
        name,
        resource_type,
        functions (id, name, code),
        tables (id, name, table_name),
        pages (id, name, path)
      `);

    if (assignedIds.length > 0) {
      query = query.not('id', 'in', `(${assignedIds.join(',')})`);
    }

    const { data: availablePermissions, error: resourcesError } = await query;

    if (resourcesError) {
      throw resourcesError;
    }

    // Transform result
    const result = {
      functions: [] as Record<string, unknown>[],
      tables: [] as Record<string, unknown>[],
      pages: [] as Record<string, unknown>[]
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    availablePermissions?.forEach((p: any) => {
      const item = {
        id: p.id, // Permission ID to be added
        name: p.name,
      };

      if (p.resource_type === 'function' && p.functions) {
        result.functions.push({ ...item, code: p.functions.code, resourceName: p.functions.name });
      } else if (p.resource_type === 'table' && p.tables) {
        result.tables.push({ ...item, tableName: p.tables.table_name, resourceName: p.tables.name });
      } else if (p.resource_type === 'page' && p.pages) {
        result.pages.push({ ...item, path: p.pages.path, resourceName: p.pages.name });
      }
    });

    return NextResponse.json(result);

  } catch (err: unknown) {
    console.error('Error fetching available resources:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
