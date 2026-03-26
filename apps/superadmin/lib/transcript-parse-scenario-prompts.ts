// filepath: apps/superadmin/lib/transcript-parse-scenario-prompts.ts
// 謄本解析四種情境之 Parser Prompt 前綴 + 與 TRANSCRIPT_PARSE_PROMPT 組合。
// 儲存至 saved_prompts 時，名稱須含「(scenarioKey)」以便 TranscriptParseSection 自動套用。

import { TRANSCRIPT_PARSE_PROMPT } from '@/lib/transcript-prompts';
import type { IndependentTitleSaleMode, ParkingTitleRight } from '@/lib/types/properties';
import { clampIndependentBuildingNumberCount } from '@/lib/types/properties';
/** 與 TranscriptTabContent TranscriptKind 一致 */
export type TranscriptParseScenarioKind =
  | 'building'
  | 'land'
  | 'parking_building'
  | 'parking_land';

/** 與 Prompt 名稱 / TranscriptParseSection 比對用（須與 suggestedName 內括號一致） */
export const TRANSCRIPT_PARSE_SCENARIO_KEYS = [
  'single_building_number',
  'multi_building_number',
  'independent_parking',
  'shared_facility_parking',
] as const;

export type TranscriptParseScenarioKey = (typeof TRANSCRIPT_PARSE_SCENARIO_KEYS)[number];

export interface TranscriptParsePreset {
  id: string;
  scenarioKey: TranscriptParseScenarioKey;
  label: string;
  description: string;
  suggestedName: string;
  content: string;
}

const PREFIX_SINGLE_BUILDING_NUMBER = `【解析情境：單一建號主建物】
本件標示為「單一筆建築物（單一建號）」。謄本應僅對應一個主建號；請將建物標示部、所有權部、他項權利部之內容完整對應至同一建號，勿與其他建號混列。
若文件出現多個建號區塊，請依「本件主建物」相關段落為主；無法確認是否屬本件者該欄留空，勿臆測合併。

`;

const PREFIX_MULTI_BUILDING_NUMBER = `【解析情境：多建號（多筆建築物）】
本件為「多筆建築物（多建號）」：同一份或成套謄本中可能含多個建號（含主建物、附屬建物、共有部分等）。
請依建號逐筆區分：每個建號的門牌、面積、層次、主建物明細（mainBuildings）、附屬建物（annexedBuildings）、共有部分（commonAreas）請對應正確建號，不可將甲建號面積寫入乙建號。
若謄本以多頁／多區塊分列不同建號，請完整抽出；ownership、encumbrances 亦請依登記次序與標的相關建號勾稽。

`;

const PREFIX_INDEPENDENT_PARKING = `【解析情境：獨立產權車位】
本文件為「獨立產權車位」之建物／土地謄本（與主建物分開之車位專用謄本）。
請將車位之建號、坐落、面積、共有部分、所有權與他項權利視為獨立標的解析；勿與主建物謄本混用同一筆主建物描述。
若內文同時提及主建物門牌僅作參考，仍以本車位建號與權利範圍為準。

`;

const PREFIX_SHARED_FACILITY_PARKING = `【解析情境：公設產權車位（共有持分／登載於主建物謄本）】
本件停車空間為「公設產權車位」：通常登載於主建物謄本之「共有部分」或「附屬建物／公共設施」相關欄位，或為持分比例而非獨立建號。
請特別留意：共有部分（commonAreas）之建號、面積、持分（ratio）、權利範圍；若有「停車位」「機械式」「坡道平面」等記載請如實填入 notes 或對應欄位。
若文件未單獨列示車位建號而僅見於共有部分，仍請盡量抽出並於 notes 說明依據段落。

`;

function compose(basePrefix: string): string {
  return `${basePrefix.trim()}\n\n${TRANSCRIPT_PARSE_PROMPT}`;
}

export const TRANSCRIPT_PARSE_PROMPT_SINGLE_BUILDING_NUMBER = compose(PREFIX_SINGLE_BUILDING_NUMBER);
export const TRANSCRIPT_PARSE_PROMPT_MULTI_BUILDING_NUMBER = compose(PREFIX_MULTI_BUILDING_NUMBER);
export const TRANSCRIPT_PARSE_PROMPT_INDEPENDENT_PARKING = compose(PREFIX_INDEPENDENT_PARKING);
export const TRANSCRIPT_PARSE_PROMPT_SHARED_FACILITY_PARKING = compose(PREFIX_SHARED_FACILITY_PARKING);

/** 供 Prompt 管理頁一鍵建立；suggestedName 必須含 (scenarioKey) 以供自動套用 */
export const TRANSCRIPT_PARSE_SCENARIO_PRESETS: readonly TranscriptParsePreset[] = [
  {
    id: 'single_building_number',
    scenarioKey: 'single_building_number',
    label: '單一建號（主建物）',
    description: '單一筆建築物、單一建號之建物／土地謄本解析',
    suggestedName: '謄本解析-單一建號 (single_building_number)',
    content: TRANSCRIPT_PARSE_PROMPT_SINGLE_BUILDING_NUMBER,
  },
  {
    id: 'multi_building_number',
    scenarioKey: 'multi_building_number',
    label: '多建號（多筆建築物）',
    description: '同一物件含多個建號時，逐筆區分標示部與持分',
    suggestedName: '謄本解析-多建號 (multi_building_number)',
    content: TRANSCRIPT_PARSE_PROMPT_MULTI_BUILDING_NUMBER,
  },
  {
    id: 'independent_parking',
    scenarioKey: 'independent_parking',
    label: '獨立產權車位',
    description: '獨立建物／土地謄本之車位專用解析',
    suggestedName: '謄本解析-獨立產權車位 (independent_parking)',
    content: TRANSCRIPT_PARSE_PROMPT_INDEPENDENT_PARKING,
  },
  {
    id: 'shared_facility_parking',
    scenarioKey: 'shared_facility_parking',
    label: '公設產權車位',
    description: '共有持分、見於主建物謄本之停車空間',
    suggestedName: '謄本解析-公設產權車位 (shared_facility_parking)',
    content: TRANSCRIPT_PARSE_PROMPT_SHARED_FACILITY_PARKING,
  },
];

/**
 * 依謄本欄位種類與物件勾選決定自動套用哪一個 saved_prompt（名稱含 (key)）。
 */
export function resolveParsePromptScenario(
  kind: TranscriptParseScenarioKind,
  opts: {
    independentTitleSaleModes: IndependentTitleSaleMode[];
    parkingTitleRights: ParkingTitleRight[];
    independentBuildingNumberCount: number;
  },
): TranscriptParseScenarioKey | IndependentTitleSaleMode {
  const { independentTitleSaleModes, parkingTitleRights, independentBuildingNumberCount } = opts;
  const count = clampIndependentBuildingNumberCount(independentBuildingNumberCount ?? 1);

  if (kind === 'parking_building' || kind === 'parking_land') {
    return 'independent_parking';
  }

  if (kind === 'building' || kind === 'land') {
    const hasBuildingOnly = independentTitleSaleModes.includes('building_only');
    if (hasBuildingOnly) {
      return count >= 2 ? 'multi_building_number' : 'single_building_number';
    }
    if (parkingTitleRights.includes('shared_facility')) {
      return 'shared_facility_parking';
    }
  }

  return independentTitleSaleModes[0] ?? 'building_only';
}
