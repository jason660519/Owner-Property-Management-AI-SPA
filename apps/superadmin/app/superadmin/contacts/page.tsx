import { Mail } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import Link from 'next/link';
import { getContactLeads } from './actions';
import {
  CONTACT_LEAD_SOURCE_TYPE_LABELS,
  CONTACT_LEAD_SOURCE_TYPE_VALUES,
  CONTACT_LEAD_STATUS_VALUES,
  CONTACT_LEAD_STATUS_LABELS,
} from './constants';
import {
  filterContactLeads,
  getAvailableInquiryTypes,
  getContactLeadFilters,
  hasActiveLeadFilters,
} from './utils';
import { ContactLeadsTable } from './ContactLeadsTable';

export const dynamic = 'force-dynamic';

interface ContactsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps = {}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const leads = await getContactLeads();
  const filters = getContactLeadFilters(resolvedSearchParams);
  const filteredLeads = filterContactLeads(leads, filters);
  const inquiryTypes = getAvailableInquiryTypes(leads);
  const filtersActive = hasActiveLeadFilters(filters);

  const totalLeads = filteredLeads.length;
  const newLeads = filteredLeads.filter((lead) => lead.status === 'new').length;
  const propertyFlowLeads = filteredLeads.filter((lead) => lead.sourcePath?.startsWith('/properties')).length;

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle="Contact Leads"
      breadcrumbs={[
        { label: '首頁', href: '/superadmin' },
        { label: 'Contact Leads' },
      ]}
    >
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border-default bg-bg-primary p-5">
            <p className="text-sm text-text-muted">總 lead 數</p>
            <p className="mt-2 text-3xl font-semibold text-text-primary">{totalLeads}</p>
          </div>
          <div className="rounded-2xl border border-border-default bg-bg-primary p-5">
            <p className="text-sm text-text-muted">待處理</p>
            <p className="mt-2 text-3xl font-semibold text-text-primary">{newLeads}</p>
          </div>
          <div className="rounded-2xl border border-border-default bg-bg-primary p-5">
            <p className="text-sm text-text-muted">來自案件流程</p>
            <p className="mt-2 text-3xl font-semibold text-text-primary">{propertyFlowLeads}</p>
          </div>
        </section>

        <section className="rounded-2xl border border-border-default bg-bg-primary">
          <div className="flex items-center gap-3 border-b border-border-default px-6 py-4">
            <Mail className="h-5 w-5 text-accent" />
            <div>
              <h2 className="text-xl font-semibold text-text-primary">Contact Leads</h2>
              <p className="text-sm text-text-muted">
                檢視公開 contact funnel 帶進來的詢問、來源頁面與來源動作。
              </p>
            </div>
          </div>

          <form method="GET" className="grid gap-3 border-b border-border-default px-6 py-4 md:grid-cols-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-secondary">關鍵字</span>
              <input
                type="search"
                name="query"
                defaultValue={filters.query ?? ''}
                placeholder="姓名、Email、案件標題、Lead 編號"
                className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-secondary">狀態</span>
              <select
                name="status"
                defaultValue={filters.status ?? ''}
                className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">全部狀態</option>
                {CONTACT_LEAD_STATUS_VALUES.map((statusValue) => (
                  <option key={statusValue} value={statusValue}>
                    {CONTACT_LEAD_STATUS_LABELS[statusValue]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-secondary">來源類型</span>
              <select
                name="sourceType"
                defaultValue={filters.sourceType ?? ''}
                className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">全部來源</option>
                {CONTACT_LEAD_SOURCE_TYPE_VALUES.map((sourceType) => (
                  <option key={sourceType} value={sourceType}>
                    {CONTACT_LEAD_SOURCE_TYPE_LABELS[sourceType]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-text-secondary">詢問類型</span>
              <select
                name="inquiryType"
                defaultValue={filters.inquiryType ?? ''}
                className="w-full rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="">全部類型</option>
                {inquiryTypes.map((inquiryType) => (
                  <option key={inquiryType} value={inquiryType}>
                    {inquiryType}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap items-center gap-2 md:col-span-4">
              <button
                type="submit"
                className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
              >
                套用篩選
              </button>
              {filtersActive ? (
                <Link
                  href="/superadmin/contacts"
                  className="rounded-md border border-border-default px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-accent"
                >
                  清除篩選
                </Link>
              ) : null}
              <p className="text-xs text-text-muted">
                {filtersActive
                  ? `目前顯示 ${filteredLeads.length} / ${leads.length} 筆 leads`
                  : `目前共有 ${leads.length} 筆 leads`}
              </p>
            </div>
          </form>

          {filteredLeads.length === 0 ? (
            <div className="px-6 py-10 text-sm text-text-muted">
              {filtersActive ? '目前沒有符合篩選條件的 contact leads。' : '目前沒有任何 contact leads。'}
            </div>
          ) : (
            <ContactLeadsTable leads={filteredLeads} />
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}