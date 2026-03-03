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
  it('toggles sticky header via View dropdown (不凍結列 / 凍結第 1 row)', () => {
    const { container } = render(<ModelEvaluator {...baseProps} />);

    const thead = container.querySelector('thead');
    // 初始預設為凍結第 1 row（sticky）
    expect(thead?.className || '').toContain('sticky');

    fireEvent.click(screen.getByRole('button', { name: /View/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: '不凍結列' }));

    expect(thead?.className || '').not.toContain('sticky');

    fireEvent.click(screen.getByRole('button', { name: /View/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: '凍結第 1 row' }));

    expect(container.querySelector('thead')?.className || '').toContain('sticky');
  });

  it('offers freeze pane options: 凍結窗格 with 列 and col', () => {
    render(<ModelEvaluator {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: /View/i }));

    expect(screen.getByText('凍結窗格')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '不凍結列' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '凍結第 1 row' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '不凍結col' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '凍結第 1 col' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '凍結第 1 ~ 2 col' })).toBeInTheDocument();
  });

  it('hides specific feature module columns when hiddenModuleKeys is provided', () => {
    render(
      <ModelEvaluator
        {...baseProps}
        hiddenModuleKeys={[
          'web_assistant',
          'contract_assistant',
          'blog_generator',
          'ad_generator',
          'software_dev_engineer',
          'ttd_engineer',
        ]}
      />
    );

    expect(screen.getByText('雲端OCR謄本解析（解析組） 模型排序')).toBeInTheDocument();
    expect(screen.getByText('雲端OCR謄本裁判（審核組） 模型排序')).toBeInTheDocument();

    expect(screen.queryByText('網頁功能解說 AI 助理')).not.toBeInTheDocument();
    expect(screen.queryByText('合約生成AI助理')).not.toBeInTheDocument();
    expect(screen.queryByText('部落格生成器 AI 助理')).not.toBeInTheDocument();
    expect(screen.queryByText('靜態網頁廣告生成器 AI 助理')).not.toBeInTheDocument();
    expect(screen.queryByText('Software Dev Engineer')).not.toBeInTheDocument();
    expect(screen.queryByText('TTD Engineer')).not.toBeInTheDocument();
  });
});

