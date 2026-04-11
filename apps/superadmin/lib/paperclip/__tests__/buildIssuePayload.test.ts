import { buildIssuePayload, isValidPaperclipRole } from '../buildIssuePayload';
import type { PaperclipRoleMapping } from '../types';

const mapping: PaperclipRoleMapping = {
  companyId: 'company-abc',
  roleToAgentId: {
    fullstack: 'agent-fs-1',
    qa: 'agent-qa-1',
  },
};

describe('buildIssuePayload', () => {
  it('produces a well-formed submission with assignee when role is mapped', () => {
    const result = buildIssuePayload({
      rowId: '001',
      featureName: '買家搜尋功能',
      ideLabel: 'Cursor',
      roleId: 'fullstack',
      promptText: '請實作買家搜尋功能',
      baseUrl: 'http://localhost:3187',
      mapping,
    });

    expect(result.companyId).toBe('company-abc');
    expect(result.endpoint).toBe(
      'http://localhost:3187/api/companies/company-abc/issues',
    );
    expect(result.payload.title).toBe('[Row 001] 買家搜尋功能');
    expect(result.payload.status).toBe('todo');
    expect(result.payload.priority).toBe('medium');
    expect(result.payload.assigneeAgentId).toBe('agent-fs-1');
    expect(result.payload.description).toContain('**Row ID**: 001');
    expect(result.payload.description).toContain('買家搜尋功能');
    expect(result.payload.description).toContain('**Role**: fullstack');
    expect(result.payload.description).toContain('**IDE**: Cursor');
    expect(result.payload.description).toContain('請實作買家搜尋功能');
  });

  it('omits assigneeAgentId when role has no mapped agent', () => {
    const result = buildIssuePayload({
      rowId: '010',
      featureName: 'RLS policy 強化',
      ideLabel: 'Claude CLI',
      roleId: 'database',
      promptText: 'add rls policy',
      baseUrl: 'http://localhost:3187',
      mapping,
    });

    expect(result.payload.assigneeAgentId).toBeUndefined();
    expect(result.payload.description).toContain('database');
    expect(result.payload.description).toContain('Claude CLI');
  });

  it('handles empty role id as "unspecified"', () => {
    const result = buildIssuePayload({
      rowId: '007',
      featureName: 'misc task',
      ideLabel: '',
      roleId: '',
      promptText: 'hello',
      baseUrl: 'http://localhost:3187',
      mapping,
    });

    expect(result.payload.assigneeAgentId).toBeUndefined();
    expect(result.payload.description).toContain('**Role**: (未指定)');
    expect(result.payload.description).toContain('**IDE**: (未指定)');
  });

  it('strips trailing slashes from baseUrl', () => {
    const result = buildIssuePayload({
      rowId: '001',
      featureName: 'x',
      ideLabel: '',
      roleId: '',
      promptText: 'hi',
      baseUrl: 'http://localhost:3187///',
      mapping,
    });

    expect(result.endpoint).toBe(
      'http://localhost:3187/api/companies/company-abc/issues',
    );
  });

  it('truncates absurdly long feature names in the title', () => {
    const longName = 'x'.repeat(500);
    const result = buildIssuePayload({
      rowId: '001',
      featureName: longName,
      ideLabel: '',
      roleId: '',
      promptText: 'hi',
      baseUrl: 'http://localhost:3187',
      mapping,
    });

    expect(result.payload.title.length).toBeLessThanOrEqual(200);
    expect(result.payload.title.startsWith('[Row 001]')).toBe(true);
  });

  it('still produces a valid submission shape when companyId is empty', () => {
    const result = buildIssuePayload({
      rowId: '001',
      featureName: 'x',
      ideLabel: '',
      roleId: '',
      promptText: 'hi',
      baseUrl: 'http://localhost:3187',
      mapping: { companyId: '', roleToAgentId: {} },
    });

    // Endpoint is still produced — the UI should flag this as misconfigured.
    expect(result.endpoint).toBe('http://localhost:3187/api/companies//issues');
    expect(result.companyId).toBe('');
  });
});

describe('isValidPaperclipRole', () => {
  it('accepts all six known roles', () => {
    expect(isValidPaperclipRole('fullstack')).toBe(true);
    expect(isValidPaperclipRole('database')).toBe(true);
    expect(isValidPaperclipRole('qa')).toBe(true);
    expect(isValidPaperclipRole('devops')).toBe(true);
    expect(isValidPaperclipRole('architect')).toBe(true);
    expect(isValidPaperclipRole('uiux')).toBe(true);
  });

  it('rejects empty string and unknown values', () => {
    expect(isValidPaperclipRole('')).toBe(false);
    expect(isValidPaperclipRole('manager')).toBe(false);
    expect(isValidPaperclipRole('FULLSTACK')).toBe(false);
  });
});
