import { useState, useEffect } from 'react';
import { TestBuild, TestBuildStatus } from '../../types';
import * as testBuildsService from '../testBuilds';

interface UseTestBuildsResult {
  testBuilds: TestBuild[];
  loading: boolean;
  error: Error | null;
  createTestBuild: (testBuild: {
    client_company_id: string;
    platform_id: string;
    version: string;
    build_number: string;
    uploaded_by: string;
    test_url?: string;
    build_file_url?: string;
    test_notes?: string;
  }) => Promise<TestBuild>;
  updateStatus: (id: string, status: TestBuildStatus) => Promise<void>;
  markDistributed: (id: string) => Promise<void>;
  markTesting: (id: string) => Promise<void>;
  markCompleted: (id: string) => Promise<void>;
  markFailed: (id: string) => Promise<void>;
  archiveTestBuild: (id: string) => Promise<void>;
  updateTestBuild: (id: string, updates: Partial<TestBuild>) => Promise<void>;
  deleteTestBuild: (id: string) => Promise<void>;
  refreshTestBuilds: () => Promise<void>;
}

export function useTestBuilds(clientCompanyId: string): UseTestBuildsResult {
  const [testBuilds, setTestBuilds] = useState<TestBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTestBuilds = async () => {
    try {
      setLoading(true);
      const data = await testBuildsService.getClientTestBuilds(clientCompanyId);
      setTestBuilds(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientCompanyId) {
      fetchTestBuilds();
    }
  }, [clientCompanyId]);

  const createTestBuild = async (testBuild: {
    client_company_id: string;
    platform_id: string;
    version: string;
    build_number: string;
    uploaded_by: string;
    test_url?: string;
    build_file_url?: string;
    test_notes?: string;
  }) => {
    try {
      const result = await testBuildsService.createTestBuild(testBuild);
      await fetchTestBuilds();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create test build'));
      throw err;
    }
  };

  const updateStatus = async (id: string, status: TestBuildStatus) => {
    try {
      await testBuildsService.updateTestBuildStatus(id, status);
      await fetchTestBuilds();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update test build status'));
      throw err;
    }
  };

  const markDistributed = async (id: string) => {
    try {
      await testBuildsService.markTestBuildDistributed(id);
      await fetchTestBuilds();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark as distributed'));
      throw err;
    }
  };

  const markTesting = async (id: string) => {
    try {
      await testBuildsService.markTestBuildTesting(id);
      await fetchTestBuilds();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark as testing'));
      throw err;
    }
  };

  const markCompleted = async (id: string) => {
    try {
      await testBuildsService.markTestBuildCompleted(id);
      await fetchTestBuilds();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark as completed'));
      throw err;
    }
  };

  const markFailed = async (id: string) => {
    try {
      await testBuildsService.markTestBuildFailed(id);
      await fetchTestBuilds();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark as failed'));
      throw err;
    }
  };

  const archiveTestBuild = async (id: string) => {
    try {
      await testBuildsService.archiveTestBuild(id);
      await fetchTestBuilds();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to archive test build'));
      throw err;
    }
  };

  const updateTestBuild = async (id: string, updates: Partial<TestBuild>) => {
    try {
      await testBuildsService.updateTestBuild(id, updates);
      await fetchTestBuilds();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update test build'));
      throw err;
    }
  };

  const deleteTestBuild = async (id: string) => {
    try {
      await testBuildsService.deleteTestBuild(id);
      await fetchTestBuilds();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete test build'));
      throw err;
    }
  };

  return {
    testBuilds,
    loading,
    error,
    createTestBuild,
    updateStatus,
    markDistributed,
    markTesting,
    markCompleted,
    markFailed,
    archiveTestBuild,
    updateTestBuild,
    deleteTestBuild,
    refreshTestBuilds: fetchTestBuilds,
  };
}
