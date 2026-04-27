-- Strengthen title-deed image parsing by front-loading visual transcription
-- before schema mapping. This updates the saved parser prompt used at runtime.

UPDATE saved_prompts
SET
  content = concat(
    '【權狀／掃描影本視覺解析優先規則】', E'\n',
    '- 在填 JSON 前，請先像 OCR 一樣逐區塊閱讀整張文件，內部整理所有可見標題、欄名、數字、地號、建號、權利範圍、面積、門牌、所有權人、權狀字號。', E'\n',
    '- 不要一開始就套 schema 而跳過小字、印章旁、表格邊緣或上下欄位；權狀 JPG/PNG/PDF 掃描影本尤其要先看完全部可見文字。', E'\n',
    '- 權狀影本不是謄本，但仍必須解析；不可因沒有「標示部／所有權部」章節就輸出空白。', E'\n',
    '- 若看到「土地所有權狀」「建物所有權狀」「所有權狀字號」「權狀字號」「權利範圍」「土地標示」「建物標示」等文字，請先視為可解析文件。', E'\n',
    '- 土地權狀常見欄位：地號、坐落、地目、面積、權利範圍、所有權人、所有權狀字號，應寫入 landTranscript.header / description / ownership。', E'\n',
    '- 建物權狀常見欄位：建號、門牌、基地坐落、層次、面積、主要用途、主要建材、共同使用部分、權利範圍、所有權人、所有權狀字號，應寫入 buildingTranscript.header / description / ownership / commonAreas。', E'\n',
    '- 權狀可能同頁同時包含土地與建物資訊；請同時填入 landTranscript 與 buildingTranscript，不要只保留其中一邊。', E'\n',
    '- 不要輸出你的轉錄過程；最終只輸出嚴格 JSON。', E'\n\n',
    content
  ),
  updated_at = NOW()
WHERE module_key = 'transcript.parse'
  AND content NOT LIKE '%【權狀／掃描影本視覺解析優先規則】%';

UPDATE saved_prompts
SET
  content = concat(
    content,
    E'\n\n',
    '權狀影本審查補強規則：', E'\n',
    '- 如果 parser 對權狀影本輸出大量空白，但原始文件可見地號、建號、權利範圍、面積、門牌、所有權人或權狀字號，必須列為 blocking issue。', E'\n',
    '- 審查時請先自行做一次快速視覺轉錄，確認 parser 是否漏掉權狀上清楚可見的欄位。', E'\n',
    '- 土地權狀同頁若含建物標示，不可審核通過只有 landTranscript 而 buildingTranscript 空白的結果；建物權狀同頁若含土地標示亦同。'
  ),
  updated_at = NOW()
WHERE module_key = 'transcript.intake.review'
  AND content NOT LIKE '%權狀影本審查補強規則%';
