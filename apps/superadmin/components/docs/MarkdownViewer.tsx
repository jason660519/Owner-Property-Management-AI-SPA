'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownViewerProps {
  content: string;
  fileName?: string;
  lastModified?: string;
}

export function MarkdownViewer({ content, fileName, lastModified }: MarkdownViewerProps) {
  return (
    <div className="w-full">
      {/* File header */}
      {fileName && (
        <div className="flex items-center justify-between px-1 pb-4 mb-6 border-b border-border-default">
          <h1 className="text-xl font-bold text-text-primary font-heading">
            {fileName.replace(/\.md$/, '')}
          </h1>
          {lastModified && (
            <span className="text-xs text-text-muted">
              最後修改：{new Date(lastModified).toLocaleString('zh-TW')}
            </span>
          )}
        </div>
      )}

      {/* Markdown content */}
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight]}
        >
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
