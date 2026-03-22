'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { CONTACT_LEAD_STATUS_VALUES, type ContactLeadStatus } from './constants';

const BASE = '/superadmin/contacts';

export interface ContactLeadSourceContext {
  entryPoint?: string;
  propertyId?: string;
  propertyTitle?: string;
}

export interface ContactLead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  inquiryType: string;
  message: string;
  status: ContactLeadStatus;
  createdAt: string;
  sourcePath?: string;
  sourceContext?: ContactLeadSourceContext;
  leadReference: string;
}

interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  inquiry_type: string;
  message: string;
  status: ContactLeadStatus;
  created_at: string;
  source_path: string | null;
  source_context: ContactLeadSourceContext | null;
}

function mapContactMessageRow(row: ContactMessageRow): ContactLead {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    inquiryType: row.inquiry_type,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    sourcePath: row.source_path ?? undefined,
    sourceContext: row.source_context ?? undefined,
    leadReference: `LEAD-${row.id.slice(0, 8).toUpperCase()}`,
  };
}

export async function getContactLeads(): Promise<ContactLead[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('contact_messages')
    .select(
      'id, name, email, phone, inquiry_type, message, status, created_at, source_path, source_context',
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch contact leads: ${error.message}`);
  }

  return (data satisfies ContactMessageRow[]).map(mapContactMessageRow);
}

export async function getContactLeadById(id: string): Promise<ContactLead | null> {
  const leadId = id.trim();

  if (!leadId) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('contact_messages')
    .select(
      'id, name, email, phone, inquiry_type, message, status, created_at, source_path, source_context',
    )
    .eq('id', leadId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }

    throw new Error(`Failed to fetch contact lead: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return mapContactMessageRow(data satisfies ContactMessageRow);
}

export async function updateContactLeadStatus(formData: FormData) {
  const leadId = String(formData.get('leadId') ?? '').trim();
  const status = String(formData.get('status') ?? '').trim();

  if (!leadId) {
    return { error: 'Lead id is required' };
  }

  if (!CONTACT_LEAD_STATUS_VALUES.includes(status as ContactLeadStatus)) {
    return { error: 'Invalid lead status' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('contact_messages')
    .update({ status: status as ContactLeadStatus })
    .eq('id', leadId)
    .select('id')
    .single();

  if (error) {
    return { error: `Failed to update lead status: ${error.message}` };
  }

  revalidatePath(BASE);
  revalidatePath(`${BASE}/${leadId}`);

  return { success: true };
}

export async function updateContactLeadStatuses(formData: FormData) {
  const leadIds = formData
    .getAll('leadIds')
    .map((value) => String(value).trim())
    .filter(Boolean);
  const uniqueLeadIds = Array.from(new Set(leadIds));
  const status = String(formData.get('status') ?? '').trim();

  if (uniqueLeadIds.length === 0) {
    return { error: 'At least one lead must be selected' };
  }

  if (!CONTACT_LEAD_STATUS_VALUES.includes(status as ContactLeadStatus)) {
    return { error: 'Invalid lead status' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('contact_messages')
    .update({ status: status as ContactLeadStatus })
    .in('id', uniqueLeadIds)
    .select('id');

  if (error) {
    return { error: `Failed to update lead status: ${error.message}` };
  }

  revalidatePath(BASE);
  uniqueLeadIds.forEach((leadId) => {
    revalidatePath(`${BASE}/${leadId}`);
  });

  return { success: true, updatedCount: data?.length ?? uniqueLeadIds.length };
}