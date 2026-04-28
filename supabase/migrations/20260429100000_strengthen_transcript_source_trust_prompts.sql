-- Strengthen transcript source-trust prompts for mixed uploads that contain
-- property descriptions, investigation reports, photos, maps, and transcripts.
-- These saved_prompts rows override code fallbacks.

UPDATE saved_prompts
SET content = content || E'

正式來源分流規則：
- 如果輸入包含 route_decision.documents[].pages，必須依 pageRole/sourceTrust 判斷來源可信度；sourceTrust=authoritative 的謄本/權狀才可作為正式分類證據。
- 不動產說明書、物件調查報告書、照片、地圖、平面圖只能作為 reference_only 或 ignore；不可把它們當成 building_transcript / land_transcript，也不可用來判定正式面積或持分。
- 同一 PDF 內若混有說明書與謄本，請只採信謄本或權狀頁，並在 riskFlags 記錄 mixed_authoritative_and_reference_sources。
- 只輸出嚴格 JSON；不要 markdown，不要 ```json code fence。'
WHERE module_key = 'transcript.intake.detect'
  AND content NOT LIKE '%正式來源分流規則%';

UPDATE saved_prompts
SET content = content || E'

正式來源分流規則：
- 只有登記謄本或所有權狀可作為正式資料來源，用來填入建物、土地、車位、所有權、面積與持分欄位。
- 若輸入包含 route_decision.documents[].pages，只能使用 sourceTrust=authoritative 的頁面填入 schema；reference_only/ignore 頁面不可直接寫入 buildingTranscript、landTranscript 或車位欄位。
- 不動產說明書、物件調查報告書、照片、地圖、平面圖、廣告或仲介整理表只能當參考，不可直接填入 schema。
- 同一份 PDF 若混有說明書與謄本，請忽略說明書/調查報告頁，只解析謄本或權狀頁。
- 參考文件中的坪數或面積若與謄本不同，不可覆蓋謄本；本階段只輸出 schema，無法確認時請留空。
- 只輸出嚴格 JSON；不要 markdown，不要 ```json code fence。'
WHERE module_key = 'transcript.parse'
  AND content NOT LIKE '%正式來源分流規則%';

UPDATE saved_prompts
SET content = content || E'

正式來源審查規則：
- 必須檢查 parser 是否誤用不動產說明書、物件調查報告書、照片、地圖、平面圖等 reference_only/ignore 來源填入正式欄位；若有，必須列 blocking issue。
- 若 reference_only 來源的坪數或面積與謄本/權狀不同，只能列為 doubleCheckSummary 或 userConfirmationRequired，不可直接覆蓋正式解析值。
- reviewer 只輸出嚴格 JSON；不要 markdown，不要 ```json code fence。'
WHERE module_key = 'transcript.intake.review'
  AND content NOT LIKE '%正式來源審查規則%';

UPDATE saved_prompts
SET content = content || E'

正式來源填表規則：
- 若 route_decision.documents[].pages 顯示該頁 sourceTrust=reference_only 或 ignore，該頁不可成為明細列的 sourcePage；只能用於 warnings 或 userConfirmationRequired。
- 不動產說明書或物件調查報告書中的坪數可用來檢查謄本解析是否疑似錯誤，但不可當成正確答案直接填表。
- 每列仍需盡量提供 sourceDocumentId、sourceDocumentName、sourcePage、evidenceText、confidence。
- 獨立車位建物若同一建號含主建物、附屬建物、共有部分，且所有權部另有車位整體權利範圍，例如「84分之2」，請把「84分之2」填入每列 parkingBuildingAreas[].groupShareRatio；該列 shareRatio 只放單一組成項目的權利範圍，例如主建物/附屬建物填「全部」，共有部分填「100000分之1745」。
- 只輸出嚴格 JSON；不要 markdown，不要 ```json code fence。'
WHERE module_key = 'transcript.intake.detail_builder'
  AND content NOT LIKE '%正式來源填表規則%';
