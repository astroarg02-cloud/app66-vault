import React, { useState } from 'react';
import { 
  ArrowLeft, Share2, Download, Heart, MessageSquare, 
  CheckCircle2, Send, Shield, Copy, Check, HardDrive, X, Trash2, AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VaultItem, UserProfile } from '../../types';
import { VerifiedBadge } from '../VerifiedBadge';
import { useTheme } from '../../context/ThemeContext';

interface VaultDetailModalProps {
  item: VaultItem;
  currentUser: UserProfile;
  onClose: () => void;
  onToggleLike: (itemId: string) => void;
  onAddComment: (itemId: string, text: string) => void;
  onDeleteItem?: (itemId: string) => void;
}

export const VaultDetailModal: React.FC<VaultDetailModalProps> = ({
  item,
  currentUser,
  onClose,
  onToggleLike,
  onAddComment,
  onDeleteItem,
}) => {
  const isLiked = Array.isArray(item.likedBy) && item.likedBy.includes(currentUser.uid);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [likeAnimating, setLikeAnimating] = useState(false);
  const { isDark } = useTheme();

  // Handle Download Simulation (Dio / FlutterDownloader)
  const handleDownload = () => {
    if (downloadProgress !== null || isDownloaded) return;
    setDownloadProgress(0);

    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        if (prev === null) return 0;
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloaded(true);
          setDownloadProgress(null);
          confetti({
            particleCount: 40,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#0066FF', '#3385FF', '#FFFFFF'],
          });
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 10;
      });
    }, 200);
  };

  // Handle Like Animation
  const handleLike = () => {
    setLikeAnimating(true);
    onToggleLike(item.id);
    setTimeout(() => setLikeAnimating(false), 300);
  };

  // Handle Comment Submission
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    onAddComment(item.id, commentText.trim());
    setCommentText('');
  };

  // Handle Share Copy
  const shareUrl = `https://vault.privateserver.io/invite/r_${item.id}?auth=secure_token`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Delete Item (Admin)
  const handleDelete = async () => {
    if (!onDeleteItem || isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteItem(item.id);
      onClose();
    } catch (err) {
      console.error('Error deleting item:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        id="vault-detail-modal-container"
        className={`w-full max-w-lg max-h-[92dvh] rounded-3xl flex flex-col overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border transition-colors duration-300 relative ${
          isDark ? 'bg-black border-[#1E1E24] text-white' : 'bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A]'
        }`}
      >
        {/* Top App Bar */}
        <div
          className={`shrink-0 flex items-center justify-between px-3.5 py-2.5 border-b backdrop-blur-md transition-colors ${
            isDark
              ? 'border-[#1E1E24] bg-black/90'
              : 'border-[#E2E8F0] bg-white/95 shadow-sm'
          }`}
        >
          <button
            id="vault-detail-back-btn"
            onClick={onClose}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all border ${
              isDark
                ? 'bg-[#121216] text-white hover:bg-[#1E1E24] border-[#1E1E24]'
                : 'bg-slate-100 text-[#0F172A] hover:bg-slate-200 border-[#E2E8F0]'
            }`}
            title="Salir de la publicación"
          >
            <ArrowLeft className="w-4 h-4 text-[#0066FF]" />
            <span className="text-xs font-bold">Volver</span>
          </button>

          <div className="text-xs font-bold tracking-widest text-[#0066FF] uppercase flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Ficha de Contenido</span>
          </div>

          <div className="flex items-center gap-1">
            {currentUser.role === 'admin' && onDeleteItem && (
              <button
                id="vault-detail-delete-btn"
                onClick={() => setShowDeleteConfirm(true)}
                className={`p-2 rounded-xl transition-colors ${
                  isDark
                    ? 'text-red-400 hover:bg-red-500/20 hover:text-red-300'
                    : 'text-red-500 hover:bg-red-50 hover:text-red-600'
                }`}
                title="Eliminar Publicación (Admin)"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              id="vault-share-btn"
              onClick={() => setShowShareModal(true)}
              className={`p-2 rounded-xl transition-colors ${
                isDark
                  ? 'text-white hover:bg-[#121216]'
                  : 'text-[#0F172A] hover:bg-slate-100'
              }`}
              title="Compartir Invitación"
            >
              <Share2 className={`w-4 h-4 ${isDark ? 'text-[#8E8E93] hover:text-white' : 'text-[#64748B] hover:text-[#0F172A]'}`} />
            </button>

            {/* Direct Close Button with X */}
            <button
              id="vault-close-x-btn"
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${
                isDark
                  ? 'text-white hover:bg-red-500/20 hover:text-red-400'
                  : 'text-[#0F172A] hover:bg-red-50 hover:text-red-500'
              }`}
              title="Cerrar y salir"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5 space-y-4 min-h-0">
          {/* Cover Preview */}
          <div
            className={`relative rounded-2xl overflow-hidden border group transition-colors ${
              isDark ? 'border-[#1E1E24] bg-[#0A0A0C]' : 'border-[#E2E8F0] bg-white shadow-sm'
            }`}
          >
            <img
              src={item.coverImage}
              alt={item.title}
              className="w-full h-44 sm:h-48 object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            <div className="absolute top-3 right-3">
              <span className="px-2.5 py-1 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
                {item.version || 'v1.0'}
              </span>
            </div>

            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              {item.fileType || item.fileSize ? (
                <div className="flex items-center gap-2">
                  {item.fileType && (
                    <span className="px-2.5 py-1 rounded-md bg-[#0066FF] text-[10px] font-extrabold text-white uppercase tracking-wider">
                      {item.fileType}
                    </span>
                  )}
                  {item.fileSize && (
                    <span className="text-xs text-white/90 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                      {item.fileSize}
                    </span>
                  )}
                </div>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-1 text-[11px] text-white/90 bg-black/60 px-2 py-0.5 rounded">
                <HardDrive className="w-3 h-3 text-[#0066FF]" />
                <span>Alojado por Admin</span>
              </div>
            </div>
          </div>

          {/* Title and Action Meta */}
          <div className="space-y-2.5">
            <h1
              className={`text-lg sm:text-xl font-bold leading-tight tracking-tight ${
                isDark ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              {item.title}
            </h1>

            <div className="flex items-center justify-between pt-0.5">
              <div className={`flex items-center gap-1.5 text-xs ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                <span className="w-2 h-2 rounded-full bg-[#0066FF]" />
                <span className={`font-medium ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{item.author.name}</span>
                <VerifiedBadge className="w-3.5 h-3.5" />
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                    isDark
                      ? 'bg-[#121216] border-[#1E1E24] text-[#0066FF]'
                      : 'bg-blue-50 border-blue-200 text-[#0066FF]'
                  }`}
                >
                  {item.author.badge}
                </span>
              </div>

              {/* Animated Like Button */}
              <button
                id={`vault-like-btn-${item.id}`}
                onClick={handleLike}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-all ${
                  isLiked
                    ? 'bg-[#0066FF]/15 border-[#0066FF] text-[#0066FF] shadow-sm'
                    : isDark
                    ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#8E8E93] hover:text-white'
                    : 'bg-white border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] shadow-sm'
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    likeAnimating ? 'scale-135' : 'scale-100'
                  } ${isLiked ? 'fill-[#FF2E63] text-[#FF2E63]' : ''}`}
                />
                <span>{item.likesCount}</span>
              </button>
            </div>
          </div>

          {/* Description */}
          <div
            className={`rounded-xl p-3.5 text-xs sm:text-sm leading-relaxed border transition-colors ${
              isDark
                ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#8E8E93]'
                : 'bg-white border-[#E2E8F0] text-[#475569] shadow-sm'
            }`}
          >
            <p>{item.description}</p>
          </div>

          {/* Main Action: DOWNLOAD BUTTON (solo si tiene archivo adjunto) */}
          {(item.fileType || item.downloadUrl) && item.downloadUrl !== '#' && (
            <div className="space-y-2 pt-1">
              <button
                id={`vault-download-action-btn-${item.id}`}
                onClick={handleDownload}
                disabled={downloadProgress !== null}
                className={`w-full py-3.5 px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-2 shadow-lg ${
                  isDownloaded
                    ? 'bg-[#10B981] text-white shadow-[#10B981]/25 hover:bg-[#059669]'
                    : downloadProgress !== null
                    ? 'bg-[#0066FF]/70 text-white cursor-wait'
                    : 'bg-[#0066FF] hover:bg-[#0052FF] text-white shadow-[#0066FF]/30 active:scale-[0.99]'
                }`}
              >
                {isDownloaded ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Archivo Guardado en Dispositivo</span>
                  </>
                ) : downloadProgress !== null ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Descargando... {downloadProgress}%</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Descargar Archivo {item.fileSize ? `(${item.fileSize})` : ''}</span>
                  </>
                )}
              </button>

              {downloadProgress !== null && (
                <div
                  className={`w-full rounded-full h-1.5 overflow-hidden ${
                    isDark ? 'bg-[#121216]' : 'bg-slate-200'
                  }`}
                >
                  <div
                    className="bg-[#0066FF] h-full transition-all duration-200"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              )}

              <div
                className={`flex items-center justify-between text-[10px] px-1 ${
                  isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'
                }`}
              >
                <span>Protocolo: Firebase Storage + Dio Cache</span>
                <span>Acceso Verificado</span>
              </div>
            </div>
          )}

          {/* Private Forum / Comments Section */}
          <div
            className={`pt-4 border-t space-y-3 ${
              isDark ? 'border-[#1E1E24]' : 'border-[#E2E8F0]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-[#0066FF]" />
                <h3
                  className={`text-xs font-bold tracking-wider uppercase ${
                    isDark ? 'text-white' : 'text-[#0F172A]'
                  }`}
                >
                  Foro Privado ({item.comments.length})
                </h3>
              </div>
              <span className={`text-[10px] ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                Solo miembros registrados
              </span>
            </div>

            {/* Comment Input */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                id="comment-input-field"
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe una pregunta o feedback privado..."
                className={`flex-1 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#0066FF] transition-colors border ${
                  isDark
                    ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-[#5A5A62]'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8] shadow-sm'
                }`}
              />
              <button
                id="submit-comment-btn"
                type="submit"
                disabled={!commentText.trim()}
                className="px-3.5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] disabled:opacity-40 disabled:hover:bg-[#0066FF] text-white flex items-center justify-center transition-all shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* Comment Thread List */}
            <div className="space-y-2 pt-0.5">
              {item.comments.length === 0 ? (
                <div
                  className={`text-center py-4 text-xs rounded-xl border ${
                    isDark
                      ? 'text-[#5A5A62] bg-[#0A0A0C] border-[#1E1E24]'
                      : 'text-[#64748B] bg-white border-[#E2E8F0]'
                  }`}
                >
                  Sin comentarios aún. Sé el primero en dejar feedback al administrador.
                </div>
              ) : (
                item.comments.map((c) => {
                  const isAdminComment = c.userRole === 'admin';
                  return (
                    <div
                      key={c.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isAdminComment
                          ? isDark
                            ? 'bg-[#0066FF]/10 border-[#0066FF]/30'
                            : 'bg-blue-50/70 border-[#0066FF]/30'
                          : isDark
                          ? 'bg-[#0A0A0C] border-[#1E1E24]'
                          : 'bg-white border-[#E2E8F0] shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                            {c.userDisplayName}
                          </span>
                          {isAdminComment && (
                            <div className="flex items-center gap-1">
                              <VerifiedBadge className="w-3.5 h-3.5" />
                              <span className="px-1.5 py-0.2 bg-[#0066FF] text-[8px] font-bold rounded text-white tracking-wider">
                                ADMIN
                              </span>
                            </div>
                          )}
                          <span className={`text-[10px] ${isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}`}>
                            • {c.userTier}
                          </span>
                        </div>
                        <span className={`text-[10px] ${isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}`}>{c.createdAt}</span>
                      </div>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#475569]'}`}>{c.text}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Bottom Admin Delete Option */}
          {currentUser.role === 'admin' && onDeleteItem && (
            <div className="pt-2">
              <button
                id={`vault-delete-post-bottom-btn-${item.id}`}
                onClick={() => setShowDeleteConfirm(true)}
                className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  isDark
                    ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Esta Publicación (Admin)</span>
              </button>
            </div>
          )}

          {/* Bottom Exit Button */}
          <div className="pt-1 pb-2">
            <button
              id="vault-bottom-exit-btn"
              onClick={onClose}
              className={`w-full py-2.5 px-4 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                isDark
                  ? 'border-[#1E1E24] bg-[#0A0A0C] text-[#8E8E93] hover:text-white hover:border-[#2A2A32] hover:bg-[#121216]'
                  : 'border-[#E2E8F0] bg-white text-[#64748B] hover:text-[#0F172A] hover:bg-slate-50 shadow-sm'
              }`}
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#0066FF]" />
              <span>Salir y volver a la Bóveda</span>
            </button>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              id="delete-confirm-modal"
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
                    Esta acción borrará "{item.title}" permanentemente de la bóveda para todos los usuarios.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  id="confirm-delete-action-btn"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-red-600/30"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>{isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold border ${
                    isDark
                      ? 'border-[#1E1E24] text-[#8E8E93] hover:text-white'
                      : 'border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Plus Modal */}
        {showShareModal && (
          <div className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div 
              id="share-modal-container"
              className={`w-full max-w-xs rounded-2xl p-5 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150 border ${
                isDark
                  ? 'bg-[#0A0A0C] border-[#1E1E24]'
                  : 'bg-white border-[#E2E8F0]'
              }`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#0066FF]/20 flex items-center justify-center text-[#0066FF]">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                    Invitar al Servidor
                  </h4>
                  <p className={`text-[11px] ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
                    Paquete share_plus de Flutter
                  </p>
                </div>
              </div>

              <div
                className={`rounded-xl p-3 text-xs break-all font-mono border ${
                  isDark
                    ? 'bg-[#121216] border-[#1E1E24] text-[#8E8E93]'
                    : 'bg-slate-100 border-[#E2E8F0] text-[#475569]'
                }`}
              >
                {shareUrl}
              </div>

              <div className="flex gap-2">
                <button
                  id="copy-invite-link-btn"
                  onClick={copyShareLink}
                  className="flex-1 py-2.5 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#0066FF]/25"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Enlace</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowShareModal(false)}
                  className={`px-3.5 py-2.5 rounded-xl text-xs border ${
                    isDark
                      ? 'border-[#1E1E24] text-[#8E8E93] hover:text-white'
                      : 'border-[#CBD5E1] text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
