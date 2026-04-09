'use client';

// Horizontal tag filter bar rendered above the table

import { Badge } from '@/components/ui/Badge';

interface PromptTagFilterProps {
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  onClear: () => void;
}

export function PromptTagFilter({ allTags, selectedTags, onToggleTag, onClear }: PromptTagFilterProps) {
  if (!allTags.length) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-text-muted shrink-0">標籤篩選：</span>
      {allTags.map(tag => {
        const isActive = selectedTags.includes(tag);
        return (
          <button key={tag} type="button" onClick={() => onToggleTag(tag)}>
            <Badge
              variant={isActive ? 'info' : 'default'}
              size="sm"
              className={`cursor-pointer transition-colors ${isActive ? 'ring-1 ring-blue-500/40' : 'hover:bg-bg-secondary'}`}
            >
              {tag}
            </Badge>
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-text-muted hover:text-text-primary transition-colors underline"
        >
          清除
        </button>
      )}
    </div>
  );
}
