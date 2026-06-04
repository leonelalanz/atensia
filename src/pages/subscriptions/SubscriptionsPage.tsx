import React, { useEffect, useState } from 'react';
import { Plus, Download, FileText, Search, CreditCard, Edit2, Trash2, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Subscription, Company, CompanyPlan, SubscriptionStatus } from '../../types';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { exportSubscriptionsCSV, exportSubscriptionsPDF } from '../../lib/export';

const PLANS: { value: CompanyPlan; label: string }[] = [
  { value: 'basic', label: 'Básico' },
  { value: 'professional', label: 'Profesional' },
  { value: 'enterprise', label: 'Empresarial' },
];

const STATUS_BADGES: Record<SubscriptionStatus, 'success' | 'info' | 'danger' | 'secondary'> = {
  active: 'success', trial: 'info', expired: 'danger', cancelled: 'secondary',
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Activo', trial: 'Prueba', expired: 'Expirado', cancelled: 'Cancelado',
};

const PLAN_BADGES: Record<CompanyPlan, 'secondary' | 'info' | 'warning'> = {
  basic: 'secondary', professional: 'info', enterprise: 'warning',
};

interface SubForm {
  id?: string;
  company_id: string;
  plan: CompanyPlan;
  status: SubscriptionStatus;
  start_date: string;
  end_date: string;
  amount: string;
  currency: string;
  admin_name?: string;
  admin_email?: string;
  admin_password?: string;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<(Subscription & { company?: Company })[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<SubscriptionStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; id?: string }>({ open: false });
  const [form, setForm] = useState<SubForm>({
    company_id: '', plan: 'basic', status: 'active',
    start_date: new Date().toISOString().slice(0, 10),
    end_date: '', amount: '0', currency: 'USD',
    admin_name: '', admin_email: '', admin_password: ''
  });

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [{ data: subs }, { data: comps }] = await Promise.all([
      supabase.from('subscriptions').select('*, company:companies(*)').order('created_at', { ascending: false }),
      supabase.from('companies').select('*').order('name'),
    ]);
    setSubscriptions((subs ?? []) as (Subscription & { company?: Company })[]);
    setCompanies(comps ?? []);
    setLoading(false);
  }

  function openNewModal() {
    setIsEditing(false);
    setForm({
      company_id: '', plan: 'basic', status: 'active',
      start_date: new Date().toISOString().slice(0, 10),
      end_date: '', amount: '0', currency: 'USD',
      admin_name: '', admin_email: '', admin_password: ''
    });
    setError('');
    setModalOpen(true);
  }

  function openEditModal(sub: Subscription & { company?: Company }) {
    setIsEditing(true);
    setForm({
      id: sub.id,
      company_id: sub.company_id,
      plan: sub.plan,
      status: sub.status,
      start_date: sub.start_date,
      end_date: sub.end_date || '',
      amount: sub.amount.toString(),
      currency: sub.currency,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.company_id) { setError('Selecciona una empresa.'); return; }
    setSaving(true);
    setError('');

    const data = {
      company_id: form.company_id,
      plan: form.plan,
      status: form.status,
      start_date: form.start_date,
      end_date: form.end_date || null,
      amount: parseFloat(form.amount) || 0,
      currency: form.currency,
    };

    let err = null;
    if (isEditing && form.id) {
      const result = await supabase.from('subscriptions').update(data).eq('id', form.id);
      err = result.error;
    } else {
      const result = await supabase.from('subscriptions').insert({
        ...data,
        admin_name: form.admin_name,
        admin_email: form.admin_email,
        admin_password: form.admin_password
      });
      err = result.error;
    }

    if (err) { setError(err.message); setSaving(false); return; }
    await loadData();
    setModalOpen(false);
    setSaving(false);
  }

  function openDeleteConfirm(id: string) {
    setConfirmModal({ open: true, id });
  }

  async function confirmDelete() {
    if (!confirmModal.id) return;
    setDeleting(true);
    const { error: err } = await supabase.from('subscriptions').delete().eq('id', confirmModal.id);
    if (err) { setError(err.message); }
    await loadData();
    setDeleting(false);
    setConfirmModal({ open: false });
  }

  const filtered = subscriptions.filter((s) => {
    const matchSearch = !search || (s.company?.name ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || s.status === filterStatus;
    const matchDateFrom = !dateFrom || s.start_date >= dateFrom;
    const matchDateTo = !dateTo || s.start_date <= dateTo;
    return matchSearch && matchStatus && matchDateFrom && matchDateTo;
  });

  const totalRevenue = filtered.reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suscripciones</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {filtered.length} suscripción(es) · Total: USD {totalRevenue.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => exportSubscriptionsCSV(filtered)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download size={15} />
            CSV
          </button>
          <button
            onClick={() => exportSubscriptionsPDF(filtered)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <FileText size={15} />
            PDF
          </button>
          <button
            onClick={openNewModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Nueva
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresa..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as SubscriptionStatus | '')}
          className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="trial">Prueba</option>
          <option value="expired">Expirado</option>
          <option value="cancelled">Cancelado</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="Desde"
          className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="Hasta"
          className="px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <CreditCard size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No se encontraron suscripciones</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3">Empresa</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3">Plan</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3">Estado</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3 hidden md:table-cell">Inicio</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3 hidden md:table-cell">Fin</th>
                    <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3">Monto</th>
                    <th className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900 dark:text-white">{s.company?.name ?? '—'}</td>
                      <td className="px-5 py-3.5"><Badge variant={PLAN_BADGES[s.plan]}>{PLANS.find((p) => p.value === s.plan)?.label}</Badge></td>
                      <td className="px-5 py-3.5"><Badge variant={STATUS_BADGES[s.status]}>{STATUS_LABELS[s.status]}</Badge></td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">{s.start_date}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">{s.end_date ?? '—'}</td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900 dark:text-white text-right">
                        {s.currency} {s.amount.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3.5 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(s.id)}
                          disabled={deleting}
                          className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={isEditing ? "Editar Suscripción" : "Nueva Suscripción"} size="md">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Empresa *</label>
            <select value={form.company_id} onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar empresa...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plan</label>
              <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as CompanyPlan }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estado</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SubscriptionStatus }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Activo</option>
                <option value="trial">Prueba</option>
                <option value="expired">Expirado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha Inicio</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha Fin</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Monto</label>
              <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Moneda</label>
              <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="MXN">MXN</option>
                <option value="COP">COP</option>
                <option value="ARS">ARS</option>
              </select>
            </div>
          </div>
          {!isEditing && (
            <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Usuario Administrador
              </p>
              <div className="space-y-3">
                <input placeholder="Nombre completo" value={form.admin_name || ''} onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="email" placeholder="Correo electronico" value={form.admin_email || ''} onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <input type="password" placeholder="Contrasena" value={form.admin_password || ''} onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={confirmModal.open} onClose={() => setConfirmModal({ open: false })} title="Confirmar eliminación" size="sm">
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            ¿Estás seguro de que deseas eliminar esta suscripción? Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setConfirmModal({ open: false })}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
