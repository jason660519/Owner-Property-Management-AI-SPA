import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  AuditLogEntry,
  IpBlacklistEntry,
  IpWhitelistEntry,
  LoginAnomaly,
  SecuritySummary,
  SslCertificate,
} from '@/app/superadmin/dashboard/security/actions';

jest.mock('@/app/superadmin/dashboard/security/actions', () => ({
  runAnomalyDetection: jest.fn().mockResolvedValue({ message: '未發現新的異常登入', count: 0 }),
  resolveAnomaly: jest.fn().mockResolvedValue(undefined),
  addIpToWhitelist: jest.fn().mockResolvedValue({}),
  removeIpFromWhitelist: jest.fn().mockResolvedValue(undefined),
  addToBlacklist: jest.fn().mockResolvedValue({}),
  removeFromBlacklist: jest.fn().mockResolvedValue(undefined),
}));

import {
  runAnomalyDetection,
  resolveAnomaly,
  addIpToWhitelist,
  addToBlacklist,
} from '@/app/superadmin/dashboard/security/actions';
import SecurityDashboardClient from '@/app/superadmin/dashboard/security/components/SecurityDashboardClient';

const summary: SecuritySummary = {
  totalAuditEvents: 12,
  failedLoginAttempts: 3,
  openAnomalies: 2,
  expiringCerts: 1,
  blacklistedEntries: 4,
  whitelistedIps: 6,
};

const auditLogs: AuditLogEntry[] = [
  {
    id: 'log-1',
    user_id: 'u1',
    action: 'SELECT',
    resource_table: 'properties',
    resource_id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    ip_address: '203.0.113.5',
    user_agent: 'Mozilla/5.0',
    severity: 'info',
    status: 'success',
    created_at: '2026-04-10T08:00:00.000Z',
  },
];

const anomalies: LoginAnomaly[] = [
  {
    id: 'anom-1',
    user_id: 'u2',
    email: 'user@example.com',
    ip_address: '198.51.100.2',
    anomaly_type: 'geo_velocity',
    severity: 'high',
    details: { hops: 2 },
    is_resolved: false,
    created_at: '2026-04-11T10:00:00.000Z',
  },
];

const sslCerts: SslCertificate[] = [
  {
    id: 'cert-1',
    domain: 'app.example.com',
    subject: 'CN=app.example.com',
    issuer: "Let's Encrypt",
    valid_from: '2026-01-01T00:00:00.000Z',
    valid_until: '2026-07-01T00:00:00.000Z',
    days_remaining: 20,
    status: 'expiring_soon',
    error_message: null,
    last_checked_at: '2026-04-12T12:00:00.000Z',
  },
];

const whitelist: IpWhitelistEntry[] = [
  { id: 'wl-1', ip_value: '10.0.0.1', label: 'Office', created_at: '2026-04-01T00:00:00.000Z' },
];

const blacklist: IpBlacklistEntry[] = [
  {
    id: 'bl-1',
    type: 'ip',
    value: '192.0.2.10',
    reason: 'scan',
    created_at: '2026-04-02T00:00:00.000Z',
  },
];

function renderDashboard(
  overrides: Partial<{
    summary: SecuritySummary;
    auditLogs: AuditLogEntry[];
    anomalies: LoginAnomaly[];
    sslCerts: SslCertificate[];
    whitelist: IpWhitelistEntry[];
    blacklist: IpBlacklistEntry[];
  }> = {},
) {
  return render(
    <SecurityDashboardClient
      summary={overrides.summary ?? summary}
      auditLogs={overrides.auditLogs ?? auditLogs}
      anomalies={overrides.anomalies ?? anomalies}
      sslCerts={overrides.sslCerts ?? sslCerts}
      whitelist={overrides.whitelist ?? whitelist}
      blacklist={overrides.blacklist ?? blacklist}
    />,
  );
}

describe('SecurityDashboardClient (Row 009)', () => {
  jest.setTimeout(30_000);

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(runAnomalyDetection).mockResolvedValue({ message: '未發現新的異常登入', count: 0 });
    jest.mocked(addIpToWhitelist).mockResolvedValue({});
    jest.mocked(addToBlacklist).mockResolvedValue({});
  });

  it('renders header and summary stat values', () => {
    renderDashboard();
    expect(screen.getByRole('heading', { name: /網路安全 ／ 隱私審計管理/ })).toBeInTheDocument();
    expect(screen.getByText('稽核事件 (7天)')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('lists audit log rows on the default tab', () => {
    renderDashboard();
    const table = screen.getByRole('table');
    expect(within(table).getByText('SELECT')).toBeInTheDocument();
    expect(within(table).getByText(/properties/)).toBeInTheDocument();
    expect(within(table).getByText('203.0.113.5')).toBeInTheDocument();
  });

  it('switches to anomalies tab and resolves an anomaly', async () => {
    const user = userEvent.setup({ delay: null });
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /異常登入/ }));
    expect(screen.getByText('geo_velocity')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '標記處理' }));
    expect(resolveAnomaly).toHaveBeenCalledWith('anom-1');
  });

  it('runs anomaly detection from header button', async () => {
    const user = userEvent.setup({ delay: null });
    renderDashboard();
    await user.click(screen.getByRole('button', { name: '執行異常偵測' }));
    await waitFor(
      () => {
        expect(runAnomalyDetection).toHaveBeenCalled();
      },
      { timeout: 15_000 },
    );
  });

  it('shows SSL expiry alert when certs are expiring', async () => {
    const user = userEvent.setup({ delay: null });
    renderDashboard();
    await user.click(screen.getByRole('button', { name: /SSL 憑證/ }));
    expect(screen.getByText('app.example.com')).toBeInTheDocument();
    expect(screen.getByText(/SSL 憑證即將到期警示/)).toBeInTheDocument();
  });

  it('adds whitelist IP via form', async () => {
    const user = userEvent.setup({ delay: null });
    renderDashboard();
    await user.click(screen.getByRole('button', { name: 'IP 白/黑名單' }));
    const ipInput = await waitFor(() => screen.getByPlaceholderText(/IP 位址或 CIDR/), { timeout: 10_000 });
    await user.type(ipInput, '10.1.1.1');
    const addButtons = screen.getAllByRole('button', { name: '加入' });
    await user.click(addButtons[0]);
    expect(addIpToWhitelist).toHaveBeenCalledWith('10.1.1.1', '');
  });

  it('adds blacklist entry', async () => {
    const user = userEvent.setup({ delay: null });
    renderDashboard();
    await user.click(screen.getByRole('button', { name: 'IP 白/黑名單' }));
    const valueInput = await waitFor(() => screen.getByPlaceholderText(/值（IP\/CIDR 或 UA 子字串）/), {
      timeout: 10_000,
    });
    await user.type(valueInput, '192.0.2.99');
    const addButtons = screen.getAllByRole('button', { name: '加入' });
    await user.click(addButtons[1]);
    expect(addToBlacklist).toHaveBeenCalledWith('ip', '192.0.2.99', '');
  });

  it('renders empty audit state when no logs', () => {
    renderDashboard({ auditLogs: [] });
    expect(screen.getByText('尚無稽核記錄')).toBeInTheDocument();
  });
});
