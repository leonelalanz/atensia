import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { obtenerClientes } from '../../lib/clientes';
import {
  obtenerReportes,
  generarReporteTickets,
  generarReporteDespliegues,
  generarReporteTests,
  eliminarReporte,
} from '../../lib/reportes';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function PaginaReportes() {
  const { profile } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [reportes, setReportes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<any>(null);

  const [filtros, setFiltros] = useState({
    clienteId: '',
    tipoReporte: 'tickets',
    fechaInicio: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (profile?.company_id) {
      cargarDatos();
    }
  }, [profile?.company_id]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [misCl, misReportes] = await Promise.all([
        obtenerClientes(profile!.company_id!),
        obtenerReportes(profile!.company_id!),
      ]);
      setClientes(misCl);
      setReportes(misReportes);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Error cargando datos');
    } finally {
      setCargando(false);
    }
  };

  const handleGenerarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGenerando(true);
      const idCliente = filtros.clienteId || null;

      switch (filtros.tipoReporte) {
        case 'tickets':
          await generarReporteTickets(
            profile!.company_id!,
            idCliente,
            filtros.fechaInicio,
            filtros.fechaFin,
            profile!.id
          );
          break;
        case 'deployments':
          await generarReporteDespliegues(
            profile!.company_id!,
            idCliente,
            filtros.fechaInicio,
            filtros.fechaFin,
            profile!.id
          );
          break;
        case 'testing':
          await generarReporteTests(
            profile!.company_id!,
            idCliente,
            filtros.fechaInicio,
            filtros.fechaFin,
            profile!.id
          );
          break;
      }

      setModalAbierto(false);
      cargarDatos();
    } catch (err) {
      setError(`Error generando reporte: ${err}`);
    } finally {
      setGenerando(false);
    }
  };

  const handleEliminar = async (idReporte: string) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      await eliminarReporte(idReporte);
      cargarDatos();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const obtenerIconoTipo = (tipo: string) => {
    const iconos: Record<string, string> = {
      tickets: '🎫',
      deployments: '🚀',
      testing: '🧪',
    };
    return iconos[tipo] || '📊';
  };

  if (profile?.role !== 'admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Solo administradores pueden ver reportes</p>
      </div>
    );
  }

  if (cargando) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <Button onClick={() => setModalAbierto(true)}>+ Generar Reporte</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-red-700">
          {error}
        </div>
      )}

      {reportes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Sin reportes</p>
          <Button onClick={() => setModalAbierto(true)}>Generar Primer Reporte</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reportes.map((reporte) => (
            <div
              key={reporte.id}
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => setReporteSeleccionado(reporte)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{obtenerIconoTipo(reporte.report_type)}</span>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{reporte.title}</h3>
                    <p className="text-sm text-gray-600">
                      {reporte.period_start} a {reporte.period_end}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEliminar(reporte.id);
                  }}
                  className="flex-1 bg-red-50 text-red-600 text-sm py-2"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {reporteSeleccionado && (
        <Modal onClose={() => setReporteSeleccionado(null)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{reporteSeleccionado.title}</h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Período</p>
                <p className="font-semibold">
                  {reporteSeleccionado.period_start} a {reporteSeleccionado.period_end}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tipo</p>
                <p className="font-semibold">{reporteSeleccionado.report_type}</p>
              </div>
            </div>

            {reporteSeleccionado.data && (
              <div className="space-y-4">
                {Object.entries(reporteSeleccionado.data).map(([clave, valor]) => (
                  <div key={clave} className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {clave.replace(/_/g, ' ').toUpperCase()}
                    </p>
                    {typeof valor === 'object' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(valor as Record<string, any>).map(([k, v]) => (
                          <div key={k} className="bg-gray-50 p-3 rounded">
                            <p className="text-xs text-gray-600 capitalize">{k}</p>
                            <p className="text-lg font-bold text-gray-900">{v as string}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-2xl font-bold text-gray-900">{valor as string}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <Button onClick={() => setReporteSeleccionado(null)} className="w-full">
                Cerrar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {modalAbierto && (
        <Modal onClose={() => setModalAbierto(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Generar Reporte</h2>
            <form onSubmit={handleGenerarReporte} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Reporte
                </label>
                <select
                  value={filtros.tipoReporte}
                  onChange={(e) => setFiltros({ ...filtros, tipoReporte: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="tickets">Tickets</option>
                  <option value="deployments">Despliegues</option>
                  <option value="testing">Testing</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente (Opcional - Todos si dejas en blanco)
                </label>
                <select
                  value={filtros.clienteId}
                  onChange={(e) => setFiltros({ ...filtros, clienteId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los Clientes</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={cliente.client_company_id}>
                      {cliente.client_company?.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="flex-1 bg-gray-100 text-gray-900"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={generando} className="flex-1">
                  {generando ? 'Generando...' : 'Generar'}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
