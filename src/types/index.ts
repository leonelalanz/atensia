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
  company?: Company;
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

// ============================================================
// AGENCY STRUCTURE
// ============================================================

export interface ClientCompany {
  id: string;
  admin_company_id: string;
  client_company_id: string;
  client_contact_name: string;
  client_contact_email: string;
  client_contact_phone: string;
  notes: string;
  status: 'active' | 'inactive' | 'suspended';
  created_at: string;
  updated_at: string;
  admin_company?: Company;
  client_company?: Company;
}

export interface DeploymentPlatform {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export type DeploymentStatus = 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'live' | 'rollback';

export interface Deployment {
  id: string;
  client_company_id: string;
  platform_id: string;
  version: string;
  build_number: string;
  release_notes: string;
  status: DeploymentStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  live_at: string | null;
  rollback_at: string | null;
  rollback_reason: string | null;
  created_at: string;
  updated_at: string;
  platform?: DeploymentPlatform;
  submitter?: Profile;
  approver?: Profile;
  client?: Company;
}

export interface TestPlatform {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
  created_at: string;
}

export type TestBuildStatus = 'created' | 'distributed' | 'testing' | 'completed' | 'failed' | 'archived';

export interface TestBuild {
  id: string;
  client_company_id: string;
  platform_id: string;
  version: string;
  build_number: string;
  test_url: string;
  build_file_url: string;
  test_notes: string;
  status: TestBuildStatus;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
  updated_at: string;
  platform?: TestPlatform;
  uploader?: Profile;
  client?: Company;
}

export type ReportType = 'tickets' | 'deployments' | 'testing' | 'combined' | 'custom';

export interface Report {
  id: string;
  admin_company_id: string;
  client_company_id: string | null;
  title: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  data: Record<string, any>;
  generated_by: string;
  created_at: string;
  updated_at: string;
  admin_company?: Company;
  client_company?: Company;
  generator?: Profile;
}

export type Route =
  | 'login'
  | 'signup'
  | 'forgot-password'
  | 'reset-password'
  | 'pricing'
  | 'dashboard'
  | 'tickets'
  | 'ticket-detail'
  | 'new-ticket'
  | 'users'
  | 'companies'
  | 'exchange-rates'
  | 'subscriptions'
  | 'sla'
  | 'activities'
  | 'audit'
  | 'payment-proofs'
  | 'settings'
  | 'help'
  | 'branding'
  | 'terms'
  | 'privacy'
  | 'plans-management'
  | 'upgrade-plan'
  | 'clientes'
  | 'despliegues';

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

