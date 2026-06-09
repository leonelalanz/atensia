import { supabase } from './supabase';
import { TestBuild, TestBuildStatus } from '../types';

export async function createTestBuild(testBuild: {
  client_company_id: string;
  platform_id: string;
  version: string;
  build_number: string;
  uploaded_by: string;
  test_url?: string;
  build_file_url?: string;
  test_notes?: string;
}) {
  try {
    if (!testBuild.client_company_id || !testBuild.platform_id) {
      throw new Error('Client company ID and platform ID are required');
    }

    if (!testBuild.version || !testBuild.build_number) {
      throw new Error('Version and build number are required');
    }

    if (!testBuild.uploaded_by) {
      throw new Error('Uploader ID is required');
    }

    const { data, error } = await supabase
      .from('test_builds')
      .insert([
        {
          client_company_id: testBuild.client_company_id,
          platform_id: testBuild.platform_id,
          version: testBuild.version,
          build_number: testBuild.build_number,
          uploaded_by: testBuild.uploaded_by,
          test_url: testBuild.test_url || '',
          build_file_url: testBuild.build_file_url || '',
          test_notes: testBuild.test_notes || '',
          status: 'created',
        },
      ])
      .select(
        `
        *,
        platform:test_platforms(*),
        uploader:profiles!uploaded_by(*),
        client:companies(*)
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create test build: ${error.message}`);
    }

    if (!data) {
      throw new Error('No test build data returned');
    }

    return data as TestBuild;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating test build:', message);
    throw new Error(message);
  }
}

const selectTestBuild = `
  *,
  platform:test_platforms(*),
  uploader:profiles!uploaded_by(*),
  client:companies(*)
`;

export async function getClientTestBuilds(clientCompanyId: string) {
  try {
    if (!clientCompanyId) {
      return [];
    }

    const { data, error } = await supabase
      .from('test_builds')
      .select(selectTestBuild)
      .eq('client_company_id', clientCompanyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch test builds: ${error.message}`);
    }

    return (data || []) as TestBuild[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching test builds:', message);
    throw new Error(message);
  }
}

export async function getTestBuild(testBuildId: string) {
  try {
    if (!testBuildId) {
      throw new Error('Test build ID is required');
    }

    const { data, error } = await supabase
      .from('test_builds')
      .select(selectTestBuild)
      .eq('id', testBuildId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch test build: ${error.message}`);
    }

    return data as TestBuild;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching test build:', message);
    throw new Error(message);
  }
}

export async function updateTestBuildStatus(
  testBuildId: string,
  status: TestBuildStatus
) {
  try {
    if (!testBuildId) {
      throw new Error('Test build ID is required');
    }

    const { data, error } = await supabase
      .from('test_builds')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', testBuildId)
      .select(selectTestBuild)
      .single();

    if (error) {
      throw new Error(`Failed to update test build status: ${error.message}`);
    }

    return data as TestBuild;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating test build status:', message);
    throw new Error(message);
  }
}

export async function markTestBuildDistributed(testBuildId: string) {
  try {
    return await updateTestBuildStatus(testBuildId, 'distributed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(message);
  }
}

export async function markTestBuildTesting(testBuildId: string) {
  try {
    return await updateTestBuildStatus(testBuildId, 'testing');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(message);
  }
}

export async function markTestBuildCompleted(testBuildId: string) {
  try {
    return await updateTestBuildStatus(testBuildId, 'completed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(message);
  }
}

export async function markTestBuildFailed(testBuildId: string) {
  try {
    return await updateTestBuildStatus(testBuildId, 'failed');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(message);
  }
}

export async function archiveTestBuild(testBuildId: string) {
  try {
    return await updateTestBuildStatus(testBuildId, 'archived');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(message);
  }
}

export async function updateTestBuild(
  testBuildId: string,
  updates: Partial<TestBuild>
) {
  try {
    if (!testBuildId) {
      throw new Error('Test build ID is required');
    }

    const { data, error } = await supabase
      .from('test_builds')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', testBuildId)
      .select(selectTestBuild)
      .single();

    if (error) {
      throw new Error(`Failed to update test build: ${error.message}`);
    }

    return data as TestBuild;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating test build:', message);
    throw new Error(message);
  }
}

export async function deleteTestBuild(testBuildId: string) {
  try {
    if (!testBuildId) {
      throw new Error('Test build ID is required');
    }

    const { error } = await supabase
      .from('test_builds')
      .delete()
      .eq('id', testBuildId);

    if (error) {
      throw new Error(`Failed to delete test build: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting test build:', message);
    throw new Error(message);
  }
}

export async function getTestBuildsByPlatform(
  clientCompanyId: string,
  platformId: string
) {
  try {
    if (!clientCompanyId || !platformId) {
      return [];
    }

    const { data, error } = await supabase
      .from('test_builds')
      .select(selectTestBuild)
      .eq('client_company_id', clientCompanyId)
      .eq('platform_id', platformId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch test builds by platform: ${error.message}`);
    }

    return (data || []) as TestBuild[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching test builds by platform:', message);
    throw new Error(message);
  }
}
