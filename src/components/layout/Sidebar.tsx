import React, { useState } from 'react';
import {
  LayoutDashboard, Ticket, Users, Building2, CreditCard, ShieldCheck,
  ClipboardList, Settings, Palette, ChevronLeft, ChevronRight,
  AlertCircle, X,
  BookOpen, History, Zap, Package, Rocket, BarChart3, DollarSign
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from '../../contexts/RouterContext';
import { useBrand } from '../../contexts/BrandContext';
import { usePlan } from '../../hooks/usePlan';
import { Route } from '../../types';

interface NavItem {
  label: string;
  icon: React.ElementType;
  route: Route;
  roles: string[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Panel', icon: LayoutDashboard, route: 'dashboard', roles: ['superadmin','admin','agent','developer'] },
  { label: 'Tickets', icon: Ticket, route: 'tickets', roles: ['admin','agent','developer'] },
  { label: 'Usuarios', icon: Users, route: 'users', roles: ['admin'] },
  { label: 'Empresas', icon: Building2, route: 'companies', roles: ['superadmin'] },
  { label: 'Clientes', icon: Building2, route: 'clientes', roles: ['admin'] },
  { label: 'Despliegues', icon: Rocket, route: 'despliegues', roles: ['admin','developer'] },
  { label: 'Políticas SLA', icon: ShieldCheck, route: 'sla', roles: ['admin'] },
  { label: 'Actividades', icon: ClipboardList, route: 'activities', roles: ['developer','admin'] },
  { label: 'Auditoría', icon: History, route: 'audit', roles: ['admin','superadmin'] },
  { label: 'Comprobantes de Pago', icon: CreditCard, route: 'payment-proofs', roles: ['superadmin'] },
  { label: 'Tasa de Cambio', icon: DollarSign, route: 'exchange-rates', roles: ['superadmin'] },
  { label: 'Marca', icon: Palette, route: 'branding', roles: ['admin', 'superadmin'] },
  { label: 'Configuración', icon: Settings, route: 'settings', roles: ['superadmin','admin','agent','developer'] }
];

const HELP_ITEM: NavItem = { label: 'Manual de Usuario', icon: BookOpen, route: 'help', roles: ['superadmin','admin','agent','developer'] };

interface SidebarProps {
  onClose: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { profile } = useAuth();
  const { navigate, route } = useRouter();
  const { primaryColor, logoUrl, companyName } = useBrand();

  const { canUseBranding } = usePlan();
  const role = profile?.role ?? 'agent';
  const filtered = NAV_ITEMS.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (item.route === 'branding' && !canUseBranding) return false;
    return true;
  });

  function handleNav(r: Route) {
    navigate(r);
    onClose();
  }

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-60'} h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 relative`}
    >
      <div className="h-16 flex items-center px-4 border-b border-gray-200 dark:border-gray-800 gap-3 flex-shrink-0">
        {logoUrl ? (
          <img src={logoUrl} alt={companyName} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <AlertCircle size={16} className="text-white" />
          </div>
        )}
        {!collapsed && (
          <span className="font-bold text-gray-900 dark:text-white text-sm truncate flex-1">{companyName}</span>
        )}
        <button
          onClick={onClose}
          className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {filtered.map((item) => {
          const active = route === item.route;
          return (
            <button
              key={item.route}
              onClick={() => handleNav(item.route)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
                ${active
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }
              `}
              style={active ? { backgroundColor: primaryColor } : {}}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 dark:border-gray-800 py-2 px-2">
        {HELP_ITEM.roles.includes(role) && (
          <button
            onClick={() => handleNav(HELP_ITEM.route)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
              ${route === HELP_ITEM.route
                ? 'text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }
            `}
            style={route === HELP_ITEM.route ? { backgroundColor: primaryColor } : {}}
            title={collapsed ? HELP_ITEM.label : undefined}
          >
            <HELP_ITEM.icon size={18} className="flex-shrink-0" />
            {!collapsed && <span>{HELP_ITEM.label}</span>}
          </button>
        )}
      </div>

      <button
        onClick={() => setCollapsed((c) => !c)}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 shadow-sm transition-colors"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
