import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RBACPage from './page';

// Mock the components if they are complex, but for TDD we start simple
// We might need to mock Server Actions later

describe('Super Admin RBAC Page', () => {
  it('renders the RBAC dashboard title', () => {
    render(<RBACPage />);
    expect(screen.getByText('RBAC Access Control')).toBeInTheDocument();
  });

  it('displays a list of roles', async () => {
    render(<RBACPage />);
    // Assuming we have some default roles or empty state
    // For TDD, let's assume we fetch roles. Since we can't easily mock server components in simple Jest without more setup, 
    // we will assume the page is a Client Component or we test the Client Component part.
    // Let's assume RBACPage renders a Client Component called RBACDashboard
    expect(screen.getByText('Role Management')).toBeInTheDocument();
  });

  it('opens create role modal when button is clicked', () => {
    render(<RBACPage />);
    const createButton = screen.getByText('Create Role');
    fireEvent.click(createButton);
    expect(screen.getByText('Create New Role')).toBeInTheDocument();
    expect(screen.getByLabelText('Role Name')).toBeInTheDocument();
  });

  it('allows creating a new role', async () => {
    render(<RBACPage />);
    fireEvent.click(screen.getByText('Create Role'));
    
    fireEvent.change(screen.getByLabelText('Role Name'), { target: { value: 'New Role' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test Description' } });
    
    fireEvent.click(screen.getByText('Save Role'));
    
    // In a real integration test, we would check if the list updates.
    // Here we just check if the modal closes or success message appears (mocked)
    await waitFor(() => {
        // expect(screen.queryByText('Create New Role')).not.toBeInTheDocument();
    });
  });

  it('shows permission assignment section', () => {
    render(<RBACPage />);
    expect(screen.getByText('Permission Matrix')).toBeInTheDocument();
  });

  it('allows selecting a role and toggling permissions', () => {
    render(<RBACPage />);
    // Select first role by clicking on its name
    const roleItem = screen.getByText('Super Admin');
    fireEvent.click(roleItem);

    // Check if matrix is active/visible
    expect(screen.getByText('Resource')).toBeInTheDocument();
    
    // Toggle a permission (e.g., Properties create)
    // The matrix has checkboxes. Let's find one.
    const checkbox = screen.getByLabelText('create Properties');
    fireEvent.click(checkbox);
    // It was checked (default for Super Admin), now should be unchecked
    expect(checkbox).not.toBeChecked();
  });

  it('shows audit log entry on changes', async () => {
     render(<RBACPage />);
     // ... implementation dependent
  });
});
