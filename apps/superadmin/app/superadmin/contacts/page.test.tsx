import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ContactsPage from '@/app/superadmin/contacts/page';

const mockGetContactLeads = jest.fn();

jest.mock('@/app/superadmin/contacts/actions', () => ({
  getContactLeads: () => mockGetContactLeads(),
  updateContactLeadStatus: jest.fn(),
}));

jest.mock('@/components/dashboard/DashboardLayout', () => ({
  DashboardLayout: ({
    children,
    pageTitle,
  }: {
    children: React.ReactNode;
    pageTitle?: string;
  }) => (
    <div data-testid="dashboard-layout">
      {pageTitle ? <h1>{pageTitle}</h1> : null}
      {children}
    </div>
  ),
}));

jest.mock('@/app/superadmin/contacts/ContactLeadsTable', () => ({
  ContactLeadsTable: ({ leads }: { leads: Array<{ id: string }> }) => (
    <div data-testid="contact-leads-table">{leads.length}</div>
  ),
}));

describe('ContactsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders contact leads with readable source labels', async () => {
    mockGetContactLeads.mockResolvedValue([
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
    ]);

    const ui = await ContactsPage();
    render(ui);

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Contact Leads', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('contact-leads-table')).toHaveTextContent('1');
  });

  test('renders empty state when there are no leads', async () => {
    mockGetContactLeads.mockResolvedValue([]);

    const ui = await ContactsPage();
    render(ui);

    expect(screen.getByText('目前沒有任何 contact leads。')).toBeInTheDocument();
  });

  test('filters leads from search params', async () => {
    mockGetContactLeads.mockResolvedValue([
      {
        id: 'lead-1',
        name: '王小明',
        email: 'first@example.com',
        phone: null,
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
        leadReference: 'LEAD-11111111',
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
        status: 'replied',
        createdAt: '2026-03-22T09:00:00.000Z',
        sourcePath: '/pricing',
        sourceContext: {
          entryPoint: 'pricing-cta',
        },
        leadReference: 'LEAD-22222222',
        assigneeId: null,
        assigneeName: null,
      },
    ]);

    const ui = await ContactsPage({
      searchParams: Promise.resolve({
        query: 'amy',
        status: 'replied',
        sourceType: 'marketing',
      }),
    });
    render(ui);

    expect(screen.getByDisplayValue('amy')).toBeInTheDocument();
    expect(screen.getByDisplayValue('已回覆')).toBeInTheDocument();
    expect(screen.getByDisplayValue('行銷頁面')).toBeInTheDocument();
    expect(screen.getByTestId('contact-leads-table')).toHaveTextContent('1');
  });
});
