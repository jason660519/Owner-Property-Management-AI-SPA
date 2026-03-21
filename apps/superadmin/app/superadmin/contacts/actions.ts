'use server';

import { createAdminClient } from '@/utils/supabase/admin';

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
  status: 'new' | 'read' | 'replied' | 'archived';
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
  status: 'new' | 'read' | 'replied' | 'archived';
  created_at: string;
  source_path: string | null;
  source_context: ContactLeadSourceContext | null;
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

  return (data satisfies ContactMessageRow[]).map((row) => ({
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
  }));
}