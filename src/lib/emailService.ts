import { supabase } from './supabase';
import { getEmailTemplate } from './emailTemplates';

interface SendEmailOptions {
  to: string;
  type: string;
  data: Record<string, any>;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const { to, type, data, replyTo } = options;

    if (!to || !type) {
      console.error('❌ Missing required email parameters:', { to, type });
      return { success: false, error: 'Faltan parámetros requeridos' };
    }

    const { subject, html } = getEmailTemplate(type, data);

    console.log(`📧 Sending email to ${to}: ${subject}`);

    // Call the Supabase Edge Function
    console.log('🔄 Invoking send-email function...');
    const { data: response, error } = await supabase.functions.invoke('send-email', {
      body: {
        to,
        subject,
        html,
        replyTo: replyTo || 'support@atensia.app',
      },
    });

    console.log('📨 Function response:', { response, error });

    if (error) {
      console.error('❌ Email send error:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message };
    }

    if (!response) {
      console.warn('⚠️ No response from function');
      return { success: false, error: 'No response from function' };
    }

    console.log('✅ Email sent successfully:', response);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error in sendEmail:', error);
    return { success: false, error: error.message };
  }
}

export async function sendTicketNotificationEmail(opts: {
  type: 'ticket_created' | 'ticket_assigned' | 'ticket_resolved' | 'ticket_commented' | 'ticket_escalated';
  recipientEmail: string;
  recipientName?: string;
  ticketNumber: string;
  ticketTitle: string;
  companyName?: string;
  priority?: string;
  description?: string;
  assigneeName?: string;
  status?: string;
  oldPriority?: string;
  newPriority?: string;
  commenterName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const data: Record<string, any> = {
    ticketNumber: opts.ticketNumber,
    title: opts.ticketTitle,
    companyName: opts.companyName,
    ...(opts.priority && { priority: opts.priority }),
    ...(opts.description && { description: opts.description }),
    ...(opts.assigneeName && { assigneeName: opts.assigneeName }),
    ...(opts.status && { status: opts.status }),
    ...(opts.oldPriority && { oldPriority: opts.oldPriority }),
    ...(opts.newPriority && { newPriority: opts.newPriority }),
    ...(opts.commenterName && { commenterName: opts.commenterName }),
  };

  return sendEmail({
    to: opts.recipientEmail,
    type: opts.type,
    data,
  });
}

export async function sendUserRegistrationEmail(opts: {
  email: string;
  name: string;
  companyName?: string;
  loginUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: opts.email,
    type: 'user_registered',
    data: {
      userName: opts.name,
      email: opts.email,
      companyName: opts.companyName,
      loginUrl: opts.loginUrl,
    },
  });
}

export async function sendPasswordChangedEmail(opts: {
  email: string;
  name: string;
  companyName?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: opts.email,
    type: 'password_changed',
    data: {
      userName: opts.name,
      companyName: opts.companyName,
    },
  });
}

export async function sendPasswordResetEmail(opts: {
  email: string;
  resetLink: string;
  expiresIn?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: opts.email,
    type: 'password_reset',
    data: {
      resetLink: opts.resetLink,
      expiresIn: opts.expiresIn || '24 horas',
    },
  });
}

export async function sendPaymentApprovedEmail(opts: {
  email: string;
  companyName: string;
  planName: string;
  planPrice: number;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: opts.email,
    type: 'payment_approved',
    data: {
      companyName: opts.companyName,
      planName: opts.planName,
      planPrice: opts.planPrice,
    },
  });
}

export async function sendPaymentRejectedEmail(opts: {
  email: string;
  companyName: string;
  planName: string;
  rejectionReason?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: opts.email,
    type: 'payment_rejected',
    data: {
      companyName: opts.companyName,
      planName: opts.planName,
      rejectionReason: opts.rejectionReason,
    },
  });
}

export async function sendInvoiceEmail(opts: {
  email: string;
  companyName: string;
  invoiceNumber: string;
  plan: string;
  amount: number;
  dueDate: string;
  invoiceUrl?: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: opts.email,
    type: 'invoice_generated',
    data: {
      companyName: opts.companyName,
      invoiceNumber: opts.invoiceNumber,
      plan: opts.plan,
      amount: opts.amount,
      dueDate: opts.dueDate,
      invoiceUrl: opts.invoiceUrl,
    },
  });
}

export async function sendMembershipExpiringEmail(opts: {
  email: string;
  recipientName?: string;
  membershipName: string;
  expirationDate: string;
  daysLeft: number;
  cost: number;
  currency: string;
}): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to: opts.email,
    type: 'membership_expiring',
    data: {
      recipientName: opts.recipientName,
      membershipName: opts.membershipName,
      expirationDate: opts.expirationDate,
      daysLeft: opts.daysLeft,
      cost: opts.cost,
      currency: opts.currency,
    },
  });
}
