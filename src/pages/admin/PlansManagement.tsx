import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Company, Subscription } from '../../types';
import { PLANS } from '../../lib/paymentMethods';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import { Check } from 'lucide-react';

export default function PlansManagement() {
  const [companies, setCompanies] = useState<(Company & { subscription?: Subscription })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      const { data: companiesData } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (companiesData) {
        const companiesWithSubs = await Promise.all(
          companiesData.map(async (company) => {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('*')
              .eq('company_id', company.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();
            return {
              ...company,
              subscription: sub || undefined,
            };
          })
        );
        setCompanies(companiesWithSubs);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgradePlan() {
    if (!selectedCompany || !selectedPlan) return;

    setUpdating(true);
    try {
      const plan = PLANS.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plan no encontrado');

      // Actualizar o crear suscripción
      const { error } = await supabase.from('subscriptions').upsert({
        company_id: selectedCompany.id,
        plan: selectedPlan as any,
        status: 'active',
        start_date: new Date().toISOString(),
        amount: plan.price,
        currency: 'USD',
      });

      if (error) throw error;

      // Desactivar modo mantenimiento si estaba
      if (selectedCompany.maintenance_mode) {
        await supabase
          .from('companies')
          .update({ maintenance_mode: false })
          .eq('id', selectedCompany.id);
      }

      // Recargar datos
      await loadCompanies();
      setSelectedCompany(null);
      setSelectedPlan(null);

      alert('Plan actualizado exitosamente');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Gestión de Planes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Administra los planes de suscripción de todas las empresas
        </p>
      </div>

      {/* Companies Table */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 px-6 py-4">
                  Empresa
                </th>
                <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 px-6 py-4">
                  Plan Actual
                </th>
                <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 px-6 py-4">
                  Estado
                </th>
                <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 px-6 py-4">
                  Fecha de Inicio
                </th>
                <th className="text-left text-sm font-semibold text-gray-700 dark:text-gray-300 px-6 py-4">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => {
                const currentPlan = PLANS.find(p => p.id === company.subscription?.plan);
                return (
                  <tr
                    key={company.id}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                          style={{ backgroundColor: company.primary_color }}
                        >
                          {company.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {company.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {company.admin_email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {currentPlan ? (
                        <Badge variant="info">{currentPlan.name}</Badge>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Sin plan
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant={
                          company.maintenance_mode
                            ? 'danger'
                            : company.subscription?.status === 'active'
                            ? 'success'
                            : 'secondary'
                        }
                      >
                        {company.maintenance_mode
                          ? 'Suspendida'
                          : company.subscription?.status === 'active'
                          ? 'Activa'
                          : 'Prueba'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {company.subscription?.start_date
                        ? new Date(company.subscription.start_date).toLocaleDateString('es-ES')
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedCompany(company);
                          setSelectedPlan(company.subscription?.plan || 'basic');
                        }}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        Editar Plan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Selection Modal */}
      <Modal
        open={!!selectedCompany}
        onClose={() => {
          setSelectedCompany(null);
          setSelectedPlan(null);
        }}
        title={`Actualizar Plan - ${selectedCompany?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Selecciona el nuevo plan para esta empresa. El cambio se aplicará inmediatamente.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {plan.name}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  ${plan.price}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  {plan.description}
                </p>
                {selectedPlan === plan.id && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <Check size={16} />
                    <span className="text-sm font-medium">Seleccionado</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Features of selected plan */}
          {selectedPlan && (
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-3">
                Características incluidas:
              </p>
              <ul className="space-y-2">
                {PLANS.find(p => p.id === selectedPlan)?.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setSelectedCompany(null);
                setSelectedPlan(null);
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpgradePlan}
              disabled={updating || !selectedPlan}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {updating ? 'Actualizando...' : 'Actualizar Plan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
