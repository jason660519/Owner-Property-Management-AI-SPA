export type AdvertisementSectionStatus = 'recommended' | 'available' | 'unavailable';

export type AdvertisementSectionId =
  | 'basic-info'
  | 'description'
  | 'transcript-link'
  | 'area-detail-table'
  | 'title-link'
  | 'location'
  | 'photos'
  | 'floor-plan';

export interface AdvertisementSectionConfig {
  id: AdvertisementSectionId;
  title: string;
  description: string;
  fixTargetLabel?: string;
}

export interface AdvertisementSectionDefinition {
  id: AdvertisementSectionId;
  title: string;
  description: string;
  status: AdvertisementSectionStatus;
  unavailableReason?: string;
  fixTargetLabel?: string;
  defaultSelected?: boolean;
}

export type AdvertisementStyleMode = 'preset' | 'reference';

export type AdvertisementBuilderPlatform = 'supabase' | 'google_blogger';

export interface AdvertisementBuilderDraftData {
  platform: AdvertisementBuilderPlatform;
  styleMode: AdvertisementStyleMode;
  stylePreset?: 'luxury_dark' | 'bright_clean' | 'corporate' | 'warm_japanese';
  referenceUrl: string;
  selectedSectionIds: AdvertisementSectionId[];
}