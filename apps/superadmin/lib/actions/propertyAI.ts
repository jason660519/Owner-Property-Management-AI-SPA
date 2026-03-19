// filepath: apps/superadmin/lib/actions/propertyAI.ts
// AI-assisted property content generation (server actions)
'use server';

import { decryptApiKey } from '@/lib/crypto';
import { resolveUserId } from '@/lib/resolve-ai-settings-user';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import type { ActionResult } from '@/lib/types/properties';

export type DescriptionGenerationTone = 'professional' | 'warm' | 'investment';
export type DescriptionGenerationLength = 'short' | 'medium' | 'long';
export type DescriptionGenerationGoal = 'listing' | 'ad' | 'summary';

export interface GenerateDescriptionInput {
  listingType: 'sale' | 'rental';
  title?: string;
  propertyType?: string;
  area?: number;           // m²
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

// Reserved name in saved_prompts for property description template.
// Placeholder {物件資料} will be replaced with computed facts.
// If the template has no placeholder, facts are appended at the end.
const PROMPT_NAME = '物件描述文案';

const DEFAULT_PROMPT = `你是一位專業的台灣房地產文案撰寫師。請根據以下物件資料與生成設定，撰寫一段吸引人的繁體中文物件介紹文案。

{物件資料}

請撰寫能吸引買方或租客興趣的介紹文，突出物件優點與地段價值，使用流暢的繁體中文。不要使用誇大不實用語，不要虛構交通、學區、捷運距離、裝潢、景觀或屋況，也不要在文末加上聯絡資訊。只輸出介紹文本身，不要加標題或前言。`;

/** Fetch the custom prompt template from saved_prompts (by reserved name). */
async function getCustomPromptTemplate(): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from('saved_prompts')
      .select('content')
      .eq('name', PROMPT_NAME)
      .maybeSingle();
    return data?.content ?? null;
  } catch {
    return null;
  }
}

/** Build the facts string from input. */
function buildFacts(input: GenerateDescriptionInput): string {
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

  const lines = [
    `- 交易類型：${listingType === 'sale' ? '出售' : '出租'}`,
    title ? `- 物件標題：${title}` : null,
    propertyType ? `- 物件類型：${propertyType}` : null,
    location ? `- 地點：${location}` : null,
    layout ? `- 格局：${layout}` : null,
    areaPin ? `- 面積：${areaPin}` : null,
    priceLabel ? `- ${priceLabel}` : null,
    parkingSpaces ? `- 車位：${parkingSpaces} 個` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

function buildGenerationSettings(input: GenerateDescriptionInput): string {
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

function getMaxTokens(length: DescriptionGenerationLength | undefined): number {
  switch (length) {
    case 'short':
      return 300;
    case 'long':
      return 800;
    default:
      return 500;
  }
}

async function getAnthropicApiKey(): Promise<string | null> {
  try {
    const sessionClient = await createClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    const adminClient = createAdminClient();
    const fallbackRequestedUserId =
      user?.id ?? process.env.SUPERADMIN_DEFAULT_USER_ID ?? '00000000-0000-0000-0000-000000000000';
    const resolvedUserId = await resolveUserId(adminClient, fallbackRequestedUserId);

    if (resolvedUserId) {
      const { data: keyRow } = await adminClient
        .from('ai_api_keys')
        .select('api_key_encrypted, iv')
        .eq('user_id', resolvedUserId)
        .eq('provider', 'anthropic')
        .eq('is_active', true)
        .single();

      if (keyRow) {
        try {
          return await decryptApiKey(keyRow.api_key_encrypted, keyRow.iv);
        } catch (decryptError) {
          console.error('[propertyAI] Failed to decrypt Anthropic API key from ai_api_keys:', decryptError);
        }
      }
    }
  } catch (keyLookupError) {
    console.error('[propertyAI] Failed to resolve Anthropic API key from AI settings:', keyLookupError);
  }

  return process.env.ANTHROPIC_API_KEY?.trim() || null;
}

export async function generatePropertyDescriptionAI(
  input: GenerateDescriptionInput,
): Promise<ActionResult & { description?: string }> {
  const apiKey = await getAnthropicApiKey();
  if (!apiKey) {
    return { success: false, message: '尚未設定 Anthropic API 金鑰，請至「AI 服務 / API KEY」完成設定' };
  }

  const [customTemplate] = await Promise.all([getCustomPromptTemplate()]);
  const template = customTemplate ?? DEFAULT_PROMPT;
  const facts = buildFacts(input);
  const generationSettings = buildGenerationSettings(input);
  const currentDescriptionSection = input.currentDescription?.trim()
    ? `\n\n現有文案（僅供參考，可重寫與整理，但不要保留錯誤資訊）：\n${input.currentDescription.trim()}`
    : '';

  // Replace placeholder if present, otherwise append facts after first paragraph
  const prompt = template.includes('{物件資料}')
    ? template.replace('{物件資料}', facts)
    : `${template}\n\n物件資料：\n${facts}`;

  const finalPrompt = `${prompt}\n\n生成設定：\n${generationSettings}${currentDescriptionSection}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: getMaxTokens(input.generationLength),
        messages: [{ role: 'user', content: finalPrompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[propertyAI] Anthropic API error:', response.status, errText);
      if (response.status === 401) {
        return { success: false, message: 'Anthropic API 金鑰無效或已過期，請至「AI 服務 / API KEY」更新後再試' };
      }
      return { success: false, message: `AI 服務錯誤（${response.status}），請稍後再試` };
    }

    const json = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const description = json.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';

    if (!description) {
      return { success: false, message: 'AI 回傳內容為空，請再試一次' };
    }

    return { success: true, message: 'AI 生成成功', description };
  } catch (err) {
    console.error('[propertyAI] fetch error:', err);
    return { success: false, message: `網路錯誤：${err instanceof Error ? err.message : '請稍後再試'}` };
  }
}
