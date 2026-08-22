import React from 'react';
import { UserProfile } from '../../types';
import { 
  ShieldCheck, LogOut, Key, User, Calendar, Database, 
  CheckCircle2, XCircle, Moon, Sun, Palette, Shield
} from 'lucide-react';
import { VerifiedBadge } from '../VerifiedBadge';
import { useTheme } from '../../context/ThemeContext';

interface ProfileScreenProps {
  currentUser: UserProfile;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onLogout }) => {
  const { setTheme, isDark } = useTheme();

  return (
    <div
      className={`h-full flex flex-col overflow-y-auto custom-scrollbar p-5 space-y-5 transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* Header */}
      <div>
        <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#0066FF] uppercase">
          CREDENCIALES & AJUSTES
        </div>
        <h2
          className={`text-xl font-bold tracking-tight ${
            isDark ? 'text-white' : 'text-[#0F172A]'
          }`}
        >
          Perfil de Cuenta
        </h2>
      </div>

      {/* User Card */}
      <div
        className={`p-4 rounded-2xl border transition-all ${
          currentUser.role === 'admin'
            ? isDark
              ? 'bg-[#0066FF]/10 border-[#0066FF]/40 shadow-lg shadow-[#0066FF]/10'
              : 'bg-blue-50 border-blue-200 shadow-sm'
            : isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24]'
            : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-[#0066FF]"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-[#0066FF]/20 flex items-center justify-center text-lg font-bold text-[#0066FF]">
                {currentUser.displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1">
              {currentUser.role === 'admin' ? (
                <div className="bg-[#0066FF] rounded-full p-0.5 shadow-md">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                </div>
              ) : (
                <div className="bg-emerald-500 rounded-full p-0.5 shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-sm font-bold truncate ${
                  isDark ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                {currentUser.displayName}
              </span>
              {currentUser.role === 'admin' && <VerifiedBadge className="w-3.5 h-3.5 shrink-0" />}
            </div>

            <span
              className={`text-xs block truncate ${
                isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'
              }`}
            >
              {currentUser.email}
            </span>

            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  currentUser.role === 'admin'
                    ? 'bg-[#0066FF] text-white shadow-sm'
                    : 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                }`}
              >
                {currentUser.role === 'admin' ? 'ADMINISTRADOR ROOT' : 'MIEMBRO VIP'}
              </span>

              <span className={`text-[10px] ${isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}`}>
                {currentUser.tier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* App Theme Switcher Section (Dark / Light) */}
      <div
        className={`p-4 rounded-2xl border transition-colors ${
          isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24]'
            : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#0066FF]/15 flex items-center justify-center text-[#0066FF]">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                Tema de Visualización
              </span>
              <p className={`text-[10px] ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                {isDark ? 'Modo Oscuro (#000000)' : 'Modo Claro'}
              </p>
            </div>
          </div>

          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0066FF]/15 text-[#0066FF]">
            {isDark ? 'Oscuro' : 'Claro'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            id="theme-dark-select-btn"
            onClick={() => setTheme('dark')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              isDark
                ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-md shadow-[#0066FF]/30'
                : 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0] hover:text-[#0F172A]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Modo Oscuro</span>
          </button>

          <button
            id="theme-light-select-btn"
            onClick={() => setTheme('light')}
            className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border ${
              !isDark
                ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-md shadow-[#0066FF]/30'
                : 'bg-[#121216] text-[#8E8E93] border-[#1E1E24] hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Modo Claro</span>
          </button>
        </div>
      </div>

      {/* Role-Based Permissions Matrix */}
      <div className="space-y-2">
        <div className={`text-[11px] font-bold tracking-wider uppercase ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
          Matriz de Permisos (RBAC)
        </div>
        <div
          className={`border rounded-xl p-3 text-xs space-y-2.5 transition-colors ${
            isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24]'
              : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}
        >
          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
            <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>Subir material / Publicar</span>
            {currentUser.role === 'admin' ? (
              <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" /> Exclusivo Admin
              </span>
            ) : (
              <span className="text-red-500 font-bold flex items-center gap-1 text-[11px]">
                <XCircle className="w-3.5 h-3.5" /> Bloqueado a usuarios
              </span>
            )}
          </div>

          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
            <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>Descargar archivos completos</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Permitido
            </span>
          </div>

          <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
            <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>Dar Me Gusta a publicaciones</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Permitido
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className={isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}>Comentar en Foro Privado</span>
            <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Permitido
            </span>
          </div>
        </div>
      </div>

      {/* Security & Access Info */}
      <div className="space-y-2">
        <div className={`text-[11px] font-bold tracking-wider uppercase ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
          Metadatos de Conexión
        </div>

        <div
          className={`border rounded-xl divide-y text-xs transition-colors ${
            isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24] divide-[#1E1E24]'
              : 'bg-white border-[#E2E8F0] divide-[#E2E8F0] shadow-sm'
          }`}
        >
          <div className="p-3 flex items-center justify-between">
            <span className={`flex items-center gap-2 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              <Key className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>ID de Usuario</span>
            </span>
            <span className={`font-mono text-[11px] truncate max-w-[140px] ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
              {currentUser.uid}
            </span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className={`flex items-center gap-2 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              <Calendar className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Fecha de Registro</span>
            </span>
            <span className={isDark ? 'text-white' : 'text-[#0F172A]'}>
              {currentUser.joinedAt}
            </span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className={`flex items-center gap-2 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              <Database className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Servidor Vault</span>
            </span>
            <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Conectado
            </span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <button
        id="profile-logout-btn"
        onClick={onLogout}
        className={`w-full py-3.5 px-4 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all ${
          isDark
            ? 'border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20'
            : 'border-red-200 text-red-600 bg-red-50 hover:bg-red-100 shadow-sm'
        }`}
      >
        <LogOut className="w-4 h-4" />
        <span>Cerrar Sesión Segura</span>
      </button>
    </div>
  );
};
