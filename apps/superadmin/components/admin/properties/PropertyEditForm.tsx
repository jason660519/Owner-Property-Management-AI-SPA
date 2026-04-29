// filepath: apps/superadmin/components/admin/properties/PropertyEditForm.tsx
// created: 2026-03-05 | creator: Claude
'use client';

import { useState, useTransition, useMemo, useRef, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, Building2, Key, X } from 'lucide-react';
import { updateProperty } from '@/lib/actions/properties';
import { fetchCadastralMap, type FetchResult } from '@/lib/actions/cadastral-maps';
import { PropertyMediaSection } from './PropertyMediaSection';
import { PropertyInvestigationReportSection } from './PropertyInvestigationReportSection';
import { PropertyBlogGenerator } from './PropertyBlogGenerator';
import { PropertyIntroductionTab } from './PropertyIntroductionTab';
import { PropertyMapLocationTab } from './PropertyMapLocationTab';
import { ContractDraftPreviewSection } from './ContractDraftPreviewSection';
import { TranscriptTabContent } from './TranscriptTabContent';
import { BuildingLandAreaDetailTab } from './BuildingLandAreaDetailTab';
import { ZoningUsageTab } from './ZoningUsageTab';
import { PropertyGeographicInfoTab } from './PropertyGeographicInfoTab';
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type PropertyDocumentItem,
  type PropertyItem,
  type PropertyPhotoItem,
  type UpdatePropertyInput,
} from '@/lib/types/properties';
import { TAIWAN_CITIES, getDistrictsByCity } from '@/lib/data/taiwan-address';
import { geocodeAddress } from '@/lib/utils/geocoding';
import type { MapLayerPreset } from '@/lib/utils/cadastral-map-fetcher';
import { NumberComboBox } from './NumberComboBox';
import type { InvestigationReport } from './investigation-report/types';
import {
  writePendingLayer,
  clearPendingLayer,
  elapsedSecondsForLayer,
} from './gis-fetch-pending-storage';
import {
  clearOutcomeForLayer,
  writeOutcome,
} from './gis-fetch-outcomes-storage';

const GIS_AUTO_LAYERS: MapLayerPreset[] = ['cadastral', 'building', 'both'];

function truncateGisMessage(s: string, max = 96): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function composeAddress(parts: {
  city?: string;
  district?: string;
  street?: string;
  number?: string;
  floor?: string;
  unit?: string;
}): string {
  return [parts.city, parts.district, parts.street, parts.number, parts.floor, parts.unit]
    .filter(Boolean)
    .join(' ')
    .trim();
}

const statusLabelsMap: Record<string, string> = {
  for_sale: '出售中',
  for_rent: '出租中',
  collecting_rent: '收租中',
  sold: '賀成交（出售）',
  rented: '賀成交（出租）',
  pending: '待审',
  expired: '逾期案（下架沒換手）',
  invalid: '無效案（下架已換手）',
};

const BACK_URL = '/superadmin/properties';

type TabId =
  | 'edit'
  | 'photos'
  | 'floor_plan'
  | 'building_measurement_survey'
  | 'introduction'
  | 'advertisement_creators'
  | 'transcript'
  | 'building_land_area_detail'
  | 'zoning_usage'
  | 'geographic_info'
  | 'title'
  | 'map_location'
  | 'transaction_comparables'
  | 'contract'
  | 'investigation';

const TAB_LABELS: Record<TabId, ReactNode> = {
  transcript: '謄本',
  building_land_area_detail: (
    <>
      <span className="block">建物 土地 車位</span>
      <span className="block">面積明細表</span>
    </>
  ),
  zoning_usage: '使用分區',
  geographic_info: '地理資訊',
  title: '權狀',
  edit: '物件基本資訊',
  map_location: 'Google 地圖定位',
  photos: '物件照片',
  floor_plan: '格局圖',
  building_measurement_survey: '建物測量成果圖',
  introduction: '物件介紹',
  advertisement_creators: '網頁廣告',
  transaction_comparables: '成交行情表',
  contract: '各類合約書套版',
  investigation: '物件調查報告書',
};

const ALL_TABS: TabId[] = [
  'edit',
  'introduction',
  'transcript',
  'building_land_area_detail',
  'zoning_usage',
  'geographic_info',
  'title',
  'map_location',
  'photos',
  'floor_plan',
  'building_measurement_survey',
  'transaction_comparables',
  'contract',
  'investigation',
  'advertisement_creators',
];

interface PropertyEditFormProps {
  property: PropertyItem;
  initialInvestigationReport?: InvestigationReport | null;
  initialInvestigationPhotos?: PropertyPhotoItem[];
  initialInvestigationDocuments?: PropertyDocumentItem[];
}

export function PropertyEditForm({
  property,
  initialInvestigationReport,
  initialInvestigationPhotos,
  initialInvestigationDocuments,
}: PropertyEditFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const activeTab: TabId = (searchParams.get('tab') as TabId | null) ?? 'edit';
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const successFeedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [title, setTitle] = useState(property.title);
  const [addressCity, setAddressCity] = useState(property.addressCity ?? '');
  const [addressDistrict, setAddressDistrict] = useState(property.addressDistrict ?? '');
  const [addressStreet, setAddressStreet] = useState(property.addressStreet ?? '');
  const [addressNumber, setAddressNumber] = useState(property.addressNumber ?? '');
  const [addressFloor, setAddressFloor] = useState(property.addressFloor ?? '');
  const [addressUnit, setAddressUnit] = useState(property.addressUnit ?? '');
  const [status, setStatus] = useState(property.status);
  const districtOptions = useMemo(() => getDistrictsByCity(addressCity), [addressCity]);
  const [price, setPrice] = useState(property.price ?? 0);
  const [monthlyRent, setMonthlyRent] = useState(property.monthlyRent ?? 0);
  const [leaseTerm, setLeaseTerm] = useState(12);
  const [propertyType, setPropertyType] = useState(property.propertyType ?? '');
  const [areaInput, setAreaInput] = useState(
    property.area != null ? String(property.area) : ''
  );
  const areaNum = (() => {
    if (areaInput.trim() === '') return 0;
    const n = Number(areaInput);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  })();
  const [bedrooms, setBedrooms] = useState(property.bedrooms ?? 0);
  const [bathrooms, setBathrooms] = useState(property.bathrooms ?? 0);
  const [livingRooms, setLivingRooms] = useState(property.livingRooms ?? 0);
  const [parkingSpaces, setParkingSpaces] = useState(property.parkingSpaces ?? 0);
  const [description, setDescription] = useState(property.description ?? '');
  const [latInput, setLatInput] = useState(property.latitude != null ? String(property.latitude) : '');
  const [lngInput, setLngInput] = useState(property.longitude != null ? String(property.longitude) : '');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isAutoGeneratingGis, setIsAutoGeneratingGis] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Parse + validate lat/lng inputs
  const validLat = useMemo(() => {
    const n = parseFloat(latInput);
    return latInput.trim() !== '' && !isNaN(n) && n >= -90 && n <= 90 ? n : null;
  }, [latInput]);
  const validLng = useMemo(() => {
    const n = parseFloat(lngInput);
    return lngInput.trim() !== '' && !isNaN(n) && n >= -180 && n <= 180 ? n : null;
  }, [lngInput]);

  // Composed address for display / geocoding
  const composedAddress = useMemo(
    () =>
      composeAddress({
        city: addressCity || undefined,
        district: addressDistrict || undefined,
        street: addressStreet || undefined,
        number: addressNumber || undefined,
        floor: addressFloor || undefined,
        unit: addressUnit || undefined,
      }) || property.address,
    [addressCity, addressDistrict, addressStreet, addressNumber, addressFloor, addressUnit, property.address],
  );

  // Auto-geocode using OpenStreetMap Nominatim (free, no API key)
  // Note: OSM Taiwan data has street-level coverage but NOT building-level (house numbers).
  // Strategies must omit house numbers to get results; coordinates will be street-level accurate.
  const handleGeocode = useCallback(async () => {
    const params = {
      city: addressCity,
      district: addressDistrict,
      street: addressStreet,
      number: addressNumber,
      rawAddress: property.address,
    };

    if (!params.city && !params.street && !params.rawAddress) {
      setGeocodeMsg({ type: 'error', text: '請先填寫地址' });
      return;
    }

    setIsGeocoding(true);
    setGeocodeMsg(null);

    try {
      const result = await geocodeAddress(params);

      if (result) {
        setLatInput(result.lat.toFixed(6));
        setLngInput(result.lng.toFixed(6));

        let accuracyText = '座標';
        if (result.accuracy === 'building') accuracyText = '門牌等級座標';
        else if (result.accuracy === 'street') accuracyText = '街道等級座標';
        else if (result.accuracy === 'area') accuracyText = '區域等級座標';

        setGeocodeMsg({
          type: 'success',
          text: `已找到${accuracyText}（${result.displayName}）`,
        });
      } else {
        setGeocodeMsg({
          type: 'error',
          text: '找不到此地址的座標。請確認路名是否完整（如「仁愛路四段」），或改為手動輸入座標。',
        });
      }
    } catch {
      setGeocodeMsg({ type: 'error', text: '地理編碼服務暫時無法使用，請手動輸入座標' });
    } finally {
      setIsGeocoding(false);
    }
  }, [addressCity, addressDistrict, addressStreet, addressNumber, property.address]);

  const runAutoGisGenerationAfterSave = useCallback(
    async (params: {
      coords: { latitude: number; longitude: number } | null;
      address: { district: string; street: string; addressNumber: string } | null;
    }) => {
      if (!params.coords && !params.address) {
        setFeedback({
          type: 'success',
          message: '基本資料已儲存。缺少座標或完整地址，尚未自動產出 GIS 圖資。',
        });
        router.refresh();
        return;
      }

      setIsAutoGeneratingGis(true);
      setFeedback({
        type: 'success',
        message: '基本資料已儲存，正在自動產出地籍圖、建物套繪圖與合併圖。',
      });

      const results = await Promise.all(
        GIS_AUTO_LAYERS.map(async (layer): Promise<FetchResult> => {
          clearOutcomeForLayer(property.id, layer);
          writePendingLayer(property.id, layer, Date.now());
          try {
            const result = await fetchCadastralMap(
              property.id,
              property.type,
              property.ownerId,
              layer,
              params.coords,
              params.coords ? null : params.address,
              { source: 'historygis', replaceExisting: true },
            );
            const sec = elapsedSecondsForLayer(property.id, layer);
            if (result.success) {
              writeOutcome(property.id, layer, { kind: 'success', seconds: sec, at: Date.now() });
            } else {
              writeOutcome(property.id, layer, {
                kind: 'error',
                seconds: sec,
                message: truncateGisMessage(result.message),
                at: Date.now(),
              });
            }
            return result;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            const sec = elapsedSecondsForLayer(property.id, layer);
            const message = `擷取失敗：${msg}`;
            writeOutcome(property.id, layer, {
              kind: 'error',
              seconds: sec,
              message: truncateGisMessage(message),
              at: Date.now(),
            });
            return { success: false, message };
          } finally {
            clearPendingLayer(property.id, layer);
          }
        }),
      );

      const successCount = results.filter((r) => r.success).length;
      setIsAutoGeneratingGis(false);
      setFeedback({
        type: successCount === GIS_AUTO_LAYERS.length ? 'success' : 'error',
        message:
          successCount === GIS_AUTO_LAYERS.length
            ? '基本資料已儲存，3 份 GIS 圖資已自動產出。'
            : `基本資料已儲存；GIS 圖資自動產出 ${successCount} / ${GIS_AUTO_LAYERS.length} 份完成，請到「地理資訊」查看失敗項目。`,
      });
      router.refresh();
    },
    [property.id, property.ownerId, property.type, router],
  );

  function handleSubmit() {
    setFeedback(null);
    if (successFeedbackTimeoutRef.current) {
      clearTimeout(successFeedbackTimeoutRef.current);
      successFeedbackTimeoutRef.current = null;
    }

    const input: UpdatePropertyInput = {
      title,
      address: composedAddress || property.address,
      addressCity: addressCity || undefined,
      addressDistrict: addressDistrict || undefined,
      addressStreet: addressStreet || undefined,
      addressNumber: addressNumber || undefined,
      addressFloor: addressFloor || undefined,
      addressUnit: addressUnit || undefined,
      status,
      propertyType: propertyType || undefined,
      area:
        areaInput.trim() === ''
          ? null
          : (() => {
              const n = Number(areaInput);
              return Number.isFinite(n) && n >= 0 ? n : null;
            })(),
      bedrooms: bedrooms || null,
      bathrooms: bathrooms || null,
      livingRooms: livingRooms || null,
      parkingSpaces: parkingSpaces || null,
      latitude: validLat,
      longitude: validLng,
    };

    if (description.trim()) {
      input.description = description;
    }

    if (property.type === 'sale') {
      input.price = price;
    } else {
      input.monthlyRent = monthlyRent;
      input.leaseTerm = leaseTerm;
    }

    const gisCoords =
      validLat != null && validLng != null
        ? { latitude: validLat, longitude: validLng }
        : null;
    const gisAddress =
      gisCoords == null &&
      addressDistrict.trim() &&
      addressStreet.trim() &&
      addressNumber.trim()
        ? {
            district: addressDistrict.trim(),
            street: addressStreet.trim(),
            addressNumber: addressNumber.trim(),
          }
        : null;

    startTransition(async () => {
      const result = await updateProperty(property.id, property.type, input);
      if (result.success) {
        void runAutoGisGenerationAfterSave({ coords: gisCoords, address: gisAddress });
      } else {
        setFeedback({ type: 'error', message: result.message });
      }
    });
  }

  // Clear feedback when switching tabs
  useEffect(() => {
    setFeedback(null);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (successFeedbackTimeoutRef.current) {
        clearTimeout(successFeedbackTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={`flex-1 min-h-0 flex flex-col ${
        activeTab === 'transcript' ? 'overflow-visible' : 'overflow-hidden'
      }`}
    >
      {/* Page header */}
      <div className="shrink-0 px-6 pt-2 pb-4 flex items-center gap-4">
        <button
          type="button"
          onClick={() => router.push(BACK_URL)}
          className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors text-text-secondary"
          title="返回物件列表"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${
              property.type === 'sale'
                ? 'bg-green-500/10 text-green-500'
                : 'bg-blue-500/10 text-blue-500'
            }`}
          >
            {property.type === 'sale' ? <Building2 size={18} /> : <Key size={18} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">編輯物件</h2>
            <p className="text-xs text-text-muted font-mono">{property.id}</p>
          </div>
        </div>
      </div>

      {/* Card with tab bar + body */}
      <div
        className={`mx-6 mb-6 flex flex-col bg-bg-secondary border border-border-default rounded-lg ${
          activeTab === 'transcript'
            ? 'flex-none overflow-visible'
            : 'flex-1 min-h-0 overflow-hidden'
        }`}
      >
        {/* Tab bar */}
        <div className="shrink-0 border-b border-border-default px-4 flex gap-1 flex-wrap">
          {ALL_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.set('tab', tab);
                router.replace(`?${params.toString()}`);
              }}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div
          className={`flex-1 px-6 py-5 ${
            activeTab === 'transcript'
              ? 'overflow-visible'
              : 'overflow-y-auto space-y-5'
          }`}
        >
          {/* In 'edit' tab, we render feedback in the bottom footer for better visibility. */}
          {feedback &&
            activeTab !== 'edit' &&
            activeTab !== 'introduction' &&
            activeTab !== 'map_location' && (
            <div
              className={`p-3 rounded-lg text-sm shrink-0 relative group ${
                feedback.type === 'success'
                  ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                  : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}
            >
              <div className="pr-6">{feedback.message}</div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
                title="關閉提示"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {activeTab === 'introduction' && (
            <PropertyIntroductionTab
              propertyId={property.id}
              listingType={property.type}
              title={title}
              propertyType={propertyType}
              area={areaNum}
              bedrooms={bedrooms}
              bathrooms={bathrooms}
              livingRooms={livingRooms}
              parkingSpaces={parkingSpaces}
              price={price}
              monthlyRent={monthlyRent}
              addressCity={addressCity}
              addressDistrict={addressDistrict}
              addressStreet={addressStreet}
              addressNumber={addressNumber}
              addressFloor={addressFloor}
              addressUnit={addressUnit}
              description={description}
              onDescriptionChange={setDescription}
            />
          )}

          {activeTab === 'transcript' && (
            <div className="space-y-6">
              <TranscriptTabContent property={property} />
            </div>
          )}

          {activeTab === 'building_land_area_detail' && (
            <BuildingLandAreaDetailTab property={property} propertyId={property.id} propertyType={property.type} />
          )}

          {activeTab === 'zoning_usage' && (
            <ZoningUsageTab property={property} />
          )}

          {activeTab === 'geographic_info' && (
            <PropertyGeographicInfoTab property={property} />
          )}

          {activeTab !== 'transcript' &&
            (activeTab === 'photos' ||
              activeTab === 'title' ||
              activeTab === 'floor_plan' ||
              activeTab === 'building_measurement_survey' ||
              activeTab === 'transaction_comparables') && (
            <PropertyMediaSection
              propertyId={property.id}
              propertyType={property.type}
              ownerId={property.ownerId}
              mode={activeTab}
            />
          )}

          {activeTab === 'investigation' && (
            <PropertyInvestigationReportSection
              propertyId={property.id}
              property={property}
              initialReport={initialInvestigationReport}
              initialPhotos={initialInvestigationPhotos}
              initialDocuments={initialInvestigationDocuments}
            />
          )}

          {activeTab === 'contract' && (
            <div className="space-y-5">
              <ContractDraftPreviewSection property={property} />
              <PropertyMediaSection
                propertyId={property.id}
                propertyType={property.type}
                ownerId={property.ownerId}
                mode="contract"
              />
            </div>
          )}

          {activeTab === 'advertisement_creators' && (
            <PropertyBlogGenerator
              propertyId={property.id}
              propertyType={property.type}
              ownerId={property.ownerId}
              property={property}
            />
          )}

          {activeTab === 'map_location' && (
            <PropertyMapLocationTab
              composedAddress={composedAddress}
              latInput={latInput}
              lngInput={lngInput}
              onLatInputChange={(v) => {
                setLatInput(v);
                setGeocodeMsg(null);
              }}
              onLngInputChange={(v) => {
                setLngInput(v);
                setGeocodeMsg(null);
              }}
              isGeocoding={isGeocoding}
              geocodeMsg={geocodeMsg}
              onGeocodeFromAddress={handleGeocode}
            />
          )}

          {activeTab === 'edit' && (
            <>
              {/* 狀態、名稱、售價／租金、類型、格局、總面積／總坪數（面積在最右）— 同一列 */}
              <div className="overflow-x-auto pb-1">
                <div
                  className={
                    property.type === 'sale'
                      ? 'grid min-w-[1180px] grid-cols-[180px_minmax(200px,1.6fr)_minmax(132px,180px)_minmax(140px,220px)_minmax(88px,104px)_minmax(88px,104px)_minmax(88px,104px)_minmax(88px,104px)_minmax(110px,130px)_minmax(96px,118px)] gap-3 items-end'
                      : 'grid min-w-[1280px] grid-cols-[180px_minmax(200px,1.4fr)_minmax(120px,150px)_minmax(88px,104px)_minmax(140px,220px)_minmax(88px,104px)_minmax(88px,104px)_minmax(88px,104px)_minmax(88px,104px)_minmax(110px,130px)_minmax(96px,118px)] gap-3 items-end'
                  }
                >
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      狀態
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                    >
                      {PROPERTY_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabelsMap[s] || s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      物件名稱
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                    />
                  </div>

                  <div className="min-w-0">
                    {property.type === 'sale' ? (
                      <>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          售價 (NT$)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={price}
                          onChange={(e) => setPrice(Number(e.target.value))}
                          className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                        />
                      </>
                    ) : (
                      <>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">
                          月租金 (NT$)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={monthlyRent}
                          onChange={(e) => setMonthlyRent(Number(e.target.value))}
                          className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                        />
                      </>
                    )}
                  </div>

                  {property.type === 'rental' && (
                    <div className="min-w-0">
                      <label className="block text-sm font-medium text-text-secondary mb-1.5">
                        租期 (月)
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={leaseTerm}
                        onChange={(e) => setLeaseTerm(Number(e.target.value))}
                        className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                  )}

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      物件類型
                    </label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="">請選擇物件類型</option>
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <span className="block text-xs text-text-muted mb-1">房</span>
                    <NumberComboBox value={bedrooms} onChange={setBedrooms} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs text-text-muted mb-1">廳</span>
                    <NumberComboBox value={livingRooms} onChange={setLivingRooms} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs text-text-muted mb-1">衛</span>
                    <NumberComboBox value={bathrooms} onChange={setBathrooms} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs text-text-muted mb-1">車位</span>
                    <NumberComboBox value={parkingSpaces} onChange={setParkingSpaces} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      總面積 (㎡)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={areaInput}
                      onChange={(e) => setAreaInput(e.target.value)}
                      placeholder="0"
                      className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1.5">
                      總坪數
                    </label>
                    <div
                      className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-tertiary text-text-primary text-sm"
                      aria-live="polite"
                    >
                      {(areaNum * 0.3025).toFixed(2)} 坪
                    </div>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <label className="text-sm font-medium text-text-secondary shrink-0">
                    地址
                  </label>
                  {composedAddress ? (
                    <p className="text-xs text-text-muted text-left flex-1 min-w-0">
                      預覽：{composedAddress}
                    </p>
                  ) : null}
                </div>
                <div className="overflow-x-auto pb-1">
                  <div className="grid grid-cols-[160px_160px_minmax(260px,1fr)_130px_120px_120px_minmax(200px,280px)] gap-4 min-w-[1180px] items-start">
                    <div>
                      <span className="block text-xs text-text-muted mb-1">縣市</span>
                      <select
                        value={addressCity}
                        onChange={(e) => {
                          setAddressCity(e.target.value);
                          setAddressDistrict('');
                        }}
                        className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                      >
                        <option value="">請選擇縣市</option>
                        {TAIWAN_CITIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted mb-1">區</span>
                      <select
                        value={addressDistrict}
                        onChange={(e) => setAddressDistrict(e.target.value)}
                        className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent"
                        disabled={!addressCity}
                      >
                        <option value="">請選擇區</option>
                        {districtOptions.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted mb-1">
                        路 / 段 / 街（如：敦化南路一段、安和路）
                      </span>
                      <input
                        type="text"
                        value={addressStreet}
                        onChange={(e) => setAddressStreet(e.target.value)}
                        placeholder="敦化南路一段、安和路..."
                        className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted mb-1">門牌號碼</span>
                      <input
                        type="text"
                        value={addressNumber}
                        onChange={(e) => setAddressNumber(e.target.value)}
                        placeholder="295號"
                        className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted mb-1">樓層</span>
                      <input
                        type="text"
                        value={addressFloor}
                        onChange={(e) => setAddressFloor(e.target.value)}
                        placeholder="3F"
                        className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted"
                      />
                    </div>
                    <div>
                      <span className="block text-xs text-text-muted mb-1">單位號碼</span>
                      <input
                        type="text"
                        value={addressUnit}
                        onChange={(e) => setAddressUnit(e.target.value)}
                        placeholder="之2"
                        className="w-full border border-border-default rounded-md px-3 py-2 bg-bg-primary text-text-primary text-sm focus:outline-none focus:border-accent placeholder-text-muted"
                      />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="block text-xs text-text-muted mb-1 opacity-0 select-none pointer-events-none"
                        aria-hidden="true"
                      >
                        —
                      </span>
                      <div className="text-xs text-text-muted py-2 leading-snug">
                        創建人：{property.creatorName} &middot; 建立日期：
                        {new Date(property.createdAt).toLocaleDateString('zh-TW')}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer — edit + 物件介紹 + 地圖定位（皆寫入同一筆物件資料） */}
        {(activeTab === 'edit' || activeTab === 'introduction' || activeTab === 'map_location') && (
          <div className="shrink-0 border-t border-border-default px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-center">
            {feedback && (
              <div
                className={`p-3 rounded-lg text-sm relative group flex-1 ${
                  feedback.type === 'success'
                    ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
                }`}
              >
                <div className="pr-6">{feedback.message}</div>
                <button
                  type="button"
                  onClick={() => setFeedback(null)}
                  className="absolute top-3 right-3 p-1 rounded-md hover:bg-black/5 transition-colors opacity-60 hover:opacity-100"
                  title="關閉提示"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex justify-end gap-3 sm:ml-auto w-full sm:w-auto">
              <button
                type="button"
                onClick={() => router.push(BACK_URL)}
                disabled={isPending || isAutoGeneratingGis}
                className="px-4 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors text-sm disabled:opacity-50"
              >
                返回列表
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || isAutoGeneratingGis}
                className="px-5 py-2 bg-accent text-white hover:bg-accent-hover rounded-md transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {(isPending || isAutoGeneratingGis) && <Loader2 size={14} className="animate-spin" />}
                {isPending ? '儲存中...' : isAutoGeneratingGis ? '產圖中...' : '儲存變更'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
