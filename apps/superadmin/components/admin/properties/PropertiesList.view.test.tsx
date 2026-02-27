import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PropertiesList } from './PropertiesList';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const mockData = {
  properties: [],
  totalSales: 0,
  totalRentals: 0,
};

describe('PropertiesList View controls', () => {
  it('toggles sticky header via View dropdown', () => {
    const { container } = render(<PropertiesList data={mockData} />);

    const thead = container.querySelector('thead');
    expect(thead?.className || '').not.toContain('sticky');

    fireEvent.click(screen.getByRole('button', { name: /View/i }));
    fireEvent.click(screen.getByRole('button', { name: '凍結標題列' }));

    expect(thead?.className || '').toContain('sticky');
  });
});


