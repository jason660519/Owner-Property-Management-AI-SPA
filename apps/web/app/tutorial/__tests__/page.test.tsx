import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import TutorialPage from '@/app/tutorial/page';

jest.mock('@/components/layout/Header', () => ({
  Header: () => <div>Header</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div>Footer</div>,
}));

describe('TutorialPage', () => {
  test('應顯示產品教學標題', () => {
    render(<TutorialPage />);
    expect(screen.getByRole('heading', { name: '產品教學', level: 1 })).toBeInTheDocument();
  });

  test('應顯示三個角色卡片', () => {
    render(<TutorialPage />);
    expect(screen.getByRole('link', { name: /開始房東版教學/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /開始租客版教學/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /開始買家版教學/ })).toBeInTheDocument();
  });

  test('角色卡片連結指向正確路由', () => {
    render(<TutorialPage />);
    expect(screen.getByRole('link', { name: /開始房東版教學/ })).toHaveAttribute(
      'href',
      '/tutorial/landlord',
    );
    expect(screen.getByRole('link', { name: /開始租客版教學/ })).toHaveAttribute(
      'href',
      '/tutorial/tenant',
    );
    expect(screen.getByRole('link', { name: /開始買家版教學/ })).toHaveAttribute(
      'href',
      '/tutorial/buyer',
    );
  });

  test('應顯示各角色的步驟數量', () => {
    render(<TutorialPage />);
    // landlord has 4 steps
    expect(screen.getByText(/4 個教學步驟/)).toBeInTheDocument();
    // tenant has 3 steps
    expect(screen.getByText(/3 個教學步驟/)).toBeInTheDocument();
    // buyer has 4 steps — getAll because landlord & buyer both have 4
    const fourStepLabels = screen.getAllByText(/4 個教學步驟/);
    expect(fourStepLabels.length).toBeGreaterThanOrEqual(2);
  });

  test('應顯示如何使用教學的四個步驟說明', () => {
    render(<TutorialPage />);
    expect(
      screen.getByText(/選擇符合你身份的角色（房東、租客或買家）/),
    ).toBeInTheDocument();
    expect(screen.getByText(/依序閱讀每個教學步驟，搭配截圖理解操作流程/)).toBeInTheDocument();
    expect(screen.getByText(/完成所有步驟後，解鎖完成徽章，教學進度自動儲存/)).toBeInTheDocument();
  });
});
