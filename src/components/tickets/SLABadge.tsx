import React from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { SLARecord } from '../../types';
import { getSLAOverallStatus, getSLAStatus, formatSLATime, SLAStatus } from '../../lib/sla';

interface SLABadgeProps {
  slaRecord?: SLARecord;
  compact?: boolean;
}

const STATUS_CONFIG: Record<SLAStatus, {
  icon: React.ElementType;
  label: string;
  className: string;
  timeClass: string;
}> = {
  met: {
    icon: CheckCircle,
    label: 'SLA Cumplido',
    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    timeClass: 'text-emerald-600 dark:text-emerald-400',
  },
  breached: {
    icon: XCircle,
    label: 'SLA Incumplido',
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    timeClass: 'text-red-600 dark:text-red-400',
  },
  at_risk: {
    icon: AlertTriangle,
    label: 'En Riesgo',
    className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    timeClass: 'text-amber-600 dark:text-amber-400',
  },
  pending: {
    icon: Clock,
    label: 'Pendiente',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    timeClass: 'text-gray-500 dark:text-gray-400',
  },
};

export default function SLABadge({ slaRecord, compact = false }: SLABadgeProps) {
  const overallStatus = getSLAOverallStatus(slaRecord);
  const config = STATUS_CONFIG[overallStatus];
  const Icon = config.icon;

  if (compact) {
    const resStatus = getSLAStatus(
      slaRecord?.resolution_deadline ?? null,
      slaRecord?.resolution_met ?? null
    );
    const resConfig = STATUS_CONFIG[resStatus];
    const ResIcon = resConfig.icon;

    // Si ya tiene resultado final (met/breached), solo mostrar badge
    const hasFinalResult =
      slaRecord?.resolution_met !== null && slaRecord?.resolution_met !== undefined;

    if (hasFinalResult) {
      return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
          <Icon size={11} />
          {config.label}
        </span>
      );
    }

    // Mostrar badge de estado + tiempo restante de resolución
    const timeText = formatSLATime(slaRecord?.resolution_deadline ?? null);

    return (
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${resConfig.className}`}>
          <ResIcon size={11} />
          {resConfig.label}
        </span>
        {slaRecord?.resolution_deadline && (
          <span className={`flex items-center gap-1 text-[11px] font-medium ${resConfig.timeClass}`}>
            <Clock size={10} />
            {timeText}
          </span>
        )}
      </div>
    );
  }

  // Vista detallada (no compact)
  const firstStatus = getSLAStatus(
    slaRecord?.first_response_deadline ?? null,
    slaRecord?.first_response_met ?? null
  );
  const resStatus = getSLAStatus(
    slaRecord?.resolution_deadline ?? null,
    slaRecord?.resolution_met ?? null
  );
  const firstCfg = STATUS_CONFIG[firstStatus];
  const resCfg = STATUS_CONFIG[resStatus];

  return (
    <div className="space-y-3">
      {/* Primera respuesta */}
      <div className="space-y-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Primera respuesta</span>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${firstCfg.className}`}>
            <firstCfg.icon size={11} />
            {slaRecord?.first_response_met !== null && slaRecord?.first_response_met !== undefined
              ? firstCfg.label
              : formatSLATime(slaRecord?.first_response_deadline ?? null)
            }
          </span>
        </div>
      </div>

      {/* Resolución */}
      <div className="space-y-1">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">Resolución</span>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${resCfg.className}`}>
            <resCfg.icon size={11} />
            {slaRecord?.resolution_met !== null && slaRecord?.resolution_met !== undefined
              ? resCfg.label
              : formatSLATime(slaRecord?.resolution_deadline ?? null)
            }
          </span>
        </div>
      </div>
    </div>
  );
}
