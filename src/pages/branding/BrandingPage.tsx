import React, { useRef, useState, useEffect } from 'react';
import { Save, Palette, Eye, Upload, Link, X, ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePlan } from '../../hooks/usePlan';
import { useBrand } from '../../contexts/BrandContext';
import UpgradePrompt from '../../components/ui/UpgradePrompt';

const PRESET_COLORS = [
  '#2563eb', '#0ea5e9', '#0891b2', '#0d9488', '#16a34a',
  '#ca8a04', '#ea580c', '#dc2626', '#be185d', '#7c3aed',
  '#1e293b', '#374151', '#6b7280',
];

type LogoMode = 'url' | 'file';

interface BrandForm {
  name: string;
  logo_url: string;
  primary_color: string;
  favicon_url: string;
}

export default function BrandingPage() {
  const { profile, refreshProfile } = useAuth();
  const { canUseBranding } = usePlan();
  const { setAtensiaLogoUrl, setAtensiaFaviconUrl } = useBrand();
  const isSuperAdmin = profile?.role === 'superadmin';
  const company = (profile as any)?.company;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [logoMode, setLogoMode] = useState<LogoMode>('url');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Inicializar formulario según rol
  const getInitialForm = () => {
    if (isSuperAdmin) {
      const atensiaLogo = typeof window !== 'undefined' ? localStorage.getItem('atensia_logo_url') || '' : '';
      const atensiaColor = typeof window !== 'undefined' ? localStorage.getItem('atensia_primary_color') || '#1e293b' : '#1e293b';
      const atensiaFavicon = typeof window !== 'undefined' ? localStorage.getItem('atensia_favicon_url') || '' : '';
      return { name: 'Atensia', logo_url: atensiaLogo, primary_color: atensiaColor, favicon_url: atensiaFavicon };
    }
    return {
      name: company?.name ?? '',
      logo_url: company?.logo_url ?? '',
      primary_color: company?.primary_color ?? '#2563eb',
      favicon_url: '',
    };
  };

  const [form, setForm] = useState(getInitialForm());

  // Cargar logo de Atensia cuando cambia en localStorage
  useEffect(() => {
    if (isSuperAdmin) {
      const handleLogoChange = () => {
        const atensiaLogo = localStorage.getItem('atensia_logo_url') || '';
        setForm(f => ({ ...f, logo_url: atensiaLogo }));
      };
      window.addEventListener('atensiaLogoChanged', handleLogoChange);
      return () => window.removeEventListener('atensiaLogoChanged', handleLogoChange);
    }
  }, [isSuperAdmin]);

  // Auto-save cuando cambien logo, color o favicon
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!uploadingLogo && !uploadingFavicon) {
        handleAutoSave();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [form.logo_url, form.primary_color, form.favicon_url, uploadingLogo, uploadingFavicon]);

  async function handleAutoSave() {
    if (isSuperAdmin) {
      // Superadmin: guarda logo, color y favicon de Atensia
      setAtensiaLogoUrl?.(form.logo_url);
      setAtensiaFaviconUrl?.(form.favicon_url);
      localStorage.setItem('atensia_primary_color', form.primary_color);
      window.dispatchEvent(new Event('atensiaLogoChanged'));
      window.dispatchEvent(new Event('atensiaColorChanged'));
      window.dispatchEvent(new Event('atensiaFaviconChanged'));
    } else if (profile?.company_id) {
      // Admin: guarda su empresa
      const { error } = await supabase.from('companies').update({
        name: form.name,
        logo_url: form.logo_url,
        primary_color: form.primary_color,
      }).eq('id', profile.company_id);

      if (!error) {
        await refreshProfile();
      }
    }
  }

  // ── Logo upload ──────────────────────────────────────────────
  async function uploadLogoFile(file: File) {
    const companyId = isSuperAdmin ? 'atensia' : profile?.company_id;
    if (!companyId) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('El archivo es demasiado grande. Máximo 2 MB.');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Formato no soportado. Usa PNG, JPG, WebP, SVG o GIF.');
      return;
    }

    setUploadingLogo(true);
    setError('');

    const ext = file.name.split('.').pop();
    const path = `${companyId}/logo-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setError(`Error al subir imagen: ${upErr.message}`);
      setUploadingLogo(false);
      return;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path);
    setForm((f) => ({ ...f, logo_url: data.publicUrl }));
    setUploadingLogo(false);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadLogoFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogoFile(file);
  }

  function clearLogo() {
    setForm((f) => ({ ...f, logo_url: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // ── Favicon upload ───────────────────────────────────────────
  async function uploadFaviconFile(file: File) {
    const companyId = isSuperAdmin ? 'atensia' : profile?.company_id;
    if (!companyId) return;

    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('El archivo es demasiado grande. Máximo 2 MB.');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/gif'];
    if (!allowed.includes(file.type)) {
      setError('Formato no soportado. Usa PNG, JPG, WebP, SVG, ICO o GIF.');
      return;
    }

    setUploadingFavicon(true);
    setError('');

    const ext = file.name.split('.').pop();
    const path = `${companyId}/favicon-${Date.now()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { upsert: true, contentType: file.type });

    if (upErr) {
      setError(`Error al subir favicon: ${upErr.message}`);
      setUploadingFavicon(false);
      return;
    }

    const { data } = supabase.storage.from('logos').getPublicUrl(path);
    setForm((f) => ({ ...f, favicon_url: data.publicUrl }));
    setUploadingFavicon(false);
  }

  function handleFaviconChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFaviconFile(file);
    e.target.value = '';
  }

  function clearFavicon() {
    setForm((f) => ({ ...f, favicon_url: '' }));
    if (faviconInputRef.current) faviconInputRef.current.value = '';
  }

  // ── Save ─────────────────────────────────────────────────────
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return; }
    setSaving(true);
    setError('');

    if (isSuperAdmin) {
      setAtensiaLogoUrl?.(form.logo_url);
      setAtensiaFaviconUrl?.(form.favicon_url);
      localStorage.setItem('atensia_primary_color', form.primary_color);
      window.dispatchEvent(new Event('atensiaLogoChanged'));
      window.dispatchEvent(new Event('atensiaColorChanged'));
      window.dispatchEvent(new Event('atensiaFaviconChanged'));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const { error: err } = await supabase.from('companies').update({
        name: form.name,
        logo_url: form.logo_url,
        primary_color: form.primary_color,
      }).eq('id', profile?.company_id);

      if (err) {
        setError(err.message);
      } else {
        await refreshProfile();
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    }
    setSaving(false);
  }

  if (!isSuperAdmin && !canUseBranding) {
    return (
      <UpgradePrompt
        feature="Branding propio"
        description="Personaliza el logo, nombre y colores de tu empresa. Disponible desde el plan Pro."
        requiredPlan="professional"
        variant="page"
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Configuración de Marca</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          {isSuperAdmin ? 'Personaliza la marca de Atensia' : 'Personaliza la identidad visual de tu empresa en la plataforma'}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
        <form onSubmit={handleSave} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Nombre {isSuperAdmin ? '' : '(de la empresa)'}
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={isSuperAdmin}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Logo
            </label>

            {/* Mode tabs */}
            <div className="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setLogoMode('file')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  logoMode === 'file'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Upload size={13} /> Subir archivo
              </button>
              <button
                type="button"
                onClick={() => setLogoMode('url')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  logoMode === 'url'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <Link size={13} /> Pegar URL
              </button>
            </div>

            {/* File upload zone */}
            {logoMode === 'file' && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => !uploadingLogo && fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all p-6 ${
                  dragOver
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                } ${uploadingLogo ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 size={24} className="text-blue-500 animate-spin" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subiendo imagen...</p>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <ImageIcon size={20} className="text-gray-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Arrastra tu logo aquí o <span className="text-blue-600 dark:text-blue-400">selecciona un archivo</span>
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        PNG, JPG, WebP, SVG o GIF — máx. 2 MB
                      </p>
                    </div>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml,image/gif"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            )}

            {/* URL input */}
            {logoMode === 'url' && (
              <input
                type="text"
                value={form.logo_url}
                onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))}
                placeholder="https://ejemplo.com/logo.png"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}

            {/* Logo preview */}
            {form.logo_url && (
              <div className="mt-3 flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <Eye size={14} className="text-gray-400 flex-shrink-0" />
                <img
                  src={form.logo_url}
                  alt="Logo preview"
                  className="h-10 max-w-[200px] rounded-lg object-contain bg-white dark:bg-gray-700 px-2 py-1 border border-gray-200 dark:border-gray-600"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    setError('No se pudo cargar la imagen. Verifica la URL.');
                  }}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
                  {form.logo_url.length > 50 ? `...${form.logo_url.slice(-40)}` : form.logo_url}
                </span>
                <button
                  type="button"
                  onClick={clearLogo}
                  className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Quitar logo"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Favicon */}
          {isSuperAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Favicon
              </label>
              <div className="flex items-center gap-3 mb-3">
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg,image/webp,image/svg+xml,image/gif"
                  onChange={handleFaviconChange}
                  disabled={uploadingFavicon}
                  className="flex-1 px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 dark:file:bg-gray-700"
                />
                {uploadingFavicon && <Loader2 size={16} className="text-blue-500 animate-spin" />}
              </div>
              {form.favicon_url && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <Eye size={14} className="text-gray-400 flex-shrink-0" />
                  <img
                    src={form.favicon_url}
                    alt="Favicon preview"
                    className="w-6 h-6 rounded border border-gray-200 dark:border-gray-600 flex-shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      setError('No se pudo cargar el favicon. Verifica la URL.');
                    }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">
                    {form.favicon_url.length > 50 ? `...${form.favicon_url.slice(-40)}` : form.favicon_url}
                  </span>
                  <button
                    type="button"
                    onClick={clearFavicon}
                    className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Quitar favicon"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Color corporativo principal
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, primary_color: color }))}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    form.primary_color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.primary_color}
                onChange={(e) => setForm((f) => ({ ...f, primary_color: e.target.value }))}
                className="h-10 w-20 rounded-xl border border-gray-300 dark:border-gray-700 cursor-pointer"
              />
              <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{form.primary_color}</span>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
              <Palette size={13} />
              Vista previa
            </p>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold overflow-hidden flex-shrink-0"
                style={{ backgroundColor: form.primary_color }}
              >
                {form.logo_url ? (
                  <img
                    src={form.logo_url}
                    alt="logo"
                    className="w-full h-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  form.name.charAt(0).toUpperCase() || 'A'
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{form.name || 'Nombre'}</p>
                <p className="text-xs" style={{ color: form.primary_color }}>Atensia</p>
              </div>
            </div>
            <button
              type="button"
              disabled
              className="mt-3 px-4 py-1.5 rounded-lg text-white text-xs font-medium"
              style={{ backgroundColor: form.primary_color }}
            >
              Ejemplo de botón
            </button>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={saving || uploadingLogo}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: form.primary_color }}
            >
              <Save size={16} />
              {saving ? 'Guardando...' : 'Guardar Marca'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                ¡Marca actualizada!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
