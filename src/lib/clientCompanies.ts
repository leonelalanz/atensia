import { supabase } from './supabase';
import { ClientCompany, Company, DeploymentPlatform, TestPlatform } from '../types';

export async function createClientCompany(
  adminCompanyId: string,
  clientData: Partial<Company> & { admin_name: string; admin_email: string }
) {
  try {
    if (!adminCompanyId) {
      throw new Error('Admin company ID is required');
    }

    if (!clientData.name) {
      throw new Error('Company name is required');
    }

    // 1. Create the client company
    const { data: clientCompany, error: companyError } = await supabase
      .from('companies')
      .insert([
        {
          name: clientData.name,
          logo_url: clientData.logo_url || '',
          primary_color: clientData.primary_color || '#2563eb',
          plan: clientData.plan || 'basic',
          status: 'active',
          maintenance_mode: false,
          admin_name: clientData.admin_name,
          admin_email: clientData.admin_email,
        },
      ])
      .select()
      .single();

    if (companyError) {
      throw new Error(`Failed to create company: ${companyError.message}`);
    }

    if (!clientCompany) {
      throw new Error('Failed to create company: no data returned');
    }

    // 2. Create the admin-client relationship
    const { data: relation, error: relationError } = await supabase
      .from('client_companies')
      .insert([
        {
          admin_company_id: adminCompanyId,
          client_company_id: clientCompany.id,
          client_contact_name: clientData.admin_name,
          client_contact_email: clientData.admin_email,
          client_contact_phone: '',
          status: 'active',
        },
      ])
      .select()
      .single();

    if (relationError) {
      // Cleanup: delete the company if relation fails
      await supabase.from('companies').delete().eq('id', clientCompany.id);
      throw new Error(`Failed to create relationship: ${relationError.message}`);
    }

    return { clientCompany, relation };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating client company:', message);
    throw new Error(message);
  }
}

export async function getAdminClients(adminCompanyId: string) {
  try {
    if (!adminCompanyId) {
      return [];
    }

    const { data, error } = await supabase
      .from('client_companies')
      .select(
        `
        id,
        admin_company_id,
        client_company_id,
        client_contact_name,
        client_contact_email,
        client_contact_phone,
        notes,
        status,
        created_at,
        updated_at,
        client_company:companies!client_company_id(*)
      `
      )
      .eq('admin_company_id', adminCompanyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch clients: ${error.message}`);
    }

    return (data || []) as (ClientCompany & { client_company: Company })[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching admin clients:', message);
    throw new Error(message);
  }
}

export async function getClientCompany(clientId: string) {
  try {
    if (!clientId) {
      throw new Error('Client ID is required');
    }

    const { data, error } = await supabase
      .from('client_companies')
      .select(
        `
        id,
        admin_company_id,
        client_company_id,
        client_contact_name,
        client_contact_email,
        client_contact_phone,
        notes,
        status,
        created_at,
        updated_at,
        client_company:companies!client_company_id(*)
      `
      )
      .eq('id', clientId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch client: ${error.message}`);
    }

    return data as ClientCompany & { client_company: Company };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching client company:', message);
    throw new Error(message);
  }
}

export async function updateClientCompany(
  clientId: string,
  updates: Partial<ClientCompany>
) {
  try {
    if (!clientId) {
      throw new Error('Client ID is required');
    }

    const { data, error } = await supabase
      .from('client_companies')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update client: ${error.message}`);
    }

    return data as ClientCompany;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating client company:', message);
    throw new Error(message);
  }
}

export async function suspendClientCompany(clientId: string) {
  return updateClientCompany(clientId, { status: 'suspended' });
}

export async function reactivateClientCompany(clientId: string) {
  return updateClientCompany(clientId, { status: 'active' });
}

export async function getDeploymentPlatforms(): Promise<DeploymentPlatform[]> {
  try {
    const { data, error } = await supabase
      .from('deployment_platforms')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch deployment platforms: ${error.message}`);
    }

    return (data || []) as DeploymentPlatform[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching deployment platforms:', message);
    return [];
  }
}

export async function getTestPlatforms(): Promise<TestPlatform[]> {
  try {
    const { data, error } = await supabase
      .from('test_platforms')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch test platforms: ${error.message}`);
    }

    return (data || []) as TestPlatform[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching test platforms:', message);
    return [];
  }
}
