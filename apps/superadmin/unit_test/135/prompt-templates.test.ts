import {
  getDefaultPrompt,
  tddTail,
  promptHeader,
  WORK_CATEGORY_OPTIONS,
} from '@/app/superadmin/dashboard/project-progress/components/development-table/task-dispatch/prompt-templates';
import type { PromptContext } from '@/app/superadmin/dashboard/project-progress/components/development-table/types';

const ctx: PromptContext = {
  rowId: '042',
  ideLabel: 'Cursor',
  featureSpec: '/project-process/features/test-dev-spec.md',
  tddSpec: '/project-process/features/tdd-test.md',
  unitFolder: 'apps/superadmin/unit_test/042',
  e2eFolder: 'apps/superadmin/e2e/042',
};

describe('getDefaultPrompt', () => {
  it('includes rowId and IDE label', () => {
    const result = getDefaultPrompt(ctx);
    expect(result).toContain('042');
    expect(result).toContain('Cursor');
  });

  it('includes feature spec and tdd spec paths', () => {
    const result = getDefaultPrompt(ctx);
    expect(result).toContain(ctx.featureSpec);
    expect(result).toContain(ctx.tddSpec);
  });

  it('includes COST_AND_API_DISCIPLINE section', () => {
    const result = getDefaultPrompt(ctx);
    expect(result).toContain('成本與 API 節制');
  });

  it('includes test paths', () => {
    const result = getDefaultPrompt(ctx);
    expect(result).toContain(ctx.unitFolder);
    expect(result).toContain(ctx.e2eFolder);
  });

  it('handles empty IDE label gracefully', () => {
    const emptyCtx = { ...ctx, ideLabel: '' };
    const result = getDefaultPrompt(emptyCtx);
    expect(result).toContain('042');
    expect(typeof result).toBe('string');
  });
});

describe('promptHeader', () => {
  it('includes rowId and IDE label', () => {
    const result = promptHeader(ctx, '開始開發');
    expect(result).toContain('042');
    expect(result).toContain('Cursor');
    expect(result).toContain('開始開發');
  });

  it('includes spec paths', () => {
    const result = promptHeader(ctx, 'desc');
    expect(result).toContain(ctx.featureSpec);
    expect(result).toContain(ctx.tddSpec);
  });
});

describe('tddTail', () => {
  it('includes test paths', () => {
    const result = tddTail(ctx);
    expect(result).toContain(ctx.unitFolder);
    expect(result).toContain(ctx.e2eFolder);
  });

  it('includes cost discipline', () => {
    const result = tddTail(ctx);
    expect(result).toContain('成本與 API 節制');
  });

  it('includes commit instruction', () => {
    const result = tddTail(ctx);
    expect(result).toContain('git commit');
  });
});

describe('WORK_CATEGORY_OPTIONS', () => {
  it('has at least 5 categories', () => {
    expect(WORK_CATEGORY_OPTIONS.length).toBeGreaterThanOrEqual(5);
  });

  it('each category produces a non-empty prompt', () => {
    for (const opt of WORK_CATEGORY_OPTIONS) {
      const prompt = opt.getPrompt(ctx);
      expect(prompt.length).toBeGreaterThan(100);
      expect(prompt).toContain('042');
    }
  });

  it('each category includes cost discipline', () => {
    for (const opt of WORK_CATEGORY_OPTIONS) {
      const prompt = opt.getPrompt(ctx);
      expect(prompt).toContain('成本與 API 節制');
    }
  });

  it('each has unique id and label', () => {
    const ids = WORK_CATEGORY_OPTIONS.map(o => o.id);
    const labels = WORK_CATEGORY_OPTIONS.map(o => o.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });
});
