export type UserRole = 'superadmin' | 'admin' | 'agent' | 'developer';
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low';
export type TicketCategory = 'soporte' | 'bug' | 'solicitud' | 'consulta' | 'otro';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type CompanyPlan = 'basic' | 'professional' | 'enterprise';
export type CompanyStatus = 'active' | 'suspended' | 'cancelled';
export type SubscriptionStatus = 'active' | 'trial' | 'expired' | 'cancelled';

export interface Company {
  id: string;
  name: string;
  logo_url: string;
  primary_color: string;
  plan: CompanyPlan;
  status: CompanyStatus;
  maintenance_mode: boolean;
  created_at: string;
  admin_name: string;
  admin_email: string;
}

export interface Subscription {
  id: string;
  company_id: string;
  plan: CompanyPlan;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string | null;
  amount: number;
  currency: string;
  created_at: string;
  company?: Company;
}

export interface Profile {
  id: string;
  company_id: string | null;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_emoji: string;
  avatar_color: string;
  is_active: boolean;
  created_at: string;
  company?: Company;
}

export interface SLAPolicy {
  id: string;
  company_id: string;
  priority: TicketPriority;
  first_response_hours: number;
  resolution_hours: number;
  created_at: string;
}

export interface SLARecord {
  id: string;
  ticket_id: string;
  first_response_deadline: string | null;
  resolution_deadline: string | null;
  first_response_met: boolean | null;
  resolution_met: boolean | null;
  first_responded_at: string | null;
  created_at: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  company_id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  status: TicketStatus;
  created_by: string | null;
  assigned_to: string | null;
  due_date: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  creator?: Profile;
  assignee?: Profile;
  sla_record?: SLARecord;
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  author?: Profile;
}

export interface TicketAttachment {
  id: string;
  ticket_id: string;
  comment_id: string | null;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  uploaded_by: string;
  created_at: string;
  uploader?: Profile;
}

export interface TicketHistory {
  id: string;
  ticket_id: string;
  user_id: string | null;
  field_changed: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user?: Profile;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  company_id: string;
  date: string;
  description: string;
  hours_spent: number;
  ticket_id: string | null;
  created_at: string;
  user?: Profile;
  ticket?: Ticket;
}

export type Route =
  | 'login'
  | 'forgot-password'
  | 'reset-password'
  | 'dashboard'
  | 'tickets'
  | 'ticket-detail'
  | 'new-ticket'
  | 'users'
  | 'companies'
  | 'subscriptions'
  | 'sla'
  | 'activities'
  | 'settings'
  | 'help'
  | 'branding';

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'ticket_created' | 'ticket_assigned' | 'ticket_resolved' | 'ticket_commented' | 'ticket_escalated' | 'general';
  ticket_id: string | null;
  read: boolean;
  created_at: string;
  ticket?: Pick<Ticket, 'id' | 'ticket_number' | 'title'>;
}

