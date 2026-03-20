import { createClient } from '@/utils/supabase/client';

export interface CloudDraftRecord<T> {
  id: string;
  name: string;
  data: T;
  updatedAt: string;
}

interface SaveCloudDraftParams<T> {
  formKey: string;
  name: string;
  data: T;
  draftId?: string | null;
}

interface DeleteCloudDraftParams {
  formKey: string;
  draftId?: string | null;
}

interface ListCloudDraftsParams {
  formKey: string;
  limit?: number;
}

export async function loadLatestCloudDraft<T>(formKey: string): Promise<CloudDraftRecord<T> | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('form_drafts')
    .select('id, name, data, updated_at')
    .eq('form_key', formKey)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    data: data.data as T,
    updatedAt: data.updated_at,
  };
}

export async function listCloudDrafts<T>({
  formKey,
  limit = 10,
}: ListCloudDraftsParams): Promise<CloudDraftRecord<T>[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('form_drafts')
    .select('id, name, data, updated_at')
    .eq('form_key', formKey)
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    data: item.data as T,
    updatedAt: item.updated_at,
  }));
}

export async function saveCloudDraft<T>({
  formKey,
  name,
  data,
  draftId,
}: SaveCloudDraftParams<T>): Promise<CloudDraftRecord<T>> {
  const supabase = createClient();

  if (draftId) {
    const { data: updated, error } = await supabase
      .from('form_drafts')
      .update({
        name,
        data,
      })
      .eq('id', draftId)
      .eq('form_key', formKey)
      .select('id, name, data, updated_at')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: updated.id,
      name: updated.name,
      data: updated.data as T,
      updatedAt: updated.updated_at,
    };
  }

  const { data: inserted, error } = await supabase
    .from('form_drafts')
    .insert({
      form_key: formKey,
      name,
      data,
    })
    .select('id, name, data, updated_at')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: inserted.id,
    name: inserted.name,
    data: inserted.data as T,
    updatedAt: inserted.updated_at,
  };
}

export async function deleteCloudDraft({ formKey, draftId }: DeleteCloudDraftParams): Promise<void> {
  const supabase = createClient();
  let query = supabase.from('form_drafts').delete().eq('form_key', formKey);

  if (draftId) {
    query = query.eq('id', draftId);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteCloudDraftById(draftId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('form_drafts').delete().eq('id', draftId);

  if (error) {
    throw new Error(error.message);
  }
}