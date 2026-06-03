import React, { useState } from 'react';
import { Sun, Moon, Bell, LogOut, Plus, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useRouter } from '../../contexts/RouterContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import Avatar from '../ui/Avatar';
import NotificationsPanel from '../ui/NotificationsPanel';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin:      'Administrador',
  agent:      'Agente',
  developer:  'Desarrollador',
};

interface HeaderProps {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { navigate } = useRouter();
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors lg:hidden"
        >
          <Menu size={20} />
        </button>

        {profile?.role !== 'superadmin' && (
          <button
            onClick={() => navigate('new-ticket')}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 shadow-sm"
            style={{ backgroundColor: 'var(--brand-color, #2563eb)' }}
          >
            <Plus size={16} />
            <span className="hidden sm:block">Nuevo Ticket</span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen((v) => !v); setMenuOpen(false); }}
            className="relative p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="relative z-50">
                <NotificationsPanel onClose={() => setNotifOpen(false)} />
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setMenuOpen((v) => !v); setNotifOpen(false); }}
            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Avatar profile={profile} size="sm" />
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {ROLE_LABELS[profile?.role ?? 'agent']}
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                <button
                  onClick={() => { setMenuOpen(false); navigate('settings'); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Mi Perfil
                </button>
                <div className="h-px bg-gray-100 dark:bg-gray-800 my-1" />
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                >
                  <LogOut size={14} />
                  Cerrar Sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
