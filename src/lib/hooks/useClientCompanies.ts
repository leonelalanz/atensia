import { useState, useEffect } from 'react';
import { ClientCompany, Company } from '../../types';
import * as clientCompaniesService from '../clientCompanies';

interface UseClientCompaniesResult {
  clients: ClientCompany[];
  loading: boolean;
  error: Error | null;
  addClient: (adminId: string, clientData: Partial<Company> & { admin_name: string; admin_email: string }) => Promise<void>;
  updateClient: (clientId: string, updates: Partial<ClientCompany>) => Promise<void>;
  refreshClients: () => Promise<void>;
  suspendClient: (clientId: string) => Promise<void>;
  reactivateClient: (clientId: string) => Promise<void>;
}

export function useClientCompanies(adminCompanyId: string): UseClientCompaniesResult {
  const [clients, setClients] = useState<ClientCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientCompaniesService.getAdminClients(adminCompanyId);
      setClients(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminCompanyId) {
      fetchClients();
    }
  }, [adminCompanyId]);

  const addClient = async (
    adminId: string,
    clientData: Partial<Company> & { admin_name: string; admin_email: string }
  ) => {
    try {
      await clientCompaniesService.createClientCompany(adminId, clientData);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add client'));
      throw err;
    }
  };

  const updateClient = async (clientId: string, updates: Partial<ClientCompany>) => {
    try {
      await clientCompaniesService.updateClientCompany(clientId, updates);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update client'));
      throw err;
    }
  };

  const suspendClient = async (clientId: string) => {
    try {
      await clientCompaniesService.suspendClientCompany(clientId);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to suspend client'));
      throw err;
    }
  };

  const reactivateClient = async (clientId: string) => {
    try {
      await clientCompaniesService.reactivateClientCompany(clientId);
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reactivate client'));
      throw err;
    }
  };

  return {
    clients,
    loading,
    error,
    addClient,
    updateClient,
    refreshClients: fetchClients,
    suspendClient,
    reactivateClient,
  };
}
