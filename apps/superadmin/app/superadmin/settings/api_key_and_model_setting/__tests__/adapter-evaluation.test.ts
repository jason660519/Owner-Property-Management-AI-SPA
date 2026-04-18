import { evaluateAdapterRun, isExplicitEmptyOrErrorOutcome } from '../adapter-evaluation';

describe('evaluateAdapterRun', () => {
  it('returns fail when rendered output is empty', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'claude-3-7-sonnet',
      effectiveModel: 'claude-3-7-sonnet',
      renderedOutput: '  ',
      outputLines: ['ok'],
    });

    expect(result).toEqual({
      level: 'fail',
      message: '不及格（render 與 raw 皆過短或空白）',
    });
  });

  it('returns warning when model fallback happened', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'gpt-4.1',
      effectiveModel: 'gpt-4.1-mini',
      renderedOutput: '這是一段可讀輸出內容',
      outputLines: ['raw output exists'],
    });

    expect(result).toEqual({
      level: 'warning',
      message: '模型不正確，暫時回退到 gpt-4.1-mini',
    });
  });

  it('returns pending when effective model is not available yet', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'gpt-4.1',
      effectiveModel: '',
      renderedOutput: '這是一段可讀輸出內容',
      outputLines: ['raw output exists'],
    });

    expect(result).toEqual({
      level: 'pending',
      message: '待判定（尚未取得實際模型）',
    });
  });

  it('returns pending when model is correct but raw output is empty', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'claude-3-5-sonnet',
      effectiveModel: 'claude-3-5-sonnet',
      renderedOutput: '輸出看起來正常而且長度足夠',
      outputLines: ['   '],
    });

    expect(result).toEqual({
      level: 'pending',
      message: '待判定（raw output 不足）',
    });
  });

  it('returns pass when model is correct and outputs are valid', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'claude-3-5-sonnet',
      effectiveModel: 'claude-3-5-sonnet',
      renderedOutput: '輸出看起來正常而且長度足夠',
      outputLines: ['line1', 'line2'],
    });

    expect(result).toEqual({
      level: 'pass',
      message: '模型正確（及格）',
    });
  });

  it('treats OpenRouter vendor/model id as matching short slug (qwen)', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'qwen-3.6-plus',
      effectiveModel: 'qwen/qwen3.6-plus',
      renderedOutput: '這是一段可讀輸出內容',
      outputLines: ['raw output exists'],
    });

    expect(result.level).toBe('pass');
  });

  it('treats OpenRouter id as matching short slug (kimi / glm / minimax)', () => {
    expect(
      evaluateAdapterRun({
        requestedModel: 'kimi-k2.5',
        effectiveModel: 'moonshotai/kimi-k2.5',
        renderedOutput: '這是一段可讀輸出內容',
        outputLines: ['x'],
      }).level,
    ).toBe('pass');

    expect(
      evaluateAdapterRun({
        requestedModel: 'glm5.1',
        effectiveModel: 'z-ai/glm-5.1',
        renderedOutput: '這是一段可讀輸出內容',
        outputLines: ['x'],
      }).level,
    ).toBe('pass');

    expect(
      evaluateAdapterRun({
        requestedModel: 'minimax-m2.7',
        effectiveModel: 'minimax/minimax-m2.7',
        renderedOutput: '這是一段可讀輸出內容',
        outputLines: ['x'],
      }).level,
    ).toBe('pass');
  });

  it('fails when fallback message is long but semantically no model text (regression)', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'moonshotai/kimi-k2.5',
      effectiveModel: 'moonshotai/kimi-k2.5',
      renderedOutput: 'API fallback 成功，但無文字輸出。',
      outputLines: ['[log] enough characters here to pass raw length', 'tail'],
    });

    expect(result).toEqual({
      level: 'fail',
      message: '不及格（API／fallback 無可讀模型輸出）',
    });
  });

  it('isExplicitEmptyOrErrorOutcome matches route.ts fallback strings', () => {
    expect(isExplicitEmptyOrErrorOutcome('API fallback 成功，但無文字輸出。')).toBe(true);
    expect(isExplicitEmptyOrErrorOutcome('Gemini API fallback 無輸出：finishReason=STOP')).toBe(true);
    expect(isExplicitEmptyOrErrorOutcome('這是一段正常的模型回答內容')).toBe(false);
  });

  it('passes when render is short but raw log has enough text (deriveResultFromLogs edge case)', () => {
    const longRaw = '這是一段足夠長的 CLI 輸出內容用於測試';
    const result = evaluateAdapterRun({
      requestedModel: 'claude-3-5-sonnet',
      effectiveModel: 'claude-3-5-sonnet',
      renderedOutput: ' ',
      outputLines: [longRaw],
    });

    expect(result.level).toBe('pass');
  });

  it('still warns when different model versions (e.g. minimax m2.6 vs m2.7)', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'minimax-m2.6',
      effectiveModel: 'minimax/minimax-m2.7',
      renderedOutput: '這是一段可讀輸出內容',
      outputLines: ['raw output exists'],
    });

    expect(result).toEqual({
      level: 'warning',
      message: '模型不正確，暫時回退到 minimax/minimax-m2.7',
    });
  });
});
