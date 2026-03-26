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
  assigneeId: string | null;
  assigneeName: string | null;
}

export interface ContactLeadNote {
  id: string;
  leadId: string;
  authorId: string;
  authorName: string;
  content: string;
  noteType: 'note' | 'reply' | 'internal';
  createdAt: string;
}

export interface SuperadminUser {
  id: string;
  email: string;
  fullName: string | null;
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
  assignee_id: string | null;
  assignee_name: string | null;
}

interface ContactLeadNoteRow {
  id: string;
  lead_id: string;
  author_id: string;
  author_name: string;
  content: string;
  note_type: string;
  created_at: string;
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
    assigneeId: row.assignee_id ?? null,
    assigneeName: row.assignee_name ?? null,
  };
}

function mapNoteRow(row: ContactLeadNoteRow): ContactLeadNote {
  return {
    id: row.id,
    leadId: row.lead_id,
    authorId: row.author_id,
    authorName: row.author_name,
    content: row.content,
    noteType: row.note_type as ContactLeadNote['noteType'],
    createdAt: row.created_at,
  };
}

// ─── Lead queries ─────────────────────────────────────────────────────────────

export async function getContactLeads(): Promise<ContactLead[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('contact_messages')
    .select(
      'id, name, email, phone, inquiry_type, message, status, created_at, source_path, source_context, assignee_id, assignee_name',
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
      'id, name, email, phone, inquiry_type, message, status, created_at, source_path, source_context, assignee_id, assignee_name',
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

// ─── Status actions ────────────────────────────────────────────────────────────

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

// ─── Assignee actions ─────────────────────────────────────────────────────────

export async function getSuperadminUsers(): Promise<SuperadminUser[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // List all users via admin client and return basic profile info
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users_profile')
    .select('id, full_name, email')
    .order('full_name', { ascending: true });

  if (error || !data) return [];

  return (data as Array<{ id: string; full_name: string | null; email: string | null }>).map(
    (row) => ({
      id: row.id,
      email: row.email ?? '',
      fullName: row.full_name,
    }),
  );
}

export async function assignContactLead(formData: FormData) {
  const leadId = String(formData.get('leadId') ?? '').trim();
  const assigneeId = String(formData.get('assigneeId') ?? '').trim();
  const assigneeName = String(formData.get('assigneeName') ?? '').trim();

  if (!leadId) {
    return { error: 'Lead id is required' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const admin = createAdminClient();
  const patch =
    assigneeId
      ? { assignee_id: assigneeId, assignee_name: assigneeName || null }
      : { assignee_id: null, assignee_name: null };

  const { error } = await admin
    .from('contact_messages')
    .update(patch)
    .eq('id', leadId);

  if (error) {
    return { error: `Failed to assign lead: ${error.message}` };
  }

  revalidatePath(BASE);
  revalidatePath(`${BASE}/${leadId}`);

  return { success: true };
}

// ─── Notes actions ────────────────────────────────────────────────────────────

export async function getContactLeadNotes(leadId: string): Promise<ContactLeadNote[]> {
  if (!leadId.trim()) return [];

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('contact_lead_notes')
    .select('id, lead_id, author_id, author_name, content, note_type, created_at')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: true });

  if (error) return [];

  return (data satisfies ContactLeadNoteRow[]).map(mapNoteRow);
}

export async function addContactLeadNote(formData: FormData) {
  const leadId = String(formData.get('leadId') ?? '').trim();
  const content = String(formData.get('content') ?? '').trim();
  const noteType = String(formData.get('noteType') ?? 'note').trim() as ContactLeadNote['noteType'];

  if (!leadId) return { error: 'Lead id is required' };
  if (!content) return { error: '備註內容不能為空' };
  if (!['note', 'reply', 'internal'].includes(noteType)) return { error: 'Invalid note type' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  // Fetch author display name
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('users_profile')
    .select('full_name, email')
    .eq('id', user.id)
    .single();

  const authorName =
    (profile as { full_name: string | null; email: string | null } | null)?.full_name ||
    (profile as { full_name: string | null; email: string | null } | null)?.email ||
    user.email ||
    '管理員';

  const { error } = await admin.from('contact_lead_notes').insert({
    lead_id: leadId,
    author_id: user.id,
    author_name: authorName,
    content,
    note_type: noteType,
  });

  if (error) return { error: `Failed to add note: ${error.message}` };

  revalidatePath(`${BASE}/${leadId}`);
  return { success: true };
}

export async function deleteContactLeadNote(formData: FormData) {
  const noteId = String(formData.get('noteId') ?? '').trim();
  const leadId = String(formData.get('leadId') ?? '').trim();

  if (!noteId) return { error: 'Note id is required' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Unauthorized' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('contact_lead_notes')
    .delete()
    .eq('id', noteId);

  if (error) return { error: `Failed to delete note: ${error.message}` };

  if (leadId) revalidatePath(`${BASE}/${leadId}`);
  return { success: true };
}
