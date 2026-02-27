import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DevelopmentTab } from './DevelopmentTab';

// jsdom 沒有內建 ResizeObserver，測試中用簡單 mock 即可
class ResizeObserverMock {
  callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe() {
    // 立即觸發一次 callback 模擬初次量測
    this.callback([] as any, this as any);
  }
  unobserve() {}
  disconnect() {}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(global as any).ResizeObserver = ResizeObserverMock;

jest.mock('@/lib/hooks/useAISettings', () => ({
  useAISettings: () => ({ userId: 'test-user' }),
}));

const mockFeatures = [
  {
    name: 'Test feature',
    category: 'Test category',
    locatedPage: 'superadmin/dashboard',
    percentage: 0,
  } as any,
];

describe('DevelopmentTab View controls (freeze panes)', () => {
  it('toggles sticky header via View dropdown (凍結第 1 row)', async () => {
    const { container } = render(<DevelopmentTab features={mockFeatures} />);

    const separator = container.querySelector('[aria-label="調整標題列高度"]') as HTMLDivElement | null;
    const headerWrapper = separator?.parentElement as HTMLElement | null;
    expect(headerWrapper?.className || '').toContain('sticky');

    const viewButton = screen.getByRole('button', { name: /View/i });
    fireEvent.click(viewButton);
    const unfreezeRowBtn = await screen.findByText('不凍結列');
    fireEvent.click(unfreezeRowBtn);
    expect(headerWrapper?.className || '').not.toContain('sticky');

    fireEvent.click(viewButton);
    const freezeRowBtn = await screen.findByText('凍結第 1 row');
    fireEvent.click(freezeRowBtn);
    expect(headerWrapper?.className || '').toContain('sticky');
  });

  it('toggles sticky first data column via View dropdown (凍結第 1 col)', async () => {
    const { container } = render(<DevelopmentTab features={mockFeatures} />);

    let firstCell = container.querySelector('div.cursor-cell') as HTMLElement | null;
    expect(firstCell?.className || '').not.toContain('sticky');

    const viewButton = screen.getByRole('button', { name: /View/i });
    fireEvent.click(viewButton);
    const freezeColBtn = await screen.findByText('凍結第 1 col');
    fireEvent.click(freezeColBtn);

    firstCell = container.querySelector('div.cursor-cell') as HTMLElement | null;
    expect(firstCell?.className || '').toContain('sticky');
  });
});

