// filepath: apps/superadmin/lib/utils/cadastral-map-fetcher.ts
// Fetch cadastral map & building overlay images from Taipei GIS systems
// via direct ArcGIS Print Service API — no browser automation needed.
//
// Supports two systems (same backend, different layer configs):
//   1. 地理資訊e點通 (addr.gov.taipei)     — EPSG:3857, scheduled to shut down 2026/5/31
//   2. 歷史圖資展示系統 (historygis.udd.gov.taipei) — EPSG:3826 (TWD97, less projection distortion)

// ── Types ─────────────────────────────────────────────────────────────────

export interface CadastralMapParams {
  /** 行政區 e.g. "大安區" */
  district: string;
  /** 道路含段 e.g. "忠孝東路四段" */
  road: string;
  /** 巷 */
  lane?: string;
  /** 弄 */
  alley?: string;
  /** 號 */
  number: string;
  /** 之號 */
  subNumber?: string;
}

export interface CadastralMapFromCoordsParams {
  /** WGS84 latitude */
  latitude: number;
  /** WGS84 longitude */
  longitude: number;
}

export type MapLayerPreset = 'cadastral' | 'building' | 'both';

/**
 * GIS data source.
 * - epoint: 地理資訊e點通 (EPSG:3857) — shutting down 2026/5/31
 * - historygis: 歷史圖資展示系統 (EPSG:3826, TWD97) — recommended, less projection distortion
 */
export type GisSource = 'epoint' | 'historygis';

export const GIS_SOURCE_LABELS: Record<GisSource, string> = {
  epoint: '地理資訊e點通',
  historygis: '歷史圖資展示系統',
};

/** Portal URLs for UI links (must not live in a `'use server'` actions file). */
export const GIS_SOURCE_URLS: Record<GisSource, string> = {
  epoint: 'https://addr.gov.taipei',
  historygis: 'https://historygis.udd.gov.taipei',
};

export interface ExportMapOptions {
  layers: MapLayerPreset;
  /** GIS source system, default 'historygis' */
  source?: GisSource;
  /** Print scale, default 1000 */
  scale?: number;
  /** Paper size, default A4 */
  paper?: 'A4' | 'A3';
  /** Orientation, default portrait */
  orientation?: 'portrait' | 'landscape';
  /** Title text on the map */
  title?: string;
  /** Label shown next to the center marker (e.g. address) */
  markerLabel?: string;
}

export interface ExportMapResult {
  /** The downloaded image as a Buffer */
  imageBuffer: Buffer;
  /** MIME type */
  mimeType: string;
  /** Descriptive label e.g. "地籍圖" */
  label: string;
}

// ── Constants ─────────────────────────────────────────────────────────────

const ADDR_QUERY_URL = 'https://pwdgis.taipei/tpgos/QueryData_tpgos.aspx';

const PRINT_SERVICE_URL =
  'https://www.historygis.udd.gov.taipei/arcgis/rest/services/ExportWebMap5/GPServer/Export%20Web%20Map';

// ── Layer definitions per source ──────────────────────────────────────────

const ARCGIS_REST = 'https://www.historygis.udd.gov.taipei/arcgis/rest/services';

// Shared base layers (same URLs for both systems)
const LAYER_BASE = {
  basemap: {
    type: 'wmts' as const,
    customLayerParameters: null,
    customParameters: null,
    format: 'image/png',
    style: 'default',
    tileMatrixSet: 'default028mm',
    layer: 'Urban_EMap',
    url: `${ARCGIS_REST}/Urban/EMap/MapServer/WMTS/1.0.0/WMTSCapabilities.xml`,
    id: 'Urban_EMap',
    title: '臺北市電子地圖',
    opacity: 0.9,
    minScale: 0,
    maxScale: 0,
  },
  building: {
    type: 'wmts' as const,
    customLayerParameters: null,
    customParameters: null,
    format: 'image/png',
    style: 'default',
    tileMatrixSet: 'default028mm',
    layer: 'Urban_BldgLicense',
    url: `${ARCGIS_REST}/Urban/BldgLicense/MapServer/WMTS/1.0.0/WMTSCapabilities.xml`,
    id: 'Urban_BldgLicense',
    title: '建物套繪圖',
    opacity: 0.5,
    minScale: 0,
    maxScale: 0,
  },
  cadastralTiled: {
    type: 'wmts' as const,
    customLayerParameters: null,
    customParameters: null,
    format: 'image/png',
    style: 'default',
    tileMatrixSet: 'default028mm',
    layer: 'Urban_Land',
    url: `${ARCGIS_REST}/Urban/Land/MapServer/WMTS/1.0.0/WMTSCapabilities.xml`,
    id: 'land',
    title: '地籍圖',
    opacity: 1,
    minScale: 0,
    maxScale: 0,
  },
  // Dynamic cadastral layer from survey.gov.taipei (historygis only, more up-to-date)
  cadastralDynamic: {
    id: 'Land_Dynamic',
    title: '地籍圖(動態服務)',
    opacity: 0.75,
    minScale: 0,
    maxScale: 0,
    url: 'https://survey.gov.taipei/arcgis/rest/services/04088/LAND_ImpByCatalog/MapServer',
    visibleLayers: [0, 1],
  },
};

// Layout template naming: A_UDD_{paper}{orientation}
const LAYOUT_MAP: Record<string, string> = {
  A4_portrait: 'A_UDD_A4Portrait',
  A4_landscape: 'A_UDD_A4Landscape',
  A3_portrait: 'A_UDD_A3Portrait',
  A3_landscape: 'A_UDD_A3Landscape',
};

// ── Coordinate Utils ──────────────────────────────────────────────────────

/** WGS84 lat/lng → Web Mercator (EPSG:3857) */
function wgs84ToWebMercator(lat: number, lng: number): { x: number; y: number } {
  const x = (lng * 20037508.34) / 180;
  const radLat = (lat * Math.PI) / 180;
  const y = (Math.log(Math.tan(Math.PI / 4 + radLat / 2)) * 20037508.34) / Math.PI;
  return { x, y };
}

/** TWD97 TM2 (EPSG:3826) → WGS84 lat/lng */
function twd97ToWgs84(
  eastingRaw: number,
  northingRaw: number,
): { lat: number; lng: number } {
  const { pow, PI, sin, cos, tan, sqrt } = Math;
  const a = 6378137.0;
  const b = 6356752.314245;
  const lng0 = (121 * PI) / 180;
  const k0 = 0.9999;
  const e = sqrt(1 - pow(b, 2) / pow(a, 2));

  const x = eastingRaw - 250000;
  const y = northingRaw - 0;

  const M = y / k0;
  const mu = M / (a * (1 - pow(e, 2) / 4 - (3 * pow(e, 4)) / 64 - (5 * pow(e, 6)) / 256));
  const e1 = (1 - sqrt(1 - pow(e, 2))) / (1 + sqrt(1 - pow(e, 2)));

  const J1 = (3 * e1) / 2 - (27 * pow(e1, 3)) / 32;
  const J2 = (21 * pow(e1, 2)) / 16 - (55 * pow(e1, 4)) / 32;
  const J3 = (151 * pow(e1, 3)) / 96;
  const J4 = (1097 * pow(e1, 4)) / 512;

  const fp = mu + J1 * sin(2 * mu) + J2 * sin(4 * mu) + J3 * sin(6 * mu) + J4 * sin(8 * mu);

  const ep2 = pow((e * a) / b, 2);
  const C1 = pow(ep2 * cos(fp), 2);
  const T1 = pow(tan(fp), 2);
  const R1 = (a * (1 - pow(e, 2))) / pow(1 - pow(e, 2) * pow(sin(fp), 2), 1.5);
  const N1 = a / sqrt(1 - pow(e, 2) * pow(sin(fp), 2));
  const D = x / (N1 * k0);

  const Q1 = pow(D, 2) / 2;
  const Q2 = ((5 + 3 * T1 + 10 * C1 - 4 * pow(C1, 2) - 9 * ep2) * pow(D, 4)) / 24;
  const Q3 =
    ((61 + 90 * T1 + 298 * C1 + 45 * pow(T1, 2) - 3 * pow(C1, 2) - 252 * ep2) * pow(D, 6)) / 720;

  const lat = (fp - ((N1 * tan(fp)) / R1) * (Q1 - Q2 + Q3)) * (180 / PI);

  const Q4 = D;
  const Q5 = ((1 + 2 * T1 + C1) * pow(D, 3)) / 6;
  const Q6 =
    ((5 - 2 * C1 + 28 * T1 - 3 * pow(C1, 2) + 8 * ep2 + 24 * pow(T1, 2)) * pow(D, 5)) / 120;

  const lng = (lng0 + (Q4 - Q5 + Q6) / cos(fp)) * (180 / PI);

  return { lat, lng };
}

/** WGS84 lat/lng → TWD97 TM2 (EPSG:3826) */
function wgs84ToTwd97(lat: number, lng: number): { x: number; y: number } {
  const { pow, PI, sin, cos, tan, sqrt } = Math;
  const a = 6378137.0;
  const b = 6356752.314245;
  const lng0 = (121 * PI) / 180;
  const k0 = 0.9999;
  const e = sqrt(1 - pow(b, 2) / pow(a, 2));
  const e2 = pow(e, 2) / (1 - pow(e, 2));

  const latRad = (lat * PI) / 180;
  const lngRad = (lng * PI) / 180;

  const N = a / sqrt(1 - pow(e, 2) * pow(sin(latRad), 2));
  const T = pow(tan(latRad), 2);
  const C = e2 * pow(cos(latRad), 2);
  const A = (lngRad - lng0) * cos(latRad);

  const M =
    a *
    ((1 - pow(e, 2) / 4 - (3 * pow(e, 4)) / 64 - (5 * pow(e, 6)) / 256) * latRad -
      ((3 * pow(e, 2)) / 8 + (3 * pow(e, 4)) / 32 + (45 * pow(e, 6)) / 1024) * sin(2 * latRad) +
      ((15 * pow(e, 4)) / 256 + (45 * pow(e, 6)) / 1024) * sin(4 * latRad) -
      ((35 * pow(e, 6)) / 3072) * sin(6 * latRad));

  const x =
    k0 *
      N *
      (A +
        ((1 - T + C) * pow(A, 3)) / 6 +
        ((5 - 18 * T + pow(T, 2) + 72 * C - 58 * e2) * pow(A, 5)) / 120) +
    250000;

  const y =
    k0 *
    (M +
      N *
        tan(latRad) *
        (pow(A, 2) / 2 +
          ((5 - T + 9 * C + 4 * pow(C, 2)) * pow(A, 4)) / 24 +
          ((61 - 58 * T + pow(T, 2) + 600 * C - 330 * e2) * pow(A, 6)) / 720));

  return { x, y };
}

/**
 * Calculate extent for a given center and scale.
 * Paper sizes in cm → convert to map units at given scale.
 */
function calcExtent(
  centerX: number,
  centerY: number,
  scale: number,
  paper: 'A4' | 'A3',
  orientation: 'portrait' | 'landscape',
): { xmin: number; ymin: number; xmax: number; ymax: number } {
  // Printable area in cm (approximate, accounting for margins)
  const dims: Record<string, { w: number; h: number }> = {
    A4_portrait: { w: 18, h: 26 },
    A4_landscape: { w: 26, h: 18 },
    A3_portrait: { w: 26, h: 38 },
    A3_landscape: { w: 38, h: 26 },
  };
  const d = dims[`${paper}_${orientation}`];
  // cm → meters → map units (Web Mercator meters)
  const halfW = ((d.w / 100) * scale) / 2;
  const halfH = ((d.h / 100) * scale) / 2;
  return {
    xmin: centerX - halfW,
    ymin: centerY - halfH,
    xmax: centerX + halfW,
    ymax: centerY + halfH,
  };
}

// ── Address Query ─────────────────────────────────────────────────────────

interface AddrQueryResult {
  /** Web Mercator X */
  x: number;
  /** Web Mercator Y */
  y: number;
  /** Matched address label */
  label: string;
}

/**
 * Query the Taipei GIS address API to get coordinates for a door plate number.
 * Returns Web Mercator (EPSG:3857) coordinates.
 */
export async function queryAddressCoords(
  params: CadastralMapParams,
): Promise<AddrQueryResult> {
  const body = new URLSearchParams({
    qitem: 'qAddr',
    road: params.road,
    lane: params.lane || '',
    alley: params.alley || '',
    numb: params.number,
    numbext: params.subNumber || '',
  });

  const resp = await fetch(ADDR_QUERY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!resp.ok) {
    throw new Error(`Address query failed: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('查無此門牌地址，請確認地址是否正確');
  }

  // Take the first result
  const hit = data[0];
  const twd97X = parseFloat(hit.land_xcoor97 ?? hit.x);
  const twd97Y = parseFloat(hit.land_ycoor97 ?? hit.y);

  if (!Number.isFinite(twd97X) || !Number.isFinite(twd97Y)) {
    throw new Error('查詢結果缺少座標資訊');
  }

  const wgs84 = twd97ToWgs84(twd97X, twd97Y);
  const merc = wgs84ToWebMercator(wgs84.lat, wgs84.lng);

  const label =
    hit.land_name ?? hit.addr ?? `${params.district}${params.road}${params.lane ? params.lane + '巷' : ''}${params.alley ? params.alley + '弄' : ''}${params.number}號`;

  return { x: merc.x, y: merc.y, label };
}

// ── Map Export ─────────────────────────────────────────────────────────────

interface ResolvedOpts {
  layers: MapLayerPreset;
  source: GisSource;
  scale: number;
  paper: 'A4' | 'A3';
  orientation: 'portrait' | 'landscape';
  title: string;
}

/**
 * ArcGIS `operationalLayers` entries (basemap + cadastral/building), excluding the marker overlay.
 * Exported for unit tests.
 */
export function buildOperationalLayers(preset: MapLayerPreset, source: GisSource) {
  const layers: Record<string, unknown>[] = [LAYER_BASE.basemap];

  if (preset === 'cadastral' || preset === 'both') {
    if (source === 'historygis') {
      // Use dynamic cadastral layer for better accuracy, plus tiled as background
      layers.push(LAYER_BASE.cadastralTiled);
      layers.push(LAYER_BASE.cadastralDynamic);
    } else {
      layers.push(LAYER_BASE.cadastralTiled);
    }
  }
  if (preset === 'building' || preset === 'both') {
    layers.push(LAYER_BASE.building);
  }

  return layers;
}

/** Build a graphics layer with a red marker + address label at the center point */
function buildMarkerLayer(
  centerX: number,
  centerY: number,
  wkid: number,
  label?: string,
) {
  const geo = { x: centerX, y: centerY, spatialReference: { wkid } };

  // Only use esriSMS circle symbols — other types (cross, text) are unreliable
  // in featureCollection export on this ArcGIS Print Service.
  const pointFeatures: Record<string, unknown>[] = [
    // Outer glow ring
    {
      geometry: geo,
      symbol: {
        type: 'esriSMS',
        style: 'esriSMSCircle',
        color: [220, 38, 38, 50],
        size: 36,
        outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [220, 38, 38, 100], width: 1 },
      },
    },
    // Red circle marker with thick white outline
    {
      geometry: geo,
      symbol: {
        type: 'esriSMS',
        style: 'esriSMSCircle',
        color: [220, 38, 38, 240],
        size: 16,
        outline: { type: 'esriSLS', style: 'esriSLSSolid', color: [255, 255, 255, 255], width: 3 },
      },
    },
  ];

  // label parameter is accepted but not rendered as text overlay
  // (ArcGIS featureCollection does not reliably support esriTS)
  void label;

  return {
    featureCollection: {
      layers: [
        {
          layerDefinition: { name: 'pointLayer', geometryType: 'esriGeometryPoint' },
          featureSet: { geometryType: 'esriGeometryPoint', features: pointFeatures },
        },
      ],
    },
    id: 'propertyMarker',
    title: '定位標記',
    opacity: 1,
    minScale: 0,
    maxScale: 0,
  };
}

function buildWebMapJson(
  centerX: number,
  centerY: number,
  wkid: number,
  opts: ResolvedOpts,
  markerLabel?: string,
) {
  const extent = calcExtent(centerX, centerY, opts.scale, opts.paper, opts.orientation);

  const operationalLayers: Record<string, unknown>[] = [
    ...buildOperationalLayers(opts.layers, opts.source),
    buildMarkerLayer(centerX, centerY, wkid, markerLabel),
  ];

  return {
    operationalLayers,
    mapOptions: {
      extent: {
        spatialReference: { wkid },
        ...extent,
      },
      spatialReference: { wkid },
      showAttribution: true,
      scale: opts.scale,
    },
    exportOptions: { dpi: 300 },
    layoutOptions: {
      titleText: opts.title || '',
      authorText: '',
      copyrightText: `1:${opts.scale.toLocaleString()}`,
      scaleBarOptions: {
        metricUnit: 'esriMeters',
        metricLabel: 'm',
        nonMetricUnit: 'esriFeet',
        nonMetricLabel: 'ft',
      },
      legendOptions: { operationalLayers: [] },
    },
  };
}

/**
 * Submit a print job to ArcGIS Print Service and poll until complete.
 * Returns the result image URL.
 */
async function submitPrintJob(webMapJson: Record<string, unknown>, layout: string): Promise<string> {
  const params = new URLSearchParams({
    Web_Map_as_JSON: JSON.stringify(webMapJson),
    Format: 'JPG',
    Layout_Template: layout,
    f: 'json',
  });

  // Submit job
  const submitResp = await fetch(`${PRINT_SERVICE_URL}/submitJob?${params.toString()}`);
  if (!submitResp.ok) {
    throw new Error(`Print job submit failed: ${submitResp.status}`);
  }
  const submitData = await submitResp.json();
  const jobId = submitData.jobId;

  if (!jobId) {
    throw new Error(`Print job failed to start: ${JSON.stringify(submitData)}`);
  }

  // Poll for completion (first check immediate, then 29 × 2s ≈ 58s)
  for (let attempt = 0; attempt < 30; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const statusResp = await fetch(`${PRINT_SERVICE_URL}/jobs/${jobId}?f=json`);
    const statusData = await statusResp.json();

    if (statusData.jobStatus === 'esriJobSucceeded') {
      // Get result URL
      const resultResp = await fetch(
        `${PRINT_SERVICE_URL}/jobs/${jobId}/results/Output_File?returnType=data&f=json`,
      );
      const resultData = await resultResp.json();

      if (resultData.value?.url) {
        return resultData.value.url;
      }
      throw new Error('Print job completed but no output URL');
    }

    if (statusData.jobStatus === 'esriJobFailed') {
      throw new Error(`Print job failed: ${JSON.stringify(statusData.messages ?? [])}`);
    }
  }

  throw new Error('Print job timed out after 60 seconds');
}

// ── Public API ─────────────────────────────────────────────────────────────

const LAYER_LABELS: Record<MapLayerPreset, string> = {
  cadastral: '地籍圖',
  building: '建物套繪圖',
  both: '地籍圖+建物套繪圖',
};

/**
 * Export a cadastral/building map image for a given address.
 * 1. Geocodes the address via Taipei GIS API
 * 2. Calls ArcGIS Print Service to render the map
 * 3. Downloads the resulting image
 */
export async function exportMapByAddress(
  address: CadastralMapParams,
  options?: ExportMapOptions,
): Promise<ExportMapResult> {
  const coords = await queryAddressCoords(address);
  return exportMapByMercatorCoords(coords.x, coords.y, options);
}

/**
 * Export a map image given WGS84 coordinates (latitude, longitude).
 */
export async function exportMapByWgs84(
  params: CadastralMapFromCoordsParams,
  options?: ExportMapOptions,
): Promise<ExportMapResult> {
  const source = options?.source ?? 'historygis';

  if (source === 'historygis') {
    // Use TWD97 (EPSG:3826) — less projection distortion for Taiwan
    const twd = wgs84ToTwd97(params.latitude, params.longitude);
    return exportMapInternal(twd.x, twd.y, 3826, options);
  }

  // epoint: use Web Mercator (EPSG:3857)
  const merc = wgs84ToWebMercator(params.latitude, params.longitude);
  return exportMapInternal(merc.x, merc.y, 3857, options);
}

async function exportMapInternal(
  x: number,
  y: number,
  wkid: number,
  options?: ExportMapOptions,
): Promise<ExportMapResult> {
  const opts: ResolvedOpts = {
    layers: options?.layers ?? 'both',
    source: options?.source ?? 'historygis',
    scale: options?.scale ?? 1000,
    paper: options?.paper ?? 'A4',
    orientation: options?.orientation ?? 'portrait',
    title: options?.title ?? '',
  };

  const layoutKey = `${opts.paper}_${opts.orientation}`;
  const layout = LAYOUT_MAP[layoutKey];
  if (!layout) {
    throw new Error(`Invalid paper/orientation: ${layoutKey}`);
  }

  const webMapJson = buildWebMapJson(x, y, wkid, opts, options?.markerLabel);
  const imageUrl = await submitPrintJob(webMapJson, layout);

  // Download the image
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) {
    throw new Error(`Image download failed: ${imgResp.status}`);
  }

  const arrayBuf = await imgResp.arrayBuffer();
  const imageBuffer = Buffer.from(arrayBuf);

  return {
    imageBuffer,
    mimeType: 'image/jpeg',
    label: LAYER_LABELS[opts.layers],
  };
}

/** For address-based queries, use Web Mercator regardless of source (address API returns TWD97 → convert) */
async function exportMapByMercatorCoords(
  x: number,
  y: number,
  options?: ExportMapOptions,
): Promise<ExportMapResult> {
  const source = options?.source ?? 'historygis';
  // Address API already gives us Web Mercator coords; for historygis, convert back to TWD97
  if (source === 'historygis') {
    // Web Mercator → WGS84 → TWD97
    const lng = (x * 180) / 20037508.34;
    const lat = (Math.atan(Math.exp((y * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;
    const twd = wgs84ToTwd97(lat, lng);
    return exportMapInternal(twd.x, twd.y, 3826, options);
  }
  return exportMapInternal(x, y, 3857, options);
}

// ── Address Number Parser ─────────────────────────────────────────────────

export interface ParsedAddressNumber {
  lane: string;
  alley: string;
  number: string;
  subNumber: string;
}

/**
 * Parse a combined address number string into lane/alley/number/subNumber.
 * Examples:
 *   "170巷17弄12號"     → { lane: "170", alley: "17", number: "12", subNumber: "" }
 *   "12號"              → { lane: "", alley: "", number: "12", subNumber: "" }
 *   "295號3樓之2"       → { lane: "", alley: "", number: "295", subNumber: "" }
 *   "5巷3號"            → { lane: "5", alley: "", number: "3", subNumber: "" }
 *   "12號之1"           → { lane: "", alley: "", number: "12", subNumber: "1" }
 */
export function parseAddressNumber(raw: string): ParsedAddressNumber {
  const s = (raw ?? '').trim();
  const result: ParsedAddressNumber = { lane: '', alley: '', number: '', subNumber: '' };

  const laneM = s.match(/(\d+)\s*巷/);
  if (laneM) result.lane = laneM[1];

  const alleyM = s.match(/(\d+)\s*弄/);
  if (alleyM) result.alley = alleyM[1];

  // Match 號 (possibly followed by 之N)
  const numM = s.match(/(\d+)\s*號/);
  if (numM) result.number = numM[1];

  // 之號: "之1" or "之2" after 號
  const subM = s.match(/號\s*之\s*(\d+)/);
  if (subM) result.subNumber = subM[1];

  return result;
}
