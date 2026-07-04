import React, { useState, useEffect } from 'react';
import { Check, ArrowLeft } from 'lucide-react';
import { useRouter } from '../contexts/RouterContext';
import { PLANS } from '../lib/paymentMethods';
import PaymentModal from '../components/payments/PaymentModal';
import { getLatestExchangeRate, Currency, formatPriceDisplay } from '../lib/currencyService';

export default function PricingPage() {
  const { navigate } = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currency, setCurrency] = useState<Currency>('USD');
  const [exchangeRate, setExchangeRate] = useState(4500000);

  useEffect(() => {
    getLatestExchangeRate().then(rate => setExchangeRate(rate));
  }, []);

  const handleUpgrade = (planId: string) => {
    setSelectedPlan(planId);
    setShowPaymentModal(true);
  };

  const plan = PLANS.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate('dashboard')}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-4"
          >
            <ArrowLeft size={20} />
            Volver al Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                Planes de Precios
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Elige el plan perfecto para tu equipo. Todos incluyen 7 días de prueba gratis.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrency('USD')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currency === 'USD'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                USD
              </button>
              <button
                onClick={() => setCurrency('VES')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  currency === 'VES'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                VES
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-2xl border transition-all ${
                plan.popular
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg md:scale-105'
                  : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Más Popular
                </div>
              )}

              <div className="p-8">
                {/* Plan Name */}
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {plan.description}
                </p>

                {/* Price */}
                <div className="mb-6">
                  {currency === 'USD' ? (
                    <>
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">
                        ${plan.price}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                        USD/mes
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">
                        {Math.round(plan.price * exchangeRate).toLocaleString('es-VE')}
                      </span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">
                        VES/mes
                      </span>
                      <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                        ≈ ${plan.price} USD
                      </div>
                    </>
                  )}
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors mb-8 ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Actualizar a {plan.name}
                </button>

                {/* Features */}
                <div className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <Check size={20} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                ¿Puedo cambiar de plan en cualquier momento?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Sí, puedes actualizar o cambiar tu plan en cualquier momento. Los cambios se aplicarán inmediatamente.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                ¿Hay período de prueba?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Sí, todos los planes incluyen 7 días de prueba gratis. No se requiere tarjeta de crédito.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                ¿Cómo cancelo mi suscripción?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Puedes cancelar tu suscripción en cualquier momento desde tu panel de configuración. No hay penalizaciones.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {plan && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          plan={plan}
          selectedCurrency={currency}
        />
      )}
    </div>
  );
}
