'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import type { ContactLead } from './actions';
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
import { updateContactLeadStatuses } from './actions';

interface ContactLeadsTableProps {
  leads: ContactLead[];
}

export function ContactLeadsTable({ leads }: ContactLeadsTableProps) {
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);

  const allSelected = leads.length > 0 && selectedLeadIds.length === leads.length;

  const toggleLead = (leadId: string, checked: boolean) => {
    setSelectedLeadIds((current) => {
      if (checked) {
        return current.includes(leadId) ? current : [...current, leadId];
      }

      return current.filter((id) => id !== leadId);
    });
  };

  const toggleAll = (checked: boolean) => {
    setSelectedLeadIds(checked ? leads.map((lead) => lead.id) : []);
  };

  return (
    <div className="overflow-x-auto">
      <form action={updateContactLeadStatuses} className="border-b border-border-default px-6 py-4">
        {selectedLeadIds.map((leadId) => (
          <input key={leadId} type="hidden" name="leadIds" value={leadId} />
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-text-secondary">
            {selectedLeadIds.length > 0 ? `已選取 ${selectedLeadIds.length} 筆 lead` : '尚未選取任何 lead'}
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
            disabled={selectedLeadIds.length === 0}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            批次更新狀態
          </button>
        </div>
      </form>

      <table className="min-w-full divide-y divide-border-default text-sm">
        <thead className="bg-bg-secondary/60">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(event) => toggleAll(event.target.checked)}
                aria-label="全選目前 leads"
              />
            </th>
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
                  <input
                    type="checkbox"
                    checked={selectedLeadIds.includes(lead.id)}
                    onChange={(event) => toggleLead(lead.id, event.target.checked)}
                    aria-label={`選取 ${lead.leadReference}`}
                  />
                </td>
                <td className="px-4 py-4">
                  <Link
                    href={`/superadmin/contacts/${lead.id}`}
                    className="font-medium text-accent transition hover:text-accent-hover hover:underline"
                  >
                    {lead.leadReference}
                  </Link>
                  <p className="mt-1 max-w-xs text-xs text-text-muted">{lead.message}</p>
                </td>
                <td className="px-4 py-4 text-text-primary">
                  <div>{lead.name}</div>
                  <div className="mt-1 text-xs text-text-muted">{lead.email}</div>
                  {lead.phone ? <div className="mt-1 text-xs text-text-muted">{lead.phone}</div> : null}
                </td>
                <td className="px-4 py-4 text-text-primary">{lead.inquiryType}</td>
                <td className="px-4 py-4 text-text-primary">{sourceSummary.sourceLabel}</td>
                <td className="px-4 py-4 text-text-primary">{sourceSummary.actionLabel}</td>
                <td className="px-4 py-4 text-text-primary">{sourceSummary.propertyLabel ?? '未提供'}</td>
                <td className="px-4 py-4">
                  <div className="space-y-3">
                    <Badge variant={CONTACT_LEAD_STATUS_VARIANTS[lead.status]}>
                      {formatLeadStatus(lead.status)}
                    </Badge>
                    <ContactLeadStatusActions leadId={lead.id} currentStatus={lead.status} />
                  </div>
                </td>
                <td className="px-4 py-4 text-text-primary">{formatLeadTimestamp(lead.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}