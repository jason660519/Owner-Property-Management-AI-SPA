import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ContactLeadDetailPage from '@/app/superadmin/contacts/[id]/page';

const mockGetContactLeadById = jest.fn();
const mockNotFound = jest.fn();

jest.mock('@/app/superadmin/contacts/actions', () => ({
  getContactLeadById: (id: string) => mockGetContactLeadById(id),
  updateContactLeadStatus: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
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

describe('ContactLeadDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders lead detail information', async () => {
    mockGetContactLeadById.mockResolvedValue({
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
    });

    const ui = await ContactLeadDetailPage({
      params: Promise.resolve({ id: 'lead-1' }),
    });
    render(ui);

    expect(screen.getByRole('heading', { name: 'LEAD-12345678', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('王小明')).toBeInTheDocument();
    expect(screen.getByText('lead-1@example.com')).toBeInTheDocument();
    expect(screen.getByText('0912345678')).toBeInTheDocument();
    expect(screen.getByText('法律諮詢')).toBeInTheDocument();
    expect(screen.getByText('從案件詳情頁發起簽約支援')).toBeInTheDocument();
    expect(screen.getByText('台北大安整合案件（sale-2）')).toBeInTheDocument();
    expect(screen.getByText('我想詢問簽約支援流程。')).toBeInTheDocument();
  });

  test('calls notFound when lead does not exist', async () => {
    mockGetContactLeadById.mockResolvedValue(null);

    await ContactLeadDetailPage({
      params: Promise.resolve({ id: 'missing-lead' }),
    });

    expect(mockNotFound).toHaveBeenCalled();
  });
});