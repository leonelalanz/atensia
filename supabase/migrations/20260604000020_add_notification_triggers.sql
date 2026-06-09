-- ============================================================
-- NOTIFICATION TRIGGERS - Auto-create notifications for tickets
-- ============================================================

-- Trigger: Notify company when ticket is created
CREATE OR REPLACE FUNCTION public.notify_on_ticket_create()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, body, type, ticket_id)
  SELECT p.id, 'Nuevo Ticket: ' || NEW.title, 'Se ha creado un nuevo ticket en tu empresa', 'ticket_created', NEW.id
  FROM public.profiles p
  WHERE p.company_id = NEW.company_id
    AND p.id <> NEW.created_by
    AND p.is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_ticket_created ON public.tickets;
CREATE TRIGGER trigger_notify_ticket_created
AFTER INSERT ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_ticket_create();

-- Trigger: Notify when ticket is assigned
CREATE OR REPLACE FUNCTION public.notify_on_ticket_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body, type, ticket_id)
    VALUES (
      NEW.assigned_to,
      'Te han asignado: ' || NEW.title,
      'Se te ha asignado un nuevo ticket',
      'ticket_assigned',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_ticket_assigned ON public.tickets;
CREATE TRIGGER trigger_notify_ticket_assigned
AFTER UPDATE ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_ticket_assigned();

-- Trigger: Notify on comment
CREATE OR REPLACE FUNCTION public.notify_on_ticket_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_creator uuid;
BEGIN
  SELECT created_by INTO v_ticket_creator FROM public.tickets WHERE id = NEW.ticket_id;

  IF v_ticket_creator IS NOT NULL AND v_ticket_creator <> NEW.created_by THEN
    INSERT INTO public.notifications (user_id, title, body, type, ticket_id)
    VALUES (
      v_ticket_creator,
      'Nuevo comentario en tu ticket',
      'Hay un nuevo comentario en uno de tus tickets',
      'ticket_commented',
      NEW.ticket_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_ticket_comment ON public.ticket_comments;
CREATE TRIGGER trigger_notify_ticket_comment
AFTER INSERT ON public.ticket_comments
FOR EACH ROW
EXECUTE FUNCTION public.notify_on_ticket_comment();
