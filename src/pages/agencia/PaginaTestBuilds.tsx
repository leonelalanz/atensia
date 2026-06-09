import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { obtenerClientes, obtenerPlataformasTest } from '../../lib/clientes';
import {
  subirTestBuild,
  obtenerTestBuilds,
  marcarProbando,
  marcarCompletado,
  marcarFallido,
  eliminarTestBuild,
} from '../../lib/testsBuilds';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function PaginaTestBuilds() {
  const { profile } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [testBuilds, setTestBuilds] = useState<any[]>([]);
  const [plataformas, setPlataformas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);

  const [formulario, setFormulario] = useState({
    idPlataforma: '',
    version: '',
    numeroCompilacion: '',
    urlTest: '',
    urlArchivoCompilacion: '',
    notas: '',
  });

  useEffect(() => {
    if (profile?.company_id) {
      cargarDatos();
    }
  }, [profile?.company_id]);

  useEffect(() => {
    if (clienteSeleccionado) {
      cargarTestBuilds();
    } else {
      setTestBuilds([]);
    }
  }, [clienteSeleccionado]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [misCl, misPlat] = await Promise.all([
        obtenerClientes(profile!.company_id!),
        obtenerPlataformasTest(),
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

  const cargarTestBuilds = async () => {
    try {
      const datos = await obtenerTestBuilds(clienteSeleccionado);
      setTestBuilds(datos);
    } catch (err) {
      console.error(err);
      setError('Error cargando test builds');
    }
  };

  const handleSubir = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await subirTestBuild({
        idClienteEmpresa: clienteSeleccionado,
        idPlataforma: formulario.idPlataforma,
        version: formulario.version,
        numeroCompilacion: formulario.numeroCompilacion,
        idUsuario: profile!.id,
        urlTest: formulario.urlTest,
        urlArchivoCompilacion: formulario.urlArchivoCompilacion,
        notas: formulario.notas,
      });
      setFormulario({
        idPlataforma: '',
        version: '',
        numeroCompilacion: '',
        urlTest: '',
        urlArchivoCompilacion: '',
        notas: '',
      });
      setModalAbierto(false);
      cargarTestBuilds();
    } catch (err) {
      setError(`Error subiendo test build: ${err}`);
    }
  };

  const handleProbando = async (idTestBuild: string) => {
    try {
      await marcarProbando(idTestBuild);
      cargarTestBuilds();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const handleCompletado = async (idTestBuild: string) => {
    try {
      await marcarCompletado(idTestBuild);
      cargarTestBuilds();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const handleFallido = async (idTestBuild: string) => {
    try {
      await marcarFallido(idTestBuild);
      cargarTestBuilds();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const handleEliminar = async (idTestBuild: string) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      await eliminarTestBuild(idTestBuild);
      cargarTestBuilds();
    } catch (err) {
      setError(`Error: ${err}`);
    }
  };

  const obtenerColorEstado = (estado: string) => {
    const colores: Record<string, string> = {
      created: 'bg-gray-100 text-gray-700',
      distributed: 'bg-blue-100 text-blue-700',
      testing: 'bg-yellow-100 text-yellow-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      archived: 'bg-gray-500 text-white',
    };
    return colores[estado] || 'bg-gray-100 text-gray-700';
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Test Builds</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-red-700">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-4">
          Seleccionar Cliente
        </label>
        {clientes.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No tienes clientes registrados</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clientes.map((cliente) => (
              <button
                key={cliente.id}
                onClick={() => setClienteSeleccionado(cliente.client_company_id)}
                className={`p-4 rounded-lg border-2 transition-all text-left ${
                  clienteSeleccionado === cliente.client_company_id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300 bg-white'
                }`}
              >
                <h3 className="font-bold text-gray-900">{cliente.client_company?.name}</h3>
                <p className="text-sm text-gray-600">{cliente.client_contact_email}</p>
                <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                  cliente.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {cliente.status === 'active' ? 'Activo' : 'Suspendido'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {clienteSeleccionado && (
        <div className="mb-6 flex justify-end">
          <Button onClick={() => setModalAbierto(true)}>+ Subir Test Build</Button>
        </div>
      )}

      {testBuilds.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {clienteSeleccionado ? 'Sin test builds' : 'Selecciona un cliente'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {testBuilds.map((build) => (
            <div key={build.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {build.platform?.name} v{build.version}
                  </h3>
                  <p className="text-sm text-gray-600">Build #{build.build_number}</p>
                </div>
                <span className={`px-3 py-1 rounded text-sm font-medium ${obtenerColorEstado(build.status)}`}>
                  {build.status}
                </span>
              </div>

              {build.test_url && (
                <p className="mb-2">
                  <a
                    href={build.test_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-sm hover:underline"
                  >
                    Ver URL de Test →
                  </a>
                </p>
              )}

              {build.test_notes && (
                <p className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                  {build.test_notes}
                </p>
              )}

              <div className="flex gap-2">
                {build.status === 'created' && (
                  <Button
                    onClick={() => handleProbando(build.id)}
                    className="flex-1 bg-yellow-50 text-yellow-600 text-sm py-2"
                  >
                    Probando
                  </Button>
                )}
                {build.status === 'testing' && (
                  <>
                    <Button
                      onClick={() => handleCompletado(build.id)}
                      className="flex-1 bg-green-50 text-green-600 text-sm py-2"
                    >
                      Completado
                    </Button>
                    <Button
                      onClick={() => handleFallido(build.id)}
                      className="flex-1 bg-red-50 text-red-600 text-sm py-2"
                    >
                      Fallido
                    </Button>
                  </>
                )}
                {(build.status === 'completed' || build.status === 'failed') && (
                  <Button
                    onClick={() => handleEliminar(build.id)}
                    className="flex-1 bg-gray-50 text-gray-600 text-sm py-2"
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <Modal onClose={() => setModalAbierto(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Subir Test Build</h2>
            <form onSubmit={handleSubir} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plataforma Test
                </label>
                <select
                  required
                  value={formulario.idPlataforma}
                  onChange={(e) => setFormulario({ ...formulario, idPlataforma: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Elige plataforma...</option>
                  {plataformas.map((p) => (
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
                  value={formulario.urlArchivoCompilacion}
                  onChange={(e) => setFormulario({ ...formulario, urlArchivoCompilacion: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={formulario.notas}
                  onChange={(e) => setFormulario({ ...formulario, notas: e.target.value })}
                  rows={2}
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
                <Button type="submit" className="flex-1">
                  Subir
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
