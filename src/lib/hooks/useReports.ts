import { useState, useEffect } from 'react';
import { Report } from '../../types';
import * as reportsService from '../reports';

interface UseReportsResult {
  reports: Report[];
  loading: boolean;
  error: Error | null;
  generateTicketReport: (
    clientId: string | null,
    periodStart: string,
    periodEnd: string
  ) => Promise<void>;
  generateDeploymentReport: (
    clientId: string | null,
    periodStart: string,
    periodEnd: string
  ) => Promise<void>;
  generateTestingReport: (
    clientId: string | null,
    periodStart: string,
    periodEnd: string
  ) => Promise<void>;
  generateCombinedReport: (
    clientId: string | null,
    periodStart: string,
    periodEnd: string
  ) => Promise<void>;
  deleteReport: (id: string) => Promise<void>;
  refreshReports: () => Promise<void>;
}

export function useReports(adminCompanyId: string, userId: string): UseReportsResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await reportsService.getAdminReports(adminCompanyId);
      setReports(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminCompanyId) {
      fetchReports();
    }
  }, [adminCompanyId]);

  const generateTicketReport = async (
    clientId: string | null,
    periodStart: string,
    periodEnd: string
  ) => {
    try {
      await reportsService.generateTicketReport(
        adminCompanyId,
        clientId,
        periodStart,
        periodEnd,
        userId
      );
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate ticket report'));
      throw err;
    }
  };

  const generateDeploymentReport = async (
    clientId: string | null,
    periodStart: string,
    periodEnd: string
  ) => {
    try {
      await reportsService.generateDeploymentReport(
        adminCompanyId,
        clientId,
        periodStart,
        periodEnd,
        userId
      );
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate deployment report'));
      throw err;
    }
  };

  const generateTestingReport = async (
    clientId: string | null,
    periodStart: string,
    periodEnd: string
  ) => {
    try {
      await reportsService.generateTestingReport(
        adminCompanyId,
        clientId,
        periodStart,
        periodEnd,
        userId
      );
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate testing report'));
      throw err;
    }
  };

  const generateCombinedReport = async (
    clientId: string | null,
    periodStart: string,
    periodEnd: string
  ) => {
    try {
      await reportsService.generateCombinedReport(
        adminCompanyId,
        clientId,
        periodStart,
        periodEnd,
        userId
      );
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to generate combined report'));
      throw err;
    }
  };

  const deleteReport = async (id: string) => {
    try {
      await reportsService.deleteReport(id);
      await fetchReports();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete report'));
      throw err;
    }
  };

  return {
    reports,
    loading,
    error,
    generateTicketReport,
    generateDeploymentReport,
    generateTestingReport,
    generateCombinedReport,
    deleteReport,
    refreshReports: fetchReports,
  };
}
