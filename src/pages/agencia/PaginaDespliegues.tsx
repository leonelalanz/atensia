import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { obtenerClientes, obtenerPlataformasDespliegue } from '../../lib/clientes';
import {
  crearDespliegue,
  obtenerDespliegues,
  aprobarDespliegue,
  rechazarDespliegue,
  marcarEnVivo,
  revertirDespliegue,
} from '../../lib/despliegues';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import jsPDF from 'jspdf';
import { write, utils } from 'xlsx';

export default function PaginaDespliegues() {
  const { profile } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [despliegues, setDespliegues] = useState<any[]>([]);
  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const [formulario, setFormulario] = useState({
    tipo: 'production',
    idPlataforma: '',
    version: '',
    numeroCompilacion: '',
    notasLanzamiento: '',
    urlTest: '',
    urlArchivo: '',
    notas: '',
  });

  useEffect(() => {
    if (profile?.company_id) {
      cargarDatos();
    }
  }, [profile?.company_id]);

  useEffect(() => {
    if (clienteSeleccionado) {
      cargarDespliegues();
    } else {
      setDespliegues([]);
    }
  }, [clienteSeleccionado]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [misCl, misPlat] = await Promise.all([
        obtenerClientes(profile!.company_id!),
        obtenerPlataformasDespliegue(),
      ]);
      setClientes(misCl);
      setPlataformas(misPlat);
      setError('');
    } catch (err) {
      console.error(err);
      setError('Error cargando datos');
    } finally {
      setCargando(false);
    }
  };

  const cargarDespliegues = async () => {
    try {
      const datos = await obtenerDespliegues(clienteSeleccionado);
      setDespliegues(datos);
    } catch (err) {
      console.error(err);
      setError('Error cargando despliegues');
    }
  };

  const plataformasFiltradasPorTipo = plataformas.filter((p) => {
    if (formulario.tipo === 'test') {
      return p.name.includes('TestFlight') || p.name.includes('TestFairy');
    } else {
      return p.name.includes('App Store') || p.name.includes('Google Play');
    }
  });

  const handleCrearDespliegue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await crearDespliegue({
        idClienteEmpresa: clienteSeleccionado,
        tipo: formulario.tipo,
        idPlataforma: formulario.idPlataforma,
        version: formulario.version,
        numeroCompilacion: formulario.numeroCompilacion,
        notasLanzamiento: formulario.notasLanzamiento,
        urlTest: formulario.urlTest,
        urlArchivoCompilacion: formulario.urlArchivo,
        notas: formulario.notas,
        idUsuario: profile!.id,
      });
      setFormulario({
        tipo: 'production',
        idPlataforma: '',
        version: '',
        numeroCompilacion: '',
        notasLanzamiento: '',
        urlTest: '',
        urlArchivo: '',
        notas: '',
      });
      setModalAbierto(false);
      cargarDespliegues();
    } catch (err) {
      setError(`Error creando despliegue: ${err}`);
    }
  };

  const exportarPDF = () => {
    const doc = new jsPDF();
    const clienteName = clientes.find(c => c.client_company_id === clienteSeleccionado)?.client_company?.name || 'Reporte';

    doc.setFontSize(16);
    doc.text('Reporte de Despliegues', 10, 10);

    doc.setFontSize(10);
    doc.text(`Cliente: ${clienteName}`, 10, 20);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 10, 30);

    let yPos = 45;
    doc.setFontSize(11);
    doc.text('Resumen', 10, yPos);
    yPos += 10;

    doc.setFontSize(10);
    doc.text(`Total Despliegues: ${despliegues.length}`, 10, yPos);
    yPos += 7;
    doc.text(`Test: ${despliegues.filter(d => d.deployment_type === 'test').length}`, 10, yPos);
    yPos += 7;
    doc.text(`Producción: ${despliegues.filter(d => d.deployment_type === 'production').length}`, 10, yPos);
    yPos += 7;
    doc.text(`En Vivo: ${despliegues.filter(d => d.status === 'live').length}`, 10, yPos);

    yPos += 15;
    doc.setFontSize(11);
    doc.text('Despliegues Detallados', 10, yPos);
    yPos += 10;

    despliegues.slice(0, 15).forEach((d, idx) => {
      const texto = `${idx + 1}. ${d.platform?.name} v${d.version} (${d.deployment_type}) - ${d.status}`;
      doc.setFontSize(9);
      doc.text(texto, 10, yPos);
      yPos += 6;
      if (yPos > 270) {
        doc.addPage();
        yPos = 10;
      }
    });

    doc.save(`reporte-despliegues-${clienteName}.pdf`);
  };

  const exportarExcel = () => {
    const clienteName = clientes.find(c => c.client_company_id === clienteSeleccionado)?.client_company?.name || 'Reporte';

    const datos = despliegues.map(d => ({
      Plataforma: d.platform?.name,
      Versión: d.version,
      Build: d.build_number,
      Tipo: d.deployment_type === 'test' ? 'TEST' : 'PRODUCCIÓN',
      Estado: d.status,
      'Notas': d.release_notes,
      'Fecha Creación': new Date(d.created_at).toLocaleDateString(),
    }));

    const ws = utils.json_to_sheet(datos);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, 'Despliegues');

    write(wb, { bookType: 'xlsx', type: 'binary', fileName: `reporte-despliegues-${clienteName}.xlsx` });
  };

  const exportarCSV = () => {
    const clienteName = clientes.find(c => c.client_company_id === clienteSeleccionado)?.client_company?.name || 'Reporte';

    const headers = ['Plataforma', 'Versión', 'Build', 'Tipo', 'Estado', 'Notas', 'Fecha Creación'];
    const rows = despliegues.map(d => [
      d.platform?.name || '',
      d.version,
      d.build_number,
      d.deployment_type === 'test' ? 'TEST' : 'PRODUCCIÓN',
      d.status,
      d.release_notes || '',
      new Date(d.created_at).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-despliegues-${clienteName}.csv`;
    a.click();
  };

  const handleAprobar = async (idDespliegue: string) => {
    try {
      await aprobarDespliegue(idDespliegue, profile!.id);
      cargarDespliegues();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const handleRechazar = async (idDespliegue: string) => {
    try {
      await rechazarDespliegue(idDespliegue, profile!.id);
      cargarDespliegues();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const handleEnVivo = async (idDespliegue: string) => {
    try {
      await marcarEnVivo(idDespliegue);
      cargarDespliegues();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const handleRevertir = async (idDespliegue: string) => {
    const motivo = prompt('¿Motivo de la reversión?');
    if (!motivo) return;
    try {
      await revertirDespliegue(idDespliegue, motivo);
      cargarDespliegues();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const obtenerColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      approved: 'bg-blue-100 text-blue-700',
      rejected: 'bg-red-100 text-red-700',
      live: 'bg-green-500 text-white',
      rollback: 'bg-orange-500 text-white',
    };
    return colores[estado] || 'bg-gray-100 text-gray-700';
  };

  const obtenerLabelTipo = (tipo: string) => {
    return tipo === 'test' ? '🧪 TEST' : '🚀 PRODUCCIÓN';
  };

  if (profile?.role !== 'admin' && profile?.role !== 'developer') {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Acceso denegado</p>
      </div>
    );
  }

  if (cargando) return <LoadingSpinner />;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Despliegues</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Seleccionar Cliente
        </label>
        <select
          value={clienteSeleccionado}
          onChange={(e) => setClienteSeleccionado(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Elige un cliente...</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.client_company_id}>
              {cliente.client_company?.name}
            </option>
          ))}
        </select>
      </div>

      {clienteSeleccionado && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setModalAbierto(true)}>+ Nuevo Despliegue</Button>
        </div>
      )}

      {despliegues.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {clienteSeleccionado ? 'Sin despliegues' : 'Selecciona un cliente'}
          </p>
        </div>
      ) : (
        <>
          {/* Reportes de Despliegues */}
          <div className="mb-8 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">📊 Reportes de Despliegues</h2>
              <div className="flex gap-2">
                <button
                  onClick={exportarPDF}
                  className="px-4 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition"
                >
                  📄 PDF
                </button>
                <button
                  onClick={exportarExcel}
                  className="px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition"
                >
                  📊 Excel
                </button>
                <button
                  onClick={exportarCSV}
                  className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition"
                >
                  📋 CSV
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600">Total Despliegues</p>
                <p className="text-2xl font-bold text-gray-900">{despliegues.length}</p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600">🧪 Test</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {despliegues.filter(d => d.deployment_type === 'test').length}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600">🚀 Producción</p>
                <p className="text-2xl font-bold text-green-600">
                  {despliegues.filter(d => d.deployment_type === 'production').length}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-600">En Vivo</p>
                <p className="text-2xl font-bold text-green-600">
                  {despliegues.filter(d => d.status === 'live').length}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-3">Por Estado</p>
                <div className="space-y-2">
                  {Object.entries(
                    despliegues.reduce((acc: Record<string, number>, d) => {
                      acc[d.status] = (acc[d.status] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([estado, count]) => (
                    <div key={estado} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">{estado}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-3">Por Plataforma</p>
                <div className="space-y-2">
                  {Object.entries(
                    despliegues.reduce((acc: Record<string, number>, d) => {
                      const plat = d.platform?.name || 'Desconocida';
                      acc[plat] = (acc[plat] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([plat, count]) => (
                    <div key={plat} className="flex justify-between text-sm">
                      <span className="text-gray-600">{plat}</span>
                      <span className="font-semibold text-gray-900">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de Despliegues */}
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-300">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">Plataforma</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">Versión</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">Build</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">Tipo</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">Estado</th>
                    <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {despliegues.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{d.platform?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">v{d.version}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">#{d.build_number}</td>
                      <td className="px-4 py-3 text-sm">
                        {d.deployment_type === 'test' ? '🧪 TEST' : '🚀 PROD'}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium">
                        <span className={`px-2 py-1 rounded text-xs ${obtenerColorEstado(d.status)}`}>
                          {d.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {d.status === 'draft' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAprobar(d.id)}
                              className="px-2 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleRechazar(d.id)}
                              className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                            >
                              ✗
                            </button>
                          </div>
                        )}
                        {d.status === 'approved' && (
                          <button
                            onClick={() => handleEnVivo(d.id)}
                            className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                          >
                            Vivo
                          </button>
                        )}
                        {d.status === 'live' && (
                          <button
                            onClick={() => handleRevertir(d.id)}
                            className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600"
                          >
                            ⟲
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <Modal open={modalAbierto} onClose={() => setModalAbierto(false)}>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Nuevo Despliegue</h2>
        <form onSubmit={handleCrearDespliegue} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Despliegue
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormulario({ ...formulario, tipo: 'test', idPlataforma: '' })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                  formulario.tipo === 'test'
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🧪 TEST
              </button>
              <button
                type="button"
                onClick={() => setFormulario({ ...formulario, tipo: 'production', idPlataforma: '' })}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition ${
                  formulario.tipo === 'production'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🚀 PRODUCCIÓN
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Plataforma
            </label>
            <select
              required
              value={formulario.idPlataforma}
              onChange={(e) => setFormulario({ ...formulario, idPlataforma: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Elige plataforma...</option>
              {plataformasFiltradasPorTipo.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Versión</label>
            <input
              type="text"
              required
              placeholder="1.0.0"
              value={formulario.version}
              onChange={(e) => setFormulario({ ...formulario, version: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Compilación
            </label>
            <input
              type="text"
              required
              placeholder="100"
              value={formulario.numeroCompilacion}
              onChange={(e) => setFormulario({ ...formulario, numeroCompilacion: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {formulario.tipo === 'production' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas de Lanzamiento
              </label>
              <textarea
                value={formulario.notasLanzamiento}
                onChange={(e) => setFormulario({ ...formulario, notasLanzamiento: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {formulario.tipo === 'test' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Test
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formulario.urlTest}
                  onChange={(e) => setFormulario({ ...formulario, urlTest: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL de Archivo
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formulario.urlArchivo}
                  onChange={(e) => setFormulario({ ...formulario, urlArchivo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas de Test
                </label>
                <textarea
                  value={formulario.notas}
                  onChange={(e) => setFormulario({ ...formulario, notas: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              onClick={() => setModalAbierto(false)}
              className="flex-1 bg-gray-100 text-gray-900"
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Crear
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
