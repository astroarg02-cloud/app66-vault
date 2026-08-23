import React, { useState } from 'react';
import { ShieldCheck, Lock, Key, CheckCircle2, AlertCircle, Shield, ArrowLeft, ExternalLink } from 'lucide-react';
import { UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { INITIAL_ADMIN_USER, isAuthorizedAdminKey } from '../../data/initialVaultData';
import { googleAuthService } from '../../services/googleAuthService';
import { supabaseService } from '../../services/supabaseClient';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [enableAdminMode, setEnableAdminMode] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { isDark } = useTheme();

  const isKeyValid = isAuthorizedAdminKey(adminKey);

  // Handle Admin Key submission
  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isKeyValid) {
      setErrorMessage('Key de seguridad incorrecta. Se requiere la Key autorizada.');
      return;
    }

    onLogin(INITIAL_ADMIN_USER);
  };

  // Launch Real Google Authentication (Official GSI / OAuth 2.0 Popup & Redirect)
  const handleRealGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Triggers Google's real authentication dialog
      const user = await googleAuthService.triggerGoogleLogin();
      if (user) {
        supabaseService.saveSession(user);
        onLogin(user);
      }
    } catch (err: any) {
      console.warn('Google Auth notice/fallback:', err);
      const message = err?.message || 'Error al conectar con Google';
      if (message.includes('bloqueada') || message.includes('popup')) {
        setErrorMessage('Por favor permite las ventanas emergentes en tu navegador para iniciar sesión con Google.');
      } else if (message.includes('cancelado') || message.includes('cerrada')) {
        setErrorMessage('El inicio de sesión con Google fue cancelado.');
      } else {
        setErrorMessage(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`h-full flex flex-col justify-between p-6 sm:p-8 overflow-y-auto custom-scrollbar transition-colors duration-300 relative ${
        isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      <div className="my-auto space-y-5">
        {/* Animated Emblem / Logo */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative group">
            <div
              className={`w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center border transition-all ${
                enableAdminMode
                  ? 'border-[#0066FF] shadow-[0_0_50px_-5px_rgba(0,102,255,0.6)]'
                  : isDark
                  ? 'border-[#0066FF]/40 shadow-[0_0_50px_-10px_rgba(0,102,255,0.5)]'
                  : 'border-blue-200 shadow-xl shadow-blue-500/20'
              }`}
            >
              <img
                src="/app-logo.png"
                alt="App Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0066FF] flex items-center justify-center shadow-md shadow-[#0066FF]/40">
              <Key className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold tracking-[0.2em] text-[#0066FF] uppercase">
              <Lock className="w-3 h-3" />
              <span>{enableAdminMode ? 'ACCESO ADMINISTRADOR DIRECTO' : 'AUTENTICACIÓN GOOGLE'}</span>
            </div>
            <h1
              className={`text-2xl font-black tracking-tight mt-1 ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              {enableAdminMode ? 'Desbloqueo con Key' : 'App 66 • Bóveda Privada'}
            </h1>
            <p className={`text-xs max-w-xs mt-1.5 leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              {enableAdminMode
                ? 'Ingresa tu Key de seguridad para desbloquear los privilegios de Administrador.'
                : 'Accede a la Bóveda exclusiva de manera instantánea iniciando sesión con Google.'}
            </p>
          </div>
        </div>

        {/* Admin Mode Toggle Switch */}
        <div
          className={`p-3.5 rounded-2xl border transition-all ${
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
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                enableAdminMode ? 'bg-[#0066FF] text-white' : isDark ? 'bg-[#1E1E24] text-[#8E8E93]' : 'bg-slate-100 text-[#64748B]'
              }`}>
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <span className={`text-xs font-bold block ${enableAdminMode ? 'text-[#0066FF]' : isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                  Modo Administrador (Acceso con Key)
                </span>
                <span className={`text-[10px] block ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  {enableAdminMode ? 'Ingresa la clave de seguridad para administrar' : 'Activar para ingresar con tu Key de Administrador'}
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

        {/* Error Alert Message */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Admin Direct Key Form */}
        {enableAdminMode ? (
          <form onSubmit={handleAdminSubmit} className="space-y-4">
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
              <span>Volver a acceso con Google</span>
            </button>
          </form>
        ) : (
          /* Google Sign In Section */
          <div className="space-y-4">
            {/* Primary Google Login Button - Opens Google's Official Login Window */}
            <button
              id="google-signin-btn"
              type="button"
              disabled={isLoading}
              onClick={handleRealGoogleSignIn}
              className={`w-full py-4 px-5 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-3 transition-all border shadow-xl group hover:scale-[1.01] active:scale-[0.99] ${
                isDark
                  ? 'bg-white hover:bg-slate-100 text-[#0F172A] border-white shadow-white/10'
                  : 'bg-white hover:bg-slate-50 text-[#0F172A] border-slate-300 shadow-slate-300/50'
              }`}
            >
              {isLoading ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 border-2 border-[#0066FF] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs text-[#0066FF] font-bold">Conectando con Google...</span>
                </div>
              ) : (
                <>
                  {/* Google SVG Official Brand Icon */}
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                  <ExternalLink className="w-4 h-4 text-slate-400 ml-auto group-hover:text-[#0066FF] transition-colors" />
                </>
              )}
            </button>

            {/* Info notice */}
            <div className={`p-3.5 rounded-2xl border text-center ${
              isDark ? 'bg-[#0A0A0C]/60 border-[#1E1E24]' : 'bg-slate-100/70 border-[#E2E8F0]'
            }`}>
              <span className={`text-[11px] leading-relaxed block ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                🔒 Inicia sesión con tu cuenta de Google para obtener acceso VIP inmediato a todas las descargas, likes y comentarios de la Bóveda.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className={`pt-4 text-center border-t ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
        <span
          className={`text-[10px] uppercase tracking-widest font-mono ${
            isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
          }`}
        >
          Google Identity Services (GSI) • OAuth 2.0
        </span>
      </div>
    </div>
  );
};
