import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from '../../contexts/RouterContext';
import { useBrand } from '../../contexts/BrandContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import { sendUserRegistrationEmail } from '../../lib/emailService';

export default function SignUpPage() {
  const { navigate } = useRouter();
  const { primaryColor, logoUrl, companyName } = useBrand();
  const [showPass, setShowPass] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    companyColor: '#2563eb',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.fullName.trim()) {
      setError('El nombre completo es obligatorio.');
      return;
    }
    if (!formData.email.trim()) {
      setError('El correo electrónico es obligatorio.');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    if (!formData.companyName.trim()) {
      setError('El nombre de la empresa es obligatorio.');
      return;
    }

    setLoading(true);

    try {
      // 1. Crear usuario en Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password.trim(),
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: undefined,
        },
      });

      if (authErr) throw authErr;
      if (!authData.user) throw new Error('No user data returned');

      // 2. Crear empresa con admin usando RPC (bypassa RLS)
      const { data: rpcData, error: rpcErr } = await supabase.rpc(
        'create_company_with_admin',
        {
          p_user_id: authData.user.id,
          p_company_name: formData.companyName.trim(),
          p_company_color: formData.companyColor,
          p_admin_name: formData.fullName,
          p_admin_email: formData.email,
        }
      );

      if (rpcErr) throw rpcErr;
      if (!rpcData || !rpcData[0]?.success) {
        const errorMsg = rpcData?.[0]?.error_msg || 'Error al crear la empresa';
        throw new Error(errorMsg);
      }

      const companyId = rpcData[0].company_id;

      // 3. Crear políticas SLA por defecto
      try {
        await supabase.rpc('create_default_sla_policies', { p_company_id: companyId });
      } catch (slaErr) {
        console.error('Error creating SLA policies:', slaErr);
        // No es crítico si falla, continuar de todas formas
      }

      // 4. Enviar email de bienvenida
      try {
        await sendUserRegistrationEmail({
          email: formData.email.trim(),
          name: formData.fullName,
          companyName: formData.companyName.trim(),
          loginUrl: `${window.location.origin}/login`,
        });
      } catch (emailErr) {
        console.error('Error sending registration email:', emailErr);
        // No es crítico si falla, continuar de todas formas
      }

      // Éxito - mostrar modal
      setError('');
      setSuccessModal(true);
    } catch (err: any) {
      console.error('SignUp error:', err);
      setError(err.message || 'Error al crear la cuenta. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left Panel - Background */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col relative items-center justify-center p-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-700/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-800/6 rounded-full blur-2xl" />
        </div>

        <div className="relative z-10 text-center max-w-md">
          <h1 className="text-3xl xl:text-4xl font-bold text-white mb-4">
            Bienvenido a <span className="text-blue-400">Atensia</span>
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Plataforma de soporte técnico multi-empresa con SLAs, roles y trazabilidad completa.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-1" />
              <div className="text-left">
                <p className="text-white font-semibold">Gestión de Tickets</p>
                <p className="text-sm text-slate-400">Organiza y resuelve incidencias eficientemente</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-1" />
              <div className="text-left">
                <p className="text-white font-semibold">SLAs Configurables</p>
                <p className="text-sm text-slate-400">Define tiempos de respuesta y resolución</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 size={20} className="text-green-400 flex-shrink-0 mt-1" />
              <div className="text-left">
                <p className="text-white font-semibold">Multi-empresa</p>
                <p className="text-sm text-slate-400">Gestiona múltiples empresas en una plataforma</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col justify-center items-center p-6 sm:p-10 overflow-y-auto">
        {/* Mobile header */}
        <div className="flex lg:hidden items-center gap-2 mb-8 self-start">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <AlertCircle size={14} className="text-white" />
          </div>
          <span className="text-gray-900 dark:text-white font-bold text-lg">Atensia</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Crear Cuenta</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Registrate y crea tu empresa en segundos.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400 mb-5">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre Completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nombre Completo *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Juan Pérez"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Correo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Correo Electrónico *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="tu@empresa.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirmar Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Confirmar Contraseña *
              </label>
              <div className="relative">
                <input
                  type={showPassConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Repite tu contraseña"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassConfirm(!showPassConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Nombre Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="Mi Empresa"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Color Empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Color Principal
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.companyColor}
                  onChange={(e) => setFormData({ ...formData, companyColor: e.target.value })}
                  className="h-9 w-16 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer"
                />
                <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                  {formData.companyColor}
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 mt-6"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => navigate('login')}
                className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Inicia sesión
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        open={successModal}
        onClose={() => {
          setSuccessModal(false);
          navigate('login');
        }}
        title="¡Cuenta Creada Exitosamente!"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-700 dark:text-gray-300">
              Tu cuenta ha sido creada exitosamente.
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Por favor confirma tu correo electrónico antes de iniciar sesión.
            </p>
          </div>
          <button
            onClick={() => {
              setSuccessModal(false);
              navigate('login');
            }}
            className="w-full px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </Modal>
    </div>
  );
}
