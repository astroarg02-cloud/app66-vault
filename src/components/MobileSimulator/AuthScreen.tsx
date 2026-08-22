import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, ArrowRight, Key, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { UserProfile, UserRole } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { ADMIN_AUTHORIZED_EMAIL, isAuthorizedAdminEmail } from '../../data/initialVaultData';
import { VerifiedBadge } from '../VerifiedBadge';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('astroarg02@gmail.com');
  const [password, setPassword] = useState('••••••••••••');
  const [displayName, setDisplayName] = useState('Astro Root');
  const [isLoading, setIsLoading] = useState(false);
  const { isDark } = useTheme();

  const isEmailAdmin = isAuthorizedAdminEmail(email);
  const effectiveRole: UserRole = isEmailAdmin ? 'admin' : 'vip_member';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      const isActualAdmin = isAuthorizedAdminEmail(email);
      onLogin({
        uid: isActualAdmin ? 'admin_master_astro' : `user_${Date.now()}`,
        email: email || 'member@vaultserver.io',
        displayName: displayName || (isActualAdmin ? 'Administrador (astroarg02)' : 'Miembro VIP'),
        role: isActualAdmin ? 'admin' : 'vip_member',
        tier: isActualAdmin ? 'Bóveda Diamante' : 'Acceso VIP',
        joinedAt: new Date().toISOString().split('T')[0],
      });
    }, 500);
  };

  const quickDemoLogin = (role: UserRole) => {
    if (role === 'admin') {
      setEmail(ADMIN_AUTHORIZED_EMAIL);
      setDisplayName('Administrador (astroarg02)');
    } else {
      setEmail('vip.member@vaultserver.io');
      setDisplayName('Alex Vance (Miembro VIP)');
    }
  };

  return (
    <div
      className={`h-full flex flex-col justify-between p-6 sm:p-8 overflow-y-auto custom-scrollbar transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      <div className="my-auto space-y-5">
        {/* Animated Vault Emblem */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${
                isDark
                  ? 'bg-[#0A0A0C] border-[#1E1E24] shadow-[0_0_50px_-10px_rgba(0,102,255,0.4)]'
                  : 'bg-white border-blue-100 shadow-xl shadow-blue-500/15'
              }`}
            >
              <ShieldCheck className="w-10 h-10 text-[#0066FF]" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0066FF] flex items-center justify-center">
              <Lock className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <div>
            <div className="text-[11px] font-extrabold tracking-[0.25em] text-[#0066FF] uppercase">
              SERVIDOR PRIVADO
            </div>
            <h1
              className={`text-2xl font-black tracking-tight mt-1 ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              App 66
            </h1>
            <p className={`text-xs max-w-xs mt-1.5 leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Acceso restringido. Solo <strong className="text-[#0066FF]">{ADMIN_AUTHORIZED_EMAIL}</strong> tiene privilegios de Administrador.
            </p>
          </div>
        </div>

        {/* Quick Credentials Buttons for Demo / Testing */}
        <div
          className={`border rounded-2xl p-2.5 space-y-2 transition-colors ${
            isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24]'
              : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between px-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Cargar Credenciales Rápidas:
            </span>
          </div>

          <div className="flex gap-2">
            <button
              id="role-select-admin-btn"
              type="button"
              onClick={() => quickDemoLogin('admin')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                isEmailAdmin
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'bg-[#121216] text-[#8E8E93] hover:text-white border border-[#1E1E24]'
                  : 'bg-slate-50 text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
              }`}
            >
              <VerifiedBadge className="w-3.5 h-3.5" />
              <span>Admin (astroarg02)</span>
            </button>

            <button
              id="role-select-member-btn"
              type="button"
              onClick={() => quickDemoLogin('vip_member')}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                !isEmailAdmin
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark
                  ? 'bg-[#121216] text-[#8E8E93] hover:text-white border border-[#1E1E24]'
                  : 'bg-slate-50 text-[#64748B] hover:text-[#0F172A] border border-[#E2E8F0]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Miembro VIP</span>
            </button>
          </div>
        </div>

        {/* Auth Mode Tabs (Login vs Register) */}
        <div
          className={`p-1 rounded-2xl border flex gap-1 ${
            isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-slate-100 border-[#E2E8F0]'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsRegister(false)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !isRegister
                ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                : isDark
                ? 'text-[#8E8E93] hover:text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Iniciar Sesión</span>
          </button>
          <button
            type="button"
            onClick={() => setIsRegister(true)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              isRegister
                ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                : isDark
                ? 'text-[#8E8E93] hover:text-white'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Crear Cuenta</span>
          </button>
        </div>

        {/* Dynamic RBAC Security Banner */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs transition-colors ${
            isEmailAdmin
              ? isDark
                ? 'bg-[#0066FF]/10 border-[#0066FF]/40 text-[#3385FF]'
                : 'bg-blue-50 border-blue-200 text-[#0066FF]'
              : isDark
              ? 'bg-[#121216] border-[#1E1E24] text-[#8E8E93]'
              : 'bg-slate-50 border-[#E2E8F0] text-[#64748B]'
          }`}
        >
          {isEmailAdmin ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-[#0066FF] shrink-0" />
              <span>
                <strong>Permiso Admin Otorgado:</strong> Correo <code className="font-bold">{ADMIN_AUTHORIZED_EMAIL}</code> verificado como Administrador Root.
              </span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Permiso Miembro VIP:</strong> Correo estándar. Solo <code className="font-bold text-[#0066FF]">{ADMIN_AUTHORIZED_EMAIL}</code> puede ser Admin.
              </span>
            </>
          )}
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div>
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'
                }`}
              >
                Nombre de Miembro
              </label>
              <div className="relative">
                <User
                  className={`w-4 h-4 absolute left-3.5 top-3.5 ${
                    isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
                  }`}
                />
                <input
                  id="auth-name-input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu Nombre o Alias VIP"
                  className={`w-full rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-[#0066FF] transition-colors border ${
                    isDark
                      ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-[#5A5A62]'
                      : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8]'
                  }`}
                />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider ${
                  isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'
                }`}
              >
                Correo Electrónico (Firebase Auth)
              </label>
              <span className="text-[10px] font-bold text-[#0066FF]">
                {isEmailAdmin ? '★ Admin Autorizado' : 'Miembro Regular'}
              </span>
            </div>
            <div className="relative">
              <Mail
                className={`w-4 h-4 absolute left-3.5 top-3.5 ${
                  isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
                }`}
              />
              <input
                id="auth-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@vaultserver.io"
                className={`w-full rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm focus:outline-none transition-colors border ${
                  isEmailAdmin
                    ? 'border-[#0066FF] ring-1 ring-[#0066FF]/30'
                    : isDark
                    ? 'border-[#1E1E24]'
                    : 'border-[#CBD5E1]'
                } ${
                  isDark
                    ? 'bg-[#0A0A0C] text-white placeholder-[#5A5A62]'
                    : 'bg-white text-[#0F172A] placeholder-[#94A3B8]'
                }`}
              />
            </div>
          </div>

          <div>
            <label
              className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'
              }`}
            >
              Llave de Acceso (Password)
            </label>
            <div className="relative">
              <Key
                className={`w-4 h-4 absolute left-3.5 top-3.5 ${
                  isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
                }`}
              />
              <input
                id="auth-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className={`w-full rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm focus:outline-none focus:border-[#0066FF] transition-colors border ${
                  isDark
                    ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-[#5A5A62]'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8]'
                }`}
              />
            </div>
          </div>

          {/* Submit Action (Vibrant Blue) */}
          <button
            id="auth-submit-btn"
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white font-bold text-xs sm:text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#0066FF]/30 transition-all"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>
                  {isRegister
                    ? 'SOLICITAR ACCESO A BÓVEDA'
                    : isEmailAdmin
                    ? 'DESBLOQUEAR COMO ADMINISTRADOR'
                    : 'INGRESAR COMO MIEMBRO VIP'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div className="text-center pt-1">
          <button
            id="toggle-auth-mode-btn"
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className={`text-xs transition-colors ${
              isDark ? 'text-[#8E8E93] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {isRegister
              ? '¿Ya posees credenciales de acceso? Iniciar Sesión'
              : '¿Nuevo miembro invitado? Registrarse en la Bóveda'}
          </button>
        </div>
      </div>

      {/* Footer info */}
      <div className={`pt-4 text-center border-t ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
        <span
          className={`text-[10px] uppercase tracking-widest font-mono ${
            isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
          }`}
        >
          Firebase Auth • Admin Único: {ADMIN_AUTHORIZED_EMAIL}
        </span>
      </div>
    </div>
  );
};
