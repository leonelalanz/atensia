-- Memberships table for tracking external service subscriptions
create table if not exists public.memberships (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  name                text not null,
  url                 text,
  cost                numeric(10,2) not null default 0,
  currency            text not null default 'USD',
  start_date          date not null,
  expiration_date     date,
  status              text not null default 'active' check (status in ('active','cancelled')),
  notes               text default '',
  last_alert_sent_at  timestamptz,
  created_by          uuid references public.profiles(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists memberships_company_idx    on public.memberships(company_id);
create index if not exists memberships_expiration_idx  on public.memberships(expiration_date);

alter table public.memberships enable row level security;

create policy "memberships_select" on public.memberships for select to authenticated
  using (get_my_role() = 'superadmin' or (company_id = get_my_company() and get_my_role() = 'admin'));
create policy "memberships_insert" on public.memberships for insert to authenticated
  with check (get_my_role() = 'superadmin' or (company_id = get_my_company() and get_my_role() = 'admin'));
create policy "memberships_update" on public.memberships for update to authenticated
  using (get_my_role() = 'superadmin' or (company_id = get_my_company() and get_my_role() = 'admin'))
  with check (get_my_role() = 'superadmin' or (company_id = get_my_company() and get_my_role() = 'admin'));
create policy "memberships_delete" on public.memberships for delete to authenticated
  using (get_my_role() = 'superadmin' or (company_id = get_my_company() and get_my_role() = 'admin'));

-- Membership renewal history table
create table if not exists public.membership_renewals (
  id                          uuid primary key default gen_random_uuid(),
  membership_id               uuid not null references public.memberships(id) on delete cascade,
  renewed_at                  timestamptz not null default now(),
  previous_expiration_date    date,
  new_expiration_date         date not null,
  amount                      numeric(10,2),
  notes                       text default '',
  created_by                  uuid references public.profiles(id) on delete set null,
  created_at                  timestamptz not null default now()
);

create index if not exists membership_renewals_membership_idx on public.membership_renewals(membership_id);

alter table public.membership_renewals enable row level security;

create policy "membership_renewals_select" on public.membership_renewals for select to authenticated
  using (exists (select 1 from public.memberships m where m.id = membership_id
    and (get_my_role() = 'superadmin' or (m.company_id = get_my_company() and get_my_role() = 'admin'))));
create policy "membership_renewals_insert" on public.membership_renewals for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.id = membership_id
    and (get_my_role() = 'superadmin' or (m.company_id = get_my_company() and get_my_role() = 'admin'))));
