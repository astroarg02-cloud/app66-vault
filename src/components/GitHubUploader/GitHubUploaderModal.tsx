import React, { useState } from 'react';
import { 
  Github, X, ArrowUpRight, CheckCircle2, AlertCircle, 
  Loader2, KeyRound, FolderGit2, Sparkles, ExternalLink, RefreshCw
} from 'lucide-react';
import { GitHubService, GitHubUploadProgress } from '../../services/githubService';
import { useTheme } from '../../context/ThemeContext';

interface GitHubUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubUploaderModal: React.FC<GitHubUploaderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isDark } = useTheme();
  const [repoInput, setRepoInput] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [branchInput, setBranchInput] = useState('main');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<GitHubUploadProgress | null>(null);

  if (!isOpen) return null;

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoInput.trim() || !tokenInput.trim()) return;

    let owner = '';
    let repo = '';

    // Handle full URL or owner/repo format
    const cleanedInput = repoInput.trim().replace('https://github.com/', '').replace(/\/$/, '');
    const parts = cleanedInput.split('/');
    if (parts.length >= 2) {
      owner = parts[0];
      repo = parts[1];
    } else {
      setProgress({
        total: 0,
        current: 0,
        currentFile: '',
        status: 'error',
        message: 'Por favor ingresa el formato "usuario/repositorio" (ejemplo: astroarg02/vault-flutter-app).',
      });
      return;
    }

    setIsUploading(true);

    await GitHubService.uploadFlutterCodebase(
      owner,
      repo,
      tokenInput,
      branchInput.trim() || 'main',
      (prog) => setProgress(prog)
    );

    setIsUploading(false);
  };

  const percentage = progress && progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300 ${
          isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24] text-white'
            : 'bg-white border-[#CBD5E1] text-[#0F172A]'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between ${
            isDark ? 'border-[#1E1E24] bg-[#0E0E12]' : 'border-[#E2E8F0] bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black border border-white/20 flex items-center justify-center text-white shadow-md">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">
                  Subir Proyecto Flutter (Android & iOS)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/30">
                  1-CLIC
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Sube automáticamente el código Dart, configuración para iPhone (iOS) y Android (APK) con GitHub Actions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'border-[#1E1E24] hover:bg-[#1A1A22] text-[#8E8E93] hover:text-white'
                : 'border-[#E2E8F0] hover:bg-slate-200 text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {!progress || progress.status === 'idle' ? (
            <form onSubmit={handleStartUpload} className="space-y-4">
              {/* Repo field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FolderGit2 className="w-3.5 h-3.5 text-[#0066FF]" />
                  <span>Tu Repositorio en GitHub</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={repoInput}
                    onChange={(e) => setRepoInput(e.target.value)}
                    placeholder="usuario/nombre-del-repo (ej: astroarg02/vault-app)"
                    className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono border focus:outline-none focus:border-[#0066FF] ${
                      isDark
                        ? 'bg-[#121216] border-[#1E1E24] text-white placeholder-[#5A5A62]'
                        : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8]'
                    }`}
                  />
                </div>
              </div>

              {/* GitHub Token field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Personal Access Token (PAT) de GitHub</span>
                  </label>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=Subir+Flutter+App+Vault"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-[#0066FF] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Generar token (30 seg)</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="password"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className={`w-full rounded-xl px-3.5 py-2.5 text-xs font-mono border focus:outline-none focus:border-[#0066FF] ${
                    isDark
                      ? 'bg-[#121216] border-[#1E1E24] text-white placeholder-[#5A5A62]'
                      : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8]'
                  }`}
                />
                <p className={`text-[11px] ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  Solo necesita el permiso <strong>repo</strong> (o <em>Contents: Read & write</em>) para crear los archivos en tu repositorio.
                </p>
              </div>

              {/* Branch field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider">
                  Rama Destino
                </label>
                <input
                  type="text"
                  value={branchInput}
                  onChange={(e) => setBranchInput(e.target.value)}
                  placeholder="main"
                  className={`w-full rounded-xl px-3.5 py-2 text-xs font-mono border focus:outline-none focus:border-[#0066FF] ${
                    isDark
                      ? 'bg-[#121216] border-[#1E1E24] text-white'
                      : 'bg-white border-[#CBD5E1] text-[#0F172A]'
                  }`}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white text-xs font-bold tracking-wide transition-all shadow-lg shadow-[#0066FF]/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Subir Proyecto Flutter y Compilar para Android & iPhone</span>
                </button>
              </div>
            </form>
          ) : (
            /* Progress & Status View */
            <div className="space-y-5 py-2">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2">
                    {progress.status === 'uploading' && (
                      <Loader2 className="w-4 h-4 text-[#0066FF] animate-spin" />
                    )}
                    {progress.status === 'completed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    {progress.status === 'error' && (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span>{progress.message}</span>
                  </span>
                  <span className="font-mono text-[#0066FF]">{percentage}%</span>
                </div>

                <div className={`w-full h-3 rounded-full overflow-hidden ${isDark ? 'bg-[#1E1E24]' : 'bg-slate-200'}`}>
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      progress.status === 'completed'
                        ? 'bg-emerald-500'
                        : progress.status === 'error'
                        ? 'bg-red-500'
                        : 'bg-[#0066FF]'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {/* Current file upload status */}
              {progress.currentFile && progress.status === 'uploading' && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
                    isDark ? 'bg-[#121216] border-[#1E1E24] text-[#8E8E93]' : 'bg-slate-50 border-[#E2E8F0] text-[#64748B]'
                  }`}
                >
                  <span className="truncate">{progress.currentFile}</span>
                  <span className="text-[#0066FF] font-bold shrink-0 ml-2">
                    {progress.current} / {progress.total}
                  </span>
                </div>
              )}

              {/* Success Result */}
              {progress.status === 'completed' && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-400">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>¡Subida a GitHub Completada con Éxito!</span>
                  </div>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    Se subieron todos los archivos Dart, assets y la configuración multiplataforma. 
                    GitHub Actions compilará automáticamente el instalable para <strong>Android (APK)</strong> y el paquete para <strong>iPhone (iOS)</strong>.
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-2">
                    {progress.actionsUrl && (
                      <a
                        href={progress.actionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold transition-all shadow-md shadow-[#0066FF]/25"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ver Compilación en GitHub Actions</span>
                      </a>
                    )}
                    {progress.repoUrl && (
                      <a
                        href={progress.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                          isDark
                            ? 'border-[#1E1E24] bg-[#121216] hover:bg-[#1C1C24] text-white'
                            : 'border-[#CBD5E1] bg-white hover:bg-slate-100 text-[#0F172A]'
                        }`}
                      >
                        <span>Ir al Repositorio</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Error Result */}
              {progress.status === 'error' && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>Error en la subida</span>
                  </div>
                  <p className="text-xs leading-relaxed">{progress.message}</p>
                  <button
                    onClick={() => setProgress(null)}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold border border-red-500/40"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Intentar de nuevo</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Instructions */}
        <div
          className={`px-6 py-3.5 border-t text-[11px] flex items-center justify-between ${
            isDark ? 'border-[#1E1E24] bg-[#0E0E12] text-[#8E8E93]' : 'border-[#E2E8F0] bg-slate-50 text-[#64748B]'
          }`}
        >
          <span>🔒 Los tokens se usan solo en tu navegador para la API de GitHub.</span>
          <button
            onClick={onClose}
            className={`font-semibold hover:underline ${isDark ? 'text-white' : 'text-[#0F172A]'}`}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
