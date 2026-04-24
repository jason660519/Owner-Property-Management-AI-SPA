import { fireEvent, render, screen } from '@testing-library/react';
import LLMMonitorClient from './LLMMonitorClient';

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

const baseOverall = {
  total_requests: 0,
  avg_latency_ms: 0,
  total_cost: 0,
  avg_feedback: 0,
  models_count: 0,
  error_rate: 0,
  month_spend_usd: 0,
};

const baseConfig = {
  monthlyBudgetUsd: 100,
  alertThresholdPercent: 80,
  providerApiKeys: [] as { id: string; label: string; expiresAt: string | null }[],
};

describe('LLMMonitorClient (AI usage logs)', () => {
  it('renders the AI usage logs table with prompt/model fields', () => {
    window.location.hash = '#ai-usage-logs';
    render(
      <LLMMonitorClient
        overallStats={baseOverall}
        aggregateStats={[]}
        usageLogs={[
          {
            id: 'log-1',
            provider: 'anthropic',
            model_id: 'claude-sonnet-4-6',
            module_key: 'property_description',
            prompt_name: '物件描述文案',
            prompt_source: 'ai_system_prompt',
            prompt_module_key: 'property_description',
            prompt_version: 3,
            final_prompt_hash: 'a'.repeat(64),
            request_path: '/api/property-description/stream',
            response_status: 200,
            tokens_input: 12,
            tokens_output: 34,
            cost_usd: 0,
            duration_ms: 1234,
            status: 'success',
            error_message: null,
            created_at: new Date('2026-04-04T00:00:00.000Z').toISOString(),
          },
        ]}
        monitorConfig={baseConfig}
        dailyTokenSeries={[]}
        weeklyTokenSeries={[]}
        voiceQualitySeries={[]}
      />,
    );

    expect(screen.getByText('AI 使用紀錄')).toBeInTheDocument();
    expect(screen.getByText('property_description')).toBeInTheDocument();
    expect(screen.getByText('anthropic/claude-sonnet-4-6')).toBeInTheDocument();
    expect(screen.getByText(/物件描述文案/)).toBeInTheDocument();
    expect(screen.getByText(/ai_system_prompt/)).toBeInTheDocument();
    expect(screen.getByText(/hash:aaaaaaaaaaaa/)).toBeInTheDocument();
  });

  it('renders the trace console with invocation and evaluation fields', () => {
    window.location.hash = '#trace-console';
    render(
      <LLMMonitorClient
        overallStats={baseOverall}
        aggregateStats={[]}
        usageLogs={[]}
        traceConsoleRows={[
          {
            id: 'trace-row-1',
            created_at: new Date('2026-04-24T00:00:00.000Z').toISOString(),
            source_kind: 'adapter_run',
            page_path: 'superadmin/settings/api_key_and_model_setting#evaluations-global',
            company_name: 'Acme Property',
            module_key: 'ai_model_global_evaluation',
            invocation_name: 'codex_local',
            execution_name: 'http',
            provider: 'openai',
            adapter_id: 'codex_local',
            adapter_model: 'gpt-5.3-codex',
            requested_model: 'gpt-5.3-codex',
            effective_model: 'gpt-5.3-codex',
            input_prompt: null,
            test_prompt: 'Reply with model identity.',
            test_file_name: 'sample.pdf',
            raw_output: '{"text":"ok"}',
            rendered_output: 'ok',
            evaluation_label: 'pass',
            evaluation_score: 1,
            evaluation_message: 'Model self-report matched.',
            ttft_ms: 120,
            e2e_ms: 900,
            throughput_tokens_per_s: 12.5,
            http_status: 200,
            tokens_input: 10,
            tokens_output: 20,
            cost_usd: 0.001,
            status: 'pass',
            error_message: null,
          },
        ]}
        evaluationRuns={[]}
        monitorConfig={baseConfig}
        dailyTokenSeries={[]}
        weeklyTokenSeries={[]}
        voiceQualitySeries={[]}
      />,
    );

    expect(screen.getByText('LLM 調用追蹤')).toBeInTheDocument();
    expect(screen.getByText('Acme Property')).toBeInTheDocument();
    expect(screen.getAllByText('codex_local').length).toBeGreaterThan(0);
    expect(screen.getAllByText('gpt-5.3-codex').length).toBeGreaterThan(0);
    expect(screen.getByText(/Model self-report matched/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看完整 Trace' }));
    expect(screen.getByText('Trace Detail')).toBeInTheDocument();
    expect(screen.getByText('Reply with model identity.')).toBeInTheDocument();
    expect(screen.getByText('sample.pdf')).toBeInTheDocument();
  });
});
