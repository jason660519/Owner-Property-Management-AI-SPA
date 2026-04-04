import { render, screen } from '@testing-library/react';
import LLMMonitorClient from './LLMMonitorClient';

describe('LLMMonitorClient (AI usage logs)', () => {
  it('renders the AI usage logs table with prompt/model fields', () => {
    render(
      <LLMMonitorClient
        overallStats={{
          total_requests: 0,
          avg_latency_ms: 0,
          total_cost: 0,
          avg_feedback: 0,
          models_count: 0,
        }}
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
      />,
    );

    expect(screen.getByText('AI 使用紀錄（含 Prompt / 模組 / 狀態）')).toBeInTheDocument();
    expect(screen.getByText('property_description')).toBeInTheDocument();
    expect(screen.getByText('anthropic/claude-sonnet-4-6')).toBeInTheDocument();
    expect(screen.getByText(/物件描述文案/)).toBeInTheDocument();
    expect(screen.getByText(/ai_system_prompt/)).toBeInTheDocument();
    expect(screen.getByText(/hash:aaaaaaaaaaaa/)).toBeInTheDocument();
  });
});

