import { supabase } from '../lib/supabase';

export interface AuthLog {
  id: string;
  company_id: string;
  user_id: string;
  action: 'login' | 'logout' | 'password_reset' | 'mfa_enabled';
  ip_address?: string;
  user_agent?: string;
  status: 'success' | 'failed';
  error_message?: string;
  created_at: string;
}

async function getClientIp(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      mode: 'cors'
    }).catch(() => null);
    if (!response) return null;
    const data = await response.json();
    return data.ip || null;
  } catch {
    return null;
  }
}

export async function logLogin(companyId: string, userId: string): Promise<void> {
  try {
    const ip = await getClientIp();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('auth_logs')
      .insert([
        {
          company_id: companyId,
          user_id: userId,
          action: 'login',
          ip_address: ip,
          user_agent: userAgent,
          status: 'success',
        },
      ]);

    if (error) {
      console.error('Error logging login:', error);
    }
  } catch (error) {
    console.error('Error in logLogin:', error);
  }
}

export async function logLogout(companyId: string, userId: string): Promise<void> {
  try {
    const ip = await getClientIp();
    const userAgent = navigator.userAgent;

    const { error } = await supabase
      .from('auth_logs')
      .insert([
        {
          company_id: companyId,
          user_id: userId,
          action: 'logout',
          ip_address: ip,
          user_agent: userAgent,
          status: 'success',
        },
      ]);

    if (error) {
      console.error('Error logging logout:', error);
    }
  } catch (error) {
    console.error('Error in logLogout:', error);
  }
}

export async function logPasswordReset(companyId: string, userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('auth_logs')
      .insert([
        {
          company_id: companyId,
          user_id: userId,
          action: 'password_reset',
          status: 'success',
        },
      ]);

    if (error) {
      console.error('Error logging password reset:', error);
    }
  } catch (error) {
    console.error('Error in logPasswordReset:', error);
  }
}

export async function getAuthLogs(companyId: string, limit: number = 100): Promise<AuthLog[]> {
  try {
    const { data, error } = await supabase
      .from('auth_logs')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching auth logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAuthLogs:', error);
    return [];
  }
}

export async function getUserAuthLogs(userId: string, limit: number = 50): Promise<AuthLog[]> {
  try {
    const { data, error } = await supabase
      .from('auth_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user auth logs:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getUserAuthLogs:', error);
    return [];
  }
}
