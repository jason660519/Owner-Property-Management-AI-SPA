import { validateParentRoleSelection } from './rbac-parent-validation';

describe('validateParentRoleSelection', () => {
  it('allows null parent', async () => {
    await expect(validateParentRoleSelection('a', null, async () => null)).resolves.toBeNull();
  });

  it('rejects parent equal to self when editing', async () => {
    await expect(
      validateParentRoleSelection('same', 'same', async () => null)
    ).resolves.toMatch(/不可將角色設為自己的父角色/);
  });

  it('rejects cycle when proposed parent chain returns to editing role', async () => {
    const parents: Record<string, string | null> = {
      p1: 'p2',
      p2: 'p3',
      p3: 'role-a',
    };
    await expect(
      validateParentRoleSelection('role-a', 'p1', async id => parents[id] ?? null)
    ).resolves.toMatch(/循環/);
  });

  it('allows valid chain when editing another role', async () => {
    const parents: Record<string, string | null> = {
      root: null,
      child: 'root',
    };
    await expect(
      validateParentRoleSelection('new-role', 'child', async id => parents[id] ?? null)
    ).resolves.toBeNull();
  });
});
