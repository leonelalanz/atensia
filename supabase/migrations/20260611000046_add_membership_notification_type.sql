-- Extend notifications.type to include membership_expiring
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('ticket_created','ticket_assigned','ticket_resolved','ticket_commented','ticket_escalated','general','membership_expiring'));
