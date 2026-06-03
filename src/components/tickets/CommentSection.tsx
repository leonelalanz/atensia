import React, { useState, useEffect, useRef } from 'react';
import { Send, Lock, Paperclip, X, FileText, Image as ImageIcon, Loader2, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TicketComment, TicketAttachment } from '../../types';
import Avatar from '../ui/Avatar';
import LoadingSpinner from '../ui/LoadingSpinner';
import { onCommentAdded } from '../../lib/notifications';

interface CommentSectionProps {
  ticketId:     string;
  ticketNumber?: string;
  ticketTitle?:  string;
  companyId?:    string;
  creatorId?:    string | null;
  assigneeId?:   string | null;
}

interface CommentWithAttachments extends TicketComment {
  attachments: TicketAttachment[];
}

const ACCEPTED = 'image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv';
const MAX_MB = 10;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CommentSection({
  ticketId,
  ticketNumber = '',
  ticketTitle  = '',
  companyId    = '',
  creatorId    = null,
  assigneeId   = null,
}: CommentSectionProps) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [comments, setComments] = useState<CommentWithAttachments[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState('');
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  async function loadComments() {
    const { data: cmts } = await supabase
      .from('ticket_comments')
      .select('*, author:profiles(*)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    const { data: atts } = await supabase
      .from('ticket_attachments')
      .select('*')
      .eq('ticket_id', ticketId)
      .not('comment_id', 'is', null);

    const attsByComment: Record<string, TicketAttachment[]> = {};
    (atts ?? []).forEach((a) => {
      if (a.comment_id) {
        attsByComment[a.comment_id] = [...(attsByComment[a.comment_id] ?? []), a as TicketAttachment];
      }
    });

    setComments(
      (cmts ?? []).map((c) => ({ ...(c as TicketComment), attachments: attsByComment[c.id] ?? [] }))
    );
    setLoading(false);
  }

  useEffect(() => { loadComments(); }, [ticketId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [comments]);

  // ── File handling ─────────────────────────────────────────────
  function addFiles(files: FileList | File[]) {
    setFileError('');
    const arr = Array.from(files);
    const valid: File[] = [];
    for (const f of arr) {
      if (f.size > MAX_MB * 1024 * 1024) {
        setFileError(`"${f.name}" supera ${MAX_MB} MB.`);
        continue;
      }
      valid.push(f);
    }
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  async function uploadCommentFiles(commentId: string): Promise<void> {
    if (!profile || pendingFiles.length === 0) return;
    for (const file of pendingFiles) {
      const path = `${profile.id}/${ticketId}/comments/${commentId}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from('attachments')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        await supabase.from('ticket_attachments').insert({
          ticket_id:   ticketId,
          comment_id:  commentId,
          file_name:   file.name,
          file_url:    urlData.publicUrl,
          file_size:   file.size,
          file_type:   file.type,
          uploaded_by: profile.id,
        });
      }
    }
    setPendingFiles([]);
  }

  // ── Submit ────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && pendingFiles.length === 0) return;
    if (!profile) return;
    setSubmitting(true);

    const { data: newComment, error } = await supabase
      .from('ticket_comments')
      .insert({
        ticket_id:   ticketId,
        user_id:     profile.id,
        content:     content.trim() || '📎 Adjunto',
        is_internal: isInternal,
      })
      .select()
      .single();

    if (!error && newComment) {
      // Update SLA first response
      const { data: slaRec } = await supabase
        .from('sla_records').select('*').eq('ticket_id', ticketId).maybeSingle();
      if (slaRec && slaRec.first_response_met === null) {
        const now = new Date();
        await supabase.from('sla_records').update({
          first_response_met: slaRec.first_response_deadline
            ? now <= new Date(slaRec.first_response_deadline) : null,
          first_responded_at: now.toISOString(),
        }).eq('id', slaRec.id);
      }

      await supabase.from('tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      await uploadCommentFiles(newComment.id);

      // Notificaciones de comentario
      if (companyId) {
        await onCommentAdded({
          ticketId,
          ticketNumber,
          title:       ticketTitle,
          companyId,
          creatorId,
          assigneeId,
          commenterId: profile!.id,
          isInternal,
        });
      }

      setContent('');
      await loadComments();
    }
    setSubmitting(false);
  }

  if (loading) {
    return <div className="flex justify-center py-8"><LoadingSpinner /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
        Comentarios ({comments.length})
      </h3>

      {/* Comment list */}
      <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
            No hay comentarios aún. Sé el primero en comentar.
          </p>
        )}
        {comments.map((c) => (
          <div key={c.id} className={`flex gap-3 ${c.is_internal ? 'opacity-85' : ''}`}>
            <Avatar profile={c.author} size="sm" className="mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className={`rounded-2xl px-4 py-3 ${
                c.is_internal
                  ? 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800'
                  : 'bg-gray-50 dark:bg-gray-800'
              }`}>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {c.author?.full_name ?? 'Usuario'}
                  </span>
                  {c.is_internal && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Lock size={10} /> Interno
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">
                    {new Date(c.created_at).toLocaleString('es-ES', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>

                {c.content !== '📎 Adjunto' && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{c.content}</p>
                )}

                {/* Attachments for this comment */}
                {c.attachments.length > 0 && (
                  <div className={`${c.content !== '📎 Adjunto' ? 'mt-3 pt-3 border-t border-gray-200 dark:border-gray-700' : ''} space-y-2`}>
                    {c.attachments.map((att) => (
                      att.file_type.startsWith('image/') ? (
                        <button
                          key={att.id}
                          onClick={() => setPreviewImg(att.file_url)}
                          className="block rounded-xl overflow-hidden max-w-xs hover:opacity-90 transition-opacity"
                        >
                          <img
                            src={att.file_url}
                            alt={att.file_name}
                            className="max-h-48 object-cover rounded-xl"
                          />
                        </button>
                      ) : (
                        <a
                          key={att.id}
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors group max-w-xs"
                        >
                          <FileText size={15} className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-gray-300 truncate flex-1">{att.file_name}</span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{formatBytes(att.file_size)}</span>
                          <Download size={12} className="text-gray-400 group-hover:text-blue-500 flex-shrink-0" />
                        </a>
                      )
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose form */}
      <form onSubmit={handleSubmit} className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escribe un comentario..."
          rows={3}
          className="w-full px-4 py-3 text-sm text-gray-900 dark:text-white bg-white dark:bg-gray-900 focus:outline-none resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e as unknown as React.FormEvent);
          }}
        />

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-2">
            {pendingFiles.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 max-w-[200px]">
                {f.type.startsWith('image/')
                  ? <ImageIcon size={12} className="text-blue-500 flex-shrink-0" />
                  : <FileText size={12} className="text-blue-500 flex-shrink-0" />
                }
                <span className="text-[11px] text-gray-700 dark:text-gray-300 truncate">{f.name}</span>
                <button type="button" onClick={() => removeFile(i)}
                  className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors">
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}

        {fileError && <p className="px-4 pb-2 text-xs text-red-600 dark:text-red-400">{fileError}</p>}

        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            {/* File picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              title="Adjuntar archivos"
            >
              <Paperclip size={14} />
              <span className="hidden sm:inline">Adjuntar</span>
              {pendingFiles.length > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {pendingFiles.length}
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
              className="hidden"
            />

            {/* Nota interna */}
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="rounded"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Lock size={11} />
                Nota interna
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting || (!content.trim() && pendingFiles.length === 0)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--brand-color, #2563eb)' }}
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            Enviar
          </button>
        </div>
      </form>

      {/* Image lightbox */}
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
