'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { AlertTriangle, KeyRound, Plus, Save, Trash2 } from 'lucide-react';
import { saveLLMMonitorConfig, type LLMMonitorConfig } from './actions';

interface LLMMonitorBudgetPanelProps {
  initialConfig: LLMMonitorConfig;
  monthSpendUsd: number;
}

function daysUntil(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return null;
  const diff = t - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export default function LLMMonitorBudgetPanel({
  initialConfig,
  monthSpendUsd,
}: LLMMonitorBudgetPanelProps) {
  const [config, setConfig] = useState<LLMMonitorConfig>(initialConfig);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const thresholdUsd = useMemo(
    () => (config.monthlyBudgetUsd * config.alertThresholdPercent) / 100,
    [config.monthlyBudgetUsd, config.alertThresholdPercent],
  );

  const budgetBreached = monthSpendUsd >= thresholdUsd && config.monthlyBudgetUsd > 0;

  const addKeyRow = useCallback(() => {
    setConfig((c) => ({
      ...c,
      providerApiKeys: [
        ...c.providerApiKeys,
        {
          id: `row-${Date.now()}`,
          label: 'New key',
          expiresAt: null,
        },
      ],
    }));
  }, []);

  const removeKeyRow = useCallback((id: string) => {
    setConfig((c) => ({
      ...c,
      providerApiKeys: c.providerApiKeys.filter((k) => k.id !== id),
    }));
  }, []);

  const submit = useCallback(() => {
    setMessage(null);
    startTransition(async () => {
      const res = await saveLLMMonitorConfig(config);
      if (res.ok) {
        setMessage('已儲存設定。');
      } else {
        setMessage(res.error);
      }
    });
  }, [config]);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="rounded-lg border border-[#333333] bg-[#2A2A2A] p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-200">本月 API 花費與預算</h3>
        <p className="text-xs text-gray-500">
          本月迄今（UTC）累計花費與警示門檻。花費來自 <span className="font-mono">ai_usage_logs.cost_usd</span>。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-gray-400">本月花費 (USD)</p>
            <p className="text-xl font-mono text-yellow-400">${monthSpendUsd.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-gray-400">月度預算上限 (USD)</p>
            <input
              type="number"
              min={0}
              step={1}
              className="mt-1 w-full rounded border border-[#444] bg-[#1A1A1A] px-2 py-1 text-white"
              value={config.monthlyBudgetUsd}
              onChange={(e) =>
                setConfig((c) => ({ ...c, monthlyBudgetUsd: Number(e.target.value) || 0 }))
              }
            />
          </div>
          <div>
            <p className="text-gray-400">警示閾值 (% 預算)</p>
            <input
              type="number"
              min={1}
              max={100}
              className="mt-1 w-full rounded border border-[#444] bg-[#1A1A1A] px-2 py-1 text-white"
              value={config.alertThresholdPercent}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  alertThresholdPercent: Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                }))
              }
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          當本月花費 ≥ 預算 × {config.alertThresholdPercent}% ={' '}
          <span className="font-mono text-gray-300">${thresholdUsd.toFixed(2)}</span> 時觸發警示。
        </p>
        {budgetBreached ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-700/60 bg-amber-900/20 px-3 py-2 text-amber-200 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>本月花費已達警示門檻，請檢視用量或調高預算。</span>
          </div>
        ) : null}
      </div>

      <div className="rounded-lg border border-[#333333] bg-[#2A2A2A] p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-gray-200">API 密鑰輪換（到期日前 30 天提醒）</h3>
          </div>
          <button
            type="button"
            onClick={addKeyRow}
            className="inline-flex items-center gap-1 rounded border border-[#444] px-2 py-1 text-xs text-gray-300 hover:bg-[#333]"
          >
            <Plus className="w-3 h-3" />
            新增
          </button>
        </div>
        <p className="text-xs text-gray-500">
          手動維護各供應商金鑰標籤與預定到期日（實際輪換請在供應商後台操作）。此處僅作監控提醒。
        </p>
        <div className="space-y-2">
          {config.providerApiKeys.length === 0 ? (
            <p className="text-sm text-gray-500">尚未設定任何金鑰到期資訊。</p>
          ) : null}
          {config.providerApiKeys.map((row) => {
            const d = daysUntil(row.expiresAt);
            const warn = d != null && d >= 0 && d <= 30;
            return (
              <div
                key={row.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end border border-[#3a3a3a] rounded p-2"
              >
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">標籤</label>
                  <input
                    className="w-full rounded border border-[#444] bg-[#1A1A1A] px-2 py-1 text-sm text-white"
                    value={row.label}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        providerApiKeys: c.providerApiKeys.map((k) =>
                          k.id === row.id ? { ...k, label: e.target.value } : k,
                        ),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 uppercase">到期日</label>
                  <input
                    type="date"
                    className="w-full rounded border border-[#444] bg-[#1A1A1A] px-2 py-1 text-sm text-white"
                    value={row.expiresAt ?? ''}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        providerApiKeys: c.providerApiKeys.map((k) =>
                          k.id === row.id
                            ? { ...k, expiresAt: e.target.value ? e.target.value : null }
                            : k,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="text-xs text-gray-400 pb-1 md:text-right">
                  {d == null ? '—' : d < 0 ? `已過期 ${-d} 天` : `剩餘 ${d} 天`}
                </div>
                <div className="flex gap-1 pb-0.5 justify-end">
                  {warn ? (
                    <span aria-label="30 天內到期">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                    </span>
                  ) : null}
                  <button
                    type="button"
                    aria-label="刪除此列"
                    className="p-1 rounded hover:bg-[#333] text-gray-400"
                    onClick={() => removeKeyRow(row.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={submit}
          className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white"
        >
          <Save className="w-4 h-4" />
          {isPending ? '儲存中…' : '儲存設定'}
        </button>
        {message ? <span className="text-sm text-gray-400">{message}</span> : null}
      </div>
    </div>
  );
}
