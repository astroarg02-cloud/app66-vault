import React, { useState, useMemo } from 'react';
import { 
  FileCode, Copy, Check, Download, 
  Search, Github, Sparkles
} from 'lucide-react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DART_CODEBASE } from '../../data/dartCodebase';
import { DartCodeFile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { GitHubUploaderModal } from '../GitHubUploader/GitHubUploaderModal';

export const CodeExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<DartCodeFile>(DART_CODEBASE[2]); // lib/main.dart default
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [isGitHubModalOpen, setIsGitHubModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const { isDark } = useTheme();

  // Filtered files
  const filteredFiles = useMemo(() => {
    return DART_CODEBASE.filter((file) => {
      const matchesSearch = file.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        file.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = activeCategory === 'all' || file.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [searchQuery, activeCategory]);

  const copyCode = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download entire Flutter project as ZIP archive
  const downloadCompleteProjectZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Add README.md
      zip.file(
        'README.md',
        `# Vault Private Server & Exclusive Content Hub (Flutter & Firebase)

Aplicación móvil multiplataforma (Android & iOS) de Bóveda y Servidor Privado exclusivo.

## 🚀 Arquitectura
- **Clean Architecture & Feature-First**: Separación estricta de capas (Domain, Data, Presentation).
- **State Management**: \`flutter_riverpod\` (AsyncNotifier & StreamProviders).
- **Backend**: Firebase Auth (Autenticación estricta), Cloud Firestore (Likes, comentarios en tiempo real y metadatos) y Firebase Storage (Archivos multimedia descargables).
- **Descargas & Compartir**: \`dio\` / \`flutter_downloader\` y \`share_plus\`.
- **UI/UX**: Minimalista y Oscuro (#000000 Negro Profundo con acentos en #0066FF Azul Vibrante).

## 🛠️ Instrucciones de Instalación
1. Clona o extrae este proyecto.
2. Ejecuta \`flutter pub get\`.
3. Configura Firebase mediante FlutterFire CLI:
   \`\`\`bash
   flutterfire configure
   \`\`\`
4. Despliega las reglas de Firestore adjuntas en \`firestore.rules\`:
   \`\`\`bash
   firebase deploy --only firestore:rules
   \`\`\`
5. Inicia la aplicación:
   \`\`\`bash
   flutter run
   \`\`\`
`
      );

      // Add all Dart/Flutter files to zip
      DART_CODEBASE.forEach((file) => {
        zip.file(file.path, file.code);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      saveAs(blob, 'vault_private_server_flutter_firebase.zip');
    } catch (err) {
      console.error('Error creating project zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'core': return 'text-[#0066FF] bg-[#0066FF]/10 border-[#0066FF]/30';
      case 'auth': return isDark ? 'text-amber-400 bg-amber-400/10 border-amber-400/30' : 'text-amber-600 bg-amber-50 border-amber-300';
      case 'vault': return isDark ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30' : 'text-emerald-600 bg-emerald-50 border-emerald-300';
      case 'membership': return isDark ? 'text-purple-400 bg-purple-400/10 border-purple-400/30' : 'text-purple-600 bg-purple-50 border-purple-300';
      default: return isDark ? 'text-sky-400 bg-sky-400/10 border-sky-400/30' : 'text-sky-600 bg-sky-50 border-sky-300';
    }
  };

  return (
    <div
      className={`h-full flex flex-col rounded-2xl overflow-hidden shadow-2xl border transition-colors duration-300 ${
        isDark
          ? 'bg-[#060608] border-[#1E1E24]'
          : 'bg-white border-[#CBD5E1]'
      }`}
    >
      {/* Codebase Top Bar */}
      <div
        className={`px-6 py-4 border-b flex flex-wrap items-center justify-between gap-4 transition-colors ${
          isDark ? 'border-[#1E1E24] bg-[#0A0A0C]' : 'border-[#E2E8F0] bg-slate-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0066FF]/15 border border-[#0066FF]/30 flex items-center justify-center text-[#0066FF]">
            <FileCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-widest text-[#0066FF] uppercase">
                Código Base Dart & Flutter
              </span>
              <span
                className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                  isDark
                    ? 'bg-[#121216] text-[#8E8E93] border-[#1E1E24]'
                    : 'bg-white text-[#64748B] border-[#CBD5E1]'
                }`}
              >
                Clean Architecture + Riverpod 2.5
              </span>
            </div>
            <h2 className={`text-lg font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
              Repositorio de Producción
            </h2>
          </div>
        </div>

        {/* Action Buttons: GitHub 1-Click Upload & ZIP Download */}
        <div className="flex items-center gap-2.5">
          <button
            id="open-github-upload-modal-btn"
            onClick={() => setIsGitHubModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black hover:bg-[#141418] border border-white/20 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-lg shadow-black/40"
          >
            <Github className="w-4 h-4 text-white" />
            <span>Subir a GitHub (1-Clic)</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#0066FF] text-white uppercase tracking-wider">
              Auto APK
            </span>
          </button>

          <button
            id="download-full-flutter-project-btn"
            onClick={downloadCompleteProjectZip}
            disabled={isZipping}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white text-xs font-bold transition-all shadow-lg shadow-[#0066FF]/25"
          >
            {isZipping ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Descargar (.ZIP)</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: File Tree Sidebar & Code Viewer */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left Sidebar: File Tree & Filters */}
        <div
          className={`w-full md:w-72 border-r flex flex-col shrink-0 transition-colors ${
            isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-[#F8FAFC] border-[#E2E8F0]'
          }`}
        >
          {/* Search Box */}
          <div className={`p-3 border-b ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
            <div className="relative">
              <Search className={`w-4 h-4 absolute left-3 top-2.5 ${isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}`} />
              <input
                id="search-dart-files-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filtrar archivos..."
                className={`w-full rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#0066FF] border ${
                  isDark
                    ? 'bg-[#121216] border-[#1E1E24] text-white placeholder-[#5A5A62]'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8]'
                }`}
              />
            </div>

            {/* Category Tags */}
            <div className="flex items-center gap-1 mt-2.5 overflow-x-auto no-scrollbar pb-1">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'vault', label: 'Vault' },
                { id: 'auth', label: 'Auth' },
                { id: 'core', label: 'Core' },
                { id: 'membership', label: 'VIP' },
                { id: 'config', label: 'Config' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors whitespace-nowrap ${
                    activeCategory === c.id
                      ? 'bg-[#0066FF] text-white'
                      : isDark
                      ? 'bg-[#121216] text-[#8E8E93] hover:text-white'
                      : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:text-[#0F172A]'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredFiles.map((file) => {
              const isSelected = selectedFile.path === file.path;
              return (
                <button
                  key={file.path}
                  id={`code-file-tab-${file.path.replace(/[/.]/g, '-')}`}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? isDark
                        ? 'bg-[#0066FF]/15 border border-[#0066FF]/50 text-white font-semibold'
                        : 'bg-blue-50 border border-blue-300 text-[#0066FF] font-semibold'
                      : isDark
                      ? 'border border-transparent hover:bg-[#121216] text-[#8E8E93] hover:text-white'
                      : 'border border-transparent hover:bg-slate-200/60 text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  <FileCode
                    className={`w-4 h-4 shrink-0 mt-0.5 ${
                      isSelected ? 'text-[#0066FF]' : isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[11px] truncate">{file.path}</div>
                    <div className={`text-[10px] line-clamp-1 mt-0.5 font-sans ${isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}`}>
                      {file.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Code View */}
        <div className={`flex-1 flex flex-col overflow-hidden transition-colors ${isDark ? 'bg-[#050507]' : 'bg-slate-900'}`}>
          {/* File Info Bar */}
          <div
            className={`px-5 py-3 border-b flex items-center justify-between gap-3 transition-colors ${
              isDark ? 'border-[#1E1E24] bg-[#0A0A0C]' : 'border-slate-800 bg-slate-950'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-white truncate">
                  {selectedFile.path}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${getCategoryColor(
                    selectedFile.category
                  )}`}
                >
                  {selectedFile.category}
                </span>
              </div>
              <p className="text-xs text-[#8E8E93] mt-0.5 line-clamp-1">
                {selectedFile.description}
              </p>
            </div>

            {/* Copy Button */}
            <button
              id="copy-selected-dart-file-btn"
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="text-[#10B981]">Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#8E8E93]" />
                  <span>Copiar Código</span>
                </>
              )}
            </button>
          </div>

          {/* Syntax Highlighted Code Display */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-[#000000] font-mono text-xs text-[#CCCCCC] leading-relaxed select-text">
            <pre className="whitespace-pre">
              <code>{selectedFile.code}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* 1-Click Direct GitHub Sync Modal */}
      <GitHubUploaderModal
        isOpen={isGitHubModalOpen}
        onClose={() => setIsGitHubModalOpen(false)}
      />
    </div>
  );
};
