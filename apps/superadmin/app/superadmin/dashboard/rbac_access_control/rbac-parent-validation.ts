/**
 * Validates that assigning parent_role_id does not create a self-reference or a cycle.
 */
export async function validateParentRoleSelection(
  editingRoleId: string | null,
  parentRoleId: string | null,
  fetchParentRoleId: (roleId: string) => Promise<string | null>
): Promise<string | null> {
  if (!parentRoleId) return null;
  if (editingRoleId && parentRoleId === editingRoleId) {
    return '不可將角色設為自己的父角色';
  }

  let current: string | null = parentRoleId;
  for (let depth = 0; depth < 64 && current; depth++) {
    if (editingRoleId && current === editingRoleId) {
      return '父角色鏈不可形成循環';
    }
    current = await fetchParentRoleId(current);
  }

  return null;
}
