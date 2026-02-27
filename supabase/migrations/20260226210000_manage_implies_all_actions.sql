-- Update check_user_permission: having 'manage' implicitly grants all actions
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_resource TEXT,
  p_action  TEXT
)
RETURNS TEXT   -- 'all' | 'own' | 'assigned' | NULL (no permission)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_scope TEXT;
BEGIN
  SELECT irp.scope INTO v_scope
  FROM public.iam_role_permissions irp
  WHERE irp.resource = p_resource
    -- M (manage) implicitly grants C / R / U / D as well
    AND (p_action = ANY(irp.actions) OR 'manage' = ANY(irp.actions))
    AND irp.role_id IN (
      SELECT ur.role_id
      FROM public.iam_user_roles ur
      WHERE ur.user_id = p_user_id
      UNION
      SELECT gr.role_id
      FROM public.iam_group_roles gr
      JOIN public.iam_group_members gm ON gm.group_id = gr.group_id
      WHERE gm.user_id = p_user_id
    )
  ORDER BY CASE irp.scope
    WHEN 'all'      THEN 1
    WHEN 'assigned' THEN 2
    WHEN 'own'      THEN 3
  END
  LIMIT 1;

  RETURN v_scope;
END;
$$;
