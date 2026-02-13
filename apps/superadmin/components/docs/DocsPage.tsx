'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, PanelLeftClose, PanelLeftOpen, RefreshCw, Loader2, Pencil, Save, X } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { FileTree, type TreeNode } from './FileTree';
import { MarkdownViewer } from './MarkdownViewer';
import { SearchBar, type DocsScope } from './SearchBar';

interface FileContent {
  content: string;
  path: string;
  name: string;
  lastModified: string;
  size: number;
}

export function DocsPage() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [isLoadingTree, setIsLoadingTree] = useState(true);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [scope, setScope] = useState<DocsScope>('docs');
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch file tree
  const fetchTree = useCallback(async () => {
    try {
      setIsLoadingTree(true);
      setError(null);
      const res = await fetch(`/api/docs/tree?scope=${scope}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error ?? 'Failed to load docs tree';
        throw new Error(typeof msg === 'string' ? msg : '無法載入文件目錄');
      }
      setTree(data.tree ?? []);
      setTotalFiles(data.totalFiles ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入文件目錄');
      setTree([]);
      setTotalFiles(0);
      console.error('[DocsPage] fetchTree:', err);
    } finally {
      setIsLoadingTree(false);
    }
  }, [scope]);

  // Fetch file content
  const fetchContent = useCallback(async (filePath: string) => {
    try {
      setIsLoadingContent(true);
      setError(null);
      const res = await fetch(
        `/api/docs/content?path=${encodeURIComponent(filePath)}&scope=${scope}`
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error ?? 'Failed to load file';
        throw new Error(typeof msg === 'string' ? msg : '無法載入文件內容');
      }
      setFileContent(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '無法載入文件內容');
      setFileContent(null);
      console.error('[DocsPage] fetchContent:', err);
    } finally {
      setIsLoadingContent(false);
    }
  }, [scope]);

  // Handle file selection
  const handleSelect = useCallback((path: string) => {
    setSelectedPath(path);
    setEditMode(false);
    setSaveWarning(null);
    fetchContent(path);
  }, [fetchContent]);

  const canEdit =
    fileContent &&
    (scope === 'project' || /\.(md|txt|json)$/i.test(fileContent.path));
  const handleStartEdit = useCallback(() => {
    if (fileContent) {
      setEditedContent(fileContent.content);
      setEditMode(true);
      setError(null);
      setSaveWarning(null);
    }
  }, [fileContent]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    setEditedContent('');
    setError(null);
    setSaveWarning(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedPath) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/docs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedPath,
          content: editedContent,
          scope,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error ?? '儲存失敗';
        throw new Error(typeof msg === 'string' ? msg : '儲存失敗');
      }
      setEditMode(false);
      setEditedContent('');
      setError(null);
      setSaveWarning(data?.warning ?? null);
      fetchContent(selectedPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗');
      console.error('[DocsPage] save:', err);
    } finally {
      setIsSaving(false);
    }
  }, [selectedPath, editedContent, scope, fetchContent]);

  // SSE for live sync
  useEffect(() => {
    const es = new EventSource(`/api/docs/watch?scope=${scope}`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.event === 'connected') {
          setLiveConnected(true);
          return;
        }
        if (data.event === 'error') {
          setLiveConnected(false);
          return;
        }

        // On any file change, refresh tree
        if (['add', 'unlink', 'addDir', 'unlinkDir'].includes(data.event)) {
          fetchTree();
        }

        // If the changed file is currently viewed, refresh content
        if (data.event === 'change' && selectedPath && data.path === selectedPath) {
          fetchContent(selectedPath);
        }

        // If a viewed file was deleted, clear content
        if (data.event === 'unlink' && selectedPath && data.path === selectedPath) {
          setFileContent(null);
          setSelectedPath(null);
        }
      } catch {
        // Ignore parse errors (e.g., heartbeat comments)
      }
    };

    es.onerror = () => {
      setLiveConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [scope, fetchTree, fetchContent, selectedPath]);

  // When scope changes: clear selection and refetch tree
  const handleScopeChange = useCallback((newScope: DocsScope) => {
    setScope(newScope);
    setSelectedPath(null);
    setFileContent(null);
    setEditMode(false);
    setEditedContent('');
    setError(null);
    setSaveWarning(null);
  }, []);

  // Initial tree load and when scope changes
  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0 rounded-xl border border-border-default overflow-hidden bg-bg-primary">
      {/* Sidebar */}
      <div
        className={twMerge(
          "flex flex-col border-r border-border-default bg-bg-secondary transition-all duration-300 overflow-hidden",
          sidebarOpen ? "w-72 min-w-72" : "w-0 min-w-0"
        )}
      >
        {/* Sidebar header */}
        <div className="p-3 border-b border-border-default space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" />
              <span className="text-sm font-semibold text-text-primary">
                {scope === 'docs' ? '文件目錄' : '專案檔案'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
                {totalFiles} 檔案
              </span>
              <div className={twMerge(
                "w-2 h-2 rounded-full",
                liveConnected ? "bg-emerald-500" : "bg-red-400"
              )} title={liveConnected ? '即時同步中' : '連線中斷'} />
            </div>
          </div>
          <div className="flex rounded-lg bg-bg-tertiary p-0.5 border border-border-default">
            <button
              type="button"
              onClick={() => handleScopeChange('project')}
              className={twMerge(
                "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors",
                scope === 'project'
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              專案檔案
            </button>
            <button
              type="button"
              onClick={() => handleScopeChange('docs')}
              className={twMerge(
                "flex-1 py-1.5 text-xs font-medium rounded-md transition-colors",
                scope === 'docs'
                  ? "bg-accent text-white"
                  : "text-text-muted hover:text-text-primary"
              )}
            >
              專案文件
            </button>
          </div>
          <SearchBar onSelect={handleSelect} scope={scope} />
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 scrollbar-thin">
          {isLoadingTree ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            </div>
          ) : (
            <FileTree
              nodes={tree}
              selectedPath={selectedPath}
              onSelect={handleSelect}
            />
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Content toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border-default bg-bg-secondary/50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
            title={sidebarOpen ? '收合側欄' : '展開側欄'}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>

          {selectedPath && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted overflow-hidden">
              {selectedPath.split('/').map((segment, i, arr) => (
                <React.Fragment key={i}>
                  {i > 0 && <span className="text-text-muted/50">/</span>}
                  <span className={i === arr.length - 1 ? "text-text-primary font-medium truncate" : "truncate"}>
                    {segment}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {selectedPath && !editMode && (
              <button
                onClick={() => fetchContent(selectedPath)}
                className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                title="重新載入"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            {canEdit && !editMode && (
              <button
                onClick={handleStartEdit}
                className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors"
                title="編輯"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="p-1.5 rounded-md hover:bg-bg-tertiary text-text-muted hover:text-text-primary transition-colors disabled:opacity-50"
                  title="取消"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-1.5 rounded-md bg-accent text-white hover:opacity-90 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  title="儲存"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span className="text-xs font-medium">儲存</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          {saveWarning && !error && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-600 dark:text-amber-400">{saveWarning}</p>
            </div>
          )}

          {isLoadingContent ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-text-muted animate-spin" />
            </div>
          ) : fileContent && editMode ? (
            <div className="max-w-4xl mx-auto flex flex-col h-full">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="flex-1 w-full min-h-[400px] p-4 rounded-lg bg-bg-secondary border border-border-default text-text-primary text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
                placeholder="Markdown 或純文字內容..."
                spellCheck={false}
              />
            </div>
          ) : fileContent ? (
            <div className="max-w-4xl mx-auto">
              {/\.(md|mdx)$/i.test(fileContent.name) ? (
                <MarkdownViewer
                  content={fileContent.content}
                  fileName={fileContent.name}
                  lastModified={fileContent.lastModified}
                />
              ) : (
                <div className="w-full">
                  <div className="flex items-center justify-between px-1 pb-4 mb-6 border-b border-border-default">
                    <h1 className="text-xl font-bold text-text-primary font-heading truncate">
                      {fileContent.name}
                    </h1>
                    {fileContent.lastModified && (
                      <span className="text-xs text-text-muted flex-shrink-0 ml-2">
                        最後修改：{new Date(fileContent.lastModified).toLocaleString('zh-TW')}
                      </span>
                    )}
                  </div>
                  <pre className="p-4 rounded-lg bg-bg-secondary border border-border-default text-text-primary text-sm font-mono whitespace-pre-wrap break-words overflow-x-auto">
                    {fileContent.content}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-4">
                <BookOpen className="w-8 h-8 text-text-muted" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">專案文件瀏覽器</h3>
              <p className="text-sm text-text-muted max-w-sm">
                從左側目錄選擇一個文件開始閱讀，或使用搜尋功能找到你需要的內容。
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
                <div className={twMerge(
                  "w-2 h-2 rounded-full",
                  liveConnected ? "bg-emerald-500" : "bg-red-400"
                )} />
                <span>{liveConnected ? '即時同步已連線' : '即時同步連線中...'}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
