import React, { useEffect, useState } from 'react';
import { Plus, Search, UserCheck, UserX, Pencil, Users, Download, FileText, SlidersHorizontal, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { Profile, UserRole, Company } from '../../types';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import UpgradePrompt from '../../components/ui/UpgradePrompt';
import { exportUsersCSV, exportUsersPDF } from '../../lib/export';

const ROLES: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'agent', label: 'Agente' },
  { value: 'developer', label: 'Desarrollador' },
];

const ROLE_BADGES: Record<UserRole, 'info' | 'warning' | 'secondary' | 'danger'> = {
  superadmin: 'danger', admin: 'info', agent: 'warning', developer: 'secondary',
};

const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Super Admin', admin: 'Administrador', agent: 'Agente', developer: 'Desarrollador',
};

const EMOJIS = ['👤','👩‍💻','👨‍💻','🧑‍💼','👩‍💼','🧑‍🔧','👩‍🔧','👨‍🔧','🦸','🧑‍🎓'];

interface UserFormData {
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
  avatar_emoji: string;
  avatar_color: string;
  company_id: string;
}

export default function UsersPage() {
  const { profile } = useAuth();
  const { maxAgentes, canExportPDF, isAtAgentLimit, planLabel } = usePlan();
  const [users, setUsers] = useState<Profile[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | ''>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const defaultCompanyId = profile?.role === 'superadmin' ? '' : (profile?.company_id || '');
  const [form, setForm] = useState<UserFormData>({
    email: '', full_name: '', role: 'agent', password: '',
    avatar_emoji: '👤', avatar_color: '#2563eb', company_id: defaultCompanyId,
  });

  useEffect(() => {
    loadUsers();
    if (profile?.role === 'superadmin') {
      loadCompanies();
    }
  }, [profile]);

  async function loadCompanies() {
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    setCompanies((data ?? []) as Company[]);
  }

  async function loadUsers() {
    if (!profile) return;
    let query = supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profile.role !== 'superadmin' && profile.company_id) {
      query = query.eq('company_id', profile.company_id);
    }

    const { data } = await query;
    setUsers((data ?? []) as Profile[]);
    setLoading(false);
  }

  function openCreate() {
    setEditUser(null);
    const defaultId = profile?.role === 'superadmin' ? (companies[0]?.id || '') : (profile?.company_id || '');
    setForm({ email: '', full_name: '', role: 'agent', password: '', avatar_emoji: '👤', avatar_color: '#2563eb', company_id: defaultId });
    setError('');
    setModalOpen(true);
  }

  function openEdit(u: Profile) {
    setEditUser(u);
    setForm({ email: u.email, full_name: u.full_name, role: u.role, password: '', avatar_emoji: u.avatar_emoji, avatar_color: u.avatar_color });
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.email || !form.full_name) { setError('Email y nombre son obligatorios.'); return; }
    if (!form.company_id) { setError('Debe seleccionar una empresa.'); return; }
    setSaving(true);
    setError('');

    if (editUser) {
      const { error: err } = await supabase.from('profiles').update({
        full_name: form.full_name, role: form.role,
        avatar_emoji: form.avatar_emoji, avatar_color: form.avatar_color,
      }).eq('id', editUser.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      if (!form.password || form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); setSaving(false); return; }
      const { data: { user }, error: signUpErr } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { full_name: form.full_name } },
      });
      if (signUpErr || !user) { setError(signUpErr?.message ?? 'Error al crear el usuario.'); setSaving(false); return; }
      await supabase.from('profiles').upsert({
        id: user.id, email: form.email, full_name: form.full_name, role: form.role,
        company_id: form.company_id, avatar_emoji: form.avatar_emoji, avatar_color: form.avatar_color,
      });
    }

    await loadUsers();
    setModalOpen(false);
    setSaving(false);
  }

  async function toggleActive(u: Profile) {
    await supabase.from('profiles').update({ is_active: !u.is_active }).eq('id', u.id);
    setUsers((prev) => prev.map((p) => p.id === u.id ? { ...p, is_active: !u.is_active } : p));
  }

  const filtered = users.filter((u) => {
    const matchSearch = !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = filterStatus === 'all' ? true : filterStatus === 'active' ? u.is_active : !u.is_active;
    const created = u.created_at.slice(0, 10);
    const matchFrom = !filterDateFrom || created >= filterDateFrom;
    const matchTo = !filterDateTo || created <= filterDateTo;
    return matchSearch && matchRole && matchStatus && matchFrom && matchTo;
  });

  const activeFilters = [filterRole, filterStatus !== 'all' ? filterStatus : '', filterDateFrom, filterDateTo].filter(Boolean).length;

  const atLimit = isAtAgentLimit(users.length);
  const nearLimit = maxAgentes !== Infinity && users.length >= maxAgentes - 1 && !atLimit;

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Advertencia de límite de agentes */}
      {atLimit && (
        <UpgradePrompt
          feature={`Límite de agentes alcanzado (${users.length}/${maxAgentes})`}
          description={`Tu plan ${planLabel} permite hasta ${maxAgentes} agentes. Mejora tu plan para agregar más usuarios.`}
          requiredPlan="professional"
          variant="banner"
        />
      )}
      {nearLimit && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <Users size={15} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Usas <span className="font-bold">{users.length} de {maxAgentes}</span> agentes de tu plan {planLabel}. Al agregar uno más llegarás al límite.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
            {filtered.length} usuario(s)
            {maxAgentes !== Infinity && (
              <span className="ml-2 text-xs text-gray-400">· {users.length}/{maxAgentes} del plan</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportUsersCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={15} /><span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={() => canExportPDF ? exportUsersPDF(filtered) : undefined}
            title={!canExportPDF ? 'Exportar PDF requiere plan Pro o superior' : undefined}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              canExportPDF
                ? 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                : 'border-gray-200 dark:border-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed'
            }`}>
            {canExportPDF ? <FileText size={15} /> : <Lock size={15} />}
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || activeFilters > 0 ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <SlidersHorizontal size={15} />
            {activeFilters > 0 && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs">{activeFilters}</span>}
          </button>
          <button
            onClick={() => isAtAgentLimit(users.length) ? undefined : openCreate()}
            disabled={isAtAgentLimit(users.length)}
            title={isAtAgentLimit(users.length) ? `Tu plan ${planLabel} permite hasta ${maxAgentes} agentes` : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all ${
              isAtAgentLimit(users.length)
                ? 'opacity-50 cursor-not-allowed bg-gray-400'
                : 'hover:opacity-90'
            }`}
            style={isAtAgentLimit(users.length) ? {} : { backgroundColor: 'var(--brand-color, #2563eb)' }}>
            {isAtAgentLimit(users.length) ? <Lock size={16} /> : <Plus size={16} />}
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar usuarios..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-800" />
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as UserRole | '')}
              className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-800">
              <option value="">Todos los roles</option>
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-800">
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-800" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-800" />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-16 text-center">
              <Users size={36} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800">
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3">Usuario</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3 hidden sm:table-cell">Rol</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3 hidden md:table-cell">Estado</th>
                    <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 px-5 py-3 hidden lg:table-cell">Registrado</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar profile={u} size="md" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{u.full_name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        <Badge variant={ROLE_BADGES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <Badge variant={u.is_active ? 'success' : 'secondary'}>{u.is_active ? 'Activo' : 'Inactivo'}</Badge>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(u.created_at).toLocaleDateString('es-ES')}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => toggleActive(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            {u.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editUser ? 'Editar Usuario' : 'Nuevo Usuario'} size="md">
        <div className="space-y-4">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Avatar</label>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map((emoji) => (
                <button key={emoji} type="button" onClick={() => setForm((f) => ({ ...f, avatar_emoji: emoji }))}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all ${form.avatar_emoji === emoji ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color del avatar</label>
            <input type="color" value={form.avatar_color} onChange={(e) => setForm((f) => ({ ...f, avatar_color: e.target.value }))}
              className="h-9 w-20 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer" />
          </div>
          {['full_name', 'email'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                {field === 'full_name' ? 'Nombre completo' : 'Correo electrónico'} *
              </label>
              <input type={field === 'email' ? 'email' : 'text'} value={form[field as keyof UserFormData]}
                onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
                disabled={!!editUser && field === 'email'}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-700 disabled:opacity-50" />
            </div>
          ))}
          {!editUser && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Contraseña *</label>
              <input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-700" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Rol</label>
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-700">
              {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
          {profile?.role === 'superadmin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Empresa *</label>
              <select value={form.company_id} onChange={(e) => setForm((f) => ({ ...f, company_id: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none border-none focus:bg-gray-50 dark:focus:bg-gray-700">
                <option value="">Seleccionar empresa...</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button type="button" onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--brand-color, #2563eb)' }}>
              {saving ? 'Guardando...' : editUser ? 'Actualizar' : 'Crear Usuario'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
