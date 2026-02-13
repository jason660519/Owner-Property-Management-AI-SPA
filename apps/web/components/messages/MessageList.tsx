import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { clsx } from 'clsx'
import { Message } from '../../types/message'
import { Star, Trash2 } from 'lucide-react'

interface MessageListProps {
  messages: Message[]
  selectedMessageId?: string
  onSelectMessage: (message: Message) => void
  onDeleteMessage: (e: React.MouseEvent, messageId: string) => void
}

export function MessageList({ 
  messages, 
  selectedMessageId, 
  onSelectMessage,
  onDeleteMessage
}: MessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <p>沒有訊息</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      {messages.map((message) => (
        <div
          key={message.id}
          onClick={() => onSelectMessage(message)}
          className={clsx(
            'p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative group',
            selectedMessageId === message.id ? 'bg-blue-50 dark:bg-gray-800' : '',
            !message.is_read ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-900/50'
          )}
        >
          <div className="flex justify-between items-start mb-1">
            <div className="flex items-center gap-2">
              {!message.is_read && (
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full flex-shrink-0" />
              )}
              <span className={clsx('font-medium text-gray-900 dark:text-white', !message.is_read && 'font-bold')}>
                {message.from_user?.display_name || '未知使用者'}
              </span>
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: zhTW })}
            </span>
          </div>
          
          <h4 className={clsx('text-sm mb-1 text-gray-800 dark:text-gray-200', !message.is_read && 'font-semibold')}>
            {message.subject || '(無主旨)'}
          </h4>
          
          <p className="text-sm text-gray-500 line-clamp-2 dark:text-gray-400">
            {message.content}
          </p>

          <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button 
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-yellow-500"
              onClick={(e) => {
                e.stopPropagation()
                // Star functionality to be implemented
              }}
            >
              <Star className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-red-500"
              onClick={(e) => onDeleteMessage(e, message.id)}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
