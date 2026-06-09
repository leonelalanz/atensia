import { Subscription, Company, Ticket, Profile, ActivityLog } from '../types';

// ── helpers ────────────────────────────────────────────────────────────────

function csvRow(cells: (string | number | null | undefined)[]) {
  return cells.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',');
}

function download(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function printWindow(html: string) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
    win.onload = () => win.print();
  }
}

const BASE_STYLE = `
  body{font-family:Arial,sans-serif;padding:24px;color:#111;font-size:13px}
  h1{font-size:20px;margin-bottom:4px}
  .meta{color:#666;font-size:11px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse}
  th{background:#1e40af;color:#fff;padding:7px 10px;text-align:left;font-size:12px}
  td{padding:6px 10px;border-bottom:1px solid #e5e7eb}
  tr:nth-child(even) td{background:#f9fafb}
  .footer{margin-top:16px;font-weight:bold;color:#1e40af}
  @media print{button{display:none}}
`;

function today() { return new Date().toISOString().slice(0, 10); }
function dateStr() { return new Date().toLocaleDateString('es-ES', { dateStyle: 'full' }); }

function pdfHtml(title: string, cols: string[], rows: string, footer = '') {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>${title} — Atensia</title>
  <style>${BASE_STYLE}</style></head><body>
  <h1>${title}</h1>
  <p class="meta">Generado el ${dateStr()} · Atensia</p>
  <table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
  <tbody>${rows}</tbody></table>
  ${footer ? `<p class="footer">${footer}</p>` : ''}
  </body></html>`;
}

const PLAN_LABELS: Record<string, string> = { basic: 'Básico', professional: 'Profesional', enterprise: 'Empresarial' };
const STATUS_LABELS_SUB: Record<string, string> = { active: 'Activo', trial: 'Prueba', expired: 'Expirado', cancelled: 'Cancelado' };
const STATUS_LABELS_COMP: Record<string, string> = { active: 'Activa', suspended: 'Suspendida', cancelled: 'Cancelada' };
const STATUS_LABELS_TKT: Record<string, string> = { open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado' };
const PRIORITY_LABELS: Record<string, string> = { critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja' };
const ROLE_LABELS: Record<string, string> = { superadmin: 'Super Admin', admin: 'Administrador', agent: 'Agente', developer: 'Desarrollador' };
const CAT_LABELS: Record<string, string> = { soporte: 'Soporte', bug: 'Bug', solicitud: 'Solicitud', consulta: 'Consulta', otro: 'Otro' };

// ── SUBSCRIPTIONS ──────────────────────────────────────────────────────────

export function exportSubscriptionsCSV(rows: (Subscription & { company?: Company })[]) {
  const headers = ['Empresa', 'Plan', 'Estado', 'Inicio', 'Fin', 'Monto', 'Moneda', 'Creado'];
  const body = rows.map((s) => csvRow([
    s.company?.name ?? s.company_id,
    PLAN_LABELS[s.plan] ?? s.plan,
    STATUS_LABELS_SUB[s.status] ?? s.status,
    s.start_date, s.end_date ?? '—',
    s.amount.toFixed(2), s.currency,
    new Date(s.created_at).toLocaleDateString('es-ES'),
  ]));
  download([csvRow(headers), ...body].join('\n'), `suscripciones_${today()}.csv`);
}

export function exportSubscriptionsPDF(rows: (Subscription & { company?: Company })[]) {
  const trs = rows.map((s) => `<tr>
    <td>${s.company?.name ?? ''}</td><td>${PLAN_LABELS[s.plan]}</td>
    <td>${STATUS_LABELS_SUB[s.status]}</td><td>${s.start_date}</td>
    <td>${s.end_date ?? '—'}</td><td>${s.currency} ${s.amount.toFixed(2)}</td>
  </tr>`).join('');
  printWindow(pdfHtml('Reporte de Suscripciones', ['Empresa', 'Plan', 'Estado', 'Inicio', 'Fin', 'Monto'], trs));
}

// ── COMPANIES ──────────────────────────────────────────────────────────────

export function exportCompaniesCSV(rows: Company[]) {
  const headers = ['Nombre', 'Plan', 'Estado', 'Color', 'Mantenimiento', 'Creada'];
  const body = rows.map((c) => csvRow([
    c.name, PLAN_LABELS[c.plan], STATUS_LABELS_COMP[c.status],
    c.primary_color, c.maintenance_mode ? 'Sí' : 'No',
    new Date(c.created_at).toLocaleDateString('es-ES'),
  ]));
  download([csvRow(headers), ...body].join('\n'), `empresas_${today()}.csv`);
}

export function exportCompaniesPDF(rows: Company[]) {
  const trs = rows.map((c) => `<tr>
    <td>${c.name}</td><td>${PLAN_LABELS[c.plan]}</td>
    <td>${STATUS_LABELS_COMP[c.status]}</td>
    <td>${c.primary_color}</td>
    <td>${c.maintenance_mode ? 'Sí' : 'No'}</td>
    <td>${new Date(c.created_at).toLocaleDateString('es-ES')}</td>
  </tr>`).join('');
  printWindow(pdfHtml('Reporte de Empresas', ['Nombre', 'Plan', 'Estado', 'Color', 'Mant.', 'Creada'], trs));
}

export function exportCompaniesAndPlansCSV(rows: (Company & { subscription?: Subscription; admin_name?: string; admin_email?: string })[]) {
  const headers = ['Nombre', 'Admin', 'Email Admin', 'Plan Suscripción', 'Monto', 'Estado Suscripción', 'Inicio Suscripción', 'Estado Empresa'];
  const body = rows.map((c) => csvRow([
    c.name,
    c.admin_name ?? '—',
    c.admin_email ?? '—',
    PLAN_LABELS[c.subscription?.plan as string] ?? 'Sin plan',
    c.subscription ? `${c.subscription.amount} ${c.subscription.currency}` : '—',
    c.subscription ? STATUS_LABELS_SUB[c.subscription.status] ?? c.subscription.status : '—',
    c.subscription ? c.subscription.start_date : '—',
    STATUS_LABELS_COMP[c.status],
  ]));
  download([csvRow(headers), ...body].join('\n'), `empresas-planes_${today()}.csv`);
}

export function exportCompaniesAndPlansPDF(rows: (Company & { subscription?: Subscription; admin_name?: string; admin_email?: string })[]) {
  const trs = rows.map((c) => `<tr>
    <td>${c.name}</td>
    <td>${c.admin_name ?? '—'}</td>
    <td>${c.admin_email ?? '—'}</td>
    <td>${PLAN_LABELS[c.subscription?.plan as string] ?? 'Sin plan'}</td>
    <td>${c.subscription ? `${c.subscription.currency} ${c.subscription.amount.toFixed(2)}` : '—'}</td>
    <td>${c.subscription ? STATUS_LABELS_SUB[c.subscription.status] ?? c.subscription.status : '—'}</td>
    <td>${c.subscription ? c.subscription.start_date : '—'}</td>
    <td>${STATUS_LABELS_COMP[c.status]}</td>
  </tr>`).join('');
  printWindow(pdfHtml('Reporte de Empresas y Planes', ['Nombre', 'Admin', 'Email', 'Plan', 'Monto', 'Estado Sub.', 'Inicio', 'Estado Emp.'], trs));
}

// ── TICKETS ────────────────────────────────────────────────────────────────

export function exportTicketsCSV(rows: Ticket[]) {
  const headers = ['Número', 'Título', 'Prioridad', 'Categoría', 'Estado', 'Asignado a', 'Fecha Límite', 'Creado'];
  const body = rows.map((t) => csvRow([
    t.ticket_number, t.title,
    PRIORITY_LABELS[t.priority], CAT_LABELS[t.category],
    STATUS_LABELS_TKT[t.status],
    (t.assignee as any)?.full_name ?? '—',
    t.due_date ? new Date(t.due_date).toLocaleDateString('es-ES') : '—',
    new Date(t.created_at).toLocaleDateString('es-ES'),
  ]));
  download([csvRow(headers), ...body].join('\n'), `tickets_${today()}.csv`);
}

export function exportTicketsPDF(rows: Ticket[]) {
  const trs = rows.map((t) => `<tr>
    <td><code>${t.ticket_number}</code></td><td>${t.title}</td>
    <td>${PRIORITY_LABELS[t.priority]}</td><td>${CAT_LABELS[t.category]}</td>
    <td>${STATUS_LABELS_TKT[t.status]}</td>
    <td>${(t.assignee as any)?.full_name ?? '—'}</td>
    <td>${new Date(t.created_at).toLocaleDateString('es-ES')}</td>
  </tr>`).join('');
  printWindow(pdfHtml('Reporte de Tickets',
    ['Número', 'Título', 'Prioridad', 'Categoría', 'Estado', 'Asignado', 'Creado'], trs));
}

// ── USERS ──────────────────────────────────────────────────────────────────

export function exportUsersCSV(rows: Profile[]) {
  const headers = ['Nombre', 'Email', 'Rol', 'Estado', 'Registrado'];
  const body = rows.map((u) => csvRow([
    u.full_name, u.email,
    ROLE_LABELS[u.role], u.is_active ? 'Activo' : 'Inactivo',
    new Date(u.created_at).toLocaleDateString('es-ES'),
  ]));
  download([csvRow(headers), ...body].join('\n'), `usuarios_${today()}.csv`);
}

export function exportUsersPDF(rows: Profile[]) {
  const trs = rows.map((u) => `<tr>
    <td>${u.full_name}</td><td>${u.email}</td>
    <td>${ROLE_LABELS[u.role]}</td>
    <td>${u.is_active ? 'Activo' : 'Inactivo'}</td>
    <td>${new Date(u.created_at).toLocaleDateString('es-ES')}</td>
  </tr>`).join('');
  printWindow(pdfHtml('Reporte de Usuarios', ['Nombre', 'Email', 'Rol', 'Estado', 'Registrado'], trs));
}

// ── ACTIVITIES ─────────────────────────────────────────────────────────────

export function exportActivitiesCSV(rows: ActivityLog[]) {
  const headers = ['Fecha', 'Usuario', 'Descripción', 'Horas', 'Ticket'];
  const body = rows.map((a) => csvRow([
    a.date,
    (a.user as any)?.full_name ?? '—',
    a.description,
    Number(a.hours_spent).toFixed(1),
    (a.ticket as any)?.ticket_number ?? '—',
  ]));
  download([csvRow(headers), ...body].join('\n'), `actividades_${today()}.csv`);
}

export function exportActivitiesPDF(rows: ActivityLog[]) {
  const totalH = rows.reduce((acc, a) => acc + Number(a.hours_spent), 0);
  const trs = rows.map((a) => `<tr>
    <td>${a.date}</td>
    <td>${(a.user as any)?.full_name ?? '—'}</td>
    <td>${a.description}</td>
    <td>${Number(a.hours_spent).toFixed(1)}h</td>
    <td>${(a.ticket as any)?.ticket_number ?? '—'}</td>
  </tr>`).join('');
  printWindow(pdfHtml(
    'Reporte de Actividades',
    ['Fecha', 'Usuario', 'Descripción', 'Horas', 'Ticket'],
    trs,
    `Total de horas registradas: ${totalH.toFixed(1)}h`,
  ));
}

// ── CLIENTS ────────────────────────────────────────────────────────────────

export function exportClientsCSV(rows: any[]) {
  const headers = ['Nombre Empresa', 'Email Contacto', 'Contacto', 'Teléfono', 'Estado', 'Color'];
  const body = rows.map((c) => csvRow([
    c.client_company?.name ?? '',
    c.client_contact_email,
    c.client_contact_name,
    c.client_contact_phone ?? '—',
    c.status === 'active' ? 'Activo' : 'Suspendido',
    c.client_company?.primary_color ?? '—',
  ]));
  download([csvRow(headers), ...body].join('\n'), `clientes_${today()}.csv`);
}

export function exportClientsPDF(rows: any[]) {
  const trs = rows.map((c) => `<tr>
    <td>${c.client_company?.name ?? ''}</td>
    <td>${c.client_contact_email}</td>
    <td>${c.client_contact_name}</td>
    <td>${c.client_contact_phone ?? '—'}</td>
    <td>${c.status === 'active' ? 'Activo' : 'Suspendido'}</td>
    <td>${c.client_company?.primary_color ?? '—'}</td>
  </tr>`).join('');
  printWindow(pdfHtml('Reporte de Clientes', ['Empresa', 'Email', 'Contacto', 'Teléfono', 'Estado', 'Color'], trs));
}
