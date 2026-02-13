import { createClient } from '../lib/supabase/client'
import { Message, MessageFilter, SendMessageDTO } from '../types/message'

// Mock data for development when backend is not ready or empty
const MOCK_MESSAGES: Message[] = [
  {
    id: '1',
    from_user_id: 'user-1',
    to_user_id: 'current-user',
    subject: '維修請求：冷氣不冷',
    content: '房東您好，客廳的冷氣似乎不冷了，可以請人來看看嗎？',
    message_type: 'text',
    is_read: false,
    is_deleted_by_sender: false,
    is_deleted_by_receiver: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    from_user: {
      display_name: '張大明 (租客)',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
    }
  },
  {
    id: '2',
    from_user_id: 'system',
    to_user_id: 'current-user',
    subject: '系統通知：租金入帳',
    content: '您的物件「台北市信義區信義路五段100號」已收到本月租金 NT$ 35,000。',
    message_type: 'text',
    is_read: true,
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    is_deleted_by_sender: false,
    is_deleted_by_receiver: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    from_user: {
      display_name: '系統通知',
      avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=System'
    }
  },
  {
    id: '3',
    from_user_id: 'user-2',
    to_user_id: 'current-user',
    subject: '預約看房確認',
    content: '您好，我想要預約下週三下午兩點看房，請問方便嗎？',
    message_type: 'text',
    is_read: true,
    read_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    is_deleted_by_sender: false,
    is_deleted_by_receiver: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    from_user: {
      display_name: '林小美 (潛在租客)',
      avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka'
    }
  }
]

class MessageService {
  private supabase = createClient()
  private isMock = true // Set to false to use real Supabase data

  async getMessages(filter?: MessageFilter): Promise<Message[]> {
    if (this.isMock) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      let messages = [...MOCK_MESSAGES]
      
      if (filter?.type === 'unread') {
        messages = messages.filter(m => !m.is_read)
      } else if (filter?.type === 'read') {
        messages = messages.filter(m => m.is_read)
      }
      
      if (filter?.search) {
        const searchLower = filter.search.toLowerCase()
        messages = messages.filter(m => 
          m.content.toLowerCase().includes(searchLower) || 
          m.subject?.toLowerCase().includes(searchLower) ||
          m.from_user?.display_name.toLowerCase().includes(searchLower)
        )
      }
      
      return messages.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      let query = this.supabase
        .from('messages')
        .select(`
          *,
          from_user:users_profile!messages_from_user_id_fkey(display_name),
          to_user:users_profile!messages_to_user_id_fkey(display_name)
        `)
        .or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (filter?.type === 'unread') {
        query = query.eq('is_read', false)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Need to transform data to match interface if needed, mainly avatar which might not be in profile yet
      return data as unknown as Message[]
    } catch (error) {
      console.error('Error fetching messages:', error)
      return []
    }
  }

  async getUnreadCount(): Promise<number> {
    if (this.isMock) {
      return MOCK_MESSAGES.filter(m => !m.is_read).length
    }

    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      if (!user) return 0

      const { count, error } = await this.supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('is_read', false)

      if (error) throw error
      return count || 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  async markAsRead(messageId: string): Promise<void> {
    if (this.isMock) {
      const message = MOCK_MESSAGES.find(m => m.id === messageId)
      if (message) {
        message.is_read = true
        message.read_at = new Date().toISOString()
      }
      return
    }

    const { error } = await this.supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId)

    if (error) throw error
  }

  async sendMessage(data: SendMessageDTO): Promise<Message | null> {
    if (this.isMock) {
      const newMessage: Message = {
        id: Math.random().toString(36).substr(2, 9),
        from_user_id: 'current-user',
        to_user_id: data.to_user_id,
        subject: data.subject,
        content: data.content,
        message_type: data.message_type || 'text',
        attachment_urls: data.attachment_urls,
        is_read: false,
        is_deleted_by_sender: false,
        is_deleted_by_receiver: false,
        created_at: new Date().toISOString(),
        from_user: {
          display_name: '房東 (您)',
          avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Landlord'
        }
      }
      MOCK_MESSAGES.unshift(newMessage)
      return newMessage
    }

    const { data: { user } } = await this.supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: newMessage, error } = await this.supabase
      .from('messages')
      .insert({
        from_user_id: user.id,
        ...data
      })
      .select()
      .single()

    if (error) throw error
    return newMessage
  }
  
  async deleteMessage(messageId: string): Promise<void> {
      if (this.isMock) {
          const index = MOCK_MESSAGES.findIndex(m => m.id === messageId);
          if (index !== -1) {
              MOCK_MESSAGES.splice(index, 1);
          }
          return;
      }
      
      // In a real app, we might soft delete or check if sender/receiver to toggle flags
      const { error } = await this.supabase
        .from('messages')
        .update({ is_deleted_by_receiver: true }) // Assuming current user is receiver for now
        .eq('id', messageId)

      if (error) throw error
  }
}

export const messageService = new MessageService()
