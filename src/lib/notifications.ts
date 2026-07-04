/**
 * Notification triggers by role
 *
 * Admin     → new tickets, escalations, resolutions, reassignments, SLA risk
 * Agent     → assigned to them, comments on their tickets, escalations on their tickets
 * Developer → same as Agent
 * SuperAdmin → no company-level notifications (manages platform, not tickets)
 */

import { supabase } from './supabase';
import { AppNotification, Profile } from '../types';
import { sendTicketNotificationEmail } from './emailService';

type NotifType = AppNotification['type'];

// ── Core helper ────────────────────────────────────────────────────────────
async function notify(
  userId:   string,
  title:    string,
  body:     string,
  type:     NotifType,
  ticketId: string | null = null,
  emailData?: Record<string, any>,
) {
  try {
    console.log('📢 Notifying user:', { userId, title, body, type, ticketId });

    // Save to database
    const { error } = await supabase.from('notifications').insert({
      user_id:   userId,
      title,
      body,
      type,
      ticket_id: ticketId,
    });
    if (error) console.error('❌ Notification error:', error);
    else console.log('✅ Notification created for:', userId);

    // Send email
    if (emailData?.sendEmail) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();

        if (profile?.email) {
          console.log(`📧 Sending email to ${profile.email}`);
          await sendTicketNotificationEmail({
            type: type as any,
            recipientEmail: profile.email,
            recipientName: profile.full_name,
            ...emailData,
          });
        }
      } catch (emailErr) {
        console.error('⚠️ Error sending email:', emailErr);
        // Don't fail the notification if email fails
      }
    }
  } catch (err) {
    console.error('❌ Error creating notification:', err);
  }
}

/** Notifies multiple users, skipping `excludeId` (the actor). */
async function notifyMany(
  userIds:   string[],
  excludeId: string,
  title:     string,
  body:      string,
  type:      NotifType,
  ticketId:  string | null = null,
  emailData?: Record<string, any>,
) {
  const targets = [...new Set(userIds)].filter((id) => id && id !== excludeId);
  console.log('🔄 notifyMany: targets to notify:', targets.length, 'emailData:', emailData);

  const promises = targets.map((id) => {
    console.log(`📬 notifyMany: calling notify for user ${id}`);
    return notify(id, title, body, type, ticketId, emailData);
  });

  await Promise.all(promises);
  console.log('✅ notifyMany: all notifications sent');
}

/** Returns active admin user IDs for a company. */
async function getAdminIds(companyId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('company_id', companyId)
    .eq('role', 'admin')
    .eq('is_active', true);
  const adminIds = (data ?? []).map((p) => p.id as string);
  console.log('🔍 getAdminIds for company', companyId, ':', { adminCount: adminIds.length, admins: data?.map(p => ({ id: p.id, name: p.full_name })) });
  return adminIds;
}

/** Get admin IDs for a ticket company - if it's a client company, returns admin of provider company. */
async function getAdminsForTicketCompany(companyId: string): Promise<string[]> {
  // Check if this company is a client
  const { data: clientRelation } = await supabase
    .from('client_companies')
    .select('admin_company_id')
    .eq('client_company_id', companyId)
    .maybeSingle();

  if (clientRelation?.admin_company_id) {
    // It's a client company - get admin of provider
    console.log('📍 Company is client, getting admin of provider:', clientRelation.admin_company_id);
    return await getAdminIds(clientRelation.admin_company_id);
  } else {
    // It's a regular company - get its own admins
    console.log('📍 Company is regular, getting its own admins');
    return await getAdminIds(companyId);
  }
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
  description?: string;
  priority?:    string;
  companyId:    string;
  companyName?: string;
  creatorId:    string;
  assigneeId:   string | null;
}) {
  const { ticketId, ticketNumber, title, description, priority, companyId, companyName, creatorId, assigneeId } = opts;
  console.log('🎫 onTicketCreated called:', { ticketNumber, title, companyId, creatorId });

  const admins = await getAdminsForTicketCompany(companyId);
  console.log('✉️ Admins to notify:', { adminCount: admins.length, admins });

  const emailData = {
    sendEmail: true,
    ticketNumber,
    ticketTitle: title,
    priority: priority || 'medium',
    description,
    companyName,
  };

  // Notificar a todos los admins (excepto si el admin mismo lo creó)
  await notifyMany(
    admins, creatorId,
    `Nuevo ticket ${ticketNumber}`,
    title,
    'ticket_created', ticketId,
    emailData,
  );

  // Notificar al asignado (si ya viene asignado y no es el creador ni admin)
  if (assigneeId && assigneeId !== creatorId && !admins.includes(assigneeId)) {
    await notify(
      assigneeId,
      `Ticket asignado: ${ticketNumber}`,
      `Se te asignó desde el inicio: "${title}"`,
      'ticket_assigned', ticketId,
      {
        sendEmail: true,
        ticketNumber,
        ticketTitle: title,
        companyName,
      },
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
  companyName?:  string;
  newAssigneeId: string | null;
  newAssigneeName?: string | null;
  prevAssigneeId: string | null;
  byUserId:      string;
}) {
  const { ticketId, ticketNumber, title, companyId, companyName, newAssigneeId, newAssigneeName, prevAssigneeId, byUserId } = opts;

  // Al nuevo asignado
  if (newAssigneeId && newAssigneeId !== byUserId) {
    await notify(
      newAssigneeId,
      `Ticket asignado: ${ticketNumber}`,
      `"${title}" fue asignado a ti`,
      'ticket_assigned', ticketId,
      {
        sendEmail: true,
        ticketNumber,
        ticketTitle: title,
        assigneeName: newAssigneeName,
        companyName,
      },
    );
  }

  // Al asignado anterior (si existe y es diferente al nuevo)
  if (prevAssigneeId && prevAssigneeId !== newAssigneeId && prevAssigneeId !== byUserId) {
    await notify(
      prevAssigneeId,
      `Ticket reasignado: ${ticketNumber}`,
      `"${title}" fue reasignado a otro agente`,
      'general', ticketId,
      {
        sendEmail: true,
        ticketNumber,
        ticketTitle: title,
        companyName,
      },
    );
  }

  // A los admins si quien asignó no es admin
  const admins = await getAdminsForTicketCompany(companyId);

  if (!admins.includes(byUserId)) {
    const assigneeName = newAssigneeId ? 'un agente' : 'nadie';
    await notifyMany(
      admins, byUserId,
      `Reasignación: ${ticketNumber}`,
      `"${title}" fue asignado a ${assigneeName}`,
      'ticket_assigned', ticketId,
      {
        sendEmail: true,
        ticketNumber,
        ticketTitle: title,
        assigneeName: newAssigneeName,
        companyName,
      },
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
  companyName?: string;
  oldStatus:   string;
  newStatus:   string;
  creatorId:   string | null;
  assigneeId:  string | null;
  byUserId:    string;
}) {
  const { ticketId, ticketNumber, title, companyId, companyName, oldStatus, newStatus, creatorId, assigneeId, byUserId } = opts;

  const admins = await getAdminsForTicketCompany(companyId);

  const STATUS_LABELS: Record<string, string> = {
    open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado',
  };
  const newLabel = STATUS_LABELS[newStatus] ?? newStatus;

  if (newStatus === 'resolved' || newStatus === 'closed') {
    const emailData = {
      sendEmail: true,
      ticketNumber,
      ticketTitle: title,
      status: newStatus,
      companyName,
    };

    // Notificar al creador
    if (creatorId && creatorId !== byUserId) {
      await notify(
        creatorId,
        `Ticket ${newLabel}: ${ticketNumber}`,
        `Tu ticket "${title}" fue marcado como ${newLabel.toLowerCase()}`,
        'ticket_resolved', ticketId,
        emailData,
      );
    }
    // Notificar a admins
    await notifyMany(
      admins, byUserId,
      `Ticket ${newLabel}: ${ticketNumber}`,
      `"${title}" fue marcado como ${newLabel.toLowerCase()}`,
      'ticket_resolved', ticketId,
      emailData,
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
      {
        sendEmail: true,
        ticketNumber,
        ticketTitle: title,
        companyName,
      },
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
  companyName?: string;
  newPriority: string;
  oldPriority: string;
  creatorId:   string | null;
  assigneeId:  string | null;
  byUserId:    string;
}) {
  const { ticketId, ticketNumber, title, companyId, companyName, newPriority, oldPriority, creatorId, assigneeId, byUserId } = opts;

  if (newPriority !== 'critical') return; // Solo notificar escalaciones a Crítico

  const admins = await getAdminsForTicketCompany(companyId);

  const targets = [...admins];
  if (assigneeId) targets.push(assigneeId);
  if (creatorId)  targets.push(creatorId);

  await notifyMany(
    targets, byUserId,
    `⚠️ Ticket escalado a Crítico: ${ticketNumber}`,
    `"${title}" fue escalado de ${oldPriority} a Crítico`,
    'ticket_escalated', ticketId,
    {
      sendEmail: true,
      ticketNumber,
      ticketTitle: title,
      oldPriority,
      newPriority,
      companyName,
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. NUEVO COMENTARIO
// ─ Asignado: nuevo comentario en su ticket
// ─ Creador: alguien respondió su ticket
// ─ Notas internas: solo notifican a admins y al asignado (no al creador)
// ═══════════════════════════════════════════════════════════════════════════
export async function onCommentAdded(opts: {
  ticketId:     string;
  ticketNumber: string;
  title:        string;
  companyId:    string;
  companyName?: string;
  creatorId:    string | null;
  assigneeId:   string | null;
  commenterId:  string;
  commenterName?: string;
  isInternal:   boolean;
}) {
  try {
    const { ticketId, ticketNumber, title, companyId, companyName, creatorId, assigneeId, commenterId, commenterName, isInternal } = opts;

    console.log('🔔 onCommentAdded called:', { ticketNumber, companyId, isInternal });

    const emailData = {
      sendEmail: true,
      ticketNumber,
      ticketTitle: title,
      commenterName,
      companyName,
    };

    if (isInternal) {
      console.log('📍 Internal comment - notifying admins and assignee');
      // Nota interna → solo admins y asignado (no el creador del ticket)
      const admins = await getAdminIds(companyId);
      const targets = [...admins];
      if (assigneeId) targets.push(assigneeId);
      console.log('📢 Calling notifyMany with targets:', targets.length);
      await notifyMany(
        targets, commenterId,
        `Nota interna en ${ticketNumber}`,
        `"${title}"`,
        'ticket_commented', ticketId,
        emailData,
      );
    } else {
      console.log('📍 Public comment - notifying creator and assignee');
      // Comentario público → creador y asignado
      const targets: string[] = [];
      if (creatorId)  targets.push(creatorId);
      if (assigneeId) targets.push(assigneeId);
      console.log('📢 Calling notifyMany with targets:', targets.length, targets);
      await notifyMany(
        targets, commenterId,
        `Nuevo comentario en ${ticketNumber}`,
        `"${title}"`,
        'ticket_commented', ticketId,
        emailData,
      );
    }
    console.log('✅ onCommentAdded completed');
  } catch (err) {
    console.error('❌ Error in onCommentAdded:', err);
  }
}
