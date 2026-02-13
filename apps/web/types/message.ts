export interface Message {
  id: string
  thread_id?: string
  from_user_id: string
  to_user_id: string
  subject?: string
  content: string
  message_type: 'text' | 'image' | 'file' | 'voice'
  attachment_urls?: string[]
  is_read: boolean
  read_at?: string
  is_deleted_by_sender: boolean
  is_deleted_by_receiver: boolean
  created_at: string
  
  // Joined fields (optional)
  from_user?: {
    display_name: string
    avatar_url?: string
  }
  to_user?: {
    display_name: string
    avatar_url?: string
  }
}

export interface MessageFilter {
  type?: 'all' | 'unread' | 'read' | 'starred'
  search?: string
}

export interface SendMessageDTO {
  to_user_id: string
  subject?: string
  content: string
  message_type?: 'text' | 'image' | 'file' | 'voice'
  attachment_urls?: string[]
}
