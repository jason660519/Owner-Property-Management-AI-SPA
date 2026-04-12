import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import PromptEngineerModal from './PromptEngineerModal';
import type { ProgressRow } from './types';

function buildRow(): ProgressRow {
  return {
    __rowId: '132',
    __source: 'roadmap',
    name: 'Prompt and IDE Setting 升級',
    category: '專案管理與工具 (Project Management)',
    percentage: 0,
    featureSpecDocPath: '/project-process/features/prompt-ide-paperclip-auto-loop-dev-spec-20260413.md',
    tddSpecDocPath: '/project-process/features/tdd-prompt-ide-paperclip-auto-loop-20260413.md',
  };
}

describe('PromptEngineerModal auto mode', () => {
  it('shows auto policy inputs when execution mode is auto', () => {
    render(
      <PromptEngineerModal
        row={buildRow()}
        rowKey="roadmap:132"
        userId="u-test"
        currentIDE="Cursor"
        onIdeChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const modeSelect = screen.getByLabelText('執行模式');
    fireEvent.change(modeSelect, { target: { value: 'auto' } });

    expect(screen.getByLabelText('最大重試次數')).toBeInTheDocument();
    expect(screen.getByLabelText('冷卻秒數')).toBeInTheDocument();
    expect(screen.getByLabelText('熔斷門檻（連續失敗）')).toBeInTheDocument();
  });

  it('hides auto policy inputs when switching back to manual', () => {
    render(
      <PromptEngineerModal
        row={buildRow()}
        rowKey="roadmap:132"
        userId="u-test"
        currentIDE="Cursor"
        onIdeChange={jest.fn()}
        onClose={jest.fn()}
      />,
    );

    const modeSelect = screen.getByLabelText('執行模式');
    fireEvent.change(modeSelect, { target: { value: 'auto' } });
    expect(screen.getByLabelText('最大重試次數')).toBeInTheDocument();

    fireEvent.change(modeSelect, { target: { value: 'manual' } });
    expect(screen.queryByLabelText('最大重試次數')).not.toBeInTheDocument();
  });
});
