import { supabase } from './supabase';
import { Deployment, DeploymentStatus } from '../types';

export async function createDeployment(deployment: {
  client_company_id: string;
  platform_id: string;
  version: string;
  build_number: string;
  release_notes?: string;
}) {
  try {
    if (!deployment.client_company_id || !deployment.platform_id) {
      throw new Error('Client company ID and platform ID are required');
    }

    if (!deployment.version || !deployment.build_number) {
      throw new Error('Version and build number are required');
    }

    const { data, error } = await supabase
      .from('deployments')
      .insert([
        {
          client_company_id: deployment.client_company_id,
          platform_id: deployment.platform_id,
          version: deployment.version,
          build_number: deployment.build_number,
          release_notes: deployment.release_notes || '',
          status: 'draft',
        },
      ])
      .select(
        `
        *,
        platform:deployment_platforms(*),
        submitter:profiles!submitted_by(*),
        approver:profiles!approved_by(*),
        client:companies(*)
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create deployment: ${error.message}`);
    }

    if (!data) {
      throw new Error('No deployment data returned');
    }

    return data as Deployment;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating deployment:', message);
    throw new Error(message);
  }
}

export async function getClientDeployments(clientCompanyId: string) {
  try {
    if (!clientCompanyId) {
      return [];
    }

    const { data, error } = await supabase
      .from('deployments')
      .select(
        `
        *,
        platform:deployment_platforms(*),
        submitter:profiles!submitted_by(*),
        approver:profiles!approved_by(*),
        client:companies(*)
      `
      )
      .eq('client_company_id', clientCompanyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch deployments: ${error.message}`);
    }

    return (data || []) as Deployment[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching deployments:', message);
    throw new Error(message);
  }
}

export async function getDeployment(deploymentId: string) {
  try {
    if (!deploymentId) {
      throw new Error('Deployment ID is required');
    }

    const { data, error } = await supabase
      .from('deployments')
      .select(
        `
        *,
        platform:deployment_platforms(*),
        submitter:profiles!submitted_by(*),
        approver:profiles!approved_by(*),
        client:companies(*)
      `
      )
      .eq('id', deploymentId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch deployment: ${error.message}`);
    }

    return data as Deployment;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching deployment:', message);
    throw new Error(message);
  }
}

const selectDeployment = `
  *,
  platform:deployment_platforms(*),
  submitter:profiles!submitted_by(*),
  approver:profiles!approved_by(*),
  client:companies(*)
`;

async function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  additionalUpdates: Record<string, any> = {}
) {
  if (!deploymentId) {
    throw new Error('Deployment ID is required');
  }

  const { data, error } = await supabase
    .from('deployments')
    .update({
      status,
      updated_at: new Date().toISOString(),
      ...additionalUpdates,
    })
    .eq('id', deploymentId)
    .select(selectDeployment)
    .single();

  if (error) {
    throw new Error(`Failed to update deployment: ${error.message}`);
  }

  return data as Deployment;
}

export async function submitDeployment(deploymentId: string, userId: string) {
  try {
    return await updateDeploymentStatus(deploymentId, 'submitted', {
      submitted_by: userId,
      submitted_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error submitting deployment:', message);
    throw new Error(message);
  }
}

export async function approveDeployment(deploymentId: string, userId: string) {
  try {
    return await updateDeploymentStatus(deploymentId, 'approved', {
      approved_by: userId,
      approved_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error approving deployment:', message);
    throw new Error(message);
  }
}

export async function rejectDeployment(deploymentId: string, userId: string) {
  try {
    return await updateDeploymentStatus(deploymentId, 'rejected', {
      approved_by: userId,
      approved_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error rejecting deployment:', message);
    throw new Error(message);
  }
}

export async function markDeploymentLive(deploymentId: string) {
  try {
    return await updateDeploymentStatus(deploymentId, 'live', {
      live_at: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error marking deployment as live:', message);
    throw new Error(message);
  }
}

export async function rollbackDeployment(deploymentId: string, reason: string) {
  try {
    if (!reason) {
      throw new Error('Rollback reason is required');
    }

    return await updateDeploymentStatus(deploymentId, 'rollback', {
      rollback_at: new Date().toISOString(),
      rollback_reason: reason,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error rolling back deployment:', message);
    throw new Error(message);
  }
}

export async function updateDeployment(
  deploymentId: string,
  updates: Partial<Deployment>
) {
  try {
    if (!deploymentId) {
      throw new Error('Deployment ID is required');
    }

    const { data, error } = await supabase
      .from('deployments')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deploymentId)
      .select(selectDeployment)
      .single();

    if (error) {
      throw new Error(`Failed to update deployment: ${error.message}`);
    }

    return data as Deployment;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating deployment:', message);
    throw new Error(message);
  }
}
