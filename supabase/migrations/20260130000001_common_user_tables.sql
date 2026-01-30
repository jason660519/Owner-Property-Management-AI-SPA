-- ======================================================================================
-- Migration: Common User Tables (All Users)
-- Date: 2026-01-30
-- Description: Tables shared by all user types including communication, notifications,
--              documents, and user preferences
-- ======================================================================================

-- Define update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ======================================================================================
-- PART 1: User Communication & Messaging
-- ======================================================================================

-- 1. User Sessions (會話狀態表)
CREATE TABLE IF NOT EXISTS public.user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    session_token TEXT NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON public.user_sessions(is_active) WHERE is_active = TRUE;

-- 2. Messages (訊息記錄表)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID, -- Optional: for grouping messages
    from_user_id UUID NOT NULL REFERENCES public.users_profile(id),
    to_user_id UUID NOT NULL REFERENCES public.users_profile(id),
    subject TEXT,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- 'text', 'image', 'file', 'voice'
    attachment_urls TEXT[],
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    is_deleted_by_sender BOOLEAN DEFAULT FALSE,
    is_deleted_by_receiver BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_from_user ON public.messages(from_user_id);
CREATE INDEX idx_messages_to_user ON public.messages(to_user_id);
CREATE INDEX idx_messages_thread ON public.messages(thread_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);

-- 3. Email Threads (Email線程表)
CREATE TABLE IF NOT EXISTS public.email_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id),
    subject TEXT NOT NULL,
    participants TEXT[] NOT NULL, -- Email addresses
    last_message_at TIMESTAMPTZ NOT NULL,
    message_count INTEGER DEFAULT 1,
    is_archived BOOLEAN DEFAULT FALSE,
    labels TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_threads_user ON public.email_threads(user_id);
CREATE INDEX idx_email_threads_last_message ON public.email_threads(last_message_at DESC);

-- ======================================================================================
-- PART 2: Notifications & Preferences
-- ======================================================================================

-- 4. Notification Queue (通知佇列表)
CREATE TABLE IF NOT EXISTS public.notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'email', 'sms', 'push', 'in_app'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_queue_user ON public.notification_queue(user_id);
CREATE INDEX idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled ON public.notification_queue(scheduled_at);

-- 5. Notification Preferences (通知偏好設定表)
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users_profile(id) ON DELETE CASCADE,
    email_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    push_notifications BOOLEAN DEFAULT TRUE,
    in_app_notifications BOOLEAN DEFAULT TRUE,
    
    -- Specific event preferences
    notify_new_message BOOLEAN DEFAULT TRUE,
    notify_property_inquiry BOOLEAN DEFAULT TRUE,
    notify_maintenance_request BOOLEAN DEFAULT TRUE,
    notify_payment_due BOOLEAN DEFAULT TRUE,
    notify_document_uploaded BOOLEAN DEFAULT TRUE,
    notify_system_updates BOOLEAN DEFAULT FALSE,
    
    -- Delivery preferences
    digest_frequency TEXT DEFAULT 'realtime', -- 'realtime', 'daily', 'weekly'
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone TEXT DEFAULT 'Asia/Taipei',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ======================================================================================
-- PART 3: Documents & Media
-- ======================================================================================

-- 6. Document Uploads (文件上傳記錄表)
CREATE TABLE IF NOT EXISTS public.document_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id),
    document_type TEXT NOT NULL, -- 'contract', 'id', 'bank_statement', 'title_deed'
    file_name TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    related_entity_type TEXT, -- 'property', 'user', 'contract'
    related_entity_id UUID,
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES public.users_profile(id),
    verified_at TIMESTAMPTZ,
    is_public BOOLEAN DEFAULT FALSE,
    expiry_date DATE,
    tags TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_uploads_user ON public.document_uploads(user_id);
CREATE INDEX idx_document_uploads_type ON public.document_uploads(document_type);
CREATE INDEX idx_document_uploads_entity ON public.document_uploads(related_entity_type, related_entity_id);

-- 7. Upload Progress (上傳檔案中繼記錄表)
CREATE TABLE IF NOT EXISTS public.upload_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id),
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    bytes_uploaded BIGINT DEFAULT 0,
    upload_status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'failed', 'cancelled'
    upload_url TEXT,
    chunk_size INTEGER,
    chunks_uploaded INTEGER DEFAULT 0,
    total_chunks INTEGER,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_upload_progress_user ON public.upload_progress(user_id);
CREATE INDEX idx_upload_progress_status ON public.upload_progress(upload_status);

-- 8. Media Processing Queue (媒體處理佇列表)
CREATE TABLE IF NOT EXISTS public.media_processing_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id),
    source_file_path TEXT NOT NULL,
    processing_type TEXT NOT NULL, -- 'resize', 'compress', 'convert', 'thumbnail', 'watermark'
    processing_status TEXT DEFAULT 'queued', -- 'queued', 'processing', 'completed', 'failed'
    priority INTEGER DEFAULT 5, -- 1-10, higher = more priority
    output_file_path TEXT,
    processing_options JSONB DEFAULT '{}',
    progress_percentage INTEGER DEFAULT 0,
    error_message TEXT,
    processing_time_ms INTEGER,
    queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_media_processing_queue_status ON public.media_processing_queue(processing_status);
CREATE INDEX idx_media_processing_queue_priority ON public.media_processing_queue(priority DESC) WHERE processing_status = 'queued';

-- ======================================================================================
-- PART 4: User Preferences & Settings
-- ======================================================================================

-- 9. Theme Settings (主題設定表)
CREATE TABLE IF NOT EXISTS public.theme_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users_profile(id) ON DELETE CASCADE,
    theme_mode TEXT DEFAULT 'light', -- 'light', 'dark', 'auto'
    primary_color TEXT DEFAULT '#3B82F6',
    font_size TEXT DEFAULT 'medium', -- 'small', 'medium', 'large'
    language TEXT DEFAULT 'zh-TW',
    custom_css TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Social Auth Connections (社交帳號連結表)
CREATE TABLE IF NOT EXISTS public.social_auth_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'google', 'facebook', 'line', 'apple'
    provider_user_id TEXT NOT NULL,
    email TEXT,
    display_name TEXT,
    profile_picture_url TEXT,
    access_token_enc TEXT, -- Encrypted
    refresh_token_enc TEXT, -- Encrypted
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

CREATE INDEX idx_social_auth_connections_user ON public.social_auth_connections(user_id);
CREATE INDEX idx_social_auth_connections_provider ON public.social_auth_connections(provider);

-- ======================================================================================
-- PART 5: User Activity & Productivity
-- ======================================================================================

-- 11. Calendar Events (行事曆事件表)
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT, -- 'viewing', 'maintenance', 'meeting', 'personal'
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    location TEXT,
    attendees TEXT[], -- Email addresses or user IDs
    related_entity_type TEXT, -- 'property', 'maintenance_request'
    related_entity_id UUID,
    reminder_minutes INTEGER, -- Minutes before event to remind
    is_all_day BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT, -- RRULE format for recurring events
    status TEXT DEFAULT 'scheduled', -- 'scheduled', 'completed', 'cancelled'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_calendar_events_user ON public.calendar_events(user_id);
CREATE INDEX idx_calendar_events_start_time ON public.calendar_events(start_time);

-- 12. Todo Tasks (待辦事項表)
CREATE TABLE IF NOT EXISTS public.todo_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    due_date DATE,
    due_time TIME,
    category TEXT, -- 'personal', 'work', 'property_management'
    related_entity_type TEXT,
    related_entity_id UUID,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_todo_tasks_user ON public.todo_tasks(user_id);
CREATE INDEX idx_todo_tasks_status ON public.todo_tasks(status);
CREATE INDEX idx_todo_tasks_due_date ON public.todo_tasks(due_date);

-- 13. Draft Autosave (草稿自動儲存表)
CREATE TABLE IF NOT EXISTS public.draft_autosave (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    draft_type TEXT NOT NULL, -- 'property_listing', 'blog_post', 'message', 'contract'
    draft_key TEXT NOT NULL, -- Unique identifier for the draft
    content JSONB NOT NULL,
    last_saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, draft_type, draft_key)
);

CREATE INDEX idx_draft_autosave_user ON public.draft_autosave(user_id);
CREATE INDEX idx_draft_autosave_last_saved ON public.draft_autosave(last_saved_at DESC);

-- 14. User Activity Logs (用戶活動記錄表)
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL, -- 'view', 'create', 'update', 'delete', 'share'
    resource_type TEXT NOT NULL, -- 'property', 'document', 'message'
    resource_id UUID,
    activity_description TEXT,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_activity_logs_user ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_logs_resource ON public.user_activity_logs(resource_type, resource_id);
CREATE INDEX idx_user_activity_logs_created_at ON public.user_activity_logs(created_at DESC);

-- ======================================================================================
-- PART 6: Feedback & Support
-- ======================================================================================

-- 15. User Feedback (使用者回饋與建議表)
CREATE TABLE IF NOT EXISTS public.user_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users_profile(id),
    feedback_type TEXT NOT NULL, -- 'bug_report', 'feature_request', 'general_feedback', 'complaint'
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT, -- 'ui', 'functionality', 'performance', 'other'
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'new', -- 'new', 'under_review', 'in_progress', 'resolved', 'closed'
    attachments TEXT[],
    admin_response TEXT,
    responded_by UUID REFERENCES public.users_profile(id),
    responded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_feedback_user ON public.user_feedback(user_id);
CREATE INDEX idx_user_feedback_status ON public.user_feedback(status);
CREATE INDEX idx_user_feedback_created_at ON public.user_feedback(created_at DESC);

-- ======================================================================================
-- Enable RLS for all new tables
-- ======================================================================================

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_processing_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_auth_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_autosave ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- ======================================================================================
-- Basic RLS Policies - Users can access their own data
-- ======================================================================================

-- User Sessions
CREATE POLICY "Users can view their own sessions" ON public.user_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions" ON public.user_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- Messages
CREATE POLICY "Users can view their messages" ON public.messages
    FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "Users can update their sent messages" ON public.messages
    FOR UPDATE USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

-- Notifications
CREATE POLICY "Users can view their notifications" ON public.notification_queue
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON public.notification_queue
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can update their notifications" ON public.notification_queue
    FOR UPDATE USING (user_id = auth.uid());

-- Documents
CREATE POLICY "Users can view their documents" ON public.document_uploads
    FOR SELECT USING (user_id = auth.uid() OR is_public = TRUE);

CREATE POLICY "Users can upload documents" ON public.document_uploads
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their documents" ON public.document_uploads
    FOR UPDATE USING (user_id = auth.uid());

-- Calendar Events
CREATE POLICY "Users can manage their calendar" ON public.calendar_events
    FOR ALL USING (user_id = auth.uid());

-- Todo Tasks
CREATE POLICY "Users can manage their todos" ON public.todo_tasks
    FOR ALL USING (user_id = auth.uid());

-- Feedback
CREATE POLICY "Users can view their feedback" ON public.user_feedback
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can submit feedback" ON public.user_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Theme Settings
CREATE POLICY "Users can manage their theme" ON public.theme_settings
    FOR ALL USING (user_id = auth.uid());

-- ======================================================================================
-- Create updated_at triggers
-- ======================================================================================

CREATE TRIGGER update_email_threads_updated_at BEFORE UPDATE ON public.email_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_uploads_updated_at BEFORE UPDATE ON public.document_uploads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_theme_settings_updated_at BEFORE UPDATE ON public.theme_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_social_auth_connections_updated_at BEFORE UPDATE ON public.social_auth_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_todo_tasks_updated_at BEFORE UPDATE ON public.todo_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_feedback_updated_at BEFORE UPDATE ON public.user_feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
