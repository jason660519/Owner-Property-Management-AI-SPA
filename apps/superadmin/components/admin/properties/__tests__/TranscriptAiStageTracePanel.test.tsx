import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { TranscriptAiStageTracePanel } from '../TranscriptAiStageTracePanel';

const baseRun = {
  status: 'parsing',
  currentPhase: 'parsing',
  detectionResult: {},
  parsedResult: {},
  reviewResult: {},
  createdAt: new Date().toISOString(),
  updatedAt: '',
  completedAt: null,
};

afterEach(() => {
  jest.useRealTimers();
  cleanup();
});

describe('TranscriptAiStageTracePanel', () => {
  it('shows the parse model while parse is running', () => {
    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      parsedResult: {
        aiStageTrace: [{
          stage: 'parse',
          label: 'Parse 正式擷取',
          status: 'skipped',
          engine: 'vlm_ai',
          durationMs: null,
          agentKey: 'transcript_visual_parse',
          moduleKey: 'transcript.parse',
          models: [{ provider: 'anthropic', model: 'claude-opus-4-20250514', role: 'parse' }],
          summary: ['等待正式解析開始'],
          corrections: [],
          warnings: [],
        }],
      },
    }} />);

    expect(screen.getByText('Parse 正式擷取')).toBeInTheDocument();
    expect(screen.getByText('處理中 · vlm_ai')).toBeInTheDocument();
    expect(screen.getByText('parse: anthropic/claude-opus-4-20250514')).toBeInTheDocument();
    expect(screen.getByText(/已花費/)).toBeInTheDocument();
  });

  it('infers active parser timers for the first three pending candidates only', () => {
    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      parsedResult: {
        aiStageTrace: [{
          stage: 'parse',
          label: 'Parse 正式擷取',
          status: 'skipped',
          engine: 'vlm_ai',
          durationMs: null,
          agentKey: 'transcript_visual_parse',
          moduleKey: 'transcript.parse',
          models: [
            { provider: 'openai', model: 'gpt-5.5', role: 'parse', status: 'pending' },
            { provider: 'gemini', model: 'gemini-3.1-pro-preview', role: 'parse', status: 'pending' },
            { provider: 'anthropic', model: 'claude-opus-4-5', role: 'parse', status: 'pending' },
            { provider: 'gemini', model: 'gemini-1.5-pro', role: 'parse', status: 'pending' },
          ],
          summary: ['等待正式解析開始'],
          corrections: [],
          warnings: [],
        }],
      },
    }} />);

    expect(screen.getAllByText(/工作中/)).toHaveLength(3);
    expect(screen.getByText('Parser 正在解析上傳文件')).toBeInTheDocument();
    expect(screen.getByText('parse: gemini/gemini-1.5-pro')).toBeInTheDocument();
  });

  it('shows the review model while verify review is running', () => {
    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      status: 'reviewing',
      currentPhase: 'reviewing',
      parsedResult: {
        aiStageTrace: [{
          stage: 'verify_review',
          label: 'Verify / Review 驗證審查',
          status: 'skipped',
          engine: 'vlm_ai',
          durationMs: null,
          agentKey: 'transcript_audit',
          moduleKey: 'transcript.intake.review',
          models: [{ provider: 'anthropic', model: 'claude-sonnet-4-5', role: 'review' }],
          summary: ['等待驗證審查開始'],
          corrections: [],
          warnings: [],
        }],
      },
    }} />);

    expect(screen.getByText('Verify / Review 驗證審查')).toBeInTheDocument();
    expect(screen.getByText('review: anthropic/claude-sonnet-4-5')).toBeInTheDocument();
    expect(screen.getByText('處理中 · vlm_ai')).toBeInTheDocument();
    expect(screen.getByText(/已花費/)).toBeInTheDocument();
  });

  it('infers active reviewer timers for the first three pending candidates only', () => {
    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      status: 'reviewing',
      currentPhase: 'reviewing',
      parsedResult: {
        aiStageTrace: [{
          stage: 'verify_review',
          label: 'Verify / Review 驗證審查',
          status: 'skipped',
          engine: 'vlm_ai',
          durationMs: null,
          agentKey: 'transcript_audit',
          moduleKey: 'transcript.intake.review',
          models: [
            { provider: 'openai', model: 'gpt-5.5', role: 'review', status: 'pending' },
            { provider: 'anthropic', model: 'claude-opus-4-5', role: 'review', status: 'pending' },
            { provider: 'grok', model: 'grok-4.20-reasoning', role: 'review', status: 'pending' },
            { provider: 'openai', model: 'gpt-5.3-chat-latest', role: 'review', status: 'pending' },
          ],
          summary: ['等待驗證審查開始'],
          corrections: [],
          warnings: [],
        }],
      },
    }} />);

    expect(screen.getAllByText(/工作中/)).toHaveLength(3);
    expect(screen.getByText('Reviewer 正在審查 parser 報告')).toBeInTheDocument();
    expect(screen.getByText('review: openai/gpt-5.3-chat-latest')).toBeInTheDocument();
  });

  it('freezes completed parser durations while the parse stage is still running', () => {
    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      parsedResult: {
        aiStageTrace: [{
          stage: 'parse',
          label: 'Parse 正式擷取',
          status: 'skipped',
          engine: 'vlm_ai',
          durationMs: null,
          agentKey: 'transcript_visual_parse',
          moduleKey: 'transcript.parse',
          models: [
            { provider: 'openai', model: 'gpt-5.5', role: 'parse', status: 'success', durationMs: 46400 },
            { provider: 'gemini', model: 'gemini-3.1-pro-preview', role: 'parse', status: 'running' },
          ],
          summary: ['等待正式解析開始'],
          corrections: [],
          warnings: [],
        }],
      },
    }} />);

    expect(screen.getByText('parse: openai/gpt-5.5')).toBeInTheDocument();
    expect(screen.getByText('花費 46.4 秒')).toBeInTheDocument();
    expect(screen.getByText('parse: gemini/gemini-3.1-pro-preview')).toBeInTheDocument();
    expect(screen.getByText(/工作中/)).toBeInTheDocument();
  });

  it('uses each running parser model start time instead of the longest stage time', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-28T10:00:10.000Z'));

    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      createdAt: '2026-04-28T10:00:00.000Z',
      parsedResult: {
        aiStageTrace: [{
          stage: 'parse',
          label: 'Parse 正式擷取',
          status: 'skipped',
          engine: 'vlm_ai',
          durationMs: null,
          agentKey: 'transcript_visual_parse',
          moduleKey: 'transcript.parse',
          models: [
            { provider: 'openai', model: 'gpt-5.5', role: 'parse', status: 'running', startedAt: '2026-04-28T10:00:01.000Z' },
            { provider: 'gemini', model: 'gemini-3.1-pro-preview', role: 'parse', status: 'running', startedAt: '2026-04-28T10:00:07.000Z' },
          ],
          summary: ['等待正式解析開始'],
          corrections: [],
          warnings: [],
        }],
      },
    }} />);

    expect(screen.getByText('parse: openai/gpt-5.5')).toBeInTheDocument();
    expect(screen.getByText('工作中 9.0 秒')).toBeInTheDocument();
    expect(screen.getByText('parse: gemini/gemini-3.1-pro-preview')).toBeInTheDocument();
    expect(screen.getByText('工作中 3.0 秒')).toBeInTheDocument();
  });

  it('uses each running reviewer model start time independently', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-28T10:01:20.000Z'));

    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      status: 'reviewing',
      currentPhase: 'reviewing',
      createdAt: '2026-04-28T10:00:00.000Z',
      parsedResult: {
        aiStageTrace: [{
          stage: 'verify_review',
          label: 'Verify / Review 驗證審查',
          status: 'skipped',
          engine: 'vlm_ai',
          durationMs: null,
          agentKey: 'transcript_audit',
          moduleKey: 'transcript.intake.review',
          models: [
            { provider: 'openai', model: 'gpt-5.5', role: 'review', status: 'success', startedAt: '2026-04-28T10:01:00.000Z', durationMs: 8200 },
            { provider: 'anthropic', model: 'claude-opus-4-5', role: 'review', status: 'running', startedAt: '2026-04-28T10:01:15.000Z' },
          ],
          summary: ['等待驗證審查開始'],
          corrections: [],
          warnings: [],
        }],
      },
    }} />);

    expect(screen.getByText('review: openai/gpt-5.5')).toBeInTheDocument();
    expect(screen.getByText('花費 8.2 秒')).toBeInTheDocument();
    expect(screen.getByText('review: anthropic/claude-opus-4-5')).toBeInTheDocument();
    expect(screen.getByText('工作中 5.0 秒')).toBeInTheDocument();
  });

  it('shows per-model duration and report links after completion', () => {
    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      status: 'needs_user_confirmation',
      currentPhase: 'needs_user_confirmation',
      parsedResult: {
        aiStageTrace: [
          {
            stage: 'parse',
            label: 'Parse 正式擷取',
            status: 'success',
            engine: 'vlm_ai',
            durationMs: 45900,
            agentKey: 'transcript_visual_parse',
            moduleKey: 'transcript.parse',
            models: [{ provider: 'qwen', model: 'qwen3.6-plus', role: 'parse', durationMs: 45690, reportUrl: '/parse-report' }],
            summary: ['完成 1/1 份文件解析'],
            corrections: [],
            warnings: [],
          },
          {
            stage: 'verify_review',
            label: 'Verify / Review 驗證審查',
            status: 'success',
            engine: 'vlm_ai',
            durationMs: 36000,
            agentKey: 'transcript_audit',
            moduleKey: 'transcript.intake.review',
            models: [{ provider: 'openai', model: 'gpt-5.5', role: 'review', durationMs: 35940, reportUrl: '/review-report' }],
            summary: ['審核結果：需人工確認'],
            corrections: [],
            warnings: [],
          },
        ],
      },
    }} />);

    expect(screen.getByText('花費 45.7 秒')).toBeInTheDocument();
    expect(screen.getByText('花費 35.9 秒')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /解析報告/ })).toHaveAttribute('href', '/parse-report');
    expect(screen.getByRole('link', { name: /審查報告/ })).toHaveAttribute('href', '/review-report');
  });

  it('numbers warning and manual-confirmation items', () => {
    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      status: 'needs_user_confirmation',
      currentPhase: 'needs_user_confirmation',
      parsedResult: {
        aiStageTrace: [{
          stage: 'verify_review',
          label: 'Verify / Review 驗證審查',
          status: 'success',
          engine: 'vlm_ai',
          durationMs: 1000,
          agentKey: 'transcript_audit',
          moduleKey: 'transcript.intake.review',
          models: [],
          summary: ['審核結果：需人工確認'],
          corrections: [],
          warnings: ['第一個警示', '第二個警示'],
          errorMessage: 'Reviewer 失敗',
        }],
      },
    }} />);

    const list = screen.getByText('警示／人工確認').parentElement?.querySelector('ol');
    expect(list).not.toBeNull();
    expect(list?.querySelectorAll('li')).toHaveLength(3);
  });

  it('shows reviewer model confidence independently', () => {
    render(<TranscriptAiStageTracePanel run={{
      ...baseRun,
      status: 'needs_user_confirmation',
      currentPhase: 'needs_user_confirmation',
      parsedResult: {
        aiStageTrace: [{
          stage: 'verify_review',
          label: 'Verify / Review 驗證審查',
          status: 'success',
          engine: 'vlm_ai',
          durationMs: 1000,
          agentKey: 'transcript_audit',
          moduleKey: 'transcript.intake.review',
          models: [
            { provider: 'anthropic', model: 'claude-opus-4-5', role: 'review', durationMs: 33000, confidence: 0.82 },
            { provider: 'grok', model: 'grok-4.20-reasoning', role: 'review', durationMs: 32000, confidence: 0.41 },
          ],
          confidence: 0.62,
          summary: ['審核結果：需人工確認'],
          corrections: [],
          warnings: [],
        }],
      },
    }} />);

    expect(screen.getByText('review: anthropic/claude-opus-4-5')).toBeInTheDocument();
    expect(screen.getByText('審查信心 82%')).toBeInTheDocument();
    expect(screen.getByText('review: grok/grok-4.20-reasoning')).toBeInTheDocument();
    expect(screen.getByText('審查信心 41%')).toBeInTheDocument();
    expect(screen.getByText('審查信心 62%')).toBeInTheDocument();
  });
});
