import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, FileText, Image as ImageIcon, Paperclip, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Profile, Ticket, TicketAttachment, TicketPriority, TicketCategory, TicketStatus, SLAPolicy } from '../../types';
import { calculateSLADeadlines } from '../../lib/sla';
import {
  onTicketCreated,
  onTicketAssigned,
  onTicketStatusChanged,
  onTicketEscalated,
} from '../../lib/notifications';

interface TicketFormProps {
  ticket?: Ticket;
  onSave: () => void;
  onCancel: () => void;
}

const PRIORITIES: { value: TicketPriority; label: string }[] = [
  { value: 'critical', label: 'Crítica' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Media' },
  { value: 'low', label: 'Baja' },
];

const CATEGORIES: { value: TicketCategory; label: string }[] = [
  { value: 'soporte', label: 'Soporte' },
  { value: 'bug', label: 'Bug' },
  { value: 'solicitud', label: 'Solicitud' },
  { value: 'consulta', label: 'Consulta' },
  { value: 'otro', label: 'Otro' },
];

const STATUSES: { value: TicketStatus; label: string }[] = [
  { value: 'open', label: 'Abierto' },
  { value: 'in_progress', label: 'En Progreso' },
  { value: 'resolved', label: 'Resuelto' },
  { value: 'closed', label: 'Cerrado' },
];

const ACCEPTED = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv';
const MAX_MB = 10;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(file: File | TicketAttachment) {
  const type = 'type' in file ? file.type : (file as TicketAttachment).file_type;
  return type.startsWith('image/');
}

export default function TicketForm({ ticket, onSave, onCancel }: TicketFormProps) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [slaPolicy, setSlaPolicy] = useState<SLAPolicy[]>([]);

  // Attachments
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<TicketAttachment[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState('');

  const [form, setForm] = useState({
    title:       ticket?.title ?? '',
    description: ticket?.description ?? '',
    priority:    ticket?.priority ?? 'medium' as TicketPriority,
    category:    ticket?.category ?? 'soporte' as TicketCategory,
    status:      ticket?.status ?? 'open' as TicketStatus,
    assigned_to: ticket?.assigned_to ?? '',
    due_date:    ticket?.due_date ? ticket.due_date.slice(0, 16) : '',
  });

  const canAssign = profile?.role === 'admin' || profile?.role === 'developer';

  useEffect(() => {
    if (!profile?.company_id) return;

    // Load users - admins see users from their company and client companies
    (async () => {
      let companyIds = new Set<string>();

      if (profile.role === 'admin') {
        companyIds.add(profile.company_id);
        const { data: clientCompanies } = await supabase
          .from('client_companies')
          .select('client_company_id')
          .eq('admin_company_id', profile.company_id);
        if (clientCompanies) {
          clientCompanies.forEach(c => companyIds.add(c.client_company_id));
        }
      } else {
        companyIds.add(profile.company_id);
      }

      const companyIdArray = Array.from(companyIds);

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('company_id', companyIdArray)
        .eq('is_active', true);
      setUsers(data ?? []);
    })();

    supabase.from('sla_policies').select('*').eq('company_id', profile.company_id)
      .then(({ data }) => setSlaPolicy(data ?? []));

    if (ticket?.id) {
      supabase.from('ticket_attachments').select('*').eq('ticket_id', ticket.id).is('comment_id', null)
        .order('created_at', { ascending: false })
        .then(({ data }) => setExistingAttachments((data ?? []) as TicketAttachment[]));
    }
  }, [profile?.company_id, profile?.role, ticket?.id]);

  // ── Paste handler ─────────────────────────────────────────────
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (!dropZoneRef.current) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const type = items[i].type;
          if (type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) files.push(file);
          }
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        addFiles(files);
      }
    }

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ── File handling ─────────────────────────────────────────────
  function addFiles(files: FileList | File[]) {
    setFileError('');
    const arr = Array.from(files);
    const valid: File[] = [];
    for (const f of arr) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setFileError(`"${f.name}" supera el límite de ${MAX_MB} MB.`);
        continue;
      }
      valid.push(f);
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function deleteExisting(att: TicketAttachment) {
    const urlParts = att.file_url.split('/attachments/');
    if (urlParts.length > 1) {
      await supabase.storage.from('attachments').remove([urlParts[1]]);
    }
    await supabase.from('ticket_attachments').delete().eq('id', att.id);
    setExistingAttachments((prev) => prev.filter((a) => a.id !== att.id));
  }

  async function uploadFiles(ticketId: string) {
    if (!profile || pendingFiles.length === 0) return;
    setUploadingFiles(true);
    for (const file of pendingFiles) {
      const path = `${profile.id}/${ticketId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        await supabase.from('ticket_attachments').insert({
          ticket_id:   ticketId,
          file_name:   file.name,
          file_url:    urlData.publicUrl,
          file_size:   file.size,
          file_type:   file.type,
          uploaded_by: profile.id,
        });
      }
    }
    setUploadingFiles(false);
    setPendingFiles([]);
  }

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setError('El título es obligatorio.'); return; }
    if (!profile) return;
    setLoading(true);
    setError('');

    try {
      if (ticket) {
        const changes: { field: string; old: string; new: string }[] = [];
        if (form.status !== ticket.status)         changes.push({ field: 'status',      old: ticket.status,            new: form.status });
        if (form.priority !== ticket.priority)     changes.push({ field: 'priority',    old: ticket.priority,          new: form.priority });
        if (form.assigned_to !== (ticket.assigned_to ?? '')) changes.push({ field: 'assigned_to', old: ticket.assigned_to ?? '', new: form.assigned_to });

        const updateData: Record<string, unknown> = {
          title: form.title, description: form.description,
          priority: form.priority, category: form.category,
          status: form.status, assigned_to: form.assigned_to || null,
          due_date: form.due_date || null, updated_at: new Date().toISOString(),
        };
        if (form.status === 'resolved' && ticket.status !== 'resolved') updateData.resolved_at = new Date().toISOString();
        if (form.status === 'closed'   && ticket.status !== 'closed')   updateData.closed_at   = new Date().toISOString();

        const { error: err } = await supabase.from('tickets').update(updateData).eq('id', ticket.id);
        if (err) throw err;

        for (const ch of changes) {
          await supabase.from('ticket_history').insert({
            ticket_id: ticket.id, user_id: profile.id,
            field_changed: ch.field, old_value: ch.old, new_value: ch.new,
          });
        }

        if (form.status === 'resolved' || form.status === 'closed') {
          const { data: slaRec } = await supabase.from('sla_records').select('*').eq('ticket_id', ticket.id).maybeSingle();
          if (slaRec) {
            const now = new Date();
            await supabase.from('sla_records').update({
              resolution_met: slaRec.resolution_deadline ? now <= new Date(slaRec.resolution_deadline) : null,
            }).eq('id', slaRec.id);
          }
        }

        await uploadFiles(ticket.id);

        // ── Notificaciones al editar ──────────────────────────────
        const assignee = users.find(u => u.id === form.assigned_to);
        const prevAssignee = users.find(u => u.id === ticket.assigned_to);
        const base = {
          ticketId:     ticket.id,
          ticketNumber: ticket.ticket_number,
          title:        form.title,
          companyId:    profile.company_id!,
          companyName:  profile.company?.name,
          byUserId:     profile.id,
        };

        // Estado cambió
        if (form.status !== ticket.status) {
          await onTicketStatusChanged({
            ...base,
            oldStatus:  ticket.status,
            newStatus:  form.status,
            creatorId:  ticket.created_by,
            assigneeId: form.assigned_to || ticket.assigned_to || null,
          });
        }

        // Prioridad escalada a crítico
        if (form.priority !== ticket.priority && form.priority === 'critical') {
          await onTicketEscalated({
            ...base,
            oldPriority: ticket.priority,
            newPriority: form.priority,
            creatorId:   ticket.created_by,
            assigneeId:  form.assigned_to || ticket.assigned_to || null,
          });
        }

        // Reasignación
        if (form.assigned_to !== (ticket.assigned_to ?? '')) {
          await onTicketAssigned({
            ...base,
            newAssigneeId:  form.assigned_to || null,
            newAssigneeName: assignee?.full_name,
            prevAssigneeId: ticket.assigned_to || null,
          });
        }
      } else {
        const { data: newTicket, error: err } = await supabase
          .from('tickets')
          .insert({
            company_id:  profile.company_id!,
            title:       form.title,
            description: form.description,
            priority:    form.priority,
            category:    form.category,
            status:      form.status,
            created_by:  profile.id,
            assigned_to: form.assigned_to || null,
            due_date:    form.due_date || null,
          })
          .select()
          .single();
        if (err) throw err;

        const { firstResponseDeadline, resolutionDeadline } = calculateSLADeadlines(
          form.priority, newTicket.created_at, slaPolicy
        );
        await supabase.from('sla_records').insert({
          ticket_id:              newTicket.id,
          first_response_deadline: firstResponseDeadline.toISOString(),
          resolution_deadline:     resolutionDeadline.toISOString(),
        });

        await uploadFiles(newTicket.id);

        // ── Notificaciones al crear ───────────────────────────────
        const assigneeForNew = users.find(u => u.id === form.assigned_to);
        await onTicketCreated({
          ticketId:     newTicket.id,
          ticketNumber: newTicket.ticket_number,
          title:        form.title,
          description:  form.description,
          priority:     form.priority,
          companyId:    profile.company_id!,
          companyName:  profile.company?.name,
          creatorId:    profile.id,
          assigneeId:   form.assigned_to || null,
        });
      }

      onSave();
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Error al guardar el ticket.');
    } finally {
      setLoading(false);
    }
  }

  const isBusy = loading || uploadingFiles;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Título */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Título *</label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Describe brevemente el problema..."
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Descripción</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Describe el problema en detalle..."
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Prioridad + Categoría */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Prioridad</label>
          <select value={form.priority} onChange={(e) => set('priority', e.target.value as TicketPriority)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Categoría</label>
          <select value={form.category} onChange={(e) => set('category', e.target.value as TicketCategory)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      {/* Estado (solo edición) */}
      {ticket && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Estado</label>
          <select value={form.status} onChange={(e) => set('status', e.target.value as TicketStatus)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      )}

      {/* Asignar - Solo Admin y Developer */}
      {canAssign && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Asignar a</label>
          <select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Sin asignar</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({u.role})</option>)}
          </select>
        </div>
      )}

      {/* Fecha límite */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Fecha Límite</label>
        <input type="datetime-local" value={form.due_date} onChange={(e) => set('due_date', e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      {/* ── Adjuntos ─────────────────────────────────────────── */}
      <div>
        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Paperclip size={14} /> Adjuntos
        </label>

        {/* Drop zone */}
        <div
          ref={dropZoneRef}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-2 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
            dragOver
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
          }`}
        >
          <Upload size={20} className="text-gray-400" />
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Arrastra archivos, <span className="text-blue-600 dark:text-blue-400 font-medium">selecciona</span> o <span className="text-blue-600 dark:text-blue-400 font-medium">pega</span> imágenes
          </p>
          <p className="text-[11px] text-gray-400">Imágenes, PDF, Word, Excel · Máx. {MAX_MB} MB</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED}
            onChange={(e) => e.target.files && addFiles(e.target.files)}
            className="hidden"
          />
        </div>

        {fileError && <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{fileError}</p>}

        {/* Archivos nuevos pendientes */}
        {pendingFiles.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {pendingFiles.map((f, i) => (
              <li key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                {isImage(f)
                  ? <ImageIcon size={15} className="text-blue-500 flex-shrink-0" />
                  : <FileText size={15} className="text-blue-500 flex-shrink-0" />
                }
                <span className="text-xs text-gray-800 dark:text-gray-200 flex-1 truncate">{f.name}</span>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{formatBytes(f.size)}</span>
                <button type="button" onClick={() => removeFile(i)}
                  className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors">
                  <X size={13} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Adjuntos existentes (edición) */}
        {existingAttachments.length > 0 && (
          <div className="mt-2 space-y-1.5">
            <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">Ya adjuntados</p>
            {existingAttachments.map((att) => (
              <div key={att.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                {att.file_type.startsWith('image/')
                  ? <img src={att.file_url} alt={att.file_name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                  : <FileText size={15} className="text-gray-400 flex-shrink-0" />
                }
                <a href={att.file_url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 dark:text-blue-400 flex-1 truncate hover:underline">{att.file_name}</a>
                <span className="text-[11px] text-gray-400 flex-shrink-0">{formatBytes(att.file_size)}</span>
                <button type="button" onClick={() => deleteExisting(att)}
                  className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-red-500 transition-colors">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          Cancelar
        </button>
        <button type="submit" disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: 'var(--brand-color, #2563eb)' }}>
          {isBusy && <Loader2 size={14} className="animate-spin" />}
          {isBusy ? 'Guardando...' : ticket ? 'Actualizar Ticket' : 'Crear Ticket'}
        </button>
      </div>
    </form>
  );
}
