import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { InviteUserModal } from './InviteUserModal';

jest.mock('@/app/superadmin/users/actions', () => ({
  inviteUser: jest.fn(),
  getAllGroups: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/app/superadmin/groups/actions', () => ({
  getRoles: jest.fn().mockResolvedValue([
    { id: '1', name: 'landlord', description: 'Landlord access' },
    { id: '2', name: 'agent', description: 'Agent access' },
  ]),
}));

describe('InviteUserModal', () => {
  it('shows trigger button with text "Create and Invite User"', () => {
    render(<InviteUserModal />);
    expect(screen.getByRole('button', { name: /Create and Invite User/i })).toBeInTheDocument();
  });

  it('opens modal with heading "Create and Invite User" when trigger is clicked', async () => {
    render(<InviteUserModal />);
    fireEvent.click(screen.getByRole('button', { name: /Create and Invite User/i }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Create and Invite User/i })).toBeInTheDocument();
    });
  });

  it('shows helper text about 8-digit invite code when modal is open', async () => {
    render(<InviteUserModal />);
    fireEvent.click(screen.getByRole('button', { name: /Create and Invite User/i }));

    await waitFor(() => {
      expect(screen.getByText(/An 8-digit invite code will be sent to this email address/i)).toBeInTheDocument();
    });
  });

  it('shows Email Address and Role fields when modal is open', async () => {
    render(<InviteUserModal />);
    fireEvent.click(screen.getByRole('button', { name: /Create and Invite User/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Role/i)).toBeInTheDocument();
    });
  });
});
