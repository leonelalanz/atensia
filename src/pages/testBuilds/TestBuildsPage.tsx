import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTestBuilds } from '../../lib/hooks';
import { useClientCompanies } from '../../lib/hooks';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { TestBuild, TestPlatform } from '../../types';
import { getTestPlatforms } from '../../lib/clientCompanies';

export default function TestBuildsPage() {
  const { profile } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [testPlatforms, setTestPlatforms] = useState<TestPlatform[]>([]);
  const [formData, setFormData] = useState({
    platform_id: '',
    version: '',
    build_number: '',
    test_url: '',
    build_file_url: '',
    test_notes: '',
  });

  const { clients, loading: clientsLoading } = useClientCompanies(
    profile?.company_id || ''
  );
  const { testBuilds, loading: testBuildsLoading, createTestBuild, markTesting, markCompleted } =
    useTestBuilds(selectedClient);

  React.useEffect(() => {
    getTestPlatforms().then(setTestPlatforms).catch(console.error);
  }, []);

  if (!profile || !['admin', 'developer'].includes(profile.role)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Only admins and developers can manage test builds</p>
      </div>
    );
  }

  const handleCreateTestBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      await createTestBuild({
        client_company_id: selectedClient,
        platform_id: formData.platform_id,
        version: formData.version,
        build_number: formData.build_number,
        uploaded_by: profile.id,
        test_url: formData.test_url,
        build_file_url: formData.build_file_url,
        test_notes: formData.test_notes,
      });
      setFormData({
        platform_id: '',
        version: '',
        build_number: '',
        test_url: '',
        build_file_url: '',
        test_notes: '',
      });
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create test build:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      created: 'bg-gray-100 text-gray-700',
      distributed: 'bg-blue-100 text-blue-700',
      testing: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      archived: 'bg-gray-500 text-white',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (clientsLoading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Test Builds</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Client</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a client...</option>
          {clients.map((client) => (
            <option key={client.id} value={client.client_company_id}>
              {client.client_company?.name}
            </option>
          ))}
        </select>
      </div>

      {selectedClient && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setShowModal(true)}>Upload Test Build</Button>
        </div>
      )}

      {testBuildsLoading ? (
        <LoadingSpinner />
      ) : testBuilds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {selectedClient ? 'No test builds yet' : 'Select a client'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {testBuilds.map((build: TestBuild) => (
            <div key={build.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {build.platform?.name} v{build.version}
                  </h3>
                  <p className="text-sm text-gray-600">Build #{build.build_number}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(build.status)}`}>
                  {build.status}
                </span>
              </div>

              {build.test_url && (
                <div className="mb-2">
                  <a
                    href={build.test_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline"
                  >
                    View Test URL →
                  </a>
                </div>
              )}

              {build.test_notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  <strong>Notes:</strong> {build.test_notes}
                </div>
              )}

              <div className="text-xs text-gray-500 mb-4">
                Uploaded: {new Date(build.uploaded_at).toLocaleString()}
              </div>

              <div className="flex gap-2">
                {build.status === 'created' && (
                  <Button
                    onClick={() => markTesting(build.id)}
                    className="flex-1 bg-blue-50 text-blue-600"
                  >
                    Start Testing
                  </Button>
                )}
                {build.status === 'testing' && (
                  <Button
                    onClick={() => markCompleted(build.id)}
                    className="flex-1 bg-green-50 text-green-600"
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Upload Test Build</h2>
            <form onSubmit={handleCreateTestBuild} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Platform
                </label>
                <select
                  required
                  value={formData.platform_id}
                  onChange={(e) => setFormData({ ...formData, platform_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select platform...</option>
                  {testPlatforms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                <input
                  type="text"
                  required
                  placeholder="1.0.0"
                  value={formData.version}
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Build Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.build_number}
                  onChange={(e) => setFormData({ ...formData, build_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.test_url}
                  onChange={(e) => setFormData({ ...formData, test_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Build File URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.build_file_url}
                  onChange={(e) => setFormData({ ...formData, build_file_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Notes
                </label>
                <textarea
                  value={formData.test_notes}
                  onChange={(e) => setFormData({ ...formData, test_notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Upload
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
