import React, { useState } from 'react';
import {
  Eye, EyeOff, Ticket, Clock, Building2,
  TrendingUp, AlertCircle, CheckCircle2, ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { useBrand } from '../../contexts/BrandContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';


const METRICS = [
  { label: 'Tickets resueltos', value: '1,240', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  { label: 'SLA cumplido',      value: '98%',   icon: TrendingUp,    color: 'text-blue-400',  bg: 'bg-blue-500/10'  },
  { label: 'Tiempo promedio',   value: '4.2m',  icon: Clock,         color: 'text-amber-400', bg: 'bg-amber-500/10' },
  { label: 'Empresas activas',  value: '12',    icon: Building2,     color: 'text-purple-400',bg: 'bg-purple-500/10'},
];

const ACTIVITY = [
  {
    icon: CheckCircle2,
    color: 'text-green-400',
    dot: 'bg-green-400',
    text: 'Ana García resolvió',
    sub: '#1039 — Login caído',
    time: 'hace 2 min',
  },
  {
    icon: AlertCircle,
    color: 'text-red-400',
    dot: 'bg-red-400',
    text: 'Ticket #1042 escalado a',
    sub: 'Prioridad Crítica',
    time: 'hace 8 min',
  },
  {
    icon: Ticket,
    color: 'text-blue-400',
    dot: 'bg-blue-400',
    text: 'Nuevo ticket de ACME Corp',
    sub: '#1043 — Error en facturación',
    time: 'hace 15 min',
  },
];

export default function LoginPage() {
  const { signIn } = useAuth();
  const { navigate } = useRouter();
  const { logoUrl, companyName, primaryColor } = useBrand();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [logoError, setLogoError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Por favor completa todos los campos.'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await signIn(email, password);
    if (err) {
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } else {
      navigate('dashboard');
    }
    setLoading(false);
  }

  const anyLoading = loading;

  return (
    <div className="min-h-screen flex">

      {/* ═══════════════════════════════════════
          LEFT PANEL
      ═══════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex-col relative">

        {/* Ambient blobs — clipped independently, never affects layout */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-700/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-blue-800/6 rounded-full blur-2xl" />
        </div>

        {/* Scrollable content wrapper — never clips */}
        <div className="relative z-10 flex flex-col justify-between min-h-screen p-8 xl:p-10 overflow-y-auto">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-lg flex-shrink-0" style={{ backgroundColor: primaryColor, boxShadow: `0 10px 15px -3px rgba(${primaryColor.slice(1).match(/.{1,2}/g)?.map(x => parseInt(x, 16)).join(', ')}, 0.3)` }}>
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={companyName}
                className="w-6 h-6 object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <AlertCircle size={16} className="text-white" />
            )}
          </div>
          <span className="text-white font-bold text-lg tracking-tight">{companyName}</span>
          <span className="text-[11px] border border-opacity-30 rounded-full px-2 py-0.5" style={{ color: primaryColor, borderColor: primaryColor }}>v1.0</span>
        </div>

        {/* ── Center content ── */}
        <div className="flex-1 flex flex-col justify-center gap-4 py-6 w-full">

          {/* Headline */}
          <div>
            <h1 className="text-2xl xl:text-3xl font-bold text-white leading-tight mb-2">
              Gestiona incidencias<br />
              <span className="text-blue-400">con claridad total.</span>
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              Plataforma de soporte técnico multi-empresa con SLAs, roles y trazabilidad completa.
            </p>
          </div>

          {/* ── A: Metrics grid ── */}
          <div className="grid grid-cols-2 gap-2.5">
            {METRICS.map(({ label, value, icon: Icon, color, bg }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-white/5 border border-white/8 rounded-xl px-4 py-3 backdrop-blur-sm"
              >
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={15} className={color} />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-lg leading-none">{value}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-tight">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── B: Mini ticket card ── */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">#1042</span>
                <span className="text-[10px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 rounded-md px-1.5 py-0.5">
                  Crítico
                </span>
                <span className="text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-md px-1.5 py-0.5">
                  En progreso
                </span>
              </div>
              <ArrowUpRight size={13} className="text-slate-600 flex-shrink-0" />
            </div>
            <p className="text-white text-sm font-medium mb-3 leading-snug">
              Error al procesar pagos en módulo de facturación
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold">A</div>
                <span className="text-slate-500 text-[11px]">Ana García</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Building2 size={11} className="text-slate-600" />
                <span className="text-slate-500 text-[11px]">ACME Corp</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-slate-600" />
                <span className="text-slate-500 text-[11px]">1h 23m</span>
              </div>
            </div>
          </div>

          {/* ── C: Activity feed ── */}
          <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Actividad reciente
            </p>
            <ul className="space-y-3">
              {ACTIVITY.map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <span className={`block w-1.5 h-1.5 rounded-full mt-1.5 ${item.dot}`} />
                    {i < ACTIVITY.length - 1 && (
                      <span className="absolute left-[2.5px] top-3 w-px h-4 bg-white/8" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-300 text-[12px] leading-snug">
                      {item.text}{' '}
                      <span className="text-white font-medium">{item.sub}</span>
                    </p>
                    <p className="text-slate-600 text-[10px] mt-0.5">{item.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom copyright ── */}
        <div>
          <p className="text-slate-700 text-xs">
            © {new Date().getFullYear()} Atensia — Sistema de Gestión de Incidencias
          </p>
        </div>

        </div>{/* end scrollable wrapper */}
      </div>{/* end left panel */}

      {/* ═══════════════════════════════════════
          RIGHT PANEL
      ═══════════════════════════════════════ */}
      <div className="w-full lg:w-1/2 xl:w-2/5 flex flex-col justify-center items-center bg-white dark:bg-gray-950 p-6 sm:p-10 overflow-y-auto">

        {/* Mobile header */}
        <div className="flex lg:hidden items-center gap-2 mb-8 self-start">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <AlertCircle size={14} className="text-white" />
          </div>
          <span className="text-gray-900 dark:text-white font-bold text-lg">Atiende</span>
        </div>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Iniciar Sesión</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Ingresa tus credenciales para acceder al sistema.
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
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={anyLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              {loading && <LoadingSpinner size="sm" />}
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="flex items-center justify-between mt-4">
            <button
              type="button"
              onClick={() => navigate('signup')}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors"
            >
              ¿No tienes cuenta? Regístrate
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); navigate('forgot-password'); }}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline transition-colors"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>


        </div>
      </div>
    </div>
  );
}
