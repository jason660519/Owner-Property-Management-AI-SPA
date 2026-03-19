export type DescriptionGenerationTone = 'professional' | 'warm' | 'investment';
export type DescriptionGenerationLength = 'short' | 'medium' | 'long';
export type DescriptionGenerationGoal = 'listing' | 'ad' | 'summary';

export interface GenerateDescriptionInput {
  listingType: 'sale' | 'rental';
  title?: string;
  propertyType?: string;
  area?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingRooms?: number;
  parkingSpaces?: number;
  price?: number;
  monthlyRent?: number;
  addressCity?: string;
  addressDistrict?: string;
  addressStreet?: string;
  addressNumber?: string;
  addressFloor?: string;
  addressUnit?: string;
  currentDescription?: string;
  generationTone?: DescriptionGenerationTone;
  generationLength?: DescriptionGenerationLength;
  generationGoal?: DescriptionGenerationGoal;
}

export const PROMPT_NAME = '物件描述文案';
export const DEFAULT_MODEL = 'claude-sonnet-4-6';
export const DEFAULT_PROVIDER = 'anthropic';

export const DEFAULT_PROMPT = `你是一位專業的台灣房地產文案撰寫師。請根據以下物件資料與生成設定，撰寫一段吸引人的繁體中文物件介紹文案。

{物件資料}

請撰寫能吸引買方或租客興趣的介紹文，突出物件優點與地段價值，使用流暢的繁體中文。不要使用誇大不實用語，不要虛構交通、學區、捷運距離、裝潢、景觀或屋況，也不要在文末加上聯絡資訊。只輸出介紹文本身，不要加標題或前言。`;

export function buildFacts(input: GenerateDescriptionInput): string {
  const {
    listingType,
    title,
    propertyType,
    area,
    bedrooms,
    bathrooms,
    livingRooms,
    parkingSpaces,
    price,
    monthlyRent,
    addressCity,
    addressDistrict,
    addressStreet,
    addressNumber,
    addressFloor,
    addressUnit,
  } = input;

  const areaPin = area ? `${(area * 0.3025).toFixed(1)} 坪` : null;
  const layoutParts: string[] = [];
  if (bedrooms) layoutParts.push(`${bedrooms}房`);
  if (livingRooms) layoutParts.push(`${livingRooms}廳`);
  if (bathrooms) layoutParts.push(`${bathrooms}衛`);
  const layout = layoutParts.join('') || null;
  const location = [addressCity, addressDistrict, addressStreet, addressNumber, addressFloor, addressUnit]
    .filter(Boolean)
    .join('');

  let priceLabel: string | null = null;
  if (listingType === 'sale' && price) {
    priceLabel = price >= 10000 ? `售價 ${(price / 10000).toFixed(0)} 萬` : `售價 NT$${price.toLocaleString()}`;
  } else if (listingType === 'rental' && monthlyRent) {
    priceLabel = `月租 NT$${monthlyRent.toLocaleString()}`;
  }

  return [
    `- 交易類型：${listingType === 'sale' ? '出售' : '出租'}`,
    title ? `- 物件標題：${title}` : null,
    propertyType ? `- 物件類型：${propertyType}` : null,
    location ? `- 地點：${location}` : null,
    layout ? `- 格局：${layout}` : null,
    areaPin ? `- 面積：${areaPin}` : null,
    priceLabel ? `- ${priceLabel}` : null,
    parkingSpaces ? `- 車位：${parkingSpaces} 個` : null,
  ].filter(Boolean).join('\n');
}

export function buildGenerationSettings(input: GenerateDescriptionInput): string {
  const toneLabelMap: Record<DescriptionGenerationTone, string> = {
    professional: '專業銷售，重視資訊清楚與可信度',
    warm: '溫暖居家，強調生活感與舒適氛圍',
    investment: '投資導向，重視資產價值、使用彈性與市場吸引力',
  };

  const lengthLabelMap: Record<DescriptionGenerationLength, string> = {
    short: '精簡版，約 80-140 字',
    medium: '標準版，約 150-250 字',
    long: '完整說服版，約 250-400 字',
  };

  const goalLabelMap: Record<DescriptionGenerationGoal, string> = {
    listing: '網站物件介紹，平衡資訊完整與可讀性',
    ad: '廣告文案，句子更有張力，但仍須克制真實',
    summary: '摘要文案，方便列表或短版曝光使用',
  };

  const tone = input.generationTone ?? 'professional';
  const length = input.generationLength ?? 'medium';
  const goal = input.generationGoal ?? 'listing';

  return [
    `- 文案風格：${toneLabelMap[tone]}`,
    `- 輸出長度：${lengthLabelMap[length]}`,
    `- 使用目的：${goalLabelMap[goal]}`,
    '- 若現有文案有可用資訊，僅作參考，可重寫但不可捏造新事實',
  ].join('\n');
}

export function getMaxTokens(length: DescriptionGenerationLength | undefined): number {
  switch (length) {
    case 'short':
      return 300;
    case 'long':
      return 800;
    default:
      return 500;
  }
}

export function truncate(text: string, maxLength = 500): string {
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

export function buildResources(input: GenerateDescriptionInput): Array<{ label: string; value: string }> {
  const resources: Array<{ label: string; value: string | null }> = [
    { label: '標題', value: input.title ?? null },
    { label: '物件類型', value: input.propertyType ?? null },
    {
      label: input.listingType === 'sale' ? '售價' : '月租',
      value:
        input.listingType === 'sale'
          ? input.price ? `NT$${input.price.toLocaleString()}` : null
          : input.monthlyRent ? `NT$${input.monthlyRent.toLocaleString()}` : null,
    },
    {
      label: '格局',
      value: [
        input.bedrooms ? `${input.bedrooms}房` : null,
        input.livingRooms ? `${input.livingRooms}廳` : null,
        input.bathrooms ? `${input.bathrooms}衛` : null,
      ].filter(Boolean).join(''),
    },
    { label: '面積', value: input.area ? `${input.area} 平方公尺 / ${(input.area * 0.3025).toFixed(1)} 坪` : null },
    {
      label: '地址',
      value: [input.addressCity, input.addressDistrict, input.addressStreet, input.addressNumber].filter(Boolean).join(''),
    },
    { label: '樓層', value: [input.addressFloor, input.addressUnit].filter(Boolean).join(' ') },
    { label: '現有文案', value: input.currentDescription?.trim() ? '已納入參考' : null },
  ];

  return resources.filter((item): item is { label: string; value: string } => Boolean(item.value));
}