-- ======================================================================================
-- Title: 將所有 user_id / owner_id / landlord_id 統一為測試用戶
-- Date: 2026-02-16
-- Description: 確保 public schema 中所有使用者相關欄位指向測試用戶
--             2cd70d9d-9d84-4d2a-9848-df5b3898e4c4 (a0405142777@gmail.com)
-- ======================================================================================

DO $$
DECLARE
    target UUID := '2cd70d9d-9d84-4d2a-9848-df5b3898e4c4';
BEGIN
    -- user_id (UUID)
    UPDATE public.ai_api_keys SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.ai_chat_logs SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.ai_conversations SET user_id = target WHERE user_id IS DISTINCT FROM target;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_modules_assigned_function') THEN
        UPDATE public.ai_modules_assigned_function SET user_id = target WHERE user_id IS DISTINCT FROM target;
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ai_feature_modules') THEN
        UPDATE public.ai_feature_modules SET user_id = target WHERE user_id IS DISTINCT FROM target;
    END IF;
    UPDATE public.ai_model_selections SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.ai_system_prompts SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.ai_usage_logs SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.api_call_logs SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.audit_logs SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.calendar_events SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.call_logs SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.document_uploads SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.draft_autosave SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.email_threads SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.email_verifications SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.form_drafts SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.identity_verification_records SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.media_processing_queue SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.payment_transactions SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.property_comparisons SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.recommendation_logs SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.social_auth_connections SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.system_notifications SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.theme_settings SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.todo_tasks SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.transfer_tokens SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.unit_conversion_logs SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.upload_progress SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.user_activity_logs SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.user_favorites SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.user_feedback SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.user_sessions SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.user_vlm_credentials SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.users_track_history SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.virtual_phone_numbers SET user_id = target WHERE user_id IS DISTINCT FROM target;

    -- notification_queue, notification_preferences
    UPDATE public.notification_queue SET user_id = target WHERE user_id IS DISTINCT FROM target;
    UPDATE public.notification_preferences SET user_id = target WHERE user_id IS DISTINCT FROM target;

    -- logs.user_id (TEXT)
    UPDATE public.logs SET user_id = target::text WHERE user_id IS DISTINCT FROM target::text AND user_id != 'anonymous';

    -- messages: from_user_id, to_user_id
    UPDATE public.messages SET from_user_id = target WHERE from_user_id IS DISTINCT FROM target;
    UPDATE public.messages SET to_user_id = target WHERE to_user_id IS DISTINCT FROM target;

    -- owner_id
    UPDATE public.media_gallery SET owner_id = target WHERE owner_id IS DISTINCT FROM target;
    UPDATE public.property_documents SET owner_id = target WHERE owner_id IS DISTINCT FROM target;
    UPDATE public.property_rentals SET owner_id = target WHERE owner_id IS DISTINCT FROM target;
    UPDATE public.property_sales SET owner_id = target WHERE owner_id IS DISTINCT FROM target;

    -- landlord_id
    UPDATE public.bank_accounts SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.buyer_inquiries SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.contracted_buyers SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.contracted_tenants SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.deposit_receipts SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.invoice_records SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.landlord_call_preferences SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.landlord_customers SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.leads_buyers SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.leads_tenants SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.lease_agreements SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.rent_receipts SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.tax_reports SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.tenant_inquiries SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.viewing_appointments_buyer SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;
    UPDATE public.viewing_appointments_tenant SET landlord_id = target WHERE landlord_id IS DISTINCT FROM target;

    -- agent_directory.landlord_id
    UPDATE public.agent_directory SET landlord_id = target WHERE landlord_id IS NOT NULL AND landlord_id IS DISTINCT FROM target;

    RAISE NOTICE '全部 user_id / owner_id / landlord_id 已統一為測試用戶 %', target;
END $$;
