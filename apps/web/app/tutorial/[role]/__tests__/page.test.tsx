import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  use: jest.fn((p: Promise<unknown>) => {
    // Synchronously unwrap in tests using a hack — tests pass params directly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (p as any)._value ?? p;
  }),
}));

jest.mock('@/components/layout/Header', () => ({
  Header: () => <div>Header</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div>Footer</div>,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt, ...props }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} {...props} />
  ),
}));

// Mock useTutorialProgress to control state in tests
const mockMarkStepComplete = jest.fn();
const mockResetProgress = jest.fn();
const mockIsStepComplete = jest.fn().mockReturnValue(false);
const mockCompletionPercent = jest.fn().mockReturnValue(0);

jest.mock('@/hooks/useTutorialProgress', () => ({
  useTutorialProgress: jest.fn(() => ({
    progress: { completedStepIds: [], lastStepId: null, completedAt: null },
    markStepComplete: mockMarkStepComplete,
    resetProgress: mockResetProgress,
    isStepComplete: mockIsStepComplete,
    completionPercent: mockCompletionPercent,
    isAllComplete: false,
  })),
}));

// Wrap params as an object with _value to allow synchronous `use()` mock
function makeParams(role: string) {
  const p = Promise.resolve({ role });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (p as any)._value = { role };
  return p;
}

import TutorialRolePage from '@/app/tutorial/[role]/page';
import { useTutorialProgress } from '@/hooks/useTutorialProgress';

describe('TutorialRolePage — 房東版', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsStepComplete.mockReturnValue(false);
    mockCompletionPercent.mockReturnValue(0);
    (useTutorialProgress as jest.Mock).mockReturnValue({
      progress: { completedStepIds: [], lastStepId: null, completedAt: null },
      markStepComplete: mockMarkStepComplete,
      resetProgress: mockResetProgress,
      isStepComplete: mockIsStepComplete,
      completionPercent: mockCompletionPercent,
      isAllComplete: false,
    });
  });

  test('應顯示房東版教學標題', () => {
    render(<TutorialRolePage params={makeParams('landlord')} />);
    expect(screen.getByRole('heading', { name: '房東版教學', level: 1 })).toBeInTheDocument();
  });

  test('應顯示返回連結', () => {
    render(<TutorialRolePage params={makeParams('landlord')} />);
    expect(screen.getByRole('link', { name: /返回角色選擇/ })).toHaveAttribute(
      'href',
      '/tutorial',
    );
  });

  test('應顯示進度條', () => {
    render(<TutorialRolePage params={makeParams('landlord')} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  test('應顯示所有教學步驟', () => {
    render(<TutorialRolePage params={makeParams('landlord')} />);
    expect(screen.getByText('建立帳號與選擇角色')).toBeInTheDocument();
    expect(screen.getByText('刊登出租物件')).toBeInTheDocument();
    expect(screen.getByText('管理帶看與詢問')).toBeInTheDocument();
    expect(screen.getByText('追蹤租約與點交進度')).toBeInTheDocument();
  });

  test('點擊「標記為已完成」應呼叫 markStepComplete', () => {
    render(<TutorialRolePage params={makeParams('landlord')} />);
    const buttons = screen.getAllByRole('button', { name: /標記步驟.*已完成/ });
    fireEvent.click(buttons[0]);
    expect(mockMarkStepComplete).toHaveBeenCalledWith('landlord-01');
  });

  test('已完成步驟不應顯示「標記為已完成」按鈕', () => {
    mockIsStepComplete.mockImplementation((id: string) => id === 'landlord-01');
    render(<TutorialRolePage params={makeParams('landlord')} />);
    // landlord-01 is complete, so only 3 buttons remain
    const buttons = screen.getAllByRole('button', { name: /標記步驟.*已完成/ });
    expect(buttons.length).toBe(3);
  });

  test('全部完成時應顯示完成徽章', () => {
    (useTutorialProgress as jest.Mock).mockReturnValue({
      progress: {
        completedStepIds: ['landlord-01', 'landlord-02', 'landlord-03', 'landlord-04'],
        lastStepId: 'landlord-04',
        completedAt: new Date().toISOString(),
      },
      markStepComplete: mockMarkStepComplete,
      resetProgress: mockResetProgress,
      isStepComplete: jest.fn().mockReturnValue(true),
      completionPercent: jest.fn().mockReturnValue(100),
      isAllComplete: true,
    });
    render(<TutorialRolePage params={makeParams('landlord')} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/恭喜完成所有教學步驟！/)).toBeInTheDocument();
    expect(screen.getByText(/房東版完成徽章/)).toBeInTheDocument();
  });
});

describe('TutorialRolePage — 租客版', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsStepComplete.mockReturnValue(false);
    mockCompletionPercent.mockReturnValue(0);
    (useTutorialProgress as jest.Mock).mockReturnValue({
      progress: { completedStepIds: [], lastStepId: null, completedAt: null },
      markStepComplete: mockMarkStepComplete,
      resetProgress: mockResetProgress,
      isStepComplete: mockIsStepComplete,
      completionPercent: mockCompletionPercent,
      isAllComplete: false,
    });
  });

  test('應顯示租客版教學標題', () => {
    render(<TutorialRolePage params={makeParams('tenant')} />);
    expect(screen.getByRole('heading', { name: '租客版教學', level: 1 })).toBeInTheDocument();
  });

  test('應顯示租客版的 3 個步驟', () => {
    render(<TutorialRolePage params={makeParams('tenant')} />);
    expect(screen.getByText('搜尋合適物件')).toBeInTheDocument();
    expect(screen.getByText('申請看屋')).toBeInTheDocument();
    expect(screen.getByText('追蹤租約狀態')).toBeInTheDocument();
    const buttons = screen.getAllByRole('button', { name: /標記步驟.*已完成/ });
    expect(buttons.length).toBe(3);
  });
});

describe('TutorialRolePage — 無效角色', () => {
  test('無效 role 應呼叫 notFound', () => {
    const { notFound } = require('next/navigation');
    render(<TutorialRolePage params={makeParams('invalid-role')} />);
    expect(notFound).toHaveBeenCalled();
  });
});
