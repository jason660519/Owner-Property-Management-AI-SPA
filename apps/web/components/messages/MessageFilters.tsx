import { Search } from 'lucide-react'
import { clsx } from 'clsx'
import { MessageFilter } from '../../types/message'

interface MessageFiltersProps {
  filter: MessageFilter
  onFilterChange: (filter: MessageFilter) => void
}

export function MessageFilters({ filter, onFilterChange }: MessageFiltersProps) {
  const categories: { id: NonNullable<MessageFilter['type']>; label: string }[] = [
    { id: 'all', label: '全部訊息' },
    { id: 'unread', label: '未讀' },
    { id: 'starred', label: '星標' }, // Future feature
  ]

  return (
    <div className="p-4 border-b border-border-default space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          placeholder="搜尋訊息..."
          value={filter.search || ''}
          onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border-none rounded-lg text-sm focus:ring-2 focus:ring-accent text-text-primary placeholder:text-text-muted"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onFilterChange({ ...filter, type: cat.id })}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              (filter.type || 'all') === cat.id
                ? 'bg-accent-subtle text-accent'
                : 'bg-bg-tertiary text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  )
}
