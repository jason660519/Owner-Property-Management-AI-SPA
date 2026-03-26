import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    createdAt: new Date().toISOString(),
    independentTitleSaleModes: [],
    parkingTitleRights: [],
    ...overrides,
  };
}

describe('TranscriptTabContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPropertyDocuments.mockResolvedValue([]);
  });

  it('allows shared parking row toggle to collapse main transcript section', async () => {
    const user = userEvent.setup();
    render(<TranscriptTabContent property={buildProperty()} />);

    await waitFor(() => {
      expect(mockGetPropertyDocuments).toHaveBeenCalledWith('property-1');
    });

    await user.click(
      screen.getByRole('checkbox', {
        name: '公設產權車位（共有持分／登載於主建物謄本之停車空間）',
      }),
    );

    await waitFor(() => {
      expect(mockSaveParkingTitleRights).toHaveBeenCalledWith('property-1', 'sale', ['shared_facility']);
    });
    expect(mockSaveHasIndependentParking).not.toHaveBeenCalled();
    expect(mockSaveSaleModes).not.toHaveBeenCalled();
    expect(mockSaveBuildingCount).not.toHaveBeenCalled();

    expect(screen.getByText('公設車位－建物全部謄本')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: '收合謄本（主建物與土地）',
      }),
    );

    expect(screen.queryByText('公設車位－建物全部謄本')).not.toBeInTheDocument();
    expect(screen.queryByText('公設車位－土地全部／持分謄本')).not.toBeInTheDocument();
  });
});
