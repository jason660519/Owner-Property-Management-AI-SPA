-- Rename classification meta-tag labels for clarity
UPDATE ai_model_role_tags
  SET tag_label = '網路查詢分類',
      description = '由 AI 根據訓練知識，查詢各模型的公開能力資訊來推薦分類'
  WHERE tag_key = 'online_classification';

UPDATE ai_model_role_tags
  SET tag_label = 'API Response 分類',
      description = '根據各分頁實際測試模型後的 API 回應結果來推薦分類'
  WHERE tag_key = 'offline_classification';
