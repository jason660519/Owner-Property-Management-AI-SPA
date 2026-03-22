import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { ContactLeadsTable } from '@/app/superadmin/contacts/ContactLeadsTable';

jest.mock('@/app/superadmin/contacts/actions', () => ({
  updateContactLeadStatus: jest.fn(),
  updateContactLeadStatuses: jest.fn(),
}));

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
          },
        ]}
      />,
    );

    const batchButton = screen.getByRole('button', { name: '批次更新狀態' });
    expect(batchButton).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: '選取 LEAD-12345678' }));

    expect(screen.getByText('已選取 1 筆 lead')).toBeInTheDocument();
    expect(batchButton).not.toBeDisabled();
    expect(screen.getByDisplayValue('已讀')).toBeInTheDocument();
  });
});