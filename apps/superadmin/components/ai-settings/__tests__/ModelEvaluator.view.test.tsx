import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelEvaluator } from '../ModelEvaluator';

const baseProps = {
  savedKeys: [],
  savedModels: [],
  savedEvaluations: [],
  validateAllResultsByKeyId: {},
  currentKeys: [],
  onSave: jest.fn(),
  onTestModel: jest.fn(),
  onSaveModels: jest.fn(),
  savedModules: [],
  onSaveModule: jest.fn(),
  globalTestPrompt: '',
  onChangeGlobalTestPrompt: jest.fn(),
  uploadedFile: null,
  onChangeUploadedFile: jest.fn(),
  summarySelectedCount: 0,
  summaryTotalCount: 0,
};

describe('ModelEvaluator View controls', () => {
  it('toggles sticky header via View dropdown', () => {
    const { container } = render(<ModelEvaluator {...baseProps} />);

    const thead = container.querySelector('thead');
    // 初始預設為凍結標題列（sticky）
    expect(thead?.className || '').toContain('sticky');

    fireEvent.click(screen.getByRole('button', { name: /View/i }));
    fireEvent.click(screen.getByRole('button', { name: '不凍結標題列' }));

    expect(thead?.className || '').not.toContain('sticky');
  });
});

