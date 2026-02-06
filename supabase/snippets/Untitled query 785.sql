UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"display_name": "新的顯示名稱"}'::jsonb
WHERE id = '18359312-1473-4acb-b223-187da0de52ce';