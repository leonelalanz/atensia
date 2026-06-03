-- RPC segura para asignar/reasignar tickets.
-- Usa SECURITY DEFINER para bypassear RLS, pero valida
-- que el caller pertenezca a la misma empresa que el ticket.

CREATE OR REPLACE FUNCTION assign_ticket(
  p_ticket_id  uuid,
  p_user_id    uuid   -- null = quitar asignación
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_company uuid;
  v_caller_company uuid;
  v_caller_role    text;
BEGIN
  -- Obtener empresa del ticket
  SELECT company_id INTO v_ticket_company
  FROM tickets WHERE id = p_ticket_id;

  IF v_ticket_company IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
  END IF;

  -- Obtener empresa y rol del caller
  SELECT company_id, role INTO v_caller_company, v_caller_role
  FROM profiles WHERE id = auth.uid();

  -- Validar que pertenece a la empresa y tiene rol adecuado
  IF v_caller_company IS DISTINCT FROM v_ticket_company
     OR v_caller_role NOT IN ('admin', 'agent', 'developer') THEN
    RAISE EXCEPTION 'Not authorized to assign this ticket';
  END IF;

  -- Si se especifica un user_id, verificar que también es de la misma empresa
  IF p_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles
      WHERE id = p_user_id
        AND company_id = v_ticket_company
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Assignee not found in the same company';
    END IF;
  END IF;

  -- Ejecutar el update con privilegios elevados
  UPDATE tickets
  SET assigned_to = p_user_id,
      updated_at  = now()
  WHERE id = p_ticket_id;
END;
$$;

-- Dar permiso de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION assign_ticket(uuid, uuid) TO authenticated;
