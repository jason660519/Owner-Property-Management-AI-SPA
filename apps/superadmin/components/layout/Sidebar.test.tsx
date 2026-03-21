import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { usePathname } from 'next/navigation';

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/utils/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { email: 'admin@test.com' } } },
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: {
          subscription: {
            unsubscribe: jest.fn(),
          },
        },
      }),
    },
  }),
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/superadmin');
  });

  it('renders all required navigation items', async () => {
    render(<Sidebar />);
    await screen.findByText('admin@test.com');
    
    // Check for icons (using aria-label or just existence of buttons)
    // We expect the English labels to be present in the DOM but maybe hidden or shown on hover
    // Let's check for the existence of the text
    const expectedLabels = [
      'Overview',
      'IAM Management',
      'Properties Management',
      'Contact Leads',
      'Database',
      'Storage',
      'Behavior Monitor',
      'Performance Monitor',
      'AI LLM Monitor',
      'Project Progress Dashboard',
      'Project Files',
      'AI 服務 / API KEY',
      'Prompt 管理',
      'Settings'
    ];

    expectedLabels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('expands on hover', async () => {
    render(<Sidebar />);
    await screen.findByText('admin@test.com');
    
    const sidebar = screen.getByLabelText('Main Navigation');
    
    // Initial state: collapsed (width should be small)
    expect(sidebar).toHaveClass('w-16');
    
    // Hover
    fireEvent.mouseEnter(sidebar);
    await waitFor(() => {
      expect(sidebar).toHaveClass('w-64');
    });

    // Unhover
    fireEvent.mouseLeave(sidebar);
    await waitFor(() => {
      expect(sidebar).toHaveClass('w-16');
    });
  });

  it('highlights the active link', async () => {
    (usePathname as jest.Mock).mockReturnValue('/superadmin/contacts');
    render(<Sidebar />);
    await screen.findByText('admin@test.com');
    
    const activeLink = screen.getByText('Contact Leads').closest('a');
    expect(activeLink).toHaveClass('bg-emerald-500/10');
    expect(activeLink).toHaveClass('text-emerald-500');
  });
});
