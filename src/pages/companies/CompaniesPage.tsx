import React, { useEffect, useState } from 'react';
import { Plus, Building2, Pencil, Search, Wrench, Download, FileText, SlidersHorizontal, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Company, CompanyPlan, CompanyStatus } from '../../types';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { exportCompaniesCSV, exportCompaniesPDF } from '../../lib/export';

const PLANS: { value: CompanyPlan; label: string }[] = [
  { value: 'basic', label: 'Básico' },
  { value: 'professional', label: 'Profesional' },
  { value: 'enterprise', label: 'Empresarial' },
];

const PLAN_BADGES: Record<CompanyPlan, 'secondary' | 'info' | 'warning'> = {
  basic: 'secondary', professional: 'info', enterprise: 'warning',
};

const STATUS_BADGES: Record<CompanyStatus, 'success' | 'secondary' | 'danger'> = {
  active: 'success', suspended: 'secondary', cancelled: 'danger',
};

const STATUS_LABELS: Record<CompanyStatus, string> = {
  active: 'Activa', suspended: 'Suspendida', cancelled: 'Cancelada',
};

interface CompanyForm {
  name: string;
  plan: CompanyPlan;
  status: CompanyStatus;
  primary_color: string;
  logo_url: string;
  admin_name: string;
  admin_email: string;
  admin_password: string; // Temporary only, never stored in DB
}

interface CompanyWithAdmin extends Company {
  admin_name?: string;
  admin_email?: string;
  admin_id?: string;
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<CompanyWithAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<CompanyPlan | ''>('');
  const [filterStatus, setFilterStatus] = useState<CompanyStatus | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<CompanyForm>({
    name: '', plan: 'basic', status: 'active', primary_color: '#2563eb', logo_url: '', admin_name: '', admin_email: '', admin_password: ''
  });

  useEffect(() => { loadCompanies(); }, []);

  async function loadCompanies() {
    const { data: companiesData } = await supabase.from('companies').select('*').order('created_at', { ascending: false });

    if (!companiesData) {
      setCompanies([]);
      setLoading(false);
      return;
    }

    // Fetch admin profile for each company
    const companiesWithAdmin = await Promise.all(
      companiesData.map(async (company) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('company_id', company.id)
          .eq('role', 'admin')
          .single();

        return {
          ...company,
          admin_id: profile?.id,
          admin_name: profile?.full_name || '',
          admin_email: profile?.email || ''
        };
      })
    );

    setCompanies(companiesWithAdmin);
    setLoading(false);
  }

  function openCreate() {
    setEditCompany(null);
    setForm({ name: '', plan: 'basic', status: 'active', primary_color: '#2563eb', logo_url: '', admin_name: '', admin_email: '', admin_password: '' });
    setError('');
    setModalOpen(true);
  }

  function openEdit(c: CompanyWithAdmin) {
    setEditCompany(c);
    setForm({
      name: c.name,
      plan: c.plan,
      status: c.status,
      primary_color: c.primary_color,
      logo_url: c.logo_url,
      admin_name: c.admin_name || '',
      admin_email: c.admin_email || '',
      admin_password: ''
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }

    // Validación para nuevos administradores
    if (!editCompany && (!form.admin_email || !form.admin_password || !form.admin_name)) {
      setError('Todos los datos del administrador son obligatorios.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const companyData = {
        name: form.name,
        plan: form.plan,
        status: form.status,
        primary_color: form.primary_color,
        logo_url: form.logo_url,
        admin_name: form.admin_name,
        admin_email: form.admin_email
      };

      if (editCompany) {
        // Actualizar empresa (incluyendo datos del admin)
        const updateData = {
          ...companyData,
          admin_name: form.admin_name,
          admin_email: form.admin_email
        };

        const { error: err } = await supabase
          .from('companies')
          .update(updateData)
          .eq('id', editCompany.id);
        if (err) throw err;

        // Actualizar perfil del admin
        if (editCompany.admin_id) {
          const profileData: any = {
            full_name: form.admin_name,
            email: form.admin_email
          };

          const { error: profErr } = await supabase
            .from('profiles')
            .update(profileData)
            .eq('id', editCompany.admin_id);
          if (profErr) throw profErr;

          // Actualizar contraseña si se proporcionó
          if (form.admin_password.trim()) {
            const { error: passErr } = await supabase.rpc('update_user_password', {
              p_user_id: editCompany.admin_id,
              p_new_password: form.admin_password.trim()
            });
            if (passErr) throw passErr;
          }
        }
      } else {
        // 1. Insertar Empresa
        const { data: company, error: compErr } = await supabase
          .from('companies')
          .insert(companyData)
          .select()
          .single();

        if (compErr) throw compErr;

        // 2. Crear Usuario en Auth
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: form.admin_email.trim(),
          password: form.admin_password.trim(),
          options: {
            data: {
              full_name: form.admin_name,
            },
            emailRedirectTo: undefined,
          }
        });

        if (authErr) throw authErr;

        // 3. Crear Perfil vinculado
        if (authData.user) {
          const { error: profErr } = await supabase.from('profiles').insert({
            id: authData.user.id,
            email: form.admin_email,
            full_name: form.admin_name,
            role: 'admin',
            company_id: company.id,
            avatar_emoji: '👤',
            avatar_color: form.primary_color
          });
          if (profErr) throw profErr;
        }

        // 4. Políticas por defecto
        await supabase.rpc('create_default_sla_policies', { p_company_id: company.id });
      }

      await loadCompanies();
      setModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }
  async function toggleMaintenance(c: Company) {
    await supabase.from('companies').update({ maintenance_mode: !c.maintenance_mode }).eq('id', c.id);
    setCompanies((prev) => prev.map((co) => co.id === c.id ? { ...co, maintenance_mode: !c.maintenance_mode } : co));
  }

  async function deleteCompany(c: Company) {
    if (!window.confirm(`¿Eliminar la empresa "${c.name}"? La suscripción se mantendrá como registro. Esta acción no se puede deshacer.`)) return;

    setSaving(true);
    setError('');
    try {
      // Llamar a la función RPC que elimina la empresa
      const { error: err } = await supabase.rpc('delete_company', { p_company_id: c.id });

      if (err) throw new Error(`Error al eliminar empresa: ${err.message}`);

      // Recargar lista
      await loadCompanies();
    } catch (err: any) {
      const errorMsg = err.message || 'Error al eliminar la empresa.';
      setError(errorMsg);
      console.error('Error en deleteCompany:', err);
    } finally {
      setSaving(false);
    }
  }

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchPlan = !filterPlan || c.plan === filterPlan;
    const matchStatus = !filterStatus || c.status === filterStatus;
    const created = c.created_at.slice(0, 10);
    const matchFrom = !filterDateFrom || created >= filterDateFrom;
    const matchTo = !filterDateTo || created <= filterDateTo;
    return matchSearch && matchPlan && matchStatus && matchFrom && matchTo;
  });

  const activeFilters = [filterPlan, filterStatus, filterDateFrom, filterDateTo].filter(Boolean).length;

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Empresas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">{filtered.length} empresa(s)</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportCompaniesCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={15} /><span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={() => exportCompaniesPDF(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <FileText size={15} /><span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || activeFilters > 0 ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <SlidersHorizontal size={15} />
            {activeFilters > 0 && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs">{activeFilters}</span>}
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 bg-blue-600">
            <Plus size={16} /><span className="hidden sm:inline">Nueva Empresa</span>
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar empresas..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {showFilters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value as CompanyPlan | '')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los planes</option>
              {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as CompanyStatus | '')}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los estados</option>
              <option value="active">Activa</option>
              <option value="suspended">Suspendida</option>
              <option value="cancelled">Cancelada</option>
            </select>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Desde</label>
              <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Hasta</label>
              <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
              <div className="flex items-start gap-3 mb-4">
                {c.logo_url ? (
                  <img src={c.logo_url} alt={c.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: c.primary_color + '22' }}>
                    <Building2 size={20} style={{ color: c.primary_color }} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{c.name}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant={PLAN_BADGES[c.plan]}>{PLANS.find((p) => p.value === c.plan)?.label}</Badge>
                    <Badge variant={STATUS_BADGES[c.status]}>{STATUS_LABELS[c.status]}</Badge>
                    {c.maintenance_mode && <Badge variant="warning">Mant.</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: c.primary_color }} />
                <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{c.primary_color}</span>
                <span className="text-xs text-gray-300 dark:text-gray-600 ml-auto">
                  {new Date(c.created_at).toLocaleDateString('es-ES')}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => openEdit(c)} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50">
                  <Pencil size={13} />Editar
                </button>
                <button onClick={() => toggleMaintenance(c)} disabled={saving}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 ${c.maintenance_mode ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                  <Wrench size={13} />
                  {c.maintenance_mode ? 'Desactivar' : 'Modo mant.'}
                </button>
                <button onClick={() => deleteCompany(c)} disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 ml-auto">
                  <Trash2 size={13} />Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editCompany ? 'Editar Empresa' : 'Nueva Empresa'} size="md">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">URL del Logo</label>
            <input type="url" value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
              placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color Principal</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.primary_color} onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                className="h-9 w-16 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer" />
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{form.primary_color}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Plan</label>
              <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value as CompanyPlan }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {PLANS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estado</label>
              <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CompanyStatus }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="active">Activa</option>
                <option value="suspended">Suspendida</option>
                <option value="cancelled">Cancelada</option>
              </select>
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Usuario Administrador
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre completo"
                value={form.admin_name}
                onChange={(e) => setForm((f) => ({ ...f, admin_name: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Correo electrónico"
                value={form.admin_email}
                onChange={(e) => setForm((f) => ({ ...f, admin_email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder={editCompany ? "Dejar en blanco para mantener actual" : "Contraseña"}
                value={form.admin_password}
                onChange={(e) => setForm((f) => ({ ...f, admin_password: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50">
              {saving ? 'Guardando...' : editCompany ? 'Actualizar' : 'Crear Empresa'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
