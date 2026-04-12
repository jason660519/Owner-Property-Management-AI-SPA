// Centralized URL builders for Paperclip deep links used by superadmin UI.
// Keep all VIS/issues URL composition in one place to avoid hardcoded drift.

const DEFAULT_COMPANY_SLUG = 'VIS';

export function normalizePaperclipBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, '');
}

export function buildPaperclipIssueUrl(
  baseUrl: string,
  issueRef: string,
  companySlug = DEFAULT_COMPANY_SLUG,
): string {
  return `${normalizePaperclipBaseUrl(baseUrl)}/${companySlug}/issues/${encodeURIComponent(issueRef)}`;
}

export function buildPaperclipIssueSearchUrl(
  baseUrl: string,
  search: string,
  companySlug = DEFAULT_COMPANY_SLUG,
): string {
  return `${normalizePaperclipBaseUrl(baseUrl)}/${companySlug}/issues?search=${encodeURIComponent(search)}`;
}
