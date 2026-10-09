import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Check, Sparkles, Shield, Zap, Crown, 
  HelpCircle, ChevronDown, CheckCircle2, ArrowRight, Download, 
  FileText, AlertCircle, X, ShieldCheck, HeartHandshake,
  MessageCircle, ExternalLink, Copy, CheckCheck,
  Clock, Calendar, Hourglass, Flame,
  CreditCard, PlusCircle, RefreshCw, AlertTriangle, Eye, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { UserProfile, MembershipPlanType } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { firebaseService } from '../../services/firebaseService';
import { receiptService } from '../../services/receiptService';

// WhatsApp contact constant
export const WHATSAPP_CONTACT_PHONE = '+54 9 11 6554-6038';
export const WHATSAPP_PHONE_RAW = '5491165546038';

interface MembershipScreenProps {
  currentUser: UserProfile;
  onUpdateUser?: (updated: UserProfile) => void;
  onNavigateToVault?: () => void;
  onNavigateToReceipts?: () => void;
}

export const MembershipScreen: React.FC<MembershipScreenProps> = ({
  currentUser,
  onUpdateUser,
  onNavigateToVault,
  onNavigateToReceipts,
}) => {
  const { isDark } = useTheme();

  // Active billing cycle view: 'monthly' | 'annual'
  const [selectedBillingTab, setSelectedBillingTab] = useState<MembershipPlanType>(
    currentUser.membershipPlan || 'monthly'
  );

  // Modals state
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [targetPlan, setTargetPlan] = useState<MembershipPlanType>('monthly');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Checkout payment options & processing state
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'instant' | 'whatsapp'>('instant');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // FAQ open states
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Real-time clock for live membership bar updates
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Membership status checks: only active if the user has actually purchased/activated a membership plan
  const isSubscribed = Boolean(
    currentUser.membershipStatus === 'active' &&
    currentUser.membershipPlan
  );
  const activePlan: MembershipPlanType = (currentUser.membershipPlan as MembershipPlanType) || 'monthly';

  // Ensure exact real start date (subscribedAt) and expiration date (membershipExpiresAt) are permanently recorded on the profile
  useEffect(() => {
    if (!isSubscribed) return;

    let cancelledAtMs = 0;
    try {
      const rawCancelledAt = localStorage.getItem(`vault_cancelled_at_${currentUser.uid}`);
      if (rawCancelledAt) {
        const parsedCancelled = new Date(rawCancelledAt).getTime();
        if (!isNaN(parsedCancelled)) cancelledAtMs = parsedCancelled;
      }
    } catch {}

    // Check if the user has an approved receipt with exact activation dates newer than any previous cancellation
    const userReceipts = receiptService
      .getAllReceipts()
      .filter(
        (r) =>
          r.status === 'approved' &&
          (r.userId === currentUser.uid ||
            (currentUser.email && r.userEmail?.toLowerCase() === currentUser.email.toLowerCase())) &&
          new Date(r.membershipStartsAt || r.reviewedAt || r.createdAt).getTime() > cancelledAtMs
      )
      .sort((a, b) => {
        const timeA = new Date(a.membershipStartsAt || a.reviewedAt || a.createdAt).getTime();
        const timeB = new Date(b.membershipStartsAt || b.reviewedAt || b.createdAt).getTime();
        return timeB - timeA;
      });

    const latestApproved = userReceipts[0];

    let targetStartIso = currentUser.subscribedAt;
    let targetExpireIso = currentUser.membershipExpiresAt;
    let targetPlan: MembershipPlanType = activePlan;

    if (latestApproved) {
      const receiptStart = latestApproved.membershipStartsAt || latestApproved.reviewedAt || latestApproved.createdAt;
      if (receiptStart && (!targetStartIso || new Date(receiptStart).getTime() > new Date(targetStartIso).getTime())) {
        targetStartIso = new Date(receiptStart).toISOString();
        targetPlan = latestApproved.plan || activePlan;
        const durationDays = targetPlan === 'annual' ? 365 : 30;
        targetExpireIso =
          latestApproved.membershipExpiresAt ||
          new Date(new Date(targetStartIso).getTime() + durationDays * 86400000).toISOString();
      }
    }

    const parsedStart = targetStartIso ? new Date(targetStartIso) : null;
    const parsedExpire = targetExpireIso ? new Date(targetExpireIso) : null;

    if (!parsedStart || isNaN(parsedStart.getTime()) || !parsedExpire || isNaN(parsedExpire.getTime())) {
      const now = new Date();
      const durationDays = targetPlan === 'annual' ? 365 : 30;
      const validStart = parsedStart && !isNaN(parsedStart.getTime()) ? parsedStart : now;
      const validExpire =
        parsedExpire && !isNaN(parsedExpire.getTime())
          ? parsedExpire
          : new Date(validStart.getTime() + durationDays * 86400000);

      const updatedUser: UserProfile = {
        ...currentUser,
        membershipPlan: targetPlan,
        membershipStatus: currentUser.membershipStatus || 'active',
        subscribedAt: validStart.toISOString(),
        membershipExpiresAt: validExpire.toISOString(),
      };

      firebaseService.updateUserProfile(updatedUser).catch(() => {
        firebaseService.saveSession(updatedUser);
      });
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
    } else if (
      targetStartIso !== currentUser.subscribedAt ||
      targetExpireIso !== currentUser.membershipExpiresAt
    ) {
      const updatedUser: UserProfile = {
        ...currentUser,
        membershipPlan: targetPlan,
        membershipStatus: 'active',
        subscribedAt: targetStartIso,
        membershipExpiresAt: targetExpireIso,
      };
      firebaseService.updateUserProfile(updatedUser).catch(() => {
        firebaseService.saveSession(updatedUser);
      });
      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }
    }
  }, [
    isSubscribed,
    currentUser.uid,
    currentUser.email,
    currentUser.subscribedAt,
    currentUser.membershipExpiresAt,
    activePlan,
  ]);

  // Calculate formatted dates and dynamic days remaining in real-time
  const calculateDaysLeft = () => {
    const isAnnual = activePlan === 'annual';
    const defaultTotalDays = isAnnual ? 365 : 30;

    // Real current date from live clock
    const now = currentTime;

    // Exact start date (subscription date)
    let startD: Date;
    if (currentUser.subscribedAt) {
      startD = new Date(currentUser.subscribedAt);
      if (isNaN(startD.getTime())) {
        startD = now;
      }
    } else {
      startD = now;
    }

    // Exact expiration date
    let expireD: Date;
    if (currentUser.membershipExpiresAt) {
      expireD = new Date(currentUser.membershipExpiresAt);
      if (isNaN(expireD.getTime())) {
        expireD = new Date(startD.getTime() + defaultTotalDays * 86400000);
      }
    } else {
      expireD = new Date(startD.getTime() + defaultTotalDays * 86400000);
    }

    // Total duration in ms & days
    const totalDurationMs = Math.max(1, expireD.getTime() - startD.getTime());
    const effectiveTotalDays = Math.max(1, Math.round(totalDurationMs / 86400000)) || defaultTotalDays;

    // Remaining ms & days based on real time
    const diffMs = expireD.getTime() - now.getTime();
    const elapsedMs = Math.max(0, now.getTime() - startD.getTime());
    const daysRemaining = Math.max(0, Math.ceil(diffMs / 86400000));
    const elapsedDays = Math.min(effectiveTotalDays, Math.max(0, Math.floor(elapsedMs / 86400000)));

    // Percentage of remaining time (from 100% down to 0% as real time passes)
    const percentRemaining = Math.min(100, Math.max(0, (diffMs / totalDurationMs) * 100));

    const isExpired = diffMs <= 0;
    const isExpiringSoon = !isExpired && daysRemaining <= 5;

    const startDateExactNumeric = startD.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const expireDateExactNumeric = expireD.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const startDateFormatted = startD.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const expireDateFormatted = expireD.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const startTimeFormatted = startD.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const expireTimeFormatted = expireD.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const startDateFullFormatted = `${startDateExactNumeric} (${startDateFormatted} • ${startTimeFormatted} hs)`;
    const expireDateFullFormatted = `${expireDateExactNumeric} (${expireDateFormatted} • ${expireTimeFormatted} hs)`;

    return {
      daysRemaining,
      totalDays: effectiveTotalDays,
      elapsedDays,
      percentRemaining,
      startDateExactNumeric,
      expireDateExactNumeric,
      startDateFormatted,
      expireDateFormatted,
      startTimeFormatted,
      expireTimeFormatted,
      startDateFullFormatted,
      expireDateFullFormatted,
      isExpired,
      isExpiringSoon,
      isAnnual,
    };
  };

  const membershipTiming = calculateDaysLeft();

  const currentRenewalDate = currentUser.membershipExpiresAt 
    ? new Date(currentUser.membershipExpiresAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })
    : membershipTiming.expireDateFormatted;

  const showNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotificationMsg({ type, text });
    setTimeout(() => {
      setNotificationMsg(null);
    }, 4500);
  };

  const getWhatsAppMessage = (plan: MembershipPlanType): string => {
    const planName = plan === 'monthly' ? (isSubscribed ? 'MENSUAL (30 DÍAS)' : 'MENSUAL (1$ AL MES)') : (isSubscribed ? 'ANUAL (365 DÍAS)' : 'ANUAL (12$ AL AÑO)');
    const priceText = plan === 'monthly' ? (isSubscribed ? 'periodo de 30 días' : '1$ USD al mes') : (isSubscribed ? 'periodo de 365 días' : '12$ USD al año');
    const userName = currentUser.displayName || 'Usuario VIP';
    const userEmail = currentUser.email || 'No registrado';
    const userId = currentUser.uid || 'VIP';

    return `¡Hola! 👋 Quiero activar mi membresía ${planName} por ${priceText} en la Bóveda App 66.
    
📌 Datos de mi cuenta:
• Nombre: ${userName}
• Email: ${userEmail}
• ID de Usuario: #${userId}

Por favor, envíame los medios de pago para coordinar la activación inmediata. ¡Muchas gracias!`;
  };

  const getWhatsAppUrl = (plan: MembershipPlanType): string => {
    const text = encodeURIComponent(getWhatsAppMessage(plan));
    return `https://wa.me/${WHATSAPP_PHONE_RAW}?text=${text}`;
  };

  const handleOpenWhatsAppDirect = (plan: MembershipPlanType, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = getWhatsAppUrl(plan);
    const win = window.open(url, '_blank');
    if (!win) {
      window.location.href = url;
    }
  };

  const handleOpenCheckout = (plan: MembershipPlanType) => {
    setTargetPlan(plan);
    setCheckoutPaymentMethod('whatsapp');
    setShowCheckoutModal(true);
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#25D366', '#0066FF', '#F59E0B', '#10B981'],
      });
    } catch {
      // safe fallback
    }
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(WHATSAPP_CONTACT_PHONE);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(getWhatsAppMessage(targetPlan));
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 2000);
  };

  const handleConfirmCancel = async () => {
    try {
      localStorage.setItem(`vault_cancelled_at_${currentUser.uid}`, new Date().toISOString());
      localStorage.removeItem(`vault_purchased_membership_${currentUser.uid}`);
    } catch {}

    const updatedUser: UserProfile = {
      ...currentUser,
      tier: currentUser.role === 'admin' ? 'Bóveda Diamante' : 'Invitado',
      membershipStatus: 'cancelled',
      membershipPlan: undefined,
      subscribedAt: undefined,
      membershipExpiresAt: undefined,
    };

    try {
      await firebaseService.updateUserProfile(updatedUser);
    } catch {
      firebaseService.saveSession(updatedUser);
    }

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    setShowCancelModal(false);
    showNotification(
      'Tu membresía ha sido cancelada correctamente. Puedes volver a activarla cuando lo desees.',
      'info'
    );
  };

  // Immediate purchase and activation handler
  const handlePurchasePlan = async (plan: MembershipPlanType) => {
    setIsProcessingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      localStorage.removeItem(`vault_cancelled_at_${currentUser.uid}`);
      localStorage.setItem(`vault_purchased_membership_${currentUser.uid}`, 'true');
    } catch {}

    const now = new Date();
    const days = plan === 'annual' ? 365 : 30;
    const expires = new Date(now.getTime() + days * 86400000);

    const updatedUser: UserProfile = {
      ...currentUser,
      tier: 'Acceso VIP',
      membershipStatus: 'active',
      membershipPlan: plan,
      subscribedAt: now.toISOString(),
      membershipExpiresAt: expires.toISOString(),
      lastPaymentAmount: plan === 'annual' ? 12 : 1,
    };

    try {
      await firebaseService.updateUserProfile(updatedUser);
    } catch {
      firebaseService.saveSession(updatedUser);
    }

    if (onUpdateUser) {
      onUpdateUser(updatedUser);
    }

    setIsProcessingPayment(false);
    setShowCheckoutModal(false);
    triggerConfetti();
    showNotification(
      `¡Membresía ${plan === 'annual' ? 'Anual (365 días)' : 'Mensual (30 días)'} adquirida y activada con éxito! Tu barra de días restantes ya está activa.`,
      'success'
    );
  };

  const handleDirectActivate = (plan: MembershipPlanType) => {
    handlePurchasePlan(plan);
  };

  return (
    <div
      className={`h-full flex flex-col overflow-y-auto custom-scrollbar pb-28 sm:pb-36 transition-colors duration-300 ${
        isDark ? 'bg-black text-white' : 'bg-[#F8FAFC] text-[#0F172A]'
      }`}
    >
      {/* Toast Notification */}
      <AnimatePresence>
        {notificationMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-sm font-semibold max-w-md w-[90%] backdrop-blur-md ${
              notificationMsg.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : notificationMsg.type === 'error'
                ? 'bg-red-500/15 border-red-500/40 text-red-400'
                : 'bg-[#0066FF]/15 border-[#0066FF]/40 text-[#0066FF]'
            }`}
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="flex-1">{notificationMsg.text}</span>
            <button
              onClick={() => setNotificationMsg(null)}
              className="p-1 hover:opacity-75 transition-opacity"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl w-full mx-auto p-3.5 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-2.5 sm:space-y-3 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 sm:w-64 h-28 sm:h-32 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none -z-10" />

          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full text-[11px] sm:text-xs font-black tracking-[0.18em] sm:tracking-[0.2em] uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Crown className="w-3.5 h-3.5" />
            MEMBRESÍA VIP
          </div>

          <h1 className="text-xl sm:text-4xl font-black tracking-tight px-1">
            Acceso Ilimitado a la Bóveda
          </h1>

          <p className={`text-xs sm:text-sm max-w-xl mx-auto px-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Disfruta de descargas sin restricciones, servidores de alta velocidad, insignias exclusivas y nuevos recursos semanales con precios accesibles.
          </p>

          {/* WhatsApp Direct Contact Banner */}
          <div className="pt-1.5 sm:pt-2 flex justify-center">
            <a
              href={`https://wa.me/${WHATSAPP_PHONE_RAW}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3.5 sm:px-4 py-2 rounded-2xl text-[11px] sm:text-sm font-bold bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/40 text-[#25D366] transition-all hover:scale-[1.02] shadow-sm cursor-pointer max-w-full"
            >
              <MessageCircle className="w-4 h-4 shrink-0 fill-current" />
              <span className="truncate">Pago directo por WhatsApp: <strong>{WHATSAPP_CONTACT_PHONE}</strong></span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
            </a>
          </div>

          {/* Billing Selector Toggle (solo para usuarios sin membresía activa) */}
          {!isSubscribed && (
            <div className="pt-2.5 sm:pt-3 flex justify-center">
              <div className={`p-1 rounded-2xl border flex items-center gap-1 w-full sm:w-auto max-w-sm ${
                isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-slate-100 border-slate-200'
              }`}>
                <button
                  type="button"
                  onClick={() => setSelectedBillingTab('monthly')}
                  className={`relative flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-sm font-bold transition-all cursor-pointer ${
                    selectedBillingTab === 'monthly'
                      ? 'text-white'
                      : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  {selectedBillingTab === 'monthly' && (
                    <motion.div
                      layoutId="billingTabPill"
                      className="absolute inset-0 bg-[#0066FF] rounded-xl shadow-md shadow-[#0066FF]/30"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">Plan Mensual (1$)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBillingTab('annual')}
                  className={`relative flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-[11px] sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5 ${
                    selectedBillingTab === 'annual'
                      ? 'text-white'
                      : isDark ? 'text-neutral-400 hover:text-white' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  {selectedBillingTab === 'annual' && (
                    <motion.div
                      layoutId="billingTabPill"
                      className="absolute inset-0 bg-amber-500 rounded-xl shadow-md shadow-amber-500/30"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="relative z-10">Plan Anual (12$)</span>
                  <span className="relative z-10 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-black bg-amber-400 text-black shadow-sm">
                    365 DÍAS
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* NON-SUBSCRIBED USER TEASER BANNER (when not yet subscribed) */}
        {!isSubscribed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 sm:p-5 rounded-3xl border flex items-center justify-between gap-4 transition-all ${
              isDark
                ? 'bg-gradient-to-r from-blue-950/30 via-[#0E0E12] to-emerald-950/20 border-[#0066FF]/30 shadow-lg'
                : 'bg-gradient-to-r from-blue-50 via-white to-emerald-50 border-blue-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#0066FF]/20 border border-[#0066FF]/40 text-[#0066FF] flex items-center justify-center shrink-0 shadow-inner">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-[#0066FF] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    Barra de Días Restantes
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Tiempo Real
                  </span>
                </div>
                <h4 className="text-sm font-bold mt-0.5">
                  Seguimiento automático de tu vigencia día tras día
                </h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Al comprar tu membresía, tendrás aquí tu barra dinámica que muestra cuántos días te quedan y cambia a medida que transcurre el tiempo.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* CURRENT SUBSCRIBED USER DASHBOARD BANNER WITH REMAINING DAYS BAR */}
        {isSubscribed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-5 sm:p-6 rounded-3xl border relative overflow-hidden backdrop-blur-md space-y-4 ${
              membershipTiming.isExpired
                ? isDark
                  ? 'bg-gradient-to-br from-red-950/40 via-[#0A0A0C] to-red-950/20 border-red-500/40 shadow-xl shadow-red-500/10'
                  : 'bg-gradient-to-br from-red-50 via-white to-red-100/50 border-red-300 shadow-md'
                : membershipTiming.isExpiringSoon
                ? isDark
                  ? 'bg-gradient-to-br from-amber-950/40 via-[#0A0A0C] to-orange-950/20 border-amber-500/40 shadow-xl shadow-amber-500/10'
                  : 'bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border-amber-300 shadow-md'
                : isDark
                ? 'bg-gradient-to-br from-emerald-950/40 via-[#0A0A0C] to-blue-950/20 border-emerald-500/30 shadow-xl shadow-emerald-500/5'
                : 'bg-gradient-to-br from-emerald-50 via-white to-blue-50/50 border-emerald-200 shadow-md'
            }`}
          >

            {/* Top row: Status, Plan and Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 shadow-inner ${
                  membershipTiming.isExpired
                    ? 'bg-red-500/20 border-red-500/40 text-red-400'
                    : membershipTiming.isExpiringSoon
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                    : 'bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border-emerald-500/40 text-emerald-400'
                }`}>
                  {membershipTiming.isExpired ? (
                    <AlertTriangle className="w-6 h-6 animate-pulse" />
                  ) : (
                    <ShieldCheck className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {membershipTiming.isExpired ? (
                      <span className="text-xs font-black uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        Membresía Vencida
                      </span>
                    ) : membershipTiming.isExpiringSoon ? (
                      <span className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        ¡Por Vencer Pronto!
                      </span>
                    ) : (
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Membresía Activa
                      </span>
                    )}

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30">
                      {activePlan === 'annual' ? 'Plan Anual (365 Días)' : 'Plan Mensual (30 Días)'}
                    </span>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      ID: #{currentUser.uid}
                    </span>

                    {currentUser.membershipStatus === 'cancelled' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Cancelación al vencer
                      </span>
                    )}
                  </div>
                  <h3 className="text-base sm:text-lg font-black mt-0.5">
                    {activePlan === 'annual' ? 'Acceso VIP Anual' : 'Acceso VIP Mensual'}
                  </h3>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                {membershipTiming.isExpired && (
                  <button
                    type="button"
                    onClick={() => handleOpenCheckout(activePlan || 'monthly')}
                    className="flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl text-xs font-black bg-[#25D366] hover:bg-[#20ba59] text-black flex items-center gap-1.5 shadow-md shadow-[#25D366]/20 transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-black" />
                    <span>Renovar por WhatsApp</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(true)}
                  className={`flex-1 sm:flex-initial justify-center px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDark
                      ? 'border-[#1E1E24] bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Comprobante
                </button>

                {onNavigateToVault && (
                  <button
                    type="button"
                    onClick={onNavigateToVault}
                    className="flex-1 sm:flex-initial justify-center px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0066FF] hover:bg-blue-600 text-white flex items-center gap-1.5 shadow-md shadow-[#0066FF]/20 transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Ir a la Bóveda
                  </button>
                )}

                {currentUser.membershipStatus !== 'cancelled' && isSubscribed && (
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>

            {/* DYNAMIC PROGRESS BAR CARD */}
            <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
              isDark ? 'bg-black/60 border-white/10' : 'bg-white/80 border-slate-200 shadow-sm'
            }`}>
              {/* Header metrics */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Clock className={`w-3.5 h-3.5 ${
                        membershipTiming.isExpired 
                          ? 'text-red-400' 
                          : membershipTiming.isExpiringSoon 
                          ? 'text-amber-400' 
                          : 'text-emerald-400'
                      }`} />
                      Días Restantes de Membresía
                    </span>

                    {membershipTiming.isExpiringSoon && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">
                        ¡Por vencer pronto!
                      </span>
                    )}
                    {membershipTiming.isExpired && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                        Membresía Vencida
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className={`text-3xl sm:text-4xl font-black tracking-tight ${
                      membershipTiming.isExpired 
                        ? 'text-red-400' 
                        : membershipTiming.isExpiringSoon 
                        ? 'text-amber-400' 
                        : 'text-emerald-400'
                    }`}>
                      {membershipTiming.daysRemaining} {membershipTiming.daysRemaining === 1 ? 'Día' : 'Días'}
                    </span>
                    <span className="text-xs sm:text-sm text-neutral-400 font-medium">
                      restantes de {membershipTiming.totalDays} días de vigencia
                    </span>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <div className="text-[11px] text-neutral-400">
                    Vigencia activa
                  </div>
                  <div className={`text-sm sm:text-lg font-black font-mono ${
                    membershipTiming.isExpired
                      ? 'text-red-400'
                      : membershipTiming.isExpiringSoon
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}>
                    {Math.round(membershipTiming.percentRemaining)}% disponible
                  </div>
                </div>
              </div>

              {/* The Actual Progress Bar Track */}
              <div className="relative w-full h-6 sm:h-7 rounded-full overflow-hidden bg-black/70 dark:bg-neutral-900 border border-white/10 p-0.5 shadow-inner">
                {/* Background pattern */}
                <div className="absolute inset-0 opacity-15 bg-[repeating-linear-gradient(45deg,#000,#000_6px,#fff_6px,#fff_12px)] pointer-events-none" />

                {/* Milestone tick marks at 25%, 50%, 75% */}
                <div className="absolute inset-0 flex justify-between px-3 pointer-events-none z-10 opacity-30">
                  <div className="h-full border-r border-white/30" style={{ left: '25%', position: 'absolute' }} />
                  <div className="h-full border-r border-white/30" style={{ left: '50%', position: 'absolute' }} />
                  <div className="h-full border-r border-white/30" style={{ left: '75%', position: 'absolute' }} />
                </div>

                {/* Animated Dynamic Fill Bar */}
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${membershipTiming.percentRemaining}%` }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className={`h-full rounded-full relative transition-all shadow-md ${
                    membershipTiming.percentRemaining > 40
                      ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-[#0066FF] shadow-emerald-500/40'
                      : membershipTiming.percentRemaining > 15
                      ? 'bg-gradient-to-r from-blue-500 via-amber-400 to-amber-500 shadow-amber-500/40'
                      : membershipTiming.percentRemaining > 0
                      ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 shadow-red-500/40 animate-pulse'
                      : 'bg-red-500/20'
                  }`}
                >
                  {/* Subtle gloss highlight on the bar */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/35 to-transparent rounded-full" />

                  {/* Shimmer pin at leading edge */}
                  {membershipTiming.percentRemaining > 0 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_#fff] border-2 border-slate-900" />
                  )}
                </motion.div>
              </div>

              {/* Exact Real Start & Expiration Date Registration Cards below bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3.5 font-mono">
                {/* Exact Start Date */}
                <div className={`p-2.5 rounded-xl border flex flex-col justify-between ${
                  isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#0066FF]" />
                    Fecha Exacta de Inicio
                  </span>
                  <div className="mt-1">
                    <div className={`text-xs sm:text-sm font-black ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      {membershipTiming.startDateExactNumeric}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {membershipTiming.startDateFormatted} • {membershipTiming.startTimeFormatted} hs
                    </div>
                  </div>
                </div>

                {/* Elapsed Days */}
                <div className={`p-2.5 rounded-xl border flex flex-col justify-between sm:items-center sm:text-center ${
                  isDark ? 'bg-white/[0.03] border-white/10' : 'bg-slate-50 border-slate-200/80'
                }`}>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Hourglass className="w-3.5 h-3.5 text-amber-400" />
                    Tiempo Transcurrido
                  </span>
                  <div className="mt-1">
                    <div className={`text-xs sm:text-sm font-black ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                      {membershipTiming.elapsedDays} {membershipTiming.elapsedDays === 1 ? 'día' : 'días'}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      de {membershipTiming.totalDays} días totales
                    </div>
                  </div>
                </div>

                {/* Exact Expiration Date */}
                <div className={`p-2.5 rounded-xl border flex flex-col justify-between sm:items-end sm:text-right ${
                  membershipTiming.isExpired
                    ? 'bg-red-500/10 border-red-500/30'
                    : membershipTiming.isExpiringSoon
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : isDark
                    ? 'bg-emerald-500/[0.06] border-emerald-500/25'
                    : 'bg-emerald-50/70 border-emerald-200'
                }`}>
                  <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <Clock className={`w-3.5 h-3.5 ${
                      membershipTiming.isExpired ? 'text-red-400' : membershipTiming.isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'
                    }`} />
                    Fecha Exacta de Vencimiento
                  </span>
                  <div className="mt-1">
                    <div className={`text-xs sm:text-sm font-black ${
                      membershipTiming.isExpired ? 'text-red-400' : membershipTiming.isExpiringSoon ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {membershipTiming.expireDateExactNumeric}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {membershipTiming.expireDateFormatted} • {membershipTiming.expireTimeFormatted} hs
                    </div>
                  </div>
                </div>
              </div>

              {/* Functional Cancel Membership Button inside the Membership Bar Card */}
              <div className={`mt-3.5 pt-3 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 ${
                isDark ? 'border-white/10' : 'border-slate-200/80'
              }`}>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Control total de tu suscripción activa sin penalizaciones</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/35 hover:border-red-500/60 flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar Membresía</span>
                </button>
              </div>
            </div>

            {/* Expired membership alert and renewal CTA */}
            {membershipTiming.isExpired && (
              <div className="p-3.5 rounded-2xl border border-red-500/30 bg-red-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Tu membresía ha vencido. Renueva ahora para restaurar tu acceso VIP ilimitado.</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCheckout('monthly')}
                  className="px-3.5 py-1.5 rounded-xl font-bold bg-[#25D366] hover:bg-[#20ba59] text-black shrink-0 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 fill-black" />
                  <span>Renovar por WhatsApp</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Pricing Cards Grid (solo visible si el usuario NO tiene la membresía comprada) */}
        {!isSubscribed && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
          
          {/* PLAN MENSUAL CARD */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`p-6 sm:p-7 rounded-3xl border flex flex-col justify-between relative transition-all duration-300 ${
              selectedBillingTab === 'monthly'
                ? isDark
                  ? 'bg-[#0E0E14] border-[#0066FF]/50 shadow-[0_0_35px_-10px_rgba(0,102,255,0.3)] ring-1 ring-[#0066FF]/40'
                  : 'bg-white border-blue-400 shadow-xl shadow-blue-500/10 ring-1 ring-blue-300'
                : isDark
                ? 'bg-[#0A0A0C] border-[#1E1E24] opacity-90 hover:opacity-100'
                : 'bg-white border-slate-200 shadow-sm opacity-90 hover:opacity-100'
            }`}
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-[#0066FF]/15 border border-[#0066FF]/30 flex items-center justify-center text-[#0066FF]">
                  <Zap className="w-5 h-5" />
                </div>
                {activePlan === 'monthly' && isSubscribed && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Tu Plan Actual
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight">Plan Mensual</h2>
                <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Flexibilidad total mes a mes (30 días), cancela cuando quieras
                </p>
              </div>

              {/* Price Tag / Status */}
              {!isSubscribed ? (
                <div className="pt-1 pb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-[#0066FF]">
                      1$
                    </span>
                    <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      AL MES
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-neutral-400 mt-1">
                    Facturación mensual de $1.00 USD (30 días de vigencia)
                  </div>
                </div>
              ) : (
                <div className="pt-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#0066FF]">
                      30 DÍAS
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#0066FF]/15 text-[#0066FF] border border-[#0066FF]/30">
                      Ciclo Mensual
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-neutral-400 mt-1">
                    Acceso VIP ilimitado con ciclo de 30 días
                  </div>
                </div>
              )}

              {/* Feature List */}
              <div className={`space-y-3 pt-3 border-t text-xs sm:text-sm ${isDark ? 'border-[#1E1E24]' : 'border-slate-100'}`}>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span>Acceso total e ilimitado a toda la Bóveda</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span>Barra en tiempo real de días restantes (30 días)</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span>Descargas directas en formato original y máxima velocidad</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span>Insignia <strong className="text-[#0066FF]">Acceso VIP</strong> en tu perfil</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-[#0066FF] shrink-0 mt-0.5" />
                  <span>Atención directa y activación por WhatsApp o inmediata</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: WhatsApp */}
            <div className="pt-6">
              {activePlan === 'monthly' && isSubscribed ? (
                <div className="w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Plan Mensual Activo ({membershipTiming.daysRemaining} días restantes)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenCheckout('monthly')}
                  className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all bg-[#25D366] hover:bg-[#20ba59] text-black shadow-lg shadow-[#25D366]/25 hover:scale-[1.01] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-black" />
                  <span>{isSubscribed ? 'Coordinar Plan Mensual por WhatsApp' : 'Pagar por WhatsApp ($1 al mes)'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>

          {/* PLAN ANUAL CARD */}
          <motion.div
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className={`p-6 sm:p-7 rounded-3xl border flex flex-col justify-between relative transition-all duration-300 ${
              selectedBillingTab === 'annual'
                ? isDark
                  ? 'bg-gradient-to-b from-[#14141F] to-[#0A0A0C] border-amber-500/50 shadow-[0_0_40px_-10px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40'
                  : 'bg-white border-amber-400 shadow-xl shadow-amber-500/10 ring-1 ring-amber-300'
                : isDark
                ? 'bg-[#0A0A0C] border-[#1E1E24] opacity-90 hover:opacity-100'
                : 'bg-white border-slate-200 shadow-sm opacity-90 hover:opacity-100'
            }`}
          >
            {/* Best Value Badge */}
            <div className="absolute -top-3 right-6">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-md flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                12 MESES COMPLETOS (365 DÍAS)
              </span>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Crown className="w-5 h-5" />
                </div>
                {activePlan === 'annual' && isSubscribed && (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Tu Plan Actual
                  </span>
                )}
              </div>

              <div>
                <h2 className="text-xl font-bold tracking-tight">Plan Anual</h2>
                <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  Tranquilidad y acceso ininterrumpido durante 365 días
                </p>
              </div>

              {/* Price Tag / Status */}
              {!isSubscribed ? (
                <div className="pt-1 pb-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-amber-400">
                      12$
                    </span>
                    <span className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      AL AÑO
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-amber-400/80 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Barra de 365 días completos sin preocuparte por renovaciones
                  </div>
                </div>
              ) : (
                <div className="pt-1 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl sm:text-3xl font-black tracking-tight text-amber-400">
                      365 DÍAS
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400/15 text-amber-400 border border-amber-400/30">
                      Ciclo Anual
                    </span>
                  </div>
                  <div className="text-[11px] font-medium text-amber-400/80 mt-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Acceso VIP ininterrumpido durante 365 días completos
                  </div>
                </div>
              )}

              {/* Feature List */}
              <div className={`space-y-3 pt-3 border-t text-xs sm:text-sm ${isDark ? 'border-[#1E1E24]' : 'border-slate-100'}`}>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Todo lo incluido</strong> en el Plan Mensual</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Barra en tiempo real de 365 días completos</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Insignia exclusiva de <strong className="text-amber-400">Miembro VIP Dorado</strong></span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Acceso anticipado prioritario a nuevos paquetes añadidos</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Canal de soporte preferente y atención directa</span>
                </div>
              </div>
            </div>

            {/* Action Buttons: WhatsApp */}
            <div className="pt-6">
              {activePlan === 'annual' && isSubscribed ? (
                <div className="w-full py-3 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>Plan Anual Activo ({membershipTiming.daysRemaining} días restantes)</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenCheckout('annual')}
                  className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all bg-[#25D366] hover:bg-[#20ba59] text-black shadow-lg shadow-[#25D366]/25 hover:scale-[1.01] cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-black" />
                  <span>{isSubscribed ? 'Coordinar Plan Anual por WhatsApp' : 'Pagar por WhatsApp ($12 al año)'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Panel de Beneficios Activos (aparece debajo de la barra de carga en lugar de los planes cuando la membresía ya está comprada) */}
      {isSubscribed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 sm:p-7 rounded-3xl border transition-all ${
            isDark
              ? 'bg-gradient-to-b from-[#0E0E14] to-[#0A0A0C] border-emerald-500/30 shadow-xl shadow-emerald-500/5'
              : 'bg-white border-emerald-200 shadow-md'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/10 dark:border-[#1E1E24]">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black">
                    Membresía {activePlan === 'annual' ? 'Anual' : 'Mensual'} Activa
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Acceso VIP Ilimitado
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Tu cuenta cuenta con todos los privilegios VIP activos. Los recursos de la Bóveda están disponibles para descarga inmediata.
                </p>
              </div>
            </div>

            {onNavigateToVault && (
              <button
                type="button"
                onClick={onNavigateToVault}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0066FF] hover:bg-blue-600 text-white flex items-center gap-2 shadow-md shadow-[#0066FF]/25 cursor-pointer shrink-0 transition-all hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                <span>Explorar la Bóveda</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Lista de Beneficios Activos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-5 text-xs sm:text-sm">
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Acceso total e ilimitado a todos los archivos y carpetas de la Bóveda</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Barra de seguimiento en tiempo real con contador exacto de tus días restantes</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Descargas directas en formato original a máxima velocidad de transferencia</span>
            </div>
            <div className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>Canal preferente de soporte directo y atención inmediata por WhatsApp</span>
            </div>
          </div>
        </motion.div>
      )}

        {/* Banner para subir comprobante de pago */}
        <div className={`p-4 sm:p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
          isDark 
            ? 'bg-gradient-to-r from-blue-950/30 via-[#0E0E12] to-blue-900/10 border-[#0066FF]/30' 
            : 'bg-gradient-to-r from-blue-50 via-white to-blue-50/50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#0066FF]/20 border border-[#0066FF]/40 text-[#0066FF] flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-[#0066FF]">
                ¿Ya realizaste tu transferencia o pago?
              </p>
              <h4 className="text-sm font-bold mt-0.5">
                Sube tu comprobante de pago para validación inmediata
              </h4>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Verificamos tu comprobante en la home bar y activamos tus accesos VIP rápidamente.
              </p>
            </div>
          </div>

          {onNavigateToReceipts && (
            <button
              type="button"
              onClick={onNavigateToReceipts}
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl text-xs font-extrabold bg-[#0066FF] hover:bg-[#0055D4] text-white shadow-lg shadow-[#0066FF]/25 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Subir Comprobante Ahora</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Benefits Detail Grid */}
        <div className="space-y-4 pt-4">
          <div className="text-center space-y-1">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">
              ¿Por qué unirte a la Membresía VIP?
            </h3>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Diseñado para creadores, profesionales y entusiastas que necesitan recursos premium al instante.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className={`p-4 rounded-2xl border transition-colors ${
              isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-slate-200'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mb-3">
                <Download className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold">Descargas Ilimitadas</h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Baja cualquier archivo cuantas veces quieras sin cuotas diarias ni tiempos de espera.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border transition-colors ${
              isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-slate-200'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold">Velocidad Extrema</h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Conexión directa a servidores en la nube con entrega rápida de archivos pesados.
              </p>
            </div>

            <div className={`p-4 rounded-2xl border transition-colors ${
              isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-slate-200'
            }`}>
              <div className="w-8 h-8 rounded-xl bg-[#25D366]/10 text-[#25D366] flex items-center justify-center mb-3">
                <MessageCircle className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold">Atención por WhatsApp</h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Contacto personal e instantáneo para medios de pago y soporte técnico directo.
              </p>
            </div>
          </div>
        </div>

        {/* Security & WhatsApp Seal */}
        <div className={`p-4 rounded-2xl border flex items-center justify-center gap-6 text-xs text-center flex-wrap ${
          isDark ? 'bg-[#0A0A0C] border-[#1E1E24] text-neutral-400' : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}>
          <div className="flex items-center gap-1.5 font-medium">
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            <span>WhatsApp Oficial: +54 9 11 6554-6038</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Activación 100% Segura y Personal</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <HeartHandshake className="w-4 h-4 text-amber-400" />
            <span>Cancela cuando quieras con 1 clic</span>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="space-y-3 pt-2">
          <div className="text-center mb-2">
            <h3 className="text-base sm:text-lg font-bold">Preguntas Frecuentes</h3>
            <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Respuestas a las dudas más comunes sobre la membresía y el método de pago
            </p>
          </div>

          {[
            {
              q: '¿Cómo funciona el método de pago por WhatsApp?',
              a: isSubscribed
                ? 'Al coordinar por WhatsApp (+54 9 11 6554-6038), se envía tu ID de usuario y el plan seleccionado. Allí recibes asistencia directa y actualización inmediata de tu cuenta.'
                : 'Al hacer clic en el botón de pago, serás redirigido directamente a mi WhatsApp oficial (+54 9 11 6554-6038) con un mensaje preparado que incluye tu ID de usuario y el plan elegido. Allí te proporciono las opciones de pago disponibles (transferencia, billeteras virtuales, etc.) y activo tu membresía en minutos.',
            },
            ...(!isSubscribed
              ? [
                  {
                    q: '¿Cuáles son los precios exactos?',
                    a: 'El Plan Mensual cuesta exactamente 1$ al mes ($1.00 USD / mes). El Plan Anual cuesta 12$ al año ($12.00 USD / año) por 365 días ininterrumpidos de acceso a la bóveda.',
                  },
                ]
              : []),
            {
              q: '¿Puedo cancelar en cualquier momento?',
              a: 'Sí, totalmente. Puedes cancelar la membresía con un solo clic directamente desde esta pantalla o solicitándolo por WhatsApp en cualquier momento.',
            },
            {
              q: '¿Qué sucede con los archivos que ya descargué si cancelo?',
              a: 'Todos los recursos y archivos que hayas descargado son tuyos permanentemente. No perderás ningún recurso guardado en tu equipo.',
            },
          ].map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-colors overflow-hidden ${
                  isDark ? 'bg-[#0A0A0C] border-[#1E1E24]' : 'bg-white border-slate-200'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#0066FF] shrink-0" />
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-[#0066FF]' : isDark ? 'text-neutral-500' : 'text-slate-400'
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className={`px-4 pb-4 text-xs leading-relaxed ${
                        isDark ? 'text-neutral-400' : 'text-neutral-600'
                      }`}
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>

      {/* WHATSAPP PAYMENT MODAL */}
      <AnimatePresence>
        {showCheckoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden my-auto ${
                isDark ? 'bg-[#0D0D12] border-[#22222E]' : 'bg-white border-slate-200'
              }`}
            >
              {/* Modal Header */}
              <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
                isDark ? 'border-[#1E1E24]' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl flex items-center justify-center bg-[#25D366]/15 text-[#25D366]">
                    <MessageCircle className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold">
                      Pago por WhatsApp
                    </h3>
                    <p className={`text-[11px] ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                      {targetPlan === 'monthly'
                        ? (isSubscribed ? 'Plan Mensual (30 días de vigencia)' : 'Plan Mensual ($1.00 USD • 30 días)')
                        : (isSubscribed ? 'Plan Anual (365 días de vigencia)' : 'Plan Anual ($12.00 USD • 365 días)')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                    isDark
                      ? 'border-[#1E1E24] hover:bg-neutral-800 text-neutral-400'
                      : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 space-y-4">
                
                {/* Plan Summary Bar */}
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  targetPlan === 'annual'
                    ? isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                    : isDark ? 'bg-[#0066FF]/10 border-[#0066FF]/30' : 'bg-blue-50 border-blue-200'
                }`}>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wider text-neutral-400">
                      {isSubscribed ? 'Plan Seleccionado' : 'Monto Total a Pagar'}
                    </div>
                    <div className="text-xl font-black">
                      {isSubscribed
                        ? (targetPlan === 'monthly' ? 'Plan Mensual (30 Días)' : 'Plan Anual (365 Días)')
                        : (targetPlan === 'monthly' ? '$1.00 USD' : '$12.00 USD')}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {targetPlan === 'monthly' ? 'Vigencia de 30 días con barra activa' : 'Vigencia de 365 días con barra activa'}
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                    targetPlan === 'annual'
                      ? 'bg-amber-400/20 text-amber-400 border border-amber-400/40'
                      : 'bg-[#0066FF]/20 text-[#0066FF] border border-[#0066FF]/40'
                  }`}>
                    {targetPlan === 'monthly' ? '30 Días' : '365 Días'}
                  </span>
                </div>

                {/* WhatsApp Chat Method */}
                <div className="space-y-3">
                  {/* WhatsApp Contact Box */}
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#121218] border-[#20202A]' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                        Número de Contacto
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPhone}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#25D366] hover:underline cursor-pointer"
                      >
                        {copiedPhone ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 text-[#25D366] flex items-center justify-center shrink-0">
                        <MessageCircle className="w-5 h-5 fill-current" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="text-base font-black font-mono tracking-tight text-white">
                          {WHATSAPP_CONTACT_PHONE}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          Atención directa con el creador
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Message preview snippet */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                        Mensaje Automático Listo
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyMessage}
                        className="text-[10px] font-bold text-neutral-400 hover:text-white flex items-center gap-1 cursor-pointer"
                      >
                        {copiedMsg ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedMsg ? 'Mensaje copiado' : 'Copiar texto'}</span>
                      </button>
                    </div>

                    <div className={`p-3 rounded-xl border text-[11px] font-mono leading-relaxed line-clamp-3 select-all ${
                      isDark ? 'bg-black/40 border-[#1E1E24] text-neutral-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      {getWhatsAppMessage(targetPlan)}
                    </div>
                  </div>

                  {/* Primary Button: Open WhatsApp */}
                  <a
                    href={getWhatsAppUrl(targetPlan)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all bg-[#25D366] hover:bg-[#20ba5a] text-black shadow-lg shadow-[#25D366]/30 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-black" />
                    <span>Abrir Chat en WhatsApp y Coordinar Pago</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {/* Go to upload receipt */}
                  {onNavigateToReceipts && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowCheckoutModal(false);
                        onNavigateToReceipts();
                      }}
                      className={`w-full py-2.5 px-4 rounded-2xl text-xs font-bold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        isDark 
                          ? 'border-white/10 bg-neutral-900 hover:bg-neutral-800 text-neutral-300' 
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Ya pagué por WhatsApp, subir comprobante</span>
                    </button>
                  )}
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CANCEL CONFIRMATION MODAL */}
      <AnimatePresence>
        {showCancelModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-sm rounded-3xl border p-5 space-y-4 shadow-2xl ${
                isDark ? 'bg-[#0D0D12] border-[#22222E]' : 'bg-white border-slate-200'
              }`}
            >
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-bold">¿Cancelar tu Membresía VIP?</h3>
                <p className={`text-xs mt-1 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Al confirmar, tu membresía activa (con vencimiento el <strong>{membershipTiming.expireDateExactNumeric}</strong>) quedará cancelada de inmediato y podrás volver a suscribirte cuando quieras.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    isDark ? 'border-[#1E1E24] hover:bg-neutral-800 text-neutral-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  Mantener Activa
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-colors cursor-pointer"
                >
                  Confirmar Cancelación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INVOICE / RECEIPT MODAL */}
      <AnimatePresence>
        {showInvoiceModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden ${
                isDark ? 'bg-[#0D0D12] border-[#22222E]' : 'bg-white border-slate-200'
              }`}
            >
              {/* Receipt Header */}
              <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${
                isDark ? 'border-[#1E1E24]' : 'border-slate-100'
              }`}>
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0066FF]" />
                  <h3 className="text-sm sm:text-base font-bold">Comprobante Oficial de Pago</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-1 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Receipt Details */}
              <div className="p-5 space-y-4 text-xs font-mono">
                <div className="flex justify-between items-center border-b pb-3 border-dashed border-neutral-700">
                  <div>
                    <div className="font-bold text-sm font-sans">App 66 — Bóveda Exclusiva</div>
                    <div className="text-[11px] text-neutral-400 font-sans">Factura digital certificada</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    PAGADO
                  </span>
                </div>

                <div className="space-y-1.5 text-neutral-300">
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500 shrink-0">ID Transacción:</span>
                    <span className="font-mono text-[11px] text-right break-all">#INV-66-{(currentUser.uid || 'VIP').toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500 shrink-0">Cliente:</span>
                    <span className="text-right truncate">{currentUser.displayName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500 shrink-0">Email:</span>
                    <span className="text-right break-all">{currentUser.email}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500 shrink-0">Concepto:</span>
                    <span className="text-right">Membresía VIP ({activePlan === 'annual' ? 'Anual' : 'Mensual'})</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500 shrink-0">Método de Pago:</span>
                    <span className="text-[#25D366] text-right">WhatsApp Oficial ({WHATSAPP_CONTACT_PHONE})</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500 shrink-0">Fecha Exacta de Inicio:</span>
                    <span className="text-right">{membershipTiming.startDateFullFormatted}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-neutral-500 shrink-0">Fecha Exacta de Vencimiento:</span>
                    <span className="text-right">{membershipTiming.expireDateFullFormatted}</span>
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-between items-baseline font-bold text-sm font-sans border-neutral-700">
                  <span>{isSubscribed ? 'Plan Activado:' : 'Monto Total Cobrado:'}</span>
                  <span className="text-base text-emerald-400">
                    {isSubscribed
                      ? (activePlan === 'annual' ? 'Plan Anual (365 Días)' : 'Plan Mensual (30 Días)')
                      : (activePlan === 'annual' ? '$12.00 USD' : '$1.00 USD')}
                  </span>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="w-full py-2.5 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-white font-sans text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Imprimir / Guardar Comprobante
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
