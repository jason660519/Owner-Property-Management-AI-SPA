import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { ContactLeadStatusActions } from '@/app/superadmin/contacts/ContactLeadStatusActions';
import { ContactLeadAssigneeForm } from '@/app/superadmin/contacts/ContactLeadAssigneeForm';
import { ContactLeadNotesSection } from '@/app/superadmin/contacts/ContactLeadNotesSection';
import {
  getContactLeadById,
  getContactLeadNotes,
  getSuperadminUsers,
} from '@/app/superadmin/contacts/actions';
import { CONTACT_LEAD_STATUS_VARIANTS } from '@/app/superadmin/contacts/constants';
import {
  formatLeadSourceSummary,
  formatLeadStatus,
  formatLeadTimestamp,
} from '@/app/superadmin/contacts/utils';

export const dynamic = 'force-dynamic';

interface ContactLeadDetailPageProps {
  params: Promise<{ id: string }>;
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border-default bg-bg-primary p-6">
      <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 md:grid-cols-[120px_1fr] md:gap-4">
      <p className="text-sm font-medium text-text-secondary">{label}</p>
      <div className="text-sm text-text-primary">{value}</div>
    </div>
  );
}

export default async function ContactLeadDetailPage({ params }: ContactLeadDetailPageProps) {
  const { id } = await params;

  const [lead, notes, users] = await Promise.all([
    getContactLeadById(id),
    getContactLeadNotes(id),
    getSuperadminUsers(),
  ]);

  if (!lead) {
    notFound();
    return null;
  }

  const sourceSummary = formatLeadSourceSummary({
    sourcePath: lead.sourcePath,
    sourceContext: lead.sourceContext,
  });

  return (
    <DashboardLayout
      currentRole="superadmin"
      pageTitle={lead.leadReference}
      breadcrumbs={[
        { label: '首頁', href: '/superadmin' },
        { label: 'Contact Leads', href: '/superadmin/contacts' },
        { label: lead.leadReference },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-muted">建立時間：{formatLeadTimestamp(lead.createdAt)}</p>
          <Link
            href="/superadmin/contacts"
            className="rounded-md border border-border-default px-3 py-2 text-sm font-medium text-text-secondary transition hover:border-accent hover:text-accent"
          >
            返回 Contact Leads
          </Link>
        </div>

        {/* Top 3 info cards */}
        <section className="grid gap-4 lg:grid-cols-3">
          <DetailCard title="Lead 狀態">
            <DetailRow
              label="目前狀態"
              value={
                <Badge variant={CONTACT_LEAD_STATUS_VARIANTS[lead.status]}>
                  {formatLeadStatus(lead.status)}
                </Badge>
              }
            />
            <DetailRow label="詢問類型" value={lead.inquiryType} />
            <div className="pt-2">
              <ContactLeadStatusActions leadId={lead.id} currentStatus={lead.status} />
            </div>
          </DetailCard>

          <DetailCard title="聯絡資訊">
            <DetailRow label="姓名" value={lead.name} />
            <DetailRow label="Email" value={lead.email} />
            <DetailRow label="電話" value={lead.phone ?? '未提供'} />
          </DetailCard>

          <DetailCard title="來源脈絡">
            <DetailRow label="來源頁面" value={sourceSummary.sourceLabel} />
            <DetailRow label="來源動作" value={sourceSummary.actionLabel} />
            <DetailRow label="案件" value={sourceSummary.propertyLabel ?? '未提供'} />
          </DetailCard>
        </section>

        {/* Message + Assignee */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DetailCard title="訊息內容">
              <p className="whitespace-pre-wrap text-sm leading-7 text-text-primary">{lead.message}</p>
            </DetailCard>
          </div>

          <DetailCard title="指派負責人">
            <ContactLeadAssigneeForm
              leadId={lead.id}
              currentAssigneeId={lead.assigneeId}
              currentAssigneeName={lead.assigneeName}
              users={users}
            />
          </DetailCard>
        </section>

        {/* Notes */}
        <DetailCard title="備註與回覆紀錄">
          <ContactLeadNotesSection leadId={lead.id} initialNotes={notes} />
        </DetailCard>
      </div>
    </DashboardLayout>
  );
}
