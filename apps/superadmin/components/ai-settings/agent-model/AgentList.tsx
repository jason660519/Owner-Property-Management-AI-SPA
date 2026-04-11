'use client';

import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { AgentDef } from '@/lib/ai/agent-registry';
import { getAgentsByGroup } from '@/lib/ai/agent-registry';
import type { AgentAssignment } from '@/lib/types/agent-assignment';

export interface AgentListProps {
  selectedAgentKey: string | null;
  onSelect: (agentKey: string) => void;
  assignmentsByKey: Record<string, AgentAssignment>;
  /** Optional: map provider id → human-readable name. */
  getProviderName?: (providerId: string) => string;
}

/**
 * Left rail listing all agents grouped by `AgentGroup`. Each row shows:
 *   - Icon + label + description
 *   - A small badge showing the currently-assigned primary model (or "未設定")
 *   - Highlight when it's the selected row
 */
export function AgentList({
  selectedAgentKey,
  onSelect,
  assignmentsByKey,
  getProviderName,
}: AgentListProps) {
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const groups = React.useMemo(() => getAgentsByGroup(), []);

  const renderBadge = (agent: AgentDef) => {
    const assignment = assignmentsByKey[agent.key];
    if (!assignment) {
      return (
        <span className="ml-auto text-[10px] text-text-muted bg-bg-tertiary px-1.5 py-0.5 rounded">
          未設定
        </span>
      );
    }
    const providerName = getProviderName
      ? getProviderName(assignment.primary_provider)
      : assignment.primary_provider;
    return (
      <span
        className="ml-auto text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded truncate max-w-[90px]"
        title={`${providerName} / ${assignment.primary_model_id}`}
      >
        {providerName}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-1 overflow-y-auto" data-testid="agent-list">
      {groups.map(({ group, meta, agents }) => {
        const isCollapsed = collapsed[group] ?? false;
        return (
          <div key={group} className="mb-2">
            <button
              type="button"
              onClick={() => setCollapsed((c) => ({ ...c, [group]: !isCollapsed }))}
              className="w-full flex items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-muted hover:text-text-primary"
            >
              {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span>{meta.label}</span>
              <span className="ml-auto text-text-muted/70">{agents.length}</span>
            </button>
            {!isCollapsed && (
              <ul className="flex flex-col gap-0.5">
                {agents.map((agent) => {
                  const Icon = agent.icon;
                  const isSelected = agent.key === selectedAgentKey;
                  return (
                    <li key={agent.key}>
                      <button
                        type="button"
                        onClick={() => onSelect(agent.key)}
                        data-testid={`agent-item-${agent.key}`}
                        className={[
                          'w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors',
                          isSelected
                            ? 'bg-emerald-600/10 border border-emerald-600/40'
                            : 'hover:bg-bg-tertiary/60 border border-transparent',
                        ].join(' ')}
                      >
                        <Icon
                          size={14}
                          className={isSelected ? 'text-emerald-600' : 'text-text-muted'}
                        />
                        <div className="flex flex-col min-w-0 flex-1">
                          <span
                            className={[
                              'text-xs font-medium truncate',
                              isSelected ? 'text-text-primary' : 'text-text-secondary',
                            ].join(' ')}
                          >
                            {agent.label}
                          </span>
                          <span className="text-[10px] text-text-muted truncate">
                            {agent.description}
                          </span>
                        </div>
                        {renderBadge(agent)}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
