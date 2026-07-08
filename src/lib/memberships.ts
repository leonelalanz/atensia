import { supabase } from './supabase';
import { Membership, MembershipRenewal, Profile } from '../types';

export async function getMemberships(profile: Profile | null) {
  try {
    if (!profile) return [];
    let query = supabase.from('memberships').select(
      profile.role === 'superadmin'
        ? '*, company:companies(*)'
        : '*'
    );

    if (profile.role === 'admin' && profile.company_id) {
      query = query.eq('company_id', profile.company_id);
    }

    const { data, error } = await query.order('expiration_date', { ascending: true, nullsFirst: false });

    if (error) {
      throw new Error(`Failed to fetch memberships: ${error.message}`);
    }

    return (data || []) as Membership[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching memberships:', message);
    throw new Error(message);
  }
}

export async function createMembership(payload: Partial<Membership>) {
  try {
    if (!payload.company_id) throw new Error('Company ID is required');
    if (!payload.name) throw new Error('Membership name is required');
    if (!payload.start_date) throw new Error('Start date is required');

    const { data, error } = await supabase
      .from('memberships')
      .insert([
        {
          company_id: payload.company_id,
          name: payload.name,
          url: payload.url || null,
          cost: payload.cost || 0,
          currency: payload.currency || 'USD',
          start_date: payload.start_date,
          expiration_date: payload.expiration_date || null,
          status: 'active',
          notes: payload.notes || '',
          created_by: payload.created_by || null,
        },
      ])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create membership: ${error.message}`);
    }

    return data as Membership;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating membership:', message);
    throw new Error(message);
  }
}

export async function updateMembership(id: string, updates: Partial<Membership>) {
  try {
    if (!id) throw new Error('Membership ID is required');

    const { data, error } = await supabase
      .from('memberships')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update membership: ${error.message}`);
    }

    return data as Membership;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating membership:', message);
    throw new Error(message);
  }
}

export async function deleteMembership(id: string) {
  try {
    if (!id) throw new Error('Membership ID is required');

    const { error } = await supabase.from('memberships').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete membership: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting membership:', message);
    throw new Error(message);
  }
}

export async function getRenewals(membershipId: string) {
  try {
    if (!membershipId) return [];

    const { data, error } = await supabase
      .from('membership_renewals')
      .select('*')
      .eq('membership_id', membershipId)
      .order('renewed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch renewals: ${error.message}`);
    }

    return (data || []) as MembershipRenewal[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching renewals:', message);
    throw new Error(message);
  }
}

export async function addRenewal(
  membershipId: string,
  opts: { new_expiration_date: string; amount?: number; notes?: string; created_by?: string }
) {
  try {
    if (!membershipId) throw new Error('Membership ID is required');
    if (!opts.new_expiration_date) throw new Error('New expiration date is required');

    const membership = await supabase
      .from('memberships')
      .select('expiration_date')
      .eq('id', membershipId)
      .single();

    if (membership.error) {
      throw new Error(`Failed to fetch membership: ${membership.error.message}`);
    }

    const { data: renewalData, error: renewalError } = await supabase
      .from('membership_renewals')
      .insert([
        {
          membership_id: membershipId,
          previous_expiration_date: membership.data?.expiration_date || null,
          new_expiration_date: opts.new_expiration_date,
          amount: opts.amount || null,
          notes: opts.notes || '',
          created_by: opts.created_by || null,
        },
      ])
      .select()
      .single();

    if (renewalError) {
      throw new Error(`Failed to create renewal: ${renewalError.message}`);
    }

    const { data: updatedMembership, error: updateError } = await supabase
      .from('memberships')
      .update({
        expiration_date: opts.new_expiration_date,
        status: 'active',
        last_alert_sent_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membershipId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update membership: ${updateError.message}`);
    }

    return { renewal: renewalData, membership: updatedMembership };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error adding renewal:', message);
    throw new Error(message);
  }
}

export async function getExpiringMemberships(companyId: string, days = 7) {
  try {
    if (!companyId) return [];

    const now = new Date();
    const futureDate = new Date(now.getTime() + days * 86_400_000);

    const { data, error } = await supabase
      .from('memberships')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .not('expiration_date', 'is', null)
      .gte('expiration_date', now.toISOString().split('T')[0])
      .lte('expiration_date', futureDate.toISOString().split('T')[0])
      .or(`last_alert_sent_at.is.null,last_alert_sent_at.lt.${new Date(now.getTime() - 24 * 3600000).toISOString()}`);

    if (error) {
      throw new Error(`Failed to fetch expiring memberships: ${error.message}`);
    }

    return (data || []) as Membership[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching expiring memberships:', message);
    return [];
  }
}

export async function markAlertSent(membershipId: string) {
  try {
    if (!membershipId) throw new Error('Membership ID is required');

    const { error } = await supabase
      .from('memberships')
      .update({ last_alert_sent_at: new Date().toISOString() })
      .eq('id', membershipId);

    if (error) {
      throw new Error(`Failed to mark alert as sent: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error marking alert as sent:', message);
  }
}
