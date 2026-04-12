export type PaperclipClientErrorKind = 'network' | 'validation' | 'auth' | 'server' | 'unknown';

export function classifyHttpStatus(status: number): PaperclipClientErrorKind {
  if (status === 0) return 'network';
  if (status === 401 || status === 403) return 'auth';
  if (status >= 400 && status < 500) return 'validation';
  if (status >= 500) return 'server';
  return 'unknown';
}

export function recoveryHintForKind(kind: PaperclipClientErrorKind): string {
  switch (kind) {
    case 'network':
      return '請確認本機網路、Paperclip 容器是否運行（./start.sh paperclip），必要時重試送單；無需重建 worktree。';
    case 'auth':
      return '請檢查 PAPERCLIP_API_KEY、登入 superadmin 身分，以及 Paperclip 公司／專案環境變數是否正確。';
    case 'validation':
      return '請對照回應訊息修正標題／描述／assignee；修正後可再次送單。若已建立 worktree 且需重送，請先於 worktrees 頁清理或沿用同一分支（依錯誤內容決定）。';
    case 'server':
      return 'Paperclip 或本機 API 暫時錯誤，請稍後重試；若持續發生請查看容器日誌與 /api/health。';
    default:
      return '請查看錯誤全文；仍無法排除時檢查 docker/paperclip 與 apps/superadmin 環境變數。';
  }
}

/**
 * Single-line prefix for UI / logs (no PII).
 */
export function formatPaperclipErrorLine(args: { httpStatus: number; message: string }): string {
  const kind = classifyHttpStatus(args.httpStatus);
  const label =
    kind === 'network'
      ? '網路'
      : kind === 'auth'
        ? '認證'
        : kind === 'validation'
          ? '請求內容'
          : kind === 'server'
            ? '伺服器'
            : '其他';
  return `[${label}] ${args.message}`;
}

export function formatPaperclipErrorWithHint(args: { httpStatus: number; message: string }): string {
  const line = formatPaperclipErrorLine(args);
  const hint = recoveryHintForKind(classifyHttpStatus(args.httpStatus));
  return `${line}\n\n建議：${hint}`;
}
