import React, { useState } from 'react';
import { 
  Database, ShieldCheck, Key, Copy, Check, Download, 
  ExternalLink, Table, Server, Code, RefreshCw, Terminal, 
  CheckCircle2, AlertTriangle, Play, Sparkles
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SUPABASE_SQL_SCHEMA, SUPABASE_AUTHORIZED_ADMIN_EMAIL } from '../../data/supabaseSqlSchema';

export const SupabaseManager: React.FC = () => {
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<'schema' | 'rls' | 'config' | 'erd'>('schema');
  const [copied, setCopied] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('supabase_project_url') || 'https://tu-proyecto.supabase.co');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('supabase_anon_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'idle' | 'success' | 'warning'; message: string }>({
    status: 'idle',
    message: '',
  });

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SQL_SCHEMA], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vault_supabase_schema.sql';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('supabase_project_url', supabaseUrl);
    localStorage.setItem('supabase_anon_key', supabaseKey);
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
      setTestResult({
        status: 'success',
        message: `Credenciales de Supabase guardadas localmente. La regla RLS asegura permisos exclusivos para ${SUPABASE_AUTHORIZED_ADMIN_EMAIL}.`,
      });
    }, 600);
  };

  return (
    <div
      className={`h-full overflow-y-auto custom-scrollbar p-4 sm:p-8 space-y-6 transition-colors duration-300 ${
        isDark ? 'text-white bg-[#060608]' : 'text-[#0F172A] bg-white'
      }`}
    >
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0066FF]/15 border border-[#0066FF]/30 text-[10px] font-extrabold tracking-widest text-[#0066FF] uppercase">
            <Database className="w-3.5 h-3.5" />
            <span>Base de Datos Relacional PostgreSQL + RLS</span>
          </div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
            Configuración & Políticas Supabase
          </h1>
          <p className={`text-xs sm:text-sm max-w-2xl leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
            Control de acceso a nivel de fila (RLS) configurado para que <strong>únicamente el correo <code className="text-[#0066FF] font-bold">{SUPABASE_AUTHORIZED_ADMIN_EMAIL}</code></strong> pueda publicar y administrar la Bóveda.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="supabase-download-sql-btn"
            onClick={handleDownloadSql}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all ${
              isDark
                ? 'bg-[#0A0A0C] border-[#1E1E24] hover:bg-[#121216] text-[#8E8E93] hover:text-white'
                : 'bg-slate-50 border-[#E2E8F0] hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Descargar .SQL</span>
          </button>

          <button
            id="supabase-copy-sql-btn"
            onClick={handleCopySql}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#0066FF] hover:bg-[#0052FF] text-white shadow-lg shadow-[#0066FF]/25 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>¡Copiado al Portapapeles!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copiar Script SQL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={`flex items-center gap-2 p-1.5 rounded-2xl border w-fit transition-colors ${
          isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-slate-100 border-[#E2E8F0]'
        }`}
      >
        <button
          id="supabase-tab-schema"
          onClick={() => setActiveTab('schema')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'schema'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : isDark
              ? 'text-[#8E8E93] hover:text-white'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Script SQL Completo</span>
        </button>

        <button
          id="supabase-tab-rls"
          onClick={() => setActiveTab('rls')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rls'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : isDark
              ? 'text-[#8E8E93] hover:text-white'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Matriz de Permisos RLS</span>
        </button>

        <button
          id="supabase-tab-erd"
          onClick={() => setActiveTab('erd')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'erd'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : isDark
              ? 'text-[#8E8E93] hover:text-white'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Esquema de Tablas (ERD)</span>
        </button>

        <button
          id="supabase-tab-config"
          onClick={() => setActiveTab('config')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'config'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : isDark
              ? 'text-[#8E8E93] hover:text-white'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Credenciales & Cliente Dart</span>
        </button>
      </div>

      {/* TAB CONTENT: SQL SCHEMA */}
      {activeTab === 'schema' && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-colors ${
              isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-blue-50/50 border-blue-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#0066FF]/20 flex items-center justify-center text-[#0066FF]">
                <Terminal className="w-4 h-4" />
              </div>
              <p className={`text-xs ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Copia este script y pégalo directamente en el <strong>SQL Editor</strong> de tu panel de Supabase. Creará automáticamente las tablas, tipos enum, triggers y políticas RLS con la restricción de <strong>{SUPABASE_AUTHORIZED_ADMIN_EMAIL}</strong>.
              </p>
            </div>
            <button
              onClick={handleCopySql}
              className="shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#0066FF] hover:bg-[#0052FF] text-white transition-all"
            >
              {copied ? '¡Copiado!' : 'Copiar SQL'}
            </button>
          </div>

          <div
            className={`rounded-2xl border overflow-hidden font-mono text-xs shadow-xl transition-colors ${
              isDark ? 'bg-black border-[#1E1E24]' : 'bg-[#0F172A] border-slate-800 text-slate-200'
            }`}
          >
            <div className="px-4 py-3 bg-[#121216] border-b border-[#1E1E24] flex items-center justify-between text-[#8E8E93] text-[11px]">
              <span className="text-white font-bold">vault_supabase_schema.sql</span>
              <span>PostgreSQL 15+ • Row Level Security (RLS)</span>
            </div>
            <pre className="p-5 overflow-x-auto text-[11px] leading-relaxed max-h-[500px] custom-scrollbar text-slate-300">
              <code>{SUPABASE_SQL_SCHEMA}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB CONTENT: RLS POLICIES */}
      {activeTab === 'rls' && (
        <div className="space-y-6">
          {/* Admin Banner */}
          <div
            className={`p-5 rounded-2xl border space-y-2 transition-colors ${
              isDark ? 'bg-[#0A0A0C] border-[#0066FF]/40' : 'bg-blue-50 border-[#0066FF]/30'
            }`}
          >
            <div className="flex items-center gap-2 text-[#0066FF]">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="font-bold text-sm">Regla de Administrador Único Autorizado</h3>
            </div>
            <p className={`text-xs leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              La función de base de datos <code className="text-[#0066FF] font-bold">public.is_authorized_admin()</code> evalúa el token JWT del usuario conectado:
              <br />
              <code className="text-[11px] font-mono text-emerald-400 bg-black/40 px-2 py-0.5 rounded mt-1 inline-block">
                LOWER(auth.jwt() -&gt;&gt; &apos;email&apos;) = &apos;{SUPABASE_AUTHORIZED_ADMIN_EMAIL}&apos;
              </code>
            </p>
          </div>

          {/* Matrix Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Table 1: vault_items */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#0066FF]/10 text-[#0066FF]">
                  public.vault_items
                </span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase">RLS Habilitado</span>
              </div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                Recursos de la Bóveda
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>SELECT:</strong> Permitido a todos los miembros autenticados.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>INSERT:</strong> Únicamente <code className="text-[#0066FF] font-bold">{SUPABASE_AUTHORIZED_ADMIN_EMAIL}</code>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>UPDATE:</strong> Únicamente <code className="text-[#0066FF] font-bold">{SUPABASE_AUTHORIZED_ADMIN_EMAIL}</code>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>DELETE:</strong> Únicamente <code className="text-[#0066FF] font-bold">{SUPABASE_AUTHORIZED_ADMIN_EMAIL}</code>.
                  </span>
                </div>
              </div>
            </div>

            {/* Table 2: storage.objects */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#0066FF]/10 text-[#0066FF]">
                  storage.objects (vault_files)
                </span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase">Bucket Privado</span>
              </div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                Almacenamiento de Archivos Pesados
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>Lectura & Descarga:</strong> Miembros VIP autenticados.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>Subida / Upload:</strong> Únicamente <code className="text-[#0066FF] font-bold">{SUPABASE_AUTHORIZED_ADMIN_EMAIL}</code>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>Eliminación:</strong> Únicamente <code className="text-[#0066FF] font-bold">{SUPABASE_AUTHORIZED_ADMIN_EMAIL}</code>.
                  </span>
                </div>
              </div>
            </div>

            {/* Table 3: vault_comments */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#0066FF]/10 text-[#0066FF]">
                  public.vault_comments
                </span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase">RLS Habilitado</span>
              </div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                Foro de Debate Privado
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>INSERT:</strong> Cualquier miembro autenticado con su propio <code className="text-[11px] font-mono">auth.uid()</code>.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>DELETE:</strong> Solo el autor del comentario o el Administrador Único.
                  </span>
                </div>
              </div>
            </div>

            {/* Table 4: profiles */}
            <div
              className={`p-5 rounded-2xl border space-y-3 transition-colors ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-[#0066FF]/10 text-[#0066FF]">
                  public.profiles
                </span>
                <span className="text-[10px] text-emerald-500 font-bold uppercase">Trigger Automático</span>
              </div>
              <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                Perfiles de Miembros
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>
                    Trigger <code className="font-mono text-[11px]">handle_new_user()</code> asigna rol <code className="font-mono text-[#0066FF] font-bold">&apos;admin&apos;</code> si el correo es <code className="font-bold">{SUPABASE_AUTHORIZED_ADMIN_EMAIL}</code>, o <code className="font-mono">&apos;vip_member&apos;</code> para cualquier otro.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ERD SCHEMAS */}
      {activeTab === 'erd' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* profiles Table Schema */}
            <div
              className={`p-4 rounded-2xl border space-y-3 font-mono text-xs transition-colors ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              <div className="font-bold text-[#0066FF] flex items-center gap-1.5 pb-2 border-b border-[#1E1E24]">
                <Table className="w-4 h-4" />
                <span>profiles</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-yellow-400">id</span><span className="text-[#8E8E93]">UUID (PK)</span></div>
                <div className="flex justify-between"><span className="text-white">email</span><span className="text-[#8E8E93]">TEXT (UQ)</span></div>
                <div className="flex justify-between"><span className="text-white">display_name</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-[#0066FF] font-bold">role</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-white">tier</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-white">created_at</span><span className="text-[#8E8E93]">TIMESTAMPTZ</span></div>
              </div>
            </div>

            {/* vault_items Table Schema */}
            <div
              className={`p-4 rounded-2xl border space-y-3 font-mono text-xs transition-colors ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              <div className="font-bold text-[#0066FF] flex items-center gap-1.5 pb-2 border-b border-[#1E1E24]">
                <Table className="w-4 h-4" />
                <span>vault_items</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-yellow-400">id</span><span className="text-[#8E8E93]">UUID (PK)</span></div>
                <div className="flex justify-between"><span className="text-white">title</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-white">category</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-white">file_size</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-white">download_url</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-white">cover_image</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-emerald-400">likes_count</span><span className="text-[#8E8E93]">INTEGER</span></div>
                <div className="flex justify-between"><span className="text-white">author_id</span><span className="text-[#8E8E93]">UUID (FK)</span></div>
              </div>
            </div>

            {/* vault_comments Table Schema */}
            <div
              className={`p-4 rounded-2xl border space-y-3 font-mono text-xs transition-colors ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              <div className="font-bold text-[#0066FF] flex items-center gap-1.5 pb-2 border-b border-[#1E1E24]">
                <Table className="w-4 h-4" />
                <span>vault_comments</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-yellow-400">id</span><span className="text-[#8E8E93]">UUID (PK)</span></div>
                <div className="flex justify-between"><span className="text-purple-400">vault_item_id</span><span className="text-[#8E8E93]">UUID (FK)</span></div>
                <div className="flex justify-between"><span className="text-purple-400">user_id</span><span className="text-[#8E8E93]">UUID (FK)</span></div>
                <div className="flex justify-between"><span className="text-white">user_name</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-white">text</span><span className="text-[#8E8E93]">TEXT</span></div>
                <div className="flex justify-between"><span className="text-white">created_at</span><span className="text-[#8E8E93]">TIMESTAMPTZ</span></div>
              </div>
            </div>

            {/* vault_likes Table Schema */}
            <div
              className={`p-4 rounded-2xl border space-y-3 font-mono text-xs transition-colors ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-sm'
              }`}
            >
              <div className="font-bold text-[#0066FF] flex items-center gap-1.5 pb-2 border-b border-[#1E1E24]">
                <Table className="w-4 h-4" />
                <span>vault_likes</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between"><span className="text-yellow-400">id</span><span className="text-[#8E8E93]">UUID (PK)</span></div>
                <div className="flex justify-between"><span className="text-purple-400">vault_item_id</span><span className="text-[#8E8E93]">UUID (FK)</span></div>
                <div className="flex justify-between"><span className="text-purple-400">user_id</span><span className="text-[#8E8E93]">UUID (FK)</span></div>
                <div className="flex justify-between"><span className="text-white">created_at</span><span className="text-[#8E8E93]">TIMESTAMPTZ</span></div>
                <div className="pt-2 text-[10px] text-emerald-400">UNIQUE(vault_item_id, user_id)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CREDENTIALS & DART CODE */}
      {activeTab === 'config' && (
        <div className="space-y-6">
          <form
            onSubmit={handleSaveConfig}
            className={`p-6 rounded-2xl border space-y-4 transition-colors ${
              isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-slate-50 border-[#E2E8F0]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Key className="w-5 h-5 text-[#0066FF]" />
              <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                Configuración del Cliente Supabase
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-xs font-semibold uppercase mb-1.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  Project URL
                </label>
                <input
                  type="text"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-mono border focus:outline-none focus:border-[#0066FF] transition-colors ${
                    isDark
                      ? 'bg-black border-[#1E1E24] text-white'
                      : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                  }`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold uppercase mb-1.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  Anon Public Key
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                  className={`w-full rounded-xl px-4 py-2.5 text-xs font-mono border focus:outline-none focus:border-[#0066FF] transition-colors ${
                    isDark
                      ? 'bg-black border-[#1E1E24] text-white'
                      : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                disabled={isTesting}
                className="px-5 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
              >
                {isTesting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Guardar Parámetros de Conexión</span>
              </button>
            </div>

            {testResult.status === 'success' && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{testResult.message}</span>
              </div>
            )}
          </form>

          {/* Flutter Supabase initialization code */}
          <div
            className={`p-6 rounded-2xl border space-y-3 font-mono text-xs transition-colors ${
              isDark ? 'bg-black border-[#1E1E24] text-slate-300' : 'bg-slate-900 border-slate-800 text-slate-200'
            }`}
          >
            <div className="text-white font-bold flex items-center justify-between">
              <span>lib/core/config/supabase_config.dart (Código Flutter)</span>
              <span className="text-[10px] text-[#0066FF]">supabase_flutter: ^2.8.0</span>
            </div>
            <pre className="overflow-x-auto text-[11px] leading-relaxed text-[#3385FF]">
{`import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseConfig {
  static const String url = '${supabaseUrl}';
  static const String anonKey = '${supabaseKey}';

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: url,
      anonKey: anonKey,
    );
  }

  static SupabaseClient get client => Supabase.instance.client;
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
