import React from 'react';
import { Bell, CheckCheck, Ticket, UserCheck, CheckCircle2, MessageSquare, AlertTriangle, Info, X, Wallet } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useRouter } from '../../contexts/RouterContext';
import { AppNotification } from '../../types';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

const TYPE_ICON: Record<AppNotification['type'], React.ElementType> = {
  ticket_created:   Ticket,
  ticket_assigned:  UserCheck,
  ticket_resolved:  CheckCircle2,
  ticket_commented: MessageSquare,
  ticket_escalated: AlertTriangle,
  general:          Info,
  membership_expiring: Wallet,
};

const TYPE_COLOR: Record<AppNotification['type'], string> = {
  ticket_created:   'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  ticket_assigned:  'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  ticket_resolved:  'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  ticket_commented: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  ticket_escalated: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  general:          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  membership_expiring: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

interface Props {
  onClose: () => void;
}

export default function NotificationsPanel({ onClose }: Props) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useNotifications();
  const { navigate } = useRouter();

  function handleClick(n: AppNotification) {
    if (!n.read) markAsRead(n.id);
    if (n.ticket_id) {
      navigate('ticket-detail', { id: n.ticket_id });
      onClose();
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <Bell size={16} className="text-gray-600 dark:text-gray-400" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">Notificaciones</span>
          {unreadCount > 0 && (
            <span className="text-xs font-bold bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <CheckCheck size={13} />
              Leer todas
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando...</div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No tienes notificaciones</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Info;
            const color = TYPE_COLOR[n.type] ?? TYPE_COLOR.general;
            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  !n.read ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                }`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ${color}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                      {n.title}
                    </p>
                    {!n.read && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-1.5" />}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
