import React, { useState } from 'react';
import { 
  FolderClosed, Lock, Search, Heart, MessageSquare, 
  Plus, ChevronRight, LayoutGrid, List, HardDrive
} from 'lucide-react';
import { VaultItem, UserProfile } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface VaultScreenProps {
  items: VaultItem[];
  currentUser: UserProfile;
  onSelectItem: (item: VaultItem) => void;
  onOpenAdminUpload: () => void;
}

export const VaultScreen: React.FC<VaultScreenProps> = ({
  items,
  currentUser,
  onSelectItem,
  onOpenAdminUpload,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGridView, setIsGridView] = useState(false);
  const { isDark } = useTheme();

  const filteredItems = items.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      (item.fileType && item.fileType.toLowerCase().includes(query))
    );
  });

  return (
    <div
      className={`h-full flex flex-col overflow-hidden transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* Top Bar / Header */}
      <div
        className={`px-5 pt-4 pb-3 border-b backdrop-blur-md transition-colors ${
          isDark
            ? 'border-[#1E1E24] bg-black/90'
            : 'border-[#E2E8F0] bg-white/95 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] font-extrabold tracking-[0.2em] text-[#0066FF] uppercase">
              BÓVEDA PRIVADA
            </div>
            <h2
              className={`text-xl font-bold tracking-tight ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              Directorio de Recursos
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {currentUser.role === 'admin' ? (
              <button
                id="admin-upload-trigger-btn"
                onClick={onOpenAdminUpload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold transition-all shadow-md shadow-[#0066FF]/25 animate-pulse"
                title="Solo el Administrador puede alojar nuevos recursos"
              >
                <Plus className="w-4 h-4" />
                <span>+ Subir Material</span>
              </button>
            ) : (
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  isDark
                    ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#8E8E93]'
                    : 'bg-[#F1F5F9] border-[#CBD5E1] text-[#64748B]'
                }`}
              >
                <Lock className="w-3 h-3 text-[#0066FF]" />
                <span>SOLO LECTURA</span>
              </div>
            )}
          </div>
        </div>

        {/* Informative Security Banner for Regular VIP Members vs Admin */}
        {currentUser.role !== 'admin' ? (
          <div
            className={`mb-3 p-2.5 rounded-xl border flex items-start gap-2.5 text-[11px] transition-colors ${
              isDark
                ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#8E8E93]'
                : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-[#0066FF] mt-1 shrink-0" />
            <p className="leading-snug">
              <strong className={isDark ? 'text-white' : 'text-[#0F172A]'}>
                Publicaciones exclusivas del Administrador.
              </strong>{' '}
              Como Miembro VIP puedes descargar los archivos, interactuar con Me Gusta y participar en el Foro Privado.
            </p>
          </div>
        ) : (
          <div
            className={`mb-3 p-2.5 rounded-xl border flex items-start gap-2.5 text-[11px] transition-colors ${
              isDark
                ? 'bg-[#0066FF]/10 border-[#0066FF]/30 text-[#8E8E93]'
                : 'bg-blue-50/80 border-[#0066FF]/30 text-[#334155]'
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-[#0066FF] mt-1 shrink-0 animate-ping" />
            <p className="leading-snug">
              <strong className="text-[#0066FF]">Modo Administrador Activo:</strong> Tienes privilegios exclusivos de publicación (crear recursos, subir archivos y gestionar la Bóveda).
            </p>
          </div>
        )}

        {/* Search & Grid Toggle */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              className={`w-4 h-4 absolute left-3.5 top-3 ${
                isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
              }`}
            />
            <input
              id="vault-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en el directorio privado..."
              className={`w-full rounded-xl pl-10 pr-4 py-2 text-xs transition-colors focus:outline-none focus:border-[#0066FF] border ${
                isDark
                  ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-[#5A5A62]'
                  : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8]'
              }`}
            />
          </div>

          <button
            onClick={() => setIsGridView(!isGridView)}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#8E8E93] hover:text-white'
                : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A]'
            }`}
            title="Cambiar vista Lista/Cuadrícula"
          >
            {isGridView ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Directory Content List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div
            className={`py-12 px-6 flex flex-col items-center justify-center text-center rounded-2xl space-y-4 border transition-colors ${
              isDark
                ? 'bg-[#0A0A0C] border-[#1E1E24]'
                : 'bg-white border-[#E2E8F0] shadow-sm'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${
                isDark
                  ? 'bg-black border-[#1E1E24] shadow-[0_0_30px_-5px_rgba(0,102,255,0.2)]'
                  : 'bg-blue-50 border-blue-100 shadow-sm'
              }`}
            >
              <FolderClosed className="w-7 h-7 text-[#0066FF]" />
            </div>
            <div className="space-y-1 max-w-xs">
              <h4
                className={`text-sm font-bold tracking-wide ${
                  isDark ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                Bóveda Sin Publicaciones
              </h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                {currentUser.role === 'admin'
                  ? 'La bóveda se encuentra vacía. Como Administrador tienes permiso exclusivo para subir y alojar nuevo material.'
                  : 'Actualmente no hay publicaciones en el servidor. Solo el Administrador puede publicar nuevo contenido exclusivo.'}
              </p>
            </div>

            {currentUser.role === 'admin' ? (
              <button
                id="empty-state-admin-upload-btn"
                onClick={onOpenAdminUpload}
                className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold transition-all shadow-lg shadow-[#0066FF]/30"
              >
                <Plus className="w-4 h-4" />
                <span>Publicar Primer Recurso (Admin)</span>
              </button>
            ) : (
              <div
                className={`mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] border ${
                  isDark
                    ? 'bg-black border-[#1E1E24] text-[#5A5A62]'
                    : 'bg-[#F1F5F9] border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                <Lock className="w-3.5 h-3.5 text-[#0066FF]" />
                <span>En espera de publicaciones del Administrador</span>
              </div>
            )}
          </div>
        ) : isGridView ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              return (
                <div
                  key={item.id}
                  id={`vault-item-grid-${item.id}`}
                  onClick={() => onSelectItem(item)}
                  className={`border rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col group ${
                    isDark
                      ? 'bg-[#0A0A0C] border-[#1E1E24] hover:border-[#0066FF]/60'
                      : 'bg-white border-[#E2E8F0] hover:border-[#0066FF]/60 shadow-sm'
                  }`}
                >
                  <div className={`relative h-24 overflow-hidden ${isDark ? 'bg-[#121216]' : 'bg-[#E2E8F0]'}`}>
                    <img
                      src={item.coverImage}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {item.fileType && (
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-[#0066FF] uppercase">
                        {item.fileType}
                      </div>
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
                </div>
              );
            })}
          </div>
        ) : (
          filteredItems.map((item) => {
            return (
              <div
                key={item.id}
                id={`vault-item-list-${item.id}`}
                onClick={() => onSelectItem(item)}
                className={`border rounded-2xl p-4 cursor-pointer transition-all flex items-start gap-3.5 group active:scale-[0.99] ${
                  isDark
                    ? 'bg-[#0A0A0C] border-[#1E1E24] hover:border-[#0066FF]/50'
                    : 'bg-white border-[#E2E8F0] hover:border-[#0066FF]/50 shadow-sm'
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
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FolderClosed className="w-6 h-6 text-[#0066FF]" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  {(item.fileType || item.fileSize) && (
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {item.fileType ? (
                        <span className="px-2 py-0.5 rounded-md bg-[#0066FF]/15 text-[10px] font-bold text-[#0066FF] uppercase">
                          {item.fileType}
                        </span>
                      ) : <span />}
                      {item.fileSize && (
                        <span
                          className={`text-[11px] font-mono ${
                            isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
                          }`}
                        >
                          {item.fileSize}
                        </span>
                      )}
                    </div>
                  )}

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
                    <ChevronRight className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:text-[#0066FF] transition-all" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
