//usePlan() hook — la fuente de verdad. Lee company.plan del perfil y devuelve todos los gates. Si el usuario es superadmin, acceso total automático.

//UpgradePrompt — componente con 3 variantes:

//page → bloqueo de página completa con botón de upgrade
//inline → bloqueo dentro de una sección
//banner → aviso horizontal no invasivo


import { useAuth } from '../contexts/AuthContext';
import { CompanyPlan } from '../types';

export interface PlanFeatures {
  plan: CompanyPlan | null;
  planLabel: string;
  maxAgentes: number;
  canUseBranding: boolean;
  canUseMultiEmpresa: boolean;
  canUseSLAAvanzado: boolean;
  canExportPDF: boolean;
  canUseSoportePrioritario: boolean;
  isAtAgentLimit: (current: number) => boolean;
}

const PLAN_LIMITS: Record<CompanyPlan, Omit<PlanFeatures, 'plan' | 'planLabel' | 'isAtAgentLimit'>> = {
  basic: {
    maxAgentes:               3,
    canUseBranding:           false,
    canUseMultiEmpresa:       false,
    canUseSLAAvanzado:        false,
    canExportPDF:             false,
    canUseSoportePrioritario: false,
  },
  professional: {
    maxAgentes:               10,
    canUseBranding:           true,
    canUseMultiEmpresa:       false,
    canUseSLAAvanzado:        true,
    canExportPDF:             true,
    canUseSoportePrioritario: false,
  },
  enterprise: {
    maxAgentes:               Infinity,
    canUseBranding:           true,
    canUseMultiEmpresa:       true,
    canUseSLAAvanzado:        true,
    canExportPDF:             true,
    canUseSoportePrioritario: true,
  },
};

const PLAN_LABELS: Record<CompanyPlan, string> = {
  basic:        'Starter',
  professional: 'Pro',
  enterprise:   'Business',
};

export function usePlan(): PlanFeatures {
  const { profile } = useAuth();
  const plan = (profile?.company as any)?.plan as CompanyPlan | undefined;

  // Superadmin no pertenece a una empresa — acceso total
  if (profile?.role === 'superadmin' || !plan) {
    return {
      plan:                     null,
      planLabel:                'Super Admin',
      maxAgentes:               Infinity,
      canUseBranding:           true,
      canUseMultiEmpresa:       true,
      canUseSLAAvanzado:        true,
      canExportPDF:             true,
      canUseSoportePrioritario: true,
      isAtAgentLimit:           () => false,
    };
  }

  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.basic;

  return {
    plan,
    planLabel: PLAN_LABELS[plan] ?? plan,
    ...limits,
    isAtAgentLimit: (current: number) =>
      limits.maxAgentes !== Infinity && current >= limits.maxAgentes,
  };
}
