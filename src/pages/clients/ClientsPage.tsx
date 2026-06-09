import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useClientCompanies } from '../../lib/hooks';
import { ClientCompany, Company } from '../../types';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

export default function ClientsPage() {
  const { profile } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    admin_name: '',
    admin_email: '',
    primary_color: '#2563eb',
  });

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Only admins can manage clients</p>
      </div>
    );
  }

  const { clients, loading, error, addClient, suspendClient, reactivateClient } =
    useClientCompanies(profile.company_id!);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addClient(profile.company_id!, {
        name: formData.name,
        admin_name: formData.admin_name,
        admin_email: formData.admin_email,
        primary_color: formData.primary_color,
        plan: 'basic',
        status: 'active',
        maintenance_mode: false,
        logo_url: '',
      });
      setFormData({ name: '', admin_name: '', admin_email: '', primary_color: '#2563eb' });
      setShowModal(false);
    } catch (err) {
      console.error('Failed to add client:', err);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
        <Button onClick={() => setShowModal(true)}>Add Client</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {clients.map((client) => (
          <div key={client.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {client.client_company?.name}
                </h2>
                <p className="text-sm text-gray-600 mt-1">{client.client_contact_email}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  client.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {client.status}
              </span>
            </div>

            <div className="mb-4 text-sm text-gray-600">
              <p>
                <strong>Contact:</strong> {client.client_contact_name}
              </p>
              <p>
                <strong>Phone:</strong> {client.client_contact_phone || 'N/A'}
              </p>
              {client.notes && (
                <p>
                  <strong>Notes:</strong> {client.notes}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {client.status === 'active' ? (
                <Button
                  onClick={() => suspendClient(client.id)}
                  className="flex-1 bg-red-50 text-red-600 hover:bg-red-100"
                >
                  Suspend
                </Button>
              ) : (
                <Button
                  onClick={() => reactivateClient(client.id)}
                  className="flex-1 bg-green-50 text-green-600 hover:bg-green-100"
                >
                  Reactivate
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {clients.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No clients yet</p>
          <Button onClick={() => setShowModal(true)}>Add Your First Client</Button>
        </div>
      )}

      {showModal && (
        <Modal onClose={() => setShowModal(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Client</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.admin_email}
                  onChange={(e) => setFormData({ ...formData, admin_email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <input
                  type="color"
                  value={formData.primary_color}
                  onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                  className="w-full h-10 rounded-lg border border-gray-300"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100">
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Add Client
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
