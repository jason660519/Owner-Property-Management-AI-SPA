import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import PortalPage from '../page';
import { getUserRoles } from '@/lib/actions/auth';
import { createClient } from '@/lib/supabase/client';
import { ROLE_METADATA } from '@/config/roles';

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

jest.mock('@/app/actions/auth', () => ({
  getUserRoles: jest.fn(),
}));

// Mock Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: () => <div>Loading</div>,
  ShieldCheck: () => <div>Icon</div>,
  LogOut: () => <div>Logout</div>,
  AlertCircle: () => <div>ErrorIcon</div>,
  Home: () => <div>HomeIcon</div>,
  Key: () => <div>KeyIcon</div>,
  Search: () => <div>SearchIcon</div>,
  ShoppingCart: () => <div>CartIcon</div>,
  Eye: () => <div>EyeIcon</div>,
  Users: () => <div>UsersIcon</div>,
  Wrench: () => <div>WrenchIcon</div>,
  Shield: () => <div>ShieldIcon</div>,
}));

describe('PortalPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createClient as jest.Mock).mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: { display_name: 'Test User' },
            },
          },
          error: null,
        }),
        signOut: jest.fn(),
      },
    });
  });

  it('renders 5 cards when user has 5 roles', async () => {
    (getUserRoles as jest.Mock).mockResolvedValue({
      success: true,
      roles: ['super_admin', 'landlord', 'agent', 'tenant', 'buyer'], // strings
    });

    render(<PortalPage />);

    // Wait for loading to finish
    await waitFor(() => {
      expect(screen.getByText('歡迎回來，Test User')).toBeInTheDocument();
    });

    // Check for role names (based on ROLE_METADATA or fallback)
    expect(screen.getByText('超級管理員')).toBeInTheDocument();
    expect(screen.getByText('房東')).toBeInTheDocument();
    expect(screen.getByText('仲介')).toBeInTheDocument();
    
    // Check links
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    
    expect(links[0]).toHaveAttribute('href', '/portal/super_admin');
    expect(links[1]).toHaveAttribute('href', '/portal/landlord');
  });

  it('normalizes alias role strings and renders canonical portal links', async () => {
    // user.app_metadata.roles might contain alias like "tenant/contracted"
    (getUserRoles as jest.Mock).mockResolvedValue({
      success: true,
      roles: ['tenant/contracted', { role: 'service-provider', disabled: false }],
    });

    render(<PortalPage />);

    await waitFor(() => {
      expect(screen.getByText('請選擇您要進入的身分工作區')).toBeInTheDocument();
    });

    // Should show Tenant (contracted) card and generate canonical href `/portal/contracted_tenant`
    expect(screen.getByText(/租客|tenant/i)).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.some((l) => l.getAttribute('href') === '/portal/contracted_tenant')).toBeTruthy();
    // service-provider alias should be normalized to service_provider
    expect(links.some((l) => l.getAttribute('href') === '/portal/service_provider')).toBeTruthy();
  });

  it('shows alert on API failure and retries', async () => {
    (getUserRoles as jest.Mock).mockResolvedValueOnce({
      success: false,
      error: 'API Error',
    });

    render(<PortalPage />);

    await waitFor(() => {
      expect(screen.getByText('無法取得角色清單，請確認 Super Admin 權限或聯絡系統管理員')).toBeInTheDocument();
    });

    // Retry
    (getUserRoles as jest.Mock).mockResolvedValueOnce({
      success: true,
      roles: ['landlord'],
    });

    fireEvent.click(screen.getByText('重新載入'));

    await waitFor(() => {
      expect(screen.queryByText('無法取得角色清單，請確認 Super Admin 權限或聯絡系統管理員')).not.toBeInTheDocument();
      expect(screen.getByText('房東')).toBeInTheDocument();
    });
  });

  it('handles disabled roles correctly', async () => {
    (getUserRoles as jest.Mock).mockResolvedValue({
        success: true,
        roles: [
            { role: 'landlord', disabled: false },
            { role: 'agent', disabled: true }
        ]
    });

    render(<PortalPage />);

    await waitFor(() => {
        expect(screen.getByText('房東')).toBeInTheDocument();
        expect(screen.getByText('仲介')).toBeInTheDocument();
    });

    // Landlord should be a link
    const landlordCard = screen.getByText('房東').closest('a');
    expect(landlordCard).toHaveAttribute('href', '/portal/landlord');

    // Agent should NOT be a link (disabled)
    const agentCardText = screen.getByText('仲介');
    const agentLink = agentCardText.closest('a');
    expect(agentLink).toBeNull();
    
    expect(screen.getByText('權限尚未啟用')).toBeInTheDocument();
  });
});
