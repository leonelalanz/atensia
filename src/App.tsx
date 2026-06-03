import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { RouterProvider, useRouter } from './contexts/RouterContext';
import { BrandProvider } from './contexts/BrandContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import TicketsPage from './pages/tickets/TicketsPage';
import TicketDetailPage from './pages/tickets/TicketDetailPage';
import NewTicketPage from './pages/tickets/NewTicketPage';
import UsersPage from './pages/users/UsersPage';
import CompaniesPage from './pages/companies/CompaniesPage';
import SubscriptionsPage from './pages/subscriptions/SubscriptionsPage';
import SLAPage from './pages/sla/SLAPage';
import ActivitiesPage from './pages/activities/ActivitiesPage';
import SettingsPage from './pages/settings/SettingsPage';
import BrandingPage from './pages/branding/BrandingPage';
import LoadingSpinner from './components/ui/LoadingSpinner';
import HelpPage from './pages/help/HelpPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { NotificationsProvider } from './contexts/NotificationsContext';

function AppRoutes() {
  const { user, loading, profile } = useAuth();
  const { route, navigate } = useRouter();

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
  if (!user || route === 'login') return <LoginPage />;

  const role = profile?.role ?? 'agent';

  function renderPage() {
    switch (route) {
      case 'dashboard': return <DashboardPage />;
      case 'tickets': return <TicketsPage />;
      case 'help': return <HelpPage />;
      case 'ticket-detail': return <TicketDetailPage />;
      case 'new-ticket': return <NewTicketPage />;
      case 'users': return role === 'admin' ? <UsersPage /> : <DashboardPage />;
      case 'companies': return role === 'superadmin' ? <CompaniesPage /> : <DashboardPage />;
      case 'subscriptions': return role === 'superadmin' ? <SubscriptionsPage /> : <DashboardPage />;
      case 'sla': return role === 'admin' ? <SLAPage /> : <DashboardPage />;
      case 'activities': return (role === 'developer' || role === 'admin') ? <ActivitiesPage /> : <DashboardPage />;
      case 'settings': return <SettingsPage />;
      case 'branding': return role === 'admin' || role === 'superadmin' ? <BrandingPage /> : <DashboardPage />;
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
