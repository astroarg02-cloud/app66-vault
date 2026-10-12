import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderClosed, Lock, Heart, MessageSquare, 
  Plus, ChevronRight, LayoutGrid, List as ListIcon, HardDrive, Trash2, 
  AlertTriangle, FolderPlus, Edit3, ArrowLeft, Layers, Sparkles,
  Crown, FileText
} from 'lucide-react';
import { VaultItem, VaultList, UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { hasVaultItemFile } from '../../utils/vaultHelpers';
import { getListIcon } from '../../utils/listIcons';

interface VaultScreenProps {
  items: VaultItem[];
  lists?: VaultList[];
  currentUser: UserProfile;
  onSelectItem: (item: VaultItem) => void;
  onOpenAdminUpload: () => void;
  onOpenAdminCreateList?: () => void;
  onOpenAdminEditList?: (list: VaultList) => void;
  onDeleteList?: (listId: string) => Promise<any> | void;
  onDeleteItem?: (itemId: string) => void;
  onNavigateToReceipts?: () => void;
  onNavigateToMembership?: () => void;
  activeTabMode?: 'items' | 'collections';
  onTabModeChange?: (mode: 'items' | 'collections') => void;
  selectedListId?: string | null;
  onSelectedListChange?: (listId: string | null) => void;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({
  items,
  lists = [],
  currentUser,
  onSelectItem,
  onOpenAdminUpload,
  onOpenAdminCreateList,
  onOpenAdminEditList,
  onDeleteList,
  onDeleteItem,
  onNavigateToReceipts,
  onNavigateToMembership,
  activeTabMode: externalActiveTabMode,
  onTabModeChange,
  selectedListId: externalSelectedListId,
  onSelectedListChange,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(false);
  const [internalSelectedListId, setInternalSelectedListId] = useState<string | null>(null);
  const [internalActiveTabMode, setInternalActiveTabMode] = useState<'items' | 'collections'>(
    isAdmin ? 'items' : 'collections'
  );

  const selectedListId = externalSelectedListId !== undefined ? externalSelectedListId : internalSelectedListId;
  const setSelectedListId = (id: string | null) => {
    setInternalSelectedListId(id);
    onSelectedListChange?.(id);
  };

  const activeTabMode =
    externalActiveTabMode !== undefined
      ? externalActiveTabMode
      : internalActiveTabMode;
  const setActiveTabMode = (mode: 'items' | 'collections') => {
    setInternalActiveTabMode(mode);
    onTabModeChange?.(mode);
  };
  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null);
  const [listToDelete, setListToDelete] = useState<VaultList | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const { isDark } = useTheme();

  // Active selected list object
  const activeList = selectedListId ? lists.find((l) => l.id === selectedListId) || null : null;

  // Filter items by search query AND active list
  const filteredItems = items.filter((item) => {
    // 1. Check List Filter
    if (selectedListId && activeList) {
      const isInsideList = 
        (Array.isArray(activeList.itemIds) && activeList.itemIds.includes(item.id)) ||
        (Array.isArray(item.listIds) && item.listIds.includes(selectedListId));
      if (!isInsideList) return false;
    }

    // 2. Check Search Query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(query);
      const matchDesc = item.description.toLowerCase().includes(query);
      const matchType = item.fileType && item.fileType.toLowerCase().includes(query);
      return matchTitle || matchDesc || matchType;
    }

    return true;
  });

  const handleConfirmDelete = async () => {
    if (!itemToDelete || !onDeleteItem || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(itemToDelete.id);
      setItemToDelete(null);
    } catch (err) {
      console.error('Error deleting item from list:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDeleteList = async () => {
    if (!listToDelete || !onDeleteList || isDeletingList) return;
    setIsDeletingList(true);
    try {
      if (selectedListId === listToDelete.id) {
        setSelectedListId(null);
        if (!isAdmin) {
          setActiveTabMode('collections');
        }
      }
      await onDeleteList(listToDelete.id);
      setListToDelete(null);
    } catch (err) {
      console.error('Error deleting list:', err);
    } finally {
      setIsDeletingList(false);
    }
  };

  const handleSelectCollection = (listId: string) => {
    setSelectedListId(listId);
    setActiveTabMode('items');
  };

  const handleBackToCollections = () => {
    setSelectedListId(null);
    setActiveTabMode('collections');
  };

  return (
    <div
      className={`h-full flex flex-col overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* Top Bar / Header */}
      <div
        className={`px-3 sm:px-5 pt-3 pb-2.5 sm:pt-3.5 sm:pb-3 border-b backdrop-blur-md transition-colors shrink-0 ${
          isDark
            ? 'border-[#1E1E24] bg-black/90'
            : 'border-[#E2E8F0] bg-white/95 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-1.5 sm:mb-2.5 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="text-[9.5px] sm:text-[10px] font-extrabold tracking-[0.16em] sm:tracking-[0.2em] text-[#0066FF] uppercase flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{isAdmin ? 'BÓVEDA PRIVADA' : activeList ? 'COLECCIÓN SELECCIONADA' : 'COLECCIONES EXCLUSIVAS'}</span>
              {lists.length > 0 && (
                <span className="text-[8.5px] sm:text-[9px] px-1.5 py-0.2 rounded-full bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30 shrink-0">
                  {lists.length} COLECCIONES
                </span>
              )}
            </div>
            <h2
              className={`text-base sm:text-xl font-bold tracking-tight truncate ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              {activeList
                ? activeList.name
                : isAdmin
                ? activeTabMode === 'collections'
                  ? 'Gestión de Colecciones'
                  : 'Directorio de Recursos'
                : 'Colecciones de Publicaciones'}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isAdmin ? (
              <div className="flex items-center gap-1.5">
                {onOpenAdminCreateList && (
                  <motion.button
                    id="admin-create-list-trigger-btn"
                    onClick={onOpenAdminCreateList}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      isDark
                        ? 'bg-[#121216] hover:bg-[#1E1E24] border-[#1E1E24] text-white'
                        : 'bg-white hover:bg-slate-100 border-[#CBD5E1] text-[#0F172A]'
                    }`}
                    title="Crear una nueva lista para agrupar publicaciones"
                  >
                    <FolderPlus className="w-3.5 h-3.5 text-[#0066FF] shrink-0" />
                    <span className="hidden sm:inline">+ Nueva Colección</span>
                    <span className="sm:hidden">+ Lista</span>
                  </motion.button>
                )}

                <motion.button
                  id="admin-upload-trigger-btn"
                  onClick={onOpenAdminUpload}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-[11px] sm:text-xs font-bold transition-all shadow-md shadow-[#0066FF]/25 cursor-pointer whitespace-nowrap"
                  title="Subir y alojar nuevo material"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  <span className="hidden sm:inline">+ Subir Material</span>
                  <span className="sm:hidden">Subir</span>
                </motion.button>
              </div>
            ) : (
              <div
                className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-[9.5px] sm:text-[10px] font-bold border whitespace-nowrap ${
                  isDark
                    ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#8E8E93]'
                    : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#64748B]'
                }`}
              >
                <Lock className="w-3 h-3 text-[#0066FF] shrink-0" />
                <span>SOLO LECTURA</span>
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE LIST / COLLECTION BANNER (When viewing inside a specific list) */}
        {activeTabMode === 'items' && activeList && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-2 p-2.5 sm:p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
              isDark ? 'bg-[#121216] border-[#1E1E24]' : 'bg-blue-50/70 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                style={{ backgroundColor: activeList.color || '#0066FF' }}
              >
                {React.createElement(getListIcon(activeList.icon), { className: 'w-4.5 h-4.5' })}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs sm:text-sm font-bold truncate ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                    {activeList.name}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#0066FF]/15 text-[#0066FF] shrink-0">
                    {filteredItems.length} {filteredItems.length === 1 ? 'publicación' : 'publicaciones'}
                  </span>
                </div>
                {activeList.description && (
                  <p className={`text-[11px] truncate ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                    {activeList.description}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-white/5">
              {/* Grid / List switch for regular users inside a collection */}
              {!isAdmin && (
                <button
                  type="button"
                  onClick={() => setIsGridView(!isGridView)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#8E8E93] hover:text-white'
                      : 'bg-white border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
                  }`}
                  title="Cambiar vista Lista/Cuadrícula"
                >
                  {isGridView ? <ListIcon className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                </button>
              )}

              {isAdmin && onOpenAdminEditList && (
                <button
                  type="button"
                  onClick={() => onOpenAdminEditList(activeList)}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#8E8E93] hover:text-white'
                      : 'bg-white border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
                  }`}
                  title="Editar o reorganizar esta colección"
                >
                  <Edit3 className="w-3 h-3 text-[#0066FF]" />
                  <span>Editar</span>
                </button>
              )}

              {isAdmin && onDeleteList && (
                <button
                  type="button"
                  onClick={() => setListToDelete(activeList)}
                  className={`px-2 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-[#0A0A0C] border-[#1E1E24] text-red-400 hover:bg-red-500/15 hover:border-red-500/30'
                      : 'bg-white border-[#CBD5E1] text-red-600 hover:bg-red-50 hover:border-red-200'
                  }`}
                  title="Eliminar esta colección"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Borrar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleBackToCollections}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isAdmin
                    ? isDark ? 'text-slate-400 hover:text-white bg-[#0A0A0C] border border-[#1E1E24]' : 'text-slate-600 hover:text-black bg-white border border-[#CBD5E1]'
                    : 'bg-[#0066FF] text-white hover:bg-[#0052FF] shadow-xs'
                }`}
                title={isAdmin ? 'Ver todas las publicaciones' : 'Volver a la vista de Colecciones'}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{isAdmin ? 'Todas' : 'Colecciones'}</span>
              </button>
            </div>
          </motion.div>
        )}

      </div>

      {/* Directory Content List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 lg:p-6 pb-20 sm:pb-28 space-y-3 sm:space-y-4">
        {/* COLLECTIONS / LISTS HUB VIEW */}
        {activeTabMode === 'collections' && !activeList ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                  {isAdmin ? 'Gestión de Colecciones' : 'Colecciones Temáticas'}
                </h3>
                <p className={`text-[11px] ${isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}`}>
                  {isAdmin
                    ? 'Crea, edita o elimina colecciones para organizar las publicaciones que verán los usuarios.'
                    : 'Explora el material y las publicaciones organizadas exclusivamente por temas.'}
                </p>
              </div>
              {isAdmin && onOpenAdminCreateList && (
                <button
                  onClick={onOpenAdminCreateList}
                  className="px-3 py-1.5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>+ Crear Colección</span>
                </button>
              )}
            </div>

            {lists.length === 0 ? (
              <div className={`p-8 rounded-2xl border text-center space-y-3 ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
              }`}>
                <div className="w-12 h-12 mx-auto rounded-2xl bg-[#0066FF]/15 text-[#0066FF] flex items-center justify-center">
                  <FolderClosed className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold">No hay colecciones creadas aún</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                    {isAdmin
                      ? 'Como Administrador, puedes crear colecciones temáticas para clasificar las publicaciones y que los usuarios las vean organizadas.'
                      : 'El administrador aún no ha configurado colecciones de publicaciones disponibles.'}
                  </p>
                </div>
                {isAdmin && onOpenAdminCreateList && (
                  <button
                    onClick={onOpenAdminCreateList}
                    className="px-4 py-2 rounded-xl bg-[#0066FF] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Crear Primera Colección</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {lists
                  .filter((l) => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return l.name.toLowerCase().includes(q) || (l.description && l.description.toLowerCase().includes(q));
                  })
                  .map((list, idx) => {
                    const ListIconComp = getListIcon(list.icon);
                    const listItems = items.filter((it) => 
                      (Array.isArray(list.itemIds) && list.itemIds.includes(it.id)) ||
                      (Array.isArray(it.listIds) && it.listIds.includes(list.id))
                    );

                    return (
                      <motion.div
                        key={list.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22, delay: idx * 0.04 }}
                        whileHover={{ y: -3, scale: 1.01 }}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between group ${
                          isDark
                            ? 'bg-[#0A0A0C] border-[#1E1E24] hover:border-[#0066FF]/60 hover:shadow-lg hover:shadow-[#0066FF]/10'
                            : 'bg-white border-[#E2E8F0] hover:border-[#0066FF]/60 shadow-sm hover:shadow-md'
                        }`}
                        onClick={() => handleSelectCollection(list.id)}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md"
                              style={{ backgroundColor: list.color || '#0066FF' }}
                            >
                              <ListIconComp className="w-5 h-5" />
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30">
                                {listItems.length} {listItems.length === 1 ? 'publicación' : 'publicaciones'}
                              </span>

                              {isAdmin && onOpenAdminEditList && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenAdminEditList(list);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isDark
                                      ? 'text-slate-400 hover:text-white hover:bg-[#121216]'
                                      : 'text-slate-500 hover:text-black hover:bg-slate-100'
                                  }`}
                                  title="Editar Colección"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isAdmin && onDeleteList && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setListToDelete(list);
                                  }}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    isDark
                                      ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                                      : 'text-slate-500 hover:text-red-600 hover:bg-red-50'
                                  }`}
                                  title="Eliminar Colección"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          <h4 className={`text-sm font-bold leading-snug group-hover:text-[#0066FF] transition-colors ${
                            isDark ? 'text-white' : 'text-[#0F172A]'
                          }`}>
                            {list.name}
                          </h4>

                          <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${
                            isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'
                          }`}>
                            {list.description || 'Colección exclusiva de material organizada por el Administrador.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 dark:border-white/5 text-[11px]">
                          <span className={isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}>
                            Creada: {list.createdAt || 'Reciente'}
                          </span>
                          <span className="text-[#0066FF] font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                            <span>Ver publicaciones</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          /* EMPTY STATE FOR ITEMS VIEW */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`py-12 px-6 flex flex-col items-center justify-center text-center rounded-2xl space-y-4 border transition-colors ${
              isDark
                ? 'bg-[#0A0A0C] border-[#1E1E24]'
                : 'bg-white border-[#E2E8F0] shadow-sm'
            }`}
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                isDark
                  ? 'bg-black border-[#1E1E24] shadow-[0_0_30px_-5px_rgba(0,102,255,0.2)]'
                  : 'bg-blue-50 border-blue-100 shadow-sm'
              }`}
            >
              <FolderClosed className="w-7 h-7 text-[#0066FF]" />
            </motion.div>
            <div className="space-y-1 max-w-xs">
              <h4
                className={`text-sm font-bold tracking-wide ${
                  isDark ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                {activeList ? `No hay publicaciones en "${activeList.name}"` : 'Bóveda Sin Publicaciones'}
              </h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                {activeList
                  ? isAdmin
                    ? 'Esta colección no tiene publicaciones asociadas. Puedes editar la colección para incluir publicaciones existentes o subir nuevo material.'
                    : 'El administrador aún no ha asignado publicaciones a esta colección.'
                  : isAdmin
                  ? 'La bóveda se encuentra vacía. Como Administrador tienes permiso exclusivo para subir y alojar nuevo material.'
                  : 'Actualmente no hay publicaciones disponibles.'}
              </p>
            </div>

            {activeList ? (
              <div className="flex items-center gap-2 pt-2">
                {isAdmin && onOpenAdminEditList && (
                  <motion.button
                    onClick={() => onOpenAdminEditList(activeList)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0066FF] text-white text-xs font-bold cursor-pointer shadow-md"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Asignar Publicaciones</span>
                  </motion.button>
                )}
                <button
                  onClick={handleBackToCollections}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-semibold cursor-pointer"
                >
                  {isAdmin ? 'Ver Todas' : 'Volver a Colecciones'}
                </button>
              </div>
            ) : isAdmin ? (
              <motion.button
                id="empty-state-admin-upload-btn"
                onClick={onOpenAdminUpload}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold transition-all shadow-lg shadow-[#0066FF]/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Primer Recurso (Admin)</span>
              </motion.button>
            ) : (
              <button
                onClick={handleBackToCollections}
                className="mt-2 px-4 py-2 rounded-xl bg-[#0066FF] text-white text-xs font-bold cursor-pointer shadow-md"
              >
                Volver a Colecciones
              </button>
            )}
          </motion.div>
        ) : isGridView ? (
          /* GRID VIEW */
          <motion.div 
            layout 
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            <AnimatePresence>
              {filteredItems.map((item, index) => {
                const itemLists = lists.filter((l) => Array.isArray(l.itemIds) && l.itemIds.includes(item.id));
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{
                      duration: 0.25,
                      delay: Math.min(index * 0.03, 0.25),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    id={`vault-item-grid-${item.id}`}
                    onClick={() => onSelectItem(item)}
                    className={`border rounded-xl overflow-hidden cursor-pointer transition-shadow flex flex-col group relative ${
                      isDark
                        ? 'bg-[#0A0A0C] border-[#1E1E24] hover:border-[#0066FF]/70 hover:shadow-lg hover:shadow-[#0066FF]/10'
                        : 'bg-white border-[#E2E8F0] hover:border-[#0066FF]/70 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className={`relative h-28 sm:h-36 overflow-hidden ${isDark ? 'bg-[#121216]' : 'bg-[#E2E8F0]'}`}>
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                      />
                      {hasVaultItemFile(item) && item.fileType ? (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[9px] font-bold text-[#0066FF] uppercase">
                          {item.fileType}
                        </div>
                      ) : (
                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-xs text-[9px] font-semibold text-white/80 uppercase">
                          {item.category === 'document' ? 'Doc' : item.category === 'code' ? 'Post' : 'Publicación'}
                        </div>
                      )}

                      {/* List badge on grid card */}
                      {itemLists.length > 0 && (
                        <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
                          {itemLists.slice(0, 2).map((l) => (
                            <span
                              key={l.id}
                              className="px-1.5 py-0.2 rounded text-[8px] font-bold text-white shadow-xs backdrop-blur-xs"
                              style={{ backgroundColor: l.color || '#0066FF' }}
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {currentUser.role === 'admin' && onDeleteItem && (
                        <motion.button
                          id={`delete-grid-btn-${item.id}`}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToDelete(item);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-white/80 hover:text-white transition-colors"
                          title="Eliminar publicación (Admin)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4
                          className={`text-xs font-semibold line-clamp-2 leading-tight ${
                            isDark ? 'text-white' : 'text-[#0F172A]'
                          }`}
                        >
                          {item.title}
                        </h4>
                      </div>
                      <div
                        className={`flex items-center justify-between pt-2 mt-2 border-t text-[10px] ${
                          isDark
                            ? 'border-[#1E1E24] text-[#8E8E93]'
                            : 'border-[#E2E8F0] text-[#64748B]'
                        }`}
                      >
                        <span>{item.fileSize || item.version || ''}</span>
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-[#FF2E63]" />
                          <span>{item.likesCount}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* LIST VIEW */
          <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-3.5">
            <AnimatePresence>
              {filteredItems.map((item, index) => {
                const itemLists = lists.filter((l) => Array.isArray(l.itemIds) && l.itemIds.includes(item.id));
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.92 }}
                    transition={{
                      duration: 0.24,
                      delay: Math.min(index * 0.03, 0.25),
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    whileHover={{ y: -3, scale: 1.008 }}
                    whileTap={{ scale: 0.985 }}
                    id={`vault-item-list-${item.id}`}
                    onClick={() => onSelectItem(item)}
                    className={`border rounded-2xl p-3 sm:p-4 cursor-pointer transition-shadow flex items-start gap-3 sm:gap-3.5 group relative ${
                      isDark
                        ? 'bg-[#0A0A0C] border-[#1E1E24] hover:border-[#0066FF]/60 hover:shadow-lg hover:shadow-[#0066FF]/10'
                        : 'bg-white border-[#E2E8F0] hover:border-[#0066FF]/60 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {/* Cover / Icon Thumbnail */}
                    <div
                      className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border relative transition-colors ${
                        isDark
                          ? 'bg-[#121216] border-[#1E1E24] group-hover:border-[#0066FF]/40'
                          : 'bg-blue-50/80 border-blue-100 group-hover:border-[#0066FF]/40'
                      }`}
                    >
                      {item.coverImage ? (
                        <img
                          src={item.coverImage}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <FolderClosed className="w-6 h-6 text-[#0066FF]" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {hasVaultItemFile(item) && item.fileType ? (
                            <span className="px-2 py-0.5 rounded-md bg-[#0066FF]/15 text-[10px] font-bold text-[#0066FF] uppercase">
                              {item.fileType}
                            </span>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                              isDark ? 'bg-white/5 text-[#8E8E93]' : 'bg-slate-100 text-[#64748B]'
                            }`}>
                              Publicación
                            </span>
                          )}

                          {/* List badges */}
                          {itemLists.map((l) => (
                            <span
                              key={l.id}
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white"
                              style={{ backgroundColor: l.color || '#0066FF' }}
                            >
                              {l.name}
                            </span>
                          ))}

                          {hasVaultItemFile(item) && item.fileSize && (
                            <span
                              className={`text-[11px] font-mono ${
                                isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
                              }`}
                            >
                              {item.fileSize}
                            </span>
                          )}
                        </div>

                        {currentUser.role === 'admin' && onDeleteItem && (
                          <motion.button
                            id={`delete-list-btn-${item.id}`}
                            whileHover={{ scale: 1.2 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete(item);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isDark
                                ? 'text-[#5A5A62] hover:text-red-400 hover:bg-red-500/10'
                                : 'text-[#94A3B8] hover:text-red-600 hover:bg-red-50'
                            }`}
                            title="Eliminar publicación (Admin)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </div>

                      <h3
                        className={`text-sm font-semibold truncate transition-colors ${
                          isDark ? 'text-white' : 'text-[#0F172A]'
                        }`}
                      >
                        {item.title}
                      </h3>

                      <p className={`text-xs line-clamp-1 mt-0.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                        {item.description}
                      </p>

                      <div
                        className={`flex items-center gap-4 mt-2 pt-2 border-t text-[11px] ${
                          isDark
                            ? 'border-[#1E1E24]/60 text-[#8E8E93]'
                            : 'border-[#E2E8F0] text-[#64748B]'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3 text-[#5A5A62]" />
                          <span>{item.likesCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-[#5A5A62]" />
                          <span>{item.comments.length} en debate</span>
                        </div>
                        <span className="ml-auto text-[10px] opacity-70">
                          {item.version || 'v1.0'}
                        </span>
                        <ChevronRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-[#0066FF] transition-all" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Admin Delete Item Confirmation Dialog Modal */}
      <AnimatePresence>
        {itemToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              id="vault-delete-confirm-screen-modal"
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 14 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className={`w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl border ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                    ¿Eliminar Publicación?
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                    Esta acción borrará "{itemToDelete.title}" permanentemente de la bóveda para todos los usuarios.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <motion.button
                  id="confirm-delete-screen-btn"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/30 cursor-pointer"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
                </motion.button>
                <motion.button
                  onClick={() => setItemToDelete(null)}
                  disabled={isDeleting}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    isDark
                      ? 'border-[#1E1E24] text-[#8E8E93] hover:text-white'
                      : 'border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Delete List Confirmation Dialog Modal */}
      <AnimatePresence>
        {listToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              id="vault-delete-list-confirm-modal"
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 14 }}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              className={`w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl border ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                    ¿Eliminar Lista "{listToDelete.name}"?
                  </h4>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                    Esta acción eliminará únicamente la lista de agrupación. Todas las publicaciones permanecerán guardadas intactas en la bóveda.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <motion.button
                  id="confirm-delete-list-btn"
                  onClick={handleConfirmDeleteList}
                  disabled={isDeletingList}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/30 cursor-pointer"
                >
                  {isDeletingList ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeletingList ? 'Borrando...' : 'Sí, Eliminar Lista'}</span>
                </motion.button>
                <motion.button
                  onClick={() => setListToDelete(null)}
                  disabled={isDeletingList}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer ${
                    isDark
                      ? 'border-[#1E1E24] text-[#8E8E93] hover:text-white'
                      : 'border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Cancelar
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
