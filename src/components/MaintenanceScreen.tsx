import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wrench,
  ShieldAlert,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Sun,
  Moon,
  Server,
  Lock,
  Loader2,
  ShieldCheck,
  Sparkles
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { isAuthorizedAdminKey, ADMIN_SECURITY_KEY } from '../data/initialVaultData';
import { firebaseService } from '../services/firebaseService';
import { UserProfile } from '../types';

interface MaintenanceScreenProps {
  onAdminLogin: (user: UserProfile) => void;
  customMessage?: string;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  onAdminLogin,
  customMessage,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [adminKey, setAdminKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAdminPortal, setShowAdminPortal] = useState(false);

  const handleKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanKey = adminKey.trim();
    if (!cleanKey) {
      setErrorMessage('Por favor introduce la Key de seguridad del administrador.');
      return;
    }

    if (!isAuthorizedAdminKey(cleanKey)) {
      setErrorMessage('Key de administrador no válida. Acceso estrictamente restringido.');
      return;
    }

    setIsLoading(true);
    try {
      const adminProfile = await firebaseService.loginAsAdminWithKey(cleanKey);
      setSuccessMessage('¡Key verificada con éxito! Concediendo acceso de Administrador...');
      setTimeout(() => {
        onAdminLogin(adminProfile);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al validar la Key');
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[99999] h-[100dvh] w-full flex flex-col items-center justify-between p-4 sm:p-6 overflow-y-auto select-none transition-colors duration-300 ${
        isDark
          ? 'bg-[#060608] text-white'
          : 'bg-[#F4F6FB] text-[#0F172A]'
      }`}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className={`absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full blur-[140px] opacity-25 ${
            isDark ? 'bg-amber-500/20' : 'bg-amber-400/30'
          }`}
        />
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full blur-[130px] opacity-20 ${
            isDark ? 'bg-blue-600/15' : 'bg-blue-500/20'
          }`}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Top Bar with Brand and Theme toggle */}
      <header className="w-full max-w-4xl flex items-center justify-between shrink-0 py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-500 flex items-center justify-center font-black text-sm shadow-sm">
            <Wrench className="w-4 h-4 animate-spin [animation-duration:8s]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black tracking-tight leading-none">
                App 66
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">
                SISTEMA EN MANTENIMIENTO
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
              Servidor Privado & Bóveda Exclusiva
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark
                ? 'bg-[#121217] border-[#22222B] text-slate-300 hover:text-white hover:bg-[#1A1A22]'
                : 'bg-white border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50 shadow-sm'
            }`}
            title="Cambiar tema"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Center Main Maintenance Notice Card */}
      <main className="w-full max-w-lg my-auto py-6 flex flex-col items-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 28 }}
          className={`w-full rounded-3xl border p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl relative overflow-hidden backdrop-blur-xl ${
            isDark
              ? 'bg-[#0E0E13]/90 border-amber-500/25 shadow-black/80'
              : 'bg-white/95 border-amber-300/60 shadow-xl'
          }`}
        >
          {/* Top amber accent line */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500/0 via-amber-500 to-amber-500/0" />

          {/* Main Animated Icon */}
          <div className="relative mb-5 mt-1">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-3xl bg-amber-500/15 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-xl shadow-amber-500/15"
            >
              <Wrench className="w-10 h-10" />
            </motion.div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-xl bg-red-500 text-white flex items-center justify-center border-2 border-white dark:border-[#0E0E13] shadow-md">
              <Lock className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Live pulsing status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 mb-3">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Mantenimiento Activo</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
            Sitio en Mantenimiento
          </h1>

          {/* Description */}
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm leading-relaxed mb-6">
            {customMessage ||
              'Actualmente estamos optimizando y realizando mejoras técnicas en el servidor privado de la bóveda. El acceso para visitantes y miembros se encuentra temporalmente bloqueado.'}
          </p>

          {/* Security Banner: No viewing or actions allowed for regular users */}
          <div className={`w-full p-3.5 rounded-2xl border text-left flex items-start gap-3 mb-6 ${
            isDark
              ? 'bg-[#15151C] border-[#22222E] text-slate-400'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}>
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                Acceso restringido
              </span>
              No es posible visualizar contenidos, listas ni realizar descargas. Solo administradores autorizados pueden acceder usando su clave maestra.
            </div>
          </div>

          {/* Admin Unlock Toggle Button or Form */}
          {!showAdminPortal ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAdminPortal(true)}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-2xl bg-gradient-to-r from-[#0066FF] to-[#0052CC] hover:from-[#005CE6] hover:to-[#0047B3] text-white font-bold text-xs sm:text-sm shadow-lg shadow-[#0066FF]/25 cursor-pointer transition-all"
            >
              <Key className="w-4 h-4" />
              <span>Ingresar como Administrador con Key</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </motion.button>
          ) : (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleKeySubmit}
              className="w-full flex flex-col gap-3 text-left pt-2 border-t border-slate-200 dark:border-[#22222E]"
            >
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#0066FF]" />
                  <span>Clave Maestra de Administrador (Key)</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPortal(false);
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>

              {/* Password Input */}
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={adminKey}
                  onChange={(e) => {
                    setAdminKey(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Introduce tu Key (ej. 360)"
                  autoFocus
                  disabled={isLoading}
                  className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono tracking-wider focus:outline-none transition-all pr-11 ${
                    isDark
                      ? 'bg-[#15151C] border-[#2A2A38] text-white placeholder-slate-500 focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20'
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0066FF] focus:ring-2 focus:ring-[#0066FF]/20'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-500 dark:text-red-400 text-xs flex items-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0" />
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
                    className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 dark:text-emerald-400 text-xs flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{successMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading || !adminKey.trim()}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#0066FF] hover:bg-[#0055D4] text-white font-bold text-xs sm:text-sm shadow-md shadow-[#0066FF]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verificando Key...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Desbloquear y Acceder</span>
                  </>
                )}
              </motion.button>
            </motion.form>
          )}
        </motion.div>
      </main>

      {/* Footer info */}
      <footer className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-2 py-3 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-white/5 shrink-0">
        <div className="flex items-center gap-2">
          <Server className="w-3.5 h-3.5 text-amber-500" />
          <span>Servidor Privado App 66 &bull; Seguridad Reforzada</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Solo Administradores Autorizados</span>
          <span className="inline-block w-1 h-1 rounded-full bg-slate-400" />
          <span className="font-mono text-[10px]">AUTH_MODE: MASTER_KEY</span>
        </div>
      </footer>
    </div>
  );
};
