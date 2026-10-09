import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import { firebaseService } from '../../services/firebaseService';
import { isAuthorizedAdminKey } from '../../data/initialVaultData';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [showAdminKey, setShowAdminKey] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { isDark } = useTheme();

  // Acceso directo de Administrador en el inicio de sesión con Key
  const handleAdminKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanKey = adminKey.trim();
    if (!cleanKey) {
      setErrorMessage('Por favor introduce la Key de Administrador.');
      return;
    }

    if (!isAuthorizedAdminKey(cleanKey)) {
      setErrorMessage('Key de Administrador incorrecta. Acceso denegado.');
      return;
    }

    setIsLoading(true);
    try {
      const adminUser = await firebaseService.loginAsAdminWithKey(cleanKey);
      setSuccessMessage('¡Acceso de Administrador verificado!');
      setTimeout(() => {
        onLogin(adminUser);
      }, 350);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error al verificar acceso de Administrador.');
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

    if (isSignUp && cleanPass.length < 6) {
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
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className={`h-full flex flex-col justify-between p-6 select-none overflow-y-auto custom-scrollbar transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      <div className="my-auto space-y-4">
        {/* Animated Vault Emblem */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <motion.div 
            className="relative"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
          >
            <div
              className={`w-18 h-18 rounded-full flex items-center justify-center border transition-all ${
                isDark
                  ? 'bg-[#0A0A0C] border-[#1E1E24] shadow-[0_0_50px_-10px_rgba(0,102,255,0.45)]'
                  : 'bg-white border-blue-100 shadow-xl shadow-blue-500/15'
              }`}
            >
              <Shield className="w-9 h-9 text-[#0066FF]" />
            </div>
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#0066FF] flex items-center justify-center shadow-md shadow-[#0066FF]/40">
              <Key className="w-2.5 h-2.5 text-white" />
            </div>
          </motion.div>

          <div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-extrabold tracking-[0.2em] text-[#0066FF] uppercase">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>BÓVEDA PRIVADA</span>
            </div>
            <h1
              className={`text-2xl font-black tracking-tight mt-1 ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              {isAdminMode
                ? 'Acceso Administrador'
                : isSignUp
                ? 'Crear Cuenta'
                : 'Acceso al Servidor'}
            </h1>
            <p className={`text-xs max-w-xs mt-1 leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              {isAdminMode
                ? 'Ingresa la Key de seguridad para entrar como Administrador.'
                : isSignUp
                ? 'Crea tu cuenta de acceso a la bóveda privada.'
                : 'Servidor privado con autenticación segura.'}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Alert */}
        <AnimatePresence>
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-start gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle de Acceso Administrador en el Inicio de Sesión */}
        <div
          className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
            isAdminMode
              ? 'bg-[#0066FF]/10 border-[#0066FF]/40'
              : isDark
              ? 'bg-[#0A0A0C] border-[#1E1E24]'
              : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                isAdminMode
                  ? 'bg-[#0066FF] text-white'
                  : isDark
                  ? 'bg-[#121216] text-[#0066FF]'
                  : 'bg-white text-[#0066FF] border border-slate-200'
              }`}
            >
              <Key className="w-4 h-4" />
            </div>
            <div>
              <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                Modo Administrador
              </div>
              <div className={`text-[10px] ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Acceso al panel con Key de seguridad
              </div>
            </div>
          </div>

          <button
            type="button"
            id="toggle-admin-mode-btn"
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer relative ${
              isAdminMode ? 'bg-[#0066FF]' : isDark ? 'bg-[#1E1E24]' : 'bg-slate-300'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                isAdminMode ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {isAdminMode ? (
          /* Formulario de Acceso Administrador con Key */
          <form onSubmit={handleAdminKeySubmit} className="space-y-3">
            <div>
              <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">
                Key de Administrador
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-2.5 text-[#0066FF]" />
                <input
                  type={showAdminKey ? 'text' : 'password'}
                  required
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Ingresa la Key de seguridad..."
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-xs sm:text-sm border focus:outline-none focus:border-[#0066FF] transition-colors font-mono ${
                    isDark
                      ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-slate-600'
                      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowAdminKey(!showAdminKey)}
                  className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                >
                  {showAdminKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white font-bold text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-[#0066FF]/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Entrar como Administrador</span>
                </>
              )}
            </motion.button>

            <button
              type="button"
              onClick={() => {
                setIsAdminMode(false);
                setErrorMessage(null);
              }}
              className={`w-full py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver al inicio de sesión de usuarios</span>
            </button>
          </form>
        ) : (
          /* Formulario Normal de Auth (Login y Register) */
          <div className="space-y-3">
            {/* Tab Toggle: Iniciar Sesión / Registrarse */}
            <div className={`p-1 rounded-2xl flex border relative ${isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-slate-100 border-slate-200'}`}>
              <motion.button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                whileTap={{ scale: 0.96 }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  !isSignUp
                    ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" /> Iniciar Sesión
              </motion.button>
              <motion.button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                whileTap={{ scale: 0.96 }}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isSignUp
                    ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" /> Registrarse
              </motion.button>
            </div>

            {/* Formulario de Login & Register */}
            <form onSubmit={handleSubmit} className="space-y-2.5">
              <AnimatePresence>
                {isSignUp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
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
                  </motion.div>
                )}
              </AnimatePresence>

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

              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
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
              </motion.button>
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
    </motion.div>
  );
};

