import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useDeployments } from '../../lib/hooks';
import { useClientCompanies } from '../../lib/hooks';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { Deployment, DeploymentPlatform } from '../../types';
import { getDeploymentPlatforms } from '../../lib/clientCompanies';

export default function DeploymentsPage() {
  const { profile } = useAuth();
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [platforms, setPlatforms] = useState<DeploymentPlatform[]>([]);
  const [formData, setFormData] = useState({
    platform_id: '',
    version: '',
    build_number: '',
    release_notes: '',
  });

  const { clients, loading: clientsLoading } = useClientCompanies(
    profile?.company_id || ''
  );
  const { deployments, loading: deploymentsLoading, createDeployment } = useDeployments(
    selectedClient
  );

  React.useEffect(() => {
    getDeploymentPlatforms().then(setPlatforms).catch(console.error);
  }, []);

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Only admins can manage deployments</p>
      </div>
    );
  }

  const handleCreateDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;

    try {
      await createDeployment({
        client_company_id: selectedClient,
        platform_id: formData.platform_id,
        version: formData.version,
        build_number: formData.build_number,
        release_notes: formData.release_notes,
      });
      setFormData({ platform_id: '', version: '', build_number: '', release_notes: '' });
      setShowModal(false);
    } catch (err) {
      console.error('Failed to create deployment:', err);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-blue-100 text-blue-700',
      in_review: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      live: 'bg-green-500 text-white',
      rollback: 'bg-red-500 text-white',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (clientsLoading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Deployments</h1>

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
          <Button onClick={() => setShowModal(true)}>New Deployment</Button>
        </div>
      )}

      {deploymentsLoading ? (
        <LoadingSpinner />
      ) : deployments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{selectedClient ? 'No deployments yet' : 'Select a client'}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {deployments.map((deployment: Deployment) => (
            <div key={deployment.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {deployment.platform?.name} v{deployment.version}
                  </h3>
                  <p className="text-sm text-gray-600">Build #{deployment.build_number}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deployment.status)}`}>
                  {deployment.status}
                </span>
              </div>

              {deployment.release_notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  <strong>Notes:</strong> {deployment.release_notes}
                </div>
              )}

              <div className="text-xs text-gray-500 mb-4">
                Created: {new Date(deployment.created_at).toLocaleString()}
              </div>

              <div className="flex gap-2">
                {deployment.status === 'draft' && (
                  <Button className="flex-1 bg-blue-50 text-blue-600">Submit</Button>
                )}
                {deployment.status === 'submitted' && (
                  <Button className="flex-1 bg-green-50 text-green-600">Approve</Button>
                )}
                {deployment.status === 'approved' && (
                  <Button className="flex-1 bg-green-50 text-green-600">Mark Live</Button>
                )}
                {deployment.status === 'live' && (
                  <Button className="flex-1 bg-red-50 text-red-600">Rollback</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">New Deployment</h2>
            <form onSubmit={handleCreateDeployment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                <select
                  required
                  value={formData.platform_id}
                  onChange={(e) => setFormData({ ...formData, platform_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select platform...</option>
                  {platforms.map((p) => (
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
                  Release Notes
                </label>
                <textarea
                  value={formData.release_notes}
                  onChange={(e) => setFormData({ ...formData, release_notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Create
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
