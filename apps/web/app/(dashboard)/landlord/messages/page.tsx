'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { messageService } from '@/services/messageService'
import { Message, MessageFilter } from '@/types/message'
import { MessageList } from '@/components/messages/MessageList'
import { MessageDetail } from '@/components/messages/MessageDetail'
import { MessageFilters } from '@/components/messages/MessageFilters'
import { Loader2 } from 'lucide-react'

export default function MessagesPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<MessageFilter>({ type: 'all' })
  const [selectedMessageId, setSelectedMessageId] = useState<string | undefined>()
  const [isMobileDetailOpen, setIsMobileDetailOpen] = useState(false)

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', filter],
    queryFn: () => messageService.getMessages(filter),
    refetchInterval: 10000, // Poll every 10 seconds for real-time-ish updates
  })

  const selectedMessage = messages.find(m => m.id === selectedMessageId) || null

  // Mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => messageService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] })
    }
  })

  const deleteMessageMutation = useMutation({
    mutationFn: (id: string) => messageService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      if (selectedMessageId) setSelectedMessageId(undefined)
    }
  })

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => {
      if (!selectedMessage) throw new Error('No message selected')
      return messageService.sendMessage({
        to_user_id: selectedMessage.from_user_id,
        content,
        subject: `Re: ${selectedMessage.subject}`,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] })
      // Optionally show toast
    }
  })

  // Handlers
  const handleSelectMessage = (message: Message) => {
    setSelectedMessageId(message.id)
    setIsMobileDetailOpen(true)
    if (!message.is_read) {
      markAsReadMutation.mutate(message.id)
    }
  }

  const handleDeleteMessage = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('確定要刪除此訊息嗎？')) {
      deleteMessageMutation.mutate(id)
    }
  }

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white dark:bg-gray-900 overflow-hidden">
      {/* Sidebar / List View */}
      <div 
        className={`${
          isMobileDetailOpen ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 z-10`}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">訊息中心</h1>
        </div>
        
        <MessageFilters filter={filter} onFilterChange={setFilter} />
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <MessageList 
              messages={messages}
              selectedMessageId={selectedMessageId}
              onSelectMessage={handleSelectMessage}
              onDeleteMessage={handleDeleteMessage}
            />
          )}
        </div>
      </div>

      {/* Main Content / Detail View */}
      <div 
        className={`${
          isMobileDetailOpen ? 'flex' : 'hidden md:flex'
        } flex-1 flex-col bg-gray-50 dark:bg-gray-900 relative`}
      >
        <MessageDetail 
          message={selectedMessage}
          onBack={() => setIsMobileDetailOpen(false)}
          onReply={async (content) => {
            await sendMessageMutation.mutateAsync(content)
          }}
        />
      </div>
    </div>
  )
}
