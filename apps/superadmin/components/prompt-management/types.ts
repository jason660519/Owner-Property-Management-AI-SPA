// Shared types and constants for prompt management components

export type { SavedPrompt, SavePromptOpts } from '@/app/superadmin/settings/evaluations-global-test/promptActions';

export const PROMPT_LOAD_MESSAGE_TYPE = 'PROMPT_LOAD';

export type PromptSortField = 'name' | 'updated_at' | 'is_favorite';
export type PromptSortDirection = 'asc' | 'desc';

export interface PromptFilters {
  search: string;
  selectedTags: string[];
  sortField: PromptSortField;
  sortDirection: PromptSortDirection;
}

export const DEFAULT_FILTERS: PromptFilters = {
  search: '',
  selectedTags: [],
  sortField: 'updated_at',
  sortDirection: 'desc',
};
