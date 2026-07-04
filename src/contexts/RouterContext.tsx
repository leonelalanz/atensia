import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Route } from '../types';

interface RouterContextType {
  route: Route;
  params: Record<string, string>;
  navigate: (route: Route, params?: Record<string, string>) => void;
}

const ROUTE_TO_PATH: Record<Route, string> = {
  'login':             '/login',
  'signup':            '/signup',
  'forgot-password':   '/forgot-password',
  'reset-password':    '/reset-password',
  'pricing':           '/pricing',
  'dashboard':         '/dashboard',
  'tickets':           '/tickets',
  'ticket-detail':     '/tickets/:id',
  'new-ticket':        '/tickets/new',
  'users':             '/users',
  'companies':         '/companies',
  'subscriptions':     '/subscriptions',
  'sla':               '/sla',
  'activities':        '/activities',
  'audit':             '/audit',
  'payment-proofs':    '/payment-proofs',
  'settings':          '/settings',
  'branding':          '/branding',
  'help':              '/help',
  'terms':             '/terms',
  'privacy':           '/privacy',
  'plans-management':  '/admin/plans',
  'upgrade-plan':      '/admin/upgrade',
  'exchange-rates':    '/admin/exchange-rates',
  'clientes':          '/clientes',
  'despliegues':       '/despliegues',
};

function pathToRoute(pathname: string): { route: Route; params: Record<string, string> } {
  if (pathname === '/' || pathname === '' || pathname === '/dashboard') return { route: 'dashboard', params: {} };
  if (pathname === '/login') return { route: 'login', params: {} };
  if (pathname === '/signup') return { route: 'signup', params: {} };
  if (pathname === '/pricing') return { route: 'pricing', params: {} };
  if (pathname === '/forgot-password') return { route: 'forgot-password', params: {} };
  if (pathname === '/reset-password') return { route: 'reset-password', params: {} };
  if (pathname === '/admin/plans') return { route: 'plans-management', params: {} };
  if (pathname === '/admin/upgrade') return { route: 'upgrade-plan', params: {} };
  if (pathname === '/admin/exchange-rates') return { route: 'exchange-rates', params: {} };
  if (pathname === '/tickets/new') return { route: 'new-ticket', params: {} };
  const ticketDetail = pathname.match(/^\/tickets\/([^/]+)$/);
  if (ticketDetail) return { route: 'ticket-detail', params: { id: ticketDetail[1] } };
  if (pathname === '/tickets') return { route: 'tickets', params: {} };
  if (pathname === '/users') return { route: 'users', params: {} };
  if (pathname === '/companies') return { route: 'companies', params: {} };
  if (pathname === '/subscriptions') return { route: 'subscriptions', params: {} };
  if (pathname === '/sla') return { route: 'sla', params: {} };
  if (pathname === '/activities') return { route: 'activities', params: {} };
  if (pathname === '/audit') return { route: 'audit', params: {} };
  if (pathname === '/payment-proofs') return { route: 'payment-proofs', params: {} };
  if (pathname === '/settings') return { route: 'settings', params: {} };
  if (pathname === '/branding') return { route: 'branding', params: {} };
  if (pathname === '/help') return { route: 'help', params: {} };
  if (pathname === '/terms') return { route: 'terms', params: {} };
  if (pathname === '/privacy') return { route: 'privacy', params: {} };
  if (pathname === '/clientes') return { route: 'clientes', params: {} };
  if (pathname === '/despliegues') return { route: 'despliegues', params: {} };
  return { route: 'dashboard', params: {} };
}

function routeToPath(route: Route, params: Record<string, string> = {}): string {
  let path = ROUTE_TO_PATH[route];
  Object.entries(params).forEach(([k, v]) => { path = path.replace(`:${k}`, v); });
  return path;
}

const RouterContext = createContext<RouterContextType | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const initial = pathToRoute(window.location.pathname);
  const [route, setRoute] = useState<Route>(initial.route);
  const [params, setParams] = useState<Record<string, string>>(initial.params);

  useEffect(() => {
    function onPopState() {
      const { route: r, params: p } = pathToRoute(window.location.pathname);
      setRoute(r);
      setParams(p);
    }
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(newRoute: Route, newParams: Record<string, string> = {}) {
    const path = routeToPath(newRoute, newParams);
    window.history.pushState({}, '', path);
    setRoute(newRoute);
    setParams(newParams);
    window.scrollTo(0, 0);
  }

  return (
    <RouterContext.Provider value={{ route, params, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}
