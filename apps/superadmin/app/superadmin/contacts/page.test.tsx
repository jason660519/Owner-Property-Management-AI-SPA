import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ContactsPage from '@/app/superadmin/contacts/page';

const mockGetContactLeads = jest.fn();

jest.mock('@/app/superadmin/contacts/actions', () => ({
  getContactLeads: () => mockGetContactLeads(),
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
      },
    ]);

    const ui = await ContactsPage();
    render(ui);

    expect(screen.getByTestId('dashboard-layout')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Contact Leads', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText('LEAD-12345678')).toBeInTheDocument();
    expect(screen.getByText('台北大安整合案件（sale-2）')).toBeInTheDocument();
    expect(screen.getByText('從案件詳情頁發起簽約支援')).toBeInTheDocument();
    expect(screen.getByText('new')).toBeInTheDocument();
  });

  test('renders empty state when there are no leads', async () => {
    mockGetContactLeads.mockResolvedValue([]);

    const ui = await ContactsPage();
    render(ui);

    expect(screen.getByText('目前沒有任何 contact leads。')).toBeInTheDocument();
  });
});