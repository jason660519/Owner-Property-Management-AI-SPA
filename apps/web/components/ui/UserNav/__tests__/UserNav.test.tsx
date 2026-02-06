/**
 * @file UserNav.test.tsx
 * @created 2026-02-03
 * @creator Antigravity
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UserNav } from '@/components/ui/UserNav';
import { User } from '@supabase/supabase-js';

const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockSignOut = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}));

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signOut: mockSignOut,
    },
  }),
}));

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  created_at: '2024-01-01',
  aud: 'authenticated',
  app_metadata: {},
  user_metadata: {},
};

const mockUserProfile = {
  full_name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg',
  primary_role: 'landlord',
};

describe('UserNav Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders user avatar with initials when no avatar_url', () => {
    render(<UserNav user={mockUser} userProfile={{ full_name: 'John Doe' }} />);

    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders user avatar image when avatar_url is provided', () => {
    render(<UserNav user={mockUser} userProfile={mockUserProfile} />);

    const avatar = screen.getByAltText('John Doe');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', mockUserProfile.avatar_url);
  });

  it('displays user full name and email', () => {
    render(<UserNav user={mockUser} userProfile={mockUserProfile} />);

    expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
    expect(screen.getAllByText('test@example.com')[0]).toBeInTheDocument();
  });

  it('uses email prefix when full_name is not available', () => {
    render(<UserNav user={mockUser} />);

    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('opens dropdown menu when clicked', () => {
    render(<UserNav user={mockUser} userProfile={mockUserProfile} />);

    const button = screen.getByRole('button', { expanded: false });
    fireEvent.click(button);

    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('closes dropdown when clicked outside', async () => {
    render(<UserNav user={mockUser} userProfile={mockUserProfile} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(screen.getByText('Sign out')).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Sign out')).not.toBeInTheDocument();
    });
  });

  it('navigates to profile page when Profile is clicked', () => {
    render(<UserNav user={mockUser} userProfile={mockUserProfile} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const profileButton = screen.getByText('Profile');
    fireEvent.click(profileButton);

    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('navigates to settings page when Settings is clicked', () => {
    render(<UserNav user={mockUser} userProfile={mockUserProfile} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const settingsButton = screen.getByText('Settings');
    fireEvent.click(settingsButton);

    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('handles sign out correctly', async () => {
    mockSignOut.mockResolvedValue({ error: null });

    render(<UserNav user={mockUser} userProfile={mockUserProfile} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    const signOutButton = screen.getByText('Sign out');
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/login');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('rotates chevron icon when dropdown is open', () => {
    const { container } = render(<UserNav user={mockUser} userProfile={mockUserProfile} />);

    const button = screen.getByRole('button');
    let chevron = container.querySelector('svg');

    expect(chevron?.className.baseVal).not.toContain('rotate-180');

    fireEvent.click(button);

    chevron = container.querySelector('svg');
    expect(chevron?.className.baseVal).toContain('rotate-180');
  });
});
