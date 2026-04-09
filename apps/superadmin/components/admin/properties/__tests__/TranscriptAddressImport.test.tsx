import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { PropertyEditForm } from '../PropertyEditForm';
import type { PropertyItem } from '@/lib/types/properties';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams('tab=transcript'),
}));

jest.mock('../TranscriptTabContent', () => ({
  TranscriptTabContent: () => <div data-testid="transcript-tab-content" />,
}));

jest.mock('@/lib/actions/properties', () => ({
  updateProperty: jest.fn().mockResolvedValue({ success: true, message: 'ok' }),
}));

function makeProperty(overrides: Partial<PropertyItem> = {}): PropertyItem {
  const createdAt = overrides.createdAt ?? new Date().toISOString();
  const updatedAt = overrides.updatedAt ?? createdAt;
  return {
    id: 'prop-1',
    type: 'sale',
    title: '測試物件',
    address: '',
    addressCity: undefined,
    addressDistrict: undefined,
    addressStreet: undefined,
    addressNumber: undefined,
    addressFloor: undefined,
    addressUnit: undefined,
    status: 'for_sale',
    price: 0,
    monthlyRent: null,
    creatorName: 'tester',
    ownerName: '王小明',
    ownerId: 'owner-1',
    area: null,
    propertyType: null,
    bedrooms: null,
    bathrooms: null,
    livingRooms: null,
    parkingSpaces: null,
    delistedAt: null,
    mainPhotoUrl: null,
    buildingTranscript: null,
    landTranscript: null,
    ...overrides,
    createdAt,
    updatedAt,
  };
}

describe('謄本地址導入到物件基本資料', () => {
  it('renders transcript tab content when tab=transcript', () => {
    const property = makeProperty();
    render(<PropertyEditForm property={property} />);

    expect(screen.getByTestId('transcript-tab-content')).toBeInTheDocument();
  });
});
