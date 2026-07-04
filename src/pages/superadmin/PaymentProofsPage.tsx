import React, { useState, useEffect } from 'react';
import { Check, X, Eye, Download, Clock, CheckCircle, XCircle, BarChart3, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { sendPaymentApprovedEmail, sendPaymentRejectedEmail, sendInvoiceEmail } from '../../lib/emailService';
import { createInvoice } from '../../lib/invoices';
import { calculatePaymentStats, PaymentStats } from '../../lib/paymentStats';
import { exportToCSV, exportToPDF } from '../../lib/paymentExport';

interface PaymentProof {
  id: string;
  company_id: string;
  plan: string;
  plan_price: number;
  payment_method: string;
  proof_url: string;
  proof_file_name: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  company_name?: string;
  created_at: string;
  validated_at?: string;
}

export default function PaymentProofsPage() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [filteredProofs, setFilteredProofs] = useState<PaymentProof[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedProof, setSelectedProof] = useState<PaymentProof | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  useEffect(() => {
    loadProofs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [proofs, filter, dateFrom, dateTo, planFilter, methodFilter]);

  const loadProofs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('payment_proofs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Enrich with company names
      const enriched = await Promise.all(
        (data || []).map(async (proof) => {
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', proof.company_id)
            .single();
          return {
            ...proof,
            company_name: company?.name || 'Desconocida',
          };
        })
      );

      setProofs(enriched);
    } catch (error) {
      console.error('Error loading proofs:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = proofs;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((p) => p.status === filter);
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter((p) => new Date(p.created_at) >= new Date(dateFrom));
    }
    if (dateTo) {
      filtered = filtered.filter((p) => new Date(p.created_at) <= new Date(dateTo));
    }

    // Filter by plan
    if (planFilter !== 'all') {
      filtered = filtered.filter((p) => p.plan === planFilter);
    }

    // Filter by payment method
    if (methodFilter !== 'all') {
      filtered = filtered.filter((p) => p.payment_method === methodFilter);
    }

    setFilteredProofs(filtered);
    setStats(calculatePaymentStats(filtered));
  };

  const handleApprove = async (proof: PaymentProof) => {
    try {
      setProcessing(true);

      // Update proof status
      const { error: updateError } = await supabase
        .from('payment_proofs')
        .update({
          status: 'approved',
          validated_at: new Date().toISOString(),
          validated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', proof.id);

      if (updateError) throw updateError;

      // Update company subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          company_id: proof.company_id,
          plan: proof.plan,
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          amount: proof.plan_price,
          currency: 'USD',
        });

      if (subError) throw subError;

      // Get company and admin info
      const { data: companyData } = await supabase
        .from('companies')
        .select('name')
        .eq('id', proof.company_id)
        .single();

      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('company_id', proof.company_id)
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      // Create invoice
      const invoiceResult = await createInvoice({
        paymentProofId: proof.id,
        companyId: proof.company_id,
        companyName: companyData?.name || 'Empresa',
        companyEmail: profileData?.email,
        plan: proof.plan,
        amount: proof.plan_price,
      });

      // Send approval email
      if (profileData?.email) {
        await sendPaymentApprovedEmail({
          email: profileData.email,
          companyName: companyData?.name || 'Empresa',
          planName: proof.plan,
          planPrice: proof.plan_price,
        });
      }

      // Send invoice email
      if (profileData?.email && invoiceResult.success) {
        const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await sendInvoiceEmail({
          email: profileData.email,
          companyName: companyData?.name || 'Empresa',
          invoiceNumber: `INV-${new Date().getFullYear()}-0001`,
          plan: proof.plan,
          amount: proof.plan_price,
          dueDate: dueDate,
          invoiceUrl: invoiceResult.invoiceUrl,
        });
      }

      setSelectedProof(null);
      loadProofs();
    } catch (error) {
      console.error('Error approving proof:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (proof: PaymentProof) => {
    if (!rejectionReason.trim()) return;

    try {
      setProcessing(true);

      const { error } = await supabase
        .from('payment_proofs')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          validated_at: new Date().toISOString(),
          validated_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .eq('id', proof.id);

      if (error) throw error;

      // Send rejection email
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('company_id', proof.company_id)
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (profileData?.email) {
        await sendPaymentRejectedEmail({
          email: profileData.email,
          companyName: proof.company_name || 'Empresa',
          planName: proof.plan,
          rejectionReason: rejectionReason,
        });
      }

      setSelectedProof(null);
      setRejectionReason('');
      loadProofs();
    } catch (error) {
      console.error('Error rejecting proof:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"><Clock size={14} /> Pendiente</span>;
      case 'approved':
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"><CheckCircle size={14} /> Aprobado</span>;
      case 'rejected':
        return <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"><XCircle size={14} /> Rechazado</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Validación de Comprobantes de Pago
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Revisa, aprueba y analiza los comprobantes de pago de los clientes
        </p>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-6 text-white shadow-lg">
            <p className="text-sm opacity-90">Ingresos Totales</p>
            <p className="text-3xl font-bold">${stats.totalIncome.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-2">{stats.approvedCount} pagos aprobados</p>
          </div>

          <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-6 text-white shadow-lg">
            <p className="text-sm opacity-90">Pendientes</p>
            <p className="text-3xl font-bold">${stats.pendingAmount.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-2">{stats.pendingCount} transacciones</p>
          </div>

          <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-6 text-white shadow-lg">
            <p className="text-sm opacity-90">Tasa Aprobación</p>
            <p className="text-3xl font-bold">{stats.approvalRate.toFixed(1)}%</p>
            <p className="text-xs opacity-75 mt-2">De {proofs.length} transacciones</p>
          </div>

          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-6 text-white shadow-lg">
            <p className="text-sm opacity-90">Promedio por Pago</p>
            <p className="text-3xl font-bold">${stats.averagePayment.toFixed(2)}</p>
            <p className="text-xs opacity-75 mt-2">{stats.rejectedCount} rechazados</p>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === tab
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            {tab === 'all' ? 'Todos' : tab === 'pending' ? 'Pendientes' : tab === 'approved' ? 'Aprobados' : 'Rechazados'}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-6 shadow border border-gray-200 dark:border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Desde</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hasta</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Plan</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
            >
              <option value="all">Todos</option>
              <option value="basic">Basic</option>
              <option value="professional">Professional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Método</label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
            >
              <option value="all">Todos</option>
              {Array.from(new Set(proofs.map((p) => p.payment_method))).map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 items-end">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setPlanFilter('all');
                setMethodFilter('all');
              }}
              className="flex-1 px-3 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg font-medium transition-colors text-sm"
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => exportToCSV(filteredProofs, stats!)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
        >
          <Download size={18} />
          Exportar CSV
        </button>
        <button
          onClick={() => exportToPDF(filteredProofs, stats!)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          <FileText size={18} />
          Exportar PDF
        </button>
      </div>

      {/* Proofs Table */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      ) : filteredProofs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No hay comprobantes para mostrar</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Empresa</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Plan</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Monto</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Método</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Fecha</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredProofs.map((proof) => (
                <tr key={proof.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                    {proof.company_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {proof.plan}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    ${proof.plan_price} USD
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {proof.payment_method}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                    {new Date(proof.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(proof.status)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => setSelectedProof(proof)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para ver detalles */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg max-w-2xl w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Comprobante de {selectedProof.company_name}
              </h2>
              <button onClick={() => setSelectedProof(null)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Plan</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProof.plan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monto</p>
                <p className="font-semibold text-gray-900 dark:text-white">${selectedProof.plan_price} USD</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Método</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedProof.payment_method}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Estado</p>
                <div className="mt-1">{getStatusBadge(selectedProof.status)}</div>
              </div>
            </div>

            {/* Image Preview */}
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Comprobante</p>
              <img
                src={selectedProof.proof_url}
                alt="Comprobante de pago"
                className="max-w-full max-h-96 rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>

            {selectedProof.status === 'pending' && (
              <div className="space-y-3">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Motivo del rechazo (opcional)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800 dark:text-white text-sm"
                  rows={3}
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(selectedProof)}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleReject(selectedProof)}
                    disabled={processing || !rejectionReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={18} />
                    Rechazar
                  </button>
                </div>
              </div>
            )}

            {selectedProof.status === 'rejected' && selectedProof.rejection_reason && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-900 dark:text-red-100">
                  <span className="font-semibold">Motivo del rechazo:</span> {selectedProof.rejection_reason}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
