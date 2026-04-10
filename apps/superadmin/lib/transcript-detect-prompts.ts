// Legacy keys retained for backwards compatibility with the per-user
// ai_system_prompts override mechanism. New saved_prompts seed uses the
// canonical SSoT module_key naming below.
export const DETECT_BUILDING_COUNT_PROMPT_MODULE_KEY = 'online_ocr_detect_building_count' as const;
export const DETECT_BUILDING_COUNT_PROMPT_PROVIDER = 'global' as const;
export const DETECT_BUILDING_COUNT_PROMPT_NAME = 'default' as const;

// Canonical SSoT module keys (used by lib/ai/prompt-safety.ts::resolveSystemPrompt
// and apps/superadmin/components/prompt-management/seedDefaultPrompts.ts).
export const DETECT_BUILDING_COUNT_SAVED_PROMPT_MODULE_KEY = 'transcript.detect_building_count' as const;
export const DETECT_LAND_COUNT_SAVED_PROMPT_MODULE_KEY = 'transcript.detect_land_count' as const;

// Land-parcel detection prompt — extracted from /api/transcript-parse/detect-land-count
// route so it can be seeded into saved_prompts under transcript.detect_land_count.
export const DETECT_LAND_COUNT_PROMPT = `請仔細閱讀此土地謄本，找出其中所有獨立的「地號」（土地標示之號碼）。

地號通常出現於土地標示部，格式如「地號：XXXX」、「第XXXX地號」，或謄本標題與各筆標示行。
若謄本含多個地號區塊，請逐一列出所有不重複的地號（可含地段與小段）。

請只回傳以下 JSON 格式（不含任何說明文字）：
{"count": 2, "landParcelNumbers": ["大安段一小段 0367-0000地號", "大安段一小段 0368-0000地號"]}

若謄本只有一個地號，請回傳：{"count": 1, "landParcelNumbers": ["…"]}
若無法辨識，請回傳：{"count": 0, "landParcelNumbers": []}`;

export const DETECT_BUILDING_COUNT_PROMPT = `你是台灣不動產謄本解析專家，負責判斷「業主欲出售之建物標的」有幾筆建號。

請仔細閱讀此建物謄本，找出其中所有獨立的「建號」（建物號碼）。

【極重要規則 — 僅計算與標的建物權利範圍有關的建號】
1) 只允許參考下列區塊中的建號：
   - 建物標示部（建物標示、建物標示部、建物標示部摘要等）
   - 建物所有權部（建物所有權部、所有權部、建物所有權人相關區塊）
2) 不可以把「土地標示部」或「土地所有權部」中，單純列出的「地上建物建號」清單全部算進來。
   - 例如：土地標示部有「地上建物建號：0001、0002、…、0029」，但這些建物並非本次欲處分的建物標的，
     這種情況「不要」直接回傳 29 筆建號。
3) 若文件看起來是「土地謄本」，且只在土地標示部看到多個建號，但無法在建物標示部／建物所有權部
   明確對應到本次要販售的建物標的，請回傳 0。

建號通常出現於謄本「建物標示部」或「建物所有權部」，格式如：
- 「建號：XXXX」
- 「建物號碼：XXXX」
- 建物謄本首頁或各筆建物標示行中的建號欄位

若謄本含多個「與欲處分建物相關」的建號區塊，請逐一列出所有不重複的建號。

請只回傳以下 JSON 格式（不含任何說明文字）：
{"count": 2, "buildingNumbers": ["0001", "0002"]}

若謄本只有一個建號，請回傳：{"count": 1, "buildingNumbers": ["XXXX"]}
若無法辨識，請回傳：{"count": 0, "buildingNumbers": []}`;
