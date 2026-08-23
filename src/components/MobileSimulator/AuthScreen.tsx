import React, { useState } from 'react';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Flame,
  UserPlus,
  LogIn,
  Mail,
  User,
  Eye,
  EyeOff,
  Key,
  ArrowLeft,
} from 'lucide-react';
import { UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { isAuthorizedAdminKey } from '../../data/initialVaultData';
import { firebaseService } from '../../services/firebaseService';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [enableAdminMode, setEnableAdminMode] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isDark } = useTheme();

  const isKeyValid = isAuthorizedAdminKey(adminKey);

  // Formulario de Administrador con Key
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isKeyValid) {
      setErrorMessage('Key de seguridad incorrecta. Se requiere la clave de Administrador.');
      return;
    }

    try {
      setIsLoading(true);
      const adminProfile = await firebaseService.loginAsAdminWithKey(adminKey);
      setSuccessMessage('¡Acceso concedido como Administrador!');
      setTimeout(() => {
        onLogin(adminProfile);
      }, 400);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al validar la Key');
    } finally {
      setIsLoading(false);
    }
  };

  // Formulario con Email / Contraseña Firebase
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMessage('Por favor ingresa tu correo electrónico y contraseña.');
      return;
    }

    if (cleanPass.length < 6) {
      setErrorMessage('La contraseña debe contener al menos 6 caracteres.');
      return;
    }

    setIsLoading(true);

    try {
      let user: UserProfile;
      if (isSignUp) {
        user = await firebaseService.registerWithEmail(cleanEmail, cleanPass, displayName.trim() || undefined);
        setSuccessMessage('¡Cuenta creada y registrada con éxito!');
      } else {
        user = await firebaseService.signInWithEmail(cleanEmail, cleanPass);
        setSuccessMessage('¡Sesión iniciada con éxito!');
      }

      setTimeout(() => {
        onLogin(user);
      }, 400);
    } catch (err: any) {
      let friendlyMsg = 'No se pudo completar la autenticación.';
      const code = err?.code || '';

      if (code === 'auth/user-not-found') {
        friendlyMsg = 'Esta cuenta no está registrada. Por favor ve a la pestaña "Registrarse" para crearla.';
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
        friendlyMsg = 'Correo o contraseña incorrectos. Verifica tus datos o regístrate si es tu primera vez.';
      } else if (code === 'auth/email-already-in-use') {
        friendlyMsg = 'Este correo ya está registrado. Por favor selecciona "Iniciar Sesión".';
      } else if (code === 'auth/weak-password') {
        friendlyMsg = 'La contraseña es muy débil. Debe tener al menos 6 caracteres.';
      } else if (code === 'auth/invalid-email') {
        friendlyMsg = 'El formato del correo electrónico es inválido.';
      } else if (code === 'auth/network-request-failed') {
        friendlyMsg = 'Error de conexión. Intenta de nuevo.';
      } else if (err?.message) {
        friendlyMsg = err.message;
      }
      setErrorMessage(friendlyMsg);
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
      <div className="my-auto space-y-4">
        {/* Animated Vault Emblem */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="relative">
            <div
              className={`w-18 h-18 rounded-full flex items-center justify-center border transition-all ${
                enableAdminMode
                  ? 'bg-[#0066FF]/10 border-[#0066FF] shadow-[0_0_50px_-5px_rgba(0,102,255,0.6)]'
                  : isDark
                  ? 'bg-[#0A0A0C] border-[#1E1E24] shadow-[0_0_50px_-10px_rgba(0,102,255,0.45)]'
                  : 'bg-white border-blue-100 shadow-xl shadow-blue-500/15'
              }`}
            >
              {enableAdminMode ? (
                <Shield className="w-9 h-9 text-[#0066FF] animate-pulse" />
              ) : (
                <Shield className="w-9 h-9 text-[#0066FF]" />
              )}
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0066FF] flex items-center justify-center shadow-md shadow-[#0066FF]/40">
              <Key className="w-2.5 h-2.5 text-white" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold tracking-[0.2em] text-[#0066FF] uppercase">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>{enableAdminMode ? 'ACCESO ADMINISTRADOR' : 'BÓVEDA PRIVADA'}</span>
            </div>
            <h1
              className={`text-2xl font-black tracking-tight mt-1 ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              {enableAdminMode ? 'Desbloqueo con Key' : isSignUp ? 'Crear Cuenta' : 'Acceso al Servidor'}
            </h1>
            <p className={`text-xs max-w-xs mt-1 leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              {enableAdminMode
                ? 'Ingresa tu Key de seguridad para desbloquear privilegios de Administrador.'
                : isSignUp
                ? 'Crea tu cuenta de acceso a la bóveda privada.'
                : 'Servidor privado con autenticación segura.'}
            </p>
          </div>
        </div>

        {/* Toggle Mode Administrador con Key */}
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
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                enableAdminMode ? 'bg-[#0066FF] text-white' : isDark ? 'bg-[#1E1E24] text-[#8E8E93]' : 'bg-slate-100 text-[#64748B]'
              }`}>
                <Key className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className={`text-xs font-bold block ${enableAdminMode ? 'text-[#0066FF]' : isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                  Modo Administrador (Acceso con Key)
                </span>
                <span className={`text-[10px] block ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  {enableAdminMode ? 'Clave maestra requerida' : 'Activar para entrar con Key'}
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
                  setSuccessMessage(null);
                  if (!e.target.checked) setAdminKey('');
                }}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0066FF]"></div>
            </label>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Formulario Administrador con Key */}
        {enableAdminMode ? (
          <form onSubmit={handleAdminSubmit} className="space-y-3.5">
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
                  className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-mono tracking-widest focus:outline-none transition-colors border ${
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
              disabled={isLoading}
              className="w-full py-3 px-5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white font-bold text-xs sm:text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#0066FF]/30 transition-all cursor-pointer"
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
              <span>Volver a Inicio de Sesión</span>
            </button>
          </form>
        ) : (
          /* Formulario Normal de Auth (Login y Register) */
          <div className="space-y-3">
            {/* Tab Toggle: Iniciar Sesión / Registrarse */}
            <div className={`p-1 rounded-2xl flex border ${isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-slate-100 border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSignUp
                    ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Registrarse
              </button>
            </div>

            {/* Formulario de Login & Register */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              {isSignUp && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                    Nombre o Usuario
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Tu nombre o apodo"
                      className={`w-full pl-10 pr-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-[#0066FF] transition-colors ${
                        isDark
                          ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-slate-600'
                          : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                      }`}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@ejemplo.com"
                    className={`w-full pl-10 pr-3 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-[#0066FF] transition-colors ${
                      isDark
                        ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-slate-600'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`w-full pl-10 pr-10 py-2 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-[#0066FF] transition-colors ${
                      isDark
                        ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-slate-600'
                        : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] active:scale-[0.99] text-white font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#0066FF]/30 transition-all cursor-pointer disabled:opacity-50 mt-3"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>{isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`pt-3 text-center border-t ${isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'}`}>
        <span
          className={`text-[10px] uppercase tracking-widest font-mono flex items-center justify-center gap-1.5 ${
            isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
          }`}
        >
          <Flame className="w-3 h-3 text-amber-500" />
          BÓVEDA PRIVADA & FIREBASE AUTH
        </span>
      </div>
    </div>
  );
};
