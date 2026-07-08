import { MembershipStatus } from '../types';

export type MembershipDisplayStatus = 'active' | 'expiring_soon' | 'expired' | 'cancelled';

export function getMembershipDisplayStatus(
  status: MembershipStatus,
  expirationDate: string | null,
  thresholdDays = 7
): MembershipDisplayStatus {
  if (status === 'cancelled') return 'cancelled';
  if (!expirationDate) return 'active';

  const diffDays = (new Date(expirationDate).getTime() - Date.now()) / 86_400_000;
  if (diffDays < 0) return 'expired';
  if (diffDays <= thresholdDays) return 'expiring_soon';
  return 'active';
}

export function getDaysUntilExpiration(expirationDate: string | null): number {
  if (!expirationDate) return Infinity;
  return Math.ceil((new Date(expirationDate).getTime() - Date.now()) / 86_400_000);
}
