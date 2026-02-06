import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InviteUserModal } from '@/components/admin/users/InviteUserModal';
import { inviteUser, getAllGroups } from '@/app/admin/users/actions';

// Mock server actions
jest.mock('@/app/admin/users/actions', () => ({
  inviteUser: jest.fn(),
  getAllGroups: jest.fn(),
}));

describe('InviteUserModal', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (getAllGroups as jest.Mock).mockResolvedValue([
      { id: 'g1', name: 'Admin Group' },
      { id: 'g2', name: 'Tenant Group' },
    ]);
  });

  test('應該渲染邀請按鈕', () => {
    render(<InviteUserModal />);
    expect(screen.getByText('Invite User')).toBeInTheDocument();
  });

  test('點擊按鈕應該打開模態框並加載群組', async () => {
    render(<InviteUserModal />);
    
    await user.click(screen.getByText('Invite User'));
    
    expect(screen.getByText('Invite New User')).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Initial Group/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(getAllGroups).toHaveBeenCalled();
    });
  });

  test('應該成功提交表單', async () => {
    (inviteUser as jest.Mock).mockResolvedValue({ success: true });

    render(<InviteUserModal />);
    
    // Open modal
    await user.click(screen.getByText('Invite User'));
    
    // Fill form
    await user.type(screen.getByLabelText(/Email Address/i), 'newuser@example.com');
    await user.selectOptions(screen.getByLabelText(/Initial Group/i), 'g1');
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /Send Invitation/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(inviteUser).toHaveBeenCalled();
      // Check FormData
      const formData = (inviteUser as jest.Mock).mock.calls[0][0] as FormData;
      expect(formData.get('email')).toBe('newuser@example.com');
      expect(formData.get('groupId')).toBe('g1');
    });

    expect(await screen.findByText('Invitation sent successfully!')).toBeInTheDocument();
  });

  test('應該顯示錯誤訊息', async () => {
    (inviteUser as jest.Mock).mockResolvedValue({ error: 'Email already registered' });

    render(<InviteUserModal />);
    
    await user.click(screen.getByText('Invite User'));
    await user.type(screen.getByLabelText(/Email Address/i), 'existing@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invitation/i }));
    
    expect(await screen.findByText('Email already registered')).toBeInTheDocument();
  });

  test('應該顯示警告訊息', async () => {
    (inviteUser as jest.Mock).mockResolvedValue({ success: true, warning: 'User invited but failed to add to group' });

    render(<InviteUserModal />);
    
    await user.click(screen.getByText('Invite User'));
    await user.type(screen.getByLabelText(/Email Address/i), 'test@example.com');
    await user.click(screen.getByRole('button', { name: /Send Invitation/i }));
    
    expect(await screen.findByText('User invited but failed to add to group')).toBeInTheDocument();
  });
});
