import { hasCreditBalanceError, shouldUseAnthropicApiFallback, shouldUseApiFallback } from '@/lib/adapter-runs/fallback';

describe('adapter-runs fallback guard', () => {
  it('should detect Claude CLI credit balance error log', () => {
    const lines = [
      '[05:58:19] 啟動命令：claude -p 你是哪一家的模型？型號是？你的專長是？',
      '[05:58:25] Credit balance is too low',
      '[05:58:26] 程序已結束 (code=1, signal=null)',
    ];
    expect(hasCreditBalanceError(lines)).toBe(true);
  });

  it('should enable Anthropic API fallback only for claude provider', () => {
    const lines = ['Credit balance is too low'];
    expect(shouldUseAnthropicApiFallback('claude', lines)).toBe(true);
    expect(shouldUseAnthropicApiFallback('codex', lines)).toBe(false);
  });

  it('should not fallback when credit error is absent', () => {
    const lines = ['程序已結束 (code=0, signal=null)'];
    expect(shouldUseAnthropicApiFallback('claude', lines)).toBe(false);
  });

  it('should fallback for all adapter providers on non-zero exit', () => {
    const providers = ['claude', 'gemini', 'codex', 'kilo', 'opencode'] as const;
    for (const provider of providers) {
      expect(shouldUseApiFallback(provider, 1, null, ['some error'])).toBe(true);
    }
  });

  it('should skip fallback when process stopped by signal', () => {
    expect(shouldUseApiFallback('codex', 1, 'SIGTERM', ['some error'])).toBe(false);
  });

  it('should fallback on semantic CLI failure even when exit code is zero', () => {
    const lines = [
      'Error: Requested entity was not found.',
      'Status: 404',
      'Tool Debug Summary: ...',
    ];
    expect(shouldUseApiFallback('opencode', 0, null, lines)).toBe(true);
  });
});

