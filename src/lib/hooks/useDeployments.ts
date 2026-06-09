import { useState, useEffect } from 'react';
import { Deployment } from '../../types';
import * as deploymentsService from '../deployments';

interface UseDeploymentsResult {
  deployments: Deployment[];
  loading: boolean;
  error: Error | null;
  createDeployment: (deployment: {
    client_company_id: string;
    platform_id: string;
    version: string;
    build_number: string;
    release_notes?: string;
  }) => Promise<Deployment>;
  submitDeployment: (id: string, userId: string) => Promise<void>;
  approveDeployment: (id: string, userId: string) => Promise<void>;
  rejectDeployment: (id: string, userId: string) => Promise<void>;
  markLive: (id: string) => Promise<void>;
  rollback: (id: string, reason: string) => Promise<void>;
  refreshDeployments: () => Promise<void>;
}

export function useDeployments(clientCompanyId: string): UseDeploymentsResult {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const data = await deploymentsService.getClientDeployments(clientCompanyId);
      setDeployments(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientCompanyId) {
      fetchDeployments();
    }
  }, [clientCompanyId]);

  const createDeployment = async (deployment: {
    client_company_id: string;
    platform_id: string;
    version: string;
    build_number: string;
    release_notes?: string;
  }) => {
    try {
      const result = await deploymentsService.createDeployment(deployment);
      await fetchDeployments();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create deployment'));
      throw err;
    }
  };

  const submitDeployment = async (id: string, userId: string) => {
    try {
      await deploymentsService.submitDeployment(id, userId);
      await fetchDeployments();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to submit deployment'));
      throw err;
    }
  };

  const approveDeployment = async (id: string, userId: string) => {
    try {
      await deploymentsService.approveDeployment(id, userId);
      await fetchDeployments();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to approve deployment'));
      throw err;
    }
  };

  const rejectDeployment = async (id: string, userId: string) => {
    try {
      await deploymentsService.rejectDeployment(id, userId);
      await fetchDeployments();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reject deployment'));
      throw err;
    }
  };

  const markLive = async (id: string) => {
    try {
      await deploymentsService.markDeploymentLive(id);
      await fetchDeployments();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark deployment as live'));
      throw err;
    }
  };

  const rollback = async (id: string, reason: string) => {
    try {
      await deploymentsService.rollbackDeployment(id, reason);
      await fetchDeployments();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to rollback deployment'));
      throw err;
    }
  };

  return {
    deployments,
    loading,
    error,
    createDeployment,
    submitDeployment,
    approveDeployment,
    rejectDeployment,
    markLive,
    rollback,
    refreshDeployments: fetchDeployments,
  };
}
