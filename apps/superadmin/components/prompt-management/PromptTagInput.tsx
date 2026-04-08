'use client';

// Tag editor component: displays chips with remove, text input with autocomplete

import { useState, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface PromptTagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  allTags: string[];
  placeholder?: string;
}

const MAX_TAG_LENGTH = 30;

export function PromptTagInput({ tags, onChange, allTags, placeholder = '輸入標籤後按 Enter' }: PromptTagInputProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = input.trim()
    ? allTags.filter(t => t.toLowerCase().includes(input.trim().toLowerCase()) && !tags.includes(t))
    : [];

  const addTag = useCallback((tag: string) => {
    const trimmed = tag.trim().slice(0, MAX_TAG_LENGTH);
    if (!trimmed || tags.includes(trimmed)) return;
    onChange([...tags, trimmed]);
    setInput('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, [tags, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange(tags.filter(t => t !== tag));
  }, [tags, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (input.trim()) addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length) {
      removeTag(tags[tags.length - 1]);
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1.5 p-2 border border-border-default rounded-md bg-bg-primary min-h-[38px]">
        {tags.map(tag => (
          <Badge key={tag} variant="info" size="sm" className="gap-1 cursor-default">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-blue-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
          maxLength={MAX_TAG_LENGTH}
        />
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-40 overflow-y-auto rounded-md border border-border-default bg-bg-primary shadow-lg">
          {suggestions.slice(0, 8).map(tag => (
            <button
              key={tag}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => addTag(tag)}
              className="w-full px-3 py-1.5 text-left text-sm text-text-primary hover:bg-bg-secondary transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
