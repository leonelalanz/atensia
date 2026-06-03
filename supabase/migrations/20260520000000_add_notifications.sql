-- Tabla de notificaciones in-app
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text not null,
  type        text not null default 'general'
                check (type in ('ticket_created','ticket_assigned','ticket_resolved','ticket_commented','ticket_escalated','general')),
  ticket_id   uuid references public.tickets(id) on delete set null,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Índices para consultas frecuentes
create index if not exists notifications_user_id_idx  on public.notifications(user_id);
create index if not exists notifications_read_idx     on public.notifications(user_id, read);
create index if not exists notifications_created_idx  on public.notifications(created_at desc);

-- RLS
alter table public.notifications enable row level security;

create policy "Users see own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Authenticated can insert notifications"
  on public.notifications for insert
  with check (true);

-- Función helper para crear notificación a todos los miembros de una empresa
create or replace function public.notify_company(
  p_company_id  uuid,
  p_exclude_uid uuid,
  p_title       text,
  p_body        text,
  p_type        text,
  p_ticket_id   uuid default null
) returns void language plpgsql security definer as $$
begin
  insert into public.notifications (user_id, title, body, type, ticket_id)
  select p.id, p_title, p_body, p_type, p_ticket_id
  from public.profiles p
  where p.company_id = p_company_id
    and p.id <> p_exclude_uid
    and p.is_active = true;
end;
$$;
