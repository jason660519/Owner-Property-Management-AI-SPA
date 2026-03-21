import { Mail } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { getContactLeads } from './actions';
import { formatLeadSourceSummary, formatLeadTimestamp } from './utils';

export const dynamic = 'force-dynamic';

const statusVariantMap = {
  new: 'warning',
  read: 'info',
  replied: 'success',
  archived: 'default',
} as const;

export default async function ContactsPage() {
  const leads = await getContactLeads();

  const totalLeads = leads.length;
  const newLeads = leads.filter((lead) => lead.status === 'new').length;
  const propertyFlowLeads = leads.filter((lead) => lead.sourcePath?.startsWith('/properties')).length;

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

          {leads.length === 0 ? (
            <div className="px-6 py-10 text-sm text-text-muted">
              目前沒有任何 contact leads。
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-default text-sm">
                <thead className="bg-bg-secondary/60">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">Lead</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">聯絡人</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">詢問類型</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">來源頁面</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">來源動作</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">案件</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">狀態</th>
                    <th className="px-4 py-3 text-left font-medium text-text-secondary">建立時間</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default">
                  {leads.map((lead) => {
                    const sourceSummary = formatLeadSourceSummary({
                      sourcePath: lead.sourcePath,
                      sourceContext: lead.sourceContext,
                    });

                    return (
                      <tr key={lead.id} className="align-top">
                        <td className="px-4 py-4">
                          <div className="font-medium text-text-primary">{lead.leadReference}</div>
                          <p className="mt-1 max-w-xs text-xs text-text-muted">{lead.message}</p>
                        </td>
                        <td className="px-4 py-4 text-text-primary">
                          <div>{lead.name}</div>
                          <div className="mt-1 text-xs text-text-muted">{lead.email}</div>
                          {lead.phone ? (
                            <div className="mt-1 text-xs text-text-muted">{lead.phone}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-text-primary">{lead.inquiryType}</td>
                        <td className="px-4 py-4 text-text-primary">{sourceSummary.sourceLabel}</td>
                        <td className="px-4 py-4 text-text-primary">{sourceSummary.actionLabel}</td>
                        <td className="px-4 py-4 text-text-primary">{sourceSummary.propertyLabel ?? '未提供'}</td>
                        <td className="px-4 py-4">
                          <Badge variant={statusVariantMap[lead.status]}>{lead.status}</Badge>
                        </td>
                        <td className="px-4 py-4 text-text-primary">{formatLeadTimestamp(lead.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}