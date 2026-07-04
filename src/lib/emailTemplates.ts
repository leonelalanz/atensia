export function getEmailTemplate(type: string, data: Record<string, any>): { subject: string; html: string } {
  switch (type) {
    case 'invoice_generated':
      return invoiceGeneratedTemplate(data);
    case 'payment_approved':
      return paymentApprovedTemplate(data);
    case 'payment_rejected':
      return paymentRejectedTemplate(data);
    case 'ticket_created':
      return ticketCreatedTemplate(data);
    case 'ticket_assigned':
      return ticketAssignedTemplate(data);
    case 'ticket_resolved':
      return ticketResolvedTemplate(data);
    case 'ticket_commented':
      return ticketCommentedTemplate(data);
    case 'ticket_escalated':
      return ticketEscalatedTemplate(data);
    case 'user_registered':
      return userRegisteredTemplate(data);
    case 'password_changed':
      return passwordChangedTemplate(data);
    case 'password_reset':
      return passwordResetTemplate(data);
    default:
      return genericTemplate(data);
  }
}

function ticketCreatedTemplate(data: {
  ticketNumber: string;
  title: string;
  description?: string;
  priority: string;
  creatorName?: string;
  companyName?: string;
}): { subject: string; html: string } {
  const subject = `Nuevo Ticket: ${data.ticketNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #2563eb; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { color: #1f2937; font-size: 14px; margin-top: 4px; }
          .button { display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Nuevo Ticket Creado</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.companyName || 'Atensia'}</p>
          </div>
          <div class="content">
            <div class="ticket-info">
              <div class="label">Número de Ticket</div>
              <div class="value">${data.ticketNumber}</div>

              <div class="label" style="margin-top: 15px;">Asunto</div>
              <div class="value">${data.title}</div>

              <div class="label" style="margin-top: 15px;">Prioridad</div>
              <div class="value">${capitalizeFirst(data.priority)}</div>

              ${data.description ? `
                <div class="label" style="margin-top: 15px;">Descripción</div>
                <div class="value">${data.description}</div>
              ` : ''}
            </div>

            <a href="https://atensia.vercel.app/tickets" class="button">Ver Ticket</a>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function ticketAssignedTemplate(data: {
  ticketNumber: string;
  title: string;
  assigneeName?: string;
  companyName?: string;
}): { subject: string; html: string } {
  const subject = `Ticket Asignado: ${data.ticketNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #0891b2; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #0891b2; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { color: #1f2937; font-size: 14px; margin-top: 4px; }
          .button { display: inline-block; padding: 10px 20px; background: #0891b2; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Te han asignado un Ticket</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.companyName || 'Atensia'}</p>
          </div>
          <div class="content">
            <p>Hola ${data.assigneeName || 'Agente'},</p>
            <p>Se te ha asignado un nuevo ticket:</p>

            <div class="ticket-info">
              <div class="label">Número de Ticket</div>
              <div class="value">${data.ticketNumber}</div>

              <div class="label" style="margin-top: 15px;">Asunto</div>
              <div class="value">${data.title}</div>
            </div>

            <a href="https://atensia.vercel.app/tickets" class="button">Ir al Ticket</a>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function ticketResolvedTemplate(data: {
  ticketNumber: string;
  title: string;
  status: string;
  companyName?: string;
}): { subject: string; html: string } {
  const subject = `Ticket ${capitalizeFirst(data.status)}: ${data.ticketNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #16a34a; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { color: #1f2937; font-size: 14px; margin-top: 4px; }
          .button { display: inline-block; padding: 10px 20px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Ticket ${capitalizeFirst(data.status)}</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.companyName || 'Atensia'}</p>
          </div>
          <div class="content">
            <p>Tu ticket ha sido ${data.status === 'resolved' ? 'resuelto' : 'cerrado'}:</p>

            <div class="ticket-info">
              <div class="label">Número de Ticket</div>
              <div class="value">${data.ticketNumber}</div>

              <div class="label" style="margin-top: 15px;">Asunto</div>
              <div class="value">${data.title}</div>
            </div>

            <a href="https://atensia.vercel.app/tickets" class="button">Ver Detalles</a>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function ticketCommentedTemplate(data: {
  ticketNumber: string;
  title: string;
  commenterName?: string;
  companyName?: string;
}): { subject: string; html: string } {
  const subject = `Nuevo comentario en ${data.ticketNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #7c3aed; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #7c3aed; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { color: #1f2937; font-size: 14px; margin-top: 4px; }
          .button { display: inline-block; padding: 10px 20px; background: #7c3aed; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Nuevo Comentario</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.companyName || 'Atensia'}</p>
          </div>
          <div class="content">
            <p>${data.commenterName || 'Un usuario'} agregó un comentario a tu ticket:</p>

            <div class="ticket-info">
              <div class="label">Número de Ticket</div>
              <div class="value">${data.ticketNumber}</div>

              <div class="label" style="margin-top: 15px;">Asunto</div>
              <div class="value">${data.title}</div>
            </div>

            <a href="https://atensia.vercel.app/tickets" class="button">Ver Comentario</a>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function ticketEscalatedTemplate(data: {
  ticketNumber: string;
  title: string;
  oldPriority: string;
  newPriority: string;
  companyName?: string;
}): { subject: string; html: string } {
  const subject = `⚠️ Ticket Escalado: ${data.ticketNumber}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .ticket-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626; }
          .label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
          .value { color: #1f2937; font-size: 14px; margin-top: 4px; }
          .button { display: inline-block; padding: 10px 20px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">⚠️ Ticket Escalado a Crítico</h1>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">${data.companyName || 'Atensia'}</p>
          </div>
          <div class="content">
            <p>Un ticket ha sido escalado a máxima prioridad:</p>

            <div class="ticket-info">
              <div class="label">Número de Ticket</div>
              <div class="value">${data.ticketNumber}</div>

              <div class="label" style="margin-top: 15px;">Asunto</div>
              <div class="value">${data.title}</div>

              <div class="label" style="margin-top: 15px;">Escalado de</div>
              <div class="value">${capitalizeFirst(data.oldPriority)} → ${capitalizeFirst(data.newPriority)}</div>
            </div>

            <a href="https://atensia.vercel.app/tickets" class="button">Atender Ahora</a>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function userRegisteredTemplate(data: {
  userName: string;
  email: string;
  companyName?: string;
  loginUrl?: string;
}): { subject: string; html: string } {
  const subject = `Bienvenido a Atensia`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); color: white; padding: 40px 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">¡Bienvenido a Atensia!</h1>
          </div>
          <div class="content">
            <p>Hola ${data.userName},</p>
            <p>Tu cuenta ha sido creada exitosamente en <strong>${data.companyName || 'Atensia'}</strong>.</p>

            <p><strong>Datos de acceso:</strong></p>
            <p>Email: ${data.email}</p>

            <p>Puedes acceder a tu cuenta usando tus credenciales.</p>

            <a href="${data.loginUrl || 'https://atensia.app/login'}" class="button">Iniciar Sesión</a>

            <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
              Si tienes preguntas, contacta al equipo de soporte.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function passwordChangedTemplate(data: {
  userName: string;
  companyName?: string;
}): { subject: string; html: string } {
  const subject = `Tu contraseña ha sido actualizada`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .alert { background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Contraseña Actualizada</h1>
          </div>
          <div class="content">
            <p>Hola ${data.userName},</p>

            <div class="alert">
              <strong>✓ Tu contraseña ha sido actualizada exitosamente</strong>
            </div>

            <p>Si no realizaste este cambio, por favor contacta al equipo de soporte inmediatamente.</p>

            <p style="margin-top: 30px; color: #6b7280; font-size: 12px;">
              Este es un mensaje automático. Por favor no respondas a este correo.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function passwordResetTemplate(data: {
  resetLink: string;
  expiresIn?: string;
}): { subject: string; html: string } {
  const subject = `Recupera tu contraseña`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ea580c; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; padding: 12px 30px; background: #ea580c; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Recupera tu Contraseña</h1>
          </div>
          <div class="content">
            <p>Recibimos una solicitud para recuperar tu contraseña.</p>

            <p>Haz clic en el botón de abajo para establecer una nueva contraseña:</p>

            <a href="${data.resetLink}" class="button">Recuperar Contraseña</a>

            <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
              ${data.expiresIn ? `Este enlace expira en ${data.expiresIn}.` : 'Este enlace expira en 24 horas.'}
            </p>

            <p style="color: #6b7280; font-size: 12px;">
              Si no solicitaste este cambio, ignora este correo.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function genericTemplate(data: {
  subject?: string;
  body?: string;
}): { subject: string; html: string } {
  const subject = data.subject || 'Notificación de Atensia';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px;">${subject}</h1>
          </div>
          <div class="content">
            <p>${data.body || 'Tienes una nueva notificación de Atensia.'}</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function paymentApprovedTemplate(data: {
  companyName: string;
  planName: string;
  planPrice: number;
}): { subject: string; html: string } {
  const subject = `✓ Pago Aprobado - ${data.planName}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .success-box { background: #dcfce7; border: 2px solid #16a34a; padding: 15px; border-radius: 8px; margin: 15px 0; text-align: center; }
          .plan-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .button { background: #16a34a; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">¡Pago Aprobado!</h1>
          </div>
          <div class="content">
            <p>Hola ${data.companyName},</p>

            <div class="success-box">
              <h2 style="margin: 0; color: #16a34a;">Tu comprobante de pago ha sido validado correctamente</h2>
            </div>

            <div class="plan-box">
              <p style="margin: 0 0 10px 0; color: #6b7280;"><strong>Plan Activado:</strong></p>
              <p style="margin: 0 0 5px 0; font-size: 18px; font-weight: bold;">${data.planName}</p>
              <p style="margin: 0; color: #6b7280;">Monto pagado: $${data.planPrice} USD</p>
            </div>

            <p>Tu suscripción ha sido activada y ahora tienes acceso a todas las características del plan ${data.planName}.</p>

            <a href="https://atensia.vercel.app" class="button">Ir a mi Cuenta</a>

            <p style="color: #6b7280; margin-top: 20px;">Si tienes preguntas, no dudes en contactarnos.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function paymentRejectedTemplate(data: {
  companyName: string;
  planName: string;
  rejectionReason?: string;
}): { subject: string; html: string } {
  const subject = `⚠️ Comprobante de Pago Rechazado`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .error-box { background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .reason-box { background: white; border-left: 4px solid #dc2626; padding: 15px; border-radius: 4px; margin: 15px 0; }
          .button { background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Comprobante Rechazado</h1>
          </div>
          <div class="content">
            <p>Hola ${data.companyName},</p>

            <div class="error-box">
              <h2 style="margin: 0; color: #dc2626;">No pudimos validar tu comprobante de pago</h2>
            </div>

            ${data.rejectionReason ? `
            <div class="reason-box">
              <p style="margin: 0 0 5px 0; color: #6b7280;"><strong>Motivo:</strong></p>
              <p style="margin: 0; color: #1f2937;">${data.rejectionReason}</p>
            </div>
            ` : ''}

            <p>Por favor, revisa el comprobante y vuelve a enviarlo. Asegúrate de que:</p>
            <ul style="color: #6b7280;">
              <li>El monto coincida exactamente con el del plan</li>
              <li>La fecha de la transacción sea reciente</li>
              <li>Los datos del receptor sean correctos</li>
              <li>La imagen sea clara y legible</li>
            </ul>

            <a href="https://atensia.vercel.app" class="button">Enviar Nuevo Comprobante</a>

            <p style="color: #6b7280; margin-top: 20px;">Si crees que esto es un error, contáctanos inmediatamente.</p>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function invoiceGeneratedTemplate(data: {
  companyName: string;
  invoiceNumber: string;
  plan: string;
  amount: number;
  dueDate: string;
  invoiceUrl?: string;
}): { subject: string; html: string } {
  const subject = `Factura ${data.invoiceNumber} - Plan ${data.plan}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
          .invoice-box { background: white; border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .invoice-number { font-size: 18px; font-weight: bold; color: #2563eb; }
          .amount { font-size: 24px; font-weight: bold; color: #2563eb; margin: 10px 0; }
          .button { background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; margin: 15px 0; }
          .due-date { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">Tu Factura está Lista</h1>
          </div>
          <div class="content">
            <p>Hola ${data.companyName},</p>

            <p>Te enviamos tu factura de suscripción. Aquí están los detalles:</p>

            <div class="invoice-box">
              <div class="invoice-number">${data.invoiceNumber}</div>
              <p style="margin: 5px 0; color: #6b7280;">Plan: ${data.plan}</p>

              <div class="amount">$${data.amount.toFixed(2)} USD</div>

              <p style="margin: 10px 0 0 0; color: #6b7280;">
                <strong>Vencimiento:</strong> ${new Date(data.dueDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            <div class="due-date">
              <p style="margin: 0;"><strong>⏰ Fecha de Vencimiento</strong></p>
              <p style="margin: 5px 0 0 0; color: #92400e;">Tienes hasta el ${new Date(data.dueDate).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} para realizar el pago.</p>
            </div>

            ${data.invoiceUrl ? `<a href="${data.invoiceUrl}" class="button">Descargar Factura PDF</a>` : ''}

            <p style="color: #6b7280; margin-top: 20px;">
              Si tienes preguntas sobre tu factura, por favor contáctanos.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
  return { subject, html };
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
