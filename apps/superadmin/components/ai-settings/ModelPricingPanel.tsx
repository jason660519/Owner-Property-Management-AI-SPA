'use client';

import React from 'react';
import { ExternalLink } from 'lucide-react';

interface ModelPriceRow {
  model: string;
  inputPer1M: string;
  outputPer1M: string;
  notes?: string;
}

interface ProviderSection {
  name: string;
  color: string;
  docsUrl: string;
  models: ModelPriceRow[];
}

const PRICING_DATA: ProviderSection[] = [
  {
    name: 'Anthropic (Claude)',
    color: 'text-orange-400',
    docsUrl: 'https://www.anthropic.com/pricing',
    models: [
      { model: 'claude-opus-4-7', inputPer1M: '$15.00', outputPer1M: '$75.00' },
      { model: 'claude-sonnet-4-6', inputPer1M: '$3.00', outputPer1M: '$15.00' },
      { model: 'claude-haiku-4-5', inputPer1M: '$0.80', outputPer1M: '$4.00' },
    ],
  },
  {
    name: 'OpenAI',
    color: 'text-green-400',
    docsUrl: 'https://openai.com/api/pricing/',
    models: [
      { model: 'gpt-4o', inputPer1M: '$2.50', outputPer1M: '$10.00' },
      { model: 'gpt-4o-mini', inputPer1M: '$0.15', outputPer1M: '$0.60' },
      { model: 'gpt-5.3-codex', inputPer1M: '$3.00', outputPer1M: '$12.00', notes: 'Codex 系列' },
    ],
  },
  {
    name: 'Google (Gemini)',
    color: 'text-blue-400',
    docsUrl: 'https://ai.google.dev/pricing',
    models: [
      { model: 'gemini-2.5-pro', inputPer1M: '$1.25', outputPer1M: '$10.00', notes: '> 200k tokens $2.50/$15.00' },
      { model: 'gemini-2.5-flash', inputPer1M: '$0.15', outputPer1M: '$0.60', notes: '思考模式另計' },
      { model: 'gemini-2.0-flash', inputPer1M: '$0.10', outputPer1M: '$0.40' },
    ],
  },
  {
    name: 'OpenRouter (聚合)',
    color: 'text-purple-400',
    docsUrl: 'https://openrouter.ai/models',
    models: [
      { model: 'qwen/qwen3-235b-a22b', inputPer1M: '$0.14', outputPer1M: '$0.60' },
      { model: 'minimax/minimax-m2.5', inputPer1M: '$0.20', outputPer1M: '$0.80', notes: '透過 opencode/ 前綴路由' },
      { model: 'x-ai/grok-3-beta', inputPer1M: '$3.00', outputPer1M: '$15.00' },
    ],
  },
];

export function ModelPricingPanel() {
  return (
    <div className="flex flex-col gap-6 p-4 lg:p-6 max-w-5xl">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">模型費用說明</h2>
        <p className="text-sm text-text-muted mt-1">
          各 AI 供應商目前定價（單位：USD / 1M tokens）。實際帳單以各供應商官網為準。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {PRICING_DATA.map((provider) => (
          <div
            key={provider.name}
            className="rounded-xl border border-border-subtle bg-bg-secondary p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className={`font-semibold text-sm ${provider.color}`}>{provider.name}</h3>
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                官方定價
                <ExternalLink size={11} />
              </a>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-1 text-text-muted font-medium">模型</th>
                  <th className="text-right py-1 text-text-muted font-medium">輸入</th>
                  <th className="text-right py-1 text-text-muted font-medium">輸出</th>
                </tr>
              </thead>
              <tbody>
                {provider.models.map((row) => (
                  <tr key={row.model} className="border-b border-border-subtle/50 last:border-0">
                    <td className="py-1.5 pr-2 text-text-primary font-mono leading-tight">
                      <div>{row.model}</div>
                      {row.notes && (
                        <div className="text-text-muted text-[10px]">{row.notes}</div>
                      )}
                    </td>
                    <td className="py-1.5 text-right text-text-secondary tabular-nums">{row.inputPer1M}</td>
                    <td className="py-1.5 text-right text-text-secondary tabular-nums">{row.outputPer1M}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <p className="text-xs text-text-muted">
        * Prompt Cache（prompt caching）可大幅降低輸入費用，Anthropic / Google 分別提供 90% / 75% 折扣。詳見各供應商文件。
      </p>
    </div>
  );
}
