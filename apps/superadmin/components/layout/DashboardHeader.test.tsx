import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardHeader } from './DashboardHeader';
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('DashboardHeader', () => {
  beforeEach(() => {
    // Reset theme
    document.documentElement.classList.remove('dark');
    localStorage.clear();
    
    // Reset matchMedia mock to default (light mode)
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('renders correctly with logo and navigation links', () => {
    render(<DashboardHeader />);
    
    // Check Logo
    expect(screen.getByText('Owner AI')).toBeInTheDocument();
    
    // Check Desktop Links
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Developers')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Docs')).toBeInTheDocument();
  });

  it('toggles mobile menu when hamburger button is clicked and closes on link click', () => {
    render(<DashboardHeader />);
    
    const toggleButton = screen.getAllByLabelText('Toggle menu')[0];
    fireEvent.click(toggleButton);
    
    // Check if mobile menu is open (checking for duplicate links as per previous logic)
    const linksAfterClick = screen.getAllByText('Product');
    expect(linksAfterClick.length).toBe(2);
    
    // Click a mobile link
    const mobileLink = linksAfterClick[1]; // The second one is likely the mobile one (since it appears later in DOM)
    fireEvent.click(mobileLink);
    
    // Menu should close
    // Since rendering is conditional, the mobile link should disappear
    const linksAfterClose = screen.getAllByText('Product');
    expect(linksAfterClose.length).toBe(1);
  });

  it('initializes with dark mode if system preference is dark', async () => {
    // Override mock for this test
    (window.matchMedia as jest.Mock).mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: dark)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<DashboardHeader />);
    
    // Wait for useEffect
    await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('toggles theme between light and dark', async () => {
    render(<DashboardHeader />);
    
    // Wait for mount
    await waitFor(() => {
        expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    });

    const themeToggleButtons = screen.getAllByLabelText('Toggle theme');
    const desktopToggle = themeToggleButtons[0];
    
    // Initial state: Light (default mock is light)
    await waitFor(() => {
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
    
    // Click to toggle
    fireEvent.click(desktopToggle);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('theme')).toBe('dark');
    
    // Click again
    fireEvent.click(desktopToggle);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('theme')).toBe('light');
  });

  it('uses next/link for navigation', () => {
    render(<DashboardHeader />);
    const logoLink = screen.getByText('Owner AI').closest('a');
    expect(logoLink).toHaveAttribute('href', '/');
  });
});
