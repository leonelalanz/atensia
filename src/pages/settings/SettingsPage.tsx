import React, { useState, useEffect } from 'react';
import { Save, User, Palette, Zap, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { PLANS } from '../../lib/paymentMethods';
import PaymentModal from '../../components/payments/PaymentModal';
import { Subscription } from '../../types';
import { Check } from 'lucide-react';

const EMOJIS = ['👤','👩‍💻','👨‍💻','🧑‍💼','👩‍💼','🧑‍🔧','👩‍🔧','👨‍🔧','🦸','🧑‍🎓','🐱','🦊','🐻','🦁','🐯','🦅','🦋','🌟','🔥','⚡'];

const PRESET_COLORS = [
  '#2563eb', '#0ea5e9', '#0891b2', '#0d9488', '#16a34a',
  '#ca8a04', '#ea580c', '#dc2626', '#be185d',
  '#1e293b', '#374151', '#6b7280',
];

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Administrador',
  admin: 'Administrador',
  agent: 'Agente de Soporte',
  developer: 'Desarrollador',
};

const PLAN_CONFIG: Record<string, { label: string; color: string; gradient: string; next?: string }> = {
  basic:        { label: 'Starter',  color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400',   gradient: 'from-blue-600 to-indigo-600',   next: 'Pro ($79/mes)' },
  professional: { label: 'Pro',      color: 'text-violet-600 bg-violet-100 dark:bg-violet-900/30 dark:text-violet-400', gradient: 'from-violet-600 to-purple-600', next: 'Business ($199/mes)' },
  enterprise:   { label: 'Business', color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',  gradient: 'from-amber-500 to-orange-500',  next: undefined },
};

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { plan, planLabel, maxAgentes, canUseBranding, canExportPDF, canUseMultiEmpresa } = usePlan();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedUpgradePlan, setSelectedUpgradePlan] = useState<string | null>(null);
  const [form, setForm] = useState({
    full_name: profile?.full_name ?? '',
    avatar_emoji: profile?.avatar_emoji ?? '👤',
    avatar_color: profile?.avatar_color ?? '#2563eb',
  });

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
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError('');

    const { error: err } = await supabase.from('profiles').update({
      full_name: form.full_name,
      avatar_emoji: form.avatar_emoji,
      avatar_color: form.avatar_color,
    }).eq('id', profile!.id);

    if (err) {
      setError(err.message);
    } else {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  const previewProfile = profile ? { ...profile, ...form } : null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Mi Perfil</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Personaliza tu avatar, color principal y datos personales</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-800">
          <Avatar profile={previewProfile as any} size="lg" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{form.full_name || profile?.full_name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ROLE_LABELS[profile?.role ?? 'agent']}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre completo *</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Correo electrónico
            </label>
            <input
              type="email"
              value={profile?.email ?? ''}
              disabled
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed"
            />
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <User size={16} className="text-gray-500 dark:text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Avatar</h3>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                Emoji del avatar
              </label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, avatar_emoji: emoji }))}
                    className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                      form.avatar_emoji === emoji
                        ? 'ring-2 ring-offset-2 scale-110'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    style={form.avatar_emoji === emoji ? { outlineColor: form.avatar_color } : {}}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>


          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: form.avatar_color }}
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ¡Perfil actualizado!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Plan card — solo para usuarios de empresa, no superadmin */}
      {plan && (() => {
        const cfg = PLAN_CONFIG[plan] ?? PLAN_CONFIG.basic;
        return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tu plan actual</h2>

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
                  <Zap size={18} className="text-white" />
                </div>
                <div>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Plan activo</p>
                </div>
              </div>
              <button
                onClick={() => setShowPlanSelector(true)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r ${cfg?.gradient || 'from-blue-600 to-blue-700'} text-white text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity`}
              >
                <Zap size={13} />
                Cambiar Plan
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Agentes',        value: maxAgentes === Infinity ? 'Ilimitados' : `Hasta ${maxAgentes}`, ok: true },
                { label: 'Branding propio',  value: canUseBranding ? 'Incluido' : 'No incluido',   ok: canUseBranding },
                { label: 'Multi-empresa',    value: canUseMultiEmpresa ? 'Incluido' : 'No incluido', ok: canUseMultiEmpresa },
                { label: 'SLA avanzado',     value: canUseBranding ? 'Incluido' : 'No incluido',   ok: canUseBranding },
                { label: 'Exportar PDF',     value: canExportPDF ? 'Incluido' : 'No incluido',      ok: canExportPDF },
                { label: 'Soporte',          value: canUseMultiEmpresa ? 'Prioritario' : 'Estándar', ok: true },
              ].map(({ label, value, ok }) => (
                <div key={label} className="flex flex-col gap-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">{label}</span>
                  <span className={`text-xs font-semibold ${ok ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                    {!ok && <span className="mr-1">✗</span>}{ok && value !== 'No incluido' && <span className="mr-1 text-emerald-500">✓</span>}{value}
                  </span>
                </div>
              ))}
            </div>

          </div>
        );
      })()}

      {/* Plan Selector Modal */}
      <Modal
        open={showPlanSelector}
        onClose={() => setShowPlanSelector(false)}
        title="Seleccionar Plan"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Elige el plan que deseas contratar:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedUpgradePlan(p.id);
                  setShowPlanSelector(false);
                  setShowPaymentModal(true);
                }}
                className={`p-6 rounded-xl border-2 transition-all text-left flex flex-col ${
                  plan === p.id
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {p.name}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  ${p.price}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
                  {p.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-4 flex-1">
                  {p.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300">
                      <Check size={14} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan === p.id && (
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400 pt-3 border-t border-green-200 dark:border-green-800">
                    <Check size={16} />
                    <span className="text-sm font-medium">Plan Actual</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      {selectedUpgradePlan && PLANS.find(p => p.id === selectedUpgradePlan) && (
        <PaymentModal
          open={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedUpgradePlan(null);
          }}
          plan={PLANS.find(p => p.id === selectedUpgradePlan)!}
        />
      )}
    </div>
  );
}
