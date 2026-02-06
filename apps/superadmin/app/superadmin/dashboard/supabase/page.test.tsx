import { render, screen, fireEvent } from '@testing-library/react';
import SupabasePage from './page';

describe('Super Admin Supabase Management Page', () => {
  it('renders the page title', () => {
    render(<SupabasePage />);
    expect(screen.getByText('Supabase Database Management')).toBeInTheDocument();
  });

  it('provides a link to Supabase Dashboard', () => {
    render(<SupabasePage />);
    const link = screen.getByRole('link', { name: /Supabase Dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', expect.stringContaining('supabase.com'));
  });

  it('displays database connection health status', () => {
    render(<SupabasePage />);
    expect(screen.getByText(/Connection Pooling/i)).toBeInTheDocument();
    expect(screen.getByText(/Health Status/i)).toBeInTheDocument();
    // Use getAllByText for "Active" since it appears multiple times
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThan(0);
  });

  it('shows backup and restore instructions', () => {
    render(<SupabasePage />);
    expect(screen.getByText('Backup & Restore')).toBeInTheDocument();
    expect(screen.getByText(/Instructions/i)).toBeInTheDocument();
  });

  it('displays slow queries logs', () => {
    render(<SupabasePage />);
    expect(screen.getByText('Slow Queries Logs')).toBeInTheDocument();
    // Check for a table or list
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it('shows RLS policies view', () => {
    render(<SupabasePage />);
    expect(screen.getByText('Row Level Security (RLS) Policies')).toBeInTheDocument();
    // Check for at least one policy table being mentioned (e.g. Users)
    expect(screen.getByText(/Policy Name/i)).toBeInTheDocument();
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });
});
