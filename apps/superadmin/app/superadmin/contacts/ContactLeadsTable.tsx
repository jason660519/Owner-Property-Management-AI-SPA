'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/Badge';
import EnhancedTable from '@/components/ui/EnhancedTable';
import type { ContactLead } from './actions';
import { updateContactLeadStatuses } from './actions';
import {
  CONTACT_LEAD_STATUS_VARIANTS,
  CONTACT_LEAD_STATUS_LABELS,
  CONTACT_LEAD_STATUS_VALUES,
} from './constants';
import { ContactLeadStatusActions } from './ContactLeadStatusActions';
import {
  formatLeadSourceSummary,
  formatLeadStatus,
  formatLeadTimestamp,
} from './utils';

interface ContactLeadsTableProps {
  leads: ContactLead[];
}

// Column width percentages (9 data columns, sum ~100)
const INITIAL_WIDTHS = [12, 14, 8, 10, 10, 12, 8, 14, 12];

const columns: ColumnDef<ContactLead, unknown>[] = [
  {
    accessorKey: 'leadReference',
    header: 'Lead',
    meta: { headerEn: 'Lead', headerZh: '線索' },
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <div>
          <Link
            href={`/superadmin/contacts/${lead.id}`}
            className="font-medium text-accent transition hover:text-accent-hover hover:underline"
          >
            {lead.leadReference}
          </Link>
          <p className="mt-1 max-w-xs text-xs text-text-muted">{lead.message}</p>
        </div>
      );
    },
  },
  {
    id: 'contact',
    header: '聯絡人',
    meta: { headerEn: 'Contact', headerZh: '聯絡人' },
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <div>
          <div>{lead.name}</div>
          <div className="mt-1 text-xs text-text-muted">{lead.email}</div>
          {lead.phone ? <div className="mt-1 text-xs text-text-muted">{lead.phone}</div> : null}
        </div>
      );
    },
  },
  {
    accessorKey: 'inquiryType',
    header: '詢問類型',
    meta: { headerEn: 'Inquiry', headerZh: '詢問類型' },
  },
  {
    id: 'sourcePage',
    header: '來源頁面',
    meta: { headerEn: 'Source Page', headerZh: '來源頁面' },
    cell: ({ row }) => {
      const { sourceLabel } = formatLeadSourceSummary({
        sourcePath: row.original.sourcePath,
        sourceContext: row.original.sourceContext,
      });
      return sourceLabel;
    },
  },
  {
    id: 'sourceAction',
    header: '來源動作',
    meta: { headerEn: 'Action', headerZh: '來源動作' },
    cell: ({ row }) => {
      const { actionLabel } = formatLeadSourceSummary({
        sourcePath: row.original.sourcePath,
        sourceContext: row.original.sourceContext,
      });
      return actionLabel;
    },
  },
  {
    id: 'property',
    header: '案件',
    meta: { headerEn: 'Property', headerZh: '案件' },
    cell: ({ row }) => {
      const { propertyLabel } = formatLeadSourceSummary({
        sourcePath: row.original.sourcePath,
        sourceContext: row.original.sourceContext,
      });
      return propertyLabel ?? '未提供';
    },
  },
  {
    id: 'assignee',
    header: '負責人',
    meta: { headerEn: 'Assignee', headerZh: '負責人' },
    cell: ({ row }) =>
      row.original.assigneeName ?? <span className="text-text-muted">未指派</span>,
  },
  {
    accessorKey: 'status',
    header: '狀態',
    meta: { headerEn: 'Status', headerZh: '狀態' },
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <div className="space-y-3">
          <Badge variant={CONTACT_LEAD_STATUS_VARIANTS[lead.status]}>
            {formatLeadStatus(lead.status)}
          </Badge>
          <ContactLeadStatusActions leadId={lead.id} currentStatus={lead.status} />
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: '建立時間',
    meta: { headerEn: 'Created', headerZh: '建立時間' },
    cell: ({ row }) => formatLeadTimestamp(row.original.createdAt),
  },
];

function BatchActions({ selectedRows }: { selectedRows: ContactLead[] }) {
  return (
    <form action={async (formData: FormData) => { await updateContactLeadStatuses(formData); }}>
      {selectedRows.map((lead) => (
        <input key={lead.id} type="hidden" name="leadIds" value={lead.id} />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-text-secondary">
          已選取 {selectedRows.length} 筆 lead
        </p>
        <select
          name="status"
          defaultValue="read"
          className="rounded-md border border-border-default bg-bg-primary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          {CONTACT_LEAD_STATUS_VALUES.map((statusValue) => (
            <option key={statusValue} value={statusValue}>
              {CONTACT_LEAD_STATUS_LABELS[statusValue]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-hover"
        >
          批次更新狀態
        </button>
      </div>
    </form>
  );
}

export function ContactLeadsTable({ leads }: ContactLeadsTableProps) {
  const stableColumns = useMemo(() => columns, []);

  return (
    <EnhancedTable<ContactLead>
      tableId="contact_leads"
      columns={stableColumns}
      data={leads}
      initialWidths={INITIAL_WIDTHS}
      enableRowSelection
      getCategoryValue={(lead) => lead.inquiryType}
      getSearchValue={(lead) =>
        [lead.leadReference, lead.name, lead.email, lead.phone, lead.message, lead.inquiryType]
          .filter(Boolean)
          .join(' ')
      }
      renderBatchActions={(selectedRows) => <BatchActions selectedRows={selectedRows} />}
      pageSizes={[20, 50, 100]}
      minWidth={1100}
    />
  );
}
