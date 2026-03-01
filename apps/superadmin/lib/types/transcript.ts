// filepath: apps/superadmin/lib/types/transcript.ts
// Types for AI-parsed 謄本 (land registry transcript) JSON output.

/** 謄本基本資訊（列印時間、種類、建號、地政機關等） */
export interface TranscriptMeta {
  謄本種類?: string;
  建物建號?: string;
  行政區?: string;
  列印時間?: string;
  頁次?: string;
  謄本類型?: string;
  列印機構?: string;
  謄本檢查號?: string;
  查驗網址?: string;
  地政事務所主任?: string;
  大安電謄字號?: string;
  資料管轄機關?: string;
  謄本核發機關?: string;
  [key: string]: string | undefined;
}

/** 建物標示部 */
export interface BuildingMarkSection {
  登記日期?: string;
  登記原因?: string;
  建物門牌?: string;
  建物坐落地號?: string;
  主要用途?: string;
  主要建材?: string;
  層數?: string;
  層次?: string;
  建築完成日期?: string;
  附屬建物用途?: string;
  總面積?: string;
  層次面積?: string;
  陽台面積?: string;
  共有部分?: string;
  權利範圍?: string;
  其他登記事項?: string[] | null;
  [key: string]: string | string[] | null | undefined;
}

/** 建物所有權部 */
export interface OwnershipSection {
  登記次序?: string;
  登記日期?: string;
  原因發生日期?: string;
  登記原因?: string;
  所有權人?: string;
  住址?: string;
  權利範圍?: string;
  權狀字號?: string;
  相關他項權利登記次序?: string[] | null;
  其他登記事項?: string | null;
  [key: string]: string | string[] | null | undefined;
}

/** AI 解析謄本後的完整結構（key-value JSON） */
export interface LandRegistryParsedResult {
  謄本資訊?: TranscriptMeta;
  建物標示部?: BuildingMarkSection;
  建物所有權部?: OwnershipSection;
  土地標示部?: Record<string, unknown>;
  土地所有權部?: Record<string, unknown>;
  他項權利部?: Record<string, unknown>;
  備註?: string | null;
  [key: string]: unknown;
}
