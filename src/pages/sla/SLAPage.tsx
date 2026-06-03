import React, { useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { SLAPolicy, TicketPriority } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const PRIORITIES: { value: TicketPriority; label: string; color: string; bg: string }[] = [
  { value: 'critical', label: 'Crítica', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800' },
  { value: 'high', label: 'Alta', color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800' },
  { value: 'medium', label: 'Media', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' },
  { value: 'low', label: 'Baja', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' },
];

const DEFAULTS: Record<TicketPriority, { first_response_hours: number; resolution_hours: number; description: string }> = {
  critical: { first_response_hours: 1, resolution_hours: 4, description: 'Incidencias críticas que afectan la operación completa del negocio. Requieren atención inmediata.' },
  high: { first_response_hours: 4, resolution_hours: 8, description: 'Incidencias de alta prioridad con impacto significativo en funcionalidades clave del sistema.' },
  medium: { first_response_hours: 8, resolution_hours: 24, description: 'Problemas que afectan parcialmente la productividad pero permiten continuar trabajando.' },
  low: { first_response_hours: 24, resolution_hours: 72, description: 'Solicitudes menores, mejoras o incidencias con bajo impacto en la operación.' },
};

type FormEntry = { first_response_hours: string; resolution_hours: string; description: string };

export default function SLAPage() {
  const { profile } = useAuth();
  const [policies, setPolicies] = useState<Partial<Record<TicketPriority, SLAPolicy>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<Record<TicketPriority, FormEntry>>({
    critical: { first_response_hours: '1', resolution_hours: '4', description: DEFAULTS.critical.description },
    high: { first_response_hours: '4', resolution_hours: '8', description: DEFAULTS.high.description },
    medium: { first_response_hours: '8', resolution_hours: '24', description: DEFAULTS.medium.description },
    low: { first_response_hours: '24', resolution_hours: '72', description: DEFAULTS.low.description },
  });

  useEffect(() => {
    if (profile?.company_id) loadPolicies();
  }, [profile?.company_id]);

  async function loadPolicies() {
    const { data } = await supabase
      .from('sla_policies')
      .select('*')
      .eq('company_id', profile!.company_id!);

    const map: Partial<Record<TicketPriority, SLAPolicy>> = {};
    const newForm = { ...form };
    (data ?? []).forEach((p: SLAPolicy) => {
      map[p.priority] = p;
      newForm[p.priority] = {
        first_response_hours: String(p.first_response_hours),
        resolution_hours: String(p.resolution_hours),
        description: (p as any).description ?? DEFAULTS[p.priority].description,
      };
    });
    setPolicies(map);
    setForm(newForm);
    setLoading(false);
  }

  async function handleSave() {
    if (!profile?.company_id) return;
    setSaving(true);
    setSaved(false);

    for (const priority of PRIORITIES.map((p) => p.value)) {
      const first = parseFloat(form[priority].first_response_hours) || DEFAULTS[priority].first_response_hours;
      const res = parseFloat(form[priority].resolution_hours) || DEFAULTS[priority].resolution_hours;
      const desc = form[priority].description.trim();

      if (policies[priority]) {
        await supabase.from('sla_policies').update({
          first_response_hours: first,
          resolution_hours: res,
          description: desc,
        }).eq('id', policies[priority]!.id);
      } else {
        await supabase.from('sla_policies').insert({
          company_id: profile.company_id,
          priority,
          first_response_hours: first,
          resolution_hours: res,
          description: desc,
        });
      }
    }

    await loadPolicies();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Políticas de SLA</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Define los tiempos máximos de primera respuesta y resolución, y una descripción para cada nivel de prioridad.
        </p>
      </div>

      <div className="space-y-4">
        {PRIORITIES.map(({ value, label, color, bg }) => (
          <div key={value} className={`rounded-2xl border p-5 ${bg}`}>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className={color} />
              <span className={`text-base font-semibold ${color}`}>{label}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={form[value].description}
                  onChange={(e) => setForm((f) => ({ ...f, [value]: { ...f[value], description: e.target.value } }))}
                  rows={2}
                  placeholder="Describe cuándo aplicar esta prioridad..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Primera respuesta (horas)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={form[value].first_response_hours}
                    onChange={(e) => setForm((f) => ({ ...f, [value]: { ...f[value], first_response_hours: e.target.value } }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
                    Resolución (horas)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={form[value].resolution_hours}
                    onChange={(e) => setForm((f) => ({ ...f, [value]: { ...f[value], resolution_hours: e.target.value } }))}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Los plazos SLA se calculan automáticamente al crear un ticket.
          Se muestra un badge de color en la lista y detalle de cada ticket indicando el estado del SLA.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-color, #2563eb)' }}
        >
          <Save size={16} />
          {saving ? 'Guardando...' : 'Guardar Políticas'}
        </button>
        {saved && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
            ¡Políticas guardadas!
          </span>
        )}
      </div>
    </div>
  );
}
