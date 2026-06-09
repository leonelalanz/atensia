import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { obtenerClientes, suspenderCliente, reactivarCliente } from '../../lib/clientes';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { Plus, Download, FileText, Search, SlidersHorizontal, Trash2, Edit2 } from 'lucide-react';
import { exportClientsCSV, exportClientsPDF } from '../../lib/export';

export default function PaginaClientes() {
  const { profile } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  const [formulario, setFormulario] = useState({
    nombre: '',
    contactoNombre: '',
    contactoEmail: '',
    contrasena: '',
    colorPrimario: '#2563eb',
  });

  useEffect(() => {
    if (profile?.company_id) {
      cargarClientes();
    }
  }, [profile?.company_id]);

  const cargarClientes = async () => {
    try {
      setCargando(true);
      const datos = await obtenerClientes(profile!.company_id!);
      setClientes(datos);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Error cargando clientes');
    } finally {
      setCargando(false);
    }
  };

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formulario.contactoEmail,
        password: formulario.contrasena,
      });

      let userId: string | null = null;
      if (authError && authError.message.includes('already exists')) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: formulario.contactoEmail,
          password: formulario.contrasena,
        });
        if (signInData?.user) userId = signInData.user.id;
      } else if (authError) {
        throw authError;
      } else if (authData?.user) {
        userId = authData.user.id;
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      if (!userId) throw new Error('No se pudo obtener el usuario');

      const { data: rpcData, error: rpcError } = await supabase
        .rpc('assign_user_to_client', {
          p_user_id: userId,
          p_admin_company_id: profile!.company_id!,
          p_nombre: formulario.nombre,
          p_contacto_nombre: formulario.contactoNombre,
          p_contacto_email: formulario.contactoEmail,
          p_color_primario: formulario.colorPrimario || '#2563eb',
        });

      if (rpcError || !rpcData[0]?.success) {
        throw new Error(rpcData?.[0]?.error_msg || rpcError?.message || 'Error creando cliente');
      }

      setFormulario({ nombre: '', contactoNombre: '', contactoEmail: '', contrasena: '', colorPrimario: '#2563eb' });
      setModalAbierto(false);
      cargarClientes();
    } catch (err) {
      setError(`Error creando cliente: ${err}`);
    } finally {
      setGuardando(false);
    }
  };

  const handleSuspender = async (idCliente: string) => {
    try {
      await suspenderCliente(idCliente);
      cargarClientes();
    } catch (err) {
      setError(`Error suspendiendo cliente: ${err}`);
    }
  };

  const handleReactivar = async (idCliente: string) => {
    try {
      await reactivarCliente(idCliente);
      cargarClientes();
    } catch (err) {
      setError(`Error reactivando cliente: ${err}`);
    }
  };

  const handleAbrirEdicion = (cliente: any) => {
    setEditando(cliente.id);
    setFormulario({
      nombre: cliente.client_company?.name || '',
      contactoNombre: cliente.client_contact_name,
      contactoEmail: cliente.client_contact_email,
      contrasena: '',
      colorPrimario: cliente.client_company?.primary_color || '#2563eb',
    });
    setModalAbierto(true);
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Solo administradores pueden acceder aquí</p>
      </div>
    );
  }

  // Filtered clients
  const filtered = clientes.filter((c) => {
    const matchSearch = !search ||
      c.client_company?.name.toLowerCase().includes(search.toLowerCase()) ||
      c.client_contact_email.toLowerCase().includes(search.toLowerCase()) ||
      c.client_contact_name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeFilters = [search, filterStatus].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Mis Clientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filtered.length} cliente(s) de {clientes.length} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportClientsCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={15} /><span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={() => exportClientsPDF(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <FileText size={15} /><span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || activeFilters > 0 ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <SlidersHorizontal size={15} />
            {activeFilters > 0 && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs">{activeFilters}</span>}
          </button>
          <button onClick={() => setModalAbierto(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 bg-blue-600">
            <Plus size={16} /><span className="hidden sm:inline">Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, email o contacto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      {cargando ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No hay clientes que coincidan con los filtros</p>
        </div>
      ) : (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Email</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Teléfono</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cliente) => (
                <tr key={cliente.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{cliente.client_company?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cliente.client_contact_email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cliente.client_contact_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{cliente.client_contact_phone || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                      cliente.status === 'active'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {cliente.status === 'active' ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => handleAbrirEdicion(cliente)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <Edit2 size={13} />Editar
                      </button>
                      {cliente.status === 'active' ? (
                        <button onClick={() => handleSuspender(cliente.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 size={13} />Suspender
                        </button>
                      ) : (
                        <button onClick={() => handleReactivar(cliente.id)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          <Plus size={13} />Reactivar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Modal */}
      <Modal open={modalAbierto} onClose={() => { setModalAbierto(false); setEditando(null); }} title={editando ? 'Editar Cliente' : 'Nuevo Cliente'} size="md">
        <div className="space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
          <form onSubmit={editando ? (e) => { e.preventDefault(); setModalAbierto(false); } : handleCrearCliente} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre de Empresa *</label>
              <input type="text" required value={formulario.nombre} onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre de Contacto *</label>
              <input type="text" required value={formulario.contactoNombre} onChange={(e) => setFormulario({ ...formulario, contactoNombre: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email de Contacto *</label>
              <input type="email" required value={formulario.contactoEmail} onChange={(e) => setFormulario({ ...formulario, contactoEmail: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {!editando && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contraseña *</label>
                <input type="password" required value={formulario.contrasena} onChange={(e) => setFormulario({ ...formulario, contrasena: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color Primario</label>
              <input type="color" value={formulario.colorPrimario} onChange={(e) => setFormulario({ ...formulario, colorPrimario: e.target.value })}
                className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setModalAbierto(false)} type="button"
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={guardando}
                className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50">
                {guardando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Cliente'}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
