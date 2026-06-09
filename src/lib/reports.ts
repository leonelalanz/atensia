import { supabase } from './supabase';
import { Report, ReportType } from '../types';

export async function createReport(report: {
  admin_company_id: string;
  client_company_id?: string | null;
  title: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  generated_by: string;
  data?: Record<string, any>;
}) {
  try {
    if (!report.admin_company_id) {
      throw new Error('Admin company ID is required');
    }

    if (!report.title || !report.report_type) {
      throw new Error('Title and report type are required');
    }

    if (!report.period_start || !report.period_end) {
      throw new Error('Period dates are required');
    }

    if (!report.generated_by) {
      throw new Error('Generator ID is required');
    }

    const { data, error } = await supabase
      .from('reports')
      .insert([
        {
          admin_company_id: report.admin_company_id,
          client_company_id: report.client_company_id || null,
          title: report.title,
          report_type: report.report_type,
          period_start: report.period_start,
          period_end: report.period_end,
          generated_by: report.generated_by,
          data: report.data || {},
        },
      ])
      .select(
        `
        *,
        admin_company:companies!admin_company_id(*),
        client_company:companies!client_company_id(*),
        generator:profiles(*)
      `
      )
      .single();

    if (error) {
      throw new Error(`Failed to create report: ${error.message}`);
    }

    if (!data) {
      throw new Error('No report data returned');
    }

    return data as Report;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating report:', message);
    throw new Error(message);
  }
}

export async function getAdminReports(adminCompanyId: string) {
  try {
    if (!adminCompanyId) {
      return [];
    }

    const { data, error } = await supabase
      .from('reports')
      .select(
        `
        *,
        admin_company:companies!admin_company_id(*),
        client_company:companies!client_company_id(*),
        generator:profiles(*)
      `
      )
      .eq('admin_company_id', adminCompanyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`);
    }

    return (data || []) as Report[];
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching admin reports:', message);
    throw new Error(message);
  }
}

export async function getReport(reportId: string) {
  try {
    if (!reportId) {
      throw new Error('Report ID is required');
    }

    const { data, error } = await supabase
      .from('reports')
      .select(
        `
        *,
        admin_company:companies!admin_company_id(*),
        client_company:companies!client_company_id(*),
        generator:profiles(*)
      `
      )
      .eq('id', reportId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch report: ${error.message}`);
    }

    return data as Report;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching report:', message);
    throw new Error(message);
  }
}

export async function generateTicketReport(
  adminCompanyId: string,
  clientCompanyId: string | null,
  periodStart: string,
  periodEnd: string,
  userId: string
) {
  try {
    let query = supabase
      .from('tickets')
      .select('status, priority, category, created_at')
      .gte('created_at', `${periodStart}T00:00:00`)
      .lte('created_at', `${periodEnd}T23:59:59`);

    if (clientCompanyId) {
      query = query.eq('company_id', clientCompanyId);
    }

    const { data: tickets, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch tickets: ${error.message}`);
    }

    const ticketList = tickets || [];
    const data = {
      total_tickets: ticketList.length,
      by_status: groupBy(ticketList, 'status'),
      by_priority: groupBy(ticketList, 'priority'),
      by_category: groupBy(ticketList, 'category'),
      tickets_per_day: groupByDate(ticketList, 'created_at'),
    };

    const clientName = clientCompanyId ? ' - Single Client' : ' - All Clients';
    return createReport({
      admin_company_id: adminCompanyId,
      client_company_id: clientCompanyId,
      title: `Ticket Report${clientName}: ${periodStart} to ${periodEnd}`,
      report_type: 'tickets',
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: userId,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating ticket report:', message);
    throw new Error(message);
  }
}

export async function generateDeploymentReport(
  adminCompanyId: string,
  clientCompanyId: string | null,
  periodStart: string,
  periodEnd: string,
  userId: string
) {
  try {
    let query = supabase
      .from('deployments')
      .select(
        `
        id, platform_id, status, version, created_at,
        platform:deployment_platforms(name)
      `
      )
      .gte('created_at', `${periodStart}T00:00:00`)
      .lte('created_at', `${periodEnd}T23:59:59`);

    if (clientCompanyId) {
      query = query.eq('client_company_id', clientCompanyId);
    }

    const { data: deployments, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch deployments: ${error.message}`);
    }

    const deploymentList = deployments || [];
    const data = {
      total_deployments: deploymentList.length,
      by_status: groupBy(deploymentList, 'status'),
      by_platform: groupBy(deploymentList, 'platform'),
      live_deployments: deploymentList.filter((d: any) => d.status === 'live').length,
      failed_deployments: deploymentList.filter((d: any) => d.status === 'rejected').length,
      deployments_per_day: groupByDate(deploymentList, 'created_at'),
    };

    const clientName = clientCompanyId ? ' - Single Client' : ' - All Clients';
    return createReport({
      admin_company_id: adminCompanyId,
      client_company_id: clientCompanyId,
      title: `Deployment Report${clientName}: ${periodStart} to ${periodEnd}`,
      report_type: 'deployments',
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: userId,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating deployment report:', message);
    throw new Error(message);
  }
}

export async function generateTestingReport(
  adminCompanyId: string,
  clientCompanyId: string | null,
  periodStart: string,
  periodEnd: string,
  userId: string
) {
  try {
    let query = supabase
      .from('test_builds')
      .select(
        `
        id, platform_id, status, version, created_at,
        platform:test_platforms(name)
      `
      )
      .gte('created_at', `${periodStart}T00:00:00`)
      .lte('created_at', `${periodEnd}T23:59:59`);

    if (clientCompanyId) {
      query = query.eq('client_company_id', clientCompanyId);
    }

    const { data: testBuilds, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch test builds: ${error.message}`);
    }

    const testBuildList = testBuilds || [];
    const data = {
      total_test_builds: testBuildList.length,
      by_status: groupBy(testBuildList, 'status'),
      by_platform: groupBy(testBuildList, 'platform'),
      completed_tests: testBuildList.filter((t: any) => t.status === 'completed').length,
      failed_tests: testBuildList.filter((t: any) => t.status === 'failed').length,
      tests_per_day: groupByDate(testBuildList, 'created_at'),
    };

    const clientName = clientCompanyId ? ' - Single Client' : ' - All Clients';
    return createReport({
      admin_company_id: adminCompanyId,
      client_company_id: clientCompanyId,
      title: `Testing Report${clientName}: ${periodStart} to ${periodEnd}`,
      report_type: 'testing',
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: userId,
      data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating testing report:', message);
    throw new Error(message);
  }
}

export async function generateCombinedReport(
  adminCompanyId: string,
  clientCompanyId: string | null,
  periodStart: string,
  periodEnd: string,
  userId: string
) {
  try {
    const ticketReport = await generateTicketReport(
      adminCompanyId,
      clientCompanyId,
      periodStart,
      periodEnd,
      userId
    );

    const deploymentReport = await generateDeploymentReport(
      adminCompanyId,
      clientCompanyId,
      periodStart,
      periodEnd,
      userId
    );

    const testingReport = await generateTestingReport(
      adminCompanyId,
      clientCompanyId,
      periodStart,
      periodEnd,
      userId
    );

    const combinedData = {
      tickets: ticketReport.data,
      deployments: deploymentReport.data,
      testing: testingReport.data,
    };

    const clientName = clientCompanyId ? ' - Single Client' : ' - All Clients';
    return createReport({
      admin_company_id: adminCompanyId,
      client_company_id: clientCompanyId,
      title: `Combined Report${clientName}: ${periodStart} to ${periodEnd}`,
      report_type: 'combined',
      period_start: periodStart,
      period_end: periodEnd,
      generated_by: userId,
      data: combinedData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating combined report:', message);
    throw new Error(message);
  }
}

export async function deleteReport(reportId: string) {
  try {
    if (!reportId) {
      throw new Error('Report ID is required');
    }

    const { error } = await supabase.from('reports').delete().eq('id', reportId);

    if (error) {
      throw new Error(`Failed to delete report: ${error.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting report:', message);
    throw new Error(message);
  }
}

function groupBy(items: any[], key: string): Record<string, number> {
  return items.reduce(
    (acc, item) => {
      const value = item[key] || 'unknown';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
}

function groupByDate(items: any[], dateKey: string): Record<string, number> {
  return items.reduce(
    (acc, item) => {
      try {
        const date = new Date(item[dateKey]).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
      } catch {
        acc['invalid'] = (acc['invalid'] || 0) + 1;
      }
      return acc;
    },
    {} as Record<string, number>
  );
}
