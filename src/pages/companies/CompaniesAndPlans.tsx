import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Company, Subscription, ClientCompany } from '../../types';
import { PLANS } from '../../lib/paymentMethods';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ChevronDown, ChevronUp, Edit2, Check, Plus, Palette, Eye, EyeOff, Download, FileText, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { exportCompaniesAndPlansCSV, exportCompaniesAndPlansPDF } from '../../lib/export';

interface CompanyWithSub extends Company {
  subscription?: Subscription;
  clients?: ClientCompany[];
}

export default function CompaniesAndPlans() {
  const [companies, setCompanies] = useState<CompanyWithSub[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithSub | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditCompanyModal, setShowEditCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithSub | null>(null);
  const [companyForm, setCompanyForm] = useState({
    name: '',
    primary_color: '#2563eb',
    logo_url: '',
    admin_name: '',
    admin_email: '',
    admin_password: ''
  });
  const [editingCompanyLoading, setEditingCompanyLoading] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; company?: CompanyWithSub; deleting?: boolean }>({ open: false });
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    loadCompanies();
  }, []);

  // Clean form when opening modal for new company
  useEffect(() => {
    if (showEditCompanyModal && !editingCompany) {
      setCompanyForm({ name: '', primary_color: '#2563eb', logo_url: '', admin_name: '', admin_email: '', admin_password: '' });
      setShowPassword(false);
    }
  }, [showEditCompanyModal, editingCompany]);

  async function loadCompanies() {
    try {
      // Get all companies that are NOT clients of other companies
      const { data: allCompanies } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (allCompanies) {
        // Get all client company IDs to filter them out from the admin list
        const { data: allClientRelations } = await supabase
          .from('client_companies')
          .select('client_company_id');

        const clientCompanyIds = new Set(allClientRelations?.map(c => c.client_company_id) || []);

        // Filter to show only admin companies (not clients of other companies)
        const adminCompanies = allCompanies.filter(c => !clientCompanyIds.has(c.id));

        const companiesWithSubs = await Promise.all(
          adminCompanies.map(async (company) => {
            const [{ data: sub }, { data: clients }] = await Promise.all([
              supabase
                .from('subscriptions')
                .select('*')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single(),
              supabase
                .from('client_companies')
                .select('*, client_company:companies!client_company_id(*)')
                .eq('admin_company_id', company.id)
                .order('created_at', { ascending: false })
            ]);
            return {
              ...company,
              subscription: sub || undefined,
              clients: clients || [],
            };
          })
        );
        setCompanies(companiesWithSubs);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCompany() {
    if (!deleteConfirm.company) return;

    setDeleteConfirm((prev) => ({ ...prev, deleting: true }));
    setDeleteError('');

    try {
      const { data, error } = await supabase.rpc('delete_company_cascade', {
        p_company_id: deleteConfirm.company.id
      });

      if (error) throw error;
      if (data && !data[0]?.success) {
        throw new Error(data[0]?.error_msg || 'Error al eliminar la empresa');
      }

      await loadCompanies();
      setDeleteConfirm({ open: false });
    } catch (error: any) {
      setDeleteError(error.message || 'Error al eliminar la empresa');
    } finally {
      setDeleteConfirm((prev) => ({ ...prev, deleting: false }));
    }
  }

  async function handleUpdatePlan() {
    if (!selectedCompany || !selectedPlan) return;

    setUpdating(true);
    try {
      const plan = PLANS.find(p => p.id === selectedPlan);
      if (!plan) throw new Error('Plan no encontrado');

      await supabase.from('subscriptions').upsert({
        company_id: selectedCompany.id,
        plan: selectedPlan as any,
        status: 'active',
        start_date: new Date().toISOString(),
        amount: plan.price,
        currency: 'USD',
      });

      if (selectedCompany.maintenance_mode) {
        await supabase
          .from('companies')
          .update({ maintenance_mode: false })
          .eq('id', selectedCompany.id);
      }

      await loadCompanies();
      setShowModal(false);
      setSelectedCompany(null);
      setSelectedPlan(null);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setUpdating(false);
    }
  }

  const openEditPlanModal = (company: CompanyWithSub) => {
    setSelectedCompany(company);
    setSelectedPlan(company.subscription?.plan || 'basic');
    setShowModal(true);
  };

  const openEditCompanyModal = async (company: CompanyWithSub) => {
    setEditingCompany(company);
    setEditingCompanyLoading(true);

    try {
      // Obtener datos del admin
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('company_id', company.id)
        .eq('role', 'admin')
        .single();

      setAdminUserId(adminProfile?.id || null);
      setCompanyForm({
        name: company.name,
        primary_color: company.primary_color,
        logo_url: company.logo_url || '',
        admin_name: adminProfile?.full_name || '',
        admin_email: adminProfile?.email || '',
        admin_password: ''
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setEditingCompanyLoading(false);
    }

    setShowEditCompanyModal(true);
  };

  async function handleUpdateCompany() {
    // Validate required fields
    if (!companyForm.name.trim()) {
      alert('El nombre de la empresa es obligatorio');
      return;
    }

    // For new companies, validate all admin fields
    if (!editingCompany) {
      if (!companyForm.admin_name.trim()) {
        alert('El nombre del admin es obligatorio');
        return;
      }
      if (!companyForm.admin_email.trim()) {
        alert('El email del admin es obligatorio');
        return;
      }
      if (!companyForm.admin_password.trim()) {
        alert('La contraseña es obligatoria para nuevas empresas');
        return;
      }
    }

    setEditingCompanyLoading(true);
    try {
      if (editingCompany) {
        // UPDATE MODE
        const { error: companyError } = await supabase
          .from('companies')
          .update({
            name: companyForm.name,
            primary_color: companyForm.primary_color,
            logo_url: companyForm.logo_url,
            admin_name: companyForm.admin_name,
            admin_email: companyForm.admin_email
          })
          .eq('id', editingCompany.id);

        if (companyError) throw companyError;

        // Update admin profile
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: companyForm.admin_name,
            email: companyForm.admin_email
          })
          .eq('company_id', editingCompany.id)
          .eq('role', 'admin');

        if (profileError) throw profileError;

        // Update password if provided
        if (companyForm.admin_password && adminUserId) {
          const { error: passwordError } = await supabase
            .rpc('update_user_password', {
              p_user_id: adminUserId,
              p_new_password: companyForm.admin_password
            });

          if (passwordError) throw passwordError;
        }
      } else {
        // CREATE MODE
        // 1. Create company FIRST
        const { data: company, error: compErr } = await supabase
          .from('companies')
          .insert({
            name: companyForm.name,
            primary_color: companyForm.primary_color,
            logo_url: companyForm.logo_url,
            admin_name: companyForm.admin_name,
            admin_email: companyForm.admin_email,
            plan: 'basic',
            status: 'active',
            maintenance_mode: false
          })
          .select()
          .single();

        if (compErr) throw compErr;

        // 2. Create auth user
        const { data: authData, error: authErr } = await supabase.auth.signUp({
          email: companyForm.admin_email.trim(),
          password: companyForm.admin_password.trim(),
          options: {
            data: {
              full_name: companyForm.admin_name,
            },
            emailRedirectTo: undefined,
          }
        });

        if (authErr) throw authErr;
        if (!authData.user) throw new Error('No se pudo crear el usuario');

        // 3. Create admin profile IMMEDIATELY (before any triggers)
        const { error: profErr } = await supabase.from('profiles').insert({
          id: authData.user.id,
          email: companyForm.admin_email,
          full_name: companyForm.admin_name,
          role: 'admin',
          company_id: company.id,
          avatar_emoji: '👤',
          avatar_color: companyForm.primary_color,
          is_active: true
        });

        if (profErr) throw profErr;

        // 4. Create default SLA policies
        await supabase.rpc('create_default_sla_policies', { p_company_id: company.id });
      }

      await loadCompanies();
      setShowEditCompanyModal(false);
      setEditingCompany(null);
      setAdminUserId(null);
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setEditingCompanyLoading(false);
    }
  }

  // Filtered companies
  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.admin_email?.toLowerCase().includes(search.toLowerCase());
    const matchPlan = !filterPlan || c.subscription?.plan === filterPlan;
    const matchStatus = !filterStatus || (filterStatus === 'maintenance' ? c.maintenance_mode : c.subscription?.status === filterStatus || (!c.subscription && filterStatus === 'trial'));
    return matchSearch && matchPlan && matchStatus;
  });

  const activeFilters = [search, filterPlan, filterStatus].filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Empresas y Planes
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {filtered.length} empresa(s) de {companies.length} total
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => exportCompaniesAndPlansCSV(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download size={15} /><span className="hidden sm:inline">CSV</span>
          </button>
          <button onClick={() => exportCompaniesAndPlansPDF(filtered)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <FileText size={15} /><span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${showFilters || activeFilters > 0 ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400' : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
            <SlidersHorizontal size={15} />
            {activeFilters > 0 && <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 text-white text-xs">{activeFilters}</span>}
          </button>
          <button onClick={() => {
            setEditingCompany(null);
            setCompanyForm({ name: '', primary_color: '#2563eb', logo_url: '', admin_name: '', admin_email: '', admin_password: '' });
            setShowPassword(false);
            setShowEditCompanyModal(true);
          }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 bg-blue-600">
            <Plus size={16} /><span className="hidden sm:inline">Nueva Empresa</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los planes</option>
              {PLANS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="trial">Prueba</option>
              <option value="maintenance">Suspendida</option>
            </select>
          </div>
        )}
      </div>

      {/* Companies Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">No hay empresas que coincidan con los filtros</p>
        </div>
      ) : (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-left w-8"></th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Inicio</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const currentPlan = PLANS.find(p => p.id === company.subscription?.plan);
                const isExpanded = expandedId === company.id;
                const clientCount = company.clients?.length ?? 0;

                return (
                  <React.Fragment key={company.id}>
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : company.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                          title={isExpanded ? 'Contraer' : 'Expandir clientes'}
                        >
                          {isExpanded ? (
                            <ChevronUp size={16} className="text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                            style={{ backgroundColor: company.primary_color }}
                          >
                            {company.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{company.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{clientCount} cliente{clientCount !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900 dark:text-white">{company.admin_name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{company.admin_email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {currentPlan ? (
                          <Badge variant="info">{currentPlan.name}</Badge>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">Sin plan</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {company.subscription ? `$${company.subscription.amount} ${company.subscription.currency}` : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            company.maintenance_mode
                              ? 'danger'
                              : company.subscription?.status === 'active'
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {company.maintenance_mode
                            ? 'Suspendida'
                            : company.subscription?.status === 'active'
                            ? 'Activa'
                            : 'Prueba'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {company.subscription
                          ? new Date(company.subscription.start_date).toLocaleDateString('es-ES')
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditCompanyModal(company)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Palette size={13} />Editar
                          </button>
                          <button
                            onClick={() => openEditPlanModal(company)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                          >
                            <Edit2 size={13} />Plan
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, company })}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={13} />Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded && clientCount > 0 && (
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
                              Clientes ({clientCount})
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {company.clients?.map((client: any) => (
                                <div key={client.id} className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div>
                                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                                        {client.client_company?.name || 'Sin empresa'}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{client.client_contact_name}</p>
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{client.client_contact_email}</p>
                                  {client.client_contact_phone && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{client.client_contact_phone}</p>
                                  )}
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge
                                      variant={
                                        client.status === 'active'
                                          ? 'success'
                                          : client.status === 'inactive'
                                          ? 'secondary'
                                          : 'danger'
                                      }
                                    >
                                      {client.status === 'active' ? 'Activo' : client.status === 'inactive' ? 'Inactivo' : 'Suspendido'}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {isExpanded && clientCount === 0 && (
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30">
                        <td colSpan={8} className="px-6 py-4">
                          <p className="text-sm text-gray-500 dark:text-gray-400">No hay clientes registrados</p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Edit Company Modal */}
      <Modal
        open={showEditCompanyModal}
        onClose={() => {
          setShowEditCompanyModal(false);
          setEditingCompany(null);
          setShowPassword(false);
        }}
        title={editingCompany ? 'Editar Empresa' : 'Nueva Empresa'}
        size="md"
      >
        <div className="space-y-4">
          {/* Empresa Section */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Información de la Empresa
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  value={companyForm.name}
                  onChange={(e) => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Color Principal
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={companyForm.primary_color}
                    onChange={(e) => setCompanyForm(f => ({ ...f, primary_color: e.target.value }))}
                    className="w-12 h-10 rounded-lg cursor-pointer border border-gray-300 dark:border-gray-700"
                  />
                  <input
                    type="text"
                    value={companyForm.primary_color}
                    onChange={(e) => setCompanyForm(f => ({ ...f, primary_color: e.target.value }))}
                    className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Logo URL (opcional)
                </label>
                <input
                  type="url"
                  value={companyForm.logo_url}
                  onChange={(e) => setCompanyForm(f => ({ ...f, logo_url: e.target.value }))}
                  placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Admin Section */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Usuario Administrador
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Nombre del Admin
                </label>
                <input
                  type="text"
                  value={companyForm.admin_name}
                  onChange={(e) => setCompanyForm(f => ({ ...f, admin_name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Email del Admin
                </label>
                <input
                  type="email"
                  value={companyForm.admin_email}
                  onChange={(e) => setCompanyForm(f => ({ ...f, admin_email: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Contraseña (dejar vacío para no cambiar)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={companyForm.admin_password}
                    onChange={(e) => setCompanyForm(f => ({ ...f, admin_password: e.target.value }))}
                    placeholder="Ingresa nueva contraseña si deseas cambiarla"
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setShowEditCompanyModal(false);
                setEditingCompany(null);
                setShowPassword(false);
              }}
              disabled={editingCompanyLoading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdateCompany}
              disabled={editingCompanyLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {editingCompanyLoading ? 'Guardando...' : editingCompany ? 'Guardar Cambios' : 'Crear Empresa'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Plan Modal */}
      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedCompany(null);
          setSelectedPlan(null);
        }}
        title={`Actualizar Plan - ${selectedCompany?.name}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              Selecciona el nuevo plan para esta empresa. El cambio se aplicará inmediatamente.
            </p>
          </div>

          {/* Plans Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedPlan === plan.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
                }`}
              >
                <p className="font-semibold text-gray-900 dark:text-white mb-1">
                  {plan.name}
                </p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                  ${plan.price}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {plan.description}
                </p>
                {selectedPlan === plan.id && (
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mt-3">
                    <Check size={16} />
                    <span className="text-sm font-medium">Seleccionado</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Features */}
          {selectedPlan && (
            <div>
              <p className="font-medium text-gray-900 dark:text-white mb-3">
                Características incluidas:
              </p>
              <ul className="space-y-2">
                {PLANS.find(p => p.id === selectedPlan)?.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Check size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setShowModal(false);
                setSelectedCompany(null);
                setSelectedPlan(null);
              }}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdatePlan}
              disabled={updating || !selectedPlan}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {updating ? 'Actualizando...' : 'Actualizar Plan'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false })}
        title="Confirmar eliminación"
        size="sm"
      >
        <div className="space-y-4">
          {deleteError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
              {deleteError}
            </div>
          )}
          <p className="text-gray-700 dark:text-gray-300">
            ¿Estás seguro de que deseas eliminar la empresa <strong>{deleteConfirm.company?.name}</strong>?
            <br />
            <br />
            <span className="text-sm text-red-600 dark:text-red-400">Esta acción no se puede deshacer.</span>
          </p>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setDeleteConfirm({ open: false })}
              disabled={deleteConfirm.deleting}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteCompany}
              disabled={deleteConfirm.deleting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {deleteConfirm.deleting ? 'Eliminando...' : 'Eliminar Empresa'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
