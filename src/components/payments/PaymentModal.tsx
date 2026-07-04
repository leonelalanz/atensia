import React, { useState } from 'react';
import { Copy, Check, Upload, AlertCircle } from 'lucide-react';
import Modal from '../ui/Modal';
import { PAYMENT_METHODS } from '../../lib/paymentMethods';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Currency, getLatestExchangeRate } from '../../lib/currencyService';

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  plan: any;
  selectedCurrency?: Currency;
}

export default function PaymentModal({ open, onClose, plan, selectedCurrency = 'USD' }: PaymentModalProps) {
  const { profile } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(4500000);

  const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);

  React.useEffect(() => {
    if (open) {
      getLatestExchangeRate().then(rate => setExchangeRate(rate));
    }
  }, [open]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError('El archivo no debe exceder 5MB');
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
        setUploadError('Solo se aceptan PNG, JPG, JPEG');
        return;
      }
      setProofFile(file);
      setUploadError(null);
    }
  };

  const handleUploadProof = async () => {
    if (!proofFile || !profile?.id) return;

    try {
      setUploading(true);
      setUploadError(null);

      // Upload image to storage
      const fileName = `${profile.id}-${Date.now()}.${proofFile.name.split('.').pop()}`;
      const { error: storageError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, proofFile);

      if (storageError) throw storageError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      // Save payment proof to database
      // Determinar el plan ID basado en el nombre o estructura
      let planId = 'basic';
      if (plan.name?.toLowerCase().includes('professional')) planId = 'professional';
      else if (plan.name?.toLowerCase().includes('enterprise')) planId = 'enterprise';
      else if (plan.id) planId = plan.id; // Si tiene id propio, úsalo

      const { error: dbError } = await supabase.from('payment_proofs').insert({
        company_id: profile.company_id,
        plan: planId,
        plan_price: plan.price,
        currency: selectedCurrency,
        payment_method: method?.name,
        proof_url: urlData.publicUrl,
        proof_file_name: proofFile.name,
        status: 'pending',
      });

      if (dbError) throw dbError;

      setUploadSuccess(true);
      setProofFile(null);

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      console.error('Error uploading proof:', error);
      setUploadError(error.message || 'Error al subir el comprobante');
    } finally {
      setUploading(false);
    }
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
              {selectedCurrency === 'USD' ? (
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  ${plan.price} USD
                </p>
              ) : (
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {Math.round(plan.price * exchangeRate).toLocaleString('es-VE')} VES
                </p>
              )}
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
              onClick={() => {
                setSelectedMethod(null);
                setProofFile(null);
                setUploadError(null);
                setUploadSuccess(false);
              }}
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
                    {selectedCurrency === 'USD' ? (
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        ${plan.price} USD
                      </p>
                    ) : (
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {Math.round(plan.price * exchangeRate).toLocaleString('es-VE')} VES
                      </p>
                    )}
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
            {!uploadSuccess && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subir Comprobante
                </p>
                {uploadError && (
                  <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex gap-2">
                    <AlertCircle size={18} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-900 dark:text-red-100">{uploadError}</p>
                  </div>
                )}
                <label className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={uploading}
                  />
                  <div>
                    <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {proofFile ? proofFile.name : 'Haz click para seleccionar o arrastra tu imagen'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PNG, JPG, JPEG (máx. 5MB)
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Success Message */}
            {uploadSuccess && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <p className="text-sm text-green-900 dark:text-green-100">
                  <span className="font-semibold">✓ Comprobante enviado correctamente.</span> Nuestro equipo lo validará pronto.
                </p>
              </div>
            )}

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
          {selectedMethod && proofFile && !uploadSuccess && (
            <button
              onClick={handleUploadProof}
              disabled={uploading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium transition-colors"
            >
              {uploading ? 'Enviando...' : 'Enviar Comprobante'}
            </button>
          )}
          {uploadSuccess && (
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
