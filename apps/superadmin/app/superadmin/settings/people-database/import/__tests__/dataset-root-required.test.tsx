// Row 146 Step 3 — verify the import workspace blocks submission when
// dataset_root is empty and surfaces the radio + dropdown for picking an
// existing root vs creating a new one.
//
// The dataset_root UI is gated behind the "preview" status — that's by
// design: the user uploads a file first, and the picker appears alongside
// the column-mapping panel. To reach that state in tests we mock both the
// dataset-tree fetch and the import/preview fetch, then drive a file upload
// through the hidden <input type="file"> the workspace renders at idle.

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PeopleDatabaseImportWorkspace } from '../page';

// Strip DashboardLayout chrome.
jest.mock('@/components/dashboard', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dashboard-layout">{children}</div>
  ),
}));

// Mock URL.createObjectURL — jsdom doesn't implement it but lucide-react /
// some upload UIs may call it on the synthetic File.
beforeAll(() => {
  if (typeof URL.createObjectURL === 'undefined') {
    Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock' });
  }
});

interface MockOptions {
  roots?: string[];
  previewColumns?: string[];
}

function setupFetchMocks({ roots = [], previewColumns = ['name'] }: MockOptions = {}) {
  const fetchImpl = jest.fn().mockImplementation(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.includes('/api/people-db/dataset-tree')) {
      return {
        ok: true,
        json: async () => ({
          tree: roots.map((label) => ({
            label,
            path: label,
            count: 0,
            children: [],
          })),
        }),
      } as Response;
    }
    if (url.includes('/api/people-db/import/preview')) {
      return {
        ok: true,
        json: async () => ({
          columns: previewColumns.map((name, idx) => ({
            index: idx,
            name,
            sample_values: ['Alice'],
          })),
          row_count: 1,
          preview_rows: [{ name: 'Alice' }],
        }),
      } as Response;
    }
    return { ok: true, json: async () => ({}) } as Response;
  });
  global.fetch = fetchImpl as unknown as typeof fetch;
  return fetchImpl;
}

async function renderAndUpload(opts: MockOptions = {}) {
  const fetchImpl = setupFetchMocks(opts);
  render(<PeopleDatabaseImportWorkspace />);

  // Wait for dataset-tree fetch to settle.
  await waitFor(() => {
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('/api/people-db/dataset-tree'),
    );
  });

  // Trigger file upload to drive the workspace into the "preview" status.
  const fileInput = document.getElementById('file-upload') as HTMLInputElement;
  expect(fileInput).not.toBeNull();
  const file = new File(['name\nAlice'], 'sample.csv', { type: 'text/csv' });
  Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
  fireEvent.change(fileInput);

  // Wait for the metadata Card (which contains dataset_root) to mount.
  await waitFor(() => {
    expect(screen.getByTestId('dataset-root-field')).toBeInTheDocument();
  });

  return fetchImpl;
}

describe('PeopleDatabaseImportWorkspace (Row 146 — dataset_root required)', () => {
  it('renders dataset_root with red asterisk + 必填 helper text', async () => {
    await renderAndUpload();
    const field = screen.getByTestId('dataset-root-field');
    expect(field.querySelector('.text-red-500')).not.toBeNull();
    expect(field.textContent).toMatch(/必填/);
  });

  it('falls back to "new" mode when no existing roots; existing radio disabled', async () => {
    await renderAndUpload({ roots: [] });
    const existingRadio = screen.getByLabelText(/沿用既有/, { selector: 'input' });
    expect(existingRadio).toBeDisabled();
    const newRadio = screen.getByLabelText(/新建資料集/, { selector: 'input' });
    expect(newRadio).toBeChecked();
    expect(screen.getByTestId('dataset-root-input')).toBeInTheDocument();
  });

  it('switches to "existing" mode automatically when roots exist', async () => {
    await renderAndUpload({ roots: ['企業名錄', '北市稅籍', '台北市里長'] });
    const select = screen.getByTestId('dataset-root-select') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual([
      '',
      '企業名錄',
      '北市稅籍',
      '台北市里長',
    ]);
  });

  it('disables submit button when dataset_root is empty', async () => {
    await renderAndUpload({ roots: [] });
    const submit = screen.getByTestId('import-submit-button');
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('title', expect.stringContaining('資料集根目錄'));
  });

  it('clears the red border once user types a non-empty dataset root', async () => {
    await renderAndUpload({ roots: [] });
    const input = screen.getByTestId('dataset-root-input') as HTMLInputElement;
    expect(input).toHaveClass('border-red-500/60');
    fireEvent.change(input, { target: { value: '2026Q1 北市新檔' } });
    expect(input.value).toBe('2026Q1 北市新檔');
    expect(input).not.toHaveClass('border-red-500/60');
  });
});
