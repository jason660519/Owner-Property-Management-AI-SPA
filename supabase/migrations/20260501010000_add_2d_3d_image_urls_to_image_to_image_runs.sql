ALTER TABLE public.image_to_image_evaluation_runs
  ADD COLUMN IF NOT EXISTS result_2d_image_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS result_3d_image_url TEXT NOT NULL DEFAULT '';

UPDATE public.image_to_image_evaluation_runs
SET result_2d_image_url = result_image_url
WHERE result_2d_image_url = ''
  AND result_image_url <> '';

COMMENT ON COLUMN public.image_to_image_evaluation_runs.result_2d_image_url IS
  '圖生圖評估產出的 2D 彩繪格局圖 URL 或 data URL';

COMMENT ON COLUMN public.image_to_image_evaluation_runs.result_3d_image_url IS
  '圖生圖評估產出的 3D 鳥瞰彩繪圖 URL 或 data URL';
