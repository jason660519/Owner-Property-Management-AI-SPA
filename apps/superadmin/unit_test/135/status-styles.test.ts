import { STATUS_BADGE_STYLE } from '@/app/superadmin/dashboard/project-progress/components/development-table/task-dispatch/status-styles';
import type { PaperclipIssueStatus } from '@/lib/paperclip/types';

const ALL_STATUSES: PaperclipIssueStatus[] = [
  'backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked', 'cancelled',
];

describe('STATUS_BADGE_STYLE', () => {
  it('has entries for all PaperclipIssueStatus values', () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_BADGE_STYLE[status]).toBeDefined();
      expect(STATUS_BADGE_STYLE[status].label).toBeTruthy();
      expect(STATUS_BADGE_STYLE[status].className).toBeTruthy();
    }
  });

  it('each label is a non-empty string', () => {
    for (const status of ALL_STATUSES) {
      expect(typeof STATUS_BADGE_STYLE[status].label).toBe('string');
      expect(STATUS_BADGE_STYLE[status].label.length).toBeGreaterThan(0);
    }
  });

  it('each className contains CSS class tokens', () => {
    for (const status of ALL_STATUSES) {
      expect(STATUS_BADGE_STYLE[status].className).toContain('text-');
    }
  });
});
