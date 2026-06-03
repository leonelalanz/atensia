import React, { useEffect, useState } from 'react';
import { Plus, Calendar, Clock, ClipboardList, Trash2, Pencil, Download, FileText, SlidersHorizontal } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ActivityLog, Ticket } from '../../types';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { exportActivitiesCSV, exportActivitiesPDF } from '../../lib/export';

interface LogForm {
  date: string;
  description: string;
  hours_spent: string;
  ticket_id: string;
}

export default function ActivitiesPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editLog, setEditLog] = useState<ActivityLog | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterMinHours, setFilterMinHours] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [form, setForm] = useState<LogForm>({
    date: new Date().toISOString().slice(0, 10),
    description: '',
    hours_spent: '1',
    ticket_id: '',
  });

  useEffect(() => {
    if (profile) {
      loadLogs();
      loadTickets();
    }
  }, [profile]);

  async function loadLogs() {
    let query = supabase
      .from('activity_logs')
      .select('*, user:profiles(*), ticket:tickets(ticket_number, title)')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (profile?.role === 'developer') {
      query = query.eq('user_id', profile.id);
    } else {
      query = query.eq('company_id', profile!.company_id!);
    }

    const { data } = await query;
    setLogs((data ?? []) as ActivityLog[]);
    setLoading(false);
  }

  async function loadTickets() {
    if (!profile?.company_id) return;
    const { data } = await supabase
      .from('tickets')
      .select('id, ticket_number, title')
      .eq('company_id', profile.company_id)
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false });
    setTickets((data ?? []) as Ticket[]);
  }

  function openCreate() {
    setEditLog(null);
    setForm({ date: new Date().toISOString().slice(0, 10), description: '', hours_spent: '1', ticket_id: '' });
    setError('');
    setModalOpen(true);
  }

  function openEdit(log: ActivityLog) {
    setEditLog(log);
    setForm({ date: log.date, description: log.description, hours_spent: String(log.hours_spent), ticket_id: log.ticket_id ?? '' });
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.description.trim()) { setError('La descripción es obligatoria.'); return; }
    const hours = parseFloat(form.hours_spent);
    if (isNaN(hours) || hours <= 0 || hours > 24) { setError('Las horas deben estar entre 0.1 y 24.'); return; }
    setSaving(true);
    setError('');

    const payload = { date: form.date, description: form.description, hours_spent: hours, ticket_id: form.ticket_id || null };

    if (editLog) {
      const { error: err } = await supabase.from('activity_logs').update(payload).eq('id', editLog.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('activity_logs').insert({ ...payload, user_id: profile!.id, company_id: profile!.company_id! });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    await loadLogs();
    setModalOpen(false);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from('activity_logs').delete().eq('id', id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  const filtered = logs.filter((log) => {
    const matchFrom = !filterDateFrom || log.date >= filterDateFrom;
    const matchTo = !filterDateTo || log.date <= filterDateTo;
    const matchUser = !filterUser || (log.user as any)?.full_name?.toLowerCase().includes(filterUser.toLowerCase());
    const matchHours = !filterMinHours || Number(log.hours_spent) >= parseFloat(filterMinHours);
    return matchFrom && matchTo && matchUser && matchHours;
  });

  const totalHours = filtered.reduce((acc, l) => acc + Number(l.hours_spent), 0);
  const activeFilters = [filterDateFrom, filterDateTo, filterUser, filterMinHours].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Registro de Actividades</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {filtered.length} actividad(es) · {totalHours.toFixed(1)}h registradas
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportActivitiesCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={15} /><span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={() => exportActivitiesPDF(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <FileText size={15} /><span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || activeFilters > 0 ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <SlidersHorizontal size={15} />
            {activeFilters > 0 && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs">{activeFilters}</span>}
          </button>
          {profile?.role === 'developer' && (
            <button onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-color, #2563eb)' }}>
              <Plus size={16} /><span className="hidden sm:inline">Nueva</span>
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {profile?.role !== 'developer' && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Usuario</label>
              <input type="text" value={filterUser} onChange={(e) => setFilterUser(e.target.value)} placeholder="Nombre..."
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Mín. horas</label>
            <input type="number" min="0" step="0.5" value={filterMinHours} onChange={(e) => setFilterMinHours(e.target.value)} placeholder="0"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 sm:p-16 text-center">
          <ClipboardList size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No hay actividades registradas</p>
          {profile?.role === 'developer' && (
            <button onClick={openCreate} className="mt-3 text-sm font-medium hover:underline" style={{ color: 'var(--brand-color, #2563eb)' }}>
              Registrar actividad
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <div key={log.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                {profile?.role !== 'developer' && <Avatar profile={log.user} size="md" className="flex-shrink-0 mt-0.5 hidden sm:flex" />}
                <div className="flex-1 min-w-0">
                  {profile?.role !== 'developer' && (
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{(log.user as any)?.full_name}</p>
                  )}
                  <p className="text-sm text-gray-700 dark:text-gray-300">{log.description}</p>
                  {log.ticket && (
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1.5">
                      Ticket: {(log.ticket as any)?.ticket_number}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      <Calendar size={12} />{log.date}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400">
                      <Clock size={12} />{Number(log.hours_spent).toFixed(1)}h
                    </span>
                  </div>
                </div>
                {(log.user_id === profile?.id) && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(log)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(log.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editLog ? 'Editar Actividad' : 'Nueva Actividad'} size="md">
        <div className="space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha</label>
            <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción *</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3} placeholder="¿En qué trabajaste?"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Horas trabajadas</label>
            <input type="number" min="0.1" max="24" step="0.5" value={form.hours_spent} onChange={(e) => setForm((f) => ({ ...f, hours_spent: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Ticket relacionado</label>
            <select value={form.ticket_id} onChange={(e) => setForm((f) => ({ ...f, ticket_id: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Sin ticket</option>
              {tickets.map((t) => <option key={t.id} value={t.id}>{t.ticket_number} — {t.title}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-color, #2563eb)' }}>
              {saving ? 'Guardando...' : editLog ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
