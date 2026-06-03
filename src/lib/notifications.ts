/**
 * Notification triggers by role
 *
 * Admin     → new tickets, escalations, resolutions, reassignments, SLA risk
 * Agent     → assigned to them, comments on their tickets, escalations on their tickets
 * Developer → same as Agent
 * SuperAdmin → no company-level notifications (manages platform, not tickets)
 */

import { supabase } from './supabase';
import { AppNotification } from '../types';

type NotifType = AppNotification['type'];

// ── Core helper ────────────────────────────────────────────────────────────
async function notify(
  userId:   string,
  title:    string,
  body:     string,
  type:     NotifType,
  ticketId: string | null = null,
) {
  await supabase.from('notifications').insert({
    user_id:   userId,
    title,
    body,
    type,
    ticket_id: ticketId,
  });
}

/** Notifies multiple users, skipping `excludeId` (the actor). */
async function notifyMany(
  userIds:   string[],
  excludeId: string,
  title:     string,
  body:      string,
  type:      NotifType,
  ticketId:  string | null = null,
) {
  const targets = [...new Set(userIds)].filter((id) => id && id !== excludeId);
  await Promise.all(targets.map((id) => notify(id, title, body, type, ticketId)));
}

/** Returns active admin user IDs for a company. */
async function getAdminIds(companyId: string): Promise<string[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('role', 'admin')
    .eq('is_active', true);
  return (data ?? []).map((p) => p.id as string);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. TICKET CREADO
// ─ Admin: se entera de todo lo nuevo
// ─ Assignee: le informan que le tocó desde el inicio
// ═══════════════════════════════════════════════════════════════════════════
export async function onTicketCreated(opts: {
  ticketId:     string;
  ticketNumber: string;
  title:        string;
  companyId:    string;
  creatorId:    string;
  assigneeId:   string | null;
}) {
  const { ticketId, ticketNumber, title, companyId, creatorId, assigneeId } = opts;
  const admins = await getAdminIds(companyId);

  // Notificar a todos los admins (excepto si el admin mismo lo creó)
  await notifyMany(
    admins, creatorId,
    `Nuevo ticket ${ticketNumber}`,
    title,
    'ticket_created', ticketId,
  );

  // Notificar al asignado (si ya viene asignado y no es el creador ni admin)
  if (assigneeId && assigneeId !== creatorId && !admins.includes(assigneeId)) {
    await notify(
      assigneeId,
      `Ticket asignado: ${ticketNumber}`,
      `Se te asignó desde el inicio: "${title}"`,
      'ticket_assigned', ticketId,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. TICKET ASIGNADO / REASIGNADO
// ─ Nuevo asignado: le dicen que le tocó
// ─ Asignado anterior: le dicen que se lo quitaron
// ─ Admin: se entera si no fue él quien asignó
// ═══════════════════════════════════════════════════════════════════════════
export async function onTicketAssigned(opts: {
  ticketId:      string;
  ticketNumber:  string;
  title:         string;
  companyId:     string;
  newAssigneeId: string | null;
  prevAssigneeId: string | null;
  byUserId:      string;
}) {
  const { ticketId, ticketNumber, title, companyId, newAssigneeId, prevAssigneeId, byUserId } = opts;

  // Al nuevo asignado
  if (newAssigneeId && newAssigneeId !== byUserId) {
    await notify(
      newAssigneeId,
      `Ticket asignado: ${ticketNumber}`,
      `"${title}" fue asignado a ti`,
      'ticket_assigned', ticketId,
    );
  }

  // Al asignado anterior (si existe y es diferente al nuevo)
  if (prevAssigneeId && prevAssigneeId !== newAssigneeId && prevAssigneeId !== byUserId) {
    await notify(
      prevAssigneeId,
      `Ticket reasignado: ${ticketNumber}`,
      `"${title}" fue reasignado a otro agente`,
      'general', ticketId,
    );
  }

  // A los admins si quien asignó no es admin
  const admins = await getAdminIds(companyId);
  if (!admins.includes(byUserId)) {
    const assigneeName = newAssigneeId ? 'un agente' : 'nadie';
    await notifyMany(
      admins, byUserId,
      `Reasignación: ${ticketNumber}`,
      `"${title}" fue asignado a ${assigneeName}`,
      'ticket_assigned', ticketId,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. ESTADO DEL TICKET CAMBIÓ
// ─ Resuelto/Cerrado: notificar al creador y a admins
// ─ Reabierto (open/in_progress desde resuelto): notificar al asignado
// ═══════════════════════════════════════════════════════════════════════════
export async function onTicketStatusChanged(opts: {
  ticketId:    string;
  ticketNumber: string;
  title:       string;
  companyId:   string;
  oldStatus:   string;
  newStatus:   string;
  creatorId:   string | null;
  assigneeId:  string | null;
  byUserId:    string;
}) {
  const { ticketId, ticketNumber, title, companyId, oldStatus, newStatus, creatorId, assigneeId, byUserId } = opts;
  const admins = await getAdminIds(companyId);

  const STATUS_LABELS: Record<string, string> = {
    open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado',
  };
  const newLabel = STATUS_LABELS[newStatus] ?? newStatus;

  if (newStatus === 'resolved' || newStatus === 'closed') {
    // Notificar al creador
    if (creatorId && creatorId !== byUserId) {
      await notify(
        creatorId,
        `Ticket ${newLabel}: ${ticketNumber}`,
        `Tu ticket "${title}" fue marcado como ${newLabel.toLowerCase()}`,
        'ticket_resolved', ticketId,
      );
    }
    // Notificar a admins
    await notifyMany(
      admins, byUserId,
      `Ticket ${newLabel}: ${ticketNumber}`,
      `"${title}" fue marcado como ${newLabel.toLowerCase()}`,
      'ticket_resolved', ticketId,
    );
  } else if (
    (oldStatus === 'resolved' || oldStatus === 'closed') &&
    (newStatus === 'open' || newStatus === 'in_progress')
  ) {
    // Reabierto — notificar al asignado y admins
    const targets = [...admins];
    if (assigneeId) targets.push(assigneeId);
    await notifyMany(
      targets, byUserId,
      `Ticket reabierto: ${ticketNumber}`,
      `"${title}" fue reabierto → ${newLabel}`,
      'general', ticketId,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. PRIORIDAD ESCALADA A CRÍTICO
// ─ Admin: alerta inmediata
// ─ Asignado: alerta inmediata
// ─ Creador: alerta si no es quien escaló
// ═══════════════════════════════════════════════════════════════════════════
export async function onTicketEscalated(opts: {
  ticketId:    string;
  ticketNumber: string;
  title:       string;
  companyId:   string;
  newPriority: string;
  oldPriority: string;
  creatorId:   string | null;
  assigneeId:  string | null;
  byUserId:    string;
}) {
  const { ticketId, ticketNumber, title, companyId, newPriority, oldPriority, creatorId, assigneeId, byUserId } = opts;

  if (newPriority !== 'critical') return; // Solo notificar escalaciones a Crítico

  const admins = await getAdminIds(companyId);
  const targets = [...admins];
  if (assigneeId) targets.push(assigneeId);
  if (creatorId)  targets.push(creatorId);

  await notifyMany(
    targets, byUserId,
    `⚠️ Ticket escalado a Crítico: ${ticketNumber}`,
    `"${title}" fue escalado de ${oldPriority} a Crítico`,
    'ticket_escalated', ticketId,
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. NUEVO COMENTARIO
// ─ Asignado: nuevo comentario en su ticket
// ─ Creador: alguien respondió su ticket
// ─ Notas internas: solo notifican a admins y al asignado (no al creador)
// ═══════════════════════════════════════════════════════════════════════════
export async function onCommentAdded(opts: {
  ticketId:    string;
  ticketNumber: string;
  title:       string;
  companyId:   string;
  creatorId:   string | null;
  assigneeId:  string | null;
  commenterId: string;
  isInternal:  boolean;
}) {
  const { ticketId, ticketNumber, title, companyId, creatorId, assigneeId, commenterId, isInternal } = opts;

  if (isInternal) {
    // Nota interna → solo admins y asignado (no el creador del ticket)
    const admins = await getAdminIds(companyId);
    const targets = [...admins];
    if (assigneeId) targets.push(assigneeId);
    await notifyMany(
      targets, commenterId,
      `Nota interna en ${ticketNumber}`,
      `"${title}"`,
      'ticket_commented', ticketId,
    );
  } else {
    // Comentario público → creador y asignado
    const targets: string[] = [];
    if (creatorId)  targets.push(creatorId);
    if (assigneeId) targets.push(assigneeId);
    await notifyMany(
      targets, commenterId,
      `Nuevo comentario en ${ticketNumber}`,
      `"${title}"`,
      'ticket_commented', ticketId,
    );
  }
}
