import React, { useEffect, useState } from 'react';
import {
  Ticket, Users, Building2, TrendingUp, CheckCircle, Clock,
  XCircle, Activity, ArrowUpRight,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { Ticket as TicketType } from '../../types';
import TicketCard from '../../components/tickets/TicketCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

interface StatCard {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

const STATUS_COLORS: Record<string, string> = {
  open:        '#3b82f6',
  in_progress: '#f59e0b',
  resolved:    '#10b981',
  closed:      '#6b7280',
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#eab308',
  low:      '#22c55e',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado',
};

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja',
};

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function StatBox({ stat }: { stat: StatCard }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}>
          <stat.icon size={20} />
        </div>
        {stat.trend && (
          <span className="flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            <ArrowUpRight size={12} />{stat.trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{stat.label}</p>
    </div>
  );
}

const TOOLTIP_STYLE = {
  backgroundColor: 'var(--tooltip-bg, #fff)',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '12px',
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketType[]>([]);

  // Chart data
  const [statusData, setStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [priorityData, setPriorityData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [weekData, setWeekData] = useState<{ day: string; tickets: number }[]>([]);

  useEffect(() => { if (profile) loadDashboard(); }, [profile]);

  // Real-time: reload dashboard when tickets change
  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        loadDashboard();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [profile]);

  async function loadDashboard() {
    setLoading(true);
    if (!profile) return;

    if (profile.role === 'superadmin') {
      await loadSuperadminDashboard();
    } else {
      await loadCompanyDashboard();
    }
    setLoading(false);
  }

  async function loadSuperadminDashboard() {
    const [{ count: companies }, { count: users }, { count: tickets }, { count: activeCompanies }] =
      await Promise.all([
        supabase.from('companies').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('tickets').select('*', { count: 'exact', head: true }),
        supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      ]);

    setStats([
      { label: 'Empresas totales',  value: companies ?? 0,       icon: Building2,   color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
      { label: 'Empresas activas',  value: activeCompanies ?? 0, icon: TrendingUp,   color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
      { label: 'Usuarios totales',  value: users ?? 0,           icon: Users,        color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' },
      { label: 'Tickets globales',  value: tickets ?? 0,         icon: Ticket,       color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
    ]);

    // Status breakdown (global)
    const { data: byStatus } = await supabase.from('tickets').select('status');
    buildStatusChart(byStatus ?? []);

    // Priority breakdown
    const { data: byPriority } = await supabase.from('tickets').select('priority');
    buildPriorityChart(byPriority ?? []);

    // Last 7 days
    await buildWeekChart(null);

    const { data: recent } = await supabase
      .from('tickets')
      .select('*, creator:profiles!created_by(*), assignee:profiles!assigned_to(*), sla_record:sla_records(*)')
      .order('created_at', { ascending: false })
      .limit(6);
    setRecentTickets((recent ?? []) as TicketType[]);
  }

  async function loadCompanyDashboard() {
    const cid = profile!.company_id!;
    const [openQ, inProgressQ, resolvedQ, closedQ] = await Promise.all([
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'open'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'in_progress'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'resolved'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('company_id', cid).eq('status', 'closed'),
    ]);

    const statList: StatCard[] = [
      { label: 'Abiertos',    value: openQ.count ?? 0,       icon: Ticket,       color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
      { label: 'En Progreso', value: inProgressQ.count ?? 0, icon: Clock,        color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400' },
      { label: 'Resueltos',   value: resolvedQ.count ?? 0,   icon: CheckCircle,  color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' },
      { label: 'Cerrados',    value: closedQ.count ?? 0,     icon: XCircle,      color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
    ];

    if (profile!.role === 'admin') {
      const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('company_id', cid);
      statList.push({ label: 'Usuarios', value: usersCount ?? 0, icon: Users, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400' });
    }

    if (profile!.role === 'developer') {
      const today = new Date().toISOString().slice(0, 10);
      const { data: logs } = await supabase.from('activity_logs').select('hours_spent').eq('user_id', profile!.id).eq('date', today);
      const totalHours = (logs ?? []).reduce((acc, l) => acc + Number(l.hours_spent), 0);
      statList.push({ label: 'Horas hoy', value: `${totalHours}h`, icon: Activity, color: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400' });
    }

    setStats(statList);

    // Charts
    const { data: byStatus } = await supabase.from('tickets').select('status').eq('company_id', cid);
    buildStatusChart(byStatus ?? []);
    const { data: byPriority } = await supabase.from('tickets').select('priority').eq('company_id', cid);
    buildPriorityChart(byPriority ?? []);
    await buildWeekChart(cid);

    let query = supabase
      .from('tickets')
      .select('*, creator:profiles!created_by(*), assignee:profiles!assigned_to(*), sla_record:sla_records(*)')
      .eq('company_id', cid)
      .order('created_at', { ascending: false });
    if (profile!.role !== 'admin') {
      query = query.or(`created_by.eq.${profile!.id},assigned_to.eq.${profile!.id}`);
    }
    const { data: recent } = await query.limit(6);
    setRecentTickets((recent ?? []) as TicketType[]);
  }

  function buildStatusChart(rows: { status: string }[]) {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    setStatusData(
      Object.entries(STATUS_LABELS).map(([key, name]) => ({
        name, value: counts[key] ?? 0, color: STATUS_COLORS[key],
      })).filter((d) => d.value > 0)
    );
  }

  function buildPriorityChart(rows: { priority: string }[]) {
    const counts: Record<string, number> = {};
    rows.forEach((r) => { counts[r.priority] = (counts[r.priority] ?? 0) + 1; });
    setPriorityData(
      Object.entries(PRIORITY_LABELS).map(([key, name]) => ({
        name, value: counts[key] ?? 0, color: PRIORITY_COLORS[key],
      })).filter((d) => d.value > 0)
    );
  }

  async function buildWeekChart(companyId: string | null) {
    const days: { day: string; tickets: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      let q = supabase.from('tickets').select('*', { count: 'exact', head: true })
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);
      if (companyId) q = q.eq('company_id', companyId);
      const { count } = await q;
      days.push({ day: DAY_LABELS[d.getDay()], tickets: count ?? 0 });
    }
    setWeekData(days);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  const hasChartData = statusData.length > 0 || priorityData.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Bienvenido, {profile?.full_name || 'Usuario'} 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      <div
        className="grid grid-cols-2 gap-4"
        style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
      >
        {stats.map((s, i) => <StatBox key={i} stat={s} />)}
      </div>

      {/* Charts — only show if there's data */}
      {hasChartData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Tickets esta semana — line chart */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tickets creados — últimos 7 días</h3>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weekData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line
                  type="monotone" dataKey="tickets" name="Tickets"
                  stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Por estado — pie chart */}
          {statusData.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Por estado</h3>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                    dataKey="value" paddingAngle={3}>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, n) => [v, n]} />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1">
                {statusData.map((d) => (
                  <li key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                    </span>
                    <span className="font-semibold text-gray-800 dark:text-gray-200">{d.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Por prioridad — bar chart */}
          {priorityData.length > 0 && (
            <div className="lg:col-span-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tickets por prioridad</h3>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={priorityData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" className="dark:stroke-gray-800" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]}>
                    {priorityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Recent tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {profile?.role === 'superadmin' ? 'Tickets Recientes (Global)' : 'Tickets Recientes'}
          </h2>
          {profile?.role !== 'superadmin' && (
            <button
              onClick={() => navigate('tickets')}
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--brand-color, #2563eb)' }}
            >
              Ver todos
            </button>
          )}
        </div>
        {recentTickets.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-12 text-center">
            <Ticket size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">No hay tickets todavía</p>
            {profile?.role !== 'superadmin' && (
              <button
                onClick={() => navigate('new-ticket')}
                className="mt-3 text-sm font-medium hover:underline"
                style={{ color: 'var(--brand-color, #2563eb)' }}
              >
                Crear el primer ticket
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recentTickets.map((t) => <TicketCard key={t.id} ticket={t} onRefresh={loadDashboard} />)}
          </div>
        )}
      </div>
    </div>
  );
}
