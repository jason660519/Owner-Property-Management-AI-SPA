// Utilities for importing/exporting prompts as .md files with frontmatter

import type { SavedPrompt } from './types';

interface ParsedPrompt {
  name: string;
  content: string;
  tags: string[];
  description: string;
}

/**
 * Parse a .md file with optional YAML-like frontmatter into prompt fields.
 * Frontmatter format:
 * ---
 * name: ...
 * tags: tag1, tag2
 * description: ...
 * ---
 * <content>
 */
export async function parseImportedMd(file: File): Promise<ParsedPrompt> {
  const text = await file.text();
  const nameFromFile = file.name.replace(/\.(md|txt)$/i, '');

  // Check for frontmatter
  if (!text.startsWith('---')) {
    return { name: nameFromFile, content: text.trim(), tags: [], description: '' };
  }

  const endIdx = text.indexOf('---', 3);
  if (endIdx === -1) {
    return { name: nameFromFile, content: text.trim(), tags: [], description: '' };
  }

  const frontmatter = text.slice(3, endIdx).trim();
  const content = text.slice(endIdx + 3).trim();

  let name = nameFromFile;
  let tags: string[] = [];
  let description = '';

  for (const line of frontmatter.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    if (key === 'name' && value) name = value;
    if (key === 'tags' && value) {
      tags = value.split(',').map(t => t.trim()).filter(Boolean);
    }
    if (key === 'description' && value) description = value;
  }

  return { name, content, tags, description };
}

/** Sanitize a string for use as a filename */
function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_').slice(0, 100);
}

/** Generate .md content with frontmatter for a prompt */
function toMdContent(prompt: Pick<SavedPrompt, 'name' | 'content' | 'tags' | 'description'>): string {
  const lines = ['---', `name: ${prompt.name}`];
  if (prompt.tags.length) lines.push(`tags: ${prompt.tags.join(', ')}`);
  if (prompt.description) lines.push(`description: ${prompt.description}`);
  lines.push('---', '', prompt.content);
  return lines.join('\n');
}

/** Download a single prompt as .md */
export function exportPromptAsMd(prompt: SavedPrompt): void {
  const content = toMdContent(prompt);
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFilename(prompt.name)}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download multiple prompts as individual .md files */
export function exportPromptsAsMd(prompts: SavedPrompt[]): void {
  for (const prompt of prompts) {
    exportPromptAsMd(prompt);
  }
}
