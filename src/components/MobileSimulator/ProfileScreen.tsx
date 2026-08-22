import React from 'react';
import { UserProfile } from '../../types';
import { 
  ShieldCheck, LogOut, Key, User, Calendar, Database, 
  CheckCircle2, XCircle, ArrowLeftRight, Moon, Sun, Palette
} from 'lucide-react';
import { INITIAL_ADMIN_USER, INITIAL_MEMBER_USER } from '../../data/initialVaultData';
import { VerifiedBadge } from '../VerifiedBadge';
import { useTheme } from '../../context/ThemeContext';

interface ProfileScreenProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onSwitchUser?: (user: UserProfile) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onLogout, onSwitchUser }) => {
  const { theme, toggleTheme, setTheme, isDark } = useTheme();

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
          Perfil de Servidor
        </h2>
      </div>

      {/* User Card */}
      <div
        className={`p-5 rounded-2xl text-center space-y-3 border transition-colors ${
          isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24]'
            : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}
      >
        <div
          className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center text-xl font-black border transition-colors ${
            isDark
              ? 'bg-[#121216] border-[#0066FF]/40 text-[#0066FF]'
              : 'bg-blue-50 border-blue-200 text-[#0066FF]'
          }`}
        >
          {currentUser.displayName.charAt(0).toUpperCase()}
        </div>

        <div>
          <div className="flex items-center justify-center gap-1.5">
            <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
              {currentUser.displayName}
            </h3>
            {currentUser.role === 'admin' && <VerifiedBadge className="w-4 h-4" />}
          </div>
          <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
            {currentUser.email}
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0066FF]/15 border border-[#0066FF] text-[10px] font-bold text-[#0066FF] uppercase tracking-wider">
          {currentUser.role === 'admin' ? (
            <>
              <VerifiedBadge className="w-3.5 h-3.5" />
              <span>ADMINISTRADOR / ROOT VERIFICADO</span>
            </>
          ) : (
            <>
              <User className="w-3 h-3 text-[#0066FF]" />
              <span>MIEMBRO VIP (SOLO LECTURA)</span>
            </>
          )}
        </div>
      </div>

      {/* Security Notice for Admin Authorization */}
      <div
        className={`p-3.5 rounded-xl border space-y-1.5 transition-colors ${
          isDark
            ? 'bg-[#0A0A0C] border-[#1E1E24]'
            : 'bg-white border-[#E2E8F0] shadow-sm'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#0066FF]" />
          <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
            Política de Administración Única
          </span>
        </div>
        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
          El servidor restringe los permisos de Administrador exclusivamente al correo <strong className="text-[#0066FF]">astroarg02@gmail.com</strong>. Cualquier otra cuenta posee privilegios de lectura, descarga y debate privado (Miembro VIP).
        </p>
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

      {/* Quick Role Switcher for Testing */}
      {onSwitchUser && (
        <div
          className={`p-3.5 rounded-xl border space-y-2 transition-colors ${
            isDark
              ? 'bg-[#0A0A0C] border-[#0066FF]/30'
              : 'bg-blue-50/50 border-[#0066FF]/30'
          }`}
        >
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF] flex items-center gap-1.5">
            <ArrowLeftRight className="w-3 h-3" />
            <span>Alternar Rol para Pruebas</span>
          </div>
          <p className={`text-[11px] leading-snug ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
            Comprueba cómo cambia la interfaz cuando eres el Administrador (único que sube contenido) vs un Miembro VIP.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              id="switch-to-admin-btn"
              onClick={() => onSwitchUser(INITIAL_ADMIN_USER)}
              className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                currentUser.role === 'admin'
                  ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'bg-[#121216] text-[#8E8E93] hover:text-white border-[#1E1E24]'
                  : 'bg-white text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Root</span>
            </button>

            <button
              id="switch-to-member-btn"
              onClick={() => onSwitchUser(INITIAL_MEMBER_USER)}
              className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
                currentUser.role === 'vip_member'
                  ? 'bg-[#0066FF] text-white border-[#0066FF] shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'bg-[#121216] text-[#8E8E93] hover:text-white border-[#1E1E24]'
                  : 'bg-white text-[#64748B] hover:text-[#0F172A] border-[#E2E8F0]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Miembro VIP</span>
            </button>
          </div>
        </div>
      )}

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
              <span>Firebase UID</span>
            </span>
            <span className={`font-mono text-[11px] truncate max-w-[140px] ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
              {currentUser.uid}
            </span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className={`flex items-center gap-2 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              <Database className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Nivel de Bóveda</span>
            </span>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{currentUser.tier}</span>
          </div>

          <div className="p-3 flex items-center justify-between">
            <span className={`flex items-center gap-2 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              <Calendar className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Ingreso al Hub</span>
            </span>
            <span className={isDark ? 'text-white' : 'text-[#0F172A]'}>{currentUser.joinedAt}</span>
          </div>
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          id="profile-logout-btn"
          onClick={onLogout}
          className={`w-full py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
            isDark
              ? 'bg-[#0A0A0C] hover:bg-red-500/10 border-[#1E1E24] hover:border-red-500/30 text-red-400'
              : 'bg-white hover:bg-red-50 border-[#E2E8F0] hover:border-red-200 text-red-600 shadow-sm'
          }`}
        >
          <LogOut className="w-4 h-4" />
          <span>CERRAR SESIÓN DEL SERVIDOR</span>
        </button>
      </div>
    </div>
  );
};
