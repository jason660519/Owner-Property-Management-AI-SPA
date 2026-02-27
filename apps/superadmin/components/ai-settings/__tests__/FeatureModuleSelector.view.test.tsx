import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FeatureModuleSelector } from '../FeatureModuleSelector';

const baseProps = {
  savedModules: [],
  savedKeys: [],
  savedModels: [],
  onSave: jest.fn(),
  onTestModel: jest.fn(),
};

describe('FeatureModuleSelector View controls', () => {
  it('toggles sticky header via View dropdown', () => {
    const { container } = render(<FeatureModuleSelector {...baseProps} />);

    const thead = container.querySelector('thead');
    expect(thead?.className || '').not.toContain('sticky');

    fireEvent.click(screen.getByRole('button', { name: /View/i }));
    fireEvent.click(screen.getByRole('button', { name: '凍結標題列' }));

    expect(thead?.className || '').toContain('sticky');
  });
});

