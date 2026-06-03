import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, CreditCard as Edit, Calendar, Tag, User, Clock, FileText, X, Upload, Download, ChevronDown, Check, UserX, Loader2, Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from '../../contexts/RouterContext';
import { useAuth } from '../../contexts/AuthContext';
import { Ticket, TicketHistory, TicketAttachment, Profile } from '../../types';
import Modal from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import SLABadge from '../../components/tickets/SLABadge';
import TicketForm from '../../components/tickets/TicketForm';
import CommentSection from '../../components/tickets/CommentSection';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { calculateSLADeadlines } from '../../lib/sla';
import { onTicketAssigned } from '../../lib/notifications';

const PRIORITY_CONFIG = {
  critical: { label: 'Crítica', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: 'Alta', className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  medium: { label: 'Media', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  low: { label: 'Baja', className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
};

const STATUS_CONFIG = {
  open: { label: 'Abierto', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  in_progress: { label: 'En Progreso', className: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' },
  resolved: { label: 'Resuelto', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  closed: { label: 'Cerrado', className: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

const CATEGORY_LABELS: Record<string, string> = {
  soporte: 'Soporte', bug: 'Bug', solicitud: 'Solicitud', consulta: 'Consulta', otro: 'Otro',
};

const FIELD_LABELS: Record<string, string> = {
  status: 'Estado', priority: 'Prioridad', assigned_to: 'Asignado a',
  title: 'Título', description: 'Descripción',
};

const STATUS_LABELS_MAP: Record<string, string> = {
  open: 'Abierto', in_progress: 'En Progreso', resolved: 'Resuelto', closed: 'Cerrado',
  critical: 'Crítica', high: 'Alta', medium: 'Media', low: 'Baja',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(fileType: string) {
  return fileType.startsWith('image/');
}

export default function TicketDetailPage() {
  const { params, navigate } = useRouter();
  const { profile } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'attachments'>('comments');
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assignDropRef = useRef<HTMLDivElement>(null);

  // Quick assign state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignUsers, setAssignUsers] = useState<Profile[]>([]);
  const [assignSearch, setAssignSearch] = useState('');
  const [loadingAssignUsers, setLoadingAssignUsers] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const assignSearchRef = useRef<HTMLInputElement>(null);

  async function loadTicket() {
    const { data } = await supabase
      .from('tickets')
      .select('*, creator:profiles!created_by(*), assignee:profiles!assigned_to(*), sla_record:sla_records(*)')
      .eq('id', params.id)
      .maybeSingle();
    if (data) {
      const t = data as Ticket;
      // Auto-fix: if sla_record exists but deadlines are null, recalculate them
      if (t.sla_record && (!t.sla_record.first_response_deadline || !t.sla_record.resolution_deadline)) {
        const { data: policies } = await supabase
          .from('sla_policies').select('*').eq('company_id', t.company_id);
        const { firstResponseDeadline, resolutionDeadline } = calculateSLADeadlines(
          t.priority, t.created_at, policies ?? []
        );
        await supabase.from('sla_records').update({
          first_response_deadline: firstResponseDeadline.toISOString(),
          resolution_deadline:     resolutionDeadline.toISOString(),
        }).eq('id', t.sla_record.id);
        t.sla_record.first_response_deadline = firstResponseDeadline.toISOString();
        t.sla_record.resolution_deadline     = resolutionDeadline.toISOString();
      }
      // Auto-fix: no sla_record at all — create one
      if (!t.sla_record) {
        const { data: policies } = await supabase
          .from('sla_policies').select('*').eq('company_id', t.company_id);
        const { firstResponseDeadline, resolutionDeadline } = calculateSLADeadlines(
          t.priority, t.created_at, policies ?? []
        );
        const { data: newSla } = await supabase.from('sla_records').insert({
          ticket_id:               t.id,
          first_response_deadline: firstResponseDeadline.toISOString(),
          resolution_deadline:     resolutionDeadline.toISOString(),
        }).select().single();
        if (newSla) t.sla_record = newSla;
      }
      setTicket(t);
    }

    const { data: hist } = await supabase
      .from('ticket_history')
      .select('*, user:profiles(*)')
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: false });
    setHistory((hist ?? []) as TicketHistory[]);

    const { data: attch } = await supabase
      .from('ticket_attachments')
      .select('*, uploader:profiles(*)')
      .eq('ticket_id', params.id)
      .order('created_at', { ascending: false });
    setAttachments((attch ?? []) as TicketAttachment[]);

    setLoading(false);
  }

  useEffect(() => {
    if (params.id) loadTicket();
  }, [params.id]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || !files.length || !profile || !ticket) return;
    setUploading(true);
    setUploadError('');

    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setUploadError(`"${file.name}" supera el límite de 10 MB.`);
        continue;
      }
      const ext = file.name.split('.').pop();
      const path = `${profile.id}/${ticket.id}/${Date.now()}_${file.name}`;
      const { data: storageData, error: storageErr } = await supabase.storage
        .from('attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false });

      if (storageErr) {
        setUploadError(`Error al subir "${file.name}": ${storageErr.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);

      await supabase.from('ticket_attachments').insert({
        ticket_id: ticket.id,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: profile.id,
      });
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploading(false);
    await loadTicket();
  }

  async function handleDeleteAttachment(att: TicketAttachment) {
    const urlParts = att.file_url.split('/attachments/');
    if (urlParts.length > 1) {
      await supabase.storage.from('attachments').remove([urlParts[1]]);
    }
    await supabase.from('ticket_attachments').delete().eq('id', att.id);
    setAttachments((prev) => prev.filter((a) => a.id !== att.id));
  }

  // Close assign dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (assignDropRef.current && !assignDropRef.current.contains(e.target as Node)) {
        setAssignOpen(false);
      }
    }
    if (assignOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [assignOpen]);

  async function openAssignDropdown() {
    if (assigning) return;
    if (!assignOpen && assignUsers.length === 0 && ticket) {
      setLoadingAssignUsers(true);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_emoji, avatar_color, role, email, company_id, is_active, created_at')
        .eq('company_id', ticket.company_id)
        .eq('is_active', true)
        .order('full_name');
      setAssignUsers((data ?? []) as Profile[]);
      setLoadingAssignUsers(false);
    }
    setAssignOpen((v) => !v);
    setAssignSearch('');
    setTimeout(() => assignSearchRef.current?.focus(), 50);
  }

  async function handleAssign(userId: string | null) {
    if (!ticket) return;
    const prevAssigned = ticket.assigned_to;
    const prevAssignee = ticket.assignee;
    setAssignOpen(false);
    setAssignSearch('');
    setAssigning(true);

    // Optimistic update
    const assignedUser = userId ? (assignUsers.find((u) => u.id === userId) ?? null) : null;
    setTicket((prev) =>
      prev ? { ...prev, assigned_to: userId, assignee: assignedUser ?? undefined } : prev
    );

    const { error } = await supabase
      .from('tickets')
      .update({ assigned_to: userId, updated_at: new Date().toISOString() })
      .eq('id', ticket.id);

    if (error) {
      setTicket((prev) => prev ? { ...prev, assigned_to: prevAssigned, assignee: prevAssignee } : prev);
    } else {
      await onTicketAssigned({
        ticketId:       ticket.id,
        ticketNumber:   ticket.ticket_number,
        title:          ticket.title,
        companyId:      ticket.company_id,
        newAssigneeId:  userId,
        prevAssigneeId: prevAssigned || null,
        byUserId:       profile!.id,
      });
    }

    setAssigning(false);
  }

  const canEdit = profile?.role === 'admin' ||
    profile?.role === 'agent' ||
    profile?.role === 'developer';

  const canAssign = profile?.role === 'admin' || profile?.role === 'developer';

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  if (!ticket) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500 dark:text-gray-400">Ticket no encontrado.</p>
        <button onClick={() => navigate('tickets')} className="mt-3 text-blue-600 text-sm hover:underline">
          Volver a Tickets
        </button>
      </div>
    );
  }

  const priority = PRIORITY_CONFIG[ticket.priority];
  const status = STATUS_CONFIG[ticket.status];

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('tickets')}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-gray-400">{ticket.ticket_number}</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priority.className}`}>
              {priority.label}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
              {status.label}
            </span>
          </div>
        </div>
        {canEdit && (
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <Edit size={15} />
            <span className="hidden sm:inline">Editar</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2 space-y-4 sm:space-y-5">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 sm:p-6">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-3">{ticket.title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed">
              {ticket.description || 'Sin descripción.'}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div className="flex border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
              {(['comments', 'attachments', 'history'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-shrink-0 px-4 sm:px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {tab === 'comments' ? `Comentarios` : tab === 'attachments' ? `Adjuntos (${attachments.length})` : 'Historial'}
                </button>
              ))}
            </div>
            <div className="p-4 sm:p-5">
              {activeTab === 'comments' && (
                <CommentSection
                  ticketId={ticket.id}
                  ticketNumber={ticket.ticket_number}
                  ticketTitle={ticket.title}
                  companyId={ticket.company_id}
                  creatorId={ticket.created_by}
                  assigneeId={ticket.assigned_to}
                />
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-4">
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className={`flex flex-col items-center justify-center gap-2 w-full p-6 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                        uploading
                          ? 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                          : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
                      }`}
                    >
                      {uploading ? (
                        <LoadingSpinner size="md" />
                      ) : (
                        <Upload size={24} className="text-gray-400" />
                      )}
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {uploading ? 'Subiendo archivos...' : 'Haz clic o arrastra archivos aquí'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          Imágenes, PDF, Word, Excel · Máx. 10 MB por archivo
                        </p>
                      </div>
                    </label>
                    {uploadError && (
                      <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                    )}
                  </div>

                  {attachments.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      No hay archivos adjuntos
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                        >
                          {isImage(att.file_type) ? (
                            <button onClick={() => setPreviewImg(att.file_url)} className="flex-shrink-0">
                              <img
                                src={att.file_url}
                                alt={att.file_name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <FileText size={18} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {att.file_name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {formatBytes(att.file_size)} · {new Date(att.created_at).toLocaleDateString('es-ES')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                              href={att.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                            >
                              <Download size={14} />
                            </a>
                            {(att.uploaded_by === profile?.id || profile?.role === 'admin') && (
                              <button
                                onClick={() => handleDeleteAttachment(att)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">Sin cambios registrados</p>
                  ) : history.map((h) => (
                    <div key={h.id} className="flex gap-3 items-start">
                      <Avatar profile={h.user} size="sm" className="mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium text-gray-900 dark:text-white">{h.user?.full_name ?? 'Sistema'}</span>
                          {' cambió '}
                          <span className="font-medium">{FIELD_LABELS[h.field_changed] ?? h.field_changed}</span>
                          {': '}
                          <span className="line-through text-gray-400">{STATUS_LABELS_MAP[h.old_value ?? ''] ?? h.old_value ?? '—'}</span>
                          {' → '}
                          <span className="font-medium text-gray-900 dark:text-white">{STATUS_LABELS_MAP[h.new_value ?? ''] ?? h.new_value ?? '—'}</span>
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(h.created_at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Detalles</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Tag size={12} />Categoría</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">{CATEGORY_LABELS[ticket.category]}</dd>
              </div>
              {ticket.due_date && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Calendar size={12} />Fecha Límite</dt>
                  <dd className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                    {new Date(ticket.due_date).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><Clock size={12} />Creado</dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white mt-0.5">
                  {new Date(ticket.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"><User size={12} />Creado por</dt>
                <dd className="flex items-center gap-2 mt-1">
                  <Avatar profile={ticket.creator} size="sm" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{ticket.creator?.full_name ?? '—'}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mb-1.5">
                  <User size={12} />Asignado a
                </dt>
                <dd>
                  {canAssign ? (
                    <div className="relative" ref={assignDropRef}>
                      <button
                        onClick={openAssignDropdown}
                        className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        {assigning ? (
                          <Loader2 size={16} className="text-gray-400 animate-spin flex-shrink-0" />
                        ) : ticket.assignee ? (
                          <Avatar profile={ticket.assignee} size="sm" className="flex-shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                            <UserX size={10} className="text-gray-400" />
                          </div>
                        )}
                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">
                          {assigning ? 'Asignando…' : ticket.assignee?.full_name ?? 'Sin asignar'}
                        </span>
                        <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                      </button>

                      {assignOpen && (
                        <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden">
                          {/* Search */}
                          <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800">
                            <div className="relative">
                              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                ref={assignSearchRef}
                                type="text"
                                value={assignSearch}
                                onChange={(e) => setAssignSearch(e.target.value)}
                                placeholder="Buscar miembro..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white"
                              />
                            </div>
                          </div>
                          <div className="max-h-56 overflow-y-auto">
                            {loadingAssignUsers ? (
                              <div className="flex justify-center py-6">
                                <Loader2 size={18} className="text-gray-400 animate-spin" />
                              </div>
                            ) : (
                              <>
                                {!assignSearch && (
                                  <button
                                    onClick={() => handleAssign(null)}
                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                  >
                                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center flex-shrink-0">
                                      <UserX size={12} className="text-gray-400" />
                                    </div>
                                    <span className="text-sm text-gray-500 italic flex-1 text-left">Sin asignar</span>
                                    {!ticket.assignee && <Check size={13} className="text-blue-500 flex-shrink-0" />}
                                  </button>
                                )}
                                {assignUsers
                                  .filter((u) =>
                                    u.full_name.toLowerCase().includes(assignSearch.toLowerCase()) ||
                                    u.role.toLowerCase().includes(assignSearch.toLowerCase())
                                  )
                                  .map((u) => (
                                    <button
                                      key={u.id}
                                      onClick={() => handleAssign(u.id)}
                                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                      <Avatar profile={u} size="sm" className="flex-shrink-0" />
                                      <div className="flex-1 text-left min-w-0">
                                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.full_name}</p>
                                        <p className="text-[11px] text-gray-400 capitalize">{u.role}</p>
                                      </div>
                                      {ticket.assignee?.id === u.id && (
                                        <Check size={13} className="text-blue-500 flex-shrink-0" />
                                      )}
                                    </button>
                                  ))
                                }
                                {assignSearch && assignUsers.filter((u) =>
                                  u.full_name.toLowerCase().includes(assignSearch.toLowerCase())
                                ).length === 0 && (
                                  <p className="text-xs text-gray-400 text-center py-4">Sin resultados</p>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {ticket.assignee ? (
                        <>
                          <Avatar profile={ticket.assignee} size="sm" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">{ticket.assignee.full_name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-400">Sin asignar</span>
                      )}
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">SLA</h3>
            <SLABadge slaRecord={ticket.sla_record} />
          </div>
        </div>
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Editar Ticket" size="lg">
        <TicketForm
          ticket={ticket}
          onSave={() => { setEditOpen(false); loadTicket(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {previewImg && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImg(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setPreviewImg(null)}
          >
            <X size={20} />
          </button>
          <img
            src={previewImg}
            alt="Preview"
            className="max-w-full max-h-full rounded-xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
