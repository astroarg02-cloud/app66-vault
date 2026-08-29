import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, FolderPlus, FolderCheck, Check, Trash2, Search,
  Smartphone, Sliders, Folder, Flame, Star, Code, Video,
  Sparkles, Shield, Package, Zap, BookOpen, AlertTriangle
} from 'lucide-react';
import { VaultItem, VaultList, UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { VerifiedBadge } from '../VerifiedBadge';

interface AdminListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveList: (list: VaultList) => Promise<any> | void;
  onDeleteList?: (listId: string) => Promise<any> | void;
  editingList?: VaultList | null;
  items: VaultItem[];
  currentUser?: UserProfile | null;
}

const AVAILABLE_ICONS = [
  { id: 'smartphone', label: 'Móvil', icon: Smartphone },
  { id: 'sliders', label: 'Ajustes', icon: Sliders },
  { id: 'folder', label: 'Carpeta', icon: Folder },
  { id: 'flame', label: 'Destacado', icon: Flame },
  { id: 'star', label: 'Favorito', icon: Star },
  { id: 'code', label: 'Código', icon: Code },
  { id: 'video', label: 'Video', icon: Video },
  { id: 'sparkles', label: 'Premium', icon: Sparkles },
  { id: 'shield', label: 'Seguridad', icon: Shield },
  { id: 'package', label: 'Pack', icon: Package },
  { id: 'zap', label: 'Rápido', icon: Zap },
  { id: 'book', label: 'Guía', icon: BookOpen },
];

const AVAILABLE_COLORS = [
  { id: '#0066FF', label: 'Azul', bg: 'bg-[#0066FF]', border: 'border-[#0066FF]' },
  { id: '#10B981', label: 'Esmeralda', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  { id: '#8B5CF6', label: 'Púrpura', bg: 'bg-purple-500', border: 'border-purple-500' },
  { id: '#F59E0B', label: 'Ámbar', bg: 'bg-amber-500', border: 'border-amber-500' },
  { id: '#EC4899', label: 'Fucsia', bg: 'bg-pink-500', border: 'border-pink-500' },
  { id: '#06B6D4', label: 'Cyan', bg: 'bg-cyan-500', border: 'border-cyan-500' },
  { id: '#EF4444', label: 'Rojo', bg: 'bg-red-500', border: 'border-red-500' },
];

export const AdminListModal: React.FC<AdminListModalProps> = ({
  isOpen,
  onClose,
  onSaveList,
  onDeleteList,
  editingList,
  items,
  currentUser,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('folder');
  const [color, setColor] = useState('#0066FF');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isDark } = useTheme();

  // Populate form when editingList changes
  useEffect(() => {
    if (editingList) {
      setName(editingList.name || '');
      setDescription(editingList.description || '');
      setIcon(editingList.icon || 'folder');
      setColor(editingList.color || '#0066FF');
      setSelectedItemIds(Array.isArray(editingList.itemIds) ? [...editingList.itemIds] : []);
    } else {
      setName('');
      setDescription('');
      setIcon('folder');
      setColor('#0066FF');
      setSelectedItemIds([]);
    }
    setShowDeleteConfirm(false);
    setItemSearchQuery('');
  }, [editingList, isOpen]);

  if (!isOpen) return null;

  const toggleItemSelection = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleSelectAll = () => {
    setSelectedItemIds(items.map((it) => it.id));
  };

  const handleDeselectAll = () => {
    setSelectedItemIds([]);
  };

  const filteredItems = items.filter((it) => {
    const q = itemSearchQuery.toLowerCase();
    return (
      it.title.toLowerCase().includes(q) ||
      it.description.toLowerCase().includes(q) ||
      (it.fileType && it.fileType.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const listToSave: VaultList = {
        id: editingList?.id || `list-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        description: description.trim(),
        icon,
        color,
        itemIds: selectedItemIds,
        createdAt: editingList?.createdAt || new Date().toISOString().split('T')[0],
        createdBy: currentUser?.uid || 'admin_master_astro',
      };

      await onSaveList(listToSave);
      onClose();
    } catch (err) {
      console.error('Error saving list:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingList || !onDeleteList || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteList(editingList.id);
      onClose();
    } catch (err) {
      console.error('Error deleting list:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Icon preview component
  const CurrentIconComp = AVAILABLE_ICONS.find((i) => i.id === icon)?.icon || Folder;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4"
    >
      <motion.div
        id="admin-list-modal-container"
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
        className={`w-full max-w-lg rounded-3xl max-h-[92dvh] flex flex-col overflow-hidden shadow-2xl border transition-colors ${
          isDark ? 'bg-[#0A0A0C] border-[#1E1E24] text-white' : 'bg-white border-[#CBD5E1] text-[#0F172A]'
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 sm:p-5 border-b flex items-center justify-between transition-colors ${
            isDark ? 'border-[#1E1E24] bg-black/50' : 'border-[#E2E8F0] bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-md transition-colors"
              style={{ backgroundColor: color }}
            >
              <CurrentIconComp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className={`text-sm sm:text-base font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                  {editingList ? 'Editar Lista de Publicaciones' : 'Crear Nueva Lista'}
                </h3>
                <VerifiedBadge className="w-3.5 h-3.5" />
              </div>
              <p className={`text-[11px] ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Organiza y agrupa recursos para que los usuarios naveguen por listas
              </p>
            </div>
          </div>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark
                ? 'text-[#8E8E93] hover:text-white hover:bg-[#121216]'
                : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200'
            }`}
          >
            <X className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto custom-scrollbar space-y-5">
          {/* Nombre de la Lista */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Nombre de la Lista / Colección *
            </label>
            <input
              id="list-name-input"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: 🚀 Masterclasses de Sensibilidad"
              className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0066FF] transition-colors border ${
                isDark ? 'bg-[#121216] border-[#1E1E24] text-white' : 'bg-white border-[#CBD5E1] text-[#0F172A]'
              }`}
            />
          </div>

          {/* Descripción */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-1.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Descripción (Opcional)
            </label>
            <textarea
              id="list-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe qué tipo de publicaciones o utilidades contiene esta lista..."
              className={`w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#0066FF] transition-colors resize-none border ${
                isDark ? 'bg-[#121216] border-[#1E1E24] text-white' : 'bg-white border-[#CBD5E1] text-[#0F172A]'
              }`}
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Icono de la Lista
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVAILABLE_ICONS.map((item) => {
                const IconComponent = item.icon;
                const isSelected = icon === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#0066FF] bg-[#0066FF]/15 text-[#0066FF] shadow-sm'
                        : isDark
                        ? 'border-[#1E1E24] bg-[#121216] text-[#8E8E93] hover:text-white hover:border-[#2A2A34]'
                        : 'border-[#E2E8F0] bg-slate-50 text-[#64748B] hover:text-[#0F172A]'
                    }`}
                    title={item.label}
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="text-[9px] mt-1 truncate max-w-full">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Color Temático
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {AVAILABLE_COLORS.map((col) => {
                const isSelected = color === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setColor(col.id)}
                    className={`w-7 h-7 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                      col.bg
                    } ${isSelected ? 'scale-115 ring-2 ring-white shadow-md' : 'opacity-80 hover:opacity-100 hover:scale-105'}`}
                    title={col.label}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selector de Publicaciones Asociadas */}
          <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-[#1E1E24]">
            <div className="flex items-center justify-between">
              <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#0066FF]`}>
                <FolderCheck className="w-4 h-4" />
                <span>Publicaciones Incluidas ({selectedItemIds.length}/{items.length})</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className={`text-[11px] font-semibold text-[#0066FF] hover:underline cursor-pointer`}
                >
                  Todas
                </button>
                <span className="text-slate-400">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className={`text-[11px] font-semibold text-slate-400 hover:underline cursor-pointer`}
                >
                  Ninguna
                </button>
              </div>
            </div>

            {/* Sub-search inside publications */}
            {items.length > 4 && (
              <div className="relative">
                <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}`} />
                <input
                  type="text"
                  value={itemSearchQuery}
                  onChange={(e) => setItemSearchQuery(e.target.value)}
                  placeholder="Filtrar publicaciones para asociar..."
                  className={`w-full rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#0066FF] border ${
                    isDark ? 'bg-[#121216] border-[#1E1E24] text-white' : 'bg-slate-50 border-[#CBD5E1] text-[#0F172A]'
                  }`}
                />
              </div>
            )}

            {/* List of items to toggle */}
            <div className={`max-h-48 overflow-y-auto custom-scrollbar rounded-2xl border p-2 space-y-1.5 ${
              isDark ? 'bg-[#121216]/50 border-[#1E1E24]' : 'bg-slate-50/60 border-[#E2E8F0]'
            }`}>
              {filteredItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No hay publicaciones disponibles para asociar.
                </div>
              ) : (
                filteredItems.map((it) => {
                  const isChecked = selectedItemIds.includes(it.id);
                  return (
                    <div
                      key={it.id}
                      onClick={() => toggleItemSelection(it.id)}
                      className={`p-2 rounded-xl flex items-center justify-between gap-2.5 transition-all cursor-pointer border ${
                        isChecked
                          ? isDark
                            ? 'bg-[#0066FF]/15 border-[#0066FF]/40 text-white'
                            : 'bg-blue-50 border-[#0066FF]/40 text-[#0F172A]'
                          : isDark
                          ? 'bg-[#0A0A0C] border-transparent hover:border-[#1E1E24] text-[#8E8E93]'
                          : 'bg-white border-transparent hover:border-[#E2E8F0] text-[#64748B]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 border bg-black/20">
                          {it.coverImage ? (
                            <img src={it.coverImage} alt={it.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Folder className="w-4 h-4 text-[#0066FF]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">{it.title}</div>
                          <div className="text-[10px] opacity-70 flex items-center gap-1.5">
                            <span>{it.category}</span>
                            {it.fileType && <span>• {it.fileType}</span>}
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked
                            ? 'bg-[#0066FF] border-[#0066FF] text-white'
                            : isDark
                            ? 'border-[#2A2A34] bg-[#121216]'
                            : 'border-[#CBD5E1] bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Delete section if editing */}
          {editingList && onDeleteList && (
            <div className="pt-2 border-t border-slate-200 dark:border-[#1E1E24]">
              {showDeleteConfirm ? (
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-red-500 text-xs font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>¿Confirmas eliminar la lista "{editingList.name}"?</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Las publicaciones NO se borrarán, solo se eliminará esta agrupación.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Lista'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-semibold cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-semibold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar esta Lista</span>
                </button>
              )}
            </div>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-3 border-t flex gap-3 border-slate-200 dark:border-[#1E1E24]">
            <motion.button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer ${
                isDark
                  ? 'border-[#1E1E24] text-[#8E8E93] hover:text-white'
                  : 'border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              Cancelar
            </motion.button>
            <motion.button
              id="save-list-submit-btn"
              type="submit"
              disabled={isSubmitting}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 py-3 px-4 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#0066FF]/30 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Guardando Lista...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  <span>{editingList ? 'Actualizar Lista' : 'Crear Lista'}</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
