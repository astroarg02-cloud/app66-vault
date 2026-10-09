import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wrench,
  X,
  CheckCircle2,
  AlertTriangle,
  Power,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Sparkles,
  Key
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { ADMIN_SECURITY_KEY } from '../data/initialVaultData';

interface AdminMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMaintenance: boolean;
  maintenanceMessage: string;
  onSave: (isMaintenance: boolean, message: string) => Promise<boolean>;
}

export const AdminMaintenanceModal: React.FC<AdminMaintenanceModalProps> = ({
  isOpen,
  onClose,
  isMaintenance: initialIsMaintenance,
  maintenanceMessage: initialMessage,
  onSave,
}) => {
  const { isDark } = useTheme();
  const [isMaintenance, setIsMaintenance] = useState(initialIsMaintenance);
  const [message, setMessage] = useState(initialMessage || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsMaintenance(initialIsMaintenance);
      setMessage(initialMessage || '');
      setFeedback(null);
    }
  }, [isOpen, initialIsMaintenance, initialMessage]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      const ok = await onSave(isMaintenance, message.trim());
      if (ok) {
        setFeedback({
          type: 'success',
          text: isMaintenance
            ? '¡Modo Mantenimiento ACTIVADO! Los visitantes verán la pantalla de mantenimiento.'
            : '¡Modo Mantenimiento DESACTIVADO! La bóveda vuelve a estar accesible para miembros.',
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', text: 'No se pudo actualizar el estado de mantenimiento en el servidor.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Error al guardar los cambios' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${
          isDark
            ? 'bg-[#0E0E13] border-[#22222E] text-white shadow-black/80'
            : 'bg-white border-slate-200 text-[#0F172A]'
        }`}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-[#1E1E26] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isMaintenance
                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
            }`}>
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Control de Mantenimiento</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  isMaintenance
                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
                }`}>
                  {isMaintenance ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configura si la aplicación muestra el bloqueo de mantenimiento
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          {/* Main Toggle Switch */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isDark ? 'bg-[#15151D] border-[#252533]' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isMaintenance ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-400/20 text-slate-400'
              }`}>
                <Power className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold">
                  {isMaintenance ? 'Modo Mantenimiento HABILITADO' : 'Modo Mantenimiento DESHABILITADO'}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isMaintenance
                    ? 'Bloquea el acceso general. Solo administradores con Key pueden entrar.'
                    : 'La plataforma está abierta para todos los usuarios registrados.'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsMaintenance(!isMaintenance)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isMaintenance ? 'bg-amber-500' : 'bg-slate-300 dark:bg-[#2A2A38]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isMaintenance ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Explanation Banner */}
          <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
            isMaintenance
              ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
              : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
          }`}>
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isMaintenance
                ? 'Cualquier persona que visite el sitio verá únicamente la pantalla "En Mantenimiento" y no podrá ver ni descargar ningún archivo, a menos que ingrese con la Key de administrador (360).'
                : 'La plataforma está disponible libremente para navegación e inicio de sesión ordinario.'}
            </span>
          </div>

          {/* Custom Message input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Mensaje visible para los visitantes:
            </label>
            <textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ej: Estamos realizando labores de mantenimiento y optimización. Volveremos muy pronto."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none transition-all resize-none ${
                isDark
                  ? 'bg-[#15151D] border-[#2A2A38] text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20'
                  : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20'
              }`}
            />
          </div>

          {/* Feedback Alerts */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                    : 'bg-red-500/10 border-red-500/25 text-red-500 dark:text-red-400'
                }`}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                )}
                <span>{feedback.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-[#1E1E26]">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                isDark
                  ? 'border-[#2A2A38] text-slate-300 hover:bg-white/5'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Aplicar Configuración</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
