'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Search, X, FileText, Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface SearchMatch {
  line: number;
  text: string;
}

interface SearchResult {
  path: string;
  name: string;
  matches: SearchMatch[];
}

export type DocsScope = 'docs' | 'project';

interface SearchBarProps {
  onSelect: (path: string) => void;
  scope?: DocsScope;
}

export function SearchBar({ onSelect, scope = 'docs' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `/api/docs/search?q=${encodeURIComponent(q.trim())}&scope=${scope}`
      );
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResults(Array.isArray(data.results) ? data.results : []);
        setIsOpen(Array.isArray(data.results) && data.results.length > 0);
      } else {
        setResults([]);
        setIsOpen(true);
        console.warn('[SearchBar] Search API error:', data?.error ?? res.status);
      }
    } catch (err) {
      setResults([]);
      console.error('[SearchBar] Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [scope]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleResultClick = (path: string) => {
    onSelect(path);
    setIsOpen(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="搜尋文件..."
          className="w-full pl-9 pr-8 py-2 rounded-lg bg-bg-tertiary border border-border-default text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-colors"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-bg-secondary transition-colors"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
            ) : (
              <X className="w-4 h-4 text-text-muted" />
            )}
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 max-h-80 overflow-y-auto bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50">
          {results.map((result) => (
            <button
              key={result.path}
              onClick={() => handleResultClick(result.path)}
              className="w-full text-left px-3 py-2.5 hover:bg-bg-tertiary transition-colors border-b border-border-default last:border-b-0"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                <span className="text-sm font-medium text-text-primary truncate">
                  {result.name}
                </span>
                <span className="text-xs text-text-muted ml-auto flex-shrink-0">
                  {result.matches.length} 處匹配
                </span>
              </div>
              <p className="text-xs text-text-muted pl-5.5 truncate">
                {result.path}
              </p>
              {result.matches[0] && (
                <p className="text-xs text-text-secondary pl-5.5 mt-1 truncate">
                  L{result.matches[0].line}: {highlightMatch(result.matches[0].text, query)}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      {isOpen && results.length === 0 && !isSearching && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary border border-border-default rounded-lg shadow-xl z-50 p-4 text-center">
          <p className="text-sm text-text-muted">找不到匹配結果</p>
        </div>
      )}
    </div>
  );
}
