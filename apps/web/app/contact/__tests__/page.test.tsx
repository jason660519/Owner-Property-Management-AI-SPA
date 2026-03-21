import React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ContactPage from '@/app/contact/page';

const mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}));

jest.mock('@/components/layout/Header', () => ({
  Header: () => <div>Header</div>,
}));

jest.mock('@/components/layout/Footer', () => ({
  Footer: () => <div>Footer</div>,
}));

jest.mock('@/lib/actions/contact', () => ({
  sendContactEmail: jest.fn(),
}));

describe('ContactPage', () => {
  beforeEach(() => {
    mockSearchParams.forEach((_, key) => {
      mockSearchParams.delete(key);
    });
  });

  test('應顯示案件來源與 detail CTA 的可讀摘要', () => {
    mockSearchParams.set('inquiryType', '看屋');
    mockSearchParams.set('entryPoint', 'property-detail-viewing');
    mockSearchParams.set('sourcePath', '/properties/sale-2');
    mockSearchParams.set('propertyId', 'sale-2');
    mockSearchParams.set('propertyTitle', '台北大安整合案件');

    render(<ContactPage />);

    expect(screen.getByText('案件來源')).toBeInTheDocument();
    expect(screen.getByText('台北大安整合案件')).toBeInTheDocument();
    expect(screen.getByText('從案件詳情頁發起預約看房')).toBeInTheDocument();
  });

  test('應忽略不合法的來源參數', () => {
    mockSearchParams.set('sourcePath', 'https://evil.example');
    mockSearchParams.set('entryPoint', 'javascript:alert(1)');

    render(<ContactPage />);

    expect(screen.queryByText('來自公開頁面')).not.toBeInTheDocument();
    expect(
      screen.queryByText(/從案件詳情頁發起|從收費方式頁送出/i),
    ).not.toBeInTheDocument();
  });
});