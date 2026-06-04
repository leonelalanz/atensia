import React, { useEffect, useState } from 'react';
import { Search, Download, Eye, EyeOff, Filter, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_data: Record<string, any>;
  new_data: Record<string, any>;
  status: string;
  error_message: string;
  created_at: string;
  user_email: string;
}

export default function AuditLogsPage() {
  const { profile } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Check authorization
  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-400">
            ❌ Acceso denegado. Solo administradores pueden ver auditoría.
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    loadLogs();
  }, [profile]);

  async function loadLogs() {
    try {
      setLoading(true);
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          user:user_id(email)
        `)
        .order('created_at', { ascending: false });

      if (profile?.role === 'admin' && profile?.company_id) {
        query = query.eq('company_id', profile.company_id);
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;

      setLogs(
        data?.map((log: any) => ({
          ...log,
          user_email: log.user?.email || 'unknown',
        })) || []
      );
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = logs.filter((log) => {
    const matchSearch =
      !search ||
      log.user_email.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      (log.table_name?.toLowerCase().includes(search.toLowerCase()) ?? false);

    const matchAction = !actionFilter || log.action === actionFilter;

    const logDate = new Date(log.created_at).toISOString().split('T')[0];
    const matchFrom = !dateFrom || logDate >= dateFrom;
    const matchTo = !dateTo || logDate <= dateTo;

    return matchSearch && matchAction && matchFrom && matchTo;
  });

  const exportCSV = () => {
    const csv = [
      ['Timestamp', 'Usuario', 'Acción', 'Tabla', 'Estado', 'Detalles'].join(','),
      ...filtered.map((log) =>
        [
          log.created_at,
          log.user_email,
          log.action,
          log.table_name || 'N/A',
          log.status,
          log.error_message || 'OK',
        ]
          .map((v) => `"${v}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            📋 Auditoría de Logs
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {filtered.length} registros
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Download size={15} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              showFilters
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Filter size={15} />
            <span className="hidden sm:inline">Filtros</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por usuario, acción o tabla..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas las acciones</option>
            {[...new Set(logs.map((l) => l.action))].map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                Timestamp
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                Usuario
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                Acción
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                Tabla
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white">
                Estado
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 dark:text-white">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  No hay registros de auditoría
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs font-mono">
                    {new Date(log.created_at).toLocaleString('es-ES')}
                  </td>
                  <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                    {log.user_email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-xs font-semibold">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-sm">
                    {log.table_name || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-semibold ${
                        log.status === 'success'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                      }`}
                    >
                      {log.status === 'success' ? '✓' : '✗'} {log.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Detalles del Log"
        size="lg"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Usuario
                </label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {selectedLog.user_email}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Acción
                </label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {selectedLog.action}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Tabla
                </label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {selectedLog.table_name || '—'}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Timestamp
                </label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {new Date(selectedLog.created_at).toLocaleString('es-ES')}
                </p>
              </div>
            </div>

            {selectedLog.old_data && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Datos Anteriores
                </label>
                <pre className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto text-xs text-gray-900 dark:text-white">
                  {JSON.stringify(selectedLog.old_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.new_data && (
              <div>
                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Datos Nuevos
                </label>
                <pre className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-auto text-xs text-gray-900 dark:text-white">
                  {JSON.stringify(selectedLog.new_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.error_message && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3">
                <p className="text-sm text-red-700 dark:text-red-400">
                  <strong>Error:</strong> {selectedLog.error_message}
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
