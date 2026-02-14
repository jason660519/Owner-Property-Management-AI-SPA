'use client';

import React, { useState } from 'react';
import { ChevronRight, Folder, FolderOpen, FileText, File } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

interface FileTreeProps {
  nodes: TreeNode[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  level?: number;
}

function TreeItem({ 
  node, 
  selectedPath, 
  onSelect,
  level = 0,
}: { 
  node: TreeNode; 
  selectedPath: string | null; 
  onSelect: (path: string) => void;
  level: number;
}) {
  const [isOpen, setIsOpen] = useState(level === 0);
  const isSelected = selectedPath === node.path;
  const isDir = node.type === 'directory';
  const hasChildren = isDir && node.children && node.children.length > 0;

  const getFileIcon = (name: string) => {
    if (name.endsWith('.md')) return <FileText className="w-4 h-4 flex-shrink-0 text-blue-400" />;
    return <File className="w-4 h-4 flex-shrink-0 text-text-muted" />;
  };

  return (
    <div>
      <button
        className={twMerge(
          "w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm transition-colors duration-150 text-left",
          isSelected
            ? "bg-accent/10 text-accent font-medium"
            : "text-text-secondary hover:bg-bg-tertiary hover:text-text-primary"
        )}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => {
          if (isDir) {
            setIsOpen(!isOpen);
          } else {
            onSelect(node.path);
          }
        }}
        title={node.path}
      >
        {isDir ? (
          <ChevronRight 
            className={twMerge(
              "w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 text-text-muted",
              isOpen && "rotate-90"
            )} 
          />
        ) : (
          <span className="w-3.5" />
        )}
        
        {isDir ? (
          isOpen ? (
            <FolderOpen className="w-4 h-4 flex-shrink-0 text-yellow-500" />
          ) : (
            <Folder className="w-4 h-4 flex-shrink-0 text-yellow-600" />
          )
        ) : (
          getFileIcon(node.name)
        )}
        
        <span className="truncate">{node.name}</span>
      </button>

      {isDir && isOpen && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeItem
              key={child.path}
              node={child}
              selectedPath={selectedPath}
              onSelect={onSelect}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree({ nodes, selectedPath, onSelect, level = 0 }: FileTreeProps) {
  return (
    <div className="space-y-0.5">
      {nodes.map((node) => (
        <TreeItem
          key={node.path}
          node={node}
          selectedPath={selectedPath}
          onSelect={onSelect}
          level={level}
        />
      ))}
    </div>
  );
}
