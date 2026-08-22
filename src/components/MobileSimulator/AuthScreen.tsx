import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, User, ArrowRight, Key, ShieldAlert, CheckCircle2, AlertCircle, Shield, ArrowLeft } from 'lucide-react';
import { UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { ADMIN_AUTHORIZED_EMAIL, INITIAL_ADMIN_USER, isAuthorizedAdminKey } from '../../data/initialVaultData';
import { supabaseService } from '../../services/supabaseClient';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [enableAdminMode, setEnableAdminMode] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isDark } = useTheme();

  const isKeyValid = isAuthorizedAdminKey(adminKey);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // If in Admin Mode, bypass registration/login and validate only the Key directly
    if (enableAdminMode) {
      if (!isKeyValid) {
        setErrorMessage('Key de seguridad incorrecta.');
        return;
      }
      onLogin(INITIAL_ADMIN_USER);
      return;
    }

    setIsLoading(true);

    try {
      if (isRegister) {
        const { user, error } = await supabaseService.signUp(
          email, 
          password, 
          displayName
        );
        if (error) {
          setErrorMessage(error);
          setIsLoading(false);
          return;
        }
        if (user) {
          onLogin(user);
        }
      } else {
        const { user, error } = await supabaseService.signIn(
          email, 
          password
        );
        if (error) {
          setErrorMessage(error);
          setIsLoading(false);
          return;
        }
        if (user) {
          onLogin(user);
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocurrió un error inesperado al conectar con el servidor.');
    } finally {
      setIsLoading(false);
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
                enableAdminMode
                  ? 'bg-[#0066FF]/10 border-[#0066FF] shadow-[0_0_50px_-5px_rgba(0,102,255,0.6)]'
                  : isDark
                  ? 'bg-[#0A0A0C] border-[#1E1E24] shadow-[0_0_50px_-10px_rgba(0,102,255,0.4)]'
                  : 'bg-white border-blue-100 shadow-xl shadow-blue-500/15'
              }`}
            >
              {enableAdminMode ? (
                <Shield className="w-10 h-10 text-[#0066FF] animate-pulse" />
              ) : (
                <ShieldCheck className="w-10 h-10 text-[#0066FF]" />
              )}
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0066FF] flex items-center justify-center">
              <Key className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold tracking-[0.2em] text-[#0066FF] uppercase">
              <Lock className="w-3 h-3" />
              <span>{enableAdminMode ? 'ACCESO ADMINISTRADOR DIRECTO' : 'REGISTRO OBLIGATORIO'}</span>
            </div>
            <h1
              className={`text-2xl font-black tracking-tight mt-1 ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              {enableAdminMode ? 'Desbloqueo con Key' : 'App 66 • Servidor Privado'}
            </h1>
            <p className={`text-xs max-w-xs mt-1.5 leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              {enableAdminMode
                ? 'Ingresa tu Key de seguridad para desbloquear los privilegios de Administrador sin registrarte.'
                : 'Debes registrarte o iniciar sesión para acceder al contenido exclusivo.'}
            </p>
          </div>
        </div>

        {/* Admin Mode Toggle Switch */}
        <div
          className={`p-3 rounded-2xl border transition-all ${
            enableAdminMode
              ? isDark
                ? 'bg-[#0066FF]/15 border-[#0066FF]/50 ring-1 ring-[#0066FF]/40'
                : 'bg-blue-50 border-blue-300 ring-1 ring-blue-500/30 shadow-sm'
              : isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24]'
              : 'bg-white border-[#E2E8F0] shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className={`w-4 h-4 ${enableAdminMode ? 'text-[#0066FF]' : isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`} />
              <div>
                <span className={`text-xs font-bold block ${enableAdminMode ? 'text-[#0066FF]' : isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                  Modo Administrador (Acceso con Key)
                </span>
                <span className={`text-[10px] block ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  {enableAdminMode ? 'Solo requiere la clave de seguridad' : 'Activar para ingresar directamente con tu Key'}
                </span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
              <input
                id="admin-mode-toggle"
                type="checkbox"
                checked={enableAdminMode}
                onChange={(e) => {
                  setEnableAdminMode(e.target.checked);
                  setErrorMessage(null);
                  if (!e.target.checked) setAdminKey('');
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0066FF]"></div>
            </label>
          </div>
        </div>

        {/* Auth Mode Tabs (Only shown when NOT in Admin Mode) */}
        {!enableAdminMode && (
          <div
            className={`p-1 rounded-2xl border flex gap-1 ${
              isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-slate-100 border-[#E2E8F0]'
            }`}
          >
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMessage(null);
              }}
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
              onClick={() => {
                setIsRegister(true);
                setErrorMessage(null);
              }}
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
        )}

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Admin Direct Key Form */}
        {enableAdminMode ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  className={`block text-[11px] font-semibold uppercase tracking-wider ${
                    isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'
                  }`}
                >
                  Key de Seguridad
                </label>
                {isKeyValid ? (
                  <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Key Validada
                  </span>
                ) : null}
              </div>
              <div className="relative">
                <Key
                  className={`w-4 h-4 absolute left-3.5 top-3.5 text-[#0066FF]`}
                />
                <input
                  id="admin-key-direct-input"
                  type="password"
                  required
                  autoFocus
                  value={adminKey}
                  onChange={(e) => {
                    setAdminKey(e.target.value);
                    setErrorMessage(null);
                  }}
                  placeholder="Ingresa la Key de Administrador"
                  className={`w-full rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono tracking-widest focus:outline-none transition-colors border ${
                    isKeyValid
                      ? 'border-emerald-500 bg-emerald-500/5 text-emerald-400'
                      : isDark
                      ? 'border-[#1E1E24] bg-[#0A0A0C] text-white placeholder-[#5A5A62]'
                      : 'border-[#CBD5E1] bg-white text-[#0F172A] placeholder-[#94A3B8]'
                  }`}
                />
              </div>
            </div>

            <button
              id="admin-direct-submit-btn"
              type="submit"
              className="w-full py-3.5 px-5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white font-bold text-xs sm:text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#0066FF]/30 transition-all"
            >
              <Shield className="w-4 h-4" />
              <span>INGRESAR COMO ADMINISTRADOR</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEnableAdminMode(false);
                setAdminKey('');
                setErrorMessage(null);
              }}
              className={`w-full text-center text-xs py-1 flex items-center justify-center gap-1.5 transition-colors ${
                isDark ? 'text-[#8E8E93] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al registro de miembros</span>
            </button>
          </form>
        ) : (
          /* Member Standard Auth Form */
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
                    placeholder="Tu Nombre o Alias"
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
              <label
                className={`block text-[11px] font-semibold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'
                }`}
              >
                Correo Electrónico
              </label>
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
                  placeholder="usuario@ejemplo.com"
                  className={`w-full rounded-xl pl-10 pr-4 py-3 text-xs sm:text-sm focus:outline-none transition-colors border ${
                    isDark
                      ? 'border-[#1E1E24] bg-[#0A0A0C] text-white placeholder-[#5A5A62]'
                      : 'border-[#CBD5E1] bg-white text-[#0F172A] placeholder-[#94A3B8]'
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
                Contraseña
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
                      ? 'REGISTRARSE EN LA BÓVEDA'
                      : 'INGRESAR COMO MIEMBRO VIP'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Toggle Login / Register */}
            <div className="text-center pt-1">
              <button
                id="toggle-auth-mode-btn"
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setErrorMessage(null);
                }}
                className={`text-xs transition-colors ${
                  isDark ? 'text-[#8E8E93] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {isRegister
                  ? '¿Ya posees credenciales de acceso? Iniciar Sesión'
                  : '¿Nuevo miembro invitado? Registrarse en la Bóveda'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer info */}
      <div className={`pt-4 text-center border-t ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
        <span
          className={`text-[10px] uppercase tracking-widest font-mono ${
            isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
          }`}
        >
          Servidor Seguro • Acceso Cifrado
        </span>
      </div>
    </div>
  );
};

