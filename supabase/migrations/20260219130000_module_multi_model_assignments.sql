-- filepath: supabase/migrations/20260219130000_module_multi_model_assignments.sql
-- description: Add assigned_models JSONB for multi-model selection per module
-- created: 2026-02-19
-- Supports fallback models and concurrent inference across users

-- Add assigned_models JSONB column: [{ "provider": "openai", "model": "gpt-4" }, ...]
ALTER TABLE public.ai_modules_assigned_function
  ADD COLUMN IF NOT EXISTS assigned_models JSONB NOT NULL DEFAULT '[]';

-- Migrate existing single assignments to assigned_models
UPDATE public.ai_modules_assigned_function
SET assigned_models = jsonb_build_array(
  jsonb_build_object('provider', assigned_provider, 'model', assigned_model)
)
WHERE assigned_provider IS NOT NULL
  AND assigned_model IS NOT NULL
  AND (assigned_models = '[]'::jsonb OR assigned_models IS NULL);

COMMENT ON COLUMN public.ai_modules_assigned_function.assigned_models IS 'Multiple model assignments per module: [{provider, model}, ...] for fallback and concurrent inference';
