import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { createNotification } from '../contexts/NotificationsContext';
import { getExpiringMemberships, markAlertSent } from '../lib/memberships';
import { getDaysUntilExpiration } from '../lib/membershipStatus';
import { sendMembershipExpiringEmail } from '../lib/emailService';

export function useMembershipAlerts() {
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile || profile.role !== 'admin' || !profile.company_id || !profile.id) {
      return;
    }

    const checkExpiringMemberships = async () => {
      try {
        const companyId = profile.company_id as string;
        const expiringMemberships = await getExpiringMemberships(companyId, 7);

        for (const membership of expiringMemberships) {
          const getAdminIds = async (cId: string): Promise<Array<{ id: string; email: string; full_name: string }>> => {
            const { data } = await supabase
              .from('profiles')
              .select('id, email, full_name')
              .eq('company_id', cId)
              .eq('role', 'admin')
              .eq('is_active', true);
            return (data || []) as Array<{ id: string; email: string; full_name: string }>;
          };

          const admins = await getAdminIds(companyId);
          const daysLeft = getDaysUntilExpiration(membership.expiration_date);

          for (const admin of admins) {
            const expirationDate = membership.expiration_date || '';

            await createNotification(
              admin.id,
              `Membresía por vencer: ${membership.name}`,
              `Tu membresía "${membership.name}" vence en ${daysLeft} día(s)`,
              'membership_expiring'
            );

            await sendMembershipExpiringEmail({
              email: admin.email,
              recipientName: admin.full_name,
              membershipName: membership.name,
              expirationDate: expirationDate,
              daysLeft: Math.max(0, daysLeft),
              cost: membership.cost,
              currency: membership.currency,
            });
          }

          await markAlertSent(membership.id);
        }
      } catch (error) {
        console.error('Error checking expiring memberships:', error);
      }
    };

    checkExpiringMemberships();
  }, [profile]);
}
