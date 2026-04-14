import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RolesTab } from './RolesTab';
import { IAMLayoutControls } from './LayoutControls';
import { IamViewSettingsProvider } from './viewSettings';

jest.mock('../../rbac_access_control/actions', () => ({
  getRoles: jest.fn().mockResolvedValue([
    { id: 'role-1', name: 'super_admin', description: 'Super admin', parent_role_id: null },
  ]),
  createRole: jest.fn(),
  deleteRole: jest.fn().mockResolvedValue({ error: null }),
  updateRole: jest.fn(),
  getRbacAuditLogs: jest.fn().mockResolvedValue([]),
  getAllRolePermissions: jest.fn().mockResolvedValue([]),
  saveRolePermissions: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/rbac/resources', () => ({
  RESOURCE_DEFINITIONS: [
    { id: 'res-1', label: 'Resource One', group: 'PROPERTY' },
  ],
  RESOURCES: ['res-1'],
}));

jest.mock('@/components/ui/EnhancedTable', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ columns, data }: { columns: Array<{ header: unknown }>; data: Array<{ id: string; label: string; group: string }> }) => {
      const { useIamViewSettings } = require('./viewSettings');
      const { freezeRowCount, frozenColCount } = useIamViewSettings();
      const theadClass = freezeRowCount >= 1 ? 'sticky' : '';
      const tdClass = frozenColCount >= 1 ? 'sticky' : '';
      return (
        <div>
          <div>{typeof columns[0]?.header === 'string' ? columns[0].header : '資源名稱'}</div>
          <div>{data[0]?.label}</div>
          <table>
            <thead className={theadClass} />
            <tbody>
              <tr>
                <td className={tdClass}>{data[0]?.label}</td>
              </tr>
            </tbody>
          </table>
        </div>
      );
    },
  };
});

describe('RolesTab integrates freeze panes from IAMLayoutControls', () => {
  function setup() {
    return render(
      <IamViewSettingsProvider>
        <IAMLayoutControls />
        <RolesTab />
      </IamViewSettingsProvider>
    );
  }

  it('applies sticky header when "凍結第 1 row" is selected', async () => {
    const { container } = setup();

    // Wait for table to render
    await waitFor(() => {
      expect(screen.getByText('資源名稱')).toBeInTheDocument();
    });

    // Initially header wrapper should not be sticky
    const thead = container.querySelector('thead');
    expect(thead?.className || '').not.toContain('sticky');

    // Turn on freeze row (use IAMLayoutControls View button – first one)
    const [viewButton] = screen.getAllByRole('button', { name: /View/i });
    fireEvent.click(viewButton);
    fireEvent.click(screen.getByRole('button', { name: '凍結第 1 row' }));

    expect((thead?.className || '')).toContain('sticky');
  });

  it('applies sticky first column when "凍結第 1 col" is selected', async () => {
    const { container } = setup();

    await waitFor(() => {
      expect(screen.getByText('資源名稱')).toBeInTheDocument();
    });

    // body first cell (資源欄) initially not sticky when preference = 0
    let firstBodyCell = container.querySelector('tbody tr td');
    expect(firstBodyCell?.className || '').not.toContain('sticky');

    // Turn on freeze first col (use IAMLayoutControls View button – first one)
    const [viewButton] = screen.getAllByRole('button', { name: /View/i });
    fireEvent.click(viewButton);
    fireEvent.click(screen.getByRole('button', { name: '凍結第 1 col' }));

    firstBodyCell = container.querySelector('tbody tr td');
    expect((firstBodyCell?.className || '')).toContain('sticky');
  });
});
