import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, Ticket, Download, FileText, RefreshCw, CheckSquare, Square, X, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { Ticket as TicketType, TicketPriority, TicketStatus, TicketCategory } from '../../types';
import TicketCard from '../../components/tickets/TicketCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { exportTicketsCSV, exportTicketsPDF } from '../../lib/export';

const STATUSES: { value: TicketStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
];

const PRIORITIES: { value: TicketPriority | ''; label: string }[] = [
  { value: '', label: 'Todas las prioridades' },
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

const CATEGORIES: { value: TicketCategory | ''; label: string }[] = [
  { value: '', label: 'Todas las categorías' },
  { value: 'soporte', label: 'Soporte' },
  { value: 'bug', label: 'Bug' },
  { value: 'solicitud', label: 'Solicitud' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'otro', label: 'Otro' },
];

export default function TicketsPage() {
  const { profile } = useAuth();
  const { canExportPDF } = usePlan();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TicketStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<TicketPriority | ''>('');
  const [filterCategory, setFilterCategory] = useState<TicketCategory | ''>('');
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'me' | 'unassigned'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTickets = useCallback(async (silent = false) => {
    if (!profile) return;
    if (!silent) setLoading(true);
    let query = supabase
      .from('tickets')
      .select('*, creator:profiles!created_by(*), assignee:profiles!assigned_to(*), sla_record:sla_records(*)')
      .order('created_at', { ascending: false });
    if (profile.role !== 'admin' && profile.role !== 'superadmin') {
      query = query.eq('company_id', profile.company_id!);
    } else if (profile.company_id) {
      query = query.eq('company_id', profile.company_id);
    }
    const { data } = await query;
    setTickets((data ?? []) as TicketType[]);
    if (!silent) setLoading(false);
  }, [profile]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Real-time subscription
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        setLiveUpdate(true);
        if (liveTimer.current) clearTimeout(liveTimer.current);
        liveTimer.current = setTimeout(() => setLiveUpdate(false), 3000);
        loadTickets(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile, loadTickets]);

  // Bulk actions
  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((t) => t.id)));
    }
  }

  async function bulkUpdateStatus(status: TicketStatus) {
    if (selected.size === 0) return;
    setBulkLoading(true);
    await supabase.from('tickets').update({ status, updated_at: new Date().toISOString() }).in('id', Array.from(selected));
    setSelected(new Set());
    setBulkMode(false);
    await loadTickets();
    setBulkLoading(false);
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!window.confirm(`¿Eliminar ${selected.size} ticket(s)? Esta acción no se puede deshacer.`)) return;
    setBulkLoading(true);
    await supabase.from('tickets').delete().in('id', Array.from(selected));
    setSelected(new Set());
    setBulkMode(false);
    await loadTickets();
    setBulkLoading(false);
  }

  const filtered = tickets.filter((t) => {
    const matchSearch = !search ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.ticket_number.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    const matchPriority = !filterPriority || t.priority === filterPriority;
    const matchCategory = !filterCategory || t.category === filterCategory;
    const matchAssigned =
      filterAssigned === 'all' ? true :
      filterAssigned === 'me' ? (t.assigned_to === profile?.id || t.created_by === profile?.id) :
      !t.assigned_to;
    const created = t.created_at.slice(0, 10);
    const matchFrom = !filterDateFrom || created >= filterDateFrom;
    const matchTo = !filterDateTo || created <= filterDateTo;
    return matchSearch && matchStatus && matchPriority && matchCategory && matchAssigned && matchFrom && matchTo;
  });

  const activeFilters = [filterStatus, filterPriority, filterCategory, filterAssigned !== 'all' ? filterAssigned : '', filterDateFrom, filterDateTo].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Tickets</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{filtered.length} ticket(s) encontrados</p>
          </div>
          {liveUpdate && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full px-2.5 py-1">
              <RefreshCw size={11} className="animate-spin" />
              Actualizado
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportTicketsCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download size={15} />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={() => canExportPDF ? exportTicketsPDF(filtered) : undefined}
            title={!canExportPDF ? 'Exportar PDF requiere plan Pro o superior' : undefined}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              canExportPDF
                ? 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                : 'border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            {canExportPDF ? <FileText size={15} /> : <Lock size={15} />}
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={() => { setBulkMode((v) => !v); setSelected(new Set()); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              bulkMode
                ? 'border-violet-500 bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400'
                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <CheckSquare size={15} />
            <span className="hidden sm:inline">Seleccionar</span>
          </button>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || activeFilters > 0
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <SlidersHorizontal size={15} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilters > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs">{activeFilters}</span>
            )}
          </button>
        </div>
      </div>

      {/* Bulk action toolbar */}
      {bulkMode && (
        <div className="flex items-center gap-2 flex-wrap p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-sm font-medium text-violet-700 dark:text-violet-300 hover:underline"
          >
            {selected.size === filtered.length && filtered.length > 0
              ? <><CheckSquare size={14} /> Deseleccionar todo</>
              : <><Square size={14} /> Seleccionar todo ({filtered.length})</>
            }
          </button>
          {selected.size > 0 && (
            <>
              <span className="text-violet-300 dark:text-violet-600">|</span>
              <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">{selected.size} seleccionados</span>
              <div className="flex items-center gap-1 ml-auto flex-wrap">
                {bulkLoading ? <LoadingSpinner size="sm" /> : (
                  <>
                    <button onClick={() => bulkUpdateStatus('in_progress')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 transition-colors">
                      → En progreso
                    </button>
                    <button onClick={() => bulkUpdateStatus('resolved')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors">
                      → Resolver
                    </button>
                    <button onClick={() => bulkUpdateStatus('closed')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 transition-colors">
                      → Cerrar
                    </button>
                    {(profile?.role === 'admin' || profile?.role === 'superadmin') && (
                      <button onClick={bulkDelete}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors">
                        Eliminar
                      </button>
                    )}
                    <button onClick={() => exportTicketsCSV(filtered.filter((t) => selected.has(t.id)))}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 transition-colors">
                      Exportar CSV
                    </button>
                  </>
                )}
              </div>
            </>
          )}
          <button onClick={() => { setBulkMode(false); setSelected(new Set()); }}
            className="ml-auto p-1 rounded-lg text-violet-400 hover:text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, número o descripción..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TicketStatus | '')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as TicketPriority | '')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as TicketCategory | '')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <select
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value as 'all' | 'me' | 'unassigned')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos los asignados</option>
              <option value="me">Mis tickets</option>
              <option value="unassigned">Sin asignar</option>
            </select>
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
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 sm:p-16 text-center">
          <Ticket size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron tickets</p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            {search || activeFilters > 0 ? 'Intenta ajustar los filtros de búsqueda' : 'Crea el primer ticket para comenzar'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <div key={t.id} className="relative group">
              {bulkMode && (
                <button
                  onClick={() => toggleSelect(t.id)}
                  className="absolute top-3 left-3 z-10 w-5 h-5 rounded flex items-center justify-center transition-all"
                >
                  {selected.has(t.id)
                    ? <CheckSquare size={18} className="text-violet-600 dark:text-violet-400" />
                    : <Square size={18} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                  }
                </button>
              )}
              <div className={bulkMode ? 'pl-2' : ''}>
                <TicketCard ticket={t} onRefresh={() => loadTickets()} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
