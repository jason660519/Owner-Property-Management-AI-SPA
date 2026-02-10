'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

const BASE = '/superadmin/dashboard/rbac_access_control';

export async function getRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('iam_roles')
    .select('*')
    .order('name');
  
  if (error) throw error;
  return data;
}

export async function deleteRole(roleId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from('iam_roles').delete().eq('id', roleId);
  
  if (error) return { error: error.message };
  
  revalidatePath(BASE);
  return { success: true };
}

export async function createRole(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  
  if (!name) return { error: 'Name is required' };
  
  const { error } = await supabase.from('iam_roles').insert({ name, description });
  
  if (error) return { error: error.message };
  
  revalidatePath(BASE);
  return { success: true };
}

export async function updateRole(formData: FormData) {
    const supabase = await createClient();
    const id = formData.get('id') as string;
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    
    if (!id || !name) return { error: 'ID and Name are required' };
    
    const { error } = await supabase
      .from('iam_roles')
      .update({ name, description })
      .eq('id', id);
    
    if (error) return { error: error.message };
    
    revalidatePath(BASE);
    return { success: true };
}
