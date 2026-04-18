import {
  compareSelfReportToRequested,
  evaluateAdapterRun,
  isExplicitEmptyOrErrorOutcome,
  parseSelfReportedModel,
} from '../adapter-evaluation';

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

  it('fails when self-reported model version differs from requested (regression: m2.7 served as m2.1)', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'minimax/minimax-m2.7',
      effectiveModel: 'minimax/minimax-m2.7',
      renderedOutput: '你好！我是 **MiniMax-M2.1**，由 **MiniMax** 公司构建的AI助手。',
      outputLines: ['你好！我是 **MiniMax-M2.1**'],
    });

    expect(result.level).toBe('fail');
    expect(result.message).toMatch(/不及格/);
    expect(result.message).toMatch(/自報/);
    expect(result.message).toMatch(/m2\.1/i);
  });

  it('passes when self-reported version matches requested (m2.5 == m2.5, real OpenCode case)', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'openrouter/minimax/minimax-m2.5',
      effectiveModel: 'openrouter/minimax/minimax-m2.5',
      renderedOutput: '我是 **MiniMax MiniMax-M2.5**，模型 ID 為 `openrouter/minimax/minimax-m2.5`，通過 OpenRouter 提供服務。',
      outputLines: ['ok'],
    });

    expect(result).toEqual({ level: 'pass', message: '模型正確（及格）' });
  });

  it('passes when model self-reports family without a version (cannot disprove)', () => {
    const result = evaluateAdapterRun({
      requestedModel: 'claude-3-5-sonnet',
      effectiveModel: 'claude-3-5-sonnet',
      renderedOutput: '你好，我是 Claude，由 Anthropic 訓練的助手。',
      outputLines: ['ok'],
    });

    expect(result.level).toBe('pass');
  });

  it('passes when self-report cites a different family entirely (conservative — could be analogy)', () => {
    // Models sometimes mention competitors in their answer; keep this conservative and don't downgrade.
    const result = evaluateAdapterRun({
      requestedModel: 'gpt-4.1',
      effectiveModel: 'gpt-4.1',
      renderedOutput: '我跟 Claude 不一樣，我比較適合程式碼任務。',
      outputLines: ['ok'],
    });

    expect(result.level).toBe('pass');
  });
});

describe('parseSelfReportedModel', () => {
  it('extracts MiniMax M2.1 from a Chinese self-introduction', () => {
    const parsed = parseSelfReportedModel('你好！我是 **MiniMax-M2.1**，由 MiniMax 公司构建的AI助手。');
    expect(parsed.family).toBe('minimax');
    expect(parsed.versionFingerprint).toBe('m21');
  });

  it('extracts Claude 3.5 from an English self-introduction', () => {
    const parsed = parseSelfReportedModel("Hi, I'm Claude 3.5 Sonnet, made by Anthropic.");
    expect(parsed.family).toBe('claude');
    expect(parsed.versionFingerprint).toBe('35');
  });

  it('extracts gpt-4o', () => {
    const parsed = parseSelfReportedModel('I am GPT-4o, an OpenAI model.');
    expect(parsed.family).toBe('gpt');
    expect(parsed.versionFingerprint).toBe('4o');
  });

  it('returns nulls when no known family is mentioned', () => {
    const parsed = parseSelfReportedModel('I am a large language model.');
    expect(parsed.family).toBeNull();
    expect(parsed.versionFingerprint).toBeNull();
  });

  it('detects family but null version when only family name is given', () => {
    const parsed = parseSelfReportedModel('我是 Kimi，很高興認識你。');
    expect(parsed.family).toBe('kimi');
    expect(parsed.versionFingerprint).toBeNull();
  });
});

describe('compareSelfReportToRequested', () => {
  it('returns version-mismatch for same family, different version', () => {
    const self = parseSelfReportedModel('我是 MiniMax-M2.1');
    expect(compareSelfReportToRequested(self, 'minimax/minimax-m2.7')).toBe('version-mismatch');
  });

  it('returns match for same family + same version', () => {
    const self = parseSelfReportedModel('我是 MiniMax M2.7');
    expect(compareSelfReportToRequested(self, 'minimax/minimax-m2.7')).toBe('match');
  });

  it('returns family-only-match when version cannot be parsed from self-report', () => {
    const self = parseSelfReportedModel('我是 Claude');
    expect(compareSelfReportToRequested(self, 'claude-3-5-sonnet')).toBe('family-only-match');
  });

  it('returns not-detected when no family is in the self-report', () => {
    const self = parseSelfReportedModel('Hello world.');
    expect(compareSelfReportToRequested(self, 'gpt-4.1')).toBe('not-detected');
  });

  it('returns family-mismatch when self-report cites a different family', () => {
    const self = parseSelfReportedModel('I am Claude 3.5');
    expect(compareSelfReportToRequested(self, 'gpt-4.1')).toBe('family-mismatch');
  });
});
