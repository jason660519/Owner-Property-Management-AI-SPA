'use client';

// Central state management hook for prompt management page

import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  listSavedPrompts,
  savePrompt,
  updatePrompt,
  deleteSavedPrompt,
  toggleFavorite as toggleFavoriteAction,
} from '@/app/superadmin/settings/evaluations-global-test/promptActions';
import type { SavedPrompt, SavePromptOpts } from './types';
import { DEFAULT_FILTERS, type PromptFilters } from './types';

interface PromptManagerState {
  prompts: SavedPrompt[];
  loading: boolean;
  error: string | null;
  filters: PromptFilters;
  selectedIds: Set<string>;
  editingPrompt: SavedPrompt | null;
  isCreating: boolean;
  sheetOpen: boolean;
}

export function usePromptManager() {
  const [state, setState] = useState<PromptManagerState>({
    prompts: [],
    loading: true,
    error: null,
    filters: DEFAULT_FILTERS,
    selectedIds: new Set(),
    editingPrompt: null,
    isCreating: false,
    sheetOpen: false,
  });

  // Derive all unique tags from prompts
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const p of state.prompts) {
      for (const t of p.tags) tagSet.add(t);
    }
    return Array.from(tagSet).sort();
  }, [state.prompts]);

  // Filtered and sorted prompts
  const filteredPrompts = useMemo(() => {
    let result = state.prompts;

    // Filter by search
    if (state.filters.search) {
      const q = state.filters.search.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(q) ||
             p.content.toLowerCase().includes(q) ||
             p.description.toLowerCase().includes(q) ||
             p.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Filter by tags (AND logic: prompt must have all selected tags)
    if (state.filters.selectedTags.length) {
      result = result.filter(p =>
        state.filters.selectedTags.every(tag => p.tags.includes(tag))
      );
    }

    // Sort
    const { sortField, sortDirection } = state.filters;
    const dir = sortDirection === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sortField === 'is_favorite') {
        // Favorites always first regardless of dir; then by updated_at desc
        if (a.is_favorite !== b.is_favorite) return a.is_favorite ? -1 : 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      if (sortField === 'name') return dir * a.name.localeCompare(b.name, 'zh-TW');
      // updated_at
      return dir * (new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime());
    });

    return result;
  }, [state.prompts, state.filters]);

  // --- Data fetching ---
  const fetchPrompts = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    const result = await listSavedPrompts();
    if (result.error) {
      setState(s => ({ ...s, loading: false, error: result.error ?? null }));
    } else {
      setState(s => ({ ...s, loading: false, prompts: result.data ?? [] }));
    }
  }, []);

  useEffect(() => { fetchPrompts(); }, [fetchPrompts]);

  // --- CRUD ---
  const createPrompt = useCallback(async (
    name: string, content: string, opts?: SavePromptOpts,
  ) => {
    const result = await savePrompt(name, content, opts);
    if (result.error) return result.error;
    if (result.data) {
      setState(s => ({ ...s, prompts: [result.data!, ...s.prompts], sheetOpen: false, isCreating: false }));
    }
    return null;
  }, []);

  const editPrompt = useCallback(async (
    id: string, name: string, content: string, opts?: SavePromptOpts,
  ) => {
    const result = await updatePrompt(id, name, content, opts);
    if (result.error) return result.error;
    if (result.data) {
      setState(s => ({
        ...s,
        prompts: s.prompts.map(p => p.id === id ? result.data! : p),
        sheetOpen: false,
        editingPrompt: null,
      }));
    }
    return null;
  }, []);

  const removePrompt = useCallback(async (id: string) => {
    const result = await deleteSavedPrompt(id);
    if (result.error) return result.error;
    setState(s => ({
      ...s,
      prompts: s.prompts.filter(p => p.id !== id),
      selectedIds: (() => { const next = new Set(s.selectedIds); next.delete(id); return next; })(),
    }));
    return null;
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const prompt = state.prompts.find(p => p.id === id);
    if (!prompt) return;
    const newVal = !prompt.is_favorite;
    // Optimistic update
    setState(s => ({
      ...s,
      prompts: s.prompts.map(p => p.id === id ? { ...p, is_favorite: newVal } : p),
    }));
    const result = await toggleFavoriteAction(id, newVal);
    if (result.error) {
      // Revert on error
      setState(s => ({
        ...s,
        prompts: s.prompts.map(p => p.id === id ? { ...p, is_favorite: !newVal } : p),
      }));
    }
  }, [state.prompts]);

  // --- Sheet ---
  const openEditor = useCallback((prompt?: SavedPrompt) => {
    if (prompt) {
      setState(s => ({ ...s, editingPrompt: prompt, isCreating: false, sheetOpen: true }));
    } else {
      setState(s => ({ ...s, editingPrompt: null, isCreating: true, sheetOpen: true }));
    }
  }, []);

  const closeEditor = useCallback(() => {
    setState(s => ({ ...s, sheetOpen: false, editingPrompt: null, isCreating: false }));
  }, []);

  // --- Filters ---
  const setFilters = useCallback((partial: Partial<PromptFilters>) => {
    setState(s => ({ ...s, filters: { ...s.filters, ...partial } }));
  }, []);

  const clearFilters = useCallback(() => {
    setState(s => ({ ...s, filters: DEFAULT_FILTERS }));
  }, []);

  const toggleTagFilter = useCallback((tag: string) => {
    setState(s => {
      const current = s.filters.selectedTags;
      const next = current.includes(tag)
        ? current.filter(t => t !== tag)
        : [...current, tag];
      return { ...s, filters: { ...s.filters, selectedTags: next } };
    });
  }, []);

  // --- Selection ---
  const toggleSelection = useCallback((id: string) => {
    setState(s => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id); else next.add(id);
      return { ...s, selectedIds: next };
    });
  }, []);

  const selectAll = useCallback(() => {
    setState(s => ({
      ...s,
      selectedIds: new Set(filteredPrompts.map(p => p.id)),
    }));
  }, [filteredPrompts]);

  const clearSelection = useCallback(() => {
    setState(s => ({ ...s, selectedIds: new Set() }));
  }, []);

  return {
    ...state,
    allTags,
    filteredPrompts,
    fetchPrompts,
    createPrompt,
    editPrompt,
    removePrompt,
    toggleFavorite,
    openEditor,
    closeEditor,
    setFilters,
    clearFilters,
    toggleTagFilter,
    toggleSelection,
    selectAll,
    clearSelection,
  };
}
