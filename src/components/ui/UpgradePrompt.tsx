import React from 'react';
import { Zap, Lock } from 'lucide-react';
import { useRouter } from '../../contexts/RouterContext';
import { CompanyPlan } from '../../types';

const PLAN_LABELS: Record<CompanyPlan, string> = {
  basic:        'Starter',
  professional: 'Pro',
  enterprise:   'Business',
};

const PLAN_COLORS: Record<CompanyPlan, string> = {
  basic:        'from-blue-600 to-indigo-600',
  professional: 'from-violet-600 to-purple-600',
  enterprise:   'from-amber-500 to-orange-500',
};

interface Props {
  /** Título del bloqueo, ej: "Branding propio" */
  feature: string;
  /** Descripción de por qué está bloqueado */
  description: string;
  /** Plan mínimo requerido para acceder */
  requiredPlan: CompanyPlan;
  /** Mostrar como bloqueo de página completa o inline */
  variant?: 'page' | 'inline' | 'banner';
}

export default function UpgradePrompt({ feature, description, requiredPlan, variant = 'page' }: Props) {
  const { navigate } = useRouter();
  const label = PLAN_LABELS[requiredPlan];
  const gradient = PLAN_COLORS[requiredPlan];

  if (variant === 'banner') {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <Lock size={15} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
        <p className="text-sm text-amber-700 dark:text-amber-300 flex-1">
          <span className="font-semibold">{feature}</span> requiere el plan{' '}
          <span className="font-bold">{label}</span>. {description}
        </p>
        <button
          onClick={() => navigate('settings')}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold transition-colors"
        >
          <Zap size={12} />
          Mejorar
        </button>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 px-6 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Lock size={20} className="text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{feature}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{description}</p>
        </div>
        <button
          onClick={() => navigate('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${gradient} text-white text-sm font-semibold shadow-sm hover:opacity-90 transition-opacity`}
        >
          <Zap size={14} />
          Mejorar al plan {label}
        </button>
      </div>
    );
  }

  // page variant — bloqueo de página completa
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-xl mb-6`}>
        <Lock size={28} className="text-white" />
      </div>
      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${gradient} mb-4`}>
        Plan {label} requerido
      </span>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{feature}</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md leading-relaxed mb-8">{description}</p>
      <button
        onClick={() => navigate('settings')}
        className={`flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r ${gradient} text-white font-semibold shadow-lg hover:opacity-90 hover:-translate-y-0.5 transition-all`}
      >
        <Zap size={16} />
        Mejorar al plan {label}
      </button>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
        Contacta a soporte para cambiar tu plan
      </p>
    </div>
  );
}
