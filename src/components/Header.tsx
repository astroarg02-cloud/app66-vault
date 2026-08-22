import React from 'react';
import { ShieldCheck, Smartphone, FileCode, BookOpen, Database, Lock, Moon, Sun, Github, Cpu } from 'lucide-react';
import { UserProfile, AppView } from '../types';
import { VerifiedBadge } from './VerifiedBadge';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeView: AppView;
  onSelectView: (view: AppView) => void;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onOpenGitHubModal?: () => void;
  onOpenAndroidGuideModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  onSelectView,
  currentUser,
  onLogout,
  onOpenGitHubModal,
  onOpenAndroidGuideModal,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header
      className={`px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 transition-colors duration-300 ${
        isDark
          ? 'bg-[#0A0A0C] border-b border-[#1E1E24] text-white'
          : 'bg-white border-b border-[#E2E8F0] text-[#0F172A] shadow-sm'
      }`}
    >
      {/* Brand & Vault Title */}
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            isDark
              ? 'bg-black border border-[#1E1E24] shadow-[0_0_20px_-5px_rgba(0,102,255,0.4)]'
              : 'bg-blue-50 border border-blue-100 shadow-sm'
          }`}
        >
          <ShieldCheck className="w-5 h-5 text-[#0066FF]" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1
              className={`text-sm sm:text-base font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              Vault Private Server
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30">
              Android & iPhone (iOS)
            </span>
          </div>
          <p className={`text-[11px] ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
            App 66 • Servidor Privado Multiplataforma • Flutter & Supabase / Firebase
          </p>
        </div>
      </div>

      {/* View Switcher Pills */}
      <div
        className={`flex items-center gap-1.5 p-1 rounded-xl transition-colors ${
          isDark ? 'bg-black border border-[#1E1E24]' : 'bg-[#F1F5F9] border border-[#E2E8F0]'
        }`}
      >
        <button
          id="view-tab-simulator"
          onClick={() => onSelectView('simulator')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeView === 'simulator'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : isDark
              ? 'text-[#8E8E93] hover:text-white'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Simulador</span>
        </button>

        <button
          id="view-tab-supabase"
          onClick={() => onSelectView('supabase')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeView === 'supabase'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : isDark
              ? 'text-[#8E8E93] hover:text-white'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Database className="w-4 h-4" />
          <span className="font-bold text-emerald-400">Supabase DB</span>
        </button>

        <button
          id="view-tab-code"
          onClick={() => onSelectView('code')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeView === 'code'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : isDark
              ? 'text-[#8E8E93] hover:text-white'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <FileCode className="w-4 h-4" />
          <span>Código Flutter</span>
        </button>

        <button
          id="view-tab-guide"
          onClick={() => onSelectView('guide')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeView === 'guide'
              ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
              : isDark
              ? 'text-[#8E8E93] hover:text-white'
              : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="hidden sm:inline">Arquitectura & RLS</span>
        </button>
      </div>


      {/* Right controls: Theme Switcher & User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Compilar APK (Sin GitHub) Button */}
        {onOpenAndroidGuideModal && (
          <button
            id="global-android-guide-btn"
            onClick={onOpenAndroidGuideModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Ver métodos para compilar el APK para Android sin GitHub"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Compilar APK (Sin GitHub)</span>
          </button>
        )}

        {/* GitHub 1-Click Sync Button */}
        {onOpenGitHubModal && (
          <button
            id="global-github-sync-btn"
            onClick={onOpenGitHubModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black hover:bg-[#141418] border border-white/20 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
            title="Subir código Flutter y workflow de APK a GitHub"
          >
            <Github className="w-3.5 h-3.5 text-white" />
            <span className="hidden md:inline">Subir a GitHub</span>
          </button>
        )}

        {/* Dark / Light Mode Toggle Button */}
        <button
          id="global-theme-toggle-btn"
          onClick={toggleTheme}
          title={isDark ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            isDark
              ? 'bg-black border-[#1E1E24] text-yellow-400 hover:bg-[#121216] hover:border-yellow-400/50'
              : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0066FF] hover:bg-blue-50 hover:border-[#0066FF]/40 shadow-sm'
          }`}
        >
          {isDark ? (
            <>
              <Sun className="w-4 h-4 text-yellow-400 animate-spin-once" />
              <span className="hidden sm:inline text-xs text-[#8E8E93] hover:text-white">Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-[#0066FF]" />
              <span className="hidden sm:inline text-xs text-[#64748B]">Modo Oscuro</span>
            </>
          )}
        </button>

        {/* User Profile Badge */}
        {currentUser ? (
          <div
            className={`flex items-center gap-2.5 pl-2.5 pr-3.5 py-1.5 rounded-xl border transition-colors ${
              isDark
                ? 'bg-black border-[#1E1E24]'
                : 'bg-[#F8FAFC] border-[#E2E8F0] shadow-sm'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#0066FF]/20 flex items-center justify-center text-[11px] font-bold text-[#0066FF]">
              {currentUser.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-bold line-clamp-1 ${
                    isDark ? 'text-white' : 'text-[#0F172A]'
                  }`}
                >
                  {currentUser.displayName}
                </span>
                {currentUser.role === 'admin' && <VerifiedBadge className="w-3.5 h-3.5" />}
              </div>
              <div className="text-[10px] text-[#0066FF] font-semibold tracking-wider uppercase flex items-center gap-1">
                <span>{currentUser.role === 'admin' ? 'ADMIN ROOT' : 'MIEMBRO VIP'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border ${
              isDark
                ? 'text-[#5A5A62] bg-black border-[#1E1E24]'
                : 'text-[#64748B] bg-slate-100 border-[#E2E8F0]'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-[#0066FF]" />
            <span>Servidor Bloqueado</span>
          </div>
        )}
      </div>
    </header>
  );
};
