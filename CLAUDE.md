# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Atensia** is a multi-tenant SaaS ticket management system built with React + Vite + TypeScript + Supabase. It supports:
- Multi-tenant ticket management with SLA policies
- Reseller/agency model (admins can manage client companies)
- Role-based access control (superadmin, admin, agent, developer)
- Email notifications, payment tracking, and audit logs
- Web, iOS, Android, and other app deployments via the "Agencia" feature

## Quick Start Commands

```bash
# Install dependencies
npm install

# Development server (runs on http://localhost:5173)
npm run dev

# Production build
npm run build

# Lint code
npm run lint

# Type check (without emitting)
npm run typecheck

# Preview production build locally
npm run preview
```

## Architecture Overview

### Custom Router (Not React Router)
The app uses a **custom router** defined in `RouterContext.tsx` that maps route names to paths. Key files:
- **RouterContext.tsx**: Manages navigation via `navigate(route, params?)` function
- Routes defined as a discriminated union type `Route` in `types/index.ts`
- Direct path-to-route conversion using regex matching (see `pathToRoute()`)
- URL state managed via `window.history.pushState()` and `popstate` listeners

**Pattern**: Pages dispatch `navigate()` to change views. Router context handles both browser history and internal state.

### Context Providers (in App.tsx order)
1. **ThemeProvider** — Dark mode toggle
2. **RouterProvider** — Navigation state (route, params)
3. **AuthProvider** — User auth, profile, sign in/out
4. **BrandProvider** — Company branding (logo, colors)
5. **NotificationsProvider** — Toast/notification queue

Access via hooks: `useAuth()`, `useRouter()`, `useTheme()`, etc.

### Data Fetching Pattern
No global state manager. Components fetch data on-demand:
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('...')
  .eq('id', value);
```

Services layer (`src/services/`) wraps common queries. Examples:
- `authLogsService.ts` — Login/logout tracking
- `ticketsService.ts` — Ticket CRUD + relationships
- `subscriptionsService.ts` — Payment and billing data

### Supabase Setup
- **Client**: `src/lib/supabase.ts` — Standard Supabase JS client
- **Auth**: Supabase built-in email/password + session management
- **RLS**: All tables have Row Level Security policies (see migrations)
- **Database**: PostgreSQL schema in `supabase/migrations/`

Key tables:
- `companies` — Multi-tenant parent
- `subscriptions` — Billing (plan, currency, amount, status)
- `profiles` — Users (role, company_id, avatar emoji/color)
- `tickets` — Core data (status, priority, assigned_to, sla_record)
- `ticket_comments`, `ticket_history` — Audit trail
- `activity_logs` — Time tracking
- `client_companies`, `deployments`, `test_builds` — Reseller features
- `payment_proofs`, `invoices` — Payment records (manually validated)

### File Structure

```
src/
├── components/
│   ├── layout/          # Header, Sidebar, Layout wrapper
│   ├── ui/              # Reusable UI (Button, Modal, Badge, Avatar, etc.)
│   ├── tickets/         # Ticket-specific components (Card, Form, Comments)
│   └── payments/        # Payment modal
├── contexts/            # React context providers (Auth, Router, Theme, Brand, Notifications)
├── pages/               # Page components for each route
│   ├── auth/            # Login, SignUp, Password reset
│   ├── tickets/         # Ticket list, detail, new ticket
│   ├── admin/           # Plans management, upgrade requests
│   ├── superadmin/      # Payment proofs validation
│   └── agencia/         # Reseller features (clients, deployments, reports)
├── services/            # Data fetching & business logic
├── lib/                 # Utilities (Supabase client, SLA calc, notifications, PDF)
├── hooks/               # Custom hooks (usePlan)
├── types/               # TypeScript types & route definitions
└── main.tsx             # Entry point
```

### Types System
All types in `src/types/index.ts`. Key discriminated unions:
- **Route** — All possible page routes (e.g., 'dashboard', 'tickets', 'ticket-detail')
- **UserRole** — 'superadmin' | 'admin' | 'agent' | 'developer'
- **TicketPriority**, **TicketStatus**, **TicketCategory** — Ticket enums
- **CompanyPlan**, **CompanyStatus**, **SubscriptionStatus** — Billing enums

### Multi-Tenant Model
- Every `Profile` has a `company_id` (except superadmin)
- RLS policies enforce `company_id = auth.user.company_id` for all user-owned data
- Superadmins bypass these checks
- Admins of one company can manage their company's users, SLA, branding
- Reseller admins see `client_companies` and can view their clients' tickets

### Key Architectural Decisions

1. **No global state manager** — Fetch data per-component to avoid cache invalidation complexity
2. **Custom router** — Avoids React Router dependency; simpler for hash/path transitions
3. **RLS-first access control** — Trust Supabase policies; minimal auth checks in client code
4. **Monolithic repo** — All pages/services in one src/ folder (consider splitting if >100 files)
5. **Vite + SWC** — Fast builds and HMR
6. **Tailwind CSS** — Utility-first styling with dark mode
7. **Manual payment validation** — Payment proofs table; superadmin approves/rejects before activating subscription

## Common Development Tasks

### Adding a New Page
1. Create component in `src/pages/[feature]/NewPage.tsx`
2. Add route type to `Route` union in `types/index.ts`
3. Add path mapping in `RouterContext.tsx` (both `ROUTE_TO_PATH` and `pathToRoute()`)
4. Add case in `App.tsx` `renderPage()` with role checks
5. Link from sidebar or other pages via `navigate('route-name')`

### Fetching Data
1. Create or reuse a service in `src/services/`
2. Import Supabase client: `import { supabase } from '../lib/supabase'`
3. Use `.select()`, `.eq()`, `.order()`, etc. — standard Supabase API
4. Handle relations with dot notation: `.select('*, profiles(*)')`
5. Always check `.error` before using `.data`

### Adding a Role Check
```typescript
import { useAuth } from '../contexts/AuthContext';

const { profile } = useAuth();
if (profile?.role !== 'admin') return <Unauthorized />;
```

Or in routes via the `role` variable in `App.tsx`.

### Modifying RLS Policies
1. Create new migration: `supabase migration new <name>`
2. Write SQL: `ALTER POLICY ... ON table_name ...`
3. Test locally: `supabase start`, then verify via Postgres
4. Deploy: Push migration to remote

### Environment Variables
Create `.env.local` (Vite auto-loads it):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

Access in code: `import.meta.env.VITE_SUPABASE_URL`

## Common Gotchas

1. **RLS blocks queries silently** — If you get empty results, check RLS policies first, not client code
2. **Custom router doesn't auto-sync** — Directly changing URL bar won't update context state. Use `navigate()` instead
3. **Superadmin context requires fetch** — Superadmins don't have `company_id`, so some selects need special handling (see migrations ending in `...fix_...rls`)
4. **Payment workflow is manual** — No Stripe integration yet; clients upload proofs → superadmin approves → subscription activates
5. **Subscriptions have hardcoded USD** — Multi-currency not yet implemented; see `src/types/Subscription.currency`
6. **Vite env vars are replaced at build time** — Must start with `VITE_` prefix and be defined before build

## Testing Strategy

- **No unit test suite yet** — Manual testing via dev server
- **Type safety** — Run `npm run typecheck` before commits
- **Browser dev tools** — Inspect RLS errors in Network tab (Supabase responses)
- **Supabase Studio** — Check RLS policies and data at `https://app.supabase.co`

## Database Migrations

All migrations in `supabase/migrations/`. Naming: `YYYYMMDDhhmmss_description.sql`

To create new:
```bash
supabase migration new add_field_to_table
# Edit supabase/migrations/[timestamp]_add_field_to_table.sql
# Test locally:
supabase db reset
# Deploy:
supabase db push
```

Key recent migrations:
- `20260604000022_enable_rls_core_tables.sql` — RLS enforcement
- `20260608000001_add_agency_structure.sql` — Reseller model tables
- `20260609000042_create_payment_proofs.sql` — Manual payment validation
- `20260610000044_create_invoices_table.sql` — Invoice records

## Production Checklist

Before deploying:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds
- [ ] All RLS policies tested for intended roles
- [ ] Payment proofs workflow validated
- [ ] Email notifications configured in Supabase edge functions
- [ ] Superadmin account created and tested

## Performance Notes

- **No pagination yet** — Pages load all data at once (problematic for large tables)
- **N+1 queries possible** — Each component fetches independently; consider batching
- **Supabase response caching** — Not configured; every render triggers a fetch
- **Large files** — Invoice PDFs generated client-side; may slow on weak devices

Consider optimizing these if they become bottlenecks.
