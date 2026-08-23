import React, { useState } from 'react';
import { 
  ArrowLeft, Share2, Download, Heart, MessageSquare, 
  CheckCircle2, Send, Shield, Copy, Check, HardDrive, X, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { VaultItem, UserProfile } from '../../types';
import { VerifiedBadge } from '../VerifiedBadge';
import { useTheme } from '../../context/ThemeContext';
import { downloadVaultItemResource } from '../../services/zipExporter';

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

  // Handle Real Functional Download and return to Vault Page
  const handleDownload = async () => {
    if (downloadProgress !== null || isDownloaded) return;
    setDownloadProgress(25);

    try {
      setDownloadProgress(65);
      const success = await downloadVaultItemResource(item);
      setDownloadProgress(100);

      if (success) {
        setIsDownloaded(true);
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.7 },
          colors: ['#0066FF', '#3385FF', '#10B981', '#FFFFFF'],
        });

        // Devolver al usuario a la página de la bóveda después de descargar
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      console.error('Error during item download:', err);
    } finally {
      setTimeout(() => {
        setDownloadProgress(null);
      }, 1000);
    }
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
        {/* Top Floating Notification when downloaded */}
        {isDownloaded && (
          <div className="absolute top-0 left-0 right-0 z-50 bg-emerald-600 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xl animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>¡Archivo descargado! Volviendo a la bóveda...</span>
            </div>
            <span className="text-[10px] bg-emerald-700/80 px-2 py-0.5 rounded font-mono">
              Redirigiendo...
            </span>
          </div>
        )}

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
                <span className={`font-medium ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>{item.author?.name || 'Administrador'}</span>
                <VerifiedBadge className="w-3.5 h-3.5" />
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
                    isDark
                      ? 'bg-[#121216] border-[#1E1E24] text-[#0066FF]'
                      : 'bg-blue-50 border-blue-200 text-[#0066FF]'
                  }`}
                >
                  {item.author?.badge || 'Admin Master'}
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
                    likeAnimating ? 'scale-125' : 'scale-100'
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

          {/* Main Action: DOWNLOAD BUTTON */}
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
                  <span>¡Descargado! Regresando a la Bóveda...</span>
                </>
              ) : downloadProgress !== null ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generando paquete... {downloadProgress}%</span>
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
              <span>Descarga real directa en formato .ZIP</span>
              <span>Acceso Verificado</span>
            </div>
          </div>

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
                  Foro Privado ({item.comments?.length || 0})
                </h3>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {!item.comments || item.comments.length === 0 ? (
                <div
                  className={`text-center py-6 rounded-xl border text-xs ${
                    isDark
                      ? 'bg-[#0A0A0C] border-[#1E1E24] text-[#5A5A62]'
                      : 'bg-white border-[#E2E8F0] text-[#94A3B8]'
                  }`}
                >
                  No hay comentarios aún en este recurso.
                </div>
              ) : (
                item.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      isDark
                        ? 'bg-[#0A0A0C] border-[#1E1E24]'
                        : 'bg-white border-[#E2E8F0] shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                          {comment.userDisplayName}
                        </span>
                        {comment.userRole === 'admin' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                            ADMIN
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] ${isDark ? 'text-[#5A5A62]' : 'text-[#94A3B8]'}`}>
                        {comment.createdAt}
                      </span>
                    </div>
                    <p className={`leading-relaxed ${isDark ? 'text-[#8E8E93]' : 'text-[#475569]'}`}>
                      {comment.text}
                    </p>
                  </div>
                ))
              )}
            </div>

            {/* Post Comment Input */}
            <form onSubmit={handleCommentSubmit} className="flex gap-2 pt-1">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Escribe en el hilo privado..."
                className={`flex-1 rounded-xl px-3.5 py-2 text-xs transition-colors focus:outline-none focus:border-[#0066FF] border ${
                  isDark
                    ? 'bg-[#0A0A0C] border-[#1E1E24] text-white placeholder-[#5A5A62]'
                    : 'bg-white border-[#CBD5E1] text-[#0F172A] placeholder-[#94A3B8]'
                }`}
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="px-3.5 py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold transition-all flex items-center justify-center shadow-md shadow-[#0066FF]/20"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Share Modal Popup */}
        {showShareModal && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              className={`w-full max-w-xs rounded-2xl p-4 border space-y-3 ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-[#E2E8F0] shadow-xl'
              }`}
            >
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#0066FF] uppercase tracking-wider">
                  Enlace de Invitación
                </h4>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-zinc-400 hover:text-white text-xs font-bold"
                >
                  ✕
                </button>
              </div>

              <div
                className={`p-2 rounded-xl border text-[11px] font-mono break-all ${
                  isDark ? 'bg-black border-[#1E1E24] text-[#8E8E93]' : 'bg-slate-50 border-[#E2E8F0] text-[#64748B]'
                }`}
              >
                {shareUrl}
              </div>

              <button
                onClick={copyShareLink}
                className="w-full py-2 rounded-xl bg-[#0066FF] hover:bg-[#0052FF] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
