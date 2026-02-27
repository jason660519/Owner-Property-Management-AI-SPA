'use client';

import React, { createContext, useContext, useState } from 'react';

export type FreezeRowCount = 0 | 1;

export interface IamViewSettingsContextValue {
  freezeRowCount: FreezeRowCount;
  frozenColCount: number;
  setFreezeRowCount: (value: FreezeRowCount) => void;
  setFrozenColCount: (value: number) => void;
}

const IamViewSettingsContext = createContext<IamViewSettingsContextValue | undefined>(undefined);

export function IamViewSettingsProvider({ children }: { children: React.ReactNode }) {
  const [freezeRowCount, setFreezeRowCount] = useState<FreezeRowCount>(0);
  const [frozenColCount, setFrozenColCount] = useState<number>(0);

  return (
    <IamViewSettingsContext.Provider
      value={{ freezeRowCount, frozenColCount, setFreezeRowCount, setFrozenColCount }}
    >
      {children}
    </IamViewSettingsContext.Provider>
  );
}

export function useIamViewSettings(): IamViewSettingsContextValue {
  const ctx = useContext(IamViewSettingsContext);
  if (!ctx) {
    throw new Error('useIamViewSettings must be used within IamViewSettingsProvider');
  }
  return ctx;
}

