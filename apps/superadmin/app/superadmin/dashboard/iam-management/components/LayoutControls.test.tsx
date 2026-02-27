import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IAMLayoutControls } from './LayoutControls';
import { IamViewSettingsProvider, useIamViewSettings } from './viewSettings';

function DebugView() {
  const { freezeRowCount, frozenColCount } = useIamViewSettings();
  return (
    <div
      data-testid="debug-view-settings"
      data-freeze-row={freezeRowCount}
      data-freeze-col={frozenColCount}
    />
  );
}

describe('IAMLayoutControls (View freeze panes)', () => {
  function setup() {
    return render(
      <IamViewSettingsProvider>
        <IAMLayoutControls />
        <DebugView />
      </IamViewSettingsProvider>
    );
  }

  it('updates freezeRowCount when selecting "凍結第 1 row"', () => {
    setup();

    const viewButton = screen.getByRole('button', { name: /View/i });
    fireEvent.click(viewButton);
    fireEvent.click(screen.getByRole('button', { name: '凍結第 1 row' }));

    const debug = screen.getByTestId('debug-view-settings');
    expect(debug).toHaveAttribute('data-freeze-row', '1');
  });

  it('updates frozenColCount when selecting "凍結第 1 col"', () => {
    setup();

    const viewButton = screen.getByRole('button', { name: /View/i });
    fireEvent.click(viewButton);
    fireEvent.click(screen.getByRole('button', { name: '凍結第 1 col' }));

    const debug = screen.getByTestId('debug-view-settings');
    expect(debug).toHaveAttribute('data-freeze-col', '1');
  });
});

