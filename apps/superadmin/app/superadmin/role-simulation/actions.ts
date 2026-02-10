'use server';

import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function setSimulationRole(role: string) {
  const cookieStore = await cookies();
  
  // Set the cookie for localhost (shared between port 3000 and 3001)
  // Note: Browsers treat different ports on localhost as the same domain for cookies
  cookieStore.set('x-simulation-role', role, {
    path: '/',
    domain: 'localhost',
    sameSite: 'lax',
    httpOnly: true,
  });

  // Log the action
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'START_SIMULATION',
      details: { simulated_role: role, timestamp: new Date().toISOString() },
      ip_address: '127.0.0.1' // In real app, get from headers
    });
  }

  return { success: true };
}

export async function exitSimulation() {
  const cookieStore = await cookies();
  cookieStore.delete('x-simulation-role');

  // Log the action
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (user) {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'END_SIMULATION',
      details: { timestamp: new Date().toISOString() },
      ip_address: '127.0.0.1'
    });
  }

  return { success: true };
}
