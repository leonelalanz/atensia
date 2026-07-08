import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { RouterProvider, useRouter } from './contexts/RouterContext';
import { BrandProvider } from './contexts/BrandContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import PricingPage from './pages/PricingPage';
import PlansManagement from './pages/admin/PlansManagement';
import UpgradeRequest from './pages/admin/UpgradeRequest';
import DashboardPage from './pages/dashboard/DashboardPage';
import TicketsPage from './pages/tickets/TicketsPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import NewTicketPage from './pages/tickets/NewTicketPage';
import UsersPage from './pages/users/UsersPage';
import CompaniesAndPlans from './pages/companies/CompaniesAndPlans';
import SLAPage from './pages/sla/SLAPage';
import ActivitiesPage from './pages/activities/ActivitiesPage';
import SettingsPage from './pages/settings/SettingsPage';
import BrandingPage from './pages/branding/BrandingPage';
import AuditLogsPage from './pages/audit/AuditLogsPage';
import PaymentProofsPage from './pages/superadmin/PaymentProofsPage';
import ExchangeRatePage from './pages/superadmin/ExchangeRatePage';
import LoadingSpinner from './components/ui/LoadingSpinner';
import HelpPage from './pages/help/HelpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import TermsOfServicePage from './pages/legal/TermsOfServicePage';
import PrivacyPolicyPage from './pages/legal/PrivacyPolicyPage';
import SuspendedPage from './pages/SuspendedPage';
import { NotificationsProvider } from './contexts/NotificationsContext';
import PaginaClientes from './pages/agencia/PaginaClientes';
import PaginaDespliegues from './pages/agencia/PaginaDespliegues';
import MembershipsPage from './pages/admin/MembershipsPage';
import { useMembershipAlerts } from './hooks/useMembershipAlerts';

function AppRoutes() {
  const { user, loading, profile } = useAuth();
  const { route, navigate } = useRouter();

  useMembershipAlerts();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('login');
      } else if (route === 'login') {
        navigate('dashboard');
      }
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Cargando Atensia...</p>
        </div>
      </div>
    );
  }

  if (route === 'forgot-password') return <ForgotPasswordPage />;
  if (route === 'reset-password') return <ResetPasswordPage />;
  if (route === 'signup') return <SignUpPage />;
  if (route === 'pricing') return <PricingPage />;
  if (!user || route === 'login') return <LoginPage />;

  const role = profile?.role ?? 'agent';

  // Check if company is in maintenance mode (not paid) - superadmins can always access
  if (profile?.company?.maintenance_mode && role !== 'superadmin') {
    return <SuspendedPage />;
  }

  function renderPage() {
    switch (route) {
      case 'dashboard': return <DashboardPage />;
      case 'tickets': return <TicketsPage />;
      case 'help': return <HelpPage />;
      case 'ticket-detail': return <TicketDetailPage />;
      case 'new-ticket': return <NewTicketPage />;
      case 'users': return (role === 'admin' || role === 'superadmin') ? <UsersPage /> : <DashboardPage />;
      case 'companies': return role === 'superadmin' ? <CompaniesAndPlans /> : <DashboardPage />;
      case 'subscriptions': return role === 'superadmin' ? <CompaniesAndPlans /> : <DashboardPage />;
      case 'sla': return role === 'admin' ? <SLAPage /> : <DashboardPage />;
      case 'activities': return (role === 'developer' || role === 'admin') ? <ActivitiesPage /> : <DashboardPage />;
      case 'audit': return (role === 'admin' || role === 'superadmin') ? <AuditLogsPage /> : <DashboardPage />;
      case 'payment-proofs': return role === 'superadmin' ? <PaymentProofsPage /> : <DashboardPage />;
      case 'exchange-rates': return role === 'superadmin' ? <ExchangeRatePage /> : <DashboardPage />;
      case 'settings': return <SettingsPage />;
      case 'branding': return role === 'admin' || role === 'superadmin' ? <BrandingPage /> : <DashboardPage />;
      case 'terms': return <TermsOfServicePage />;
      case 'privacy': return <PrivacyPolicyPage />;
      case 'plans-management': return role === 'superadmin' ? <PlansManagement /> : <DashboardPage />;
      case 'upgrade-plan': return (role === 'admin' || role === 'superadmin') ? <UpgradeRequest /> : <DashboardPage />;
      case 'clientes': return role === 'admin' ? <PaginaClientes /> : <DashboardPage />;
      case 'despliegues': return (role === 'admin' || role === 'developer') ? <PaginaDespliegues /> : <DashboardPage />;
      case 'memberships': return (role === 'admin' || role === 'superadmin') ? <MembershipsPage /> : <DashboardPage />;
      default: return <DashboardPage />;
    }
  }

  return (
    <NotificationsProvider>
      <Layout>
        {renderPage()}
      </Layout>
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <RouterProvider>
        <AuthProvider>
          <BrandProvider>
            <AppRoutes />
          </BrandProvider>
        </AuthProvider>
      </RouterProvider>
    </ThemeProvider>
  );
}
