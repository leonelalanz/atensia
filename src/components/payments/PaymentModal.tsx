import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';
import Modal from '../ui/Modal';
import { PAYMENT_METHODS } from '../../lib/paymentMethods';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  plan: any;
}

export default function PaymentModal({ open, onClose, plan }: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Selecciona Método de Pago" size="lg">
      <div className="space-y-6">
        {/* Plan Summary */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Plan seleccionado</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{plan.name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400">Monto a pagar</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${plan.price} USD
              </p>
            </div>
          </div>
        </div>

        {/* Method Selection */}
        {!selectedMethod ? (
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
              Elige tu método de pago
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left"
                >
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">
                    {m.name}
                  </p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Back Button */}
            <button
              onClick={() => setSelectedMethod(null)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              ← Cambiar método de pago
            </button>

            {/* Payment Details */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Detalles de pago
              </p>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    {method?.name}
                  </p>
                  <div className="flex items-center justify-between bg-white dark:bg-gray-900 rounded-lg p-3">
                    <code className="text-sm font-mono text-gray-900 dark:text-white">
                      {method?.details}
                    </code>
                    <button
                      onClick={() => handleCopy(method?.details || '', method?.id || '')}
                      className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      {copied === method?.id ? (
                        <Check size={18} className="text-green-600" />
                      ) : (
                        <Copy size={18} />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                    Monto a enviar
                  </p>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      ${plan.price} USD
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instrucciones
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  {method?.instructions}
                </p>
              </div>
            </div>

            {/* Next Steps */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Próximos pasos
              </p>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <span>Realiza el pago con los datos indicados</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <span>Toma una captura de pantalla del comprobante</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </span>
                  <span>Sube el comprobante en el siguiente formulario</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    4
                  </span>
                  <span>Nuestro equipo validará y activará tu suscripción (1-2 horas)</span>
                </li>
              </ol>
            </div>

            {/* Proof Upload */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subir Comprobante
              </p>
              <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                <input type="file" accept="image/*" className="hidden" />
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Haz click para seleccionar o arrastra tu imagen
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    PNG, JPG, JPEG (máx. 5MB)
                  </p>
                </div>
              </label>
            </div>

            {/* Note */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <span className="font-semibold">Nota:</span> Tu suscripción se activará una vez que validemos tu comprobante de pago. Recibirás un email de confirmación.
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          {selectedMethod && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              He Completado el Pago
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
