import { TicketPriority, SLAPolicy, SLARecord } from '../types';

export const DEFAULT_SLA: Record<TicketPriority, { first_response_hours: number; resolution_hours: number }> = {
  critical: { first_response_hours: 1, resolution_hours: 4 },
  high: { first_response_hours: 4, resolution_hours: 8 },
  medium: { first_response_hours: 8, resolution_hours: 24 },
  low: { first_response_hours: 24, resolution_hours: 72 },
};

export function calculateSLADeadlines(
  priority: TicketPriority,
  createdAt: string,
  policies: SLAPolicy[]
): { firstResponseDeadline: Date; resolutionDeadline: Date } {
  const policy = policies.find((p) => p.priority === priority);
  const { first_response_hours, resolution_hours } = policy ?? DEFAULT_SLA[priority];

  const created = new Date(createdAt);
  const firstResponseDeadline = new Date(created.getTime() + first_response_hours * 3600 * 1000);
  const resolutionDeadline = new Date(created.getTime() + resolution_hours * 3600 * 1000);

  return { firstResponseDeadline, resolutionDeadline };
}

export type SLAStatus = 'met' | 'breached' | 'at_risk' | 'pending';

export function getSLAStatus(deadline: string | null, metFlag: boolean | null): SLAStatus {
  if (metFlag === true) return 'met';
  if (metFlag === false) return 'breached';
  if (!deadline) return 'pending';

  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffHours = diffMs / (1000 * 3600);

  if (diffMs < 0) return 'breached';
  if (diffHours < 1) return 'at_risk';
  return 'pending';
}

export function formatSLATime(deadline: string | null): string {
  if (!deadline) return '—';
  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const absDiffMs = Math.abs(diffMs);
  const hours = Math.floor(absDiffMs / (1000 * 3600));
  const minutes = Math.floor((absDiffMs % (1000 * 3600)) / 60000);

  if (diffMs < 0) return `Vencido hace ${hours}h ${minutes}m`;
  if (hours > 48) {
    const days = Math.floor(hours / 24);
    return `${days}d restantes`;
  }
  return `${hours}h ${minutes}m restantes`;
}

export function getSLAOverallStatus(slaRecord: SLARecord | undefined): SLAStatus {
  if (!slaRecord) return 'pending';
  const firstStatus = getSLAStatus(slaRecord.first_response_deadline, slaRecord.first_response_met);
  const resStatus = getSLAStatus(slaRecord.resolution_deadline, slaRecord.resolution_met);

  if (firstStatus === 'breached' || resStatus === 'breached') return 'breached';
  if (firstStatus === 'at_risk' || resStatus === 'at_risk') return 'at_risk';
  if (firstStatus === 'met' && resStatus === 'met') return 'met';
  return 'pending';
}
