import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Subscription } from '../../types';
import { PLANS, PAYMENT_METHODS } from '../../lib/paymentMethods';
import Modal from '../../components/ui/Modal';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Badge from '../../components/ui/Badge';
import { Check, Copy } from 'lucide-react';
import PaymentModal from '../../components/payments/PaymentModal';

export default function UpgradeRequest() {
  const { profile } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, [profile]);

  async function loadSubscription() {
    if (!profile?.company_id) return;

    try {
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setSubscription(data || null);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  const currentPlan = subscription
    ? PLANS.find(p => p.id === subscription.plan)
    : null;

  const handleUpgradeClick = (planId: string) => {
    setSelectedPlan(planId);
    setShowPaymentModal(true);
  };

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
          Mi Plan
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Gestiona tu suscripción actual y actualiza tu plan cuando sea necesario
        </p>
      </div>

      {/* Current Plan Card */}
      {currentPlan && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <Badge variant="info">{currentPlan.name}</Badge>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mt-4 mb-2">
                ${currentPlan.price}
                <span className="text-lg text-gray-600 dark:text-gray-400">/mes</span>
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Fecha de inicio: {new Date(subscription!.start_date).toLocaleDateString('es-ES')}
              </p>
            </div>
            <Badge variant="success">Activo</Badge>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
            <p className="font-semibold text-gray-900 dark:text-white mb-4">
              Características Incluidas
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentPlan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <Check size={18} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Upgrade Plans */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Cambiar Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl border-2 p-6 transition-all ${
                currentPlan?.id === plan.id
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : plan.popular
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
              }`}
            >
              {currentPlan?.id === plan.id && (
                <div className="inline-block bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  Plan Actual
                </div>
              )}
              {plan.popular && currentPlan?.id !== plan.id && (
                <div className="inline-block bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4">
                  Más Popular
                </div>
              )}

              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {plan.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {plan.description}
              </p>

              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  ${plan.price}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  USD/mes
                </span>
              </div>

              <button
                onClick={() => handleUpgradeClick(plan.id)}
                disabled={currentPlan?.id === plan.id}
                className={`w-full py-2.5 rounded-xl font-semibold transition-colors mb-6 ${
                  currentPlan?.id === plan.id
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 cursor-default'
                    : plan.popular
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {currentPlan?.id === plan.id ? 'Plan Actual' : `Cambiar a ${plan.name}`}
              </button>

              <ul className="space-y-2">
                {plan.features.slice(0, 4).map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
                {plan.features.length > 4 && (
                  <li className="text-sm text-gray-500 dark:text-gray-500 ml-6">
                    +{plan.features.length - 4} más
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Modal */}
      {selectedPlan && PLANS.find(p => p.id === selectedPlan) && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          plan={PLANS.find(p => p.id === selectedPlan)!}
        />
      )}
    </div>
  );
}
