import { useState, useEffect } from 'react';
import { ExternalLink, Edit2, Trash2, RefreshCw, History, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Membership, MembershipRenewal, Company } from '../../types';
import {
  getMemberships,
  createMembership,
  updateMembership,
  deleteMembership,
  getRenewals,
  addRenewal,
} from '../../lib/memberships';
import { getMembershipDisplayStatus } from '../../lib/membershipStatus';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';

interface FormData {
  company_id: string;
  name: string;
  url: string;
  cost: string;
  currency: string;
  start_date: string;
  expiration_date: string;
  notes: string;
}

export default function MembershipsPage() {
  const { profile } = useAuth();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string>('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expiring_soon' | 'expired' | 'cancelled'>('all');
  const [renewalModalOpen, setRenewalModalOpen] = useState(false);
  const [selectedMembershipForRenewal, setSelectedMembershipForRenewal] = useState<Membership | null>(null);
  const [renewalForm, setRenewalForm] = useState({ new_expiration_date: '', amount: '', notes: '' });
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedMembershipForHistory, setSelectedMembershipForHistory] = useState<Membership | null>(null);
  const [renewals, setRenewals] = useState<MembershipRenewal[]>([]);

  const [formulario, setFormulario] = useState<FormData>({
    company_id: profile?.role === 'superadmin' ? '' : profile?.company_id || '',
    name: '',
    url: '',
    cost: '',
    currency: 'USD',
    start_date: '',
    expiration_date: '',
    notes: '',
  });

  const role = profile?.role ?? 'agent';

  if (!profile || !['admin', 'superadmin'].includes(role)) {
    return <div className="text-center py-8 text-red-600">No tienes permisos para acceder a esta página</div>;
  }

  useEffect(() => {
    cargarMemberships();
    if (profile.role === 'superadmin') {
      cargarEmpresas();
    }
  }, [profile]);

  async function cargarMemberships() {
    try {
      setCargando(true);
      setError('');
      const data = await getMemberships(profile);
      setMemberships(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando membresías');
    } finally {
      setCargando(false);
    }
  }

  async function cargarEmpresas() {
    try {
      const { data, error: err } = await supabase.from('companies').select('id, name').order('name');
      if (err) throw err;
      setCompanies((data || []) as Company[]);
    } catch (err) {
      console.error('Error cargando empresas:', err);
    }
  }

  function handleAbrirCrear() {
    setEditando(null);
    setFormulario({
      company_id: profile?.role === 'superadmin' ? '' : profile?.company_id || '',
      name: '',
      url: '',
      cost: '',
      currency: 'USD',
      start_date: '',
      expiration_date: '',
      notes: '',
    });
    setModalAbierto(true);
  }

  function handleAbrirEdicion(membership: Membership) {
    setEditando(membership.id);
    setFormulario({
      company_id: membership.company_id,
      name: membership.name,
      url: membership.url || '',
      cost: membership.cost.toString(),
      currency: membership.currency,
      start_date: membership.start_date,
      expiration_date: membership.expiration_date || '',
      notes: membership.notes,
    });
    setModalAbierto(true);
  }

  async function handleGuardar() {
    try {
      if (!formulario.name || !formulario.company_id || !formulario.start_date) {
        setError('Por favor rellena los campos requeridos (Nombre, Empresa, Fecha inicio)');
        return;
      }

      setGuardando(true);
      const payload: Partial<Membership> = {
        company_id: formulario.company_id,
        name: formulario.name,
        url: formulario.url || null,
        cost: parseFloat(formulario.cost) || 0,
        currency: formulario.currency,
        start_date: formulario.start_date,
        expiration_date: formulario.expiration_date || null,
        notes: formulario.notes,
        created_by: profile?.id,
      };

      if (editando) {
        await updateMembership(editando, payload);
      } else {
        await createMembership(payload);
      }

      setModalAbierto(false);
      await cargarMemberships();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error guardando membresía');
    } finally {
      setGuardando(false);
    }
  }

  async function handleEliminar(id: string) {
    if (!confirm('¿Confirmas que deseas eliminar esta membresía?')) return;
    try {
      await deleteMembership(id);
      await cargarMemberships();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error eliminando membresía');
    }
  }

  function handleAbrirRenewal(membership: Membership) {
    setSelectedMembershipForRenewal(membership);
    setRenewalForm({ new_expiration_date: '', amount: '', notes: '' });
    setRenewalModalOpen(true);
  }

  async function handleGuardarRenewal() {
    try {
      if (!renewalForm.new_expiration_date || !selectedMembershipForRenewal) {
        setError('Por favor ingresa la nueva fecha de vencimiento');
        return;
      }

      setGuardando(true);
      await addRenewal(selectedMembershipForRenewal.id, {
        new_expiration_date: renewalForm.new_expiration_date,
        amount: renewalForm.amount ? parseFloat(renewalForm.amount) : undefined,
        notes: renewalForm.notes,
        created_by: profile?.id,
      });

      setRenewalModalOpen(false);
      await cargarMemberships();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error renovando membresía');
    } finally {
      setGuardando(false);
    }
  }

  async function handleAbrirHistory(membership: Membership) {
    try {
      setSelectedMembershipForHistory(membership);
      const data = await getRenewals(membership.id);
      setRenewals(data);
      setHistoryModalOpen(true);
    } catch (err) {
      setError('Error cargando historial de renovaciones');
    }
  }

  const filteredMemberships = memberships.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
    if (filterStatus === 'all') return matchSearch;
    const displayStatus = getMembershipDisplayStatus(m.status, m.expiration_date);
    return matchSearch && displayStatus === filterStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'expiring_soon':
        return 'warning';
      case 'expired':
        return 'danger';
      case 'cancelled':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa';
      case 'expiring_soon':
        return 'Por vencer';
      case 'expired':
        return 'Expirada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Membresías</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Gestiona tus servicios y suscripciones externas
          </p>
        </div>
        <Button variant="primary" onClick={handleAbrirCrear}>
          <Plus size={18} className="inline mr-2" />
          Nueva Membresía
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Buscar membresías..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activas</option>
          <option value="expiring_soon">Por vencer</option>
          <option value="expired">Expiradas</option>
          <option value="cancelled">Canceladas</option>
        </select>
      </div>

      {cargando ? (
        <div className="text-center py-8">
          <LoadingSpinner size="lg" />
        </div>
      ) : filteredMemberships.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">
            {memberships.length === 0 ? 'No hay membresías registradas' : 'No se encontraron resultados'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-white">Nombre</th>
                {role === 'superadmin' && (
                  <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-white">Empresa</th>
                )}
                <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-white">Costo</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-white">Inicio</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-white">Vencimiento</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-white">Estado</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-900 dark:text-white">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberships.map((membership) => {
                const displayStatus = getMembershipDisplayStatus(membership.status, membership.expiration_date);
                const company = (membership as any).company;
                return (
                  <tr key={membership.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {membership.url ? (
                          <a
                            href={membership.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={membership.name}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {membership.name}
                          </a>
                        ) : (
                          <span className="text-gray-900 dark:text-gray-100">{membership.name}</span>
                        )}
                        {membership.url && <ExternalLink size={14} className="text-gray-400" />}
                      </div>
                    </td>
                    {role === 'superadmin' && (
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{company?.name || '—'}</td>
                    )}
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      ${membership.cost} {membership.currency}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {new Date(membership.start_date).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                      {membership.expiration_date
                        ? new Date(membership.expiration_date).toLocaleDateString('es-ES')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getStatusColor(displayStatus) as any}>
                        {getStatusLabel(displayStatus)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleAbrirEdicion(membership)}
                          className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleAbrirRenewal(membership)}
                          className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                          title="Renovar"
                        >
                          <RefreshCw size={16} />
                        </button>
                        <button
                          onClick={() => handleAbrirHistory(membership)}
                          className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                          title="Ver historial"
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => handleEliminar(membership.id)}
                          className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        title={editando ? 'Editar Membresía' : 'Nueva Membresía'}
        size="lg"
      >
        <div className="space-y-4">
          {role === 'superadmin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Empresa *
              </label>
              <select
                value={formulario.company_id}
                onChange={(e) => setFormulario({ ...formulario, company_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecciona una empresa</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nombre del Servicio *
            </label>
            <input
              type="text"
              value={formulario.name}
              onChange={(e) => setFormulario({ ...formulario, name: e.target.value })}
              placeholder="ej: Twilio, AWS, Dominio"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              URL (opcional)
            </label>
            <input
              type="url"
              value={formulario.url}
              onChange={(e) => setFormulario({ ...formulario, url: e.target.value })}
              placeholder="https://ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Costo
              </label>
              <input
                type="number"
                step="0.01"
                value={formulario.cost}
                onChange={(e) => setFormulario({ ...formulario, cost: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Moneda
              </label>
              <select
                value={formulario.currency}
                onChange={(e) => setFormulario({ ...formulario, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha de Inicio *
              </label>
              <input
                type="date"
                value={formulario.start_date}
                onChange={(e) => setFormulario({ ...formulario, start_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fecha de Vencimiento
              </label>
              <input
                type="date"
                value={formulario.expiration_date}
                onChange={(e) => setFormulario({ ...formulario, expiration_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={formulario.notes}
              onChange={(e) => setFormulario({ ...formulario, notes: e.target.value })}
              placeholder="Notas adicionales"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setModalAbierto(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              Cancelar
            </button>
            <Button
              variant="primary"
              onClick={handleGuardar}
              loading={guardando}
            >
              {editando ? 'Guardar Cambios' : 'Crear Membresía'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={renewalModalOpen}
        onClose={() => setRenewalModalOpen(false)}
        title={`Renovar: ${selectedMembershipForRenewal?.name}`}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nueva Fecha de Vencimiento *
            </label>
            <input
              type="date"
              value={renewalForm.new_expiration_date}
              onChange={(e) => setRenewalForm({ ...renewalForm, new_expiration_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Monto de Renovación (opcional)
            </label>
            <input
              type="number"
              step="0.01"
              value={renewalForm.amount}
              onChange={(e) => setRenewalForm({ ...renewalForm, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notas
            </label>
            <textarea
              value={renewalForm.notes}
              onChange={(e) => setRenewalForm({ ...renewalForm, notes: e.target.value })}
              placeholder="Notas sobre la renovación"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setRenewalModalOpen(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
            >
              Cancelar
            </button>
            <Button
              variant="primary"
              onClick={handleGuardarRenewal}
              loading={guardando}
            >
              Guardar Renovación
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Historial: ${selectedMembershipForHistory?.name}`}
        size="md"
      >
        <div className="space-y-3">
          {renewals.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Sin renovaciones registradas</p>
          ) : (
            <div className="space-y-3">
              {renewals.map((renewal) => (
                <div key={renewal.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {new Date(renewal.renewed_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Vencimiento anterior: </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {renewal.previous_expiration_date
                          ? new Date(renewal.previous_expiration_date).toLocaleDateString('es-ES')
                          : '—'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Nuevo vencimiento: </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(renewal.new_expiration_date).toLocaleDateString('es-ES')}
                      </span>
                    </div>
                    {renewal.amount && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Monto: </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">${renewal.amount}</span>
                      </div>
                    )}
                    {renewal.notes && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Notas: </span>
                        <span className="text-gray-900 dark:text-gray-100">{renewal.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
