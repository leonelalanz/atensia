import React from 'react';
import { AlertCircle, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useBrand } from '../contexts/BrandContext';

export default function SuspendedPage() {
  const { signOut } = useAuth();
  const { primaryColor, companyName } = useBrand();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle size={32} className="text-red-600 dark:text-red-400" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Suscripción Vencida
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            La suscripción de <span className="font-semibold">{companyName}</span> ha vencido o está pendiente de pago.
          </p>

          {/* Message */}
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
            <p className="text-sm text-red-700 dark:text-red-400">
              Para continuar usando Atensia, por favor actualiza tu suscripción.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <a
              href="mailto:soporte@atensia.com?subject=Renovación de suscripción"
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              style={{ backgroundColor: primaryColor }}
            >
              <Mail size={16} />
              Contactar Soporte
            </a>
            <button
              onClick={() => signOut()}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>

          {/* Footer */}
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-6">
            Si crees que esto es un error, contacta a soporte.
          </p>
        </div>
      </div>
    </div>
  );
}
