export interface PaymentProof {
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

export interface PaymentStats {
  totalIncome: number;
  pendingAmount: number;
  pendingCount: number;
  approvedCount: number;
  approvedAmount: number;
  rejectedCount: number;
  approvalRate: number;
  averagePayment: number;
  topPlans: { plan: string; count: number; total: number }[];
  paymentsByMethod: { method: string; count: number; total: number }[];
  paymentsByDate: { date: string; count: number; total: number }[];
}

export function calculatePaymentStats(proofs: PaymentProof[]): PaymentStats {
  const stats: PaymentStats = {
    totalIncome: 0,
    pendingAmount: 0,
    pendingCount: 0,
    approvedCount: 0,
    approvedAmount: 0,
    rejectedCount: 0,
    approvalRate: 0,
    averagePayment: 0,
    topPlans: [],
    paymentsByMethod: [],
    paymentsByDate: [],
  };

  // Count and sum by status
  proofs.forEach((proof) => {
    if (proof.status === 'pending') {
      stats.pendingCount++;
      stats.pendingAmount += proof.plan_price;
    } else if (proof.status === 'approved') {
      stats.approvedCount++;
      stats.approvedAmount += proof.plan_price;
      stats.totalIncome += proof.plan_price;
    } else if (proof.status === 'rejected') {
      stats.rejectedCount++;
    }
  });

  // Calculate approval rate
  const totalProofs = proofs.length;
  stats.approvalRate = totalProofs > 0 ? (stats.approvedCount / totalProofs) * 100 : 0;

  // Calculate average payment (only approved)
  stats.averagePayment = stats.approvedCount > 0 ? stats.approvedAmount / stats.approvedCount : 0;

  // Top plans
  const planMap = new Map<string, { count: number; total: number }>();
  proofs.forEach((proof) => {
    if (proof.status === 'approved') {
      const existing = planMap.get(proof.plan) || { count: 0, total: 0 };
      planMap.set(proof.plan, {
        count: existing.count + 1,
        total: existing.total + proof.plan_price,
      });
    }
  });
  stats.topPlans = Array.from(planMap.entries())
    .map(([plan, data]) => ({ plan, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // Payments by method
  const methodMap = new Map<string, { count: number; total: number }>();
  proofs.forEach((proof) => {
    if (proof.status === 'approved') {
      const existing = methodMap.get(proof.payment_method) || { count: 0, total: 0 };
      methodMap.set(proof.payment_method, {
        count: existing.count + 1,
        total: existing.total + proof.plan_price,
      });
    }
  });
  stats.paymentsByMethod = Array.from(methodMap.entries()).map(([method, data]) => ({
    method,
    ...data,
  }));

  // Payments by date
  const dateMap = new Map<string, { count: number; total: number }>();
  proofs.forEach((proof) => {
    if (proof.status === 'approved') {
      const date = new Date(proof.created_at).toLocaleDateString('es-ES');
      const existing = dateMap.get(date) || { count: 0, total: 0 };
      dateMap.set(date, {
        count: existing.count + 1,
        total: existing.total + proof.plan_price,
      });
    }
  });
  stats.paymentsByDate = Array.from(dateMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return stats;
}
