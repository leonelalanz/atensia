import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useReports } from '../../lib/hooks';
import { useClientCompanies } from '../../lib/hooks';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { Report, ReportType } from '../../types';

export default function ReportsPage() {
  const { profile } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('combined');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [showDetail, setShowDetail] = useState<Report | null>(null);

  const { clients, loading: clientsLoading } = useClientCompanies(
    profile?.company_id || ''
  );
  const {
    reports,
    loading: reportsLoading,
    generateTicketReport,
    generateDeploymentReport,
    generateTestingReport,
    generateCombinedReport,
    deleteReport,
  } = useReports(profile?.company_id || '', profile?.id || '');

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Only admins can generate reports</p>
      </div>
    );
  }

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const clientId = selectedClient || null;
      switch (reportType) {
        case 'tickets':
          await generateTicketReport(clientId, dateRange.start, dateRange.end);
          break;
        case 'deployments':
          await generateDeploymentReport(clientId, dateRange.start, dateRange.end);
          break;
        case 'testing':
          await generateTestingReport(clientId, dateRange.start, dateRange.end);
          break;
        case 'combined':
          await generateCombinedReport(clientId, dateRange.start, dateRange.end);
          break;
      }
      setShowModal(false);
    } catch (err) {
      console.error('Failed to generate report:', err);
    }
  };

  const getReportIcon = (type: ReportType) => {
    const icons: Record<ReportType, string> = {
      tickets: '🎫',
      deployments: '🚀',
      testing: '🧪',
      combined: '📊',
      custom: '⚙️',
    };
    return icons[type];
  };

  if (clientsLoading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <Button onClick={() => setShowModal(true)}>Generate Report</Button>
      </div>

      {reportsLoading ? (
        <LoadingSpinner />
      ) : reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No reports yet</p>
          <Button onClick={() => setShowModal(true)}>Generate Your First Report</Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {reports.map((report: Report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => setShowDetail(report)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getReportIcon(report.report_type)}</span>
                    <h3 className="text-lg font-semibold text-gray-900">{report.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {report.period_start} to {report.period_end}
                  </p>
                </div>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteReport(report.id);
                  }}
                  className="bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Delete
                </Button>
              </div>

              {report.client_company?.name && (
                <p className="text-sm text-gray-500 mb-2">
                  Client: <strong>{report.client_company.name}</strong>
                </p>
              )}

              <div className="text-xs text-gray-400">
                Generated: {new Date(report.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Generate Report</h2>
            <form onSubmit={handleGenerateReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Type
                </label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value as ReportType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="combined">Combined Report</option>
                  <option value="tickets">Tickets Only</option>
                  <option value="deployments">Deployments Only</option>
                  <option value="testing">Testing Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client (Optional - Leave empty for all clients)
                </label>
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.client_company_id}>
                      {client.client_company?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Generate
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {showDetail && (
        <Modal onClose={() => setShowDetail(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{showDetail.title}</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Period</p>
                <p className="font-semibold">
                  {showDetail.period_start} to {showDetail.period_end}
                </p>
              </div>
              {showDetail.client_company && (
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-semibold">{showDetail.client_company.name}</p>
                </div>
              )}
            </div>

            {showDetail.data && (
              <div className="space-y-6">
                {showDetail.report_type === 'combined' && (
                  <>
                    {showDetail.data.tickets && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-2">Tickets</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total</p>
                            <p className="text-2xl font-bold">{showDetail.data.tickets.total_tickets}</p>
                          </div>
                          {Object.entries(showDetail.data.tickets.by_status || {}).map(
                            ([status, count]) => (
                              <div key={status}>
                                <p className="text-gray-600 capitalize">{status}</p>
                                <p className="text-xl font-semibold">{count as number}</p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {showDetail.data.deployments && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-2">Deployments</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total</p>
                            <p className="text-2xl font-bold">
                              {showDetail.data.deployments.total_deployments}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Live</p>
                            <p className="text-2xl font-bold text-green-600">
                              {showDetail.data.deployments.live_deployments}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {showDetail.data.testing && (
                      <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-2">Testing</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Total</p>
                            <p className="text-2xl font-bold">
                              {showDetail.data.testing.total_test_builds}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Completed</p>
                            <p className="text-2xl font-bold text-green-600">
                              {showDetail.data.testing.completed_tests}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {showDetail.report_type === 'tickets' && showDetail.data.by_status && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">By Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(showDetail.data.by_status).map(([status, count]) => (
                        <div key={status} className="bg-gray-50 p-3 rounded">
                          <p className="text-sm text-gray-600 capitalize">{status}</p>
                          <p className="text-xl font-semibold">{count as number}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t flex gap-2">
              <Button onClick={() => setShowDetail(null)} className="flex-1">
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
