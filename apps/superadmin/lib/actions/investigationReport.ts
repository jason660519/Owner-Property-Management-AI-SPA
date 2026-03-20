// Server actions for property investigation reports (不動產說明書)
'use server';

import { createAdminClient } from '@/utils/supabase/admin';
import type { InvestigationReport } from '@/components/admin/properties/investigation-report/types';

export interface InvestigationReportVersion {
  id: string;
  version: number;
  createdAt: string;
  caseName: string;
}

/** Load the latest saved investigation report for a property */
export async function loadInvestigationReport(
  propertyId: string,
  propertyType: 'sales' | 'rentals',
): Promise<{ data: InvestigationReport | null; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('property_investigation_reports')
    .select('data')
    .eq('property_id', propertyId)
    .eq('property_type', propertyType)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data: (data?.data as InvestigationReport) ?? null, error: null };
}

/** Save a new version of the investigation report */
export async function saveInvestigationReport(
  propertyId: string,
  propertyType: 'sales' | 'rentals',
  report: InvestigationReport,
): Promise<{ error: string | null }> {
  const admin = createAdminClient();

  // Get current max version number
  const { data: existing } = await admin
    .from('property_investigation_reports')
    .select('version')
    .eq('property_id', propertyId)
    .eq('property_type', propertyType)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (existing?.version ?? 0) + 1;

  const { error } = await admin.from('property_investigation_reports').insert({
    property_id: propertyId,
    property_type: propertyType,
    version: nextVersion,
    data: report,
  });

  return { error: error?.message ?? null };
}

/** List saved versions (summary only, no full data) */
export async function listInvestigationVersions(
  propertyId: string,
  propertyType: 'sales' | 'rentals',
): Promise<{ data: InvestigationReportVersion[]; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('property_investigation_reports')
    .select('id, version, created_at, data->caseName')
    .eq('property_id', propertyId)
    .eq('property_type', propertyType)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return { data: [], error: error.message };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id as string,
      version: r.version as number,
      createdAt: r.created_at as string,
      caseName: (r.caseName as string) ?? '',
    })),
    error: null,
  };
}

/** Load a specific version by its row ID */
export async function loadInvestigationVersion(
  versionId: string,
): Promise<{ data: InvestigationReport | null; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('property_investigation_reports')
    .select('data')
    .eq('id', versionId)
    .single();

  if (error) return { data: null, error: error.message };
  return { data: data?.data as InvestigationReport, error: null };
}
