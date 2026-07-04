import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { getExchangeRateHistory, updateExchangeRate, getLatestExchangeRate } from '../../lib/currencyService';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ExchangeRatePage() {
  const { profile, user } = useAuth();
  const { navigate } = useRouter();
  const [currentRate, setCurrentRate] = useState<number>(4500000);
  const [newRate, setNewRate] = useState<string>('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.role !== 'superadmin') {
      navigate('dashboard');
      return;
    }
    loadData();
  }, [profile]);

  async function loadData() {
    try {
      const rate = await getLatestExchangeRate();
      setCurrentRate(rate);
      setNewRate(rate.toString());
      const hist = await getExchangeRateHistory();
      setHistory(hist);
    } catch (err) {
      setError('Error loading exchange rates');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateRate() {
    if (!newRate || !user) {
      setError('Ingresa una tasa válida');
      return;
    }

    const rate = parseFloat(newRate);
    if (rate <= 0) {
      setError('La tasa debe ser mayor a 0');
      return;
    }

    setUpdating(true);
    try {
      await updateExchangeRate(rate, user.id);
      setCurrentRate(rate);
      setError(null);
      loadData();
    } catch (err) {
      setError('Error al actualizar la tasa');
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Tasa de Cambio USD/VES</h1>

      {/* Current Rate */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tasa Actual</div>
        <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
          1 USD = {currentRate.toLocaleString('es-VE')} VES
        </div>
      </div>

      {/* Update Form */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Actualizar Tasa</h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nueva Tasa (VES por 1 USD)</label>
            <input
              type="number"
              value={newRate}
              onChange={(e) => setNewRate(e.target.value)}
              placeholder="4500000"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            />
          </div>

          <Button
            onClick={handleUpdateRate}
            disabled={updating}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {updating ? 'Actualizando...' : 'Actualizar Tasa'}
          </Button>
        </div>
      </div>

      {/* History */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Historial (últimas 30 actualizaciones)</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="text-left py-2 px-4">Fecha</th>
                <th className="text-right py-2 px-4">Tasa</th>
                <th className="text-left py-2 px-4">Actualizado Por</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-4 text-gray-500">
                    Sin historial
                  </td>
                </tr>
              ) : (
                history.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="py-2 px-4">
                      {new Date(entry.effective_date).toLocaleString('es-VE')}
                    </td>
                    <td className="text-right py-2 px-4 font-mono">
                      {entry.rate.toLocaleString('es-VE')}
                    </td>
                    <td className="py-2 px-4">
                      {entry.updated_by?.full_name || 'Sistema'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
