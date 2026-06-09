import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Calendar, Tag, ChevronDown, UserX, Check, Loader2, Search } from 'lucide-react';
import { Ticket, Profile } from '../../types';
import { useRouter } from '../../contexts/RouterContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Avatar from '../ui/Avatar';
import SLABadge from './SLABadge';
import { onTicketAssigned } from '../../lib/notifications';

const PRIORITY_CONFIG = {
  critical: { label: 'Crítica', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', dot: 'bg-red-500' },
  high:     { label: 'Alta',    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', dot: 'bg-orange-500' },
  medium:   { label: 'Media',   className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', dot: 'bg-amber-500' },
  low:      { label: 'Baja',    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400', dot: 'bg-gray-400' },
};

const STATUS_CONFIG = {
  open:        { label: 'Abierto',     className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'En Progreso', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  resolved:    { label: 'Resuelto',    className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  closed:      { label: 'Cerrado',     className: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

const CATEGORY_LABELS: Record<string, string> = {
  soporte: 'Soporte', bug: 'Bug', solicitud: 'Solicitud', consulta: 'Consulta', otro: 'Otro',
};

interface TicketCardProps {
  ticket: Ticket;
  onRefresh?: () => void;
}

export default function TicketCard({ ticket, onRefresh }: TicketCardProps) {
  const { navigate } = useRouter();
  const { profile } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [assignOpen, setAssignOpen] = useState(false);
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignee, setAssignee] = useState<Profile | null | undefined>(ticket.assignee);
  const [assignError, setAssignError] = useState('');

  const canAssign = profile?.role === 'admin' || profile?.role === 'developer';

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAssignOpen(false);
        setSearch('');
      }
    }
    if (assignOpen) {
      document.addEventListener('mousedown', handle);
      setTimeout(() => searchRef.current?.focus(), 50);
    }
    return () => document.removeEventListener('mousedown', handle);
  }, [assignOpen]);

  const loadUsers = useCallback(async () => {
    if (users.length > 0) return;
    setLoadingUsers(true);

    let companyIds = new Set<string>();

    if (profile?.role === 'admin' && profile?.company_id) {
      // Admins can see users from their own company and all client companies
      companyIds.add(profile.company_id);

      const { data: clientCompanies } = await supabase
        .from('client_companies')
        .select('client_company_id')
        .eq('admin_company_id', profile.company_id);
      if (clientCompanies) {
        clientCompanies.forEach(c => companyIds.add(c.client_company_id));
      }
    } else {
      // Non-admins see only users from their company
      companyIds.add(ticket.company_id);
    }

    const companyIdArray = Array.from(companyIds);

    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_emoji, avatar_color, role, email, company_id, is_active, created_at')
      .in('company_id', companyIdArray)
      .eq('is_active', true)
      .order('full_name');
    setUsers((data ?? []) as Profile[]);
    setLoadingUsers(false);
  }, [ticket.company_id, users.length, profile?.company_id, profile?.role]);

  async function toggleDropdown(e: React.MouseEvent) {
    e.stopPropagation();
    if (assigning) return;
    if (!assignOpen) await loadUsers();
    setAssignOpen((v) => !v);
    setSearch('');
  }

  async function handleAssign(e: React.MouseEvent, userId: string | null) {
    e.stopPropagation();
    const prev = assignee;
    const next = userId ? (users.find((u) => u.id === userId) ?? null) : null;

    // Optimistic update
    setAssignee(next);
    setAssignOpen(false);
    setSearch('');
    setAssigning(true);

    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: userId, updated_at: new Date().toISOString() })
      .eq('id', ticket.id);

    if (error) {
      setAssignee(prev);
      setAssignError('Sin permiso para reasignar. Aplica la migración RLS en Supabase.');
      setTimeout(() => setAssignError(''), 4000);
    } else {
      // Notificar asignación
      await onTicketAssigned({
        ticketId:       ticket.id,
        ticketNumber:   ticket.ticket_number,
        title:          ticket.title,
        companyId:      ticket.company_id,
        newAssigneeId:  userId,
        prevAssigneeId: ticket.assigned_to || null,
        byUserId:       profile!.id,
      });
    }
    setAssigning(false);
    onRefresh?.();
  }

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const priority = PRIORITY_CONFIG[ticket.priority];
  const status = STATUS_CONFIG[ticket.status];

  return (
    <div
      onClick={() => navigate('ticket-detail', { id: ticket.id })}
      className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 transition-all group"
    >
      {/* Top: badges + SLA */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{ticket.ticket_number}</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priority.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${priority.dot}`} />
            {priority.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
            {status.label}
          </span>
        </div>
        <SLABadge slaRecord={ticket.sla_record} compact />
      </div>

      {/* Company info */}
      {(ticket.company as any)?.name && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
          Empresa: <span className="font-medium text-gray-600 dark:text-gray-300">{(ticket.company as any).name}</span>
        </p>
      )}

      {/* Title */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
        {ticket.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
        {ticket.description || 'Sin descripción.'}
      </p>

      {/* Bottom: category + assignee */}
      <div className="flex items-center justify-between gap-2 relative">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
            <Tag size={12} />
            {CATEGORY_LABELS[ticket.category]}
          </span>
          {ticket.due_date && (
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
              <Calendar size={12} />
              {new Date(ticket.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
            </span>
          )}
        </div>

        {/* Assignee picker */}
        {assignError && (
          <div className="absolute bottom-full left-0 mb-1 w-full px-2">
            <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-2 py-1">
              {assignError}
            </p>
          </div>
        )}
        {canAssign ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleDropdown}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors max-w-[160px]"
            >
              {assigning ? (
                <Loader2 size={15} className="text-gray-400 animate-spin flex-shrink-0" />
              ) : assignee ? (
                <Avatar profile={assignee} size="sm" className="flex-shrink-0" />
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                  <UserX size={10} className="text-gray-400" />
                </div>
              )}
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                {assigning ? '…' : assignee ? assignee.full_name : 'Sin asignar'}
              </span>
              <ChevronDown size={11} className="text-gray-400 flex-shrink-0 ml-auto" />
            </button>

            {assignOpen && (
              <div
                className="absolute right-0 bottom-full mb-2 w-60 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Search */}
                <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Buscar miembro..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={18} className="text-gray-400 animate-spin" />
                    </div>
                  ) : (
                    <>
                      {/* Sin asignar option */}
                      {!search && (
                        <button
                          onClick={(e) => handleAssign(e, null)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                            <UserX size={12} className="text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 italic flex-1 text-left">Sin asignar</span>
                          {!assignee && <Check size={13} className="text-blue-500" />}
                        </button>
                      )}

                      {filtered.length === 0 && search && (
                        <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
                      )}

                      {filtered.map((u) => (
                        <button
                          key={u.id}
                          onClick={(e) => handleAssign(e, u.id)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Avatar profile={u} size="sm" className="flex-shrink-0" />
                          <div className="flex-1 text-left min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.full_name}</p>
                            <p className="text-[11px] text-gray-400 capitalize">{u.role}</p>
                          </div>
                          {assignee?.id === u.id && <Check size={13} className="text-blue-500 flex-shrink-0" />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {assignee ? (
              <>
                <Avatar profile={assignee} size="sm" />
                <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate max-w-[100px]">
                  {assignee.full_name}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1 text-xs text-gray-400">
                <UserX size={12} /> Sin asignar
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
