import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Crown, 
  FileText, 
  Search, 
  ExternalLink, 
  MessageCircle, 
  Eye, 
  Check, 
  X, 
  RotateCcw, 
  Sparkles, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  Copy, 
  AlertTriangle, 
  RefreshCw,
  Download,
  Filter,
  UserCheck,
  UserX,
  Lock,
  ArrowUpRight,
  Trash2,
  Upload
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, PaymentReceipt, ReceiptStatus, MembershipPlanType } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { receiptService } from '../../services/receiptService';
import { firebaseService } from '../../services/firebaseService';

interface AdminApprovalsScreenProps {
  currentUser: UserProfile;
  onUpdateCurrentUser?: (user: UserProfile) => void;
  onNavigateToVault?: () => void;
  onNavigateToMembership?: () => void;
  onNavigateToReceipts?: () => void;
}

export const AdminApprovalsScreen: React.FC<AdminApprovalsScreenProps> = ({
  currentUser,
  onUpdateCurrentUser,
  onNavigateToVault,
  onNavigateToMembership,
  onNavigateToReceipts,
}) => {
  const { isDark } = useTheme();

  // Receipt list state — default filter to 'all' so admin immediately sees all uploaded receipts
  const [receipts, setReceipts] = useState<PaymentReceipt[]>(() => receiptService.getAllReceipts());
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>(() =>
    new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  );

  // Modal states
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string } | null>(null);
  const [approvingReceipt, setApprovingReceipt] = useState<PaymentReceipt | null>(null);
  const [approvalNote, setApprovalNote] = useState('Comprobante verificado con éxito. Membresía VIP activada.');
  
  const [rejectingReceipt, setRejectingReceipt] = useState<PaymentReceipt | null>(null);
  const [rejectReason, setRejectReason] = useState('El comprobante no es legible o los datos no coinciden.');
  const [customRejectReason, setCustomRejectReason] = useState('');

  // Toast notification
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const reloadReceipts = async (silent = false) => {
    setIsRefreshing(true);
    const localImmediate = receiptService.getAllReceipts();
    setReceipts(localImmediate);

    try {
      const [synced] = await Promise.all([
        receiptService.syncFromServer(),
        firebaseService.syncAllRegisteredAccountsToDatabase().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, silent ? 150 : 400)),
      ]);

      const finalReceipts = Array.isArray(synced) ? synced : receiptService.getAllReceipts();
      setReceipts(finalReceipts);
      const nowStr = new Date().toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setLastUpdatedTime(nowStr);

      if (!silent) {
        const pendingTotal = finalReceipts.filter((r) => r.status === 'pending').length;
        if (finalReceipts.length > 0) {
          showToast(
            `¡Comprobantes actualizados! (${finalReceipts.length} subido${finalReceipts.length === 1 ? '' : 's'}, ${pendingTotal} pendiente${pendingTotal === 1 ? '' : 's'})`,
            'success'
          );
        } else {
          showToast('Lista sincronizada con la base de datos. No hay comprobantes subidos todavía.', 'info');
        }
      }
    } catch (err) {
      console.warn('Error refreshing receipts:', err);
      if (!silent) {
        showToast('Comprobantes locales actualizados.', 'info');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // 1. Initial sync from Server + Firebase Firestore on mount
    reloadReceipts(true);

    // 2. Real-time Firestore snapshot listener for payment_receipts
    const unsubFirestore = receiptService.onReceiptsSnapshot((liveReceipts) => {
      setReceipts(liveReceipts);
      setLastUpdatedTime(
        new Date().toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    });

    // 3. Local custom event listener
    const handleUpdate = () => {
      setReceipts(receiptService.getAllReceipts());
    };
    window.addEventListener('vault_receipts_changed', handleUpdate);

    // 4. Periodic background sync every 6 seconds while Admin Approvals is open
    const pollInterval = setInterval(() => {
      receiptService.syncFromServer().then((synced) => {
        if (Array.isArray(synced)) {
          setReceipts(synced);
        }
      }).catch(() => {});
    }, 6000);

    return () => {
      unsubFirestore();
      window.removeEventListener('vault_receipts_changed', handleUpdate);
      clearInterval(pollInterval);
    };
  }, []);

  // Copy code helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Código "${text}" copiado al portapapeles`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Metrics
  const pendingList = receipts.filter((r) => r.status === 'pending');
  const approvedList = receipts.filter((r) => r.status === 'approved');
  const rejectedList = receipts.filter((r) => r.status === 'rejected');
  const totalRevenue = approvedList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

  // Filtered receipts (sorted with pending first, then newest createdAt)
  const filteredReceipts = receipts
    .filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const query = searchQuery.toLowerCase().trim();
      return (
        r.userDisplayName?.toLowerCase().includes(query) ||
        r.userEmail?.toLowerCase().includes(query) ||
        r.referenceCode?.toLowerCase().includes(query) ||
        r.paymentMethod?.toLowerCase().includes(query) ||
        r.id.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

  const handleDeleteReceiptAdmin = (receipt: PaymentReceipt) => {
    if (confirm(`¿Eliminar definitivamente el comprobante #${receipt.id.slice(-6)} de ${receipt.userDisplayName}?`)) {
      receiptService.deleteReceipt(receipt.id);
      showToast(`Comprobante #${receipt.id.slice(-6)} eliminado.`, 'info');
      reloadReceipts(true);
    }
  };

  // Action: Open Approval Modal
  const openApproveModal = (receipt: PaymentReceipt) => {
    setApprovingReceipt(receipt);
    const planName = receipt.plan === 'annual' ? 'ANUAL' : 'MENSUAL';
    setApprovalNote(`Comprobante verificado. Membresía VIP ${planName} activada con éxito.`);
  };

  // Action: Confirm Approval
  const handleConfirmApproval = () => {
    if (!approvingReceipt) return;

    const receipt = approvingReceipt;
    const updated = receiptService.updateReceiptStatus(
      receipt.id,
      'approved',
      approvalNote.trim() || 'Comprobante verificado correctamente. Membresía VIP activada.',
      currentUser.displayName || 'Administrador'
    );

    if (updated) {
      // 1. Upgrade user account in Firebase / persistent store
      firebaseService.upgradeUserMembershipByUidOrEmail(receipt.userId, receipt.userEmail, receipt.plan);

      // 2. If the admin happens to be approving their own or currently active user
      if (currentUser.uid === receipt.userId && onUpdateCurrentUser) {
        onUpdateCurrentUser({
          ...currentUser,
          role: 'vip_member',
          tier: 'Acceso VIP',
          membershipPlan: receipt.plan,
          membershipStatus: 'active',
          subscribedAt: new Date().toISOString(),
          membershipExpiresAt: new Date(Date.now() + (receipt.plan === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
          lastPaymentAmount: receipt.amount,
        });
      }

      // 3. Visual feedback
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.5 },
      });

      showToast(`¡Membresía VIP activada con éxito para ${receipt.userDisplayName}!`, 'success');
      setApprovingReceipt(null);
      reloadReceipts();
    }
  };

  // Action: Open Rejection Modal
  const openRejectModal = (receipt: PaymentReceipt) => {
    setRejectingReceipt(receipt);
    setRejectReason('El comprobante no es legible o los datos no coinciden.');
    setCustomRejectReason('');
  };

  // Action: Confirm Rejection
  const handleConfirmRejection = () => {
    if (!rejectingReceipt) return;

    const receipt = rejectingReceipt;
    const finalReason = customRejectReason.trim() ? customRejectReason.trim() : rejectReason;

    const updated = receiptService.updateReceiptStatus(
      receipt.id,
      'rejected',
      finalReason,
      currentUser.displayName || 'Administrador'
    );

    if (updated) {
      // Deny / revoke membership in user account
      firebaseService.denyOrRevokeUserMembershipByUidOrEmail(receipt.userId, receipt.userEmail, finalReason);

      showToast(`Membresía denegada para el comprobante #${receipt.id.slice(-6)}.`, 'info');
      setRejectingReceipt(null);
      reloadReceipts();
    }
  };

  // Action: Revert to pending
  const handleRevertToPending = (receipt: PaymentReceipt) => {
    if (confirm(`¿Deseas volver a marcar como 'Pendiente' el comprobante de ${receipt.userDisplayName}?`)) {
      receiptService.updateReceiptStatus(
        receipt.id,
        'pending',
        'Comprobante reabierto para revisión por el administrador.',
        currentUser.displayName || 'Administrador'
      );
      showToast('Comprobante devuelto a estado Pendiente.', 'info');
      reloadReceipts();
    }
  };

  // Preset rejection reasons
  const PRESET_REJECT_REASONS = [
    'Comprobante no legible o imagen borrosa',
    'El monto transferido no coincide con el plan',
    'Pago aún no acreditado en la cuenta receptora',
    'Comprobante ya utilizado / duplicado',
    'Código de referencia o datos bancarios erróneos',
  ];

  return (
    <div className={`h-full flex flex-col overflow-y-auto min-h-0 custom-scrollbar pb-28 sm:pb-36 transition-colors ${
      isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
    }`}>
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 max-w-sm backdrop-blur-xl ${
              toast.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-500/40 text-rose-200'
                : 'bg-blue-950/90 border-blue-500/40 text-blue-200'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />}
            <span className="text-xs font-semibold">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Screen Header */}
      <div className={`px-4 sm:px-6 py-4 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 ${
        isDark ? 'border-[#1E1E24] bg-black/40' : 'border-[#E2E8F0] bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
                Aprobación de Membresías
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                SOLO ADMINS
              </span>
            </div>
            <p className={`text-xs ${isDark ? 'text-[#8E8E93]' : 'text-[#64748B]'}`}>
              Revisa comprobantes subidos por usuarios para activar o denegar su membresía VIP
            </p>
          </div>
        </div>

        {/* Top actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-mono hidden sm:inline-block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Sincronizado: {lastUpdatedTime}
          </span>

          {onNavigateToReceipts && (
            <button
              type="button"
              onClick={onNavigateToReceipts}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                isDark
                  ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-200'
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
              }`}
              title="Ir a Subir / Ver Comprobantes"
            >
              <Upload className="w-3.5 h-3.5 text-[#0066FF]" />
              <span className="hidden sm:inline">Subir Comprobante</span>
            </button>
          )}

          <button
            id="admin-approvals-refresh-btn"
            type="button"
            onClick={() => reloadReceipts(false)}
            disabled={isRefreshing}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm ${
              isRefreshing
                ? 'bg-[#0066FF]/20 border-[#0066FF]/50 text-[#0066FF]'
                : isDark 
                ? 'bg-[#0066FF] hover:bg-[#0055D4] border-[#0066FF] text-white shadow-[#0066FF]/20' 
                : 'bg-[#0066FF] hover:bg-[#0055D4] border-[#0066FF] text-white shadow-[#0066FF]/20'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-3 sm:p-6 max-w-5xl w-full mx-auto space-y-6">

        {/* KPI Metrics Summary Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Pendientes */}
          <div 
            onClick={() => setStatusFilter('pending')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              statusFilter === 'pending'
                ? 'ring-2 ring-amber-500 border-amber-500/60 bg-amber-500/10'
                : isDark ? 'bg-black/40 border-[#1E1E24] hover:border-amber-500/40' : 'bg-white border-slate-200 hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-amber-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Pendientes
              </span>
              {pendingList.length > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-amber-400">{pendingList.length}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>por revisar</span>
            </div>
          </div>

          {/* Aprobadas */}
          <div 
            onClick={() => setStatusFilter('approved')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              statusFilter === 'approved'
                ? 'ring-2 ring-emerald-500 border-emerald-500/60 bg-emerald-500/10'
                : isDark ? 'bg-black/40 border-[#1E1E24] hover:border-emerald-500/40' : 'bg-white border-slate-200 hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobadas
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">{approvedList.length}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>activas</span>
            </div>
          </div>

          {/* Denegadas */}
          <div 
            onClick={() => setStatusFilter('rejected')}
            className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              statusFilter === 'rejected'
                ? 'ring-2 ring-rose-500 border-rose-500/60 bg-rose-500/10'
                : isDark ? 'bg-black/40 border-[#1E1E24] hover:border-rose-500/40' : 'bg-white border-slate-200 hover:border-rose-500/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-bold text-rose-500 flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Denegadas
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-400">{rejectedList.length}</span>
              <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>rechazadas</span>
            </div>
          </div>

          {/* Total Recaudado Estimado */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border ${
            isDark ? 'bg-black/40 border-[#1E1E24]' : 'bg-white border-slate-200'
          }`}>
            <span className="text-[11px] sm:text-xs font-bold text-[#0066FF] flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" /> Recaudado
            </span>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-white">${totalRevenue}</span>
              <span className="text-[10px] font-bold text-slate-400">USD</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className={`p-3 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-3 ${
          isDark ? 'bg-[#0E0E12] border-[#1E1E24]' : 'bg-white border-slate-200 shadow-sm'
        }`}>
          {/* Status Tabs */}
          <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto no-scrollbar">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#0066FF] text-white shadow-md shadow-[#0066FF]/30'
                  : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-black'
              }`}
            >
              Todos ({receipts.length})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                  : isDark ? 'text-amber-400 hover:bg-amber-500/10' : 'text-amber-600 hover:bg-amber-50'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Pendientes ({pendingList.length})</span>
            </button>
            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : isDark ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              <span>Aprobadas ({approvedList.length})</span>
            </button>
            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                statusFilter === 'rejected'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                  : isDark ? 'text-rose-400 hover:bg-rose-500/10' : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <XCircle className="w-3 h-3" />
              <span>Denegadas ({rejectedList.length})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por usuario, email o ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border outline-none transition-all ${
                isDark 
                  ? 'bg-black/50 border-[#1E1E24] text-white focus:border-[#0066FF]' 
                  : 'bg-slate-50 border-slate-200 text-black focus:border-[#0066FF]'
              }`}
            />
          </div>
        </div>

        {/* Receipts List */}
        {filteredReceipts.length === 0 ? (
          <div className={`p-10 rounded-3xl border text-center flex flex-col items-center justify-center gap-3 ${
            isDark ? 'bg-[#0E0E12] border-[#1E1E24]' : 'bg-white border-slate-200'
          }`}>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold">
                {receipts.length === 0
                  ? 'Aún no hay comprobantes subidos'
                  : 'No hay comprobantes en este filtro'}
              </h3>
              <p className={`text-xs mt-1 max-w-md mx-auto ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {receipts.length === 0
                  ? 'Cuando un usuario suba su captura o comprobante de pago desde el apartado de Comprobantes, aparecerá aquí automáticamente para que puedas aprobar o denegar su membresía.'
                  : statusFilter === 'pending'
                  ? '¡Excelente! No tienes comprobantes pendientes de aprobación en este momento.'
                  : 'No se encontraron registros que coincidan con la búsqueda.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              {statusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0066FF] text-white hover:bg-blue-600 cursor-pointer transition-all"
                >
                  Ver todos los comprobantes ({receipts.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => reloadReceipts(false)}
                disabled={isRefreshing}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isDark
                    ? 'bg-white/5 border-white/15 hover:bg-white/10 text-white'
                    : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#0066FF]' : ''}`} />
                <span>{isRefreshing ? 'Buscando comprobantes...' : 'Actualizar ahora'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReceipts.map((receipt) => {
              const isPending = receipt.status === 'pending';
              const isApproved = receipt.status === 'approved';
              const isRejected = receipt.status === 'rejected';

              return (
                <div
                  key={receipt.id}
                  className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 flex flex-col gap-4 ${
                    isPending
                      ? isDark 
                        ? 'bg-gradient-to-br from-[#12110c] to-[#0a0a0c] border-amber-500/30 shadow-lg shadow-amber-500/5' 
                        : 'bg-amber-50/40 border-amber-300 shadow-sm'
                      : isApproved
                      ? isDark ? 'bg-[#0A0A0C] border-emerald-500/25' : 'bg-white border-emerald-300'
                      : isDark ? 'bg-[#0A0A0C] border-rose-500/25' : 'bg-white border-rose-300'
                  }`}
                >
                  {/* Top Bar: User details & Status badge */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* User profile row */}
                    <div className="flex items-center gap-3">
                      <img
                        src={receipt.userAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${receipt.userId}`}
                        alt={receipt.userDisplayName}
                        className="w-11 h-11 rounded-2xl object-cover border border-white/10 shrink-0 bg-slate-800"
                        onError={(e) => {
                          (e.target as HTMLElement).setAttribute('src', `https://api.dicebear.com/7.x/bottts/svg?seed=${receipt.userId}`);
                        }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm sm:text-base font-black tracking-tight">{receipt.userDisplayName}</h3>
                          {/* Plan Badge */}
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 ${
                            receipt.plan === 'annual'
                              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black font-extrabold shadow-sm shadow-amber-500/30'
                              : 'bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/35'
                          }`}>
                            <Crown className="w-2.5 h-2.5" />
                            {receipt.plan === 'annual' ? 'VIP ANUAL ($12)' : 'VIP MENSUAL ($1)'}
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {receipt.userEmail}
                        </p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {isPending && (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/15 text-amber-400 border border-amber-500/35 flex items-center gap-1.5 animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Pendiente de Aprobación</span>
                        </span>
                      )}
                      {isApproved && (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/35 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Membresía Activada</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/15 text-rose-400 border border-rose-500/35 flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Membresía Denegada</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Receipt Information Grid & Image Preview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-white/5">
                    {/* Information Column */}
                    <div className="md:col-span-2 space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {/* Monto */}
                        <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Monto Abonado</span>
                          <span className="text-sm font-black text-emerald-400">${receipt.amount} USD</span>
                        </div>

                        {/* Medio de pago */}
                        <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Medio de Pago</span>
                          <span className="font-bold truncate block">{receipt.paymentMethod || 'Transferencia'}</span>
                        </div>

                        {/* Código Ref */}
                        <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                          <span className={`text-[10px] block font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Ref / Operación</span>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold truncate">{receipt.referenceCode}</span>
                            <button
                              onClick={() => handleCopy(receipt.referenceCode, receipt.id)}
                              className="text-slate-400 hover:text-white p-0.5"
                              title="Copiar código"
                            >
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* WhatsApp contact & Date */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            Fecha de subida: {new Date(receipt.createdAt).toLocaleString('es-AR', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        {/* WhatsApp user contact button */}
                        {receipt.whatsappContact && (
                          <a
                            href={`https://wa.me/${receipt.whatsappContact.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Hola ${receipt.userDisplayName}, te escribimos desde App 66 sobre tu comprobante de pago (#${receipt.id.slice(-6)})...`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-colors"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp: {receipt.whatsappContact}</span>
                          </a>
                        )}
                      </div>

                      {/* User Notes */}
                      {receipt.notes && (
                        <div className={`p-2.5 rounded-xl border text-[11px] ${
                          isDark ? 'bg-white/5 border-white/5 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <span className="font-bold text-slate-400 block mb-0.5">Nota enviada por el usuario:</span>
                          <p className="italic">"{receipt.notes}"</p>
                        </div>
                      )}

                      {/* Admin Note / Review log if already reviewed */}
                      {receipt.reviewedAt && (
                        <div className={`p-2.5 rounded-xl border text-[11px] ${
                          isApproved
                            ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                            : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                        }`}>
                          <span className="font-bold block mb-0.5">
                            Revisado por {receipt.reviewedBy || 'Admin'} el{' '}
                            {new Date(receipt.reviewedAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}:
                          </span>
                          <p>{receipt.adminNote || (isApproved ? 'Membresía activada' : 'Comprobante denegado')}</p>
                        </div>
                      )}
                    </div>

                    {/* Receipt Image Thumbnail Column */}
                    <div className="flex flex-col gap-2 items-center justify-center">
                      <div 
                        onClick={() => setLightboxImage({ url: receipt.receiptImageUrl || `/api/vault/receipts/${encodeURIComponent(receipt.id)}/image`, title: `Comprobante de ${receipt.userDisplayName} (${receipt.receiptFileName || 'comprobante.jpg'})` })}
                        className={`w-full h-36 sm:h-40 rounded-2xl border overflow-hidden relative group cursor-pointer ${
                          isDark ? 'bg-black/60 border-white/15' : 'bg-slate-100 border-slate-200'
                        }`}
                      >
                        <img
                          src={receipt.receiptImageUrl || `/api/vault/receipts/${encodeURIComponent(receipt.id)}/image`}
                          alt={`Comprobante de ${receipt.userDisplayName}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.currentTarget;
                            const fallbackUrl = `/api/vault/receipts/${encodeURIComponent(receipt.id)}/image`;
                            if (!target.src.endsWith(fallbackUrl)) {
                              target.src = fallbackUrl;
                            }
                          }}
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/75 text-white text-[10px] font-bold backdrop-blur-xs flex items-center gap-1">
                          <FileText className="w-3 h-3 text-emerald-400" />
                          <span className="truncate max-w-[140px]">{receipt.receiptFileName || 'Comprobante subido'}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 backdrop-blur-xs">
                          <Eye className="w-5 h-5" />
                          <span className="text-[10px] font-bold">Ampliar comprobante</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: receipt.receiptImageUrl || `/api/vault/receipts/${encodeURIComponent(receipt.id)}/image`, title: `Comprobante de ${receipt.userDisplayName}` })}
                          className="text-[11px] font-bold text-[#0066FF] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver comprobante</span>
                        </button>
                        <a
                          href={receipt.receiptImageUrl || `/api/vault/receipts/${encodeURIComponent(receipt.id)}/image`}
                          download={receipt.receiptFileName || `comprobante_${receipt.id}.jpg`}
                          className="text-[11px] font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Admin Decision Action Bar */}
                  <div className="pt-3 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-500">ID: #{receipt.id}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteReceiptAdmin(receipt)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Eliminar comprobante"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {isPending ? (
                        <>
                          {/* Reject / Deny Button */}
                          <button
                            type="button"
                            onClick={() => openRejectModal(receipt)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/35 transition-all cursor-pointer active:scale-95"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Denegar Membresía</span>
                          </button>

                          {/* Approve / Activate Button */}
                          <button
                            type="button"
                            onClick={() => openApproveModal(receipt)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-lg shadow-emerald-500/25 transition-all cursor-pointer active:scale-95"
                          >
                            <Crown className="w-4 h-4" />
                            <span>Activar Membresía VIP</span>
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Options to reconsider / revert */}
                          <button
                            type="button"
                            onClick={() => handleRevertToPending(receipt)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              isDark ? 'border-white/10 hover:bg-white/5 text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reabrir a Pendiente</span>
                          </button>

                          {isRejected && (
                            <button
                              type="button"
                              onClick={() => openApproveModal(receipt)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/35 transition-all cursor-pointer"
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>Reconsiderar y Activar VIP</span>
                            </button>
                          )}

                          {isApproved && (
                            <button
                              type="button"
                              onClick={() => openRejectModal(receipt)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/35 transition-all cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Revocar / Denegar</span>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* APPROVAL CONFIRMATION MODAL */}
      <AnimatePresence>
        {approvingReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              className={`w-full max-w-lg rounded-3xl border p-5 sm:p-6 space-y-4 shadow-2xl ${
                isDark ? 'bg-[#0E0E12] border-emerald-500/30 text-white' : 'bg-white border-slate-200 text-[#0F172A]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black">Activar Membresía VIP</h2>
                    <p className="text-xs text-slate-400">Confirmación y activación inmediata de cuenta</p>
                  </div>
                </div>
                <button
                  onClick={() => setApprovingReceipt(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User summary */}
              <div className={`p-3.5 rounded-2xl border space-y-2 ${isDark ? 'bg-black/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Usuario a activar:</span>
                  <span className="text-xs font-black">{approvingReceipt.userDisplayName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Correo:</span>
                  <span className="text-xs font-mono">{approvingReceipt.userEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Plan asignado:</span>
                  <span className="text-xs font-black text-amber-400 uppercase">
                    {approvingReceipt.plan === 'annual' ? 'Acceso VIP ANUAL (12 Meses)' : 'Acceso VIP MENSUAL (30 Días)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Monto verificado:</span>
                  <span className="text-xs font-black text-emerald-400">${approvingReceipt.amount} USD</span>
                </div>
              </div>

              {/* Admin Note Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Nota de aprobación (visible para el usuario):</label>
                <textarea
                  rows={2}
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className={`w-full p-3 rounded-2xl border text-xs outline-none ${
                    isDark ? 'bg-black/60 border-white/10 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-200 text-black'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApprovingReceipt(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 text-slate-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmar y Activar Membresía</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECTION MODAL */}
      <AnimatePresence>
        {rejectingReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.94, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 10 }}
              className={`w-full max-w-lg rounded-3xl border p-5 sm:p-6 space-y-4 shadow-2xl ${
                isDark ? 'bg-[#0E0E12] border-rose-500/30 text-white' : 'bg-white border-slate-200 text-[#0F172A]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black">Denegar Membresía / Comprobante</h2>
                    <p className="text-xs text-slate-400">Indica el motivo del rechazo para informar al usuario</p>
                  </div>
                </div>
                <button
                  onClick={() => setRejectingReceipt(null)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User summary */}
              <div className={`p-3 rounded-2xl border text-xs space-y-1 ${isDark ? 'bg-black/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Usuario:</span>
                  <span className="font-bold">{rejectingReceipt.userDisplayName} ({rejectingReceipt.userEmail})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Comprobante ID:</span>
                  <span className="font-mono">#{rejectingReceipt.id}</span>
                </div>
              </div>

              {/* Preset reasons */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Selecciona el motivo del rechazo:</label>
                <div className="space-y-1.5">
                  {PRESET_REJECT_REASONS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setRejectReason(preset);
                        setCustomRejectReason('');
                      }}
                      className={`w-full p-2.5 rounded-xl text-left text-xs border transition-all cursor-pointer flex items-center justify-between ${
                        rejectReason === preset && !customRejectReason
                          ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 font-bold'
                          : isDark ? 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{preset}</span>
                      {rejectReason === preset && !customRejectReason && (
                        <Check className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Reason Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">O redacta un motivo personalizado:</label>
                <textarea
                  rows={2}
                  placeholder="Escribe aquí si deseas dar una explicación particular..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className={`w-full p-3 rounded-2xl border text-xs outline-none ${
                    isDark ? 'bg-black/60 border-white/10 text-white focus:border-rose-500' : 'bg-slate-50 border-slate-200 text-black'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingReceipt(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 text-slate-400 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmRejection}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Confirmar Rechazo y Denegar</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LIGHTBOX FOR FULL RESOLUTION RECEIPT IMAGE */}
      <AnimatePresence>
        {lightboxImage && (
          <div 
            onClick={() => setLightboxImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-3xl max-h-[90vh] w-full bg-[#0A0A0C] border border-white/15 rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
            >
              {/* Lightbox header */}
              <div className="p-3 sm:p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#0066FF]" />
                  <span className="text-xs sm:text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                    {lightboxImage.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={lightboxImage.url}
                    download="comprobante_pago.jpg"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1 cursor-pointer"
                    title="Descargar comprobante"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Descargar</span>
                  </a>
                  <button
                    onClick={() => setLightboxImage(null)}
                    className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Lightbox image */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/80">
                <img
                  src={lightboxImage.url}
                  alt={lightboxImage.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-2xl"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
