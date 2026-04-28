-- Standardize transcript parser, reviewer, and detail-builder report payloads.
-- saved_prompts rows override code fallbacks, so keep the runtime prompt contract
-- aligned with the TypeScript report renderer.

UPDATE saved_prompts
SET content = content || E'

standardReport（制式報告資料，必填）：
- 請在原本解析 JSON 外額外輸出 standardReport；不要用 Markdown 或 code fence。
- reportMeta.stage 固定 "parse"，company 填 provider 公司名，model 填模型型號，generatedAt 填目前日期時間或空字串。
- documentInventory：列出 user 上傳幾份文件、每份是什麼文件、頁數與大致文件架構。
- pageObservations：逐頁列出你看到什麼；visibleText 必須盡量列出該頁所有可見文字。若頁數很多，至少完整列出每個 authoritative 頁。
- structuredJson：放你判斷的最終標的物 Structured JSON，可與外層 buildingTranscript / landTranscript 對應。
- missingInformation：列出 user 提供文件缺少哪些重要資訊。
- calculations：列出建物、土地、車位面積與持分計算；保留平方公尺與原始持分。
- preliminarySummary：列出物件初步內容及建物、土地、車位面積明細表應有狀況。
- confidence.overall 為 0 到 1；confidence.fieldLevel 可列重要欄位信心。
- humanReviewRequired：列出需要人類確認的欄位或頁面。'
WHERE module_key = 'transcript.parse'
  AND content NOT LIKE '%standardReport（制式報告資料，必填）%';

UPDATE saved_prompts
SET content = content || E'

standardReport（制式報告資料，必填）：
- 請在原本審查 JSON 外額外輸出 standardReport；不要用 Markdown 或 code fence。
- reportMeta.stage 固定 "review"，company 填 provider 公司名，model 填模型型號，generatedAt 填目前日期時間或空字串。
- consensusMatrix 必須比較三個 parser 與你自己的 structuredJson：allAgree=100% 相同，majorityAgree=至少兩人相同，singleSource=只有一人提供，allDiffer=我們四個都不同，humanReviewRequired=需要人類審核的 items。
- structuredJson：放你綜合三個 parser 與自己審查後判斷的最終標的物 Structured JSON。
- missingInformation：回答 parser 說少的資訊你有沒有找到；找不到就列入 humanReviewRequired。
- calculations：列出建物、土地、車位面積與持分計算。
- preliminarySummary：列出物件初步內容及建物、土地、車位面積明細表應有狀況。
- confidence.overall 是你對審查結論的信心，0 到 1。'
WHERE module_key = 'transcript.intake.review'
  AND content NOT LIKE '%standardReport（制式報告資料，必填）%';

UPDATE saved_prompts
SET content = content || E'

standardReport（制式報告資料，必填）：
- 請在原本明細草稿 JSON 外額外輸出 standardReport；不要用 Markdown 或 code fence。
- reportMeta.stage 固定 "detail_builder"，company 填 provider 公司名，model 填模型型號，generatedAt 填目前日期時間或空字串。
- consensusMatrix 必須比較三份 Verify / Review 審查報告與你自己的 structuredJson：allAgree=100% 相同，majorityAgree=至少兩人相同，singleSource=只有一人提供，allDiffer=我們四個都不同，humanReviewRequired=需要人類審核的 items。
- structuredJson：放你綜合三位 reviewer 與自己審查後判斷的最終標的物 Structured JSON。
- missingInformation：回答 Reviewer 說少的資訊你有沒有找到；找不到就列入 humanReviewRequired。
- calculations：列出建物、土地、車位面積與持分計算。
- preliminarySummary：列出物件初步內容及建物、土地、車位面積明細表應有狀況。
- areaDetailDraft：放最終可編輯明細草稿。
- confidence.overall 是你對明細草稿結論的信心，0 到 1。'
WHERE module_key = 'transcript.intake.detail_builder'
  AND content NOT LIKE '%standardReport（制式報告資料，必填）%';
