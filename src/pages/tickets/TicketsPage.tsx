import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Search, SlidersHorizontal, Ticket, Download, FileText, RefreshCw, CheckSquare, Square, X, Lock, Grid3X3, List } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { usePlan } from '../../hooks/usePlan';
import { Ticket as TicketType, TicketPriority, TicketStatus, TicketCategory } from '../../types';
import TicketCard from '../../components/tickets/TicketCard';
import Avatar from '../../components/ui/Avatar';
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
  const { navigate } = useRouter();
  const { canExportPDF } = usePlan();
  const [tickets, setTickets] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveUpdate, setLiveUpdate] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<TicketStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<TicketPriority | ''>('');
  const [filterCategory, setFilterCategory] = useState<TicketCategory | ''>('');
  const [filterAssigned, setFilterAssigned] = useState<'all' | 'me' | 'unassigned'>('all');
  const [filterCompany, setFilterCompany] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  // View mode
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadTickets = useCallback(async (silent = false) => {
    if (!profile) return;
    if (!silent) setLoading(true);

    try {
      let ticketsData: TicketType[] = [];
      let error: any = null;

      const selectFields = '*, company:companies(id, name), creator:profiles!created_by(id, full_name, avatar_emoji, avatar_color, role, email, company_id, is_active, created_at), assignee:profiles!assigned_to(id, full_name, avatar_emoji, avatar_color, role, email, company_id, is_active, created_at), sla_record:sla_records(id, ticket_id, first_response_deadline, resolution_deadline, first_response_met, resolution_met, first_responded_at, created_at)';

      if (profile.role === 'superadmin') {
        // Superadmin sees all tickets
        const result = await supabase
          .from('tickets')
          .select(selectFields)
          .order('created_at', { ascending: false });
        ticketsData = result.data || [];
        error = result.error;
      } else if (profile.role === 'admin') {
        // Admin sees tickets from their company AND all client companies
        // Get list of client companies first
        const { data: clientCompanies } = await supabase
          .from('client_companies')
          .select('client_company_id')
          .eq('admin_company_id', profile.company_id!);

        const clientIds = clientCompanies?.map(c => c.client_company_id) || [];
        const allCompanyIds = [profile.company_id!, ...clientIds];

        const result = await supabase
          .from('tickets')
          .select(selectFields)
          .in('company_id', allCompanyIds)
          .order('created_at', { ascending: false });

        ticketsData = result.data || [];
        error = result.error;
      } else {
        // Agent and developer see tickets from their company + tickets assigned to them
        // Don't filter here - let RLS handle it (they can see own company + assigned tickets)
        const result = await supabase
          .from('tickets')
          .select(selectFields)
          .order('created_at', { ascending: false });

        ticketsData = result.data || [];
        error = result.error;
      }

      if (error) {
        console.error('Error loading tickets:', error);
        setTickets([]);
      } else if (!ticketsData || ticketsData.length === 0) {
        console.log('No tickets found');
        setTickets([]);
      } else {
        console.log('Loaded tickets:', ticketsData.length);
        setTickets(ticketsData as TicketType[]);
      }
    } catch (err) {
      console.error('Exception loading tickets:', err);
      setTickets([]);
    } finally {
      if (!silent) setLoading(false);
    }
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
    const matchCompany = !filterCompany || (t.company as any)?.id === filterCompany;
    const created = t.created_at.slice(0, 10);
    const matchFrom = !filterDateFrom || created >= filterDateFrom;
    const matchTo = !filterDateTo || created <= filterDateTo;
    return matchSearch && matchStatus && matchPriority && matchCategory && matchAssigned && matchCompany && matchFrom && matchTo;
  });

  // Get unique companies from filtered tickets for dropdown
  const companies = Array.from(
    new Map(
      tickets
        .filter((t) => (t.company as any)?.id && (t.company as any)?.name)
        .map((t) => [(t.company as any).id, { id: (t.company as any).id, name: (t.company as any).name }])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  const activeFilters = [filterStatus, filterPriority, filterCategory, filterAssigned !== 'all' ? filterAssigned : '', filterCompany, filterDateFrom, filterDateTo].filter(Boolean).length;

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
          <div className="flex border border-gray-300 dark:border-gray-700 rounded-xl overflow-hidden">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'cards'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title="Vista de tarjetas"
            >
              <Grid3X3 size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
              title="Vista de lista"
            >
              <List size={15} />
            </button>
          </div>
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
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estado</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as TicketStatus | '')}
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Prioridad</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as TicketPriority | '')}
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoría</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value as TicketCategory | '')}
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Asignado a</label>
                <select
                  value={filterAssigned}
                  onChange={(e) => setFilterAssigned(e.target.value as 'all' | 'me' | 'unassigned')}
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos los asignados</option>
                  <option value="me">Mis tickets</option>
                  <option value="unassigned">Sin asignar</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Empresa/Cliente</label>
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full px-3 py-2.5 pr-8 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los clientes</option>
                  {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="border-t border-gray-300 dark:border-gray-700 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 max-w-xs">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Desde</label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="dd/mm/aaaa"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hasta</label>
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="dd/mm/aaaa"
                />
              </div>
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
      ) : viewMode === 'cards' ? (
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
      ) : (
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-800">
              <tr>
                {bulkMode && <th className="px-4 py-3 text-left"><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" /></th>}
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Ticket</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Empresa</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Prioridad</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Estado</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Asignado a</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Categoría</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, idx) => (
                <tr
                  key={t.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition"
                  onClick={() => !bulkMode && navigate('ticket-detail', { id: t.id })}
                  style={{ cursor: bulkMode ? 'default' : 'pointer' }}
                >
                  {bulkMode && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => toggleSelect(t.id)}
                        className="flex items-center justify-center w-5 h-5"
                      >
                        {selected.has(t.id)
                          ? <CheckSquare size={18} className="text-violet-600 dark:text-violet-400" />
                          : <Square size={18} className="text-gray-400" />
                        }
                      </button>
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white">{t.ticket_number}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{t.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{(t.company as any)?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      t.priority === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      t.priority === 'high' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      t.priority === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      t.status === 'open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      t.status === 'in_progress' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                      t.status === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {t.status === 'in_progress' ? 'En Progreso' : t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.assignee ? (
                      <div className="flex items-center gap-2">
                        <Avatar profile={t.assignee} size="sm" />
                        <span className="text-gray-600 dark:text-gray-400 text-xs truncate">{t.assignee.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">Sin asignar</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">
                    {({ soporte: 'Soporte', bug: 'Bug', solicitud: 'Solicitud', consulta: 'Consulta', otro: 'Otro' }[t.category] || t.category)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
