export function hasCreditBalanceError(lines: string[]): boolean {
  return lines.some((line) => /credit balance is too low/i.test(line));
}

export function shouldUseAnthropicApiFallback(provider: string, lines: string[]): boolean {
  return provider === 'claude' && hasCreditBalanceError(lines);
}

function hasCliErrorSignals(lines: string[]): boolean {
  return lines.some((line) =>
    /requested entity was not found|error:|status:\s*404|tool debug/i.test(line)
  );
}

export function shouldUseApiFallback(
  provider: 'claude' | 'gemini' | 'codex' | 'kilo' | 'opencode',
  exitCode: number | null,
  signal: NodeJS.Signals | null,
  lines: string[]
): boolean {
  // User manually stopped or process killed by signal: don't auto-fallback.
  if (signal) return false;
  const nonZeroExit = exitCode !== null && exitCode !== 0;
  const semanticFailure = hasCliErrorSignals(lines);
  if (!nonZeroExit && !semanticFailure) return false;

  // Claude CLI has a known wallet/balance failure mode that should always fallback.
  if (provider === 'claude') return true;

  // For other adapter CLIs, any non-zero exit is treated as runnable fallback.
  return true;
}

