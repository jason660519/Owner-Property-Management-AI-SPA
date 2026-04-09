import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ContactLeadsTable } from '@/app/superadmin/contacts/ContactLeadsTable';

jest.mock('@/app/superadmin/contacts/actions', () => ({
  updateContactLeadStatus: jest.fn(),
  updateContactLeadStatuses: jest.fn(),
}));

jest.mock('@/components/ui/EnhancedTable', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ data, renderBatchActions }: { data: Array<{ id: string; leadReference: string }>; renderBatchActions: (rows: Array<{ id: string; leadReference: string }>) => React.ReactNode }) => {
      const [selectedIds, setSelectedIds] = React.useState([] as string[]);
      const selectedRows = data.filter((row) => selectedIds.includes(row.id));
      return (
        <div>
          <div>
            {data.map((row) => (
              <label key={row.id}>
                <input
                  type="checkbox"
                  aria-label={`選取 ${row.leadReference}`}
                  checked={selectedIds.includes(row.id)}
                  onChange={() => {
                    setSelectedIds((prev: string[]) =>
                      prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id],
                    );
                  }}
                />
              </label>
            ))}
          </div>
          {selectedRows.length > 0 ? renderBatchActions(selectedRows) : null}
        </div>
      );
    },
  };
});

describe('ContactLeadsTable', () => {
  test('enables batch action when leads are selected', () => {
    render(
      <ContactLeadsTable
        leads={[
          {
            id: 'lead-1',
            name: '王小明',
            email: 'lead-1@example.com',
            phone: '0912345678',
            inquiryType: '法律諮詢',
            message: '我想詢問簽約支援流程。',
            status: 'new',
            createdAt: '2026-03-22T08:30:00.000Z',
            sourcePath: '/properties/sale-2',
            sourceContext: {
              entryPoint: 'property-detail-legal',
              propertyId: 'sale-2',
              propertyTitle: '台北大安整合案件',
            },
            leadReference: 'LEAD-12345678',
            assigneeId: null,
            assigneeName: null,
          },
          {
            id: 'lead-2',
            name: 'Amy Broker',
            email: 'amy@example.com',
            phone: null,
            inquiryType: '合作方案',
            message: '我想了解企業合作。',
            status: 'read',
            createdAt: '2026-03-22T09:00:00.000Z',
            sourcePath: '/pricing',
            sourceContext: {
              entryPoint: 'pricing-cta',
            },
            leadReference: 'LEAD-22222222',
            assigneeId: null,
            assigneeName: null,
          },
        ]}
      />,
    );

    expect(screen.queryByRole('button', { name: '批次更新狀態' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('checkbox', { name: '選取 LEAD-12345678' }));

    expect(screen.getByText('已選取 1 筆 lead')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '批次更新狀態' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('已讀')).toBeInTheDocument();
  });
});
