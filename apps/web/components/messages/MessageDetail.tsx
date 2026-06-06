import { useState, type SVGProps } from 'react'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { Message } from '../../types/message'
import { Send, ArrowLeft, MoreVertical } from 'lucide-react'
import { messageService } from '../../services/messageService'
import clsx from 'clsx'

interface MessageDetailProps {
  message: Message | null
  onBack: () => void
  onReply: (content: string) => Promise<void>
}

function AttachmentIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8.5 12.5l6.9-6.9a3 3 0 114.2 4.2l-8.5 8.5a5 5 0 01-7.1-7.1l8.5-8.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MessageDetail({ message, onBack, onReply }: MessageDetailProps) {
  const [replyContent, setReplyContent] = useState('')
  const [isSending, setIsSending] = useState(false)

  if (!message) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-text-secondary bg-bg-primary">
        <div className="w-16 h-16 bg-bg-tertiary rounded-full flex items-center justify-center mb-4">
          <Send className="w-8 h-8 text-text-muted" />
        </div>
        <p className="text-lg font-medium">選擇一則訊息開始閱讀</p>
      </div>
    )
  }

  const handleSend = async () => {
    if (!replyContent.trim()) return

    try {
      setIsSending(true)
      await onReply(replyContent)
      setReplyContent('')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-primary transition-colors duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-default">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="md:hidden p-2 hover:bg-bg-tertiary rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {message.subject || '(無主旨)'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <span className="font-medium text-text-primary">
                {message.from_user?.display_name}
              </span>
              <span>&bull;</span>
              <span>{format(new Date(message.created_at), 'PPP p', { locale: zhTW })}</span>
            </div>
          </div>
        </div>

        <button className="p-2 hover:bg-bg-tertiary rounded-full">
          <MoreVertical className="w-5 h-5 text-text-secondary" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="flex gap-4">
          {message.from_user?.avatar_url ? (
            <img
              src={message.from_user.avatar_url}
              alt={message.from_user.display_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-accent-subtle flex items-center justify-center text-accent font-bold">
              {message.from_user?.display_name?.[0] || '?'}
            </div>
          )}

          <div className="flex-1">
            <div className="bg-bg-secondary p-4 rounded-lg rounded-tl-none">
              <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
                {message.content}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reply Area */}
      <div className="p-4 border-t border-border-default bg-bg-secondary">
        <div className="bg-bg-primary rounded-lg border border-border-default shadow-sm overflow-hidden">
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="撰寫回覆..."
            className="w-full p-4 min-h-[100px] resize-none focus:outline-none bg-transparent text-text-primary placeholder:text-text-muted"
          />
          <div className="flex items-center justify-between p-2 bg-bg-secondary border-t border-border-default">
            <div className="flex gap-1">
              <button className="p-2 hover:bg-bg-tertiary rounded-full text-text-secondary">
                <AttachmentIcon className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={!replyContent.trim() || isSending}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors",
                replyContent.trim() && !isSending
                  ? "bg-accent text-white hover:bg-accent-hover"
                  : "bg-bg-tertiary text-text-muted cursor-not-allowed"
              )}
            >
              <Send className="w-4 h-4" />
              {isSending ? '傳送中...' : '傳送'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
