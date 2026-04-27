import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TranscriptTabContent } from '../TranscriptTabContent';
import type { PropertyItem } from '@/lib/types/properties';
import {
  getPropertyDocuments,
  savePropertyHasIndependentParking,
  savePropertyIndependentTitleSaleModes,
  savePropertyParkingTitleRights,
  savePropertyIndependentBuildingNumberCount,
  savePropertySubjectLandParcelSettings,
} from '@/lib/actions/properties';

jest.mock('@/lib/actions/properties', () => ({
  getPropertyDocuments: jest.fn(),
  uploadPropertyDocument: jest.fn(),
  deletePropertyDocument: jest.fn(),
  savePropertyHasIndependentParking: jest.fn().mockResolvedValue({ success: true }),
  savePropertyIndependentTitleSaleModes: jest.fn().mockResolvedValue({ success: true }),
  savePropertyParkingTitleRights: jest.fn().mockResolvedValue({ success: true }),
  savePropertyIndependentBuildingNumberCount: jest.fn().mockResolvedValue({ success: true }),
  savePropertySubjectLandParcelSettings: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../TranscriptParseSection', () => ({
  TranscriptParseSection: () => <div data-testid="transcript-parse-section" />,
}));

jest.mock('../BuildingTranscriptForm', () => ({
  BuildingTranscriptForm: () => <div data-testid="building-transcript-form" />,
}));

jest.mock('../LandTranscriptForm', () => ({
  LandTranscriptForm: () => <div data-testid="land-transcript-form" />,
}));

jest.mock('@/lib/hooks/useAISettings', () => ({
  useAISettings: () => ({ userId: 'test-ai-user' }),
}));

const mockGetPropertyDocuments = getPropertyDocuments as jest.MockedFunction<typeof getPropertyDocuments>;
const mockSaveParkingTitleRights = savePropertyParkingTitleRights as jest.MockedFunction<typeof savePropertyParkingTitleRights>;
const mockSaveHasIndependentParking = savePropertyHasIndependentParking as jest.MockedFunction<typeof savePropertyHasIndependentParking>;
const mockSaveSaleModes = savePropertyIndependentTitleSaleModes as jest.MockedFunction<typeof savePropertyIndependentTitleSaleModes>;
const mockSaveBuildingCount =
  savePropertyIndependentBuildingNumberCount as jest.MockedFunction<typeof savePropertyIndependentBuildingNumberCount>;

function buildProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  const createdAt = overrides.createdAt ?? new Date().toISOString();
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    id: 'property-1',
    type: 'sale',
    title: '測試物件',
    address: '台北市測試路 1 號',
    status: 'draft',
    price: null,
    monthlyRent: null,
    ownerName: 'Owner',
    ownerId: 'owner-1',
    area: null,
    propertyType: null,
    bedrooms: null,
    bathrooms: null,
    livingRooms: null,
    parkingSpaces: null,
    independentTitleSaleModes: [],
    parkingTitleRights: [],
    ...overrides,
    createdAt,
    updatedAt,
  };
}

describe('TranscriptTabContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPropertyDocuments.mockResolvedValue([]);
  });

  it('renders the unified transcript workbench without the legacy tools entry', async () => {
    render(<TranscriptTabContent property={buildProperty()} />);

    await waitFor(() => {
      expect(mockGetPropertyDocuments).toHaveBeenCalledWith('property-1');
    });

    expect(await screen.findByText('謄本工作台')).toBeInTheDocument();
    expect(screen.queryByText('進階／舊版謄本工具')).not.toBeInTheDocument();
    expect(screen.queryByText('標的建築物建號筆數(單選)')).not.toBeInTheDocument();
    expect(mockSaveHasIndependentParking).not.toHaveBeenCalled();
    expect(mockSaveSaleModes).not.toHaveBeenCalled();
    expect(mockSaveBuildingCount).not.toHaveBeenCalled();
    expect(mockSaveParkingTitleRights).not.toHaveBeenCalled();
  });
});
