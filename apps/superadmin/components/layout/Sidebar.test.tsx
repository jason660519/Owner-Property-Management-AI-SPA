import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Sidebar } from './Sidebar';
import { usePathname } from 'next/navigation';

// Mock usePathname
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    (usePathname as jest.Mock).mockReturnValue('/superadmin');
  });

  it('renders all required navigation items', () => {
    render(<Sidebar />);
    
    // Check for icons (using aria-label or just existence of buttons)
    // We expect the English labels to be present in the DOM but maybe hidden or shown on hover
    // Let's check for the existence of the text
    const expectedLabels = [
      'Overview',
      'User Management',
      'Group Management',
      'Properties Management',
      'Contracts Management',
      'Database',
      'Storage',
      'Impersonate',
      'IAM Management',
      'AI 服務 / API KEY',
      'Settings'
    ];

    expectedLabels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('expands on hover', async () => {
    render(<Sidebar />);
    
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

  it('highlights the active link', () => {
    (usePathname as jest.Mock).mockReturnValue('/superadmin/users');
    render(<Sidebar />);
    
    const activeLink = screen.getByText('User Management').closest('a');
    expect(activeLink).toHaveClass('bg-emerald-500/10');
    expect(activeLink).toHaveClass('text-emerald-500');
  });
});
