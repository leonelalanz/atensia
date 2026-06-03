import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError('Ingresa tu correo electrónico.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await resetPassword(email);
    if (err) {
      setError('No se pudo enviar el correo. Verifica la dirección ingresada.');
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <AlertCircle size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Atensia</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Gestión de Incidencias</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Correo enviado</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Revisa tu bandeja de entrada en <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span> y sigue las instrucciones para restablecer tu contraseña.
              </p>
              <button
                onClick={() => navigate('login')}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => navigate('login')}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recuperar contraseña</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Te enviaremos un enlace para restablecerla.
                  </p>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 mb-4">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@empresa.com"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      autoComplete="email"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {loading && <LoadingSpinner size="sm" />}
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
