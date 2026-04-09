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

/** Upload condition statement PDF to cloud storage */
export async function uploadConditionStatementPdf(
  propertyId: string,
  pdfBase64: string,
): Promise<{ url: string | null; error: string | null }> {
  const admin = createAdminClient();
  const dayStamp = new Date().toISOString().slice(0, 10);
  const storagePath = `${propertyId}/condition-statement-${dayStamp}-${Date.now()}.pdf`;

  const buffer = Buffer.from(pdfBase64, 'base64');
  const { error: uploadError } = await admin.storage
    .from('property-documents')
    .upload(storagePath, buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/pdf',
    });

  if (uploadError) {
    return { url: null, error: `上傳失敗：${uploadError.message}` };
  }

  const { data: urlData } = await admin.storage
    .from('property-documents')
    .createSignedUrl(storagePath, 60 * 60 * 24 * 365);

  return { url: urlData?.signedUrl ?? null, error: null };
}

/** Condition statement PDF file info */
export interface ConditionStatementPdfFile {
  name: string;
  path: string;
  createdAt: string;
  size: number;
}

/** List condition statement PDFs for a property */
export async function listConditionStatementPdfs(
  propertyId: string,
): Promise<{ data: ConditionStatementPdfFile[]; error: string | null }> {
  const admin = createAdminClient();
  const prefix = `${propertyId}/`;
  const { data, error } = await admin.storage
    .from('property-documents')
    .list(prefix, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

  if (error) return { data: [], error: error.message };

  const pdfs = (data ?? [])
    .filter((f) => f.name.startsWith('condition-statement-') && f.name.endsWith('.pdf'))
    .map((f) => ({
      name: f.name,
      path: `${prefix}${f.name}`,
      createdAt: f.created_at ?? '',
      size: f.metadata?.size ?? 0,
    }));

  return { data: pdfs, error: null };
}

/** Get a signed URL for a condition statement PDF */
export async function getConditionStatementPdfUrl(
  filePath: string,
): Promise<{ url: string | null; error: string | null }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from('property-documents')
    .createSignedUrl(filePath, 60 * 60); // 1 hour

  if (error) return { url: null, error: error.message };
  return { url: data?.signedUrl ?? null, error: null };
}

/** Delete a condition statement PDF */
export async function deleteConditionStatementPdf(
  filePath: string,
): Promise<{ error: string | null }> {
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from('property-documents')
    .remove([filePath]);

  return { error: error?.message ?? null };
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
