-- Strengthen transcript/title-deed prompts for mixed Taiwanese ownership
-- certificate copies. These saved_prompts rows override code fallbacks.

UPDATE saved_prompts
SET content = content || E'

權狀影本補充規則：
- 文件若顯示「土地所有權狀」「建物所有權狀」「權狀字號」「權利範圍」，不可因沒有「標示部／所有權部」章節就輸出空白。
- 權狀可能同頁同時包含土地與建物資訊；請同時保留 landTranscript 與 buildingTranscript，不要只保留其中一邊。
- 「土地標示」下的地號、面積、權利範圍應寫入 landTranscript.description / ownership。
- 「建物標示」下的建號、門牌、層次、面積、主要用途、主要建材、共同使用部分應寫入 buildingTranscript.description。
- 權狀上的「權利範圍」即 ownershipRatio；請保留原始字串，例如「20000分之157」「2分之1」。
- 若文件主標題是土地權狀但下方列出建物標示，kind 可仍為 "land"，但 buildingTranscript 不可留空。
- 只輸出嚴格 JSON；不要 markdown，不要 ```json code fence。'
WHERE module_key = 'transcript.parse'
  AND content NOT LIKE '%權狀影本補充規則%';

UPDATE saved_prompts
SET content = content || E'

權狀影本補充規則：
- 權狀影本不是錯誤文件；看到「所有權狀」「土地所有權狀」「建物所有權狀」「權狀字號」時，應分類為 building_title 或 land_title。
- 同一份權狀若同時含土地標示與建物標示，documentKinds 可同時包含 land_title 與 building_title，或標為 mixed_transcript。
- 只輸出嚴格 JSON；不要 markdown，不要 ```json code fence。'
WHERE module_key = 'transcript.intake.detect'
  AND content NOT LIKE '%權狀影本補充規則%';

UPDATE saved_prompts
SET content = content || E'

權狀影本審查補充規則：
- 如果 parser 對權狀影本輸出大量空白，但原始文件可見地號、建號、權利範圍、面積或所有權人，必須列為 blocking issue。
- 土地權狀同頁若含建物標示，不可審核通過只有 landTranscript 而 buildingTranscript 空白的結果。
- reviewer 只輸出嚴格 JSON；不要 markdown，不要 ```json code fence。'
WHERE module_key = 'transcript.intake.review'
  AND content NOT LIKE '%權狀影本審查補充規則%';
